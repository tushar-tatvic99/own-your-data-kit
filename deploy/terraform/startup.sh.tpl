#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose git

systemctl enable docker
systemctl start docker

KIT_DIR=/opt/own-your-data-kit
mkdir -p "$KIT_DIR"

echo "Analytics kit startup complete for ${client_name}"
