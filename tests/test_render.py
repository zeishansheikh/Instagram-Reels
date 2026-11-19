"""Tests for video rendering pipeline and ffprobe verification."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from reelforge.render.ffmpeg_cmd import calculate_duration, probe_video
from reelforge.render.pipeline import render_preview


@pytest.fixture
def sample_input_video(tmp_path: Path) -> Path:
    """Generate a temporary 16:9 landscape video for testing crop, scale, and loop."""
    input_video = tmp_path / "sample_input.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=size=1280x720:rate=30",
        "-t", "3",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        str(input_video),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return input_video


def test_calculate_duration() -> None:
    """Validate word-count-based duration clamping."""
    # 2 words: 2 * 0.45 + 3 = 3.9 -> clamps to min 8.0
    assert calculate_duration("Two words", 8.0, 12.0) == 8.0

    # 30 words: 30 * 0.45 + 3 = 16.5 -> clamps to max 12.0
    long_quote = "word " * 30
    assert calculate_duration(long_quote, 8.0, 12.0) == 12.0

    # 13 words: 13 * 0.45 + 3 = 8.85 -> within [8.0, 12.0]
    mid_quote = "word " * 13
    assert pytest.approx(calculate_duration(mid_quote, 8.0, 12.0), 0.01) == 8.85


def test_render_preview_resolution_and_duration(sample_input_video: Path, tmp_path: Path) -> None:
    """Render a preview and verify 1080x1920 resolution, silent AAC audio, and duration with ffprobe."""
    output_video = tmp_path / "test_output.mp4"
    quote = "Still waters reflect the heavens. Take your time and find your peace."
    style_path = Path("styles/degraaf.yaml")

    # Target duration calculation
    expected_duration = calculate_duration(quote, 8.0, 12.0)

    # Render preview
    rendered_path = render_preview(
        video_path=sample_input_video,
        quote=quote,
        style_path=style_path,
        output_path=output_video,
    )

    assert rendered_path.exists()
    assert rendered_path.stat().st_size > 0

    # Inspect with ffprobe
    metadata = probe_video(rendered_path)
    assert metadata["width"] == 1080
    assert metadata["height"] == 1920
    assert pytest.approx(metadata["duration"], abs=0.2) == expected_duration

    # Verify audio stream using ffprobe directly
    probe_cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=codec_name",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(rendered_path),
    ]
    audio_codec = subprocess.run(probe_cmd, capture_output=True, text=True, check=True).stdout.strip()
    assert audio_codec == "aac"

