#!/usr/bin/env bash
set -e

echo "============================================="
echo "  Starting Reel Forge Production Services"
echo "============================================="

# Activate virtual environment if present
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Ensure required runtime directories exist
mkdir -p db swap/ready_to_post output cache config assets/backgrounds assets/music

# Initialize SQLite database schema if missing
if [ ! -f "db/reelforge.db" ]; then
    echo "Initializing database schema..."
    python3 -c "import sqlite3; conn = sqlite3.connect('db/reelforge.db'); conn.execute('CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, text_hash TEXT NOT NULL UNIQUE, theme TEXT NOT NULL, lang TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, used INTEGER DEFAULT 0);'); conn.execute('CREATE TABLE IF NOT EXISTS clips (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL, path TEXT NOT NULL, last_used_at TIMESTAMP, use_count INTEGER DEFAULT 0);'); conn.execute('CREATE TABLE IF NOT EXISTS clip_segments (id INTEGER PRIMARY KEY AUTOINCREMENT, clip_id INTEGER, start_time REAL, end_time REAL, mood TEXT);'); conn.execute('CREATE TABLE IF NOT EXISTS reels (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id INTEGER, clip_id INTEGER, video_path TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, posted INTEGER DEFAULT 0);'); conn.execute('CREATE TABLE IF NOT EXISTS publish_log (id INTEGER PRIMARY KEY AUTOINCREMENT, reel_id INTEGER, slot TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status TEXT, permalink TEXT, media_id TEXT, error_message TEXT);'); conn.commit(); conn.close()" || true
fi

# Graceful cleanup on termination
cleanup() {
    echo "Terminating services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "[1/2] Starting FastAPI Backend on http://0.0.0.0:8001..."
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

echo "[2/2] Starting Next.js Web Frontend on http://0.0.0.0:3001..."
(cd web && npm run start -- -p 3001) &
FRONTEND_PID=$!

echo "============================================="
echo "  Reel Forge is live!"
echo "  - Web Dashboard:  http://localhost:3001"
echo "  - Backend API:    http://localhost:8001"
echo "  - API Swagger:    http://localhost:8001/docs"
echo "============================================="

wait $BACKEND_PID $FRONTEND_PID
