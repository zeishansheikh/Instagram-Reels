"""Configuration loader and environment validation for Reel Forge."""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Any, Optional

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load environment variables from .env file
load_dotenv()


class AppMetaConfig(BaseModel):
    """Metadata for Reel Forge application."""

    name: str = "Reel Forge"
    version: str = "0.1.0"


class GeminiConfig(BaseModel):
    """Configuration for Gemini API integration."""

    model: str = "gemini-2.5-flash"
    temperature: float = 0.7
    api_key: Optional[str] = Field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY")
    )


class PathsConfig(BaseModel):
    """Directory and file paths for assets and outputs."""

    assets_dir: Path = Path("assets")
    backgrounds_dir: Path = Path("assets/backgrounds")
    music_dir: Path = Path("assets/music")
    fonts_dir: Path = Path("assets/fonts")
    cache_dir: Path = Path("cache")
    output_dir: Path = Path("output")
    styles_dir: Path = Path("styles")
    db_path: Path = Path("db/reelforge.db")


class DefaultsConfig(BaseModel):
    """Default runtime parameters for generation."""

    theme: str = "reflective"
    lang: str = "en"
    count: int = 10
    style: str = "default"
    background_provider: str = "local_folder"
    clip_reuse_cooldown: int = 10


class CanvasConfig(BaseModel):
    """Video canvas resolution and frame rate."""

    width: int = 1080
    height: int = 1920
    fps: int = 30


class RenderConfig(BaseModel):
    """FFmpeg encoding parameters."""

    crf: int = 20
    preset: str = "medium"
    min_duration: float = 7.0
    max_duration: float = 12.0
    words_per_second: float = 2.2


class AppConfig(BaseModel):
    """Root configuration model combining all settings."""

    app: AppMetaConfig = Field(default_factory=AppMetaConfig)
    gemini: GeminiConfig = Field(default_factory=GeminiConfig)
    paths: PathsConfig = Field(default_factory=PathsConfig)
    defaults: DefaultsConfig = Field(default_factory=DefaultsConfig)
    canvas: CanvasConfig = Field(default_factory=CanvasConfig)
    render: RenderConfig = Field(default_factory=RenderConfig)


def load_config(config_path: Path | str = "config.yaml") -> AppConfig:
    """Load configuration from a YAML file and environment variables.

    Args:
        config_path: Path to config.yaml file.

    Returns:
        AppConfig populated with settings.
    """
    path = Path(config_path)
    data: dict[str, Any] = {}
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, dict):
                data = loaded

    config = AppConfig(**data)
    # Ensure GEMINI_API_KEY from environment is populated if not explicitly in YAML
    if not config.gemini.api_key:
        config.gemini.api_key = os.getenv("GEMINI_API_KEY")

    return config


def check_environment(require_gemini: bool = True) -> None:
    """Perform startup checks for system dependencies and required secrets.

    Fails with a clean message and exit code 1 if requirements are unmet.

    Args:
        require_gemini: Whether to validate presence of GEMINI_API_KEY.
    """
    errors: list[str] = []

    # 1. Check for FFmpeg in system PATH
    if shutil.which("ffmpeg") is None:
        errors.append(
            "❌ FFmpeg is missing from PATH.\n"
            "   Please install FFmpeg on your system:\n"
            "   - Ubuntu/Debian: sudo apt install ffmpeg\n"
            "   - macOS: brew install ffmpeg\n"
            "   - Windows: winget install Gyan.FFmpeg"
        )

    # 2. Check for GEMINI_API_KEY
    if require_gemini:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key or gemini_key.strip() == "" or "your_gemini_api_key_here" in gemini_key:
            errors.append(
                "❌ GEMINI_API_KEY is missing or unset.\n"
                "   Please configure GEMINI_API_KEY in your .env file or environment variables.\n"
                "   Get a key from https://aistudio.google.com/"
            )

    if errors:
        print("\nStartup validation failed:\n", file=sys.stderr)
        for err in errors:
            print(f"{err}\n", file=sys.stderr)
        sys.exit(1)

