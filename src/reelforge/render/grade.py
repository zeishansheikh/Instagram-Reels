"""Video color grading, darken overlay, grain, vignette, and blur filter generation."""

from __future__ import annotations

from typing import Any


def build_background_filters(
    style_bg: dict[str, Any],
    canvas_width: int = 1080,
    canvas_height: int = 1920,
    fps: int = 30,
) -> list[str]:
    """Generate the FFmpeg video filter chain for framing and visual grading.

    Args:
        style_bg: Background dictionary from style YAML (darkness, blur, grade, grain, vignette).
        canvas_width: Output width (1080).
        canvas_height: Output height (1920).
        fps: Output frame rate (30).

    Returns:
        List of filter strings to be chained in FFmpeg filtergraph.
    """
    filters: list[str] = [
        f"scale={canvas_width}:{canvas_height}:force_original_aspect_ratio=increase",
        f"crop={canvas_width}:{canvas_height}",
        "setsar=1",
        f"fps={fps}",
    ]

    # 1. Darken overlay (e.g. 0.20 -> drawbox black with alpha 0.20)
    darkness = float(style_bg.get("overlay_darkness", 0.20))
    if darkness > 0.0:
        filters.append(f"drawbox=c=black@{darkness:.2f}:t=fill")

    # 2. Optional blur
    blur = float(style_bg.get("blur", 0.0))
    if blur > 0.0:
        filters.append(f"boxblur=luma_radius={blur:.1f}:luma_power=1")

    # 3. Grade preset
    grade = str(style_bg.get("grade", "natural_warm")).lower()
    if grade in ("natural_warm", "warm"):
        # Boost red/yellow highlights & mids subtly, reduce cold blue
        filters.append("colorbalance=rs=0.05:gs=0.02:bs=-0.05:rm=0.04:gm=0.02:bm=-0.04")

    # 4. Light grain
    grain = float(style_bg.get("grain", 0.05))
    if grain > 0.0:
        strength = max(1, min(100, int(grain * 100)))
        filters.append(f"noise=alls={strength}:allf=t+u")

    # 5. Vignette
    vignette = float(style_bg.get("vignette", 0.15))
    if vignette > 0.0:
        filters.append("vignette=PI/4")

    return filters
