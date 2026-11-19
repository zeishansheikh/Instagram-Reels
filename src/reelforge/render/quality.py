"""Automatic quality gates: safe margins, luminance sampling, and contrast adaptation."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from PIL import Image
from loguru import logger

from reelforge.render.text_layout import layout_text, resolve_font_path


def check_safe_margins(
    text: str,
    font_path: str,
    font_size: int = 60,
    max_lines: int = 4,
    canvas_w: int = 1080,
    canvas_h: int = 1920,
    safe_margin_x: int = 90,
    safe_margin_y: int = 200,
) -> tuple[bool, str, list[str]]:
    """Check that rendered text fits comfortably inside safe margins and line limits.

    Args:
        text: Quote text.
        font_path: Font path.
        font_size: Starting font size.
        max_lines: Maximum allowable lines (4).
        canvas_w: Canvas width (1080).
        canvas_h: Canvas height (1920).
        safe_margin_x: Horizontal safe margin (90px on each side).
        safe_margin_y: Vertical safe margin (200px from top and bottom).

    Returns:
        Tuple of (fits_safely: bool, explanation: str, lines: list[str]).
    """
    resolved = resolve_font_path(font_path)
    lines, adjusted_size, line_height = layout_text(
        text=text,
        font_path=resolved,
        base_font_size=font_size,
        max_lines=max_lines,
        canvas_width=canvas_w,
        max_width_pct=0.80,
        safe_margin_px=safe_margin_x,
    )

    if len(lines) > max_lines:
        return False, f"Line count {len(lines)} exceeds max {max_lines}", lines

    total_h = len(lines) * line_height
    max_allowed_h = canvas_h - (2 * safe_margin_y)
    if total_h > max_allowed_h:
        return False, f"Total text height {total_h}px exceeds safe vertical space {max_allowed_h}px", lines

    return True, "Text fits safely within all margins", lines


def calculate_text_bounding_box(
    lines: list[str],
    line_height: int,
    canvas_w: int = 1080,
    canvas_h: int = 1920,
    padding: int = 40,
) -> tuple[int, int, int, int]:
    """Calculate the (x1, y1, x2, y2) pixel bounding box of the centered text region."""
    total_h = len(lines) * line_height
    y1 = max(0, ((canvas_h - total_h) // 2) - padding)
    y2 = min(canvas_h, y1 + total_h + (2 * padding))

    # Center 80% horizontal area
    margin_x = int(canvas_w * 0.10)
    x1 = margin_x
    x2 = canvas_w - margin_x

    return (x1, y1, x2, y2)


def sample_background_luminance(
    clip_path: Path | str,
    sample_time: float = 2.0,
    crop_box: Optional[tuple[int, int, int, int]] = None,
) -> float:
    """Sample the average relative luminance (0.0 to 1.0) of the video background in the text area.

    Uses FFmpeg to grab a single frame and Pillow to measure ITU-R BT.709 luminance.

    Args:
        clip_path: Video clip path.
        sample_time: Timestamp in seconds to extract sample frame.
        crop_box: Optional (x1, y1, x2, y2) region to measure.

    Returns:
        Average luminance float between 0.0 (pitch black) and 1.0 (pure white).
    """
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_img = Path(tmp.name)

    cmd = [
        "ffmpeg",
        "-y",
        "-ss", f"{sample_time:.2f}",
        "-i", str(clip_path),
        "-vframes", "1",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        str(tmp_img),
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True)
        img = Image.open(tmp_img).convert("RGB")

        if crop_box:
            x1, y1, x2, y2 = crop_box
            img = img.crop((x1, y1, x2, y2))

        # Convert to grayscale and downscale to 50x50 for fast luminance computation
        gray = img.convert("L").resize((50, 50))
        pixels = list(gray.tobytes())
        return sum(pixels) / (255.0 * len(pixels))

    except Exception as exc:
        logger.warning(f"Could not sample luminance from '{clip_path}': {exc}. Defaulting to 0.30")
        return 0.30
    finally:
        if tmp_img.exists():
            tmp_img.unlink(missing_ok=True)


def is_contrast_sufficient(background_luminance: float, max_allowed_luminance: float = 0.48) -> bool:
    """Check if contrast between white text and background is sufficient.

    Since quote text is white (#FFFFFF), higher background luminance reduces readability.
    If background luminance exceeds max_allowed_luminance, contrast is insufficient.
    """
    return background_luminance <= max_allowed_luminance

