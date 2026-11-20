"""API key authentication dependency for Reel Forge API."""

from __future__ import annotations

import os
from typing import Optional
from fastapi import Depends, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger

# Configured API keys from environment
api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_token_scheme = HTTPBearer(auto_error=False)


def get_expected_api_key() -> Optional[str]:
    """Retrieve expected API key from environment variables."""
    key = os.getenv("REELFORGE_API_KEY") or os.getenv("API_KEY")
    if key and key.strip():
        return key.strip()
    return None


def verify_api_key(
    header_key: Optional[str] = Security(api_key_header_scheme),
    bearer_creds: Optional[HTTPAuthorizationCredentials] = Security(bearer_token_scheme),
    query_key: Optional[str] = Query(None, alias="api_key", description="API key as query parameter (useful for media streaming)"),
) -> bool:
    """Verify that request contains a valid API key via header, bearer token, or query param.

    If neither REELFORGE_API_KEY nor API_KEY is set in environment, authentication is bypassed
    for smooth local development.
    """
    expected_key = get_expected_api_key()

    # If no key is set in .env, permit requests in local development
    if not expected_key:
        return True

    # Check candidates
    candidate = header_key or query_key
    if not candidate and bearer_creds:
        candidate = bearer_creds.credentials

    if candidate and candidate.strip() == expected_key:
        return True

    logger.warning("Unauthorized API request: invalid or missing API Key")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key. Provide via 'X-API-Key' header, Bearer token, or '?api_key=' parameter.",
        headers={"WWW-Authenticate": "ApiKey"},
    )

