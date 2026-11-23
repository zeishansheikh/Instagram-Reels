"""Reels management, review actions, media serving, and generation endpoints."""

from __future__ import annotations

import json
import sqlite3
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from loguru import logger

from api.auth import verify_api_key
from api.jobs import job_manager
from api.models import (
    GenerateRequest,
    JobResponse,
    ReelActionResponse,
    ReelDetail,
    ReelSummary,
    RegenerateRequest,
)
from instora.config import load_config
from instora.db import get_publish_log, is_reel_published, update_reel_status
from instora.render.pipeline import batch_generate_reels
from instora.render.review import review_single_reel

router = APIRouter(prefix="/reels", tags=["Reels"])


def _extract_thumbnail_if_needed(video_path: Path, thumb_path: Path) -> bool:
    """Extract a representative still frame as thumbnail if not already present."""
    if thumb_path.exists():
        return True
    if not video_path.exists():
        return False
    try:
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            "00:00:01",
            "-i",
            str(video_path),
            "-vframes",
            "1",
            "-q:v",
            "2",
            str(thumb_path),
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return thumb_path.exists()
    except Exception as exc:
        logger.debug(f"Could not extract thumbnail frame: {exc}")
        return False


def _row_to_reel_summary(row: sqlite3.Row, conn: sqlite3.Connection) -> ReelSummary:
    reel_id = row["id"]
    reel_path_str = row["path"]
    reel_video_path = Path(reel_path_str)
    reel_dir = reel_video_path.parent
    thumb_path = reel_dir / "thumbnail.jpg"

    # Extract thumbnail frame lazily in background if video exists
    _extract_thumbnail_if_needed(reel_video_path, thumb_path)

    # Read caption if available
    caption_path = reel_dir / "caption.txt"
    caption_text: Optional[str] = None
    if caption_path.exists():
        try:
            caption_text = caption_path.read_text(encoding="utf-8").strip()
        except Exception:
            pass

    # Read mood from meta.json if available
    meta_path = reel_dir / "meta.json"
    mood: Optional[str] = None
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            mood = meta.get("mood")
        except Exception:
            pass

    is_pub = is_reel_published(conn, reel_path_str)

    return ReelSummary(
        id=reel_id,
        quote_id=row["quote_id"],
        quote_text=row["quote_text"] or "",
        theme=row["theme"] or "",
        lang=row["lang"] or "en",
        mood=mood,
        clip_id=row["clip_id"],
        clip_path=row["clip_path"] or "",
        style=row["style"] or "default",
        path=reel_path_str,
        video_url=f"/reels/{reel_id}/video",
        thumbnail_url=f"/reels/{reel_id}/thumbnail",
        caption=caption_text,
        status=row["status"] or "completed",
        created_at=str(row["created_at"]),
        is_published=is_pub,
    )


