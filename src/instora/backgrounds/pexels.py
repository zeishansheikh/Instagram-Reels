"""Pexels API video background provider with mood keyword search, HD filtering, and caching."""

from __future__ import annotations

import os
import random
import time
from pathlib import Path
from typing import Any, Optional

import httpx
from loguru import logger

from instora.backgrounds.base import BackgroundProvider
from instora.config import load_config
from instora.db import (
    get_recently_used_clip_paths,
    init_db,
    record_clip_usage,
)
from instora.render.ffmpeg_cmd import probe_video

PEXELS_API_URL = "https://api.pexels.com/videos/search"

# Keyword queries curated directly from STYLE_GUIDE.md
MOOD_KEYWORDS_MAP: dict[str, list[str]] = {
    "lake": ["alpine lake reflection", "lake sunrise mist", "calm lake golden hour"],
    "mountain": ["mountain golden hour", "snowy peaks above clouds", "mountain waterfall"],
    "sunset": ["calm ocean sunset", "sunset birds flying", "golden hour landscape"],
    "forest": ["larch autumn forest", "misty green forest", "pine forest sunbeams"],
    "snow": ["snowy peaks above clouds", "winter mountain peaks", "snow covered forest"],
    "ocean": ["calm ocean sunset", "ocean waves golden hour", "peaceful sea coastline"],
    "sky": ["sunset birds flying", "clouds above mountains", "alpenglow dramatic sky"],
}

DEFAULT_KEYWORDS = [
    "alpine lake reflection",
    "mountain golden hour",
    "larch autumn forest",
    "sunset birds flying",
    "snowy peaks above clouds",
    "lake sunrise mist",
    "mountain waterfall",
    "calm ocean sunset",
]


