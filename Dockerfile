# Multi-stage Production Dockerfile for Instora
FROM ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Install Python 3.12, FFmpeg, curl, and essential tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    curl \
    git \
    ffmpeg \
    ca-certificates \
    && add-apt-repository -y ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3.12-venv \
    python3.12-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set python3 alias
RUN ln -sf /usr/bin/python3.12 /usr/bin/python3 && ln -sf /usr/bin/python3.12 /usr/bin/python

# Install standalone yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Install Python dependencies
COPY requirements.txt pyproject.toml ./
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
    && /app/.venv/bin/pip install --no-cache-dir -r requirements.txt \
    && /app/.venv/bin/pip install --no-cache-dir -e .

# Install and build Next.js Frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci --only=production --legacy-peer-deps || npm install --legacy-peer-deps
COPY web/ ./
RUN npm run build

WORKDIR /app
COPY . .

# Make start script executable
RUN chmod +x /app/start.sh

# Ensure persistent mount directories exist
RUN mkdir -p db swap/ready_to_post output cache config assets/backgrounds assets/music

EXPOSE 8001 3001

CMD ["/app/start.sh"]
