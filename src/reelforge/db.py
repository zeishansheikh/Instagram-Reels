"""SQLite state management, deduplication, and clip tracking database for Reel Forge."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional


def init_db(db_path: Path | str = "db/reelforge.db") -> sqlite3.Connection:
    """Initialize SQLite database with quotes, clips, reels, and clip segments schemas.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        sqlite3.Connection: Active database connection.
    """
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA foreign_keys = ON;")

    with conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            text_hash TEXT NOT NULL UNIQUE,
            theme TEXT NOT NULL,
            lang TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS clips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            source_id TEXT,
            path TEXT NOT NULL UNIQUE,
            last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            use_count INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS clip_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            start_time REAL NOT NULL,
            end_time REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id INTEGER NOT NULL REFERENCES quotes(id),
            clip_id INTEGER NOT NULL REFERENCES clips(id),
            style TEXT NOT NULL,
            path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'created'
        );
        """)

    return conn


def insert_quote(
    conn: sqlite3.Connection,
    text: str,
    text_hash: str,
    theme: str,
    lang: str,
) -> int:
    """Insert a new quote into the quotes table."""
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO quotes (text, text_hash, theme, lang)
            VALUES (?, ?, ?, ?)
            """,
            (text, text_hash, theme, lang),
        )
        return int(cursor.lastrowid)


def get_all_stored_quotes(conn: sqlite3.Connection) -> list[str]:
    """Retrieve all previously stored quote texts for similarity checking."""
    cursor = conn.execute("SELECT text FROM quotes ORDER BY id DESC")
    return [row[0] for row in cursor.fetchall()]


def get_recent_quotes(conn: sqlite3.Connection, limit: int = 50) -> list[str]:
    """Retrieve the most recent quote texts for few-shot prompt avoidance."""
    cursor = conn.execute(
        "SELECT text FROM quotes ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    return [row[0] for row in cursor.fetchall()]


def is_quote_hash_exists(conn: sqlite3.Connection, text_hash: str) -> bool:
    """Check if an exact text hash already exists in quotes table."""
    cursor = conn.execute(
        "SELECT 1 FROM quotes WHERE text_hash = ? LIMIT 1",
        (text_hash,),
    )
    return cursor.fetchone() is not None


def mark_quote_used(conn: sqlite3.Connection, quote_id: int) -> None:
    """Mark a quote as used in a rendered reel."""
    with conn:
        conn.execute(
            "UPDATE quotes SET used = used + 1 WHERE id = ?",
            (quote_id,),
        )


def record_clip_usage(
    conn: sqlite3.Connection,
    path: str,
    source: str = "local_folder",
    source_id: Optional[str] = None,
) -> int:
    """Track clip selection in the clips table, updating use_count and timestamp."""
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO clips (source, source_id, path, last_used_at, use_count)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
            ON CONFLICT(path) DO UPDATE SET
                last_used_at = CURRENT_TIMESTAMP,
                use_count = use_count + 1,
                source_id = COALESCE(excluded.source_id, clips.source_id)
            """,
            (source, source_id, str(path)),
        )
        # Fetch the clip id
        row = conn.execute("SELECT id FROM clips WHERE path = ?", (str(path),)).fetchone()
        return int(row[0]) if row else int(cursor.lastrowid or 0)


def get_recently_used_clip_paths(conn: sqlite3.Connection, limit: int = 10) -> list[str]:
    """Get list of clip paths ordered by most recently used."""
    cursor = conn.execute(
        "SELECT path FROM clips ORDER BY last_used_at DESC, id DESC LIMIT ?",
        (limit,),
    )
    return [row[0] for row in cursor.fetchall()]


def record_used_segment(
    conn: sqlite3.Connection,
    path: str,
    start_time: float,
    end_time: float,
) -> None:
    """Record a slice segment used from a single long video file."""
    with conn:
        conn.execute(
            """
            INSERT INTO clip_segments (path, start_time, end_time)
            VALUES (?, ?, ?)
            """,
            (str(path), start_time, end_time),
        )


def get_used_segments(conn: sqlite3.Connection, path: str) -> list[tuple[float, float]]:
    """Retrieve all previously extracted/used segments for a given video path."""
    cursor = conn.execute(
        "SELECT start_time, end_time FROM clip_segments WHERE path = ? ORDER BY start_time ASC",
        (str(path),),
    )
    return [(float(row[0]), float(row[1])) for row in cursor.fetchall()]


def record_reel(
    conn: sqlite3.Connection,
    quote_id: int,
    clip_id: int,
    style: str,
    path: str,
    status: str = "completed",
) -> int:
    """Record a finished reel in the reels table."""
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO reels (quote_id, clip_id, style, path, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (quote_id, clip_id, style, str(path), status),
        )
        return int(cursor.lastrowid)


def update_reel_status(conn: sqlite3.Connection, path: str, status: str) -> None:
    """Update status of a reel (e.g. 'approved', 'discarded')."""
    with conn:
        conn.execute(
            "UPDATE reels SET status = ? WHERE path = ?",
            (status, str(path)),
        )


def is_quote_rendered(conn: sqlite3.Connection, quote_id: int) -> bool:
    """Check if a quote has already been successfully rendered into an existing reel."""
    cursor = conn.execute(
        "SELECT 1 FROM reels WHERE quote_id = ? AND status = 'completed' LIMIT 1",
        (quote_id,),
    )
    return cursor.fetchone() is not None


def get_clip_id_by_path(conn: sqlite3.Connection, path: str) -> Optional[int]:
    """Look up clip ID by file path."""
    cursor = conn.execute("SELECT id FROM clips WHERE path = ? LIMIT 1", (str(path),))
    row = cursor.fetchone()
    return int(row[0]) if row else None
