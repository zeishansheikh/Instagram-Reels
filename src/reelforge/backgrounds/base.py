"""Protocol interface for pluggable background video providers."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol


class BackgroundProvider(Protocol):
    """Interface required for all background video sources."""

    def get_clip(self, mood: str, min_seconds: float) -> Path:
        """Fetch or select a suitable video clip for the given mood and duration.

        Args:
            mood: Mood keyword (e.g. lake, mountain, sunset).
            min_seconds: Minimum clip duration required.

        Returns:
            Path: Local filesystem path to the selected video file.
        """
        ...

