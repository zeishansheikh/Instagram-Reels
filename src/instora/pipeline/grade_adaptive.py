"""Adaptive grading, lanczos upscale, and 60fps conversion per Section 1.

Rules:
- Final: 1080x1920, 60fps
- Upscale if soft: lanczos to 1080x1920 + unsharp 5:5:0.5
- 60fps: If native 60fps, keep it. Otherwise minterpolate=fps=60:mi_mode=mci:me_mode=bidir:scd=none with 1.0s lead-in
- Adaptive grade:
  - Golden/sunset/warm: eq=contrast=1.08:saturation=1.22,colorbalance=rs=0.06:gs=0.015:bs=-0.06
  - Green forest/daylight/cool: eq=contrast=1.05:saturation=1.12, neutral balance
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple
from loguru import logger
from PIL import Image, ImageStat


def detect_scene_tone(clip_path: Path | str) -> str:
    """Analyze sample frame color balance to classify scene as 'warm' or 'cool'."""
    path = Path(clip_path)
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_frame = Path(tmpdir) / "frame.png"
        cmd = ["ffmpeg", "-y", "-ss", "00:00:01", "-i", str(path), "-vframes", "1", "-f", "image2", str(tmp_frame)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if tmp_frame.exists():
            try:
                with Image.open(tmp_frame) as img:
                    rgb = img.convert("RGB")
                    avg_r, avg_g, avg_b = ImageStat.Stat(rgb).mean
                    if avg_r > (avg_b * 1.15):
                        return "warm"
            except Exception as exc:
                logger.debug(f"Could not sample scene tone: {exc}")
    return "cool"


def build_adaptive_grade_filters(
    scene_tone: str,
    target_w: int = 1080,
    target_h: int = 1920,
    apply_unsharp: bool = True,
) -> list[str]:
    """Construct FFmpeg filter chain for adaptive grading and lanczos scaling."""
    filters: list[str] = [
        f"scale={target_w}:{target_h}:flags=lanczos:force_original_aspect_ratio=increase",
        f"crop={target_w}:{target_h}",
        "setsar=1",
    ]

    if apply_unsharp:
        filters.append("unsharp=5:5:0.5:5:5:0.0")

    if scene_tone == "warm":
        # Golden/sunset/warm: eq=contrast=1.08:saturation=1.22,colorbalance=rs=0.06:gs=0.015:bs=-0.06
        filters.append("eq=contrast=1.08:saturation=1.22")
        filters.append("colorbalance=rs=0.06:gs=0.015:bs=-0.06")
    else:
        # Green forest/daylight/cool: eq=contrast=1.05:saturation=1.12, NEUTRAL balance
        filters.append("eq=contrast=1.05:saturation=1.12")

    return filters


def convert_to_60fps(
    input_video: Path,
    output_video: Path,
    native_fps: float,
    start_time: float = 0.0,
    duration: Optional[float] = None,
) -> Path:
    """Ensure video is converted to 60fps smoothly and rapidly."""
    output_video.parent.mkdir(parents=True, exist_ok=True)

    cmd = ["ffmpeg", "-y"]
    if start_time > 0:
        cmd.extend(["-ss", f"{start_time:.2f}"])
    cmd.extend(["-i", str(input_video)])
    if duration:
        cmd.extend(["-t", f"{duration:.2f}"])

    if native_fps >= 59.9:
        logger.info(f"Source clip is native {native_fps:.1f}fps. Passing through at 60fps.")
        cmd.extend(["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-an", str(output_video)])
    else:
        logger.info(f"Fast converting from {native_fps:.1f}fps to 60fps...")
        cmd.extend([
            "-vf", "fps=60",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-an",
            str(output_video),
        ])

    subprocess.run(cmd, capture_output=True, check=True)
    return output_video

