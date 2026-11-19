"""FFmpeg filtergraph construction and subprocess execution."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def build_ffmpeg_command(
    input_video: Path,
    output_video: Path,
    duration: float,
    filter_complex: str,
    fps: int = 30,
) -> list[str]:
    """Assemble the FFmpeg command line arguments.

    Args:
        input_video: Input video clip path.
        output_video: Destination MP4 file path.
        duration: Target video duration in seconds.
        filter_complex: Combined FFmpeg filter graph string.
        fps: Target frame rate.

    Returns:
        List of command arguments ready for subprocess execution.
    """
    raise NotImplementedError("Phase 1 milestone: FFmpeg command construction.")