class PexelsBackgroundProvider(BackgroundProvider):
    """Fetches high-aesthetic nature clips via Pexels API with rate-limiting and caching."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        cache_dir: Path | str = "cache/pexels",
        db_path: Path | str = "db/instora.db",
        reuse_cooldown: Optional[int] = None,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        """Initialize Pexels provider.

        Args:
            api_key: Pexels API key (defaults to PEXELS_API_KEY from environment).
            cache_dir: Directory where downloaded video files are stored.
            db_path: SQLite database path for tracking usage.
            reuse_cooldown: Number of reels to wait before repeating footage.
            http_client: Optional injected httpx.Client for testing.
        """
        self.api_key = api_key or os.getenv("PEXELS_API_KEY")
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = Path(db_path)

        cfg = load_config()
        self.reuse_cooldown = (
            reuse_cooldown
            if reuse_cooldown is not None
            else getattr(cfg.defaults, "clip_reuse_cooldown", 10)
        )
        self._client = http_client

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        return httpx.Client(
            headers={"Authorization": self.api_key or ""},
            timeout=30.0,
        )

    def _select_query(self, mood: str) -> str:
        """Map mood keyword to a curated aesthetic nature search query."""
        clean = mood.strip().lower()
        candidates = MOOD_KEYWORDS_MAP.get(clean, DEFAULT_KEYWORDS)
        return random.choice(candidates)

    def search_videos(
        self,
        query: str,
        orientation: Optional[str] = "portrait",
        per_page: int = 15,
        max_retries: int = 3,
    ) -> list[dict[str, Any]]:
        """Search Pexels video API with rate-limit backoff and error handling.

        Args:
            query: Search query string.
            orientation: 'portrait', 'landscape', or None.
            per_page: Number of video results to retrieve.
            max_retries: Number of retry attempts on 429/5xx errors.

        Returns:
            List of video dictionaries from Pexels API.
        """
        if not self.api_key:
            raise ValueError(
                "PEXELS_API_KEY is not configured in .env or environment.\n"
                "Get a free API key at https://www.pexels.com/api/"
            )

        client = self._get_client()
        params: dict[str, Any] = {
            "query": query,
            "per_page": per_page,
            "size": "large",
        }
        if orientation:
            params["orientation"] = orientation

        for attempt in range(1, max_retries + 1):
            try:
                resp = client.get(PEXELS_API_URL, params=params)

                # Rate limiting (429)
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 2 ** attempt))
                    logger.warning(
                        f"Pexels rate limit hit (429). Retrying in {retry_after}s (attempt {attempt}/{max_retries})..."
                    )
                    time.sleep(retry_after)
                    continue

                if resp.status_code == 401:
                    raise ValueError("Invalid PEXELS_API_KEY provided. Check your .env file.")

                resp.raise_for_status()
                data = resp.json()
                videos = data.get("videos", [])
                logger.info(f"Pexels query '{query}' (orientation={orientation}) returned {len(videos)} videos.")
                return videos

            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                logger.warning(f"Pexels request error on attempt {attempt}: {exc}")
                if attempt == max_retries:
                    logger.error(f"Pexels search failed after {max_retries} attempts.")
                    return []
                time.sleep(2 ** attempt)

        return []

    def _best_video_file(self, video_data: dict[str, Any]) -> Optional[dict[str, Any]]:
        """Filter and select best >= 1080p MP4 file from video's file list."""
        files = video_data.get("video_files", [])
        candidates: list[dict[str, Any]] = []

        for f in files:
            if f.get("file_type") != "video/mp4":
                continue
            w = f.get("width") or 0
            h = f.get("height") or 0

            # Quality gate: minimum 1080p
            # Either width >= 1080 or height >= 1080
            if w >= 1080 or h >= 1080:
                candidates.append(f)

        if not candidates:
            return None

        # Sort: prefer 1080p vertical (1080x1920) or 1080p landscape (1920x1080), avoid excessively large 4K files
        def score_file(item: dict[str, Any]) -> int:
            w = item.get("width", 0)
            h = item.get("height", 0)
            if (w, h) in ((1080, 1920), (1920, 1080)):
                return 100
            if min(w, h) == 1080:
                return 90
            return 50 - abs(min(w, h) - 1080)

        candidates.sort(key=score_file, reverse=True)
        return candidates[0]

    def download_video(self, video_id: int, download_url: str) -> Optional[Path]:
        """Download video file into cache folder with resume check."""
        dest_path = self.cache_dir / f"{video_id}.mp4"
        if dest_path.exists() and dest_path.stat().st_size > 100_000:
            logger.debug(f"Using already cached Pexels video: {dest_path.name}")
            return dest_path

        temp_path = self.cache_dir / f"{video_id}.tmp"
        logger.info(f"Downloading Pexels video {video_id} to {dest_path.name}...")

        client = self._get_client()
        try:
            with client.stream("GET", download_url) as resp:
                resp.raise_for_status()
                with open(temp_path, "wb") as f:
                    for chunk in resp.iter_bytes(chunk_size=1024 * 64):
                        f.write(chunk)

            temp_path.replace(dest_path)
            logger.info(f"Successfully downloaded Pexels video: {dest_path}")
            return dest_path
        except Exception as e:
            logger.warning(f"Failed to download Pexels video {video_id}: {e}")
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            return None

    def get_clip(self, mood: str = "nature", min_seconds: float = 8.0) -> Path:
        """Search, download, validate, and return a Pexels background video clip.

        Args:
            mood: Mood keyword (e.g. lake, mountain, sunset).
            min_seconds: Minimum clip duration required.

        Returns:
            Path: Local path to ready-to-render background MP4.
        """
        query = self._select_query(mood)

        # 1. First try portrait orientation
        videos = self.search_videos(query=query, orientation="portrait", per_page=15)

        # 2. If portrait yields no clips, fallback to all orientations (HD landscape)
        if not videos:
            logger.info(f"No portrait videos found for '{query}', searching all orientations...")
            videos = self.search_videos(query=query, orientation=None, per_page=15)

        if not videos:
            raise FileNotFoundError(f"No Pexels videos found matching mood query '{query}'.")

        # Usage tracking & cooldown
        conn = init_db(self.db_path)
        recently_used = set(get_recently_used_clip_paths(conn, limit=self.reuse_cooldown))

        # Sort: prefer clips not recently used
        random.shuffle(videos)
        candidates = sorted(
            videos,
            key=lambda v: 1 if str(self.cache_dir / f"{v['id']}.mp4") in recently_used else 0,
        )

        for video in candidates:
            video_id = video["id"]
            author = video.get("user", {}).get("name", "Unknown")
            duration = float(video.get("duration", 0))

            # Quality gate: duration check
            if duration < 3.0:
                logger.warning(f"Rejecting Pexels video {video_id}: duration {duration}s < 3.0s")
                continue

            best_file = self._best_video_file(video)
            if not best_file:
                logger.warning(f"Rejecting Pexels video {video_id}: no >= 1080p MP4 file found")
                continue

            download_url = best_file.get("link")
            if not download_url:
                continue

            downloaded_path = self.download_video(video_id=video_id, download_url=download_url)
            if not downloaded_path:
                continue

            # Verify downloaded video with ffprobe
            try:
                meta = probe_video(downloaded_path)
                if meta["duration"] < 3.0:
                    continue
            except Exception as e:
                logger.warning(f"ffprobe validation failed for {downloaded_path.name}: {e}")
                continue

            # Record usage in DB with source_id and author
            source_id = f"{video_id}|author:{author}"
            record_clip_usage(
                conn=conn,
                path=str(downloaded_path),
                source="pexels",
                source_id=source_id,
            )

            logger.info(
                f"Selected Pexels background: '{downloaded_path.name}' by {author} (ID: {video_id})"
            )
            return downloaded_path

        raise FileNotFoundError(f"No acceptable >=1080p Pexels clips found for query '{query}'.")
