"""Pexels API background provider with caching and keyword search."""

from __future__ import annotations

from pathlib import Path


class PexelsBackgroundProvider:
    """Fetches high-aesthetic nature clips via Pexels API."""

    def __init__(self, api_key: str, cache_dir: Path) -> None:
        self.api_key = api_key
        self.cache_dir = cache_dir

    def get_clip(self, mood: str, min_seconds: float) -> Path:
        """Download or retrieve cached clip matching mood."""
        raise NotImplementedError("Phase 3 milestone: Pexels background provider.")

