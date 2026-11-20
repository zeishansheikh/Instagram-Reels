"""Integration tests for the Reel Forge FastAPI backend."""

from __future__ import annotations

import json
import uuid
import os
import sqlite3
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.jobs import job_manager


@pytest.fixture
def client():
    """Create FastAPI TestClient."""
    return TestClient(app)


def test_health_endpoint(client):
    """Test GET /health returns system status."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "database_connected" in data
    assert "ffmpeg_available" in data
    assert "gemini_api_key_configured" in data
    assert "background_provider" in data


def test_list_reels(client):
    """Test GET /reels lists date-partitioned reels."""
    resp = client.get("/reels")
    assert resp.status_code == 200
    reels = resp.json()
    assert isinstance(reels, list)
    if reels:
        first = reels[0]
        assert "id" in first
        assert "quote_text" in first
        assert "video_url" in first
        assert "thumbnail_url" in first
        assert "status" in first


def test_get_single_reel_and_not_found(client):
    """Test GET /reels/{id} returns details for existing reel and 404 for missing."""
    resp = client.get("/reels/999999")
    assert resp.status_code == 404

    # If reels exist in DB, test the first one
    reels_resp = client.get("/reels?limit=1")
    reels = reels_resp.json()
    if reels:
        first_id = reels[0]["id"]
        detail_resp = client.get(f"/reels/{first_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["id"] == first_id
        assert "meta_json" in detail
        assert "publish_history" in detail


def test_reel_actions_approve_and_discard(client, tmp_path):
    """Test POST /reels/{id}/approve and POST /reels/{id}/discard."""
    # Create a test reel in DB and disk
    from reelforge.db import init_db, insert_quote, record_clip_usage, record_reel
    from reelforge.config import load_config

    cfg = load_config()
    conn = init_db(cfg.paths.db_path)

    unique_hash = f"hash_action_{uuid.uuid4().hex[:8]}"
    q_id = insert_quote(conn, "A test quote for action testing.", unique_hash, "hope", "en")
    clip_id = record_clip_usage(conn, "assets/backgrounds/test_clip.mp4")

    # Create dummy reel folder
    test_reel_dir = tmp_path / "output" / "2026-11-20" / "reel_test_action"
    test_reel_dir.mkdir(parents=True, exist_ok=True)
    video_file = test_reel_dir / "reel.mp4"
    video_file.write_text("dummy video")
    (test_reel_dir / "meta.json").write_text(json.dumps({"quote": "A test quote"}))
    (test_reel_dir / "caption.txt").write_text("Test caption")

    reel_id = record_reel(conn, q_id, clip_id, "degraaf", str(video_file), status="completed")

    # 1. Approve
    app_resp = client.post(f"/reels/{reel_id}/approve")
    assert app_resp.status_code == 200
    app_data = app_resp.json()
    assert app_data["status"] == "approved"
    assert app_data["action"] == "approved"

    # 2. Discard
    disc_resp = client.post(f"/reels/{reel_id}/discard")
    assert disc_resp.status_code == 200
    disc_data = disc_resp.json()
    assert disc_data["status"] == "discarded"


def test_reels_generate_background_job(client):
    """Test POST /reels/generate enqueues background job with status polling."""
    mock_results = [{"index": 1, "status": "ok", "mood": "hope", "quote": "Test quote", "output": "output/test/reel.mp4"}]

    with patch("api.routes.reels.batch_generate_reels", return_value=mock_results):
        resp = client.post(
            "/reels/generate",
            json={
                "count": 1,
                "theme": "hope",
                "lang": "en",
                "style": "styles/degraaf.yaml",
                "run_in_background": True,
            },
        )
        assert resp.status_code == 202
        data = resp.json()
        assert "job_id" in data
        assert data["type"] == "generate"
        assert "poll_url" in data

        job_id = data["job_id"]
        # Poll status
        poll_resp = client.get(f"/jobs/{job_id}")
        assert poll_resp.status_code == 200
        job_data = poll_resp.json()
        assert job_data["job_id"] == job_id
        assert job_data["type"] == "generate"


def test_list_quotes(client):
    """Test GET /quotes returns quotes with filters."""
    resp = client.get("/quotes?limit=10")
    assert resp.status_code == 200
    quotes = resp.json()
    assert isinstance(quotes, list)
    if quotes:
        first = quotes[0]
        assert "text" in first
        assert "theme" in first
        assert "used_count" in first


def test_list_clips(client):
    """Test GET /clips returns background clips with usage and provider."""
    resp = client.get("/clips")
    assert resp.status_code == 200
    clips = resp.json()
    assert isinstance(clips, list)
    if clips:
        first = clips[0]
        assert "source" in first
        assert "path" in first
        assert "use_count" in first
        assert "exists_on_disk" in first


def test_get_schedule(client):
    """Test GET /schedule returns queue counts and scheduled reels."""
    resp = client.get("/schedule")
    assert resp.status_code == 200
    sched = resp.json()
    assert "pending_approval_count" in sched
    assert "approved_ready_to_publish_count" in sched
    assert "published_count" in sched
    assert "scheduled_reels" in sched
    assert "recommended_next_publish_date" in sched


def test_get_and_put_settings(client):
    """Test GET /settings and PUT /settings."""
    # 1. GET
    get_resp = client.get("/settings")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert "config" in data
    assert "environment" in data

    # 2. PUT
    orig_count = data["config"].get("defaults", {}).get("count", 10)
    put_resp = client.put("/settings", json={"count": 12, "theme": "solitude"})
    assert put_resp.status_code == 200
    updated = put_resp.json()
    assert updated["config"]["defaults"]["count"] == 12
    assert updated["config"]["defaults"]["theme"] == "solitude"

    # Restore
    client.put("/settings", json={"count": orig_count, "theme": "reflective"})


def test_publish_log(client):
    """Test GET /publish-log returns publish entries."""
    resp = client.get("/publish-log")
    assert resp.status_code == 200
    logs = resp.json()
    assert isinstance(logs, list)


def test_post_publish_reel(client, tmp_path):
    """Test POST /publish/{id} triggers publish job."""
    from reelforge.db import init_db, insert_quote, record_clip_usage, record_reel
    from reelforge.config import load_config

    cfg = load_config()
    conn = init_db(cfg.paths.db_path)

    unique_pub_hash = f"hash_pub_{uuid.uuid4().hex[:8]}"
    q_id = insert_quote(conn, "Quote for publish test", unique_pub_hash, "hope", "en")
    clip_id = record_clip_usage(conn, "assets/backgrounds/pub_clip.mp4")

    # Create dummy reel folder
    pub_reel_dir = tmp_path / "output" / "2026-11-20" / "reel_pub_test"
    pub_reel_dir.mkdir(parents=True, exist_ok=True)
    video_file = pub_reel_dir / "reel.mp4"
    video_file.write_text("dummy video")
    (pub_reel_dir / "caption.txt").write_text("Publish test caption")

    reel_id = record_reel(conn, q_id, clip_id, "degraaf", str(video_file), status="approved")

    mock_publish_res = [{"reel": "reel_pub_test", "status": "dry_run", "media_id": "MOCK_ID", "permalink": "https://ig.com/reel", "reason": "ok"}]

    with patch("api.routes.publish.publish_date_reels", return_value=mock_publish_res):
        resp = client.post(f"/publish/{reel_id}", json={"dry_run": True, "run_in_background": True})
        assert resp.status_code == 202
        data = resp.json()
        assert "job_id" in data
        assert data["type"] == "publish"
        assert "poll_url" in data


def test_api_key_authentication(client, monkeypatch):
    """Test API key authentication enforcement when REELFORGE_API_KEY is configured."""
    secret = "test-secret-key-12345"
    monkeypatch.setenv("REELFORGE_API_KEY", secret)

    # 1. Missing key -> 401
    unauth_resp = client.get("/quotes")
    assert unauth_resp.status_code == 401

    # 2. Invalid key -> 401
    bad_resp = client.get("/quotes", headers={"X-API-Key": "wrong-key"})
    assert bad_resp.status_code == 401

    # 3. Valid via X-API-Key -> 200
    good_header_resp = client.get("/quotes", headers={"X-API-Key": secret})
    assert good_header_resp.status_code == 200

    # 4. Valid via Bearer token -> 200
    good_bearer_resp = client.get("/quotes", headers={"Authorization": f"Bearer {secret}"})
    assert good_bearer_resp.status_code == 200

    # 5. Valid via query param ?api_key= -> 200
    good_query_resp = client.get(f"/quotes?api_key={secret}")
    assert good_query_resp.status_code == 200

    # 6. /health is exempt -> 200
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
