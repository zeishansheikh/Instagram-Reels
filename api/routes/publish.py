"""Instagram publishing and publish log endpoints."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger

from api.auth import verify_api_key
from api.jobs import job_manager
from api.models import JobResponse, PublishLogItem, PublishRequest
from reelforge.config import load_config
from reelforge.db import get_publish_log, update_reel_status
from reelforge.publish import publish_date_reels

router = APIRouter(tags=["Publishing"])


@router.get("/publish-log", response_model=List[PublishLogItem], summary="Get publication history and status logs")
def list_publish_logs(
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (published, failed, dry_run)"),
    _: bool = Depends(verify_api_key),
) -> List[PublishLogItem]:
    """Retrieve history of published reels, Meta Graph container IDs, media IDs, and live permalinks."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row

    query = """
    SELECT id, reel_path, container_id, media_id, status, permalink, error, created_at
    FROM publish_log
    WHERE 1=1
    """
    params: list = []
    if status_filter:
        query += " AND status = ?"
        params.append(status_filter.strip().lower())

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        PublishLogItem(
            id=r["id"],
            reel_path=r["reel_path"],
            container_id=r["container_id"],
            media_id=r["media_id"],
            status=r["status"],
            permalink=r["permalink"],
            error=r["error"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.post("/publish/{id}", summary="Publish specific reel to Instagram", status_code=status.HTTP_202_ACCEPTED)
def publish_reel_by_id(
    id: int,
    req: PublishRequest,
    _: bool = Depends(verify_api_key),
) -> Any:
    """Upload video to public cloud storage and publish as Instagram Reel via Meta Graph API."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT id, path FROM reels WHERE id = ?", (id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    video_path = Path(row["path"])
    reel_dir = video_path.parent
    if not reel_dir.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel directory '{reel_dir}' missing from disk.")

    date_str = reel_dir.parent.name

    def _publish_worker(progress_callback=None):
        if progress_callback:
            progress_callback(0.1, f"Preparing reel {id} ({'DRY-RUN' if req.dry_run else 'LIVE'})...")

        results = publish_date_reels(
            date_str=date_str,
            output_base=cfg.paths.output_dir,
            dry_run=req.dry_run,
            single_reel_dir=reel_dir,
        )

        # Update reel status if published successfully
        if results and results[0].get("status") == "published":
            c = sqlite3.connect(str(cfg.paths.db_path))
            update_reel_status(c, str(video_path), status="published")
            c.close()

        if progress_callback:
            st = results[0].get("status") if results else "unknown"
            progress_callback(1.0, f"Publication process completed with status: {st}")

        return results[0] if results else {}

    if req.run_in_background:
        job = job_manager.create_job(
            job_type="publish",
            params={"reel_id": id, "dry_run": req.dry_run, "date": date_str},
            worker_fn=_publish_worker,
        )
        return JobResponse(
            job_id=job.id,
            type=job.type,
            status=job.status.value,
            message=f"Publication task for reel {id} queued in background.",
            progress=0.0,
            created_at=job.created_at,
            poll_url=f"/jobs/{job.id}",
        )
    else:
        res = _publish_worker()
        return {"status": "completed", "result": res}

