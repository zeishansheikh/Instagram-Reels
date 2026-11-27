"""In-memory background job runner with thread pool execution and status polling."""

from __future__ import annotations

import threading
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from loguru import logger
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "generate" | "publish" | "regenerate"
    status: JobStatus = JobStatus.QUEUED
    progress: float = 0.0  # 0.0 to 1.0
    message: str = "Job queued"
    params: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[Any] = None
    error: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    def add_log(self, text: str) -> None:
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        self.logs.append(f"[{ts}] {text}")


class JobManager:
    """Thread-safe background job manager."""

    def __init__(self, max_workers: int = 4):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="instora_worker")

    def create_job(
        self,
        job_type: str,
        params: Dict[str, Any],
        worker_fn: Callable[..., Any],
        *args: Any,
        **kwargs: Any,
    ) -> Job:
        """Create and queue a new background task."""
        job = Job(type=job_type, params=params)
        with self._lock:
            self._jobs[job.id] = job

        job.add_log(f"Job {job.id} ({job.type}) queued.")
        self._executor.submit(self._run_job, job.id, worker_fn, *args, **kwargs)
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 50) -> List[Job]:
        with self._lock:
            # Sort by creation time descending
            jobs = list(self._jobs.values())
            jobs.sort(key=lambda j: j.created_at, reverse=True)
            return jobs[:limit]

    def _run_job(self, job_id: str, worker_fn: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.status = JobStatus.RUNNING
            job.started_at = datetime.now(timezone.utc).isoformat()
            job.message = "Job in progress..."
            job.add_log("Execution started.")

        try:
            # Inject a progress reporting callback if worker_fn accepts it
            def progress_callback(progress: float, message: str) -> None:
                with self._lock:
                    job.progress = max(0.0, min(1.0, progress))
                    job.message = message
                    job.add_log(message)

            # Check if progress_callback in kwargs or callable signature
            res = worker_fn(*args, progress_callback=progress_callback, **kwargs)

            with self._lock:
                job.status = JobStatus.COMPLETED
                job.progress = 1.0
                job.result = res
                job.message = "Job completed successfully."
                job.completed_at = datetime.now(timezone.utc).isoformat()
                job.add_log("Job finished successfully.")
                logger.info(f"Background job {job_id} ({job.type}) finished successfully.")

        except TypeError:
            # If worker_fn does not accept progress_callback, run without it
            try:
                res = worker_fn(*args, **kwargs)
                with self._lock:
                    job.status = JobStatus.COMPLETED
                    job.progress = 1.0
                    job.result = res
                    job.message = "Job completed successfully."
                    job.completed_at = datetime.now(timezone.utc).isoformat()
                    job.add_log("Job finished successfully.")
                    logger.info(f"Background job {job_id} ({job.type}) finished successfully.")
            except Exception as exc:
                self._handle_failure(job, exc)
        except Exception as exc:
            self._handle_failure(job, exc)

    def _handle_failure(self, job: Job, exc: Exception) -> None:
        err_msg = str(exc)
        tb = traceback.format_exc()
        logger.error(f"Job {job.id} failed: {err_msg}\n{tb}")
        with self._lock:
            job.status = JobStatus.FAILED
            job.error = err_msg
            job.message = f"Failed: {err_msg}"
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.add_log(f"ERROR: {err_msg}")


# Global job manager instance
job_manager = JobManager(max_workers=3)

