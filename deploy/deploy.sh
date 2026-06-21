#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
    echo "Missing .env file. Copy .env.example to .env and fill in secrets."
    exit 1
fi

echo "Pulling latest code..."
git pull --ff-only

echo "Building and starting containers..."
docker compose --env-file .env up -d --build --remove-orphans

echo "Done. Site: ${VITE_SITE_URL:-https://smartclean.com.ua}"
