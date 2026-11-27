"""Publishing schedule and queue status endpoint."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends
from api.auth import verify_api_key
from api.models import ScheduleItem, ScheduleResponse
from instora.config import load_config
from instora.db import is_reel_published

router = APIRouter(prefix="/schedule", tags=["Schedule & Queue"])


@router.get("", response_model=ScheduleResponse, summary="Get publication queue and schedule overview")
def get_schedule(
    _: bool = Depends(verify_api_key),
) -> ScheduleResponse:
    """Retrieve schedule status, counts of pending vs approved reels, and queue of ready-to-publish reels."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row

    # Query all active reels
    query = """
    SELECT
        r.id,
        r.path,
        r.style,
        r.created_at,
        r.status,
        q.text AS quote_text,
        q.theme
    FROM reels r
    LEFT JOIN quotes q ON r.quote_id = q.id
    WHERE r.status != 'discarded'
    ORDER BY r.id ASC
    """
    rows = conn.execute(query).fetchall()

    pending_count = 0
    approved_count = 0
    published_count = 0
    scheduled_items: List[ScheduleItem] = []

    for r in rows:
        reel_id = r["id"]
        reel_path = r["path"]
        st = (r["status"] or "completed").lower()
        is_pub = is_reel_published(conn, reel_path)

        if is_pub or st == "published":
            published_count += 1
        elif st in ("approved", "regenerated"):
            approved_count += 1
            quote_text = r["quote_text"] or ""
            snippet = quote_text[:48] + "..." if len(quote_text) > 48 else quote_text
            scheduled_items.append(
                ScheduleItem(
                    id=reel_id,
                    reel_path=reel_path,
                    quote_snippet=snippet,
                    theme=r["theme"] or "hope",
                    style=r["style"] or "degraaf",
                    thumbnail_url=f"/reels/{reel_id}/thumbnail",
                    video_url=f"/reels/{reel_id}/video",
                    status="ready_to_publish",
                    created_at=str(r["created_at"]),
                )
            )
        else:
            pending_count += 1

    conn.close()

    # Recommended next publish date (today or tomorrow)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return ScheduleResponse(
        pending_approval_count=pending_count,
        approved_ready_to_publish_count=approved_count,
        published_count=published_count,
        scheduled_reels=scheduled_items,
        recommended_next_publish_date=today_str,
        publication_cadence="1 reel daily at 18:00 (optimal engagement window)",
    )

