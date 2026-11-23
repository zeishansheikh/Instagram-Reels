"""Tests for batch reel generation flow, packaging, idempotency, and error tolerance."""

from __future__ import annotations

import datetime
import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from instora.backgrounds.base import BackgroundProvider
from instora.db import init_db
from instora.packaging.caption import format_caption
from instora.packaging.writer import get_next_reel_dir, package_reel
from instora.quotes.generator import Quote
from instora.render.pipeline import batch_generate_reels
from tests.test_backgrounds import create_synthetic_video


def test_format_caption() -> None:
    """Verify caption formatting with one-line thought, base hashtags, and theme tag."""
    caption = "Finding still moments above the noise. ✨"
    theme = "Hope"
    base_tags = ["#nature", "#positivity", "#naturetherapy"]
    extra_tags = ["#hope", "#peace"]

    formatted = format_caption(
        caption=caption,
        theme=theme,
        hashtags_base=base_tags,
        extra_hashtags=extra_tags,
    )

    assert caption in formatted
    assert "#nature" in formatted
    assert "#positivity" in formatted
    assert "#naturetherapy" in formatted
    assert "#hope" in formatted
    assert "#peace" in formatted

    # Ensure hashtags are deduplicated (e.g. #hope appears only once)
    assert formatted.count("#hope") == 1


def test_packaging_structure_and_sequential_naming(tmp_path: Path) -> None:
    """Verify output/YYYY-MM-DD/reel_NNN packaging structure and sequential indices."""
    output_base = tmp_path / "output"
    today_str = datetime.date.today().isoformat()
    date_dir = output_base / today_str

    # First reel index should be reel_001
    next_dir1 = get_next_reel_dir(date_dir)
    assert next_dir1.name == "reel_001"

    # Create dummy video to package
    dummy_video = tmp_path / "test_reel.mp4"
    dummy_video.write_bytes(b"mock_mp4_bytes")

    caption_text = "Quiet alpenglow.\n\n#nature #hope"
    metadata = {"quote": "Still waters reflect the sky.", "mood": "lake"}

    packaged_dir1 = package_reel(
        rendered_video_path=dummy_video,
        caption_text=caption_text,
        metadata=metadata,
        output_base_dir=output_base,
    )

    assert packaged_dir1.name == "reel_001"
    assert (packaged_dir1 / "reel.mp4").exists()
    assert (packaged_dir1 / "caption.txt").read_text(encoding="utf-8").strip() == caption_text
    meta_loaded = json.loads((packaged_dir1 / "meta.json").read_text(encoding="utf-8"))
    assert meta_loaded["quote"] == "Still waters reflect the sky."
    assert "packaged_at" in meta_loaded

    # Subsequent package should create reel_002
    packaged_dir2 = package_reel(
        rendered_video_path=dummy_video,
        caption_text=caption_text,
        metadata=metadata,
        output_base_dir=output_base,
    )
    assert packaged_dir2.name == "reel_002"


def test_batch_generate_reels_e2e_and_idempotency(tmp_path: Path) -> None:
    """Verify batch reel generation flow, summary reporting, error resilience, and idempotency."""
    output_dir = tmp_path / "output"
    db_file = tmp_path / "test.db"

    # Create synthetic background video (1080x1920, 6s)
    bg_video = tmp_path / "bg_nature.mp4"
    create_synthetic_video(bg_video, 1080, 1920, duration=6.0)

    # Mock background provider
    mock_bg_provider = MagicMock(spec=BackgroundProvider)
    mock_bg_provider.get_clip.return_value = bg_video

    # Mock Gemini Client returning 2 valid quotes
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps([
        {
            "text": "The mountain teaches us that patience outlives even the longest stormy winter nights.",
            "mood": "mountain",
            "theme": "hope",
            "caption": "Patience in the mountains. ✨",
            "hashtags": ["#nature", "#mountain", "#hope"],
        },
        {
            "text": "Quiet waters softly hold the reflection of heavens when the winds finally rest.",
            "mood": "lake",
            "theme": "peace",
            "caption": "Resting waters. ✨",
            "hashtags": ["#lake", "#peace", "#stillness"],
        },
    ])
    mock_client.models.generate_content.return_value = mock_response

    # 1. Run batch generation for 2 reels
    results = batch_generate_reels(
        count=2,
        theme="hope",
        lang="en",
        style_path="styles/degraaf.yaml",
        output_base_dir=output_dir,
        client=mock_client,
        background_provider=mock_bg_provider,
        db_path=db_file,
    )

    assert len(results) == 2
    assert results[0]["status"] == "ok"
    assert results[1]["status"] == "ok"
    assert Path(results[0]["output"]).exists()
    assert (Path(results[0]["output"]) / "reel.mp4").exists()
    assert (Path(results[0]["output"]) / "caption.txt").exists()
    assert (Path(results[0]["output"]) / "meta.json").exists()

    # 2. Idempotency test: re-running with same quotes should skip already rendered quotes
    same_quotes = [
        Quote(
            id=1,
            text="The mountain teaches us that patience outlives even the longest stormy winter nights.",
            mood="mountain",
            theme="hope",
            caption="Patience in the mountains. ✨",
            hashtags=["#nature", "#mountain", "#hope"],
            lang="en",
        ),
        Quote(
            id=2,
            text="Quiet waters softly hold the reflection of heavens when the winds finally rest.",
            mood="lake",
            theme="peace",
            caption="Resting waters. ✨",
            hashtags=["#lake", "#peace", "#stillness"],
            lang="en",
        ),
    ]

    results_rerun = batch_generate_reels(
        count=2,
        theme="hope",
        lang="en",
        style_path="styles/degraaf.yaml",
        output_base_dir=output_dir,
        client=mock_client,
        background_provider=mock_bg_provider,
        db_path=db_file,
        quotes=same_quotes,
    )

    assert len(results_rerun) == 2
    for r in results_rerun:
        assert r["status"] == "ok"
        assert "Already rendered" in r["output"]


def test_batch_generate_resilience_to_failures(tmp_path: Path) -> None:
    """Verify that a failure on one reel does not stop the batch from processing other reels."""
    output_dir = tmp_path / "output"
    db_file = tmp_path / "test.db"

    bg_video = tmp_path / "bg_nature.mp4"
    create_synthetic_video(bg_video, 1080, 1920, duration=6.0)

    # Provider fails on first call, succeeds on second call
    mock_bg_provider = MagicMock(spec=BackgroundProvider)
    mock_bg_provider.get_clip.side_effect = [
        RuntimeError("Network clip download timeout"),
        bg_video,
    ]

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps([
        {
            "text": "First quote text here to test the failure handling and resilience mechanism.",
            "mood": "forest",
            "theme": "hope",
            "caption": "First caption.",
            "hashtags": ["#one", "#two", "#three"],
        },
        {
            "text": "Second quote text here that should successfully render despite earlier failure.",
            "mood": "sunset",
            "theme": "hope",
            "caption": "Second caption.",
            "hashtags": ["#one", "#two", "#three"],
        },
    ])
    mock_client.models.generate_content.return_value = mock_response

    results = batch_generate_reels(
        count=2,
        theme="hope",
        lang="en",
        style_path="styles/degraaf.yaml",
        output_base_dir=output_dir,
        client=mock_client,
        background_provider=mock_bg_provider,
        db_path=db_file,
    )

    assert len(results) == 2
    # First reel failed
    assert results[0]["status"] == "failed"
    assert "Network clip download timeout" in results[0]["reason"]

    # Second reel succeeded
    assert results[1]["status"] == "ok"
    assert Path(results[1]["output"]).exists()

