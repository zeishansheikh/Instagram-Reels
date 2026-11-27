"""Reel Pipeline package implementing the complete D3 Formula spec."""

from instora.pipeline.workflow_state import WorkflowState
from instora.pipeline.manifest import ReelManifest
from instora.pipeline.builder import build_d3_reel
from instora.pipeline.poster import post_d3_reel
from instora.pipeline.gates import (
    ffprobe_source_gate,
    brightness_and_saturation_gate,
    watermark_and_quality_check,
    audio_volume_verify,
    verify_final_reel,
)
from instora.pipeline.quotes_d3 import generate_d3_quote, format_d3_caption
from instora.pipeline.placement_lock import find_optimal_center_y, build_d3_drawtext_filter

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

