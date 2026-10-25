#!/usr/bin/env python3
import re
import sys
import json
import urllib.parse
import urllib.request

env_path = sys.argv[1] if len(sys.argv) > 1 else "/home/tushar_tatvic_com/own-your-data-kit/deploy/docker/.env"
matomo = "https://matomo.35-234-210-199.nip.io"
text = open(env_path, encoding="utf-8").read()
token = re.search(r"^MATOMO_API_TOKEN=(.+)$", text, re.M).group(1).strip()
url = matomo + "/index.php?" + urllib.parse.urlencode(
    {"module": "API", "method": "API.getMatomoVersion", "format": "JSON", "token_auth": token}
)
try:
    with urllib.request.urlopen(url, timeout=30) as resp:
        print("OK", json.loads(resp.read().decode()))
except Exception as exc:
    print("FAIL", type(exc).__name__, exc)
    sys.exit(1)
