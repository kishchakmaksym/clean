#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
    echo "Copy .env.example to .env and fill secrets first."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required on the VPS."
    exit 1
fi

docker compose --env-file .env up -d --build --remove-orphans
docker compose ps

echo "Smart Clean is running on port 80."
echo "Point smartclean.com.ua DNS A-record to this server, then add HTTPS (see deploy/ssl/README.txt)."
