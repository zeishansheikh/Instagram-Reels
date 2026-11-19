"""Local folder background provider with clip usage rotation."""

from __future__ import annotations

from pathlib import Path


class LocalFolderBackgroundProvider:
    """Selects unused or least-recently-used clips from a local directory."""

    def __init__(self, folder: Path) -> None:
        self.folder = folder

    def get_clip(self, mood: str, min_seconds: float) -> Path:
        """Select a clip from local assets folder."""
        raise NotImplementedError("Phase 3 milestone: Local folder background provider.")

