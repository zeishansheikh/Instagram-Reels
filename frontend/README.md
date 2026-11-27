# Instora Frontend (Next.js Dashboard & CapCut Workspace)

Standalone Next.js 14 frontend for the Instora Studio workspace.

## Local Development

```bash
cd frontend
npm install
cp .env.example .env.local   # set BACKEND_URL=http://127.0.0.1:8001
npm run dev -- -p 3001
```

Open `http://localhost:3001`.

## Standalone Deployment (Vercel / Netlify / Render / Docker)

All API requests (`/d3/*`, `/static/*`, `/settings-api/*`, `/reels/*`, `/jobs/*`, `/health`) are proxied via `next.config.mjs` to `BACKEND_URL` (or `NEXT_PUBLIC_API_URL`).

- **Vercel**:
  1. Import the repository and set **Root Directory** to `frontend`.
  2. Add Environment Variable: `BACKEND_URL=https://your-backend-url.onrender.com` (no trailing slash).
  3. Deploy.
- **Docker**:
  ```bash
  docker build --build-arg BACKEND_URL=https://your-backend-url.onrender.com -t instora-frontend .
  docker run -p 3000:3000 instora-frontend
  ```
