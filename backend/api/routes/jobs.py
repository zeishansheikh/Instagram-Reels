"""Background jobs status polling and management endpoints."""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from api.auth import verify_api_key
from api.jobs import Job, job_manager
from api.models import JobDetailResponse, JobResponse

router = APIRouter(prefix="/jobs", tags=["Jobs & Status Polling"])


def _to_job_response(job: Job) -> JobResponse:
    return JobResponse(
        job_id=job.id,
        type=job.type,
        status=job.status.value,
        message=job.message,
        progress=job.progress,
        created_at=job.created_at,
        poll_url=f"/jobs/{job.id}",
    )


def _to_job_detail(job: Job) -> JobDetailResponse:
    return JobDetailResponse(
        job_id=job.id,
        type=job.type,
        status=job.status.value,
        message=job.message,
        progress=job.progress,
        created_at=job.created_at,
        poll_url=f"/jobs/{job.id}",
        params=job.params,
        result=job.result,
        error=job.error,
        logs=job.logs,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )


@router.get("", response_model=List[JobResponse], summary="List recent background jobs")
def list_jobs(
    limit: int = Query(50, ge=1, le=100),
    _: bool = Depends(verify_api_key),
) -> List[JobResponse]:
    """Retrieve list of background generation and publish tasks."""
    jobs = job_manager.list_jobs(limit=limit)
    return [_to_job_response(j) for j in jobs]


@router.get("/{id}", response_model=JobDetailResponse, summary="Poll background job status and logs")
def get_job(
    id: str,
    _: bool = Depends(verify_api_key),
) -> JobDetailResponse:
    """Poll job status, progress percentage, execution logs, and output results."""
    job = job_manager.get_job(id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{id}' not found.",
        )
    return _to_job_detail(job)

