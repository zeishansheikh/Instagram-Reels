"""Pinterest video discovery and direct downloader using authenticated session cookies.

Allows direct fetching and downloading of high-definition Pinterest nature video clips
bypassing external storage providers (e.g. Google Drive).
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import httpx
from loguru import logger

from reelforge.pipeline.gates import (
    brightness_and_saturation_gate,
    ffprobe_source_gate,
    watermark_and_quality_check,
)
from reelforge.pipeline.workflow_state import WorkflowState


def get_pinterest_cookies() -> Dict[str, str]:
    """Load Pinterest cookies from config/pinterest_cookies.json or config/pinterest_cookies.txt."""
    json_path = Path("config/pinterest_cookies.json")
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return {c["name"]: c["value"] for c in data if "name" in c and "value" in c}
            elif isinstance(data, dict):
                return data
        except Exception as exc:
            logger.warning(f"Could not load {json_path}: {exc}")

    txt_path = Path("config/pinterest_cookies.txt")
    if txt_path.exists():
        cookies: Dict[str, str] = {}
        try:
            with open(txt_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split("\t")
                    if len(parts) >= 7:
                        cookies[parts[5]] = parts[6]
            return cookies
        except Exception as exc:
            logger.warning(f"Could not load {txt_path}: {exc}")

    return {}


def get_default_headers(cookies: Dict[str, str]) -> Dict[str, str]:
    """Generate browser-like headers with CSRF token."""
    csrf = cookies.get("csrftoken", "")
    return {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "X-CSRFToken": csrf,
        "Referer": "https://www.pinterest.com/",
    }


def extract_video_url_from_pin(pin_id_or_url: str) -> Optional[Tuple[str, str]]:
    """Extract direct MP4 video URL from a Pinterest Pin.

    Returns:
        Tuple of (pin_id, direct_mp4_url) or None if no video found.
    """
    clean = str(pin_id_or_url).strip()
    match = re.search(r"pin/([0-9]+)", clean)
    pin_id = match.group(1) if match else clean.strip("/")

    if not pin_id.isdigit():
        logger.warning(f"Invalid Pinterest Pin ID format: '{clean}'")
        return None

    cookies = get_pinterest_cookies()
    headers = get_default_headers(cookies)
    pin_url = f"https://www.pinterest.com/pin/{pin_id}/"

    try:
        with httpx.Client(cookies=cookies, headers=headers, follow_redirects=True, timeout=15.0) as client:
            resp = client.get(pin_url)
            if resp.status_code != 200:
                logger.warning(f"Pinterest Pin {pin_id} returned HTTP {resp.status_code}")
                return None

            html = resp.text

            # 1. Search for direct video MP4 URLs in the response
            # Format: https://v1.pinimg.com/videos/.../...mp4 or https://v.pinimg.com/...
            mp4_matches = re.findall(r"https://v[0-9]?\.pinimg\.com/videos/[^\s\"\'\<\>]+\.mp4", html)
            if mp4_matches:
                # Prefer 720p or 1080p if available
                ranked = sorted(
                    set(mp4_matches),
                    key=lambda u: (
                        2 if "1080" in u or "720" in u else 1,
                        len(u),
                    ),
                    reverse=True,
                )
                return pin_id, ranked[0]

            # 2. Search in __PWS_DATA__ JSON script tag
            pws_match = re.search(r"<script id=\"__PWS_DATA__\"[^>]*>(.*?)</script>", html)
            if pws_match:
                try:
                    data = json.loads(pws_match.group(1))
                    # Recursively search for mp4 url
                    json_str = json.dumps(data)
                    found = re.findall(r"https://v[0-9]?\.pinimg\.com/videos/[^\s\"\'\<\>]+\.mp4", json_str)
                    if found:
                        return pin_id, found[0]
                except Exception as exc:
                    logger.debug(f"Error parsing __PWS_DATA__ for pin {pin_id}: {exc}")

    except Exception as exc:
        logger.error(f"Failed to fetch video for pin {pin_id}: {exc}")

    return None


def search_pinterest_video_pins(query: str, max_results: int = 15) -> List[str]:
    """Search Pinterest for vertical nature video pins matching a query."""
    cookies = get_pinterest_cookies()
    headers = get_default_headers(cookies)

    search_query = f"{query} vertical nature video"
    search_url = f"https://www.pinterest.com/search/pins/?q={httpx.URL('', params={'q': search_query}).params['q']}"

    pin_ids: List[str] = []
    try:
        with httpx.Client(cookies=cookies, headers=headers, follow_redirects=True, timeout=15.0) as client:
            resp = client.get(search_url)
            if resp.status_code == 200:
                matches = re.findall(r"/pin/([0-9]+)/", resp.text)
                for pid in matches:
                    if pid not in pin_ids:
                        pin_ids.append(pid)
                    if len(pin_ids) >= max_results:
                        break
    except Exception as exc:
        logger.warning(f"Error searching Pinterest for '{query}': {exc}")

    return pin_ids


def download_video(video_url: str, output_path: Path | str) -> Path:
    """Download video stream directly to local disk."""
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": "https://www.pinterest.com/",
    }

    temp_dest = dest.with_suffix(".tmp.mp4")
    logger.info(f"Downloading Pinterest video from {video_url} to {dest}...")

    with httpx.Client(headers=headers, follow_redirects=True, timeout=60.0) as client:
        with client.stream("GET", video_url) as response:
            response.raise_for_status()
            with open(temp_dest, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=65536):
                    f.write(chunk)

    temp_dest.replace(dest)
    logger.info(f"Successfully downloaded {dest.name} ({dest.stat().st_size / (1024*1024):.2f} MB)")
    return dest


def fetch_fresh_pinterest_video(
    category: str,
    output_dir: Path | str = "assets/backgrounds",
    state: Optional[WorkflowState] = None,
) -> Optional[Tuple[Path, str]]:
    """Search Pinterest for category, download first qualifying clip that passes all gates."""
    wf_state = state or WorkflowState.load()
    dest_dir = Path(output_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Direct Pinterest Fetcher: Searching fresh clips for category '{category}'...")
    candidate_pins = search_pinterest_video_pins(category, max_results=12)

    if not candidate_pins:
        logger.warning(f"No candidate pins found for category '{category}' on Pinterest.")
        return None

    for pin_id in candidate_pins:
        if wf_state.is_pin_used(pin_id):
            logger.debug(f"Skipping already used pin {pin_id}")
            continue

        target_file = dest_dir / f"pinterest_{pin_id}.mp4"
        if target_file.exists() and target_file.stat().st_size > 1_000_000:
            clip_path = target_file
        else:
            # Extract video URL
            video_info = extract_video_url_from_pin(pin_id)
            if not video_info:
                continue

            _, video_url = video_info
            try:
                clip_path = download_video(video_url, target_file)
            except Exception as exc:
                logger.warning(f"Failed to download pin {pin_id}: {exc}")
                continue

        # Run quality gates
        gate_ok, _, _ = ffprobe_source_gate(clip_path)
        if not gate_ok:
            logger.debug(f"Pin {pin_id} failed ffprobe source gate.")
            continue

        luma_ok, _, _ = brightness_and_saturation_gate(clip_path)
        if not luma_ok:
            logger.debug(f"Pin {pin_id} failed brightness/saturation gate.")
            continue

        wm_ok, _ = watermark_and_quality_check(clip_path)
        if not wm_ok:
            logger.debug(f"Pin {pin_id} failed watermark check.")
            continue

        logger.info(f"Verified Pinterest video clip {clip_path.name} (Pin {pin_id}) passed all quality gates!")
        return clip_path, pin_id

    return None
