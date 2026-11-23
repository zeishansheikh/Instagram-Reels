"""Text placement lock (middle-centre) and drawtext assembly per Section 3.

PLACEMENT LOCK (2026-11-21):
- Text is FIXED in the MIDDLE-CENTRE: block centre y ≈ 960 on 1080x1920. NEVER top, NEVER bottom.
- Stay in the middle third (y 640–1280).
- Samples center column (x 340–740) across horizontal bands and chooses darkest band nearest y=960 with luma < 80.
- Font: Noto Serif SEMIBOLD, upright (NOT italic). Fontsize 30 on 1080x1920. White, no background box.
- Shadow: STRONG black — shadowcolor=black@0.9:shadowx=0:shadowy=2.
- Reveal: ALL AT ONCE (static from t=0 to end).
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple
from loguru import logger
from PIL import Image, ImageFont, ImageStat


def resolve_d3_font() -> str:
    """Resolve Noto Serif SemiBold font path with fallbacks."""
    candidates = [
        "/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "assets/fonts/default.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return "sans-serif"


def find_optimal_center_y(
    video_path: Path | str,
    text_height: int = 120,
    target_center_y: int = 960,
    min_y: int = 640,
    max_y: int = 1280,
) -> int:
    """Sample frames and locate darkest calm horizontal band nearest vertical centre.

    Measures mean luma in center column (x: 340 to 740) where centered text sits.
    Returns optimal block center y coordinate inside middle third [640, 1280].
    """
    path = Path(video_path)
    if not path.exists():
        return target_center_y

    band_lumas: dict[int, float] = {}

    with tempfile.TemporaryDirectory() as tmpdir:
        frame_path = Path(tmpdir) / "sample.png"
        cmd = ["ffmpeg", "-y", "-ss", "00:00:02", "-i", str(path), "-vframes", "1", str(frame_path)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if frame_path.exists():
            try:
                with Image.open(frame_path) as img:
                    w, h = img.size
                    # Scale coordinates if not 1080x1920
                    scale_x = w / 1080.0
                    scale_y = h / 1920.0

                    x1 = int(340 * scale_x)
                    x2 = int(740 * scale_x)

                    # Scan horizontal bands in 40px steps inside middle third
                    for center_candidate in range(min_y, max_y + 1, 40):
                        y1 = max(0, int((center_candidate - (text_height // 2)) * scale_y))
                        y2 = min(h, int((center_candidate + (text_height // 2)) * scale_y))

                        band = img.crop((x1, y1, x2, y2)).convert("L")
                        avg_luma = ImageStat.Stat(band).mean[0] if band.size[0] > 0 and band.size[1] > 0 else 128.0
                        band_lumas[center_candidate] = avg_luma
            except Exception as exc:
                logger.debug(f"Center band measurement error: {exc}")

    if not band_lumas:
        return target_center_y

    # 1. Filter bands with luma < 80.0 (per Section 3 spec)
    calm_dark_bands = [y for y, luma in band_lumas.items() if luma < 80.0]

    if calm_dark_bands:
        # Choose band closest to target_center_y (960)
        best_y = min(calm_dark_bands, key=lambda y: abs(y - target_center_y))
        logger.info(f"Placement lock: chosen dark calm band y={best_y} (luma={band_lumas[best_y]:.1f} < 80)")
        return best_y

    # 2. Fallback: choose band with lowest luma in the middle third
    best_y = min(band_lumas.keys(), key=lambda y: (band_lumas[y], abs(y - target_center_y)))
    logger.info(f"Placement lock: fallback lowest luma band in middle third y={best_y} (luma={band_lumas[best_y]:.1f})")
    return best_y


def escape_drawtext_str(s: str) -> str:
    """Escape text strings for FFmpeg drawtext."""
    s = s.replace("\\", "\\\\")
    s = s.replace("'", "\\'")
    s = s.replace(":", "\\:")
    s = s.replace("%", "\\%")
    return s


def build_d3_drawtext_filter(
    lines: List[str],
    video_path: Optional[Path | str] = None,
    font_size: int = 30,
) -> str:
    """Build FFmpeg drawtext filter string for D3 formula.

    - Noto Serif SemiBold 30
    - White text (#FFFFFF)
    - Strong black shadow (shadowcolor=black@0.9:shadowx=0:shadowy=2)
    - ALL AT ONCE reveal from t=0 to end
    - Middle-centre placement lock
    """
    font_path = resolve_d3_font()
    line_spacing = int(font_size * 1.5)  # 45px
    total_text_h = len(lines) * line_spacing

    optimal_center_y = 960
    if video_path:
        optimal_center_y = find_optimal_center_y(video_path, text_height=total_text_h)

    # Calculate starting y for first line so that the block is centered on optimal_center_y
    start_y = optimal_center_y - (total_text_h // 2)

    filter_parts: List[str] = []

    for idx, raw_line in enumerate(lines):
        clean = raw_line.strip()
        # Clean forbidden characters: em-dash, colon, single quote
        clean = clean.replace("—", "-").replace(":", "-").replace("'", "")
        escaped = escape_drawtext_str(clean)
        line_y = start_y + (idx * line_spacing)

        part = (
            f"drawtext=fontfile='{font_path}':"
            f"text='{escaped}':"
            f"fontsize={font_size}:"
            f"fontcolor=white:"
            f"shadowcolor=black@0.9:shadowx=0:shadowy=2:"
            f"x=(w-text_w)/2:"
            f"y={line_y}"
        )
        filter_parts.append(part)

    return ",".join(filter_parts)

