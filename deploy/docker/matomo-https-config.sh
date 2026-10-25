#!/bin/bash
# Run on the VM after Caddy is up. Patches Matomo for HTTPS behind reverse proxy.
set -euo pipefail

ENV_FILE="$(dirname "$0")/.env"
if [ -z "${MATOMO_PUBLIC_HOST:-}" ] && [ -f "$ENV_FILE" ]; then
  MATOMO_PUBLIC_HOST="$(grep '^MATOMO_PUBLIC_HOST=' "$ENV_FILE" | cut -d= -f2-)"
fi
HOST="${MATOMO_PUBLIC_HOST:?MATOMO_PUBLIC_HOST not set and not found in $ENV_FILE}"
# Compose v1 names it docker_matomo_1, Compose v2 docker-matomo-1
CONTAINER="${MATOMO_CONTAINER:-$(docker ps --format '{{.Names}}' | grep -E '^docker[-_]matomo[-_]1$' | head -1)}"
CFG="/var/www/html/config/config.ini.php"

# Before the setup wizard has run there is no config to patch; writing one here
# would leave an empty root-owned file and Matomo would answer 500
if ! docker exec "$CONTAINER" test -s "$CFG"; then
  echo "Matomo not set up yet - complete the wizard, then re-run $0"
  exit 0
fi

docker exec "$CONTAINER" php -r "
\$f = '$CFG';
\$c = file_get_contents(\$f);
\$host = '$HOST';
if (strpos(\$c, 'assume_secure_protocol') === false) {
  \$c = preg_replace('/\\[General\\]/', \"[General]\\nassume_secure_protocol = 1\", \$c, 1);
}
if (strpos(\$c, 'HTTP_X_FORWARDED_FOR') === false) {
  \$c = preg_replace('/\\[General\\]/', \"[General]\\nproxy_client_headers[] = \\\"HTTP_X_FORWARDED_FOR\\\"\\nproxy_host_headers[] = \\\"HTTP_X_FORWARDED_HOST\\\"\", \$c, 1);
}
if (strpos(\$c, \$host) === false) {
  \$c = preg_replace('/\\[General\\]/', \"[General]\\ntrusted_hosts[] = \\\"\$host\\\"\", \$c, 1);
}
file_put_contents(\$f, \$c);
echo \"Updated Matomo config for HTTPS host: \$host\\n\";
"
