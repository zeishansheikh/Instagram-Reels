"""Prompt templates, language descriptions, and few-shot formatting for Gemini quote generation."""

from __future__ import annotations

LANGUAGE_MAP: dict[str, str] = {
    "en": "English",
    "roman-urdu": "Roman Urdu (Urdu written in Latin alphabet, emotional and natural)",
    "roman_urdu": "Roman Urdu (Urdu written in Latin alphabet, emotional and natural)",
    "urdu": "Urdu (written in authentic Nastaliq/Urdu script)",
}

ALLOWED_MOODS: list[str] = [
    "lake",
    "mountain",
    "sunset",
    "forest",
    "snow",
    "ocean",
    "sky",
]

QUOTE_PROMPT_TEMPLATE = """You write short reflective lines for nature reels on Instagram.
Tone: warm, personal, hopeful, quiet. Written like one person talking to another.
Themes: {theme}. Language: {lang_desc}.
Rules:
- 10 to 25 words, displayed as max 4 short lines
- Concrete and emotionally honest, not cliche motivational-poster language
- No emojis or hashtags inside the quote
- Every quote must differ in structure and opening words
- Do not imitate or reuse any known viral quote
- Give: mood keyword (must be exactly one of: {allowed_moods}), a one-line caption, and exactly 3 hashtags

Return a JSON array of {count} objects:
[
  {{
    "text": "...",
    "mood": "...",
    "theme": "{theme}",
    "caption": "...",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  }}
]

Avoid these recent quotes:
{recent_quotes_formatted}
"""


def build_quote_prompt(
    theme: str,
    lang: str = "en",
    count: int = 10,
    recent_quotes: list[str] | None = None,
) -> str:
    """Build a formatted prompt string for Gemini API.

    Args:
        theme: Quote theme (e.g. hope, solitude, gratitude).
        lang: Language identifier (en, roman-urdu, urdu).
        count: Number of quotes requested.
        recent_quotes: List of recent quote texts to avoid duplicating.

    Returns:
        Formatted prompt ready for model consumption.
    """
    lang_key = lang.lower().strip()
    lang_desc = LANGUAGE_MAP.get(lang_key, LANGUAGE_MAP.get(lang_key.replace("-", "_"), "English"))

    allowed_moods_str = ", ".join(ALLOWED_MOODS)

    if recent_quotes:
        recent_quotes_formatted = "\n".join(f"- {q}" for q in recent_quotes[:20])
    else:
        recent_quotes_formatted = "(None yet)"

    return QUOTE_PROMPT_TEMPLATE.format(
        theme=theme,
        lang_desc=lang_desc,
        allowed_moods=allowed_moods_str,
        count=count,
        recent_quotes_formatted=recent_quotes_formatted,
    )
