#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "============================================="
echo "  Starting Instora Services (Split Layout)"
echo "============================================="

if [ -f "/etc/ssl/certs/ca-certificates.crt" ]; then
    export SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt"
    export REQUESTS_CA_BUNDLE="/etc/ssl/certs/ca-certificates.crt"
fi

# Ensure required runtime directories exist inside backend/
mkdir -p \
    "$BACKEND_DIR/db" \
    "$BACKEND_DIR/swap/ready_to_post" \
    "$BACKEND_DIR/output" \
    "$BACKEND_DIR/cache" \
    "$BACKEND_DIR/config" \
    "$BACKEND_DIR/assets/backgrounds" \
    "$BACKEND_DIR/assets/music"

PYTHON_BIN="python3"
if [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
fi

# Initialize SQLite database schema if missing
if [ ! -f "$BACKEND_DIR/db/instora.db" ]; then
    echo "Initializing database schema..."
    (cd "$BACKEND_DIR" && "$PYTHON_BIN" -c "from instora.db import init_db; init_db('db/instora.db')") || true
fi

# Graceful cleanup on termination
cleanup() {
    echo "Terminating services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "[1/2] Starting FastAPI Backend from ./backend on http://0.0.0.0:8001..."
(cd "$BACKEND_DIR" && "$PYTHON_BIN" -m uvicorn api.main:app --host 0.0.0.0 --port 8001) &
BACKEND_PID=$!

echo "[2/2] Starting Next.js Frontend from ./frontend on http://0.0.0.0:3001..."
(cd "$FRONTEND_DIR" && BACKEND_URL="http://127.0.0.1:8001" NODE_OPTIONS="--max-old-space-size=1024" npm run start -- -p 3001) &
FRONTEND_PID=$!

echo "============================================="
echo "  Instora is live!"
echo "  - Web Dashboard:  http://localhost:3001"
echo "  - Backend API:    http://localhost:8001"
echo "  - API Swagger:    http://localhost:8001/docs"
echo "============================================="

wait $BACKEND_PID $FRONTEND_PID
