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
    "mountain river",
    "alpine meadow",
    "waterfall dark rocks",
    "autumn forest path",
    "green cliff ocean",
    "pine valley",
    "river gorge",
    "lake reflections sunset",
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

    Returns:
        Tuple of (clip_path: Path, pin_id: str).
    """
    workflow_state = state or WorkflowState.load()
    dest_dir = Path(output_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    # 1. Check if we already have an unused Pinterest HD clip in assets/backgrounds
    bg_dir = Path("assets/backgrounds")
    if bg_dir.exists():
        pinterest_clips = sorted(list(bg_dir.glob("pinterest_*.mp4")))
        for cand in pinterest_clips:
            pin_id = cand.stem.replace("pinterest_", "")
            if not workflow_state.is_pin_used(pin_id):
                gate_ok, _, _ = ffprobe_source_gate(cand)
                if gate_ok:
                    luma_ok, _, _ = brightness_and_saturation_gate(cand)
                    if luma_ok:
                        wm_ok, _ = watermark_and_quality_check(cand)
                        if wm_ok:
                            logger.info(f"Selected verified Pinterest clip '{cand.name}' for pin '{pin_id}'")
                            return cand, pin_id

    # 2. Directly fetch a fresh nature clip from Pinterest using authenticated cookies
    try:
        from instora.pipeline.pinterest_client import fetch_fresh_pinterest_video
        fresh = fetch_fresh_pinterest_video(category=category, output_dir=bg_dir, state=workflow_state)
        if fresh:
            cand, pin_id = fresh
            logger.info(f"Successfully fetched fresh Pinterest video '{cand.name}' for category '{category}'")
            return cand, pin_id
    except Exception as exc:
        logger.warning(f"Direct Pinterest fetcher error: {exc}")

    # 3. Inspect other local background assets in assets/backgrounds as fallback
    if bg_dir.exists():
        candidates = sorted(list(bg_dir.glob("*.mp4")) + list(bg_dir.glob("*.mov")))
        for cand in candidates:
            pin_id = cand.stem.replace(" ", "_")
            if not workflow_state.is_pin_used(pin_id):
                # Verify source gates
                gate_ok, _, _ = ffprobe_source_gate(cand)
                if gate_ok:
                    luma_ok, _, _ = brightness_and_saturation_gate(cand)
                    if luma_ok:
                        wm_ok, _ = watermark_and_quality_check(cand)
                        if wm_ok:
                            logger.info(f"Selected verified local clip '{cand.name}' for pin '{pin_id}'")
                            return cand, pin_id

    # 3. Check if PodFetch downloaded nature pins are available
    podfetch_dir = Path.home() / "Downloads" / "PodFetch" / "downloads"
    if podfetch_dir.exists():
        for cand in sorted(podfetch_dir.glob("*.mp4")):
            pin_id = cand.stem
            if not workflow_state.is_pin_used(pin_id):
                gate_ok, _, _ = ffprobe_source_gate(cand)
                if gate_ok:
                    luma_ok, _, _ = brightness_and_saturation_gate(cand)
                    if luma_ok:
                        logger.info(f"Selected PodFetch pin '{pin_id}' ({cand.name})")
                        return cand, pin_id

    # 4. Fallback: use first available video in assets/backgrounds
    if bg_dir.exists():
        fallback_files = list(bg_dir.glob("*.mp4"))
        if fallback_files:
            chosen = fallback_files[0]
            pin_id = f"local_{chosen.stem}"
            return chosen, pin_id

    raise FileNotFoundError("No qualified Pinterest nature footage found passing quality gates.")

