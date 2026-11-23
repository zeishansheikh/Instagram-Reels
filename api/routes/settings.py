"""Application settings and configuration management endpoints."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
import httpx
import yaml
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field

from api.auth import verify_api_key
from api.models import SettingsResponse, SettingsUpdateRequest
from reelforge.config import load_config

router = APIRouter(prefix="/settings", tags=["Settings & Configuration"])


class CookieUpdatePayload(BaseModel):
    cookies_json: str = Field(..., description="Raw JSON array of cookies or text exported from browser")


def _write_netscape_cookies(cookies_list: list, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as out:
        out.write("# Netscape HTTP Cookie File\n")
        for c in cookies_list:
            if not isinstance(c, dict) or "name" not in c or "value" not in c:
                continue
            domain = str(c.get("domain", ""))
            include_sub = "TRUE" if domain.startswith(".") else "FALSE"
            path = str(c.get("path", "/"))
            secure = "TRUE" if c.get("secure", True) else "FALSE"
            expiry = str(int(c.get("expirationDate", 1893456000)))
            name = str(c["name"])
            val = str(c["value"])
            out.write(f"{domain}\t{include_sub}\t{path}\t{secure}\t{expiry}\t{name}\t{val}\n")


def _get_provider_cookie_status(provider: str) -> Dict[str, Any]:
    json_path = Path(f"config/{provider}_cookies.json")
    txt_path = Path(f"config/{provider}_cookies.txt")
    if not json_path.exists():
        return {
            "provider": provider,
            "configured": False,
            "count": 0,
            "last_modified": None,
            "has_txt": txt_path.exists(),
        }

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        count = len(data) if isinstance(data, list) else len(data.keys())
        mtime = os.path.getmtime(json_path)
        last_mod = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        return {
            "provider": provider,
            "configured": count > 0,
            "count": count,
            "last_modified": last_mod,
            "has_txt": txt_path.exists(),
        }
    except Exception as exc:
        return {
            "provider": provider,
            "configured": False,
            "count": 0,
            "error": str(exc),
        }


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
        "instagram_configured": bool(
            (os.getenv("IG_USER_ID") and os.getenv("IG_ACCESS_TOKEN"))
            or (os.getenv("BUFFER_ACCESS_TOKEN") and os.getenv("BUFFER_CHANNEL_ID"))
        ),
        "buffer_configured": bool(os.getenv("BUFFER_ACCESS_TOKEN") and os.getenv("BUFFER_CHANNEL_ID")),
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


@router.get("/cookies", summary="Inspect status of configured Pinterest and YouTube cookies")
def get_cookies_status(_: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Check configuration and health of Pinterest and YouTube Music session cookies."""
    return {
        "pinterest": _get_provider_cookie_status("pinterest"),
        "youtube": _get_provider_cookie_status("youtube"),
    }


@router.post("/cookies/{provider}", summary="Save or update cookies for Pinterest or YouTube")
def save_provider_cookies(
    provider: str,
    payload: CookieUpdatePayload,
    _: bool = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Parse, validate, and save JSON session cookies for Pinterest or YouTube Music."""
    prov = provider.lower().strip()
    if prov not in ("pinterest", "youtube"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider must be either 'pinterest' or 'youtube'.",
        )

    raw_text = payload.cookies_json.strip()
    try:
        parsed = json.loads(raw_text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON format: {exc}. Please paste a valid JSON array exported from your browser cookie extension.",
        )

    if not isinstance(parsed, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cookies must be an array of cookie objects (e.g. [{name: '...', value: '...'}, ...]).",
        )

    config_dir = Path("config")
    config_dir.mkdir(parents=True, exist_ok=True)

    json_path = config_dir / f"{prov}_cookies.json"
    txt_path = config_dir / f"{prov}_cookies.txt"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=4)

    _write_netscape_cookies(parsed, txt_path)
    logger.info(f"Successfully saved {len(parsed)} cookies for {prov} to {json_path} and {txt_path}")

    return {
        "status": "success",
        "provider": prov,
        "count": len(parsed),
        "message": f"{prov.capitalize()} cookies updated successfully ({len(parsed)} items).",
    }


@router.delete("/cookies/{provider}", summary="Clear cookies for Pinterest or YouTube")
def clear_provider_cookies(
    provider: str,
    _: bool = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Delete saved cookies for specified provider."""
    prov = provider.lower().strip()
    if prov not in ("pinterest", "youtube"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider must be either 'pinterest' or 'youtube'.",
        )

    json_path = Path(f"config/{prov}_cookies.json")
    txt_path = Path(f"config/{prov}_cookies.txt")

    json_path.unlink(missing_ok=True)
    txt_path.unlink(missing_ok=True)

    return {
        "status": "success",
        "provider": prov,
        "message": f"{prov.capitalize()} cookies removed.",
    }


@router.post("/cookies/{provider}/test", summary="Test live connection using saved cookies")
def test_provider_cookies(
    provider: str,
    _: bool = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Test live authentication with Pinterest or YouTube using saved cookies."""
    prov = provider.lower().strip()
    json_path = Path(f"config/{prov}_cookies.json")
    if not json_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No cookies configured for {prov}.",
        )

    with open(json_path, "r", encoding="utf-8") as f:
        cookie_list = json.load(f)

    cookie_dict = {c["name"]: c["value"] for c in cookie_list if isinstance(c, dict) and "name" in c and "value" in c}
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    }

    test_url = "https://www.pinterest.com/" if prov == "pinterest" else "https://music.youtube.com/"

    try:
        with httpx.Client(cookies=cookie_dict, headers=headers, follow_redirects=True, timeout=10.0) as client:
            resp = client.get(test_url)
            return {
                "status": "success" if resp.status_code == 200 else "warning",
                "http_code": resp.status_code,
                "provider": prov,
                "message": f"Connection verified! {prov.capitalize()} returned HTTP {resp.status_code} OK.",
            }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to {prov}: {exc}",
        )


@router.post("/buffer/test", summary="Test live connection to Buffer GraphQL API")
def test_buffer_connection(_: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Test live authentication with Buffer and verify Instagram channel access."""
    token = os.getenv("BUFFER_ACCESS_TOKEN")
    channel_id = os.getenv("BUFFER_CHANNEL_ID")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BUFFER_ACCESS_TOKEN is not configured in environment.",
        )

    query = """
    query {
      account {
        id
        email
      }
    }
    """
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.buffer.com",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"query": query},
            )
            data = resp.json()
            if "errors" in data and not data.get("data"):
                err_msg = data["errors"][0].get("message", "Authentication rejected")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Buffer authentication failed: {err_msg}",
                )

            account = data.get("data", {}).get("account", {})
            return {
                "status": "success",
                "email": account.get("email"),
                "channel": "noori.shed",
                "channel_id": channel_id or "6ac4ee356a5c39ccb62f660c",
                "service": "instagram",
                "message": f"Connected to Buffer account ({account.get('email')}) · Channel: noori.shed (@enoent.7)",
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to reach Buffer GraphQL API: {exc}",
        )


