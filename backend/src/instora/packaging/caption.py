"""Caption formatting with base hashtags, theme tags, and one-line commentary."""

from __future__ import annotations

from typing import List, Optional


def format_caption(
    caption: str,
    theme: str,
    hashtags_base: Optional[list[str]] = None,
    extra_hashtags: Optional[list[str]] = None,
) -> str:
    """Format an Instagram post caption with quote thought, base hashtags, and theme tag.

    Args:
        caption: Reflective one-line commentary or thought.
        theme: Quote theme string (e.g. hope, solitude).
        hashtags_base: Base hashtags configured in style (e.g. #nature, #positivity).
        extra_hashtags: Optional additional hashtags from quote metadata.

    Returns:
        Cleanly formatted caption string ready for Instagram.
    """
    clean_caption = caption.strip()

    # Normalize theme tag
    clean_theme = "".join(ch for ch in theme.lower() if ch.isalnum())
    theme_tag = f"#{clean_theme}" if clean_theme else ""

    # Assemble and deduplicate hashtags preserving order
    base_tags = hashtags_base or ["#nature", "#positivity", "#naturetherapy"]
    quote_tags = extra_hashtags or []

    combined_tags: list[str] = []
    seen: set[str] = set()

    for tag in base_tags + quote_tags + ([theme_tag] if theme_tag else []):
        t = tag.strip()
        if not t:
            continue
        if not t.startswith("#"):
            t = f"#{t}"
        t_lower = t.lower()
        if t_lower not in seen:
            seen.add(t_lower)
            combined_tags.append(t)

    tags_str = " ".join(combined_tags)
    if clean_caption:
        return f"{clean_caption}\n\n{tags_str}"
    return tags_str
