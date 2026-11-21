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
from PIL import Image


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
                    r, g, b = 0, 0, 0
                    pixels = list(rgb.getdata())
                    step = max(1, len(pixels) // 500)
                    sampled = pixels[::step]
                    for px in sampled:
                        r += px[0]
                        g += px[1]
                        b += px[2]
                    n = len(sampled)
                    avg_r, avg_g, avg_b = r / n, g / n, b / n
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
    """Ensure video is converted to 60fps.

    If native 60fps (>= 59.9), skips minterpolate.
    Otherwise applies minterpolate=fps=60:mi_mode=mci:me_mode=bidir:scd=none
    with 1.0s lead-in trimmed off.
    """
    output_video.parent.mkdir(parents=True, exist_ok=True)

    if native_fps >= 59.9:
        logger.info(f"Source clip is native {native_fps:.1f}fps. Skipping minterpolate.")
        cmd = ["ffmpeg", "-y"]
        if start_time > 0:
            cmd.extend(["-ss", f"{start_time:.2f}"])
        cmd.extend(["-i", str(input_video)])
        if duration:
            cmd.extend(["-t", f"{duration:.2f}"])
        cmd.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", str(output_video)])
        subprocess.run(cmd, capture_output=True, check=True)
        return output_video

    # Apply minterpolate with 1.0s lead-in
    logger.info(f"Interpolating from {native_fps:.1f}fps to 60fps with 1.0s lead-in...")
    lead_in = 1.0 if start_time >= 1.0 else 0.0
    actual_start = max(0.0, start_time - lead_in)
    actual_dur = (duration + lead_in) if duration else None

    # Step 1: Interpolate with lead-in
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_interp:
        cmd1 = [
            "ffmpeg", "-y",
            "-ss", f"{actual_start:.2f}",
            "-i", str(input_video),
        ]
        if actual_dur:
            cmd1.extend(["-t", f"{actual_dur:.2f}"])

        cmd1.extend([
            "-vf", "minterpolate=fps=60:mi_mode=mci:me_mode=bidir:scd=none",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-an",
            tmp_interp.name
        ])

        try:
            subprocess.run(cmd1, capture_output=True, text=True, check=True)
            # Step 2: Trim lead-in
            cmd2 = [
                "ffmpeg", "-y",
                "-ss", f"{lead_in:.2f}",
                "-i", tmp_interp.name,
            ]
            if duration:
                cmd2.extend(["-t", f"{duration:.2f}"])
            cmd2.extend(["-c:v", "copy", "-an", str(output_video)])
            subprocess.run(cmd2, capture_output=True, text=True, check=True)
        finally:
            Path(tmp_interp.name).unlink(missing_ok=True)

    return output_video

