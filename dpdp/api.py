"""Kit API — DSAR endpoints, audit log, backup trigger."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from dpdp.audit_log import get_audit_log, log_action
from dpdp.dsar import delete_user, lookup_user


class KitAPIHandler(BaseHTTPRequestHandler):
    def _json_response(self, status: int, data: dict) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        if self.path == "/health":
            self._json_response(200, {"status": "ok"})
        elif self.path == "/audit":
            self._json_response(200, {"entries": get_audit_log()})
        else:
            self._json_response(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if self.path == "/dsar/lookup":
            result = lookup_user("config/client.yaml", body["user_id"])
            self._json_response(200, result)

        elif self.path == "/dsar/delete":
            result = delete_user("config/client.yaml", body["user_id"])
            self._json_response(200, result)

        elif self.path == "/internal/backup":
            try:
                from kit.backup import execute_backup
                result = execute_backup("config/client.yaml")
                self._json_response(200, result)
            except Exception as e:
                self._json_response(500, {"status": "error", "message": str(e)})

        else:
            self._json_response(404, {"error": "not found"})


def main():
    server = HTTPServer(("0.0.0.0", 8090), KitAPIHandler)
    print("Kit API listening on :8090")
    server.serve_forever()


if __name__ == "__main__":
    main()
