#!/bin/bash
set -euo pipefail

apt-get update
apt-get install -y docker.io docker-compose-plugin git

systemctl enable docker
systemctl start docker

# Clone or copy kit (in production, pull from Tatvic registry)
KIT_DIR=/opt/own-your-data-kit
if [ ! -d "$KIT_DIR" ]; then
  mkdir -p "$KIT_DIR"
fi

# Placeholder — deploy script copies files via gcloud scp after terraform
echo "Analytics kit startup complete for ${client_name}"
