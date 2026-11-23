"""Background provider protocol interface for Instora."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable


@runtime_checkable
class BackgroundProvider(Protocol):
    """Protocol defining the interface for all video background providers."""

    def get_clip(self, mood: str, min_seconds: float) -> Path:
        """Fetch or select a suitable video clip for the given mood and duration.

        Args:
            mood: Mood keyword (e.g. lake, mountain, sunset, forest).
            min_seconds: Target minimum clip duration in seconds.

        Returns:
            Path: Local filesystem path to the selected video file.
        """
        ...
