"""Interactive review workflow for generated reels: keep, discard, or regenerate."""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Callable, Optional

import typer
from loguru import logger

from reelforge.backgrounds import get_background_provider
from reelforge.db import init_db, update_reel_status
from reelforge.quotes.generator import Quote
from reelforge.render.pipeline import load_style, render_reel


def find_reviewable_reels(output_base: Path | str = "output") -> list[Path]:
    """Find all date-partitioned reel folders ready for human review, excluding _rejected and preview."""
    base = Path(output_base)
    if not base.exists():
        return []

    reel_dirs: list[Path] = []
    for item in sorted(base.iterdir()):
        # Skip rejected and preview folders
        if item.name.startswith("_") or item.name == "preview":
            continue
        if item.is_dir():
            for sub in sorted(item.iterdir()):
                if sub.is_dir() and (sub / "reel.mp4").exists():
                    reel_dirs.append(sub)

    return reel_dirs


def open_in_default_player(video_path: Path) -> bool:
    """Launch the system default video player for the given video file."""
    try:
        sys_name = platform.system()
        if sys_name == "Linux":
            # Check if running in a graphical display environment
            if os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"):
                subprocess.Popen(["xdg-open", str(video_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return True
        elif sys_name == "Darwin":
            subprocess.Popen(["open", str(video_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        elif sys_name == "Windows":
            os.startfile(str(video_path))
            return True
    except Exception as exc:
        logger.debug(f"Could not open default player: {exc}")

    return False


def review_single_reel(
    reel_folder: Path,
    action: str,
    output_base: Path = Path("output"),
    db_path: Path | str = "db/reelforge.db",
    style_path: Path | str = "styles/degraaf.yaml",
) -> str:
    """Execute a review decision on a single reel folder: keep, discard, or regenerate.

    Args:
        reel_folder: Directory of the reel (e.g. output/2026-11-19/reel_001).
        action: 'k'/'keep', 'd'/'discard', or 'r'/'regenerate'.
        output_base: Output root path.
        db_path: SQLite DB path.
        style_path: Style YAML path for regeneration.

    Returns:
        Outcome status ('kept', 'discarded', 'regenerated').
    """
    conn = init_db(db_path)
    video_path = reel_folder / "reel.mp4"
    meta_path = reel_folder / "meta.json"

    meta: dict = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    act = action.strip().lower()

    # 1. Discard
    if act in ("d", "discard"):
        rejected_dir = Path(output_base) / "_rejected"
        rejected_dir.mkdir(parents=True, exist_ok=True)
        date_prefix = reel_folder.parent.name
        dest = rejected_dir / f"{date_prefix}_{reel_folder.name}"

        # If already exists, overwrite or append timestamp
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(reel_folder), str(dest))
        update_reel_status(conn, str(video_path), status="discarded")
        logger.info(f"Moved discarded reel to '{dest}'")
        return "discarded"

    # 2. Regenerate
    elif act in ("r", "regenerate"):
        quote_text = meta.get("quote", "Reflective lines in nature.")
        mood = meta.get("mood", "nature")
        theme = meta.get("theme", "hope")
        lang = meta.get("lang", "en")
        dur = float(meta.get("duration", 8.0))

        # Pick another background clip
        bg_provider = get_background_provider()
        clip_path = bg_provider.get_clip(mood=mood, min_seconds=dur)
        style = load_style(style_path)

        dummy_quote = Quote(text=quote_text, mood=mood, theme=theme, caption="", hashtags=[], lang=lang)
        render_reel(quote=dummy_quote, clip_path=clip_path, style_config=style, output_path=video_path)

        # Update metadata
        meta["clip_path"] = str(clip_path)
        meta["regenerated"] = True
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

        update_reel_status(conn, str(video_path), status="regenerated")
        logger.info(f"Regenerated reel at '{video_path}' with clip '{clip_path.name}'")
        return "regenerated"

    # 3. Keep (Default)
    else:
        update_reel_status(conn, str(video_path), status="approved")
        logger.info(f"Approved reel at '{video_path}'")
        return "kept"


def review_all_reels(
    output_base: Path | str = "output",
    prompt_func: Optional[Callable[[Path, dict], str]] = None,
    style_path: Path | str = "styles/degraaf.yaml",
) -> dict[str, int]:
    """Loop through all unreviewed reels and interactively execute review decisions."""
    base_dir = Path(output_base)
    reels = find_reviewable_reels(base_dir)

    if not reels:
        typer.echo("✨ No reels found for review in output/.")
        return {"kept": 0, "discarded": 0, "regenerated": 0}

    typer.echo(f"\n🎬 Found {len(reels)} reel(s) ready for review.\n")
    stats = {"kept": 0, "discarded": 0, "regenerated": 0}

    for idx, folder in enumerate(reels, 1):
        video_path = folder / "reel.mp4"
        meta_file = folder / "meta.json"
        caption_file = folder / "caption.txt"

        meta: dict = {}
        if meta_file.exists():
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        caption = caption_file.read_text(encoding="utf-8").strip() if caption_file.exists() else ""

        typer.echo("═" * 68)
        typer.echo(f"[{idx}/{len(reels)}] Reviewing: {folder}")
        typer.echo(f"   Quote:   \"{meta.get('quote', 'N/A')}\"")
        typer.echo(f"   Mood:    {meta.get('mood', 'N/A')} | Theme: {meta.get('theme', 'N/A')}")
        typer.echo(f"   Caption: {caption.splitlines()[0] if caption else 'N/A'}")
        typer.echo(f"   Video:   {video_path}")
        typer.echo("═" * 68)

        # Attempt opening in player
        opened = open_in_default_player(video_path)
        if not opened:
            typer.echo("   (Headless or no video player launched - review video path directly)")

        if prompt_func:
            choice = prompt_func(folder, meta)
        else:
            choice = typer.prompt(
                "Action: [k]eep / [d]iscard / [r]egenerate / [q]uit",
                default="k",
            )

        clean_choice = choice.strip().lower()
        if clean_choice in ("q", "quit"):
            typer.echo("Exiting review workflow.")
            break

        outcome = review_single_reel(
            reel_folder=folder,
            action=clean_choice,
            output_base=base_dir,
            style_path=style_path,
        )

        if outcome == "discarded":
            typer.echo("🗑️  Discarded! Moved to output/_rejected/\n")
            stats["discarded"] += 1
        elif outcome == "regenerated":
            typer.echo("🔄 Regenerated with new background clip!\n")
            stats["regenerated"] += 1
        else:
            typer.echo("✅ Kept and approved!\n")
            stats["kept"] += 1

    typer.echo(f"Review summary: {stats['kept']} kept, {stats['discarded']} discarded, {stats['regenerated']} regenerated.")
    return stats

