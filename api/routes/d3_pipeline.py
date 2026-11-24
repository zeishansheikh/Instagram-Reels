"""FastAPI endpoints for D3 Reel Pipeline (Formula D3).

Exposes:
- GET /d3/status: Overall D3 pipeline status, manifests, and workflow state.
- GET /d3/state: workflow_state.json inspection.
- GET /d3/manifest/{slot}: Read manifest_a.json or manifest_b.json.
- POST /d3/build: Execute the 15-step D3 build pipeline (background or synchronous).
- POST /d3/post/{slot}: Execute posting for Slot A or Slot B.
"""

from __future__ import annotations

from pathlib import Path
import json
import subprocess
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from api.auth import verify_api_key
from api.jobs import job_manager
from api.models import JobResponse
from instora.pipeline.builder import build_d3_reel, restyle_d3_reel
from instora.pipeline.manifest import ReelManifest
from instora.pipeline.music_youtube import get_youtube_cookies_arg, get_ytdlp_bin
from instora.pipeline.poster import post_d3_reel
from instora.pipeline.workflow_state import WorkflowState

router = APIRouter(prefix="/d3", tags=["D3 Pipeline (@noori.shed)"])


class D3BuildRequest(BaseModel):
    slot: str = Field(default="a", description="Pipeline slot: 'a' (morning) or 'b' (afternoon)")
    date: Optional[str] = Field(default=None, description="Date partition (YYYY-MM-DD)")
    theme: Optional[str] = Field(default=None, description="Theme override (loss, yaadein, waqt, tanhai, dard)")
    category: Optional[str] = Field(default=None, description="Nature footage category override")
    run_in_background: bool = Field(default=True, description="Run build in background thread")
    aspect_ratio: str = Field(default="9:16", description="Video aspect ratio: '9:16', '1:1', or '16:9'")
    quality: str = Field(default="1080p60", description="Quality preset: '1080p60', '1080p30', '720p60', or '4k60'")
    duration: Optional[float] = Field(default=8.0, description="Target duration in seconds (7.0 - 60.0)")
    custom_quote: Optional[str] = Field(default=None, description="User-supplied custom quote lines")


class D3PostRequest(BaseModel):
    date: Optional[str] = Field(default=None, description="Expected date partition (YYYY-MM-DD)")
    dry_run: bool = Field(default=False, description="Simulate publish without external network call")
    run_in_background: bool = Field(default=False, description="Run publish in background thread")


class D3RestyleRequest(BaseModel):
    slot: str = Field(default="a")
    quote: Optional[str] = Field(default=None)
    font_file: Optional[str] = Field(default=None)
    font_size: int = Field(default=30, ge=16, le=72)
    text_color: str = Field(default="#FFFFFF")
    y_percent: int = Field(default=50, ge=15, le=85)
    shadow_opacity: float = Field(default=0.9, ge=0.0, le=1.0)
    color_preset: str = Field(default="auto")
    brightness: float = Field(default=0.0, ge=-0.5, le=0.5)
    contrast: float = Field(default=1.05, ge=0.5, le=2.0)
    saturation: float = Field(default=1.12, ge=0.0, le=2.5)
    song_file: Optional[str] = Field(default=None)
    song_start: Optional[float] = Field(default=0.0, ge=0.0)
    run_in_background: bool = Field(default=True)


class D3MusicFetchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Song search query or YouTube URL")


