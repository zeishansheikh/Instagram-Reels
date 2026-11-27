"""Local folder background provider with quality gates, tag matching, and usage cooldown."""

from __future__ import annotations

import random
import subprocess
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from instora.backgrounds.base import BackgroundProvider
from instora.config import load_config
from instora.db import (
    get_recently_used_clip_paths,
    get_used_segments,
    init_db,
    record_clip_usage,
    record_used_segment,
)
from instora.render.ffmpeg_cmd import probe_video

VALID_EXTENSIONS: set[str] = {".mp4", ".mov", ".mkv", ".webm"}


class LocalFolderBackgroundProvider(BackgroundProvider):
    """Selects and manages background video clips from local assets or a single video."""

    def __init__(
        self,
        folder: Path | str = "assets/backgrounds",
        single_video_path: Optional[Path | str] = None,
        db_path: Path | str = "db/instora.db",
        reuse_cooldown: Optional[int] = None,
        cache_dir: Path | str = "cache/segments",
    ) -> None:
        """Initialize provider.

        Args:
            folder: Root directory containing background video clips.
            single_video_path: Optional path to a single video to slice segments from.
            db_path: Path to SQLite database for tracking usage.
            reuse_cooldown: Number of reels to wait before repeating a clip.
            cache_dir: Destination folder for single-video extracted segments.
        """
        self.folder = Path(folder)
        self.single_video_path = Path(single_video_path) if single_video_path else None
        self.db_path = Path(db_path)

        cfg = load_config()
        self.reuse_cooldown = (
            reuse_cooldown
            if reuse_cooldown is not None
            else getattr(cfg.defaults, "clip_reuse_cooldown", 10)
        )
        self.cache_dir = Path(cache_dir)
        self.last_selected_segment: Optional[tuple[float, float]] = None

    def _validate_clip(self, clip_path: Path) -> Optional[dict[str, Any]]:
        """Validate a clip against duration (>=3.0s) and resolution (>=1080p).

        Returns metadata dict if valid, or None if rejected.
        """
        try:
            metadata = probe_video(clip_path)
        except Exception as e:
            logger.warning(f"Rejecting clip '{clip_path.name}': ffprobe failed ({e})")
            return None

        dur = metadata.get("duration", 0.0)
        w = metadata.get("width", 0)
        h = metadata.get("height", 0)

        # 1. Reject clips shorter than 3.0s
        if dur < 3.0:
            logger.warning(
                f"Rejecting clip '{clip_path.name}': duration {dur:.2f}s is shorter than 3.0s minimum."
            )
            return None

        # 2. Reject clips smaller than 1080p (i.e. both dimensions under 1080)
        if w < 1080 and h < 1080:
            logger.warning(
                f"Rejecting clip '{clip_path.name}': resolution {w}x{h} is smaller than 1080p."
            )
            return None

        return metadata

    def _get_single_video_segment(self, min_seconds: float) -> Path:
        """Slice an unused segment from single_video_path without repeating parts."""
        if not self.single_video_path or not self.single_video_path.exists():
            raise FileNotFoundError(f"Single video file not found: {self.single_video_path}")

        meta = self._validate_clip(self.single_video_path)
        if not meta:
            raise ValueError(f"Single video '{self.single_video_path}' failed quality gate.")

        total_dur = meta["duration"]
        segment_len = min(total_dur, max(3.0, min_seconds))

        conn = init_db(self.db_path)
        used_segments = get_used_segments(conn, str(self.single_video_path))

        # Find a non-overlapping segment
        chosen_start = 0.0
        max_start = max(0.0, total_dur - segment_len)

        if max_start > 0.0:
            best_start = 0.0
            min_overlap = float("inf")

            for _ in range(60):
                cand_start = random.uniform(0.0, max_start)
                cand_end = cand_start + segment_len

                # Compute maximum overlap with any already used segment
                total_overlap = 0.0
                for u_start, u_end in used_segments:
                    overlap = max(0.0, min(cand_end, u_end) - max(cand_start, u_start))
                    total_overlap += overlap

                if total_overlap == 0.0:
                    best_start = cand_start
                    min_overlap = 0.0
                    break

                if total_overlap < min_overlap:
                    min_overlap = total_overlap
                    best_start = cand_start

            chosen_start = best_start

        chosen_end = min(total_dur, chosen_start + segment_len)
        self.last_selected_segment = (chosen_start, chosen_end)

        # Record segment and clip usage in DB
        record_used_segment(conn, str(self.single_video_path), chosen_start, chosen_end)
        record_clip_usage(
            conn,
            path=str(self.single_video_path),
            source="single_video",
            source_id=f"segment_{chosen_start:.1f}_{chosen_end:.1f}",
        )

        # Extract segment to cache directory
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        stem = self.single_video_path.stem
        segment_file = self.cache_dir / f"{stem}_seg_{chosen_start:.1f}_{chosen_end:.1f}.mp4"

        if not segment_file.exists():
            logger.info(
                f"Extracting segment [{chosen_start:.1f}s - {chosen_end:.1f}s] from '{self.single_video_path.name}'"
            )
            cmd = [
                "ffmpeg",
                "-y",
                "-ss", f"{chosen_start:.2f}",
                "-t", f"{segment_len:.2f}",
                "-i", str(self.single_video_path),
                "-c", "copy",
                str(segment_file),
            ]
            try:
                subprocess.run(cmd, check=True, capture_output=True)
            except subprocess.CalledProcessError:
                # Fallback to fast transcode if stream copy fails
                cmd_transcode = [
                    "ffmpeg",
                    "-y",
                    "-ss", f"{chosen_start:.2f}",
                    "-t", f"{segment_len:.2f}",
                    "-i", str(self.single_video_path),
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    str(segment_file),
                ]
                subprocess.run(cmd_transcode, check=True, capture_output=True)

        return segment_file

    def get_clip(self, mood: str = "nature", min_seconds: float = 8.0) -> Path:
        """Select a background clip matching mood and quality constraints.

        Args:
            mood: Mood keyword (e.g. lake, mountain, sunset).
            min_seconds: Target minimum duration.

        Returns:
            Path: Selected clip ready for rendering.
        """
        # Single-file mode
        if self.single_video_path is not None:
            return self._get_single_video_segment(min_seconds=min_seconds)

        if not self.folder.exists():
            raise FileNotFoundError(f"Backgrounds folder does not exist: {self.folder}")

        # Scan for all video files
        all_files = [
            p
            for p in self.folder.rglob("*")
            if p.is_file() and p.suffix.lower() in VALID_EXTENSIONS
        ]

        if not all_files:
            raise FileNotFoundError(f"No video files found in {self.folder}")

        # Filter through quality gate
        valid_clips: list[Path] = []
        for file_path in all_files:
            meta = self._validate_clip(file_path)
            if meta:
                valid_clips.append(file_path)

        # Fallback: if no strictly >=1080p clips exist, accept user clips with duration >= 3.0s (e.g. 1024x576, 720p)
        if not valid_clips:
            for file_path in all_files:
                try:
                    metadata = probe_video(file_path)
                    if metadata.get("duration", 0.0) >= 3.0:
                        valid_clips.append(file_path)
                except Exception:
                    pass
            if valid_clips:
                logger.info(
                    f"No 1080p clips found in {self.folder}; accepted {len(valid_clips)} user video clips (>=3.0s)."
                )

        if not valid_clips:
            raise FileNotFoundError(
                f"No clips in {self.folder} passed the quality gate (>=1080p, >=3.0s)."
            )

        # Tag matching: prefer clips whose name or folder contains the mood
        mood_clean = mood.strip().lower()
        preferred_clips: list[Path] = []
        other_clips: list[Path] = []

        for clip in valid_clips:
            # Check filename stem and parent directory names
            path_parts = [clip.stem.lower()] + [p.lower() for p in clip.parent.parts]
            if any(mood_clean in part for part in path_parts):
                preferred_clips.append(clip)
            else:
                other_clips.append(clip)

        pool = preferred_clips if preferred_clips else other_clips
        if preferred_clips:
            logger.info(
                f"Tag match: found {len(preferred_clips)} clips matching mood '{mood_clean}'"
            )

        # Usage tracking & cooldown avoidance
        conn = init_db(self.db_path)
        recently_used = set(get_recently_used_clip_paths(conn, limit=self.reuse_cooldown))

        # Separate fresh clips from recently used
        fresh_clips = [c for c in pool if str(c) not in recently_used]

        if fresh_clips:
            selected = random.choice(fresh_clips)
        else:
            logger.info(
                f"All candidate clips have been used within the last {self.reuse_cooldown} reels. Picking least recently used."
            )
            # Pick least recently used
            recent_list = get_recently_used_clip_paths(conn, limit=1000)
            # Sort pool by their order in recent_list (items appearing later are older)
            score_map = {path: idx for idx, path in enumerate(recent_list)}
            selected = max(pool, key=lambda c: score_map.get(str(c), -1))

        # Record usage in DB
        record_clip_usage(conn, path=str(selected), source="local_folder")
        logger.info(f"Selected background clip: '{selected.name}' for mood '{mood}'")
        return selected
