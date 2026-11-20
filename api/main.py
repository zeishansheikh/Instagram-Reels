"""FastAPI application entrypoint for Reel Forge Studio."""

from __future__ import annotations

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from api.routes import clips, health, jobs, publish, quotes, reels, schedule, settings
from reelforge.config import load_config
from reelforge.db import init_db

# Ensure database and necessary directories exist on startup
cfg = load_config()
init_db(cfg.paths.db_path)
Path(cfg.paths.output_dir).mkdir(parents=True, exist_ok=True)
Path(cfg.paths.backgrounds_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Reel Forge Studio API",
    description="""
### Reel Forge Studio API
Automated Calm Nature Quote Instagram Reels Engine & Publishing Backend.

* **Reels**: List, filter, inspect, stream video, extract thumbnails, and review (keep / discard / regenerate).
* **Generation**: Bulk AI quote generation, deduplication, background footage selection, and rendering with background job polling.
* **Footage & Quotes**: Browse background clips with usage tracking and inspect generated quote pools.
* **Publishing**: Upload to cloud storage (Supabase / R2) and publish to Instagram Reels via Meta Graph API.
* **Settings & Schedule**: Runtime configuration update and queue management.
    """,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 1. CORS Configuration for localhost and web dashboards
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Static File Serving for Reels and Background Footage
output_path = Path("output")
output_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/output", StaticFiles(directory=str(output_path)), name="output_static")

assets_path = Path("assets")
assets_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/assets", StaticFiles(directory=str(assets_path)), name="assets_static")

# 3. Register Routers
app.include_router(health.router)
app.include_router(reels.router)
app.include_router(quotes.router)
app.include_router(clips.router)
app.include_router(schedule.router)
app.include_router(settings.router)
app.include_router(publish.router)
app.include_router(jobs.router)


@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect API root to interactive OpenAPI Swagger docs."""
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)

