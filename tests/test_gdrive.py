"""Tests for Google Drive background provider with mocked Drive API client."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from googleapiclient.errors import HttpError
from httplib2 import Response

from reelforge.backgrounds.base import BackgroundProvider
from reelforge.backgrounds.gdrive import (
    GDriveBackgroundProvider,
    compute_file_md5,
)
from tests.test_backgrounds import create_synthetic_video


def test_gdrive_protocol_conformance() -> None:
    """Verify GDriveBackgroundProvider conforms to BackgroundProvider protocol."""
    provider = GDriveBackgroundProvider(folder_id="mock_folder_123")
    assert isinstance(provider, BackgroundProvider)


def test_compute_file_md5(tmp_path: Path) -> None:
    """Verify local file MD5 computation."""
    f = tmp_path / "test.txt"
    f.write_text("reelforge_gdrive_test", encoding="utf-8")
    md5 = compute_file_md5(f)
    assert len(md5) == 32
    assert isinstance(md5, str)


def test_gdrive_list_files_recursive(tmp_path: Path) -> None:
    """Verify recursive traversal of Google Drive folders and video discovery."""
    mock_service = MagicMock()

    # Root folder contains one subfolder and one video
    root_files_response = {
        "files": [
            {
                "id": "subfolder_id_1",
                "name": "mountain_scenes",
                "mimeType": "application/vnd.google-apps.folder",
            },
            {
                "id": "video_1",
                "name": "sunset_lake.mp4",
                "mimeType": "video/mp4",
                "size": "1000000",
                "md5Checksum": "abc123md5",
            },
        ],
        "nextPageToken": None,
    }

    # Subfolder contains another video
    subfolder_files_response = {
        "files": [
            {
                "id": "video_2",
                "name": "alpenglow_peak.mp4",
                "mimeType": "video/mp4",
                "size": "2000000",
                "md5Checksum": "def456md5",
            }
        ],
        "nextPageToken": None,
    }

    def mock_list_side_effect(q, **kwargs):
        mock_req = MagicMock()
        if "root_folder_id" in q:
            mock_req.execute.return_value = root_files_response
        else:
            mock_req.execute.return_value = subfolder_files_response
        return mock_req

    mock_service.files().list.side_effect = mock_list_side_effect

    provider = GDriveBackgroundProvider(
        folder_id="root_folder_id",
        service=mock_service,
        cache_dir=tmp_path / "cache",
        db_path=tmp_path / "test.db",
    )

    videos = provider.list_video_files()
    assert len(videos) == 2
    assert videos[0]["name"] == "sunset_lake.mp4"
    assert videos[1]["name"] == "alpenglow_peak.mp4"
    assert "mountain_scenes" in videos[1]["path_tags"]


def test_gdrive_get_clip_cached(tmp_path: Path) -> None:
    """Verify that get_clip uses existing cached file if MD5 matches without re-downloading."""
    cache_dir = tmp_path / "gdrive_cache"
    cache_dir.mkdir()
    db_file = tmp_path / "test.db"

    # Create real synthetic video in cache
    cached_video = cache_dir / "vid_101.mp4"
    create_synthetic_video(cached_video, 1920, 1080, duration=6.0)
    real_md5 = compute_file_md5(cached_video)

    mock_service = MagicMock()
    mock_service.files().list().execute.return_value = {
        "files": [
            {
                "id": "vid_101",
                "name": "golden_hour.mp4",
                "mimeType": "video/mp4",
                "size": str(cached_video.stat().st_size),
                "md5Checksum": real_md5,
            }
        ],
        "nextPageToken": None,
    }

    provider = GDriveBackgroundProvider(
        folder_id="mock_folder",
        service=mock_service,
        cache_dir=cache_dir,
        db_path=db_file,
    )

    selected = provider.get_clip(mood="golden", min_seconds=5.0)

    # Should match cached file
    assert selected.resolve() == cached_video.resolve()
    # files().get_media should NOT have been called because MD5 matched
    mock_service.files().get_media.assert_not_called()


def test_gdrive_error_handling(tmp_path: Path) -> None:
    """Verify that network and API quota errors are skipped gracefully."""
    mock_service = MagicMock()

    # Simulate HttpError 403 Quota Exceeded on list
    resp = Response({"status": 403, "reason": "rateLimitExceeded"})
    mock_service.files().list.side_effect = HttpError(resp, b"Quota exceeded")

    provider = GDriveBackgroundProvider(
        folder_id="mock_folder",
        service=mock_service,
        cache_dir=tmp_path / "cache",
        db_path=tmp_path / "test.db",
    )

    with pytest.raises(FileNotFoundError):
        provider.get_clip(mood="mountain", min_seconds=5.0)

