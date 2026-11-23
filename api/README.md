# Instora Studio API

FastAPI backend service exposing the automated Instora generation, review, publishing, and footage management engines.

---

## 🚀 Quickstart

### 1. Start the API Server

Using the `instora` CLI:
```bash
instora api --port 8000 --reload
```

Or directly using Uvicorn:
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Interactive Documentation
Once started, visit:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 🔒 Authentication

API key protection is configured via `.env`:
```bash
REELFORGE_API_KEY=rf_secret_key_here
```

When configured, requests must supply the key through any of the following methods:
1. **HTTP Header:** `X-API-Key: <your_key>`
2. **Bearer Token:** `Authorization: Bearer <your_key>`
3. **URL Query Param:** `?api_key=<your_key>` *(ideal for browser `<video>` and `<img>` tags)*

> **Note:** If `REELFORGE_API_KEY` (or `API_KEY`) is not set in `.env`, authentication is automatically bypassed for local development. `/health`, `/docs`, `/redoc`, and `/openapi.json` are always public.

---

## 🌐 CORS & Static Files

- **CORS:** Configured for `localhost:3000` (Next.js dashboard), `localhost:5173`, `localhost:8000`, and all localhost origins.
- **Static Video & Assets:**
  - Reel video files and frames: `/static/output/...`
  - Background footage clips: `/static/assets/...`
  - Dedicated media routes with HTTP Range support (`206 Partial Content`):
    - `GET /reels/{id}/video`
    - `GET /reels/{id}/thumbnail` (auto-extracts 1s frame on the fly if needed)

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| **GET** | `/health` | System health check (DB, FFmpeg, Gemini, Instagram, active jobs) |
| **GET** | `/reels` | List generated reels with filters (`status`, `theme`, `date`, `limit`, `offset`) |
| **GET** | `/reels/{id}` | Detailed reel metadata, duration, file size, and publish history |
| **GET** | `/reels/{id}/video` | Stream video file with partial range seeking support |
| **GET** | `/reels/{id}/thumbnail` | Serve or auto-extract JPEG thumbnail |
| **POST** | `/reels/generate` | Bulk quote & reel generation (as background job or synchronous) |
| **POST** | `/reels/{id}/approve` | Mark reel as approved for scheduled Instagram publication |
| **POST** | `/reels/{id}/discard` | Move reel to `output/_rejected/` and mark as discarded |
| **POST** | `/reels/{id}/regenerate` | Re-render reel with new background clip keeping quote text |
| **GET** | `/quotes` | List generated quotes with theme, language, and usage count |
| **GET** | `/clips` | List background clips with provider (`local_folder`, `gdrive`, `pexels`) and usage metrics |
| **GET** | `/schedule` | Publishing queue counts (pending, approved, published) and recommended date |
| **GET** | `/settings` | Retrieve active settings and environment credentials status |
| **PUT** | `/settings` | Update runtime settings in `config.yaml` |
| **GET** | `/publish-log` | View Instagram publishing history and Meta Graph media IDs |
| **POST** | `/publish/{id}` | Upload and publish reel to Instagram via Graph API (or `--dry-run`) |
| **GET** | `/jobs` | List recent background generation and publishing jobs |
| **GET** | `/jobs/{id}` | Poll background job progress, status (`queued`, `running`, `completed`, `failed`), and logs |

---

## 📋 cURL Examples

### 1. Health Check
```bash
curl -X GET "http://localhost:8000/health"
```
**Response:**
```json
{
  "status": "ok",
  "app_name": "Instora",
  "version": "0.1.0",
  "database_connected": true,
  "ffmpeg_available": true,
  "gemini_api_key_configured": true,
  "background_provider": "local_folder",
  "storage_provider": "supabase",
  "instagram_configured": true,
  "active_background_jobs": 0
}
```

### 2. List Reels
```bash
curl -X GET "http://localhost:8000/reels?status=completed&limit=5" \
  -H "X-API-Key: rf_secret_key_here"
```

### 3. Generate 5 Reels (Background Task)
```bash
curl -X POST "http://localhost:8000/reels/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rf_secret_key_here" \
  -d '{
    "count": 5,
    "theme": "hope",
    "lang": "en",
    "style": "styles/degraaf.yaml",
    "run_in_background": true
  }'
```
**Response:**
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "type": "generate",
  "status": "queued",
  "message": "Batch generation task initiated in background.",
  "progress": 0.0,
  "created_at": "2026-11-20T22:30:00Z",
  "poll_url": "/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

### 4. Poll Job Status
```bash
curl -X GET "http://localhost:8000/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \
  -H "X-API-Key: rf_secret_key_here"
```

### 5. Approve Reel
```bash
curl -X POST "http://localhost:8000/reels/1/approve" \
  -H "X-API-Key: rf_secret_key_here"
```

### 6. Discard Reel
```bash
curl -X POST "http://localhost:8000/reels/1/discard" \
  -H "X-API-Key: rf_secret_key_here"
```

### 7. Publish Reel to Instagram (Dry Run)
```bash
curl -X POST "http://localhost:8000/publish/1" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rf_secret_key_here" \
  -d '{"dry_run": true, "run_in_background": true}'
```

### 8. Update Settings
```bash
curl -X PUT "http://localhost:8000/settings" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rf_secret_key_here" \
  -d '{
    "theme": "gratitude",
    "background_provider": "local_folder",
    "count": 10
  }'
```

