"""YouTube Music automated audio discovery and downloader using authenticated session cookies.

Allows autonomous fetching and extraction of high-quality sad/lo-fi background audio tracks
directly for reels without manual intervention.
"""

from __future__ import annotations

import json
import os
import random
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from loguru import logger

from reelforge.pipeline.workflow_state import WorkflowState

LOFI_MUSIC_ROTATIONS = [
    "sad lofi instrumental beat urdu hindi aesthetic",
    "slowed reverb sad flute piano beat instrumental",
    "tanhai deep sad lofi beat no copyright",
    "calm melancholy lofi guitar piano background beat",
    "broken heart slow lofi instrumental background music",
    "emotional lofi beats slowed and reverb instrumental",
]


def pick_next_music_query(last_song: Optional[str] = None) -> str:
    """Pick a fresh sad lo-fi search query."""
    return random.choice(LOFI_MUSIC_ROTATIONS)


def get_youtube_cookies_arg() -> List[str]:
    """Return yt-dlp cookie arguments if available."""
    cookie_txt = Path("config/youtube_cookies.txt")
    if cookie_txt.exists() and cookie_txt.stat().st_size > 50:
        return ["--cookies", str(cookie_txt.resolve())]
    return []


def get_ytdlp_bin() -> str:
    """Locate yt-dlp executable in virtualenv or PATH."""
    venv_bin = Path(".venv/bin/yt-dlp")
    if venv_bin.exists() and os.access(venv_bin, os.X_OK):
        return str(venv_bin.resolve())
    return "yt-dlp"


def fetch_or_pick_lofi_music(
    query_override: Optional[str] = None,
    output_dir: Path | str = "assets/music",
    state: Optional[WorkflowState] = None,
) -> Tuple[Path, str]:
    """Retrieve an unused background sad lo-fi track.

    Picks an existing track from assets/music/ if available and unused,
    otherwise downloads a fresh track using YouTube Music and cookies.
    """
    wf_state = state or WorkflowState.load()
    music_dir = Path(output_dir)
    music_dir.mkdir(parents=True, exist_ok=True)

    # 1. Check existing unused music files in assets/music
    existing_tracks = sorted(list(music_dir.glob("*.mp3")) + list(music_dir.glob("*.m4a")))
    for track in existing_tracks:
        track_title = track.stem
        # Check if already used recently
        used_titles = [s.get("song", "") for s in wf_state.used_songs]
        if track_title not in used_titles:
            logger.info(f"Selected existing unused track '{track_title}' from {track.name}")
            return track, track_title

    # 2. Automatically download fresh sad lo-fi track from YouTube
    query = query_override or pick_next_music_query(wf_state.last_song)
    logger.info(f"YouTube Music: Searching and fetching fresh background track for '{query}'...")

    ytdlp = get_ytdlp_bin()
    cookie_args = get_youtube_cookies_arg()

    track_id_file = music_dir / "track_%(id)s.%(ext)s"
    cmd = [
        ytdlp,
        "--default-search", "ytsearch1",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "--max-filesize", "15M",
        "--output", str(track_id_file),
    ] + cookie_args + [query]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        # Find newly created mp3 file in music_dir
        new_tracks = sorted(list(music_dir.glob("track_*.mp3")), key=lambda p: p.stat().st_mtime, reverse=True)
        if new_tracks:
            chosen = new_tracks[0]
            track_title = f"YouTube Lo-Fi ({chosen.stem})"
            logger.info(f"Successfully downloaded fresh YouTube Music track: {chosen.name}")
            return chosen, track_title
    except Exception as exc:
        logger.warning(f"Failed to auto-fetch from YouTube: {exc}")

    # Fallback to any available audio file
    if existing_tracks:
        chosen = existing_tracks[0]
        return chosen, chosen.stem

    raise FileNotFoundError("No background audio tracks found and could not download from YouTube Music.")
