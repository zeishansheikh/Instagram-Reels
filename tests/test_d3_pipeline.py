"""Comprehensive unit and integration tests for the D3 Reel Pipeline (Formula D3).

Covers:
- Workflow state persistence and deduplication
- Reel manifest creation, serialization, and validation
- Source gates, brightness/saturation gates, and audio verification
- Text layout with Middle-Centre placement lock
- Roman Urdu quote generation & caption formatting
- 15-step builder execution and staging
- Post job validation and execution
- FastAPI /d3 endpoints
"""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from reelforge.pipeline.builder import build_d3_reel
from reelforge.pipeline.gates import (
    audio_volume_verify,
    brightness_and_saturation_gate,
    ffprobe_source_gate,
    verify_final_reel,
    watermark_and_quality_check,
)
from reelforge.pipeline.grade_adaptive import detect_scene_tone
from reelforge.pipeline.manifest import ReelManifest
from reelforge.pipeline.placement_lock import (
    build_d3_drawtext_filter,
    find_optimal_center_y,
    resolve_d3_font,
)
from reelforge.pipeline.poster import post_d3_reel
from reelforge.pipeline.quotes_d3 import (
    clean_d3_line,
    format_d3_caption,
    generate_d3_quote,
)
from reelforge.pipeline.workflow_state import WorkflowState