@router.get("/status", summary="Get complete D3 pipeline status and manifests")
def get_d3_status(_: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Retrieve state from workflow_state.json and status of staged slot A and B manifests."""
    state = WorkflowState.load()

    manifest_a = ReelManifest.load("a")
    manifest_b = ReelManifest.load("b")

    return {
        "formula": "D3",
        "account": "@enoent.7",
        "buffer_channel": "noori.shed",
        "state": {
            "used_pins_count": len(state.used_pins),
            "used_lines_count": len(state.used_lines),
            "used_songs_count": len(state.used_songs),
            "used_reels_count": len(state.used_reels),
            "last_category": state.last_category,
            "last_song": state.last_song,
            "last_run": state.last_run,
        },
        "slots": {
            "slot_a": {
                "ready": manifest_a is not None,
                "manifest": manifest_a.model_dump() if manifest_a else None,
            },
            "slot_b": {
                "ready": manifest_b is not None,
                "manifest": manifest_b.model_dump() if manifest_b else None,
            },
        },
    }


@router.get("/state", summary="Inspect raw workflow_state.json")
def get_workflow_state(_: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Inspect full workflow_state.json including used pins, lines, and songs."""
    state = WorkflowState.load()
    return state.model_dump()


@router.get("/manifest/{slot}", summary="Get staged manifest for slot A or B")
def get_manifest(slot: str, _: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Retrieve manifest for specified slot ('a' or 'b')."""
    clean_slot = slot.lower().strip()
    manifest = ReelManifest.load(clean_slot)
    if not manifest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No staged manifest found for slot '{clean_slot}'. Run a build first.",
        )
    return manifest.model_dump()


@router.post("/build", summary="Execute 15-step D3 build pipeline", status_code=status.HTTP_202_ACCEPTED)
def trigger_d3_build(
    req: D3BuildRequest,
    _: bool = Depends(verify_api_key),
) -> Any:
    """Execute the full D3 15-step pipeline: fetch footage, audio swap, D3 Roman Urdu lines, 1080p60 encode, and staging."""
    def _worker(progress_callback=None):
        if progress_callback:
            progress_callback(0.05, f"Initializing D3 build for slot {req.slot.upper()}...")
        res = build_d3_reel(
            slot=req.slot,
            target_date=req.date,
            theme_override=req.theme,
            category_override=req.category,
            duration_override=req.duration,
            custom_quote=req.custom_quote,
            aspect_ratio=req.aspect_ratio,
            quality=req.quality,
            progress_callback=progress_callback,
        )
        if progress_callback:
            progress_callback(1.0, f"D3 build for slot {req.slot.upper()} finished with status: {res.get('status')}")
        return res

    if req.run_in_background:
        job = job_manager.create_job(
            job_type="d3_build",
            params=req.model_dump(),
            worker_fn=_worker,
        )
        return JobResponse(
            job_id=job.id,
            type=job.type,
            status=job.status.value,
            message=f"D3 build for slot {req.slot.upper()} queued in background.",
            progress=0.0,
            created_at=job.created_at,
            poll_url=f"/jobs/{job.id}",
        )
    else:
        res = _worker()
        return res


@router.post("/post/{slot}", summary="Post staged D3 reel for slot A or B")
def trigger_d3_post(
    slot: str,
    req: D3PostRequest,
    _: bool = Depends(verify_api_key),
) -> Any:
    """Dispatch staged reel to Buffer channel 'noori.shed' (@enoent.7)."""
    clean_slot = slot.lower().strip()
    res = post_d3_reel(slot=clean_slot, target_date=req.date, dry_run=req.dry_run)
    if res.get("status") in ("not_ready", "validation_failed", "tech_failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "Failed to post staged reel."),
        )
    return res


def _probe_audio_duration(path: Path) -> float:
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, timeout=5,
        )
        return round(float(proc.stdout.strip() or 60.0), 1)
    except Exception:
        return 60.0


@router.get("/editor-assets", summary="List available fonts and background music tracks for live editor")
def get_editor_assets(_: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Return all registered fonts from fonts/fonts.json and audio tracks in assets/music."""
    fonts: List[Dict[str, Any]] = []
    fonts_json = Path("fonts/fonts.json")
    if fonts_json.exists():
        try:
            with open(fonts_json, "r", encoding="utf-8") as f:
                raw_fonts = json.load(f)
            for item in raw_fonts:
                f_file = item.get("file", "")
                if (Path("fonts/fonts") / f_file).exists():
                    fonts.append({
                        "name": item.get("name", f_file),
                        "file": f_file,
                        "script": item.get("script", "latin"),
                        "style": item.get("style", "sans"),
                        "weight": item.get("weight", 400),
                        "drawtext_ok": item.get("drawtext_ok", True),
                        "url": f"/static/fonts/{f_file}",
                    })
        except Exception:
            pass

    # Also include local assets/fonts/*.ttf if any
    for ttf in sorted(Path("assets/fonts").glob("*.ttf")) if Path("assets/fonts").exists() else []:
        if not any(x["file"] == ttf.name for x in fonts):
            fonts.append({
                "name": ttf.stem.replace("_", " ").title(),
                "file": ttf.name,
                "script": "latin",
                "style": "serif",
                "weight": 600,
                "drawtext_ok": True,
                "url": f"/static/assets/fonts/{ttf.name}",
            })

    songs: List[Dict[str, Any]] = []
    music_dir = Path("assets/music")
    if music_dir.exists():
        tracks = sorted(
            list(music_dir.glob("*.mp3")) + list(music_dir.glob("*.m4a")),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for tr in tracks:
            songs.append({
                "filename": tr.name,
                "title": tr.stem.replace("_", " "),
                "duration": _probe_audio_duration(tr),
                "url": f"/static/assets/music/{tr.name}",
            })

    return {"fonts": fonts, "songs": songs}


@router.post("/music/fetch", summary="Search and download a song from YouTube Music into library")
def fetch_custom_song(
    req: D3MusicFetchRequest,
    _: bool = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Download an MP3 track from YouTube Music search query or URL for the live editor."""
    music_dir = Path("assets/music")
    music_dir.mkdir(parents=True, exist_ok=True)
    ytdlp = get_ytdlp_bin()
    cookies = get_youtube_cookies_arg()

    q = req.query.strip()
    is_url = q.startswith("http://") or q.startswith("https://")
    target_tpl = str(music_dir / "%(title).45s_%(id)s.%(ext)s")

    cmd = [
        ytdlp,
        *([] if is_url else ["--default-search", "ytsearch1"]),
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "--max-filesize", "20M",
        "--restrict-filenames",
        "--output", target_tpl,
    ] + cookies + [q]

    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=45)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not download song from YouTube: {exc}",
        )

    newest = sorted(
        list(music_dir.glob("*.mp3")) + list(music_dir.glob("*.m4a")),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not newest:
        raise HTTPException(status_code=500, detail="Audio download finished but file missing.")

    tr = newest[0]
    return {
        "filename": tr.name,
        "title": tr.stem.replace("_", " "),
        "duration": _probe_audio_duration(tr),
        "url": f"/static/assets/music/{tr.name}",
    }


@router.post("/restyle", summary="Fast-rerender staged reel with CapCut-style editor overrides", status_code=status.HTTP_202_ACCEPTED)
def restyle_reel(
    req: D3RestyleRequest,
    _: bool = Depends(verify_api_key),
) -> Any:
    """Apply updated font, colors, quote, and trimmed audio onto the clean staged reel base."""
    def _worker(progress_callback=None):
        return restyle_d3_reel(
            slot=req.slot,
            quote=req.quote,
            font_file=req.font_file,
            font_size=req.font_size,
            text_color=req.text_color,
            y_percent=req.y_percent,
            shadow_opacity=req.shadow_opacity,
            color_preset=req.color_preset,
            brightness=req.brightness,
            contrast=req.contrast,
            saturation=req.saturation,
            song_file=req.song_file,
            song_start=req.song_start,
            progress_callback=progress_callback,
        )

    if req.run_in_background:
        job = job_manager.create_job(
            job_type="d3_restyle",
            params=req.model_dump(),
            worker_fn=_worker,
        )
        return JobResponse(
            job_id=job.id,
            type=job.type,
            status=job.status.value,
            message=f"Applying edits to slot {req.slot.upper()}...",
            progress=0.0,
            created_at=job.created_at,
            poll_url=f"/jobs/{job.id}",
        )
    return _worker()

