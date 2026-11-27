# Instora Backend (FastAPI + FFmpeg D3 Pipeline)

Standalone Python FastAPI backend for generating, editing, and publishing Instagram Reels.

## Local Development

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt yt-dlp
.venv/bin/pip install -e .
cp .env.example .env   # add GEMINI_API_KEY, etc.
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt .venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

- API Docs: `http://127.0.0.1:8001/docs`
- Health: `http://127.0.0.1:8001/health`

## Standalone Deployment (Render / Railway / Docker / VPS)

This `backend/` directory contains its own `Dockerfile` and `render.yaml` (with FFmpeg + Python 3.12 + `yt-dlp`).

- **Render**: Create a Web Service with Root Directory = `backend` and Runtime = `Docker`.
- **Docker**:
  ```bash
  docker build -t instora-backend .
  docker run -p 8000:8000 --env-file .env instora-backend
  ```
