"""Packaging writer for exporting finished reels, captions, and metadata."""

from __future__ import annotations

import datetime
import json
import re
import shutil
from pathlib import Path
from typing import Any


def get_next_reel_dir(date_dir: Path) -> Path:
    """Find the next sequential reel folder (e.g. reel_001, reel_002) in the date directory."""
    date_dir.mkdir(parents=True, exist_ok=True)
    existing_indices = [0]

    for p in date_dir.iterdir():
        if p.is_dir():
            m = re.match(r"^reel_(\d+)$", p.name)
            if m:
                existing_indices.append(int(m.group(1)))

    next_idx = max(existing_indices) + 1
    return date_dir / f"reel_{next_idx:03d}"


def package_reel(
    rendered_video_path: Path,
    caption_text: str,
    metadata: dict[str, Any],
    output_base_dir: Path | str = "output",
    reel_folder: Path | None = None,
) -> Path:
    """Package finished reel files into date-partitioned output folder.

    Structure:
    output/YYYY-MM-DD/reel_NNN/
      ├── reel.mp4
      ├── caption.txt
      └── meta.json

    Args:
        rendered_video_path: Path to rendered video file.
        caption_text: Prepared caption and hashtags string.
        metadata: Dictionary containing quote, mood, clip source/id, style, timestamp.
        output_base_dir: Base root output directory.
        reel_folder: Optional pre-determined destination folder.

    Returns:
        Path to the created reel directory.
    """
    if reel_folder is None:
        today_str = datetime.date.today().isoformat()
        date_dir = Path(output_base_dir) / today_str
        target_dir = get_next_reel_dir(date_dir)
    else:
        target_dir = Path(reel_folder)

    target_dir.mkdir(parents=True, exist_ok=True)

    # 1. Place reel.mp4
    dest_video = target_dir / "reel.mp4"
    if Path(rendered_video_path).resolve() != dest_video.resolve():
        shutil.copy2(rendered_video_path, dest_video)

    # 2. Write caption.txt
    caption_path = target_dir / "caption.txt"
    with open(caption_path, "w", encoding="utf-8") as f:
        f.write(caption_text.strip() + "\n")

    # 3. Write meta.json
    meta_path = target_dir / "meta.json"
    enriched_metadata = {
        **metadata,
        "packaged_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "video_path": str(dest_video),
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(enriched_metadata, f, indent=2, ensure_ascii=False)

    return target_dir
