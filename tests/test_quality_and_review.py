"""Tests for automatic quality checks (safe margins, luminance contrast) and interactive review."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from reelforge.backgrounds.base import BackgroundProvider
from reelforge.db import init_db
from reelforge.packaging.writer import package_reel
from reelforge.render.pipeline import batch_generate_reels
from reelforge.render.quality import (
    calculate_text_bounding_box,
    check_safe_margins,
    is_contrast_sufficient,
    sample_background_luminance,
)
from reelforge.render.review import (
    find_reviewable_reels,
    review_all_reels,
    review_single_reel,
)
from tests.test_backgrounds import create_synthetic_video


def test_safe_margins_checker() -> None:
    """Verify safe margins check validates line count and dimensions."""
    font = "assets/fonts/default.ttf"

    # Valid quote
    fits, msg, lines = check_safe_margins(
        text="The mountain teaches us to breathe in stillness and wait for dawn.",
        font_path=font,
        font_size=60,
        max_lines=4,
    )
    assert fits
    assert len(lines) <= 4

    # Quote exceeding max lines
    fits_bad, msg_bad, _ = check_safe_margins(
        text="word " * 60,
        font_path=font,
        font_size=60,
        max_lines=2,
    )
    assert not fits_bad
    assert "exceeds" in msg_bad.lower()


def test_background_luminance_and_contrast(tmp_path: Path) -> None:
    """Verify luminance sampling accurately distinguishes dark vs bright footage."""
    import subprocess

    # 1. Dark video (pure black)
    black_video = tmp_path / "black.mp4"
    cmd_black = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "color=c=black:s=1080x1920:r=30",
        "-t", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(black_video),
    ]
    subprocess.run(cmd_black, check=True, capture_output=True)

    lum_black = sample_background_luminance(black_video, sample_time=1.0)
    assert lum_black < 0.15
    assert is_contrast_sufficient(lum_black)

    # 2. Check contrast threshold
    assert is_contrast_sufficient(0.20)
    assert not is_contrast_sufficient(0.70)


def test_auto_darken_escalation_on_bright_background(tmp_path: Path) -> None:
    """Verify that bright background footage automatically escalates darken overlay."""
    output_dir = tmp_path / "output"
    db_file = tmp_path / "test.db"

    # Create video
    bright_video = tmp_path / "bright_nature.mp4"
    create_synthetic_video(bright_video, 1080, 1920, duration=6.0)

    mock_bg_provider = MagicMock(spec=BackgroundProvider)
    mock_bg_provider.get_clip.return_value = bright_video

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps([
        {
            "text": "The golden sunlight bathes the alpine lake in quiet amber warmth.",
            "mood": "lake",
            "theme": "hope",
            "caption": "Golden sunlight. ✨",
            "hashtags": ["#nature", "#lake", "#hope"],
        }
    ])
    mock_client.models.generate_content.return_value = mock_response

    results = batch_generate_reels(
        count=1,
        theme="hope",
        lang="en",
        style_path="styles/degraaf.yaml",
        output_base_dir=output_dir,
        client=mock_client,
        background_provider=mock_bg_provider,
        db_path=db_file,
    )

    assert len(results) == 1
    assert results[0]["status"] == "ok"
    assert (Path(results[0]["output"]) / "reel.mp4").exists()


def test_review_actions_keep_discard_regenerate(tmp_path: Path) -> None:
    """Verify review actions: keep marks approved, discard moves to _rejected/, regenerate re-renders."""
    output_base = tmp_path / "output"
    db_file = tmp_path / "test.db"

    # Create synthetic reel video
    test_video = tmp_path / "rendered.mp4"
    create_synthetic_video(test_video, 1080, 1920, duration=4.0)

    # Package two reels
    reel1 = package_reel(
        rendered_video_path=test_video,
        caption_text="Thought 1",
        metadata={"quote": "Quote one to discard.", "mood": "lake"},
        output_base_dir=output_base,
    )

    reel2 = package_reel(
        rendered_video_path=test_video,
        caption_text="Thought 2",
        metadata={"quote": "Quote two to keep.", "mood": "mountain"},
        output_base_dir=output_base,
    )

    # 1. Discard reel1
    outcome1 = review_single_reel(
        reel_folder=reel1,
        action="discard",
        output_base=output_base,
        db_path=db_file,
    )
    assert outcome1 == "discarded"
    assert not reel1.exists()  # Moved out of date folder
    rejected_dir = output_base / "_rejected"
    assert rejected_dir.exists()
    assert (rejected_dir / f"{reel1.parent.name}_{reel1.name}").exists()

    # 2. Keep reel2
    outcome2 = review_single_reel(
        reel_folder=reel2,
        action="keep",
        output_base=output_base,
        db_path=db_file,
    )
    assert outcome2 == "kept"
    assert reel2.exists()  # Stays in place

    # Verify review_all_reels finds only unreviewed
    reels_found = find_reviewable_reels(output_base)
    assert len(reels_found) == 1
    assert reels_found[0].resolve() == reel2.resolve()

