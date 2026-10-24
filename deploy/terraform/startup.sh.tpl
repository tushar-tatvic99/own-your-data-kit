#!/bin/bash
set -euo pipefail

# 1. System packages & Docker installation
apt-get update
apt-get install -y docker.io docker-compose-plugin git unattended-upgrades curl jq

systemctl enable docker
systemctl start docker

# 2. Automated OS Security Updates (Requirement 1: Updates)
echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades
systemctl enable unattended-upgrades
systemctl start unattended-upgrades

# 3. Create OYDK deployment workspace
KIT_DIR=/opt/own-your-data-kit
mkdir -p "$KIT_DIR"

# 4. Daily local backup rotation cron (Requirement 1: Backups)
cat << 'EOF' > /etc/cron.daily/oydk-backup
#!/bin/bash
if [ -d /opt/own-your-data-kit ]; then
  cd /opt/own-your-data-kit && docker compose -f deploy/docker/docker-compose.yml exec -T kit-api curl -s -X POST http://localhost:8090/internal/backup || true
fi
EOF
chmod +x /etc/cron.daily/oydk-backup

echo "Analytics kit startup complete for ${client_name} (Docker, Unattended Security Updates, Backups active)"