@pytest.fixture
def dummy_video(tmp_path) -> Path:
    """Generate a quick native 60fps 1080x1920 test MP4 video with audible sine tone."""
    v_path = tmp_path / "test_dummy_1080p.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=size=1080x1920:rate=60:duration=2",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=2",
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        str(v_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return v_path


@pytest.fixture
def client():
    return TestClient(app)


# --- 1. Workflow State Tests ---

def test_workflow_state_operations(tmp_path):
    state_file = tmp_path / "state.json"
    state = WorkflowState.load(state_file)

    assert state.used_pins == []
    assert not state.is_pin_used("pin_12345")
    assert not state.is_line_used("sab kehte hain waqt sab theek kar deta hai")
    assert not state.is_song_used("Dil Ki Khamoshi")

    # Record entries
    state.record_pin("pin_12345")
    state.record_line("sab kehte hain waqt sab theek kar deta hai")
    state.record_song("Dil Ki Khamoshi - alonesinghkdm", "2026-11-21")
    state.save(state_file)

    # Reload and verify persistence
    reloaded = WorkflowState.load(state_file)
    assert reloaded.is_pin_used("pin_12345")
    assert reloaded.is_line_used("sab kehte hain waqt sab theek kar deta hai")
    assert reloaded.is_song_used("Dil Ki Khamoshi")
    assert "PIN:pin_12345" in reloaded.used_reels


# --- 2. Reel Manifest Tests ---

def test_manifest_validation(tmp_path, dummy_video):
    manifest = ReelManifest(
        date="2026-11-21",
        slot="a",
        video_path=str(dummy_video.resolve()),
        caption="Lines here\n\n#sad #dard #tanhai",
        hashtags=["#sad", "#dard", "#tanhai"],
        song="Dil Ki Khamoshi",
        quote="Test lines",
    )
    manifest_p = manifest.save(tmp_path)
    assert manifest_p.exists()

    loaded = ReelManifest.load("a", directory=tmp_path)
    assert loaded is not None
    assert loaded.date == "2026-11-21"
    assert loaded.slot == "a"

    # Validation succeeds on current date
    ok, msg = loaded.validate_for_post("2026-11-21")
    assert ok is True

    # Validation fails on mismatched date
    bad_date_ok, _ = loaded.validate_for_post("2026-11-22")
    assert bad_date_ok is False


# --- 3. Quality Gate Tests ---

def test_ffprobe_source_gate(dummy_video):
    ok, msg, meta = ffprobe_source_gate(dummy_video)
    assert ok is True
    assert meta["width"] == 1080
    assert meta["height"] == 1920
    assert meta["fps"] >= 24


def test_brightness_and_saturation_gate(dummy_video):
    ok, msg, stats = brightness_and_saturation_gate(dummy_video)
    assert ok is True
    assert "mean_luma" in stats
    assert stats["mean_luma"] <= 0.62


def test_watermark_check(dummy_video):
    ok, msg = watermark_and_quality_check(dummy_video)
    assert ok is True


def test_audio_volume_verify(dummy_video):
    ok, msg, stats = audio_volume_verify(dummy_video)
    assert ok is True
    assert "mean_volume" in stats


# --- 4. Text Layout & Placement Lock Tests ---

def test_placement_lock_bounds(dummy_video):
    optimal_y = find_optimal_center_y(dummy_video, text_height=120)
    # Spec requirement: middle third (y between 640 and 1280, target ~960)
    assert 640 <= optimal_y <= 1280


def test_build_d3_drawtext_filter():
    lines = [
        "sab kehte hain waqt sab theek kar deta hai—",
        "mera waqt: to bas yaadein de gaya's",
    ]
    vf = build_d3_drawtext_filter(lines=lines, font_size=30)
    assert "drawtext=" in vf
    assert "fontsize=30" in vf
    assert "shadowcolor=black@0.9" in vf
    assert "x=(w-text_w)/2" in vf
    # Forbidden characters must be cleaned from text parameters
    for part in vf.split("drawtext="):
        if "text='" in part:
            text_val = part.split("text='")[1].split("':")[0]
            assert "—" not in text_val
            assert ":" not in text_val
            assert "'" not in text_val


# --- 5. Quotes D3 Formula Tests ---

def test_clean_d3_line_and_caption():
    line = "pehli line: jo dard deti hai—'bht zyada'"
    cleaned = clean_d3_line(line)
    assert "—" not in cleaned
    assert ":" not in cleaned
    assert "'" not in cleaned

    caption = format_d3_caption(["line 1", "line 2"], hashtags=["#sad", "#dard", "#tanhai"])
    assert "line 1\nline 2" in caption
    assert "#sad #dard #tanhai" in caption


def test_generate_d3_quote_no_repeat():
    state = WorkflowState(
        used_lines=["sab kehte hain waqt sab theek kar deta hai, / mera waqt to bas yaadein de gaya."]
    )
    lines, theme, tags = generate_d3_quote(theme="tanhai", slot="a", state=state)
    assert len(lines) >= 2
    assert len(tags) == 3
    # Guaranteed not to equal the used line
    full_str = " / ".join(lines)
    assert not state.is_line_used(full_str)


# --- 6. End-to-End Build and Post Pipeline Tests ---

def test_build_d3_reel_e2e(tmp_path, dummy_video):
    swap_dir = tmp_path / "swap"

    with patch("reelforge.pipeline.builder.fetch_pinterest_clip", return_value=(dummy_video, "pin_test_999")):
        res = build_d3_reel(
            slot="a",
            target_date="2026-11-21",
            swap_dir=swap_dir,
            dry_run=False,
        )

        assert res["status"] == "success"
        assert res["slot"] == "a"
        assert res["date"] == "2026-11-21"
        assert Path(res["video_path"]).exists()
        assert Path(res["manifest_path"]).exists()

        # Test post job on the staged reel
        post_res = post_d3_reel(
            slot="a",
            target_date="2026-11-21",
            manifest_dir=swap_dir / "ready_to_post",
            dry_run=True,
        )
        assert post_res["status"] == "dry_run"
        assert post_res["slot"] == "a"


# --- 7. FastAPI D3 Endpoints Tests ---

def test_api_d3_status_and_state(client):
    status_resp = client.get("/d3/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["formula"] == "D3"
    assert data["account"] == "@enoent.7"
    assert "slots" in data

    state_resp = client.get("/d3/state")
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert "used_pins" in state_data
    assert "used_lines" in state_data
