"""Pydantic request and response models for the Reel Forge Studio API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str = "Reel Forge"
    version: str = "0.1.0"
    database_connected: bool
    ffmpeg_available: bool
    gemini_api_key_configured: bool
    background_provider: str
    storage_provider: str
    instagram_configured: bool
    active_background_jobs: int


# --- Quotes ---

class QuoteModel(BaseModel):
    id: int
    text: str
    theme: str
    lang: str
    created_at: str
    used_count: int


# --- Clips ---

class ClipModel(BaseModel):
    id: Optional[int] = None
    source: str = "local_folder"
    source_id: Optional[str] = None
    path: str
    use_count: int = 0
    last_used_at: Optional[str] = None
    exists_on_disk: bool = True
    size_bytes: Optional[int] = None
    preview_url: Optional[str] = None


# --- Reels ---

class ReelSummary(BaseModel):
    id: int
    quote_id: int
    quote_text: str
    theme: str
    lang: str
    mood: Optional[str] = None
    clip_id: int
    clip_path: str
    style: str
    path: str
    video_url: str
    thumbnail_url: str
    caption: Optional[str] = None
    status: str  # created | completed | approved | discarded | regenerated | published
    created_at: str
    is_published: bool = False


class ReelDetail(ReelSummary):
    meta_json: Dict[str, Any] = Field(default_factory=dict)
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    publish_history: List[Dict[str, Any]] = Field(default_factory=list)


class ReelActionResponse(BaseModel):
    reel_id: int
    action: str  # approved | discarded | regenerated
    status: str
    message: str
    reel: Optional[ReelSummary] = None


# --- Generation & Background Jobs ---

class GenerateRequest(BaseModel):
    count: int = Field(default=10, ge=1, le=50, description="Number of reels to generate in batch")
    theme: str = Field(default="hope", description="Quote theme (e.g. hope, solitude, gratitude, resilience)")
    lang: str = Field(default="en", description="Language: en, roman-urdu, urdu")
    style: str = Field(default="styles/degraaf.yaml", description="Path to style preset YAML or 'random'")
    provider: Optional[str] = Field(default=None, description="Background provider override: local_folder, gdrive, pexels")
    run_in_background: bool = Field(default=True, description="Run generation as asynchronous background job")


class RegenerateRequest(BaseModel):
    style: Optional[str] = Field(default=None, description="Style YAML path override or 'random'")
    run_in_background: bool = Field(default=False, description="Run regeneration in background job")


class JobResponse(BaseModel):
    job_id: str
    type: str
    status: str
    message: str
    progress: float
    created_at: str
    poll_url: str


class JobDetailResponse(JobResponse):
    params: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[Any] = None
    error: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


# --- Schedule ---

class ScheduleItem(BaseModel):
    id: int
    reel_path: str
    quote_snippet: str
    theme: str
    style: str
    thumbnail_url: str
    video_url: str
    status: str
    created_at: str


class ScheduleResponse(BaseModel):
    pending_approval_count: int
    approved_ready_to_publish_count: int
    published_count: int
    scheduled_reels: List[ScheduleItem]
    recommended_next_publish_date: str
    publication_cadence: str = "1 reel per day at 18:00 (optimal engagement)"


# --- Settings ---

class SettingsUpdateRequest(BaseModel):
    theme: Optional[str] = None
    lang: Optional[str] = None
    count: Optional[int] = Field(default=None, ge=1, le=50)
    style: Optional[str] = None
    background_provider: Optional[str] = None  # local_folder, gdrive, pexels
    gdrive_folder_id: Optional[str] = None
    clip_reuse_cooldown: Optional[int] = None
    storage_provider: Optional[str] = None  # supabase, r2, mock
    supabase_bucket: Optional[str] = None
    r2_bucket_name: Optional[str] = None
    crf: Optional[int] = Field(default=None, ge=10, le=40)
    preset: Optional[str] = None


class SettingsResponse(BaseModel):
    config: Dict[str, Any]
    environment: Dict[str, bool]


# --- Publish ---

class PublishRequest(BaseModel):
    dry_run: bool = Field(default=False, description="Simulate publish without uploading or calling Instagram API")
    run_in_background: bool = Field(default=True, description="Run publish in background job")


class PublishLogItem(BaseModel):
    id: int
    reel_path: str
    container_id: Optional[str] = None
    media_id: Optional[str] = None
    status: str
    permalink: Optional[str] = None
    error: Optional[str] = None
    created_at: str

