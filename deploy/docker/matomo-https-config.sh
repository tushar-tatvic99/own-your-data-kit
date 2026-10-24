#!/bin/bash
# Run on the VM after Caddy is up. Patches Matomo for HTTPS behind reverse proxy.
set -euo pipefail

HOST="${MATOMO_PUBLIC_HOST:-matomo.35-234-210-199.nip.io}"
CONTAINER="${MATOMO_CONTAINER:-docker_matomo_1}"
CFG="/var/www/html/config/config.ini.php"

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
