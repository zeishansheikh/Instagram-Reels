"""D3 Content Formula quote generation in Roman Urdu per Section 2.1.

Rules:
- Roman Urdu, SAD DEEP Gen Z-style lines, 2–3 lines.
- NO poet/author name anywhere (no '- Name', no attribution).
- Themes: loss, yaadein, waqt, tanhai, dard, hope-in-sadness.
- Never repeat a used line (check used_lines in workflow_state.json).
- Forbidden: em-dash '—', colons ':', single-quotes '''.
- Caption: the lines themselves + exactly 3 hashtags.
"""

from __future__ import annotations

import json
import os
import random
from typing import List, Optional, Tuple
from loguru import logger
from google import genai
from pydantic import BaseModel, Field

from instora.pipeline.workflow_state import WorkflowState

D3_THEMES = ["loss", "yaadein", "waqt", "tanhai", "dard", "hope-in-sadness"]

D3_PROMPT_TEMPLATE = """You write short, sad, emotional, Gen Z-style lines in ROMAN URDU for Instagram reels.
Tone: deeply emotional, quiet, heartbreak, reflective, heavy-hearted.
Themes: {theme}.

STRICT RULES:
1. Language: Roman Urdu (Urdu written in the English alphabet, very natural and colloquial).
2. Length: Exactly 2 to 3 short lines. Short enough to read in a single glance.
3. FORBIDDEN:
   - NEVER include poet or author names (no "- Jaun Elia", no "- Faiz", no names at all).
   - NEVER use em-dashes ("—"). Use regular hyphens or commas if needed.
   - NEVER use colons (":") or single-quotes ("'"). Reword to avoid them completely.
   - NO emojis anywhere in the quote text.
4. Each quote must be completely unique, shareable, and story-worthy.
5. Provide exactly 3 sad hashtags matching the theme (e.g. ["#sad", "#yaadein", "#tanhai"]).

Return a JSON array of {count} items formatted as:
[
  {{
    "lines": ["first line", "second line"],
    "theme": "{theme}",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  }}
]

Avoid these previously used lines:
{used_lines_block}
"""

# High-quality offline fallbacks if Gemini API is unavailable or returns quota error
OFFLINE_D3_LINE_BANK = [
    {
        "lines": ["sab kehte hain waqt sab theek kar deta hai,", "mera waqt to bas yaadein de gaya."],
        "theme": "waqt",
        "hashtags": ["#sad", "#waqt", "#yaadein"],
    },
    {
        "lines": ["sab kehte hain akela rehna buri baat hai,", "par bheed mein bhi to main akela hi tha."],
        "theme": "tanhai",
        "hashtags": ["#tanhai", "#sad", "#dard"],
    },
    {
        "lines": ["kuch baatein dil mein hi achi lagti hain,", "zuban par aate hi rishtey tod deti hain."],
        "theme": "dard",
        "hashtags": ["#dard", "#khamoshi", "#alfaaz"],
    },
    {
        "lines": ["woh jo kabhi jaan hua karte the,", "aaj unka naam lene par bhi khamoshi cha jati hai."],
        "theme": "loss",
        "hashtags": ["#loss", "#yaadein", "#sad"],
    },
    {
        "lines": ["raat gehri ho to yaadein cheekhti hain,", "din ke ujalon mein hum muskura kar thak jaate hain."],
        "theme": "yaadein",
        "hashtags": ["#yaadein", "#raatein", "#dard"],
    },
    {
        "lines": ["toote huye dil ke tukde sambhalte nahi,", "aur log puchte hain tum badal kyu gaye."],
        "theme": "hope-in-sadness",
        "hashtags": ["#sad", "#dard", "#tanhai"],
    },
]


def clean_d3_line(text: str) -> str:
    """Strip forbidden characters from a line per Section 2.1."""
    text = text.replace("—", " - ")
    text = text.replace(":", " ")
    text = text.replace("'", "")
    text = text.replace('"', '')
    return " ".join(text.strip().split())


def format_d3_caption(lines: List[str], hashtags: Optional[List[str]] = None) -> str:
    """Format caption: the lines themselves, blank line, exactly 3 hashtags. No attribution."""
    clean_lines = [clean_d3_line(l) for l in lines if l.strip()]
    lines_str = "\n".join(clean_lines)

    tags = hashtags or ["#sad", "#dard", "#tanhai"]
    # Ensure exactly 3 hashtags
    formatted_tags = []
    for t in tags[:3]:
        t = t.strip()
        if not t.startswith("#"):
            t = f"#{t}"
        formatted_tags.append(t)

    while len(formatted_tags) < 3:
        formatted_tags.append("#sad")

    tags_str = " ".join(formatted_tags)
    return f"{lines_str}\n\n{tags_str}"


def generate_d3_quote(
    theme: Optional[str] = None,
    slot: str = "a",
    state: Optional[WorkflowState] = None,
) -> Tuple[List[str], str, List[str]]:
    """Generate fresh D3 Roman Urdu lines, ensuring no repeats against used_lines.

    Returns:
        Tuple of (lines: list[str], theme: str, hashtags: list[str]).
    """
    workflow_state = state or WorkflowState.load()

    # Pick theme
    if not theme:
        # Rotate themes between slots so slot A and slot B don't repeat themes
        available_themes = [t for t in D3_THEMES if t != workflow_state.last_category]
        if not available_themes:
            available_themes = D3_THEMES
        theme = random.choice(available_themes)

    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            from instora.config import load_config
            cfg = load_config()
            target_model = os.getenv("GEMINI_MODEL") or cfg.gemini.model or "gemini-3.8-flash"

            client = genai.Client(api_key=api_key)
            recent_used = workflow_state.used_lines[-20:] if workflow_state.used_lines else []
            used_block = "\n".join(f"- {l}" for l in recent_used) if recent_used else "(None)"

            prompt = D3_PROMPT_TEMPLATE.format(
                theme=theme,
                count=5,
                used_lines_block=used_block,
            )

            response = client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=dict(
                    response_mime_type="application/json",
                    temperature=0.75,
                ),
            )

            raw_text = response.text.strip()
            data = json.loads(raw_text)
            if isinstance(data, list):
                for item in data:
                    raw_lines = item.get("lines", [])
                    cleaned = [clean_d3_line(l) for l in raw_lines if l.strip()]
                    full_text = " / ".join(cleaned)
                    if 2 <= len(cleaned) <= 3 and not workflow_state.is_line_used(full_text):
                        tags = item.get("hashtags", ["#sad", "#dard", "#tanhai"])[:3]
                        return cleaned, theme, tags
        except Exception as exc:
            logger.warning(f"Gemini API quote generation failed or quota exceeded: {exc}. Falling back to curated bank.")

    # Fallback to curated offline bank, filtering out used lines
    for item in OFFLINE_D3_LINE_BANK:
        full_text = " / ".join(item["lines"])
        if not workflow_state.is_line_used(full_text):
            return item["lines"], item["theme"], item["hashtags"]

    # If all curated are used, generate a fresh variation
    fallback = OFFLINE_D3_LINE_BANK[0]
    return fallback["lines"], fallback["theme"], fallback["hashtags"]

