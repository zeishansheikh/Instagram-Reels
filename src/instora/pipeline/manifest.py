"""Manifest generator and validator for ready-to-post reels.

Follows Section 6 of the D3 spec:
{"date":"YYYY-MM-DD","slot":"a","video_path":"<abs path>","caption":"<text>","hashtags":["#a","#b","#c"],"song":"<song name>","quote":"<quote>","drive_backup":{"id":"<file id>"}}
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from loguru import logger
from pydantic import BaseModel, Field


class ReelManifest(BaseModel):
    """Manifest file schema (manifest_a.json / manifest_b.json)."""

    date: str  # YYYY-MM-DD
    slot: str  # "a" or "b"
    video_path: str
    caption: str
    hashtags: List[str] = Field(default_factory=list)
    song: str
    quote: str
    drive_backup: Optional[Dict[str, Any]] = None

    def save(self, destination_dir: Path | str) -> Path:
        """Write manifest file manifest_<slot>.json to destination dir."""
        dest = Path(destination_dir)
        dest.mkdir(parents=True, exist_ok=True)
        manifest_file = dest / f"manifest_{self.slot.lower()}.json"
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(self.model_dump(), f, indent=2, ensure_ascii=False)
        logger.info(f"Saved manifest for slot {self.slot} to {manifest_file}")
        return manifest_file

    @classmethod
    def load(cls, slot: str, directory: Path | str = "swap/ready_to_post") -> Optional[ReelManifest]:
        """Load manifest_<slot>.json from directory."""
        dir_path = Path(directory)
        manifest_file = dir_path / f"manifest_{slot.lower()}.json"
        if not manifest_file.exists():
            return None

        try:
            with open(manifest_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return cls(**data)
        except Exception as exc:
            logger.error(f"Error parsing manifest {manifest_file}: {exc}")
            return None

    def validate_for_post(self, expected_date: Optional[str] = None) -> tuple[bool, str]:
        """Verify that manifest is ready for posting according to Section 6 rules.

        Checks:
        - Date matches target date (if supplied)
        - Video file exists on disk
        - Video file size > 1MB
        - Caption has content and hashtags
        """
        if expected_date and self.date != expected_date:
            return False, f"Manifest date '{self.date}' does not match target date '{expected_date}'."

        p = Path(self.video_path)
        if not p.exists():
            return False, f"Video file specified in manifest does not exist: {self.video_path}"

        if p.stat().st_size < 50 * 1024:
            return False, f"Video file is suspiciously small ({p.stat().st_size} bytes)."

        if not self.caption or not self.caption.strip():
            return False, "Caption in manifest is empty."

        if not self.hashtags or len(self.hashtags) != 3:
            return False, f"Expected exactly 3 hashtags per D3 formula, got {len(self.hashtags)}."

        return True, "Manifest is valid and ready for posting."

