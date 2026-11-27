"""Tests for style presets, schema compliance, and --style random rotation."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest
import yaml

from instora.backgrounds.base import BackgroundProvider
from instora.db import init_db, insert_quote
from instora.quotes.dedupe import compute_text_hash
from instora.quotes.generator import Quote
from instora.render.pipeline import (
    batch_generate_reels,
    get_available_styles,
    load_style,
)
from instora.render.text_layout import resolve_font_path
from tests.test_backgrounds import create_synthetic_video


STYLE_PRESET_NAMES = ["degraaf", "serif_quiet", "sans_minimal"]


@pytest.mark.parametrize("preset_name", STYLE_PRESET_NAMES)
def test_style_presets_schema_compliance(preset_name: str) -> None:
    """Verify that all style files exist and strictly adhere to the degraaf schema."""
    style_path = Path("styles") / f"{preset_name}.yaml"
    assert style_path.exists(), f"Style file {style_path} does not exist!"

    with open(style_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert isinstance(data, dict), f"Failed parsing {style_path} as dictionary"
    assert data.get("name") == preset_name

    # Canvas
    canvas = data.get("canvas", {})
    assert canvas.get("width") == 1080
    assert canvas.get("height") == 1920
    assert canvas.get("fps") == 30

    # Duration
    duration = data.get("duration", {})
    assert float(duration.get("min", 0)) >= 5.0
    assert float(duration.get("max", 0)) <= 20.0

    # Background (calm, light-first nature look)
    bg = data.get("background", {})
    assert "overlay_darkness" in bg
    assert float(bg["overlay_darkness"]) <= 0.35  # Must remain light-first, never harsh
    assert float(bg.get("grain", 0)) <= 0.10
    assert float(bg.get("vignette", 0)) <= 0.25
    assert bg.get("grade") in ("natural_warm", "natural", "cool_serene", "soft_mood")

    # Text
    text = data.get("text", {})
    assert "font" in text
    resolved_font = resolve_font_path(text["font"])
    assert Path(resolved_font).exists(), f"Font {text['font']} for {preset_name} could not be resolved!"
    assert text.get("align") == "center"
    assert int(text.get("max_lines", 0)) >= 3
    assert "fade_in" in text
    assert "stagger" in text

    # Hashtags
    hashtags = data.get("hashtags_base", [])
    assert isinstance(hashtags, list) and len(hashtags) >= 2


def test_get_available_styles() -> None:
    """Verify get_available_styles discovers the 3 presets."""
    styles = get_available_styles("styles")
    stems = [s.stem for s in styles]

    for expected in STYLE_PRESET_NAMES:
        assert expected in stems, f"Expected preset {expected} not discovered!"


def test_load_style_random() -> None:
    """Verify load_style('random') resolves to one of the available presets."""
    loaded = load_style("random")
    assert isinstance(loaded, dict)
    assert loaded.get("name") in STYLE_PRESET_NAMES


def test_batch_generate_rotates_random_styles(tmp_path: Path) -> None:
    """Verify that --style random rotates among the style presets across batch reels."""
    test_clip = tmp_path / "mock_bg.mp4"
    create_synthetic_video(test_clip, duration=10, width=1080, height=1920)

    class MockProvider(BackgroundProvider):
        def get_clip(self, mood: str, min_seconds: float) -> Path:
            return test_clip

    db_path = tmp_path / "test.db"
    conn = init_db(db_path)

    t1 = "The forest speaks in silence to those who listen carefully."
    t2 = "Morning sunlight filters through leaves like golden honey."
    t3 = "Still waters mirror the endless clouds passing overhead."

    q1_id = insert_quote(conn, text=t1, text_hash=compute_text_hash(t1), theme="nature", lang="en")
    q2_id = insert_quote(conn, text=t2, text_hash=compute_text_hash(t2), theme="hope", lang="en")
    q3_id = insert_quote(conn, text=t3, text_hash=compute_text_hash(t3), theme="calm", lang="en")

    quotes = [
        Quote(
            id=q1_id,
            text=t1,
            theme="nature",
            mood="forest",
            lang="en",
            caption="Listen to the trees.",
            hashtags=["#nature", "#peace", "#trees"],
        ),
        Quote(
            id=q2_id,
            text=t2,
            theme="hope",
            mood="morning",
            lang="en",
            caption="Sunlight in morning.",
            hashtags=["#sunlight", "#morning", "#hope"],
        ),
        Quote(
            id=q3_id,
            text=t3,
            theme="calm",
            mood="lake",
            lang="en",
            caption="Reflections on water.",
            hashtags=["#calm", "#reflection", "#water"],
        ),
    ]

    out_dir = tmp_path / "output"
    results = batch_generate_reels(
        count=3,
        theme="nature",
        lang="en",
        style_path="random",
        output_base_dir=out_dir,
        background_provider=MockProvider(),
        db_path=tmp_path / "test.db",
        quotes=quotes,
    )

    assert len(results) == 3
    for r in results:
        assert r["status"] == "ok", f"Reel failed: {r.get('reason')}"

    # Read the meta.json of each reel to verify rotating styles
    date_dirs = list(out_dir.glob("????-??-??"))
    assert len(date_dirs) == 1
    reel_dirs = sorted(date_dirs[0].glob("reel_*"))
    assert len(reel_dirs) == 3

    used_styles: list[str] = []
    import json
    for r_dir in reel_dirs:
        meta_file = r_dir / "meta.json"
        assert meta_file.exists()
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        used_styles.append(meta["style"])

    # Across 3 reels, 3 distinct presets should have been rotated from the available pool
    assert len(set(used_styles)) == 3
    all_styles = [p.stem for p in get_available_styles()]
    for s in used_styles:
        assert s in all_styles
