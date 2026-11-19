"""Instagram Graph API publishing integration (Phase 6 / Milestone 2)."""

from __future__ import annotations

from pathlib import Path


class InstagramPublisher:
    """Manages video uploads via Meta Graph API."""

    def __init__(self, access_token: str, instagram_account_id: str) -> None:
        self.access_token = access_token
        self.instagram_account_id = instagram_account_id

    def publish_reel(self, video_url: str, caption: str) -> str:
        """Publish a reel via media container creation and status polling."""
        raise NotImplementedError("Phase 6 milestone: Meta Graph API integration.")

