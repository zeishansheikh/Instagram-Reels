"""Workflow state management for Reel Pipeline (Formula D3).

Tracks used pins, lines, songs, reels, and previous run picks per the spec.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from loguru import logger
from pydantic import BaseModel, Field


class WorkflowState(BaseModel):
    """Schema for swap/workflow_state.json."""

    used_pins: List[str] = Field(default_factory=list)
    used_lines: List[str] = Field(default_factory=list)
    used_songs: List[Dict[str, Any]] = Field(default_factory=list)
    used_reels: List[str] = Field(default_factory=list)
    last_category: Optional[str] = None
    last_song: Optional[str] = None
    last_quote: Optional[str] = None
    last_run: Optional[str] = None

    @classmethod
    def resolve_state_path(cls, custom_path: Optional[Path | str] = None) -> Path:
        """Resolve state file path from custom argument, workspace, or project swap dir."""
        if custom_path:
            p = Path(custom_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            return p

        # Check workspace swap dir
        workspace_swap = Path.home() / "workspace" / "clip-tool" / "swap" / "workflow_state.json"
        if workspace_swap.exists():
            return workspace_swap

        # Default to local swap dir
        local_swap = Path("swap/workflow_state.json")
        local_swap.parent.mkdir(parents=True, exist_ok=True)
        return local_swap

    @classmethod
    def load(cls, path: Optional[Path | str] = None) -> WorkflowState:
        """Load state from json file, creating defaults if missing."""
        state_path = cls.resolve_state_path(path)
        if not state_path.exists():
            state = cls()
            state.save(state_path)
            return state

        try:
            with open(state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return cls(**data)
        except Exception as exc:
            logger.warning(f"Error loading workflow state from {state_path}: {exc}. Using empty state.")
            return cls()

    def save(self, path: Optional[Path | str] = None) -> Path:
        """Persist state to JSON file."""
        state_path = self.resolve_state_path(path)
        state_path.parent.mkdir(parents=True, exist_ok=True)
        with open(state_path, "w", encoding="utf-8") as f:
            json.dump(self.model_dump(), f, indent=2, ensure_ascii=False)
        return state_path

    def is_pin_used(self, pin_id: str | int) -> bool:
        """Check if a Pinterest pin ID has ever been used."""
        return str(pin_id).strip() in set(str(p).strip() for p in self.used_pins)

    def is_line_used(self, line: str) -> bool:
        """Check if quote lines have ever been used."""
        norm = " ".join(line.lower().strip().split())
        for used in self.used_lines:
            if " ".join(used.lower().strip().split()) == norm:
                return True
        return False

    def is_song_used(self, song_title: str) -> bool:
        """Check if a song has already been used."""
        norm = " ".join(song_title.lower().strip().split())
        for entry in self.used_songs:
            entry_song = entry.get("song", "")
            if norm in entry_song.lower() or entry_song.lower() in norm:
                return True
        return False

    def record_pin(self, pin_id: str | int) -> None:
        p_str = str(pin_id).strip()
        if p_str not in self.used_pins:
            self.used_pins.append(p_str)
        reel_tag = f"PIN:{p_str}"
        if reel_tag not in self.used_reels:
            self.used_reels.append(reel_tag)

    def record_line(self, line: str) -> None:
        clean = line.strip()
        if clean and clean not in self.used_lines:
            self.used_lines.append(clean)

    def record_song(self, song_title: str, date_str: str) -> None:
        clean = song_title.strip()
        if clean:
            self.used_songs.append({"song": clean, "date": date_str})

    def record_build(
        self,
        category: str,
        song: str,
        quote: str,
        run_tag: str,
        pin_id: Optional[str | int] = None,
        date_str: Optional[str] = None,
    ) -> None:
        """Record all elements of a completed build."""
        self.last_category = category
        self.last_song = song
        self.last_quote = quote
        self.last_run = run_tag
        if pin_id:
            self.record_pin(pin_id)
        if quote:
            self.record_line(quote)
        if song and date_str:
            self.record_song(song, date_str)

