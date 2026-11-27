"""Background video providers for Instora."""

from __future__ import annotations

from typing import Optional

from instora.backgrounds.base import BackgroundProvider
from instora.backgrounds.gdrive import GDriveBackgroundProvider
from instora.backgrounds.local_folder import LocalFolderBackgroundProvider
from instora.config import load_config


def get_background_provider(provider_name: Optional[str] = None) -> BackgroundProvider:
    """Resolve and instantiate the background provider configured in config.yaml.

    Args:
        provider_name: Override provider ('local_folder', 'gdrive', 'pexels').

    Returns:
        Instantiated BackgroundProvider instance.
    """
    cfg = load_config()
    chosen = (provider_name or cfg.background.provider or cfg.defaults.background_provider or "local_folder").lower().strip()

    if chosen == "gdrive":
        return GDriveBackgroundProvider()
    elif chosen == "local_folder":
        return LocalFolderBackgroundProvider(folder=cfg.paths.backgrounds_dir)
    elif chosen == "pexels":
        from instora.backgrounds.pexels import PexelsBackgroundProvider
        pexels_key = getattr(cfg.defaults, "pexels_api_key", None)
        return PexelsBackgroundProvider(api_key=pexels_key or "", cache_dir=cfg.paths.cache_dir)
    else:
        raise ValueError(f"Unknown background provider '{chosen}'. Supported: local_folder, gdrive, pexels")


__all__ = [
    "BackgroundProvider",
    "LocalFolderBackgroundProvider",
    "GDriveBackgroundProvider",
    "PexelsBackgroundProvider",
    "get_background_provider",
]
