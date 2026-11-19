"""Text typography, line-breaking, and bounding box layout for quote rendering."""

from __future__ import annotations

import textwrap
from pathlib import Path
from PIL import ImageFont


def resolve_font_path(font_setting: str) -> str:
    """Resolve font path from style setting, falling back to bundled default font.

    Args:
        font_setting: Font path specified in the style YAML.

    Returns:
        Absolute or valid relative path to an existing TTF/OTF font file.
    """
    path = Path(font_setting)
    if path.exists() and path.is_file():
        return str(path)

    # Check common fallbacks in assets/fonts/
    candidates = [
        Path("assets/fonts/default.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            return str(c)

    return font_setting


def layout_text(
    text: str,
    font_path: str,
    base_font_size: int = 60,
    max_lines: int = 4,
    canvas_width: int = 1080,
    max_width_pct: float = 0.80,
    safe_margin_px: int = 90,
) -> tuple[list[str], int, int]:
    """Break text into balanced lines that respect width and line count constraints.

    Args:
        text: The raw quote text to format.
        font_path: Path to the font file.
        base_font_size: Starting font size in pixels.
        max_lines: Maximum allowable lines (default 4).
        canvas_width: Total video canvas width.
        max_width_pct: Maximum fraction of canvas width usable (0.80 = 80%).
        safe_margin_px: Safe horizontal margin on both sides in pixels.

    Returns:
        Tuple of (lines, adjusted_font_size, line_height).
    """
    # Max allowed width is the tighter of 80% canvas width and canvas_width - 2*safe_margin
    max_allowed_width = min(int(canvas_width * max_width_pct), canvas_width - (2 * safe_margin_px))

    resolved_font = resolve_font_path(font_path)
    font_size = base_font_size

    clean_text = " ".join(text.strip().split())
    words = clean_text.split()

    # Try decreasing font sizes if lines exceed max_lines
    while font_size >= 32:
        try:
            font = ImageFont.truetype(resolved_font, font_size)
            get_width = lambda s: font.getbbox(s)[2] - font.getbbox(s)[0]
        except Exception:
            # Fallback estimation if PIL cannot load font
            get_width = lambda s: int(len(s) * font_size * 0.55)

        # Estimate average characters per line
        # Start wrapping with textwrap
        avg_char_w = max(1, get_width("abcdefghijklmnopqrstuvwxyz") // 26)
        wrap_width = max(10, max_allowed_width // avg_char_w)

        lines: list[str] = []
        current_line: list[str] = []

        for word in words:
            test_line = " ".join(current_line + [word])
            if get_width(test_line) <= max_allowed_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)
                    current_line = []

        if current_line:
            lines.append(" ".join(current_line))

        if len(lines) <= max_lines:
            line_height = int(font_size * 1.35)
            return lines, font_size, line_height

        font_size -= 4

    # Final fallback if text is exceptionally long
    line_height = int(font_size * 1.35)
    return lines[:max_lines], font_size, line_height
