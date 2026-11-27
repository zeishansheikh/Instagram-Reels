"""FFmpeg command construction, probe utilities, and filtergraph assembly."""

from __future__ import annotations

import json
import random
import shutil
import subprocess
from pathlib import Path
from typing import Any

from instora.render.grade import build_background_filters
from instora.render.text_layout import layout_text, resolve_font_path


def probe_video(video_path: Path | str) -> dict[str, Any]:
    """Inspect video file metadata using ffprobe.

    Args:
        video_path: Path to the media file.

    Returns:
        Dict with keys: duration (float), width (int), height (int).
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration:format=duration",
        "-of", "json",
        str(video_path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)

    stream = data.get("streams", [{}])[0] if data.get("streams") else {}
    format_info = data.get("format", {})

    duration_str = stream.get("duration") or format_info.get("duration") or "10.0"
    duration = float(duration_str)

    width = int(stream.get("width", 1080))
    height = int(stream.get("height", 1920))

    return {
        "duration": duration,
        "width": width,
        "height": height,
    }


def calculate_duration(
    quote: str,
    min_duration: float = 8.0,
    max_duration: float = 12.0,
) -> float:
    """Calculate target reel duration based on quote word count and style bounds.

    Formula: clamp(words * 0.45 + 3.0, min_duration, max_duration).

    Args:
        quote: Quote string.
        min_duration: Lower clamp bound from style.
        max_duration: Upper clamp bound from style.

    Returns:
        Duration in seconds (clamped).
    """
    words = len(quote.strip().split())
    raw = (words * 0.45) + 3.0
    return max(min_duration, min(max_duration, raw))


def escape_drawtext(s: str) -> str:
    """Escape text strings for safe inclusion in FFmpeg drawtext filter."""
    s = s.replace("\\", "\\\\")
    s = s.replace("'", "\\'")
    s = s.replace(":", "\\:")
    s = s.replace("%", "\\%")
    return s


def format_color(color_str: str) -> str:
    """Convert hex or named color to FFmpeg compatible format."""
    c = color_str.strip()
    if c.startswith("#"):
        return "0x" + c[1:]
    return c


def build_ffmpeg_command(
    input_video: Path,
    quote: str,
    style: dict[str, Any],
    output_video: Path,
) -> tuple[list[str], float]:
    """Build the complete FFmpeg execution command for rendering a reel.

    Args:
        input_video: Source background clip path.
        quote: Quote text to overlay.
        style: Style dictionary loaded from YAML.
        output_video: Path where the resulting MP4 will be saved.

    Returns:
        Tuple of (command_args_list, target_duration).
    """
    canvas = style.get("canvas", {})
    canvas_w = int(canvas.get("width", 1080))
    canvas_h = int(canvas.get("height", 1920))
    fps = int(canvas.get("fps", 30))

    duration_cfg = style.get("duration", {})
    min_dur = float(duration_cfg.get("min", 8.0))
    max_dur = float(duration_cfg.get("max", 12.0))
    target_dur = calculate_duration(quote, min_dur, max_dur)

    # Probe input video duration
    probe = probe_video(input_video)
    input_dur = probe["duration"]

    input_flags: list[str] = []
    # Video duration handling:
    # If longer than target, pick a random start offset.
    # If shorter or equal, loop it.
    if input_dur > target_dur:
        max_start = max(0.0, input_dur - target_dur)
        start_offset = random.uniform(0.0, max_start) if max_start > 0 else 0.0
        input_flags.extend(["-ss", f"{start_offset:.2f}"])
    else:
        input_flags.extend(["-stream_loop", "-1"])

    # 1. Base video filters (scale, crop, darken, grade, grain, vignette)
    bg_cfg = style.get("background", {})
    v_filters = build_background_filters(bg_cfg, canvas_w, canvas_h, fps)

    # 2. Text layout & typography
    text_cfg = style.get("text", {})
    font_file = resolve_font_path(str(text_cfg.get("font", "assets/fonts/default.ttf")))
    base_font_size = int(text_cfg.get("size", 60))
    max_lines = int(text_cfg.get("max_lines", 4))

    lines, font_size, line_height = layout_text(
        text=quote,
        font_path=font_file,
        base_font_size=base_font_size,
        max_lines=max_lines,
        canvas_width=canvas_w,
        max_width_pct=0.80,
        safe_margin_px=90,
    )

    # Text styling & animation
    font_color = format_color(str(text_cfg.get("color", "#FFFFFF")))
    shadow_cfg = text_cfg.get("shadow", {})
    shadow_x = int(shadow_cfg.get("x", 2))
    shadow_y = int(shadow_cfg.get("y", 2))
    shadow_color = format_color(str(shadow_cfg.get("color", "#00000099")))

    fade_in = float(text_cfg.get("fade_in", 0.8))
    stagger = float(text_cfg.get("stagger", 0.6))
    initial_delay = 0.8
    fade_out = 0.5
    fade_out_start = max(0.0, target_dur - fade_out)

    # Calculate vertical center
    total_text_h = len(lines) * line_height
    base_y = (canvas_h - total_text_h) // 2

    # Drawtext filter for each line
    escaped_font = font_file.replace("\\", "/").replace(":", "\\:")
    for idx, line in enumerate(lines):
        line_escaped = escape_drawtext(line)
        line_y = base_y + (idx * line_height)
        start_t = initial_delay + (idx * stagger)
        fade_end = start_t + fade_in

        # Alpha animation expression
        alpha_expr = (
            f"if(lt(t,{start_t:.2f}),0,"
            f"if(lt(t,{fade_end:.2f}),(t-{start_t:.2f})/{fade_in:.2f},"
            f"if(gt(t,{fade_out_start:.2f}),({target_dur:.2f}-t)/{fade_out:.2f},1)))"
        )

        drawtext_item = (
            f"drawtext=fontfile='{escaped_font}':text='{line_escaped}':"
            f"fontsize={font_size}:fontcolor={font_color}:"
            f"x=(w-text_w)/2:y={line_y}:"
            f"shadowx={shadow_x}:shadowy={shadow_y}:shadowcolor={shadow_color}:"
            f"alpha='{alpha_expr}'"
        )
        v_filters.append(drawtext_item)

    filter_complex = ",".join(v_filters)

    # Assemble complete command
    cmd: list[str] = ["ffmpeg", "-y"]
    cmd.extend(input_flags)
    cmd.extend(["-i", str(input_video)])
    # Silent stereo AAC audio track source
    cmd.extend(["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"])

    cmd.extend([
        "-filter_complex", f"[0:v]{filter_complex}[outv]",
        "-map", "[outv]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-t", f"{target_dur:.2f}",
        str(output_video),
    ])

    return cmd, target_dur
