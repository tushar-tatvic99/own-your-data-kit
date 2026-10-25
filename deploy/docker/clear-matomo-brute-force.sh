#!/bin/bash
# Clear Matomo Login brute-force lock (e.g. after many 401s with a missing/wrong API token).
set -euo pipefail
DB_PASS="${MYSQL_PASSWORD:-change-me-matomo}"
sudo docker exec docker_db_1 mysql -umatomo -p"${DB_PASS}" matomo -e "TRUNCATE matomo_brute_force_log;"
echo "Cleared matomo_brute_force_log"
