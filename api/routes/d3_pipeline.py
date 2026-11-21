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
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from api.auth import verify_api_key
from api.jobs import job_manager
from api.models import JobResponse
from reelforge.pipeline.builder import build_d3_reel
from reelforge.pipeline.manifest import ReelManifest
from reelforge.pipeline.poster import post_d3_reel
from reelforge.pipeline.workflow_state import WorkflowState

router = APIRouter(prefix="/d3", tags=["D3 Pipeline (@noori.shed)"])


class D3BuildRequest(BaseModel):
    slot: str = Field(default="a", description="Pipeline slot: 'a' (morning) or 'b' (afternoon)")
    date: Optional[str] = Field(default=None, description="Date partition (YYYY-MM-DD)")
    theme: Optional[str] = Field(default=None, description="Theme override (loss, yaadein, waqt, tanhai, dard)")
    category: Optional[str] = Field(default=None, description="Nature footage category override")
    run_in_background: bool = Field(default=True, description="Run build in background thread")


class D3PostRequest(BaseModel):
    date: Optional[str] = Field(default=None, description="Expected date partition (YYYY-MM-DD)")
    dry_run: bool = Field(default=False, description="Simulate publish without external network call")
    run_in_background: bool = Field(default=False, description="Run publish in background thread")


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
            progress_callback(0.1, f"Starting D3 build for slot {req.slot.upper()}...")
        res = build_d3_reel(
            slot=req.slot,
            target_date=req.date,
            theme_override=req.theme,
            category_override=req.category,
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

