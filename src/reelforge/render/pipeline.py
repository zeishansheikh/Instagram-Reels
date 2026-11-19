"""Video rendering pipeline orchestrator for Reel Forge."""

from __future__ import annotations

import copy
import datetime
import random
import subprocess
import time
from pathlib import Path
from typing import Any, Optional

import yaml
from google import genai
from loguru import logger

from reelforge.backgrounds import BackgroundProvider, get_background_provider
from reelforge.config import load_config
from reelforge.db import (
    get_clip_id_by_path,
    init_db,
    is_quote_rendered,
    mark_quote_used,
    record_clip_usage,
    record_reel,
)
from reelforge.packaging.caption import format_caption
from reelforge.packaging.writer import package_reel
from reelforge.quotes.generator import Quote, generate_quotes
from reelforge.render.ffmpeg_cmd import build_ffmpeg_command, calculate_duration
from reelforge.render.quality import (
    calculate_text_bounding_box,
    check_safe_margins,
    is_contrast_sufficient,
    sample_background_luminance,
)
from reelforge.render.text_layout import layout_text, resolve_font_path


def get_available_styles(styles_dir: Path | str = "styles") -> list[Path]:
    """Discover available style YAML configuration presets.

    Excludes fallback default.yaml if other distinct styles exist.
    """
    p = Path(styles_dir)
    if not p.exists() or not p.is_dir():
        return []

    presets = [f for f in sorted(p.glob("*.yaml")) if f.stem != "default"]
    if not presets:
        presets = sorted(p.glob("*.yaml"))
    return presets


def load_style(style_path: Path | str = "styles/degraaf.yaml") -> dict[str, Any]:
    """Load styling parameters from a YAML file with fallback to default or random selection.

    Args:
        style_path: Path to style YAML file or 'random'.

    Returns:
        Dict representing parsed style configuration.
    """
    str_path = str(style_path).lower().strip()
    if str_path in ("random", "styles/random", "styles/random.yaml"):
        available = get_available_styles()
        if not available:
            raise FileNotFoundError("No style presets found in 'styles/' directory.")
        path = random.choice(available)
        logger.info(f"Resolved '--style random' to preset: {path}")
    else:
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
    """Render a single preview reel from an input clip, quote text, and style YAML."""
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
        subprocess.run(cmd, capture_output=True, text=True, check=True)
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
    """Render a finished reel MP4."""
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


