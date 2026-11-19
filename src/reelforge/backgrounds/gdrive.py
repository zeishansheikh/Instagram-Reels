"""Google Drive background provider with OAuth authentication, caching, and usage tracking."""

from __future__ import annotations

import hashlib
import io
import os
import random
from pathlib import Path
from typing import Any, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import Resource, build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from loguru import logger

from reelforge.backgrounds.base import BackgroundProvider
from reelforge.config import load_config
from reelforge.db import (
    get_recently_used_clip_paths,
    init_db,
    record_clip_usage,
)
from reelforge.render.ffmpeg_cmd import probe_video

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
VALID_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm"}


def compute_file_md5(file_path: Path) -> str:
    """Compute MD5 checksum of a local file in 1MB chunks."""
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def authenticate_gdrive(
    credentials_file: Path | str = "credentials.json",
    token_file: Path | str = "token.json",
) -> Credentials:
    """Authenticate with Google Drive API via desktop OAuth flow.

    Args:
        credentials_file: Path to client OAuth secret JSON from Google Cloud Console.
        token_file: Path to persist user access/refresh tokens.

    Returns:
        Google OAuth Credentials object.
    """
    creds_path = Path(credentials_file)
    tok_path = Path(token_file)
    creds: Optional[Credentials] = None

    if tok_path.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(tok_path), SCOPES)
        except Exception as e:
            logger.warning(f"Failed to read existing token.json: {e}")

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.warning(f"Could not refresh token: {e}. Re-authenticating...")
                creds = None

        if not creds:
            if not creds_path.exists():
                raise FileNotFoundError(
                    f"'{credentials_file}' is missing.\n"
                    "Please download your OAuth Client ID JSON (Desktop Application) from the\n"
                    "Google Cloud Console, save it as 'credentials.json' in the project root,\n"
                    "and run 'reelforge gdrive-login'."
                )

            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)

        # Save tokens for future sessions
        with open(tok_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
        logger.info(f"Google Drive authentication token saved to '{token_file}'.")

    return creds


def get_gdrive_service(
    credentials_file: Path | str = "credentials.json",
    token_file: Path | str = "token.json",
    creds: Optional[Credentials] = None,
) -> Resource:
    """Build and return an authorized Google Drive v3 API service resource."""
    if creds is None:
        creds = authenticate_gdrive(credentials_file, token_file)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


class GDriveBackgroundProvider(BackgroundProvider):
    """Google Drive video background provider with recursive search and local caching."""

    def __init__(
        self,
        folder_id: Optional[str] = None,
        credentials_file: Path | str = "credentials.json",
        token_file: Path | str = "token.json",
        cache_dir: Path | str = "cache/gdrive",
        db_path: Path | str = "db/reelforge.db",
        reuse_cooldown: Optional[int] = None,
        service: Optional[Resource] = None,
    ) -> None:
        """Initialize Google Drive background provider.

        Args:
            folder_id: Google Drive folder ID holding background footage.
            credentials_file: Path to credentials.json.
            token_file: Path to token.json.
            cache_dir: Local download cache folder.
            db_path: SQLite database path.
            reuse_cooldown: Reels cooldown count before repeating footage.
            service: Optional pre-configured Google Drive service resource.
        """
        cfg = load_config()
        self.folder_id = folder_id or cfg.background.gdrive_folder_id or os.getenv("GDRIVE_FOLDER_ID")
        self.credentials_file = Path(credentials_file)
        self.token_file = Path(token_file)
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = Path(db_path)

        self.reuse_cooldown = (
            reuse_cooldown
            if reuse_cooldown is not None
            else getattr(cfg.defaults, "clip_reuse_cooldown", 10)
        )
        self._service = service

    @property
    def service(self) -> Resource:
        """Lazy-loaded or injected Google Drive API service resource."""
        if self._service is None:
            self._service = get_gdrive_service(self.credentials_file, self.token_file)
        return self._service

    def list_video_files(self) -> list[dict[str, Any]]:
        """Recursively list all video files under the configured Drive folder."""
        if not self.folder_id:
            raise ValueError(
                "GDRIVE_FOLDER_ID is not configured. Set GDRIVE_FOLDER_ID in .env or pass folder_id."
            )

        video_files: list[dict[str, Any]] = []
        folders_to_scan: list[tuple[str, str]] = [(self.folder_id, "")]

        while folders_to_scan:
            current_id, parent_path = folders_to_scan.pop(0)
            page_token = None

            query = f"'{current_id}' in parents and trashed = false"
            while True:
                try:
                    res = (
                        self.service.files()
                        .list(
                            q=query,
                            fields="nextPageToken, files(id, name, mimeType, size, md5Checksum)",
                            pageToken=page_token,
                            pageSize=100,
                        )
                        .execute()
                    )
                except HttpError as err:
                    logger.warning(f"Google Drive API error listing folder '{current_id}': {err}")
                    break
                except Exception as net_err:
                    logger.warning(f"Network error accessing Drive folder '{current_id}': {net_err}")
                    break

                for file in res.get("files", []):
                    mime = file.get("mimeType", "")
                    name = file.get("name", "")
                    file_id = file.get("id", "")
                    subpath = f"{parent_path}/{name}" if parent_path else name

                    if mime == "application/vnd.google-apps.folder":
                        folders_to_scan.append((file_id, subpath))
                    elif mime.startswith("video/") or Path(name).suffix.lower() in VALID_EXTENSIONS:
                        video_files.append({
                            "id": file_id,
                            "name": name,
                            "path_tags": subpath,
                            "size": int(file.get("size", 0)),
                            "md5": file.get("md5Checksum", ""),
                        })

                page_token = res.get("nextPageToken")
                if not page_token:
                    break

        logger.info(f"Found {len(video_files)} video files in Google Drive folder.")
        return video_files

    def download_file(self, file_info: dict[str, Any]) -> Optional[Path]:
        """Download remote Drive file to local cache if not already present or modified.

        Args:
            file_info: Dictionary containing 'id', 'name', 'md5', 'size'.

        Returns:
            Path to the downloaded local file, or None on failure.
        """
        file_id = file_info["id"]
        name = file_info["name"]
        remote_md5 = file_info.get("md5")
        ext = Path(name).suffix or ".mp4"
        dest_path = self.cache_dir / f"{file_id}{ext}"

        # Check local cache and MD5 checksum
        if dest_path.exists() and dest_path.stat().st_size > 0:
            if remote_md5:
                local_md5 = compute_file_md5(dest_path)
                if local_md5 == remote_md5:
                    logger.debug(f"Using cached Drive clip: {dest_path.name}")
                    return dest_path
            else:
                return dest_path

        logger.info(f"Downloading Drive video '{name}' ({file_id}) to {dest_path.name}...")
        try:
            req = self.service.files().get_media(fileId=file_id)
            with open(dest_path, "wb") as f:
                downloader = MediaIoBaseDownload(f, req, chunksize=1024 * 1024 * 5)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                    if status:
                        pct = int(status.progress() * 100)
                        logger.debug(f"Downloading '{name}': {pct}%")

            logger.info(f"Successfully downloaded '{name}' to {dest_path}")
            return dest_path
        except HttpError as err:
            logger.warning(f"Google Drive API error downloading '{name}': {err}")
            if dest_path.exists():
                dest_path.unlink(missing_ok=True)
            return None
        except Exception as err:
            logger.warning(f"Network error downloading '{name}': {err}")
            if dest_path.exists():
                dest_path.unlink(missing_ok=True)
            return None

    def _validate_local_clip(self, clip_path: Path) -> Optional[dict[str, Any]]:
        """Run quality gate on local downloaded file (>=1080p, >=3.0s)."""
        try:
            meta = probe_video(clip_path)
        except Exception as e:
            logger.warning(f"Rejecting clip '{clip_path.name}': ffprobe failed ({e})")
            return None

        dur = meta.get("duration", 0.0)
        w = meta.get("width", 0)
        h = meta.get("height", 0)

        if dur < 3.0:
            logger.warning(
                f"Rejecting clip '{clip_path.name}': duration {dur:.2f}s is shorter than 3.0s minimum."
            )
            return None

        if w < 1080 and h < 1080:
            logger.warning(
                f"Rejecting clip '{clip_path.name}': resolution {w}x{h} is smaller than 1080p."
            )
            return None

        return meta

    def get_clip(self, mood: str = "nature", min_seconds: float = 8.0) -> Path:
        """Select, download (if needed), and return a verified Google Drive video clip.

        Args:
            mood: Mood keyword (e.g. lake, mountain, sunset).
            min_seconds: Minimum clip duration required.

        Returns:
            Path: Local path to ready-to-use video clip.
        """
        remote_files = self.list_video_files()
        if not remote_files:
            raise FileNotFoundError(
                f"No video files found in Google Drive folder '{self.folder_id}'."
            )

        # Tag matching: check if mood appears in path tags or filename
        mood_clean = mood.strip().lower()
        preferred_files: list[dict[str, Any]] = []
        other_files: list[dict[str, Any]] = []

        for f in remote_files:
            tag_context = f.get("path_tags", "").lower()
            if mood_clean in tag_context:
                preferred_files.append(f)
            else:
                other_files.append(f)

        pool = preferred_files if preferred_files else other_files
        random.shuffle(pool)

        # Usage tracking & cooldown
        conn = init_db(self.db_path)
        recently_used = set(get_recently_used_clip_paths(conn, limit=self.reuse_cooldown))

        # Sort candidates: non-recently used first
        candidates = sorted(pool, key=lambda item: 1 if item["id"] in recently_used else 0)

        for candidate in candidates:
            downloaded_path = self.download_file(candidate)
            if not downloaded_path:
                continue

            # Quality gate validation
            meta = self._validate_local_clip(downloaded_path)
            if not meta:
                continue

            # Record usage in DB
            record_clip_usage(
                conn,
                path=str(downloaded_path),
                source="gdrive",
                source_id=candidate["id"],
            )

            logger.info(
                f"Selected Google Drive background clip: '{candidate['name']}' (ID: {candidate['id']})"
            )
            return downloaded_path

        raise FileNotFoundError(
            f"No Google Drive clips passed the quality gate and download checks in folder '{self.folder_id}'."
        )

