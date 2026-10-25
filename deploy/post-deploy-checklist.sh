#!/usr/bin/env bash
# Short summary after deploy.sh (platform already live)
set -euo pipefail

CLIENT_NAME="${2:?}"
MATOMO_URL="${7:?}"
KIT_API="http://${6:?}:8090"
ROOT_DIR="${9:?}"
OUT_FILE="${ROOT_DIR}/output/deploy/${CLIENT_NAME}-post-deploy-checklist.md"

mkdir -p "${ROOT_DIR}/output/deploy"
cat > "$OUT_FILE" <<EOF
# ${CLIENT_NAME} — deploy complete

Platform is up. Matomo: ${MATOMO_URL} | Kit API: ${KIT_API}

Client onboarding (3 steps): Matomo wizard + token | client.yaml + GA SA | site tags -> migrate/parity

See docs/post-deploy-checklist.md
EOF

echo ""
echo "========================================"
echo " ONE-COMMAND DEPLOY: COMPLETE"
echo " Platform live. Client onboarding: 3 steps (~15 min)"
echo " Matomo: $MATOMO_URL"
echo " Saved: $OUT_FILE"
echo "========================================"
