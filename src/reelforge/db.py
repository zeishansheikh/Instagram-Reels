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
            last_used_at TIMESTAMP,
            use_count INTEGER DEFAULT 0
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
    """Insert a new quote into the quotes table.

    Args:
        conn: Active sqlite3 connection.
        text: Quote text.
        text_hash: SHA-256 hash of normalized quote text.
        theme: Quote theme.
        lang: Language code.

    Returns:
        Inserted quote ID.
    """
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
