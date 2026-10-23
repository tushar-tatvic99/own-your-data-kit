#!/usr/bin/env bash
# One-command deployment for Own-Your-Data Analytics Kit
# Usage: ./deploy/deploy.sh <gcp-project-id> [client-name]
set -euo pipefail

PROJECT_ID="${1:?Usage: deploy.sh <gcp-project-id> [client-name]}"
CLIENT_NAME="${2:-demo}"
REGION="asia-south1"
ZONE="asia-south1-a"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================"
echo " Own-Your-Data Analytics Kit — Deploy"
echo " Project: $PROJECT_ID"
echo " Client:  $CLIENT_NAME"
echo " Region:  $REGION (India)"
echo "========================================"

# 1. Enable GCP APIs
echo "[1/6] Enabling GCP APIs..."
gcloud services enable compute.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  monitoring.googleapis.com \
  cloudscheduler.googleapis.com \
  bigquery.googleapis.com \
  --project="$PROJECT_ID"

# 2. Terraform infrastructure
echo "[2/6] Provisioning infrastructure..."
cd "$SCRIPT_DIR/terraform"
terraform init -input=false
terraform apply -auto-approve \
  -var="project_id=$PROJECT_ID" \
  -var="client_name=$CLIENT_NAME" \
  -var="region=$REGION" \
  -var="zone=$ZONE"

ANALYTICS_IP=$(terraform output -raw analytics_ip)
echo "Analytics server IP: $ANALYTICS_IP"

# 3. Copy kit files to server
echo "[3/6] Copying kit to server..."
gcloud compute scp --recurse \
  "$ROOT_DIR/deploy/docker" \
  "$ROOT_DIR/kit" "$ROOT_DIR/agents" "$ROOT_DIR/dpdp" \
  "$ROOT_DIR/connectors" "$ROOT_DIR/config" "$ROOT_DIR/requirements.txt" \
  "${CLIENT_NAME}-analytics:/opt/own-your-data-kit/" \
  --zone="$ZONE" --project="$PROJECT_ID"

# 4. Start Docker stack
echo "[4/6] Starting Matomo + kit services..."
gcloud compute ssh "${CLIENT_NAME}-analytics" \
  --zone="$ZONE" --project="$PROJECT_ID" \
  --command="cd /opt/own-your-data-kit/docker && \
    cp .env.example .env && \
    docker compose up -d --build"

# 5. Wait for Matomo
echo "[5/6] Waiting for Matomo to be ready..."
for i in $(seq 1 30); do
  if curl -sf "http://${ANALYTICS_IP}:8080" > /dev/null 2>&1; then
    echo "Matomo is up!"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 10
done

# 6. Output summary
echo "[6/6] Deployment complete!"
cd "$SCRIPT_DIR/terraform"
terraform output

echo ""
echo "NEXT STEPS:"
echo "  1. Open http://${ANALYTICS_IP}:8080 — complete Matomo setup wizard"
echo "  2. Copy config/example.client.yaml to config/client.yaml and fill in values"
echo "  3. Run migration:  python -m agents.migration.run --config config/client.yaml"
echo "  4. Run parity:      python -m agents.parity.run --config config/client.yaml"
