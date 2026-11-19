"""SQLite state management and deduplication database for Reel Forge."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional


def init_db(db_path: Path | str = "db/reelforge.db") -> sqlite3.Connection:
    """Initialize SQLite database with quotes, clips, and reels schemas.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        sqlite3.Connection: Active database connection.
    """
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    # Schema initialization will be implemented in Phase 2
    return conn