def batch_generate_reels(
    count: int = 10,
    theme: str = "hope",
    lang: str = "en",
    style_path: Path | str = "styles/degraaf.yaml",
    provider_name: Optional[str] = None,
    output_base_dir: Path | str = "output",
    client: Optional[genai.Client] = None,
    background_provider: Optional[BackgroundProvider] = None,
    db_path: Path | str = "db/reelforge.db",
    quotes: Optional[list[Quote]] = None,
) -> list[dict[str, Any]]:
    """Execute end-to-end batch generation pipeline for finished quote reels.

    Flow:
    1. Generate & validate quotes with Gemini AI.
    2. Deduplicate against SQLite database.
    3. Idempotency check: Skip quotes already rendered into completed reels.
    4. For each quote:
       - Pick background clip matching mood keyword via configured provider.
       - Render 1080x1920 30fps vertical video with FFmpeg.
       - Package into output/YYYY-MM-DD/reel_NNN/{reel.mp4, caption.txt, meta.json}.
       - Record completed reel in DB.
    5. Handle errors per reel gracefully so one failure does not halt the batch.

    Args:
        count: Number of reels to generate.
        theme: Quote theme.
        lang: Quote language.
        style_path: Path to style YAML preset.
        provider_name: Optional provider override ('local_folder', 'gdrive', 'pexels').
        output_base_dir: Root output directory.
        client: Optional pre-configured Gemini client (for testing).
        background_provider: Optional injected background provider (for testing).
        db_path: Path to SQLite database.

    Returns:
        List of result summaries per reel: [{'status': 'ok'|'failed', 'quote': ..., 'output': ..., 'reason': ...}].
    """
    is_random_style = str(style_path).lower().strip() in ("random", "styles/random", "styles/random.yaml")
    available_styles = get_available_styles() if is_random_style else [Path(style_path)]
    if is_random_style and not available_styles:
        available_styles = [Path("styles/degraaf.yaml")]

    conn = init_db(db_path)

    bg_provider = background_provider or get_background_provider(provider_name)
    output_base = Path(output_base_dir)

    # 1. Generate & deduplicate quotes if not supplied
    if quotes is None:
        logger.info(f"Generating {count} quotes for theme '{theme}' (lang: {lang})...")
        quotes_list = generate_quotes(
            theme=theme,
            lang=lang,
            count=count,
            db_path=db_path,
            client=client,
        )
    else:
        quotes_list = quotes

    results: list[dict[str, Any]] = []
    cache_dir = Path("cache")
    cache_dir.mkdir(parents=True, exist_ok=True)

    for idx, quote in enumerate(quotes_list, 1):
        # Resolve active style preset (rotates among available styles if random requested)
        if is_random_style:
            chosen_style_path = available_styles[(idx - 1) % len(available_styles)]
            style = load_style(chosen_style_path)
            logger.info(f"Reel {idx}: Rotating style to preset '{chosen_style_path.stem}'")
        else:
            style = load_style(style_path)

        duration_cfg = style.get("duration", {})
        min_dur = float(duration_cfg.get("min", 8.0))
        max_dur = float(duration_cfg.get("max", 12.0))
        hashtags_base = style.get("hashtags_base", ["#nature", "#positivity", "#naturetherapy"])

        # Idempotency check: verify if quote already has a finished reel
        if quote.id and is_quote_rendered(conn, quote.id):
            logger.info(f"Quote #{quote.id} ('{quote.text[:30]}...') already rendered. Skipping.")
            results.append({
                "index": idx,
                "status": "ok",
                "quote": quote.text,
                "mood": quote.mood,
                "output": "Already rendered (idempotent skip)",
                "reason": "",
            })
            continue

        target_dur = calculate_duration(quote.text, min_dur, max_dur)
        logger.info(f"Processing reel {idx}/{len(quotes_list)} [mood: {quote.mood}, target: {target_dur:.1f}s]...")

        try:
            # Automatic check 1: Text fits inside safe margins
            text_cfg = style.get("text", {})
            font_path = str(text_cfg.get("font", "assets/fonts/default.ttf"))
            base_font_size = int(text_cfg.get("size", 60))
            max_lines = int(text_cfg.get("max_lines", 4))

            fits, reason, lines = check_safe_margins(
                text=quote.text,
                font_path=font_path,
                font_size=base_font_size,
                max_lines=max_lines,
                canvas_w=1080,
                canvas_h=1920,
            )
            if not fits:
                raise ValueError(f"Safe margins check failed: {reason}")

            # 2. Pick background clip
            clip_path = bg_provider.get_clip(mood=quote.mood, min_seconds=target_dur)

            # Automatic check 2: Contrast & Luminance sampling behind text box
            effective_style = copy.deepcopy(style)
            text_h = len(lines) * int(base_font_size * 1.35)
            text_bbox = calculate_text_bounding_box(lines, int(base_font_size * 1.35), 1080, 1920)

            sample_t = min(3.0, max(0.5, target_dur / 2))
            bg_luminance = sample_background_luminance(clip_path, sample_time=sample_t, crop_box=text_bbox)

            if not is_contrast_sufficient(bg_luminance):
                base_darkness = float(style.get("background", {}).get("overlay_darkness", 0.20))
                max_darkness = 0.45
                escalated_darkness = min(max_darkness, base_darkness + 0.20)
                effective_style.setdefault("background", {})["overlay_darkness"] = escalated_darkness
                logger.warning(
                    f"Low contrast detected (bg luminance: {bg_luminance:.2f}). "
                    f"Auto-escalating darken overlay from {base_darkness:.2f} to {escalated_darkness:.2f}."
                )

            # 3. Render video
            temp_output = cache_dir / f"temp_render_{quote.id or idx}_{int(time.time())}.mp4"
            render_reel(
                quote=quote,
                clip_path=clip_path,
                style_config=effective_style,
                output_path=temp_output,
            )

            # 4. Format caption and hashtags
            caption_text = format_caption(
                caption=quote.caption,
                theme=quote.theme,
                hashtags_base=hashtags_base,
                extra_hashtags=quote.hashtags,
            )

            # 5. Package output
            metadata = {
                "quote": quote.text,
                "mood": quote.mood,
                "theme": quote.theme,
                "lang": quote.lang,
                "clip_path": str(clip_path),
                "style": style.get("name", "degraaf"),
                "duration": target_dur,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }

            reel_dir = package_reel(
                rendered_video_path=temp_output,
                caption_text=caption_text,
                metadata=metadata,
                output_base_dir=output_base,
            )

            # Clean up temp render
            if temp_output.exists():
                temp_output.unlink(missing_ok=True)

            # 6. Record completed reel in SQLite
            clip_id = get_clip_id_by_path(conn, str(clip_path))
            if clip_id is None:
                clip_id = record_clip_usage(conn, path=str(clip_path), source="background_provider")

            if quote.id:
                record_reel(
                    conn=conn,
                    quote_id=quote.id,
                    clip_id=clip_id,
                    style=style.get("name", "degraaf"),
                    path=str(reel_dir / "reel.mp4"),
                    status="completed",
                )
                mark_quote_used(conn, quote.id)

            logger.info(f"Reel {idx} packaged successfully at: {reel_dir}")
            results.append({
                "index": idx,
                "status": "ok",
                "quote": quote.text,
                "mood": quote.mood,
                "output": str(reel_dir),
                "reason": "",
            })

        except Exception as exc:
            logger.error(f"Failed to generate reel {idx} ('{quote.text[:30]}...'): {exc}")
            results.append({
                "index": idx,
                "status": "failed",
                "quote": quote.text,
                "mood": quote.mood,
                "output": "",
                "reason": str(exc),
            })

    return results
