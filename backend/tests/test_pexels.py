"""Tests for Pexels background provider with mocked HTTP client."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock

import httpx
import pytest

from instora.backgrounds.base import BackgroundProvider
from instora.backgrounds.pexels import (
    DEFAULT_KEYWORDS,
    MOOD_KEYWORDS_MAP,
    PexelsBackgroundProvider,
)
from instora.db import init_db
from tests.test_backgrounds import create_synthetic_video


def test_pexels_protocol_conformance() -> None:
    """Verify that PexelsBackgroundProvider implements BackgroundProvider."""
    provider = PexelsBackgroundProvider(api_key="mock_key")
    assert isinstance(provider, BackgroundProvider)


def test_mood_keyword_mapping() -> None:
    """Verify mood keyword selection resolves to curated STYLE_GUIDE queries."""
    provider = PexelsBackgroundProvider(api_key="mock_key")

    for mood, keywords in MOOD_KEYWORDS_MAP.items():
        query = provider._select_query(mood)
        assert query in keywords

    # Fallback default
    query_unknown = provider._select_query("unrecognized_mood_xyz")
    assert query_unknown in DEFAULT_KEYWORDS


def test_best_video_file_quality_filter() -> None:
    """Verify filtering of video files to >= 1080p and priority scoring."""
    provider = PexelsBackgroundProvider(api_key="mock_key")

    video_payload = {
        "id": 100,
        "video_files": [
            # Low resolution (720p) -> must be rejected
            {"id": 1, "file_type": "video/mp4", "width": 1280, "height": 720, "link": "http://example.com/720p.mp4"},
            # Non-mp4 -> must be rejected
            {"id": 2, "file_type": "video/webm", "width": 1920, "height": 1080, "link": "http://example.com/1080p.webm"},
            # HD 1080p vertical -> perfect match
            {"id": 3, "file_type": "video/mp4", "width": 1080, "height": 1920, "link": "http://example.com/1080p_vert.mp4"},
            # 4K landscape
            {"id": 4, "file_type": "video/mp4", "width": 3840, "height": 2160, "link": "http://example.com/4k.mp4"},
        ],
    }

    best = provider._best_video_file(video_payload)
    assert best is not None
    assert best["id"] == 3
    assert best["width"] == 1080
    assert best["height"] == 1920


def test_pexels_search_and_db_recording(tmp_path: Path) -> None:
    """Verify end-to-end get_clip with mocked search, synthetic download, and DB author logging."""
    cache_dir = tmp_path / "pexels_cache"
    db_file = tmp_path / "test.db"

    # Pre-create synthetic video to simulate downloaded MP4
    fake_video_source = tmp_path / "fake_pexels.mp4"
    create_synthetic_video(fake_video_source, 1080, 1920, duration=8.0)
    video_bytes = fake_video_source.read_bytes()

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "videos": [
            {
                "id": 8888,
                "duration": 8,
                "user": {"name": "Nature Photographer Alex"},
                "video_files": [
                    {
                        "id": 10,
                        "file_type": "video/mp4",
                        "width": 1080,
                        "height": 1920,
                        "link": "https://videos.pexels.com/8888.mp4",
                    }
                ],
            }
        ]
    }

    mock_client = MagicMock(spec=httpx.Client)
    mock_client.get.return_value = mock_response

    # Mock streaming download
    mock_stream_ctx = MagicMock()
    mock_stream_resp = MagicMock()
    mock_stream_resp.status_code = 200
    mock_stream_resp.iter_bytes.return_value = [video_bytes]
    mock_stream_ctx.__enter__.return_value = mock_stream_resp
    mock_client.stream.return_value = mock_stream_ctx

    provider = PexelsBackgroundProvider(
        api_key="mock_pexels_key",
        cache_dir=cache_dir,
        db_path=db_file,
        http_client=mock_client,
    )

    selected = provider.get_clip(mood="lake", min_seconds=5.0)
    assert selected.exists()
    assert selected.name == "8888.mp4"

    # Verify SQLite clips table recorded author and source_id
    conn = init_db(db_file)
    row = conn.execute("SELECT source, source_id, path FROM clips WHERE path = ?", (str(selected),)).fetchone()
    assert row is not None
    assert row[0] == "pexels"
    assert "8888" in row[1]
    assert "Nature Photographer Alex" in row[1]


def test_pexels_rate_limiting_retry(tmp_path: Path) -> None:
    """Verify 429 rate-limit handling and backoff."""
    mock_client = MagicMock(spec=httpx.Client)

    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.headers = {"Retry-After": "1"}

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {"videos": []}

    # First returns 429, second returns 200
    mock_client.get.side_effect = [resp_429, resp_200]

    provider = PexelsBackgroundProvider(
        api_key="mock_key",
        cache_dir=tmp_path / "cache",
        http_client=mock_client,
    )

    videos = provider.search_videos(query="mountain golden hour", max_retries=2)
    assert mock_client.get.call_count == 2
    assert videos == []

