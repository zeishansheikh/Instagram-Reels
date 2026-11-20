"""Instagram Graph API Reels publishing integration for Professional/Creator accounts."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Optional

import httpx
from loguru import logger

from reelforge.config import load_config
from reelforge.publish.storage import StorageProvider, get_storage_provider


class InstagramPublishError(Exception):
    """Exception raised when an Instagram Graph API publishing request fails."""
    pass


class InstagramPublisher:
    """Manages video uploads, container status polling, and publication via Meta Graph API."""

    def __init__(
        self,
        access_token: Optional[str] = None,
        instagram_account_id: Optional[str] = None,
        api_version: str = "v21.0",
        http_client: Optional[httpx.Client] = None,
        poll_interval: float = 5.0,
        max_poll_seconds: float = 600.0,
    ) -> None:
        cfg = load_config()
        self.access_token = access_token or cfg.instagram.access_token or ""
        self.instagram_account_id = instagram_account_id or cfg.instagram.user_id or ""
        self.api_version = api_version
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self._client = http_client
        self.poll_interval = poll_interval
        self.max_poll_seconds = max_poll_seconds

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        return httpx.Client(timeout=60.0)

    def validate_credentials(self) -> None:
        """Validate presence of Instagram user ID and access token."""
        if not self.access_token:
            raise ValueError(
                "IG_ACCESS_TOKEN is missing. Please set your Meta access token in .env."
            )
        if not self.instagram_account_id:
            raise ValueError(
                "IG_USER_ID is missing. Please set your Instagram Business/Creator account ID in .env."
            )

    def create_reels_container(
        self,
        video_url: str,
        caption: str,
        share_to_feed: bool = True,
    ) -> str:
        """Step 1: Create an Instagram Reels media container via Graph API.

        Args:
            video_url: Public URL where Instagram can download the video file.
            caption: Post caption with hashtags.
            share_to_feed: Whether to share the Reel to the profile main feed.

        Returns:
            str: Container ID.
        """
        self.validate_credentials()
        endpoint = f"{self.base_url}/{self.instagram_account_id}/media"

        data = {
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "share_to_feed": "true" if share_to_feed else "false",
            "access_token": self.access_token,
        }

        client = self._get_client()
        logger.info(f"Creating Instagram Reels container for video at: {video_url}")
        res = client.post(endpoint, data=data)

        try:
            body = res.json()
        except Exception:
            body = {"raw": res.text}

        if res.status_code != 200 or "id" not in body:
            err = body.get("error", {})
            err_msg = err.get("message", res.text)
            err_code = err.get("code", res.status_code)
            err_sub = err.get("error_subcode", "")
            raise InstagramPublishError(
                f"Failed to create Instagram Reels container (Code {err_code}, Subcode {err_sub}): {err_msg}"
            )

        container_id = body["id"]
        logger.info(f"Reels container created successfully: ID {container_id}")
        return container_id

    def poll_container_status(self, container_id: str) -> str:
        """Step 2: Poll container processing status until FINISHED or error.

        Status codes:
        - IN_PROGRESS: Video encoding / downloading on Instagram servers.
        - FINISHED: Ready for media_publish.
        - ERROR: Processing failed.
        - EXPIRED: Upload timed out.

        Args:
            container_id: Media container ID.

        Returns:
            str: 'FINISHED'
        """
        self.validate_credentials()
        endpoint = f"{self.base_url}/{container_id}"
        params = {
            "fields": "status_code,status",
            "access_token": self.access_token,
        }

        client = self._get_client()
        start_time = time.time()
        attempt = 1

        while (time.time() - start_time) < self.max_poll_seconds:
            logger.info(
                f"Checking container status ({container_id}) [Attempt {attempt}, elapsed: {int(time.time() - start_time)}s]..."
            )
            res = client.get(endpoint, params=params)

            try:
                body = res.json()
            except Exception:
                body = {}

            if res.status_code != 200:
                err = body.get("error", {}).get("message", res.text)
                raise InstagramPublishError(f"Error querying container status: {err}")

            status_code = body.get("status_code", "").upper()
            logger.info(f"Container status: {status_code}")

            if status_code == "FINISHED":
                return "FINISHED"
            elif status_code in ("ERROR", "EXPIRED"):
                details = body.get("status", "No error details provided by Meta.")
                raise InstagramPublishError(
                    f"Media container processing failed with status '{status_code}': {details}"
                )
            elif status_code in ("IN_PROGRESS", ""):
                # Sleep with modest linear backoff capped at 15s
                sleep_dur = min(15.0, self.poll_interval + (attempt * 1.5))
                time.sleep(sleep_dur)
                attempt += 1
            else:
                logger.warning(f"Unrecognized status code '{status_code}'. Waiting...")
                time.sleep(self.poll_interval)
                attempt += 1

        raise TimeoutError(
            f"Container {container_id} did not reach FINISHED status within {self.max_poll_seconds} seconds."
        )

    def publish_container(self, container_id: str) -> str:
        """Step 3: Publish the finished media container to Instagram.

        Args:
            container_id: Validated container ID in FINISHED state.

        Returns:
            str: Published media ID.
        """
        self.validate_credentials()
        endpoint = f"{self.base_url}/{self.instagram_account_id}/media_publish"
        data = {
            "creation_id": container_id,
            "access_token": self.access_token,
        }

        client = self._get_client()
        logger.info(f"Publishing container {container_id} to Instagram feed...")
        res = client.post(endpoint, data=data)

        try:
            body = res.json()
        except Exception:
            body = {}

        if res.status_code != 200 or "id" not in body:
            err = body.get("error", {}).get("message", res.text)
            raise InstagramPublishError(f"Failed to publish media container: {err}")

        media_id = body["id"]
        logger.info(f"🎉 Successfully published Reel! Media ID: {media_id}")
        return media_id

    def get_media_permalink(self, media_id: str) -> Optional[str]:
        """Fetch permalink URL of published Reel."""
        try:
            endpoint = f"{self.base_url}/{media_id}"
            params = {
                "fields": "permalink",
                "access_token": self.access_token,
            }
            client = self._get_client()
            res = client.get(endpoint, params=params)
            if res.status_code == 200:
                data = res.json()
                return data.get("permalink")
        except Exception as e:
            logger.debug(f"Could not retrieve permalink for media {media_id}: {e}")
        return None

    def publish_reel(
        self,
        video_path: Path,
        caption: str,
        storage: Optional[StorageProvider] = None,
        audio_mode: str = "none",
    ) -> dict[str, Any]:
        """Execute complete publishing journey: upload -> container -> poll -> publish -> cleanup.

        Args:
            video_path: Path to local reel.mp4.
            caption: Caption text.
            storage: Storage provider to host video temporarily.
            audio_mode: Audio mode ('none' or 'royalty_free').

        Returns:
            Dict containing media_id, container_id, permalink, and video_url.
        """
        p = Path(video_path)
        if not p.exists():
            raise FileNotFoundError(f"Video file not found at: {p}")

        # Audio constraint notice
        if audio_mode != "royalty_free":
            logger.info(
                "Notice: Meta Instagram Graph API does not support attaching Instagram library audio. "
                "The Reel is published with its existing silent/ambient audio track."
            )
        else:
            logger.info("Publishing Reel with pre-baked royalty-free audio.")

        provider = storage or get_storage_provider()
        public_url = provider.upload(p)

        try:
            container_id = self.create_reels_container(video_url=public_url, caption=caption)
            self.poll_container_status(container_id)
            media_id = self.publish_container(container_id)
            permalink = self.get_media_permalink(media_id)
            return {
                "media_id": media_id,
                "container_id": container_id,
                "permalink": permalink,
                "video_url": public_url,
            }
        finally:
            # Always delete temporary upload from public cloud storage
            try:
                provider.delete(public_url)
            except Exception as del_err:
                logger.warning(f"Failed to delete temp storage file {public_url}: {del_err}")
