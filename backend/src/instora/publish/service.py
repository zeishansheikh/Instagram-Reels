"""Publishing service orchestrator for publishing date-partitioned reels to Instagram."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from instora.db import (
    init_db,
    is_reel_published,
    record_publish_log,
)
from instora.publish.graph_api import InstagramPublishError, InstagramPublisher
from instora.publish.storage import MockStorage, StorageProvider, get_storage_provider


def publish_date_reels(
    date_str: str,
    output_base: Path | str = "output",
    dry_run: bool = False,
    db_path: Path | str = "db/instora.db",
    storage_provider: Optional[StorageProvider] = None,
    publisher: Optional[InstagramPublisher] = None,
    single_reel_dir: Optional[Path | str] = None,
) -> list[dict[str, Any]]:
    """Scan and publish reels from a date directory to Instagram.

    Args:
        date_str: Date string (YYYY-MM-DD).
        output_base: Output root directory.
        dry_run: If True, simulate and validate without modifying Instagram.
        db_path: SQLite DB path.
        storage_provider: Storage provider override.
        publisher: InstagramPublisher override.
        single_reel_dir: Optional path to publish just one reel folder.

    Returns:
        List of result summaries per reel.
    """
    conn = init_db(db_path)
    base = Path(output_base)
    date_dir = base / date_str

    if single_reel_dir is not None:
        target_dirs = [Path(single_reel_dir)]
    else:
        if not date_dir.exists() or not date_dir.is_dir():
            raise FileNotFoundError(f"No reels found for date '{date_str}' in {date_dir}")
        target_dirs = sorted([d for d in date_dir.iterdir() if d.is_dir() and (d / "reel.mp4").exists()])

    if not target_dirs:
        logger.warning(f"No valid reel folders with reel.mp4 found in {date_dir}")
        return []

    pub = publisher or InstagramPublisher()
    storage = storage_provider or (MockStorage() if dry_run else get_storage_provider())

    results: list[dict[str, Any]] = []

    for reel_dir in target_dirs:
        video_file = reel_dir / "reel.mp4"
        caption_file = reel_dir / "caption.txt"
        meta_file = reel_dir / "meta.json"

        reel_identifier = f"{date_str}/{reel_dir.name}"

        # 1. Idempotency check: skip already published reels
        if is_reel_published(conn, str(reel_dir)) or is_reel_published(conn, reel_identifier):
            logger.info(f"Reel '{reel_identifier}' is already published. Skipping.")
            results.append({
                "reel": reel_dir.name,
                "status": "skipped",
                "media_id": "",
                "permalink": "",
                "reason": "Already published (idempotent skip)",
            })
            continue

        if not video_file.exists():
            results.append({
                "reel": reel_dir.name,
                "status": "failed",
                "media_id": "",
                "permalink": "",
                "reason": "Missing reel.mp4",
            })
            continue

        caption = caption_file.read_text(encoding="utf-8").strip() if caption_file.exists() else ""
        meta: dict[str, Any] = {}
        if meta_file.exists():
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        audio_mode = meta.get("audio_mode", meta.get("style", "none"))

        # 2. Dry-run mode
        if dry_run:
            logger.info(f"[DRY-RUN] Validating reel '{reel_identifier}':")
            logger.info(f"   Video size: {video_file.stat().st_size / (1024*1024):.2f} MB")
            logger.info(f"   Caption preview: {caption[:40]}...")
            logger.info(f"   Audio mode: {audio_mode}")
            results.append({
                "reel": reel_dir.name,
                "status": "dry_run",
                "media_id": "DRY_RUN_ID",
                "permalink": "https://instagram.com/reel/dry_run_preview",
                "reason": "Dry run validation succeeded",
            })
            continue

        # 3. Live publish
        logger.info(f"Publishing reel '{reel_identifier}' to Instagram...")
        try:
            publish_res = pub.publish_reel(
                video_path=video_file,
                caption=caption,
                storage=storage,
                audio_mode=audio_mode,
            )
            media_id = publish_res.get("media_id", "")
            container_id = publish_res.get("container_id", "")
            permalink = publish_res.get("permalink", "")

            # Log to DB
            record_publish_log(
                conn=conn,
                reel_path=str(reel_dir),
                container_id=container_id,
                media_id=media_id,
                status="published",
                permalink=permalink,
            )

            results.append({
                "reel": reel_dir.name,
                "status": "published",
                "media_id": media_id,
                "permalink": permalink or f"https://www.instagram.com/reel/{media_id}/",
                "reason": "",
            })
        except Exception as exc:
            logger.error(f"Failed to publish '{reel_identifier}': {exc}")
            record_publish_log(
                conn=conn,
                reel_path=str(reel_dir),
                container_id=None,
                media_id=None,
                status="failed",
                error=str(exc),
            )
            results.append({
                "reel": reel_dir.name,
                "status": "failed",
                "media_id": "",
                "permalink": "",
                "reason": str(exc),
            })

    return results

