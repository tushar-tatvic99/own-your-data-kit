#!/bin/bash
set -euo pipefail
ENV="/home/tushar_tatvic_com/own-your-data-kit/deploy/docker/.env"
TOKEN="$1"
MATOMO="${MATOMO_URL:-https://matomo.35-234-210-199.nip.io}"
curl -sf -X POST "${MATOMO}/index.php" \
  -d "module=API&method=API.getMatomoVersion&format=JSON&token_auth=${TOKEN}" >/dev/null \
  || { echo "Token invalid" >&2; exit 1; }
sudo sed -i "s/^MATOMO_API_TOKEN=.*/MATOMO_API_TOKEN=${TOKEN}/" "$ENV"
cd /home/tushar_tatvic_com/own-your-data-kit/deploy/docker
sudo docker-compose up -d kit-api kit-scheduler
echo "VM MATOMO_API_TOKEN updated and kit services restarted."
