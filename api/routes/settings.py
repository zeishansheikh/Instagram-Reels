"""Application settings and configuration management endpoints."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict
import yaml
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger

from api.auth import verify_api_key
from api.models import SettingsResponse, SettingsUpdateRequest
from reelforge.config import load_config

router = APIRouter(prefix="/settings", tags=["Settings & Configuration"])


def _get_config_dict() -> Dict[str, Any]:
    cfg_path = Path("config.yaml")
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            return data if isinstance(data, dict) else {}
    return {}


@router.get("", response_model=SettingsResponse, summary="Retrieve current configuration settings")
def get_settings(
    _: bool = Depends(verify_api_key),
) -> SettingsResponse:
    """Retrieve runtime settings, defaults, render parameters, and provider statuses."""
    config_dict = _get_config_dict()

    env_status = {
        "gemini_api_key_set": bool(os.getenv("GEMINI_API_KEY")),
        "pexels_api_key_set": bool(os.getenv("PEXELS_API_KEY")),
        "gdrive_folder_id_set": bool(os.getenv("GDRIVE_FOLDER_ID")),
        "instagram_configured": bool(os.getenv("IG_USER_ID") and os.getenv("IG_ACCESS_TOKEN")),
        "supabase_configured": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY")),
        "r2_configured": bool(os.getenv("R2_ACCOUNT_ID") and os.getenv("R2_ACCESS_KEY_ID")),
    }

    return SettingsResponse(
        config=config_dict,
        environment=env_status,
    )


@router.put("", response_model=SettingsResponse, summary="Update configuration settings")
def update_settings(
    req: SettingsUpdateRequest,
    _: bool = Depends(verify_api_key),
) -> SettingsResponse:
    """Update settings in config.yaml (defaults, background provider, video render quality, etc.)."""
    cfg_path = Path("config.yaml")
    data = _get_config_dict()

    # Ensure root sections exist
    if "defaults" not in data or not isinstance(data["defaults"], dict):
        data["defaults"] = {}
    if "background" not in data or not isinstance(data["background"], dict):
        data["background"] = {}
    if "storage" not in data or not isinstance(data["storage"], dict):
        data["storage"] = {}
    if "render" not in data or not isinstance(data["render"], dict):
        data["render"] = {}

    # Apply updates
    if req.theme is not None:
        data["defaults"]["theme"] = req.theme
    if req.lang is not None:
        data["defaults"]["lang"] = req.lang
    if req.count is not None:
        data["defaults"]["count"] = req.count
    if req.style is not None:
        data["defaults"]["style"] = req.style
    if req.clip_reuse_cooldown is not None:
        data["defaults"]["clip_reuse_cooldown"] = req.clip_reuse_cooldown

    if req.background_provider is not None:
        data["background"]["provider"] = req.background_provider
        data["defaults"]["background_provider"] = req.background_provider

    if req.gdrive_folder_id is not None:
        data["background"]["gdrive_folder_id"] = req.gdrive_folder_id

    if req.storage_provider is not None:
        data["storage"]["provider"] = req.storage_provider
    if req.supabase_bucket is not None:
        data["storage"]["supabase_bucket"] = req.supabase_bucket
    if req.r2_bucket_name is not None:
        data["storage"]["r2_bucket_name"] = req.r2_bucket_name

    if req.crf is not None:
        data["render"]["crf"] = req.crf
    if req.preset is not None:
        data["render"]["preset"] = req.preset

    # Save to config.yaml
    try:
        with open(cfg_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False, default_flow_style=False)
        logger.info("Successfully updated config.yaml via PUT /settings")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist settings: {exc}",
        )

    # Return refreshed settings
    return get_settings(_=True)

