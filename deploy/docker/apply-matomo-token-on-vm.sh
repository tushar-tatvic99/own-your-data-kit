#!/bin/bash
set -euo pipefail
ENV="/home/tushar_tatvic_com/own-your-data-kit/deploy/docker/.env"
MATOMO_USER="${MATOMO_USER:-tushartatvic}"
TOKEN=$(sudo docker exec docker_matomo_1 php /var/www/html/matomo-create-api-token.php "$MATOMO_USER" "oydk-rotated-$(date +%Y%m%d)" | tr -d '\r\n')
if [ ${#TOKEN} -lt 16 ]; then
  echo "Token generation failed" >&2
  exit 1
fi
sudo sed -i "s/^MATOMO_API_TOKEN=.*/MATOMO_API_TOKEN=${TOKEN}/" "$ENV"
cd /home/tushar_tatvic_com/own-your-data-kit/deploy/docker
sudo docker-compose up -d kit-api kit-scheduler
# Store in Secret Manager if gcloud available
if command -v gcloud >/dev/null 2>&1; then
  echo -n "$TOKEN" | gcloud secrets versions add aurablush-matomo-api-token --data-file=- --project=tvc-int-matomo 2>/dev/null || true
fi
echo "MATOMO_API_TOKEN updated on VM (length ${#TOKEN}). Set the same value locally in your shell."
