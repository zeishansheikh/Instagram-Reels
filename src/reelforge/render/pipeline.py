"""Video rendering pipeline orchestrator for Reel Forge."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

import yaml
from loguru import logger

from reelforge.quotes.generator import Quote
from reelforge.render.ffmpeg_cmd import build_ffmpeg_command


def load_style(style_path: Path | str = "styles/degraaf.yaml") -> dict[str, Any]:
    """Load styling parameters from a YAML file with fallback to default.

    Args:
        style_path: Path to style YAML file.

    Returns:
        Dict representing parsed style configuration.
    """
    path = Path(style_path)
    if not path.exists():
        fallback = Path("styles/default.yaml")
        if fallback.exists():
            path = fallback
        else:
            raise FileNotFoundError(f"Style file not found at {style_path} and no default available.")

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        return data if isinstance(data, dict) else {}


def render_preview(
    video_path: Path | str,
    quote: str,
    style_path: Path | str = "styles/degraaf.yaml",
    output_path: Path | str = "output/preview/preview.mp4",
) -> Path:
    """Render a single preview reel from an input clip, quote text, and style YAML.

    Args:
        video_path: Source input video path.
        quote: Quote string to render.
        style_path: Path to style YAML configuration.
        output_path: Destination path for finished MP4.

    Returns:
        Path to the finished preview video.
    """
    video_p = Path(video_path)
    if not video_p.exists():
        raise FileNotFoundError(f"Input video not found: {video_path}")

    out_p = Path(output_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)

    style = load_style(style_path)
    cmd, target_dur = build_ffmpeg_command(
        input_video=video_p,
        quote=quote,
        style=style,
        output_video=out_p,
    )

    logger.info(f"Rendering preview: duration={target_dur:.2f}s, output={out_p}")
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg render failed:\n{e.stderr}")
        raise RuntimeError(f"FFmpeg failed with exit code {e.returncode}: {e.stderr}") from e

    logger.info(f"Preview successfully generated at {out_p}")
    return out_p


def render_reel(
    quote: Quote,
    clip_path: Path,
    style_config: dict[str, Any],
    output_path: Path,
) -> Path:
    """Render a complete batch reel.

    Args:
        quote: Quote data model.
        clip_path: Source clip path.
        style_config: Parsed style dictionary.
        output_path: Target video file path.

    Returns:
        Path to rendered reel.
    """
    out_p = Path(output_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)

    cmd, _ = build_ffmpeg_command(
        input_video=clip_path,
        quote=quote.text,
        style=style_config,
        output_video=out_p,
    )

    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return out_p
