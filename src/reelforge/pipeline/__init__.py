"""Reel Pipeline package implementing the complete D3 Formula spec."""

from reelforge.pipeline.workflow_state import WorkflowState
from reelforge.pipeline.manifest import ReelManifest
from reelforge.pipeline.builder import build_d3_reel
from reelforge.pipeline.poster import post_d3_reel
from reelforge.pipeline.gates import (
    ffprobe_source_gate,
    brightness_and_saturation_gate,
    watermark_and_quality_check,
    audio_volume_verify,
    verify_final_reel,
)
from reelforge.pipeline.quotes_d3 import generate_d3_quote, format_d3_caption
from reelforge.pipeline.placement_lock import find_optimal_center_y, build_d3_drawtext_filter

__all__ = [
    "WorkflowState",
    "ReelManifest",
    "build_d3_reel",
    "post_d3_reel",
    "ffprobe_source_gate",
    "brightness_and_saturation_gate",
    "watermark_and_quality_check",
    "audio_volume_verify",
    "verify_final_reel",
    "generate_d3_quote",
    "format_d3_caption",
    "find_optimal_center_y",
    "build_d3_drawtext_filter",
]

