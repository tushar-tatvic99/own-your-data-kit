#!/usr/bin/env bash
# One-command deployment for Own-Your-Data Analytics Kit
# Usage: ./deploy/deploy.sh <gcp-project-id> [client-name]
# Env:   SCALE_PROFILE=small|standard|enterprise (default: standard)
set -euo pipefail

PROJECT_ID="${1:?Usage: deploy.sh <gcp-project-id> [client-name]}"
CLIENT_NAME="${2:-demo}"
SCALE_PROFILE="${SCALE_PROFILE:-standard}"
REGION="asia-south1"
ZONE="asia-south1-a"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
KIT_REMOTE="/opt/own-your-data-kit"

case "$SCALE_PROFILE" in
  small|standard|enterprise) ;;
  *) echo "Invalid SCALE_PROFILE=$SCALE_PROFILE (use small|standard|enterprise)"; exit 1 ;;
esac

echo "========================================"
echo " Own-Your-Data Analytics Kit — Deploy"
echo " Project: $PROJECT_ID"
echo " Client:  $CLIENT_NAME"
echo " Profile: $SCALE_PROFILE"
echo " Region:  $REGION (India)"
echo "========================================"

# 1. Enable GCP APIs
echo "[1/7] Enabling GCP APIs..."
gcloud services enable compute.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  monitoring.googleapis.com \
  cloudscheduler.googleapis.com \
  bigquery.googleapis.com \
  tagmanager.googleapis.com \
  analyticsadmin.googleapis.com \
  --project="$PROJECT_ID"

# 2. Terraform infrastructure
echo "[2/7] Provisioning infrastructure..."
cd "$SCRIPT_DIR/terraform"
terraform init -input=false
# One Terraform workspace per client so a new slug never replaces another client
terraform workspace select -or-create=true "$CLIENT_NAME"
terraform apply -auto-approve \
  -var="project_id=$PROJECT_ID" \
  -var="client_name=$CLIENT_NAME" \
  -var="region=$REGION" \
  -var="zone=$ZONE" \
  -var="scale_profile=$SCALE_PROFILE"

ANALYTICS_IP=$(terraform output -raw analytics_ip)
BACKUP_BUCKET=$(terraform output -raw backup_bucket)
MATOMO_URL=$(terraform output -raw matomo_url)
MACHINE_TYPE=$(terraform output -raw machine_type)
DISK_GB=$(terraform output -raw disk_size_gb)
MATOMO_HOST="matomo.${ANALYTICS_IP//./-}.nip.io"

# 3. Copy kit files to server
echo "[3/7] Copying kit to server..."
gcloud compute ssh "${CLIENT_NAME}-analytics" --zone="$ZONE" --project="$PROJECT_ID" \
  --command="sudo mkdir -p $KIT_REMOTE && sudo chown -R \$(whoami):\$(whoami) $KIT_REMOTE"

gcloud compute scp --recurse \
  "$ROOT_DIR/deploy" "$ROOT_DIR/kit" "$ROOT_DIR/agents" "$ROOT_DIR/dpdp" \
  "$ROOT_DIR/connectors" "$ROOT_DIR/config" "$ROOT_DIR/requirements.txt" "$ROOT_DIR/docs" \
  "${CLIENT_NAME}-analytics:${KIT_REMOTE}/" \
  --zone="$ZONE" --project="$PROJECT_ID"

# 4. Configure and start Docker stack
echo "[4/7] Starting Matomo + kit services..."
gcloud compute ssh "${CLIENT_NAME}-analytics" \
  --zone="$ZONE" --project="$PROJECT_ID" \
  --command="set -e
cd ${KIT_REMOTE}/deploy/docker
cp -n .env.example .env || true
grep -q MATOMO_PUBLIC_HOST .env || echo MATOMO_PUBLIC_HOST=$MATOMO_HOST >> .env
if command -v docker-compose >/dev/null; then DC=docker-compose; else DC='docker compose'; fi
sudo \$DC up -d --build
[ -f matomo-https-config.sh ] && sudo ./matomo-https-config.sh || true"

# 5. Wait for Matomo
echo "[5/7] Waiting for Matomo..."
for i in $(seq 1 36); do
  if curl -sf "$MATOMO_URL" > /dev/null 2>&1; then
    echo "Matomo is up at $MATOMO_URL"
    break
  fi
  echo "  Waiting... ($i/36)"
  sleep 10
done

# 6. Kit API smoke test
echo "[6/7] Smoke test Kit API..."
curl -sf "http://${ANALYTICS_IP}:8090/health" && echo "Kit API: OK" || echo "Kit API: not ready yet"

# 7. Summary + checklist
echo "[7/7] Deployment complete!"
bash "$SCRIPT_DIR/post-deploy-checklist.sh" \
  "$PROJECT_ID" "$CLIENT_NAME" "$SCALE_PROFILE" \
  "$MACHINE_TYPE" "$DISK_GB" "$ANALYTICS_IP" "$MATOMO_URL" "$BACKUP_BUCKET" "$ROOT_DIR"
