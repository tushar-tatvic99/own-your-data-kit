#!/bin/bash
# Daily Matomo MariaDB backup to GCS (run on VM via cron or kit-api /internal/backup).
set -euo pipefail
KIT_ROOT="${KIT_ROOT:-/opt/own-your-data-kit}"
ENV_FILE="${KIT_ROOT}/docker/.env"
DEPLOY_ENV="${KIT_ROOT}/.deploy.env"
source "$ENV_FILE" 2>/dev/null || true
if [ -f "$DEPLOY_ENV" ]; then source "$DEPLOY_ENV"; fi

BUCKET="${GCS_BACKUP_BUCKET:?Set GCS_BACKUP_BUCKET in .deploy.env}"
PROJECT="${GCP_PROJECT_ID:-tvc-int-matomo}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
TMP="/tmp/matomo-backup-${STAMP}.sql.gz"

COMPOSE="docker-compose"
if ! command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker compose"
fi

cd "${KIT_ROOT}/docker"
$COMPOSE exec -T db mysqldump -umatomo -p"${MYSQL_PASSWORD}" matomo | gzip -c > "$TMP"
gsutil cp "$TMP" "gs://${BUCKET}/matomo/${STAMP}.sql.gz"
rm -f "$TMP"
echo "Backup uploaded: gs://${BUCKET}/matomo/${STAMP}.sql.gz"
