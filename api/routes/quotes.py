"""Quotes query endpoint."""

from __future__ import annotations

import sqlite3
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from api.auth import verify_api_key
from api.models import QuoteModel
from reelforge.config import load_config

router = APIRouter(prefix="/quotes", tags=["Quotes"])


@router.get("", response_model=List[QuoteModel], summary="List stored quotes with usage metrics")
def list_quotes(
    theme: Optional[str] = Query(None, description="Filter by theme (e.g. hope, solitude, gratitude)"),
    lang: Optional[str] = Query(None, description="Filter by language code (e.g. en, urdu)"),
    used: Optional[bool] = Query(None, description="Filter by usage status (True=used, False=unused)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: bool = Depends(verify_api_key),
) -> List[QuoteModel]:
    """Retrieve generated and deduplicated quotes from the database."""
    cfg = load_config()
    conn = sqlite3.connect(str(cfg.paths.db_path))
    conn.row_factory = sqlite3.Row

    query = "SELECT id, text, theme, lang, created_at, used FROM quotes WHERE 1=1"
    params: list = []

    if theme:
        query += " AND theme = ?"
        params.append(theme.strip().lower())
    if lang:
        query += " AND lang = ?"
        params.append(lang.strip().lower())
    if used is not None:
        if used:
            query += " AND used > 0"
        else:
            query += " AND used = 0"

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        QuoteModel(
            id=r["id"],
            text=r["text"],
            theme=r["theme"],
            lang=r["lang"],
            created_at=str(r["created_at"]),
            used_count=r["used"],
        )
        for r in rows
    ]

