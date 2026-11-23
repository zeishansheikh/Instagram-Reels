"""Tests for quotes generator, prompts, deduplication, and SQLite database persistence."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from instora.db import (
    get_all_stored_quotes,
    get_recent_quotes,
    init_db,
    insert_quote,
    is_quote_hash_exists,
)
from instora.quotes.dedupe import (
    calculate_similarity,
    compute_text_hash,
    is_duplicate,
    normalize_text,
)
from instora.quotes.generator import (
    Quote,
    QuoteItemSchema,
    generate_quotes,
    parse_and_validate_quotes_json,
)
from instora.quotes.prompts import ALLOWED_MOODS, LANGUAGE_MAP, build_quote_prompt


def test_sqlite_db_tables(tmp_path: Path) -> None:
    """Verify SQLite database table schemas and basic operations."""
    db_file = tmp_path / "test_instora.db"
    conn = init_db(db_file)

    # Check table existence
    tables = [
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    ]
    assert "quotes" in tables
    assert "clips" in tables
    assert "reels" in tables

    # Insert quote and test retrieval
    text = "The mountain stands patient, reminding us that time heals all wounds quietly."
    text_hash = compute_text_hash(text)
    qid = insert_quote(conn, text=text, text_hash=text_hash, theme="hope", lang="en")
    assert qid > 0

    assert is_quote_hash_exists(conn, text_hash)
    assert not is_quote_hash_exists(conn, "nonexistent_hash")

    stored = get_all_stored_quotes(conn)
    assert len(stored) == 1
    assert stored[0] == text

    recent = get_recent_quotes(conn, limit=10)
    assert len(recent) == 1
    assert recent[0] == text


def test_deduplication_and_similarity() -> None:
    """Verify exact hashing and fuzzy similarity rejection."""
    original = "Still waters reflect the heavens, reminding the soul to find quiet peace."
    exact_clone = "still waters reflect the heavens, reminding the soul to find quiet peace."
    near_variant = "Still waters reflect the heavens, reminding our soul to find quiet peace."
    completely_different = "High above the clouds, snowy peaks catch the first golden morning light."

    # Normalized text
    assert normalize_text("Hello, World! 123") == "hello world 123"

    # Exact hash match
    assert compute_text_hash(original) == compute_text_hash(exact_clone)

    # Exact duplicate detection
    is_dup, match = is_duplicate(exact_clone, [original])
    assert is_dup
    assert match == original

    # Near duplicate detection
    is_dup, match = is_duplicate(near_variant, [original], similarity_threshold=0.70)
    assert is_dup
    assert match == original

    # Distinct quote accepted
    is_dup, match = is_duplicate(completely_different, [original], similarity_threshold=0.70)
    assert not is_dup
    assert match is None


def test_prompt_generation() -> None:
    """Validate prompt building with language mapping and allowed moods."""
    prompt_en = build_quote_prompt(theme="hope", lang="en", count=5, recent_quotes=["Old quote 1"])
    assert "Themes: hope" in prompt_en
    assert "Language: English" in prompt_en
    assert "Old quote 1" in prompt_en
    for mood in ALLOWED_MOODS:
        assert mood in prompt_en

    prompt_roman = build_quote_prompt(theme="solitude", lang="roman-urdu")
    assert "Roman Urdu" in prompt_roman

    prompt_urdu = build_quote_prompt(theme="patience", lang="urdu")
    assert "Urdu" in prompt_urdu


def test_pydantic_quote_validation() -> None:
    """Validate Pydantic schema constraints (10-25 words, allowed moods, 3 hashtags)."""
    valid_data = {
        "text": "Every sunset carries the promise of a quiet dawn for weary hearts seeking stillness.",
        "mood": "sunset",
        "theme": "hope",
        "caption": "Watching the light fade gently. ✨",
        "hashtags": ["#nature", "#positivity", "#hope"],
    }
    item = QuoteItemSchema(**valid_data)
    assert item.mood == "sunset"
    assert len(item.hashtags) == 3

    # Invalid mood
    with pytest.raises(Exception):
        QuoteItemSchema(**{**valid_data, "mood": "invalid_mood"})

    # Too few words (< 10 words)
    with pytest.raises(Exception):
        QuoteItemSchema(**{**valid_data, "text": "Too short quote here."})

    # Too many words (> 25 words)
    with pytest.raises(Exception):
        QuoteItemSchema(**{**valid_data, "text": "word " * 26})

    # Invalid hashtag count
    with pytest.raises(Exception):
        QuoteItemSchema(**{**valid_data, "hashtags": ["#one", "#two"]})


def test_generate_quotes_mocked_gemini(tmp_path: Path) -> None:
    """Test full quote generation flow with mocked Gemini client."""
    db_file = tmp_path / "mock_instora.db"

    mock_client = MagicMock()
    mock_response = MagicMock()

    sample_quotes_payload = [
        {
            "text": "The quiet forest knows the secret of breathing slowly when everything else rushes.",
            "mood": "forest",
            "theme": "peace",
            "caption": "Find your breath in the trees. ✨",
            "hashtags": ["#nature", "#peace", "#forest"],
        },
        {
            "text": "High above the clouds the morning sun reminds us that shadows never last forever.",
            "mood": "mountain",
            "theme": "hope",
            "caption": "Morning alpenglow. ✨",
            "hashtags": ["#mountains", "#sunrise", "#naturetherapy"],
        },
        # Duplicate that should be rejected in same batch
        {
            "text": "The quiet forest knows the secret of breathing slowly when everything else rushes.",
            "mood": "forest",
            "theme": "peace",
            "caption": "Duplicate caption.",
            "hashtags": ["#nature", "#peace", "#forest"],
        },
        # Invalid item (too short) that should be filtered out
        {
            "text": "Short line.",
            "mood": "ocean",
            "theme": "calm",
            "caption": "Short.",
            "hashtags": ["#sea", "#blue", "#calm"],
        },
    ]

    mock_response.text = json.dumps(sample_quotes_payload)
    mock_client.models.generate_content.return_value = mock_response

    quotes = generate_quotes(
        theme="peace",
        lang="en",
        count=2,
        db_path=db_file,
        client=mock_client,
    )

    assert len(quotes) == 2
    assert quotes[0].mood == "forest"
    assert quotes[1].mood == "mountain"

    # Verify they were persisted to SQLite DB
    conn = init_db(db_file)
    stored = get_all_stored_quotes(conn)
    assert len(stored) == 2
    assert quotes[0].text in stored
    assert quotes[1].text in stored

