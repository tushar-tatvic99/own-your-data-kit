#!/bin/bash
set -euo pipefail

# 1. System packages & Docker installation
# Debian 12 has no docker-compose-plugin package, so use Docker's apt repository
apt-get update
apt-get install -y ca-certificates curl git unattended-upgrades jq
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

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
