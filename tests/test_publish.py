"""Tests for Instagram Graph API publishing, storage providers, and publish CLI command."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import httpx
import pytest

from reelforge.db import init_db, is_reel_published
from reelforge.packaging.writer import package_reel
from reelforge.publish.graph_api import InstagramPublishError, InstagramPublisher
from reelforge.publish.service import publish_date_reels
from reelforge.publish.storage import (
    MockStorage,
    R2Storage,
    StorageProvider,
    SupabaseStorage,
    get_storage_provider,
)
from tests.test_backgrounds import create_synthetic_video


def test_storage_protocol_and_mock(tmp_path: Path) -> None:
    """Verify that MockStorage adheres to StorageProvider protocol."""
    storage = MockStorage()
    assert isinstance(storage, StorageProvider)

    dummy_file = tmp_path / "test_video.mp4"
    dummy_file.write_bytes(b"sample_bytes")

    public_url = storage.upload(dummy_file)
    assert public_url.startswith("https://mock-storage.reelforge.internal/")
    assert public_url in storage.uploaded_files

    storage.delete(public_url)
    assert public_url not in storage.uploaded_files


def test_supabase_storage_mocked_http(tmp_path: Path) -> None:
    """Verify SupabaseStorage upload and delete with mocked HTTP client."""
    mock_client = MagicMock(spec=httpx.Client)

    # Mock successful upload response (status 200)
    upload_res = MagicMock(status_code=200)
    # Mock delete response (status 200)
    delete_res = MagicMock(status_code=200)

    mock_client.post.return_value = upload_res
    mock_client.delete.return_value = delete_res

    storage = SupabaseStorage(
        supabase_url="https://testproj.supabase.co",
        supabase_key="test_key_xyz",
        bucket_name="reels",
        http_client=mock_client,
    )

    test_file = tmp_path / "reel.mp4"
    test_file.write_bytes(b"dummy_content")

    public_url = storage.upload(test_file)
    assert "https://testproj.supabase.co/storage/v1/object/public/reels/" in public_url
    assert mock_client.post.called

    storage.delete(public_url)
    assert mock_client.delete.called


def test_r2_storage_mocked_s3(tmp_path: Path) -> None:
    """Verify R2Storage upload and delete using injected S3 client."""
    mock_s3 = MagicMock()

    storage = R2Storage(
        account_id="acc123",
        access_key_id="key123",
        secret_access_key="secret123",
        bucket_name="my-reels",
        public_url_prefix="https://cdn.example.com",
        s3_client=mock_s3,
    )

    test_file = tmp_path / "r2_reel.mp4"
    test_file.write_bytes(b"r2_bytes")

    public_url = storage.upload(test_file)
    assert public_url.startswith("https://cdn.example.com/")
    assert mock_s3.put_object.called

    storage.delete(public_url)
    assert mock_s3.delete_object.called


def test_instagram_publisher_credentials_validation() -> None:
    """Verify publisher raises ValueError when required credentials are missing."""
    pub_no_token = InstagramPublisher(access_token="", instagram_account_id="178414000")
    with pytest.raises(ValueError, match="IG_ACCESS_TOKEN is missing"):
        pub_no_token.validate_credentials()

    pub_no_id = InstagramPublisher(access_token="valid_token", instagram_account_id="")
    with pytest.raises(ValueError, match="IG_USER_ID is missing"):
        pub_no_id.validate_credentials()


def test_instagram_publisher_container_creation_and_polling() -> None:
    """Verify Reels container creation and status polling logic."""
    mock_client = MagicMock(spec=httpx.Client)

    # 1. Container creation response
    mock_container_resp = MagicMock(status_code=200)
    mock_container_resp.json.return_value = {"id": "container_998877"}

    # 2. Polling responses: first IN_PROGRESS, second FINISHED
    mock_poll_1 = MagicMock(status_code=200)
    mock_poll_1.json.return_value = {"status_code": "IN_PROGRESS"}

    mock_poll_2 = MagicMock(status_code=200)
    mock_poll_2.json.return_value = {"status_code": "FINISHED"}

    mock_client.post.return_value = mock_container_resp
    mock_client.get.side_effect = [mock_poll_1, mock_poll_2]

    pub = InstagramPublisher(
        access_token="test_token",
        instagram_account_id="17841412345",
        http_client=mock_client,
        poll_interval=0.01,
    )

    container_id = pub.create_reels_container(
        video_url="https://example.com/video.mp4",
        caption="A quiet mountain sunrise. #peace #nature",
    )
    assert container_id == "container_998877"

    # Verify POST data parameters
    call_args = mock_client.post.call_args
    data = call_args[1]["data"]
    assert data["media_type"] == "REELS"
    assert data["video_url"] == "https://example.com/video.mp4"
    assert data["share_to_feed"] == "true"

    status = pub.poll_container_status(container_id)
    assert status == "FINISHED"
    assert mock_client.get.call_count == 2


def test_instagram_publisher_poll_error() -> None:
    """Verify publisher raises InstagramPublishError when container processing fails."""
    mock_client = MagicMock(spec=httpx.Client)
    mock_poll_err = MagicMock(status_code=200)
    mock_poll_err.json.return_value = {
        "status_code": "ERROR",
        "status": "Transcoding failed: unsupported codec",
    }
    mock_client.get.return_value = mock_poll_err

    pub = InstagramPublisher(
        access_token="test_token",
        instagram_account_id="17841412345",
        http_client=mock_client,
    )

    with pytest.raises(InstagramPublishError, match="unsupported codec"):
        pub.poll_container_status("container_err")


def test_instagram_publisher_full_pipeline_mocked(tmp_path: Path) -> None:
    """Verify complete publish_reel execution: upload -> container -> poll -> publish -> cleanup."""
    mock_client = MagicMock(spec=httpx.Client)

    # 1. Media container creation
    res_container = MagicMock(status_code=200)
    res_container.json.return_value = {"id": "c_123"}

    # 2. Status poll
    res_poll = MagicMock(status_code=200)
    res_poll.json.return_value = {"status_code": "FINISHED"}

    # 3. Media publish
    res_publish = MagicMock(status_code=200)
    res_publish.json.return_value = {"id": "media_post_777"}

    # 4. Permalink fetch
    res_permalink = MagicMock(status_code=200)
    res_permalink.json.return_value = {"permalink": "https://www.instagram.com/reel/C123xyz/"}

    mock_client.post.side_effect = [res_container, res_publish]
    mock_client.get.side_effect = [res_poll, res_permalink]

    pub = InstagramPublisher(
        access_token="token_abc",
        instagram_account_id="ig_123",
        http_client=mock_client,
        poll_interval=0.01,
    )

    storage = MockStorage()
    fake_video = tmp_path / "reel.mp4"
    fake_video.write_bytes(b"content")

    result = pub.publish_reel(
        video_path=fake_video,
        caption="Test caption #nature",
        storage=storage,
        audio_mode="none",
    )

    assert result["media_id"] == "media_post_777"
    assert result["container_id"] == "c_123"
    assert result["permalink"] == "https://www.instagram.com/reel/C123xyz/"
    # Verify temporary video was deleted from storage
    assert len(storage.uploaded_files) == 0


def test_publish_date_reels_dry_run_and_idempotency(tmp_path: Path) -> None:
    """Verify publish_date_reels dry-run validation and idempotency protection."""
    output_base = tmp_path / "output"
    date_str = "2026-11-20"
    db_file = tmp_path / "test.db"

    # Create dummy video and package into output/2026-11-20/reel_001
    test_video = tmp_path / "vid.mp4"
    test_video.write_bytes(b"mp4_bytes")

    reel_dir = package_reel(
        rendered_video_path=test_video,
        caption_text="Winter calm #nature #peace",
        metadata={"quote": "Still waters.", "mood": "lake", "style": "degraaf"},
        output_base_dir=output_base,
    )

    # 1. Dry run
    dry_results = publish_date_reels(
        date_str=date_str,
        output_base=output_base,
        dry_run=True,
        db_path=db_file,
    )
    assert len(dry_results) == 1
    assert dry_results[0]["status"] == "dry_run"

    # 2. Mock live publish
    mock_pub = MagicMock(spec=InstagramPublisher)
    mock_pub.publish_reel.return_value = {
        "media_id": "18000111222",
        "container_id": "c_555",
        "permalink": "https://instagram.com/reel/live_123",
    }

    mock_storage = MockStorage()

    live_results = publish_date_reels(
        date_str=date_str,
        output_base=output_base,
        dry_run=False,
        db_path=db_file,
        publisher=mock_pub,
        storage_provider=mock_storage,
    )

    assert len(live_results) == 1
    assert live_results[0]["status"] == "published"
    assert live_results[0]["media_id"] == "18000111222"

    # Verify recorded in DB
    conn = init_db(db_file)
    assert is_reel_published(conn, str(reel_dir))

    # 3. Idempotency test: re-running should skip already published reel
    rerun_results = publish_date_reels(
        date_str=date_str,
        output_base=output_base,
        dry_run=False,
        db_path=db_file,
        publisher=mock_pub,
        storage_provider=mock_storage,
    )

    assert len(rerun_results) == 1
    assert rerun_results[0]["status"] == "skipped"
    assert "Already published" in rerun_results[0]["reason"]
    # publish_reel should not have been called a second time
    assert mock_pub.publish_reel.call_count == 1
