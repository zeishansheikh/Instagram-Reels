"""Tests for local folder background provider, quality gates, tag matching, and single-file mode."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from instora.backgrounds.base import BackgroundProvider
from instora.backgrounds.local_folder import LocalFolderBackgroundProvider
from instora.db import get_recently_used_clip_paths, get_used_segments, init_db


def create_synthetic_video(path: Path, width: int, height: int, duration: float) -> Path:
    """Helper to create synthetic MP4 file for testing with exact resolution and duration."""
    path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", f"testsrc=size={width}x{height}:rate=30",
        "-t", f"{duration:.2f}",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        str(path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return path


def test_background_provider_protocol_conformance() -> None:
    """Verify that LocalFolderBackgroundProvider implements BackgroundProvider protocol."""
    provider = LocalFolderBackgroundProvider()
    assert isinstance(provider, BackgroundProvider)


def test_quality_gates(tmp_path: Path) -> None:
    """Verify rejection of clips < 3s or smaller than 1080p."""
    bg_dir = tmp_path / "backgrounds"
    bg_dir.mkdir()
    db_file = tmp_path / "test.db"

    # 1. Short clip (2.0s, 1920x1080) -> should be rejected
    short_clip = bg_dir / "too_short.mp4"
    create_synthetic_video(short_clip, 1920, 1080, duration=2.0)

    # 2. Low res clip (5.0s, 720x480) -> should be rejected
    low_res_clip = bg_dir / "low_res.mp4"
    create_synthetic_video(low_res_clip, 720, 480, duration=5.0)

    # 3. Valid clip (5.0s, 1920x1080) -> should be accepted
    valid_clip = bg_dir / "valid_clip.mp4"
    create_synthetic_video(valid_clip, 1920, 1080, duration=5.0)

    provider = LocalFolderBackgroundProvider(folder=bg_dir, db_path=db_file)
    selected = provider.get_clip(mood="general", min_seconds=4.0)

    # Only valid_clip should be chosen
    assert selected.resolve() == valid_clip.resolve()


def test_tag_matching_preference(tmp_path: Path) -> None:
    """Verify that clips matching mood in filename or subfolder are preferred."""
    bg_dir = tmp_path / "backgrounds"
    db_file = tmp_path / "test.db"

    # Create general clip
    create_synthetic_video(bg_dir / "general_nature.mp4", 1920, 1080, duration=5.0)

    # Create clip matching 'lake'
    lake_clip = create_synthetic_video(bg_dir / "lake_reflection_01.mp4", 1920, 1080, duration=5.0)

    provider = LocalFolderBackgroundProvider(folder=bg_dir, db_path=db_file)
    selected = provider.get_clip(mood="lake", min_seconds=4.0)

    assert selected.resolve() == lake_clip.resolve()


def test_usage_tracking_and_cooldown(tmp_path: Path) -> None:
    """Verify clip usage is logged in SQLite and cooldown avoids immediate reuse."""
    bg_dir = tmp_path / "backgrounds"
    db_file = tmp_path / "test.db"

    clip1 = create_synthetic_video(bg_dir / "clip_alpha.mp4", 1920, 1080, duration=5.0)
    clip2 = create_synthetic_video(bg_dir / "clip_beta.mp4", 1920, 1080, duration=5.0)

    provider = LocalFolderBackgroundProvider(folder=bg_dir, db_path=db_file, reuse_cooldown=2)

    # First call: picks one
    first_choice = provider.get_clip(mood="nature", min_seconds=4.0)
    assert first_choice.resolve() in (clip1.resolve(), clip2.resolve())

    # Second call: because reuse_cooldown=2, must pick the OTHER clip
    second_choice = provider.get_clip(mood="nature", min_seconds=4.0)
    assert second_choice.resolve() != first_choice.resolve()

    # Verify both recorded in DB
    conn = init_db(db_file)
    recent = get_recently_used_clip_paths(conn, limit=10)
    assert len(recent) == 2


def test_single_file_mode_segment_extraction(tmp_path: Path) -> None:
    """Verify single-file mode extracts distinct, non-overlapping segments and records them."""
    long_video = tmp_path / "long_nature.mp4"
    # Create 15-second video
    create_synthetic_video(long_video, 1920, 1080, duration=15.0)

    db_file = tmp_path / "test.db"
    cache_dir = tmp_path / "cache_segments"

    provider = LocalFolderBackgroundProvider(
        single_video_path=long_video,
        db_path=db_file,
        cache_dir=cache_dir,
    )

    # Extract first 5s segment
    seg1 = provider.get_clip(mood="nature", min_seconds=5.0)
    assert seg1.exists()
    s1_start, s1_end = provider.last_selected_segment

    # Extract second 5s segment
    seg2 = provider.get_clip(mood="nature", min_seconds=5.0)
    assert seg2.exists()
    s2_start, s2_end = provider.last_selected_segment

    # Segments should not be identical
    assert seg1 != seg2
    assert abs(s1_start - s2_start) >= 2.0  # distinct start offsets

    # Verify segments recorded in DB
    conn = init_db(db_file)
    segments = get_used_segments(conn, str(long_video))
    assert len(segments) == 2