@router.get("", response_model=List[ReelSummary], summary="List generated reels with filters")
def list_reels(
    status: Optional[str] = Query(None, description="Filter by status (e.g. completed, approved, discarded, published)"),
    theme: Optional[str] = Query(None, description="Filter by theme"),
    date: Optional[str] = Query(None, description="Filter by date partition (e.g. 2026-11-20)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: bool = Depends(verify_api_key),
) -> List[ReelSummary]:
    """Retrieve date-partitioned reels joined with quote text and clip metadata."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row

    query = """
    SELECT
        r.id,
        r.quote_id,
        r.clip_id,
        r.style,
        r.path,
        r.created_at,
        r.status,
        q.text AS quote_text,
        q.theme,
        q.lang,
        c.path AS clip_path
    FROM reels r
    LEFT JOIN quotes q ON r.quote_id = q.id
    LEFT JOIN clips c ON r.clip_id = c.id
    WHERE 1=1
    """
    params: list = []

    if status:
        query += " AND r.status = ?"
        params.append(status.strip().lower())
    if theme:
        query += " AND q.theme = ?"
        params.append(theme.strip().lower())
    if date:
        query += " AND r.path LIKE ?"
        params.append(f"%{date.strip()}%")

    query += " ORDER BY r.id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    summaries = [_row_to_reel_summary(r, conn) for r in rows]
    conn.close()
    return summaries


@router.get("/{id}", response_model=ReelDetail, summary="Get full reel details by ID")
def get_reel(
    id: int,
    _: bool = Depends(verify_api_key),
) -> ReelDetail:
    """Retrieve full metadata, file size, duration, and publish history for a reel."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row

    query = """
    SELECT
        r.id,
        r.quote_id,
        r.clip_id,
        r.style,
        r.path,
        r.created_at,
        r.status,
        q.text AS quote_text,
        q.theme,
        q.lang,
        c.path AS clip_path
    FROM reels r
    LEFT JOIN quotes q ON r.quote_id = q.id
    LEFT JOIN clips c ON r.clip_id = c.id
    WHERE r.id = ?
    LIMIT 1
    """
    row = conn.execute(query, (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    summary = _row_to_reel_summary(row, conn)
    video_path = Path(summary.path)
    reel_dir = video_path.parent

    # Read meta.json
    meta_json: Dict[str, Any] = {}
    meta_path = reel_dir / "meta.json"
    if meta_path.exists():
        try:
            meta_json = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    # Publish logs for this reel
    pub_rows = conn.execute(
        """
        SELECT id, container_id, media_id, status, permalink, error, created_at
        FROM publish_log
        WHERE reel_path = ? OR reel_path = ?
        ORDER BY id DESC
        """,
        (summary.path, str(reel_dir)),
    ).fetchall()
    conn.close()

    publish_history = [
        {
            "id": p["id"],
            "container_id": p["container_id"],
            "media_id": p["media_id"],
            "status": p["status"],
            "permalink": p["permalink"],
            "error": p["error"],
            "created_at": str(p["created_at"]),
        }
        for p in pub_rows
    ]

    size_bytes = video_path.stat().st_size if video_path.exists() else None
    duration = meta_json.get("duration")

    return ReelDetail(
        **summary.model_dump(),
        meta_json=meta_json,
        file_size_bytes=size_bytes,
        duration_seconds=float(duration) if duration else None,
        publish_history=publish_history,
    )


@router.get("/{id}/video", summary="Stream reel video file")
def stream_reel_video(
    id: int,
    _: bool = Depends(verify_api_key),
):
    """Serve reel MP4 video file with support for partial HTTP range requests."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT path FROM reels WHERE id = ?", (id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    video_path = Path(row["path"])
    if not video_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Video file '{video_path}' missing from disk.")

    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"reel_{id}.mp4",
    )


@router.get("/{id}/thumbnail", summary="Serve reel thumbnail image")
def get_reel_thumbnail(
    id: int,
    _: bool = Depends(verify_api_key),
):
    """Serve JPEG thumbnail frame for reel. Auto-extracts from video if not already generated."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT path FROM reels WHERE id = ?", (id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    video_path = Path(row["path"])
    thumb_path = video_path.parent / "thumbnail.jpg"

    if not thumb_path.exists():
        if not _extract_thumbnail_if_needed(video_path, thumb_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail could not be generated.")

    return FileResponse(
        path=str(thumb_path),
        media_type="image/jpeg",
        filename=f"thumbnail_{id}.jpg",
    )


@router.post("/generate", summary="Trigger bulk reel generation", status_code=status.HTTP_202_ACCEPTED)
def generate_reels(
    req: GenerateRequest,
    _: bool = Depends(verify_api_key),
) -> Any:
    """Generate finished quote reels in bulk with video, caption, and metadata packaging.

    Can be executed as a tracked background job (default) or synchronously.
    """
    def _worker(progress_callback=None):
        if progress_callback:
            progress_callback(0.1, f"Generating {req.count} quotes for theme '{req.theme}'...")
        results = batch_generate_reels(
            count=req.count,
            theme=req.theme,
            lang=req.lang,
            style_path=req.style,
            provider_name=req.provider,
        )
        if progress_callback:
            ok_count = len([r for r in results if r.get("status") == "ok"])
            progress_callback(1.0, f"Completed: {ok_count}/{len(results)} reels rendered successfully.")
        return results

    if req.run_in_background:
        job = job_manager.create_job(
            job_type="generate",
            params=req.model_dump(),
            worker_fn=_worker,
        )
        return JobResponse(
            job_id=job.id,
            type=job.type,
            status=job.status.value,
            message="Batch generation task initiated in background.",
            progress=0.0,
            created_at=job.created_at,
            poll_url=f"/jobs/{job.id}",
        )
    else:
        # Run synchronously
        results = _worker()
        return {"status": "completed", "results": results}


@router.post("/{id}/approve", response_model=ReelActionResponse, summary="Approve reel for publication")
def approve_reel(
    id: int,
    _: bool = Depends(verify_api_key),
) -> ReelActionResponse:
    """Mark reel status as 'approved' in database for scheduled Instagram publication."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT id, path FROM reels WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    update_reel_status(conn, row["path"], status="approved")
    updated_row = conn.execute(
        """
        SELECT r.id, r.quote_id, r.clip_id, r.style, r.path, r.created_at, r.status,
               q.text AS quote_text, q.theme, q.lang, c.path AS clip_path
        FROM reels r
        LEFT JOIN quotes q ON r.quote_id = q.id
        LEFT JOIN clips c ON r.clip_id = c.id
        WHERE r.id = ?
        """,
        (id,),
    ).fetchone()
    summary = _row_to_reel_summary(updated_row, conn)
    conn.close()

    return ReelActionResponse(
        reel_id=id,
        action="approved",
        status="approved",
        message=f"Reel {id} has been approved for publication.",
        reel=summary,
    )


@router.post("/{id}/discard", response_model=ReelActionResponse, summary="Discard reel and move to _rejected")
def discard_reel(
    id: int,
    _: bool = Depends(verify_api_key),
) -> ReelActionResponse:
    """Move discarded reel folder to output/_rejected/ and mark status as 'discarded'."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT id, path FROM reels WHERE id = ?", (id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    video_path = Path(row["path"])
    reel_folder = video_path.parent

    if reel_folder.exists():
        review_single_reel(
            reel_folder=reel_folder,
            action="discard",
            output_base=cfg.paths.output_dir,
            db_path=cfg.paths.db_path,
        )
    else:
        # Just update status in DB
        conn = sqlite3.connect(str(cfg.paths.db_path))
        update_reel_status(conn, str(video_path), status="discarded")
        conn.close()

    return ReelActionResponse(
        reel_id=id,
        action="discarded",
        status="discarded",
        message=f"Reel {id} moved to _rejected/ and status updated to discarded.",
    )


@router.post("/{id}/regenerate", summary="Regenerate reel with new background footage")
def regenerate_reel(
    id: int,
    req: RegenerateRequest,
    _: bool = Depends(verify_api_key),
) -> Any:
    """Re-render reel keeping the quote text but picking a new background clip."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT id, path, style FROM reels WHERE id = ?", (id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reel {id} not found.")

    video_path = Path(row["path"])
    reel_folder = video_path.parent
    style_path = req.style or row["style"] or "styles/degraaf.yaml"

    def _regen_worker(progress_callback=None):
        if progress_callback:
            progress_callback(0.2, f"Selecting new background and rendering reel {id}...")
        status_res = review_single_reel(
            reel_folder=reel_folder,
            action="regenerate",
            output_base=cfg.paths.output_dir,
            db_path=cfg.paths.db_path,
            style_path=style_path,
        )
        # Refresh thumbnail frame
        thumb_path = reel_folder / "thumbnail.jpg"
        if thumb_path.exists():
            thumb_path.unlink()
        _extract_thumbnail_if_needed(video_path, thumb_path)

        if progress_callback:
            progress_callback(1.0, f"Reel {id} successfully regenerated.")
        return {"reel_id": id, "status": status_res}

    if req.run_in_background:
        job = job_manager.create_job(
            job_type="regenerate",
            params={"reel_id": id, "style": style_path},
            worker_fn=_regen_worker,
        )
        return JobResponse(
            job_id=job.id,
            type=job.type,
            status=job.status.value,
            message=f"Regeneration for reel {id} queued in background.",
            progress=0.0,
            created_at=job.created_at,
            poll_url=f"/jobs/{job.id}",
        )
    else:
        res = _regen_worker()
        return ReelActionResponse(
            reel_id=id,
            action="regenerated",
            status="regenerated",
            message=f"Reel {id} has been regenerated with new background footage.",
        )

