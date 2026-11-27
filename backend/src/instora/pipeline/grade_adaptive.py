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
    color_preset: str = "auto",
    brightness: float = 0.0,
    contrast: float = 1.05,
    saturation: float = 1.12,
) -> list[str]:
    """Construct FFmpeg filter chain for adaptive/custom color grading and lanczos scaling."""
    filters: list[str] = [
        f"scale={target_w}:{target_h}:flags=lanczos:force_original_aspect_ratio=increase",
        f"crop={target_w}:{target_h}",
        "setsar=1",
    ]

    if apply_unsharp:
        filters.append("unsharp=5:5:0.5:5:5:0.0")

    # Clamp user values cleanly
    b_val = max(-0.5, min(0.5, float(brightness)))
    c_val = max(0.5, min(2.0, float(contrast)))
    s_val = max(0.0, min(2.5, float(saturation)))

    preset = (color_preset or "auto").lower().strip()

    if preset == "warm_amber":
        filters.append(f"eq=brightness={b_val:.2f}:contrast={c_val:.2f}:saturation={s_val:.2f}")
        filters.append("colorbalance=rs=0.16:gs=0.04:bs=-0.16")
    elif preset == "moody_cold":
        filters.append(f"eq=brightness={b_val:.2f}:contrast={c_val:.2f}:saturation={s_val:.2f}")
        filters.append("colorbalance=rs=-0.14:gs=0.01:bs=0.18")
    elif preset == "forest":
        filters.append(f"eq=brightness={b_val:.2f}:contrast={c_val:.2f}:saturation={s_val:.2f}")
        filters.append("colorbalance=rs=-0.10:gs=0.14:bs=-0.06")
    elif preset == "noir":
        filters.append(f"eq=brightness={b_val:.2f}:contrast={c_val:.2f}:saturation=0.02")
    elif preset == "custom":
        filters.append(f"eq=brightness={b_val:.2f}:contrast={c_val:.2f}:saturation={s_val:.2f}")
    else:
        # Auto adaptive grade (respecting any fine-tuned slider tweaks if provided)
        if scene_tone == "warm":
            eff_c = c_val if c_val != 1.05 else 1.08
            eff_s = s_val if s_val != 1.12 else 1.22
            filters.append(f"eq=brightness={b_val:.2f}:contrast={eff_c:.2f}:saturation={eff_s:.2f}")
            filters.append("colorbalance=rs=0.06:gs=0.015:bs=-0.06")
        else:
            filters.append(f"eq=brightness={b_val:.2f}:contrast={c_val:.2f}:saturation={s_val:.2f}")

    return filters


def convert_to_60fps(
    input_video: Path,
    output_video: Path,
    native_fps: float,
    start_time: float = 0.0,
    duration: Optional[float] = None,
    target_width: int = 1080,
    target_height: int = 1920,
    target_fps: int = 60,
) -> Path:
    """Ensure video is converted to target resolution, Lanczos upscale/crop, and auto-trimmed."""
    output_video.parent.mkdir(parents=True, exist_ok=True)

    cmd = ["ffmpeg", "-y"]
    if start_time > 0:
        cmd.extend(["-ss", f"{start_time:.2f}"])
    cmd.extend(["-i", str(input_video)])
    if duration:
        cmd.extend(["-t", f"{duration:.2f}"])

    # High quality format filter with lanczos upscale & exact aspect crop
    vf_filters = [
        f"scale={target_width}:{target_height}:flags=lanczos:force_original_aspect_ratio=increase",
        f"crop={target_width}:{target_height}",
        f"fps={target_fps}",
    ]
    vf_str = ",".join(vf_filters)

    logger.info(
        f"Converting clip to {target_width}x{target_height} @ {target_fps}fps (start={start_time:.2f}s, "
        f"duration={duration or 'full'}s, native_fps={native_fps:.1f})..."
    )
    cmd.extend([
        "-vf", vf_str,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-an",
        str(output_video),
    ])

    subprocess.run(cmd, capture_output=True, check=True)
    return output_video

