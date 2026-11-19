"""Quote deduplication, hashing, and similarity checking against SQLite records."""

from __future__ import annotations

import difflib
import hashlib
from typing import Optional


def normalize_text(text: str) -> str:
    """Normalize text by lowering case, stripping punctuation, and collapsing whitespace."""
    cleaned = "".join(ch for ch in text.lower() if ch.isalnum() or ch.isspace())
    return " ".join(cleaned.split())


def compute_text_hash(text: str) -> str:
    """Compute SHA-256 hash of normalized text for exact matching."""
    norm = normalize_text(text)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def calculate_similarity(text_a: str, text_b: str) -> float:
    """Compute combined string and token similarity between two texts (0.0 to 1.0).

    Uses difflib SequenceMatcher ratio combined with word-level Jaccard overlap.
    """
    norm_a = normalize_text(text_a)
    norm_b = normalize_text(text_b)

    if not norm_a or not norm_b:
        return 0.0

    if norm_a == norm_b:
        return 1.0

    # 1. SequenceMatcher ratio
    seq_ratio = difflib.SequenceMatcher(None, norm_a, norm_b).ratio()

    # 2. Token Jaccard similarity
    tokens_a = set(norm_a.split())
    tokens_b = set(norm_b.split())
    union = tokens_a | tokens_b
    jaccard = len(tokens_a & tokens_b) / len(union) if union else 0.0

    # Weighted composite score
    return (seq_ratio * 0.6) + (jaccard * 0.4)


def is_duplicate(
    candidate: str,
    existing_quotes: list[str],
    similarity_threshold: float = 0.70,
) -> tuple[bool, Optional[str]]:
    """Determine if a candidate quote is an exact or near duplicate of any existing quote.

    Args:
        candidate: New quote string to test.
        existing_quotes: Collection of previously accepted quotes.
        similarity_threshold: Cutoff score above which a quote is rejected as near-duplicate.

    Returns:
        Tuple of (is_duplicate: bool, matching_quote: Optional[str]).
    """
    cand_hash = compute_text_hash(candidate)

    for existing in existing_quotes:
        # Check exact normalized hash match
        if compute_text_hash(existing) == cand_hash:
            return True, existing

        # Check semantic / structural similarity
        sim = calculate_similarity(candidate, existing)
        if sim >= similarity_threshold:
            return True, existing

    return False, None
