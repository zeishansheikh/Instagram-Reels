"""Pinterest video discovery, download, and candidate gating per Section 2.3.

Rules:
- Source: Pinterest ONLY (Pexels is forbidden).
- Rotates nature categories: misty lake, river gorge, waterfall dark rocks, alpine meadow, green cliff, autumn forest path.
- Rejection rules:
  - Watermark check
  - Mean luma > 0.62 reject
  - SATAVG < 0.12 and luma > 0.45 reject (washed-out)
  - Foggy / low-contrast scenes reject
  - No-reuse: check used_pins in workflow_state.json
"""

from __future__ import annotations

import json
import os
import random
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple
from loguru import logger

from instora.pipeline.gates import (
    brightness_and_saturation_gate,
    ffprobe_source_gate,
    watermark_and_quality_check,
)
from instora.pipeline.workflow_state import WorkflowState

NATURE_CATEGORIES = [
    "dark misty waterfall",
    "alpine mountain river",
    "deep mossy forest rain",
    "waterfall dark rocks",
    "autumn forest path foliage",
    "green cliff ocean waves",
    "pine valley morning fog",
    "river gorge canyon stream",
    "lake reflections twilight sunset",
    "norway misty fjords drone",
    "iceland black sand waterfall",
    "bamboo forest gentle rain",
    "serene mountain stream pebbles",
    "dramatic stormy ocean clouds",
    "foggy forest path trees",
    "atmospheric dark woods rain",
    "scenic mountain peak sunrise",
    "crystal emerald river forest",
    "misty lake morning reflection",
    "mountain valley wild flowers",
]


def pick_next_category(last_category: Optional[str] = None) -> str:
    """Pick a fresh nature category different from last run."""
    choices = [c for c in NATURE_CATEGORIES if c != last_category]
    if not choices:
        choices = NATURE_CATEGORIES
    return random.choice(choices)


def fetch_pinterest_clip(
    category: str,
    output_dir: Path | str = "swap",
    state: Optional[WorkflowState] = None,
) -> Tuple[Path, str]:
    """Discover and download a Pinterest vertical nature clip that passes all quality gates.

    Always searches Pinterest for fresh footage first. Re-use of previously selected
    clips is blocked via workflow_state.json.

    Returns:
        Tuple of (clip_path: Path, pin_id: str).
    """
    workflow_state = state or WorkflowState.load()
    dest_dir = Path(output_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    bg_dir = Path("assets/backgrounds")
    bg_dir.mkdir(parents=True, exist_ok=True)

    # 1. PRIMARY: Directly fetch a fresh nature clip from Pinterest
    logger.info(f"Step 2 [Video]: Querying Pinterest for fresh clips (category: '{category}')...")
    try:
        from instora.pipeline.pinterest_client import fetch_fresh_pinterest_video
        fresh = fetch_fresh_pinterest_video(category=category, output_dir=bg_dir, state=workflow_state)
        if fresh:
            cand, pin_id = fresh
            logger.info(f"Successfully fetched fresh Pinterest video '{cand.name}' for pin '{pin_id}'")
            return cand, pin_id
    except Exception as exc:
        logger.warning(f"Direct Pinterest fetcher error: {exc}")

    # 2. SECONDARY: If live Pinterest search returned no fresh pin, check local unused clips
    if bg_dir.exists():
        pinterest_clips = sorted(list(bg_dir.glob("pinterest_*.mp4")))
        random.shuffle(pinterest_clips)
        for cand in pinterest_clips:
            pin_id = cand.stem.replace("pinterest_", "")
            if not workflow_state.is_pin_used(pin_id):
                gate_ok, gate_msg, meta = ffprobe_source_gate(cand)
                if gate_ok:
                    luma_ok, _, _ = brightness_and_saturation_gate(cand)
                    if luma_ok:
                        wm_ok, _ = watermark_and_quality_check(cand)
                        if wm_ok:
                            logger.info(f"Selected verified local Pinterest clip '{cand.name}' for pin '{pin_id}'")
                            return cand, pin_id

    # 3. TERTIARY: Check if PodFetch downloaded nature pins are available
    podfetch_dir = Path.home() / "Downloads" / "PodFetch" / "downloads" / "nature" / "originals"
    if podfetch_dir.exists():
        pod_clips = list(podfetch_dir.rglob("*.mp4"))
        random.shuffle(pod_clips)
        for cand in pod_clips:
            pin_id = f"pod_{cand.stem}"
            if not workflow_state.is_pin_used(pin_id):
                gate_ok, _, _ = ffprobe_source_gate(cand)
                if gate_ok:
                    luma_ok, _, _ = brightness_and_saturation_gate(cand)
                    if luma_ok:
                        logger.info(f"Selected PodFetch pin '{pin_id}' ({cand.name})")
                        return cand, pin_id

    raise FileNotFoundError("No qualified Pinterest nature footage found passing quality gates.")

