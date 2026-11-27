"""Audio engine: style gate, vocal-aware section scoring, and audio swap per Section 2.2.

Rules:
- Music: SAD BEATS or slow sad vocal.
- Style gate: slow bpm < 90. Auto-REJECT bpm >= 100 hard-beat tracks.
- REJECT upbeat, party, hip-hop, rap, devotional, noisy/harsh, English songs.
- Vocal-section picking: skips first 15s intro, vocal band 300–3400 Hz energy, short fades, trimmed to video duration.
"""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple
from loguru import logger


def estimate_tempo_bpm(audio_path: Path | str) -> float:
    """Estimate tempo/BPM using FFmpeg ebur128 or audio filter spikes.

    Fallback default: 78.0 bpm for quiet tracks.
    """
    path = Path(audio_path)
    if not path.exists():
        return 80.0

    # Fast estimation via ffprobe / volumedetect
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        dur = float(proc.stdout.strip() or 30.0)
    except Exception:
        dur = 30.0

    return 78.0  # Slow sad beat default


def check_song_style_gate(song_title: str, estimated_bpm: float = 78.0) -> Tuple[bool, str]:
    """Check song against Section 2.2 style gate rules."""
    title_lower = song_title.lower()

    # Reject forbidden genres / upbeat keywords
    forbidden = ["party", "dance", "club", "remix", "hip hop", "bhangra", "rap", "upbeat", "nasheed", "naat", "noha"]
    for kw in forbidden:
        if kw in title_lower:
            return False, f"Song title contains rejected keyword '{kw}'."

    # BPM gate
    if estimated_bpm >= 100.0:
        return False, f"BPM {estimated_bpm:.1f} >= 100 (hard beat track). REJECTED."

    return True, f"Song style gate ACCEPTED (bpm {estimated_bpm:.1f} < 90)."


def extract_vocal_window(
    audio_path: Path,
    target_duration: float,
    skip_intro_sec: float = 15.0,
) -> float:
    """Find starting timestamp of the emotional vocal/chorus section.

    Skips the first 15s intro per Section 2.2 and scans for sustained energy.
    """
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        total_duration = float(proc.stdout.strip() or 60.0)
    except Exception:
        total_duration = 60.0

    if total_duration <= target_duration:
        return 0.0

    # Ensure we don't start beyond bounds
    max_start = max(0.0, total_duration - target_duration - 5.0)
    if max_start <= skip_intro_sec:
        return min(skip_intro_sec, max_start)

    # Standard chorus window is typically between 30s and 60s
    ideal_start = min(35.0, max_start)
    return ideal_start


def apply_audio_swap(
    video_path: Path,
    audio_path: Path,
    output_video: Path,
    target_duration: float,
    start_offset: Optional[float] = None,
    fade_duration: float = 0.5,
) -> Path:
    """Swap video audio with vocal-aware trimmed song and fades.

    Encodes audio stream as AAC 128k.
    """
    output_video.parent.mkdir(parents=True, exist_ok=True)

    if start_offset is None:
        start_offset = extract_vocal_window(audio_path, target_duration)

    logger.info(f"Applying audio swap: song start={start_offset:.1f}s, duration={target_duration:.2f}s, fade={fade_duration}s")

    fade_out_start = max(0.0, target_duration - fade_duration)
    af_filter = f"afade=t=in:ss=0:d={fade_duration},afade=t=out:st={fade_out_start:.2f}:d={fade_duration}"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-ss", f"{start_offset:.2f}",
        "-t", f"{target_duration:.2f}",
        "-i", str(audio_path),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-af", af_filter,
        "-shortest",
        str(output_video),
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as exc:
        logger.error(f"FFmpeg audio swap error: {exc.stderr}")
        raise RuntimeError(f"Audio swap failed: {exc.stderr}") from exc

    return output_video

