"""Health check and system diagnostics endpoint."""

from __future__ import annotations

import os
import shutil
import sqlite3
from pathlib import Path
from fastapi import APIRouter
from instora.config import load_config
from api.jobs import job_manager
from api.models import HealthResponse

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.get("", response_model=HealthResponse, summary="System health and prerequisite status")
def get_health() -> HealthResponse:
    """Check availability of system dependencies: SQLite DB, FFmpeg, Gemini API, and Instagram credentials."""
    cfg = load_config()

    # 1. Database check
    db_ok = False
    try:
        db_path = Path(cfg.paths.db_path)
        if db_path.exists():
            with sqlite3.connect(str(db_path)) as conn:
                conn.execute("SELECT 1;").fetchone()
                db_ok = True
    except Exception:
        db_ok = False

    # 2. FFmpeg check
    ffmpeg_ok = bool(shutil.which("ffmpeg"))

    # 3. Gemini check
    gemini_key = os.getenv("GEMINI_API_KEY") or cfg.gemini.api_key
    gemini_ok = bool(gemini_key and len(gemini_key.strip()) > 8)

    # 4. Instagram / Buffer check
    ig_user = os.getenv("IG_USER_ID") or cfg.instagram.user_id
    ig_token = os.getenv("IG_ACCESS_TOKEN") or cfg.instagram.access_token
    buffer_token = os.getenv("BUFFER_ACCESS_TOKEN")
    buffer_channel = os.getenv("BUFFER_CHANNEL_ID")
    ig_ok = bool(
        (ig_user and ig_token and "your_" not in str(ig_user).lower())
        or (buffer_token and buffer_channel)
    )

    # 5. Active jobs
    active_jobs = len([j for j in job_manager.list_jobs(limit=100) if j.status in ("queued", "running")])

    return HealthResponse(
        status="ok",
        app_name=cfg.app.name,
        version=cfg.app.version,
        database_connected=db_ok,
        ffmpeg_available=ffmpeg_ok,
        gemini_api_key_configured=gemini_ok,
        background_provider=cfg.background.provider,
        storage_provider=cfg.storage.provider,
        instagram_configured=ig_ok,
        active_background_jobs=active_jobs,
    )

