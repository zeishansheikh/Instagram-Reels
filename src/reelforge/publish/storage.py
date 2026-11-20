"""Public video storage uploader protocol with Supabase Storage and Cloudflare R2 backends."""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional, Protocol, runtime_checkable

import httpx
from loguru import logger

from reelforge.config import load_config


@runtime_checkable
class StorageProvider(Protocol):
    """Protocol defining temporary public video hosting for Instagram container download."""

    def upload(self, file_path: Path) -> str:
        """Upload a local video file and return an unguessable public URL."""
        ...

    def delete(self, public_url: str) -> None:
        """Delete temporary file from public storage after Instagram has finished downloading."""
        ...


class SupabaseStorage:
    """Uploads videos to a public Supabase Storage bucket via REST API."""

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        cfg = load_config()
        self.url = (supabase_url or cfg.storage.supabase_url or "").rstrip("/")
        self.key = supabase_key or cfg.storage.supabase_key or ""
        self.bucket = bucket_name or cfg.storage.supabase_bucket or "reels"
        self._client = http_client

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        return httpx.Client(
            headers={
                "Authorization": f"Bearer {self.key}",
                "apikey": self.key,
            },
            timeout=120.0,
        )

    def upload(self, file_path: Path) -> str:
        """Upload file with a random unguessable UUID filename and return its public URL."""
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"File to upload not found: {p}")

        if not self.url or not self.key:
            raise ValueError(
                "Supabase Storage credentials missing. Please set SUPABASE_URL and SUPABASE_KEY in .env."
            )

        unique_name = f"{uuid.uuid4().hex}{p.suffix.lower()}"
        upload_endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{unique_name}"

        with open(p, "rb") as f:
            file_bytes = f.read()

        client = self._get_client()
        content_type = "video/mp4" if p.suffix.lower() == ".mp4" else "application/octet-stream"

        response = client.post(
            upload_endpoint,
            content=file_bytes,
            headers={"Content-Type": content_type},
        )

        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"Supabase upload failed (status {response.status_code}): {response.text}"
            )

        public_url = f"{self.url}/storage/v1/object/public/{self.bucket}/{unique_name}"
        logger.info(f"Uploaded video to Supabase Storage: {public_url}")
        return public_url

    def delete(self, public_url: str) -> None:
        """Remove uploaded object from Supabase bucket using public URL."""
        if not self.url or not self.key:
            return

        try:
            # Extract object key from URL
            prefix = f"{self.url}/storage/v1/object/public/{self.bucket}/"
            if public_url.startswith(prefix):
                object_name = public_url[len(prefix):]
            else:
                object_name = public_url.split("/")[-1]

            delete_endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{object_name}"
            client = self._get_client()
            res = client.delete(delete_endpoint)
            if res.status_code in (200, 204):
                logger.info(f"Cleaned up temporary video from Supabase: {object_name}")
            else:
                logger.warning(f"Failed to delete {object_name} from Supabase: {res.text}")
        except Exception as e:
            logger.warning(f"Error during Supabase storage cleanup: {e}")


class R2Storage:
    """Uploads videos to Cloudflare R2 (S3-compatible) storage."""

    def __init__(
        self,
        account_id: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        public_url_prefix: Optional[str] = None,
        s3_client: Optional[Any] = None,
    ) -> None:
        cfg = load_config()
        self.account_id = account_id or cfg.storage.r2_account_id or ""
        self.access_key_id = access_key_id or cfg.storage.r2_access_key_id or ""
        self.secret_access_key = secret_access_key or cfg.storage.r2_secret_access_key or ""
        self.bucket = bucket_name or cfg.storage.r2_bucket_name or "reels"
        self.public_prefix = (public_url_prefix or cfg.storage.r2_public_url_prefix or "").rstrip("/")
        self._s3_client = s3_client

    def _get_s3(self) -> Any:
        if self._s3_client is not None:
            return self._s3_client
        try:
            import boto3
        except ImportError:
            raise ImportError(
                "boto3 is required for Cloudflare R2 uploads. Install with 'pip install boto3'."
            )

        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name="auto",
        )

    def upload(self, file_path: Path) -> str:
        """Upload to Cloudflare R2 with random unguessable key and return public URL."""
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"File to upload not found: {p}")

        if not self.public_prefix:
            raise ValueError(
                "R2_PUBLIC_URL_PREFIX missing. Please configure your public R2 bucket domain in .env."
            )

        unique_name = f"{uuid.uuid4().hex}{p.suffix.lower()}"
        s3 = self._get_s3()

        content_type = "video/mp4" if p.suffix.lower() == ".mp4" else "application/octet-stream"
        with open(p, "rb") as f:
            s3.put_object(
                Bucket=self.bucket,
                Key=unique_name,
                Body=f,
                ContentType=content_type,
            )

        public_url = f"{self.public_prefix}/{unique_name}"
        logger.info(f"Uploaded video to Cloudflare R2: {public_url}")
        return public_url

    def delete(self, public_url: str) -> None:
        """Delete temporary object from R2."""
        try:
            key = public_url.split("/")[-1]
            s3 = self._get_s3()
            s3.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Cleaned up temporary video from Cloudflare R2: {key}")
        except Exception as e:
            logger.warning(f"Error deleting object from Cloudflare R2: {e}")


class MockStorage:
    """Mock storage provider for dry-run mode and local testing."""

    def __init__(self) -> None:
        self.uploaded_files: dict[str, Path] = {}

    def upload(self, file_path: Path) -> str:
        p = Path(file_path)
        fake_id = f"mock_{uuid.uuid4().hex[:12]}{p.suffix}"
        url = f"https://mock-storage.reelforge.internal/{fake_id}"
        self.uploaded_files[url] = p
        logger.info(f"[MockStorage] Generated mock public URL: {url}")
        return url

    def delete(self, public_url: str) -> None:
        self.uploaded_files.pop(public_url, None)
        logger.info(f"[MockStorage] Deleted mock URL: {public_url}")


def get_storage_provider(provider_name: Optional[str] = None) -> StorageProvider:
    """Resolve and instantiate the configured storage provider.

    Args:
        provider_name: 'supabase', 'r2', or 'mock'.

    Returns:
        Instantiated StorageProvider.
    """
    cfg = load_config()
    chosen = (provider_name or cfg.storage.provider or "supabase").strip().lower()

    if chosen == "supabase":
        return SupabaseStorage()
    elif chosen == "r2":
        return R2Storage()
    elif chosen == "mock":
        return MockStorage()
    else:
        raise ValueError(f"Unknown storage provider '{chosen}'. Supported: supabase, r2, mock")
