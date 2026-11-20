"""Clips management and usage tracking endpoint."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from api.auth import verify_api_key
from api.models import ClipModel
from reelforge.config import load_config

router = APIRouter(prefix="/clips", tags=["Clips & Footage"])


@router.get("", response_model=List[ClipModel], summary="List background video clips with provider and usage")
def list_clips(
    provider: Optional[str] = Query(None, description="Filter by provider (local_folder, gdrive, pexels)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: bool = Depends(verify_api_key),
) -> List[ClipModel]:
    """Retrieve background video footage tracks across all configured providers with usage metrics."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row

    # Query registered clips
    query = "SELECT id, source, source_id, path, last_used_at, use_count FROM clips WHERE 1=1"
    params: list = []
    if provider:
        query += " AND source = ?"
        params.append(provider.strip().lower())

    query += " ORDER BY last_used_at DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    db_rows = conn.execute(query, params).fetchall()
    conn.close()

    registered_paths = set()
    result: List[ClipModel] = []

    for r in db_rows:
        clip_path_str = r["path"]
        registered_paths.add(clip_path_str)
        p = Path(clip_path_str)
        exists = p.exists()
        size = p.stat().st_size if exists else None

        result.append(
            ClipModel(
                id=r["id"],
                source=r["source"],
                source_id=r["source_id"],
                path=clip_path_str,
                use_count=r["use_count"],
                last_used_at=str(r["last_used_at"]) if r["last_used_at"] else None,
                exists_on_disk=exists,
                size_bytes=size,
                preview_url=f"/static/{clip_path_str}" if exists else None,
            )
        )

    # Also discover local files in assets/backgrounds not yet registered in DB
    bg_dir = Path(cfg.paths.backgrounds_dir)
    if bg_dir.exists() and (not provider or provider == "local_folder"):
        for ext in (".mp4", ".mov", ".webm", ".mkv"):
            for f in sorted(bg_dir.glob(f"*{ext}")):
                rel_path = str(f)
                if rel_path not in registered_paths:
                    result.append(
                        ClipModel(
                            id=None,
                            source="local_folder",
                            source_id=None,
                            path=rel_path,
                            use_count=0,
                            last_used_at=None,
                            exists_on_disk=True,
                            size_bytes=f.stat().st_size,
                            preview_url=f"/static/{rel_path}",
                        )
                    )

    return result

