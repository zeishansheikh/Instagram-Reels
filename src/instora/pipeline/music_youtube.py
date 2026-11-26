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

from instora.pipeline.workflow_state import WorkflowState

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


def clean_youtube_url(query_or_url: str) -> str:
    """Strip playlist/radio parameters from single YouTube/YT Music video URLs."""
    import re
    q = query_or_url.strip()
    if "youtube.com/watch" in q or "music.youtube.com/watch" in q:
        m = re.search(r"[?&]v=([a-zA-Z0-9_-]{11})", q)
        if m:
            return f"https://www.youtube.com/watch?v={m.group(1)}"
    elif "youtu.be/" in q:
        m = re.search(r"youtu\.be/([a-zA-Z0-9_-]{11})", q)
        if m:
            return f"https://www.youtube.com/watch?v={m.group(1)}"
    elif "youtube.com/shorts/" in q:
        m = re.search(r"shorts/([a-zA-Z0-9_-]{11})", q)
        if m:
            return f"https://www.youtube.com/watch?v={m.group(1)}"
    return q


def download_youtube_audio(query_or_url: str, output_dir: Path | str = "assets/music") -> Path:
    """Download audio as MP3 reliably (cookie-less first, with cookie fallback)."""
    music_dir = Path(output_dir)
    music_dir.mkdir(parents=True, exist_ok=True)
    ytdlp = get_ytdlp_bin()

    q = clean_youtube_url(query_or_url)
    is_url = q.startswith("http://") or q.startswith("https://")
    target_tpl = str(music_dir / "%(title).45s_%(id)s.%(ext)s")

    before_files = set(music_dir.iterdir())

    # Try fast cookie-less download first (cookies often expire or trigger slow checks)
    base_cmd = [
        ytdlp,
        *([] if is_url else ["--default-search", "ytsearch1"]),
        "-f", "bestaudio/best",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "4",
        "--no-playlist",
        "--no-check-certificates",
        "--no-warnings",
        "--restrict-filenames",
        "--no-simulate",
        "--print", "after_move:filepath",
        "--output", target_tpl,
    ]

    cookie_args = get_youtube_cookies_arg()
    attempts = [base_cmd + [q]]
    if cookie_args:
        attempts.append(base_cmd + cookie_args + [q])

    last_err = ""
    for attempt_cmd in attempts:
        try:
            proc = subprocess.run(attempt_cmd, capture_output=True, text=True, check=True, timeout=75)
            # 1. Exact path printed by --print after_move:filepath
            for line in reversed((proc.stdout or "").splitlines()):
                cand_p = Path(line.strip())
                if cand_p.exists() and cand_p.suffix.lower() in (".mp3", ".m4a", ".opus", ".webm"):
                    return cand_p

            # 2. Fallback: newly created file in music_dir
            after_files = set(music_dir.iterdir())
            new_audio = [
                p for p in (after_files - before_files)
                if p.suffix.lower() in (".mp3", ".m4a", ".opus", ".webm")
            ]
            if new_audio:
                return max(new_audio, key=lambda p: p.stat().st_mtime)
        except subprocess.CalledProcessError as exc:
            last_err = (exc.stderr or exc.stdout or str(exc)).strip()
            logger.warning(f"yt-dlp attempt failed: {last_err[:200]}")
        except Exception as exc:
            last_err = str(exc)
            logger.warning(f"yt-dlp exception: {last_err[:200]}")

    # Check if video ID was already downloaded previously (yt-dlp skips re-downloading existing files)
    import re
    vid_m = re.search(r"v=([a-zA-Z0-9_-]{11})", q)
    if vid_m:
        vid_id = vid_m.group(1)
        existing_match = list(music_dir.glob(f"*{vid_id}*.mp3")) + list(music_dir.glob(f"*{vid_id}*.m4a"))
        if existing_match:
            return existing_match[0]

    raise RuntimeError(f"YouTube audio download failed: {last_err[:250] or 'No output produced'}")


def fetch_or_pick_lofi_music(
    query_override: Optional[str] = None,
    output_dir: Path | str = "assets/music",
    state: Optional[WorkflowState] = None,
) -> Tuple[Path, str]:
    """Retrieve an unused background sad lo-fi track.

    Picks an existing track from assets/music/ if available and unused,
    otherwise downloads a fresh track using YouTube Music.
    """
    wf_state = state or WorkflowState.load()
    music_dir = Path(output_dir)
    music_dir.mkdir(parents=True, exist_ok=True)

    # 1. Check existing unused music files in assets/music
    existing_tracks = sorted(list(music_dir.glob("*.mp3")) + list(music_dir.glob("*.m4a")))
    for track in existing_tracks:
        track_title = track.stem
        used_titles = [s.get("song", "") for s in wf_state.used_songs]
        if track_title not in used_titles:
            logger.info(f"Selected existing unused track '{track_title}' from {track.name}")
            return track, track_title

    # 2. Automatically download fresh sad lo-fi track from YouTube
    query = query_override or pick_next_music_query(wf_state.last_song)
    logger.info(f"YouTube Music: Searching and fetching fresh background track for '{query}'...")

    try:
        chosen = download_youtube_audio(query, music_dir)
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

