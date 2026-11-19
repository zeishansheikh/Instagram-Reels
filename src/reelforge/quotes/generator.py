"""Gemini API quote generator with structured JSON output, Pydantic validation, and SQLite persistence."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List, Optional

from google import genai
from google.genai import types
from loguru import logger
from pydantic import BaseModel, Field, ValidationError, field_validator

from reelforge.config import load_config
from reelforge.db import get_all_stored_quotes, get_recent_quotes, init_db, insert_quote
from reelforge.quotes.dedupe import compute_text_hash, is_duplicate
from reelforge.quotes.prompts import ALLOWED_MOODS, build_quote_prompt


@dataclass
class Quote:
    """Structured representation of a validated quote."""

    text: str
    mood: str
    theme: str
    caption: str
    hashtags: list[str]
    lang: str
    id: Optional[int] = None


class QuoteItemSchema(BaseModel):
    """Pydantic schema for validating Gemini structured JSON output."""

    text: str
    mood: str
    theme: str
    caption: str
    hashtags: list[str]

    @field_validator("mood")
    @classmethod
    def validate_mood(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ALLOWED_MOODS:
            raise ValueError(f"Mood '{v}' not in allowed list: {ALLOWED_MOODS}")
        return clean

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        words = v.strip().split()
        if not (10 <= len(words) <= 25):
            raise ValueError(f"Quote text must be 10-25 words (found {len(words)} words).")
        lines = [line for line in v.split("\n") if line.strip()]
        if len(lines) > 4:
            raise ValueError(f"Quote exceeds 4 lines (found {len(lines)} lines).")
        return " ".join(words)

    @field_validator("hashtags")
    @classmethod
    def validate_hashtags(cls, v: list[str]) -> list[str]:
        if len(v) != 3:
            raise ValueError(f"Expected exactly 3 hashtags, got {len(v)}.")
        cleaned: list[str] = []
        for tag in v:
            t = tag.strip()
            if not t.startswith("#"):
                t = "#" + t
            cleaned.append(t)
        return cleaned


def parse_and_validate_quotes_json(raw_json: str) -> list[QuoteItemSchema]:
    """Parse raw JSON string and validate against QuoteItemSchema.

    Args:
        raw_json: JSON string returned from Gemini.

    Returns:
        List of validated QuoteItemSchema objects.
    """
    clean_json = raw_json.strip()
    if clean_json.startswith("```json"):
        clean_json = clean_json[7:]
    if clean_json.startswith("```"):
        clean_json = clean_json[3:]
    if clean_json.endswith("```"):
        clean_json = clean_json[:-3]
    clean_json = clean_json.strip()

    data = json.loads(clean_json)
    if not isinstance(data, list):
        raise ValueError(f"Expected a JSON list of objects, got {type(data).__name__}")

    valid_items: list[QuoteItemSchema] = []
    for idx, item in enumerate(data):
        try:
            valid_items.append(QuoteItemSchema(**item))
        except (ValidationError, TypeError) as e:
            logger.warning(f"Discarding invalid quote at index {idx}: {e}")

    return valid_items


def generate_quotes(
    theme: str = "hope",
    lang: str = "en",
    count: int = 10,
    db_path: Path | str = "db/reelforge.db",
    max_retries: int = 3,
    client: Optional[genai.Client] = None,
) -> list[Quote]:
    """Call Google Gemini to generate structured quote objects, deduplicate, and persist.

    Args:
        theme: Quote subject / theme.
        lang: Target language code ('en', 'roman-urdu', 'urdu').
        count: Target number of quotes to return.
        db_path: Path to SQLite database.
        max_retries: Number of retry attempts on failure with backoff.
        client: Optional pre-configured genai.Client (useful for testing and dependency injection).

    Returns:
        List of accepted, deduplicated, and stored Quote objects.
    """
    config = load_config()
    model_name = config.gemini.model
    api_key = config.gemini.api_key

    # Initialize SQLite database
    conn = init_db(db_path)
    stored_quotes = get_all_stored_quotes(conn)
    recent_quotes = get_recent_quotes(conn, limit=20)

    # Initialize Gemini client if not injected
    if client is None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in .env or environment.")
        client = genai.Client(api_key=api_key)

    accepted_quotes: list[Quote] = []
    all_seen_texts = list(stored_quotes)

    attempts = 0
    while len(accepted_quotes) < count and attempts < max_retries:
        attempts += 1
        needed = count - len(accepted_quotes)
        # Ask for slightly more to compensate for validation / dedupe filtering
        request_count = max(needed, 5)

        prompt = build_quote_prompt(
            theme=theme,
            lang=lang,
            count=request_count,
            recent_quotes=recent_quotes + [q.text for q in accepted_quotes],
        )

        logger.info(
            f"Calling Gemini model '{model_name}' for {request_count} quotes (attempt {attempts}/{max_retries})..."
        )

        raw_response_text: Optional[str] = None
        for api_try in range(1, 4):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=config.gemini.temperature,
                    ),
                )
                raw_response_text = response.text
                if raw_response_text:
                    break
            except Exception as exc:
                logger.warning(f"Gemini API attempt {api_try} failed: {exc}")
                if api_try == 3:
                    break
                time.sleep(2 ** api_try)

        if not raw_response_text:
            logger.error("Empty or failed response from Gemini API.")
            continue

        try:
            validated_items = parse_and_validate_quotes_json(raw_response_text)
        except Exception as parse_err:
            logger.warning(f"Failed to parse JSON response: {parse_err}")
            time.sleep(2)
            continue

        for item in validated_items:
            # Check deduplication against DB and batch
            is_dup, match = is_duplicate(item.text, all_seen_texts, similarity_threshold=0.70)
            if is_dup:
                logger.info(f"Rejected duplicate quote: '{item.text}' (matched: '{match}')")
                continue

            # Compute hash and store in DB
            text_hash = compute_text_hash(item.text)
            try:
                quote_id = insert_quote(
                    conn=conn,
                    text=item.text,
                    text_hash=text_hash,
                    theme=theme,
                    lang=lang,
                )
            except Exception as db_err:
                logger.warning(f"Failed to insert quote into DB: {db_err}")
                continue

            quote_obj = Quote(
                id=quote_id,
                text=item.text,
                mood=item.mood,
                theme=item.theme,
                caption=item.caption,
                hashtags=item.hashtags,
                lang=lang,
            )
            accepted_quotes.append(quote_obj)
            all_seen_texts.append(item.text)

            if len(accepted_quotes) >= count:
                break

    logger.info(f"Successfully generated and stored {len(accepted_quotes)} quotes.")
    return accepted_quotes
