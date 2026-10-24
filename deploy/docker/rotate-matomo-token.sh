#!/bin/bash
set -euo pipefail
ENV="${1:-/home/tushar_tatvic_com/own-your-data-kit/deploy/docker/.env}"
MATOMO="${MATOMO_URL:-https://matomo.35-234-210-199.nip.io}"
OLD=$(grep '^MATOMO_API_TOKEN=' "$ENV" | cut -d= -f2-)
curl -sf "${MATOMO}/index.php?module=API&method=API.getMatomoVersion&format=JSON&token_auth=${OLD}" >/dev/null \
  || { echo "Current MATOMO_API_TOKEN invalid on ${MATOMO}" >&2; exit 1; }
USER=$(curl -sf "${MATOMO}/index.php?module=API&method=UsersManager.getUsers&format=JSON&token_auth=${OLD}" \
  | python3 -c "import sys,json; u=json.load(sys.stdin); print(u[0]['login'] if isinstance(u,list) and u else 'admin')")
NEW=$(curl -sf -G "${MATOMO}/index.php" \
  --data-urlencode "module=API" \
  --data-urlencode "method=UsersManager.createAppSpecificTokenAuth" \
  --data-urlencode "userLogin=${USER}" \
  --data-urlencode "description=oydk-rotated-$(date +%Y%m%d)" \
  --data-urlencode "expireDays=365" \
  --data-urlencode "format=JSON" \
  --data-urlencode "token_auth=${OLD}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('value','') if isinstance(d,dict) else d)")
if [ -z "$NEW" ]; then
  echo "Failed to create token: $NEW" >&2
  exit 1
fi
sed -i "s/^MATOMO_API_TOKEN=.*/MATOMO_API_TOKEN=${NEW}/" "$ENV"
DIR=$(dirname "$ENV")
(cd "$DIR" && sudo docker-compose up -d kit-api kit-scheduler)
echo "Token rotated for user ${USER}. Update local MATOMO_API_TOKEN from VM .env (not printed here)."
