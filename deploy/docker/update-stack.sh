#!/bin/bash
# Pull latest Matomo/Caddy images and restart (scheduled updates / maintenance).
set -euo pipefail
KIT_ROOT="${KIT_ROOT:-/opt/own-your-data-kit}"
COMPOSE="docker-compose"
if ! command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker compose"
fi
cd "${KIT_ROOT}/docker"
$COMPOSE pull matomo caddy db redis
$COMPOSE up -d
echo "Stack images updated and services restarted."
