"""Kit API — DSAR endpoints, audit log, backup trigger, scheduled parity."""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from kit.env import load_kit_env

load_kit_env()

from dpdp.audit_log import get_audit_log, log_action
from dpdp.dsar import delete_user, export_user, lookup_user
from dpdp.erasure import process_erasure
from dpdp.retention import enforce_retention


class KitAPIHandler(BaseHTTPRequestHandler):
    def _json_response(self, status: int, data: dict) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        return json.loads(self.rfile.read(length))

    def do_GET(self):
        if self.path == "/health":
            self._json_response(200, {"status": "ok"})
        elif self.path == "/audit":
            self._json_response(200, {"entries": get_audit_log()})
        else:
            self._json_response(404, {"error": "not found"})

    def do_POST(self):
        body = self._read_json()

        if self.path == "/dsar/process-erasure":
            email = (body.get("email") or "").strip()
            if not email:
                self._json_response(400, {"error": "email required"})
                return
            result = process_erasure(
                "config/client.yaml",
                email=email,
                scope=body.get("scope", "full_erasure"),
                ticket_id=body.get("ticket_id") or body.get("ticketId") or "WEB-UNKNOWN",
                legal_hold=bool(body.get("legal_hold")),
                name=body.get("name"),
            )
            self._json_response(200, result)
            return

        if self.path in ("/dsar/lookup", "/dsar/export", "/dsar/delete"):
            user_id = body.get("user_id")
            if not user_id:
                self._json_response(400, {"error": "user_id required"})
                return
            if self.path == "/dsar/lookup":
                result = lookup_user("config/client.yaml", user_id)
            elif self.path == "/dsar/export":
                result = export_user("config/client.yaml", user_id)
            else:
                result = delete_user("config/client.yaml", user_id)
            self._json_response(200, result)
            return

        if self.path == "/internal/backup":
            log_action("system", "backup", "matomo-db", {"trigger": "scheduled"})
            self._json_response(200, {"status": "backup triggered", "script": "backup-to-gcs.sh"})

        elif self.path == "/internal/dpdp-audit":
            log_action(
                "web-dpdp-form",
                body.get("action", "erasure"),
                f"ticket:{body.get('ticket_id', 'unknown')}",
                details={
                    k: body[k]
                    for k in (
                        "visits_before",
                        "visits_deleted",
                        "legal_hold",
                        "email_domain",
                    )
                    if k in body
                },
            )
            self._json_response(200, {"status": "logged"})

        elif self.path == "/internal/retention":
            result = enforce_retention("config/client.yaml")
            self._json_response(200, result)

        elif self.path == "/internal/parity":
            date = body.get("date")

            def _run():
                from agents.parity.run import run_parity

                run_parity("config/client.yaml", date)

            threading.Thread(target=_run, daemon=True).start()
            self._json_response(202, {"status": "parity started", "date": date})

        else:
            self._json_response(404, {"error": "not found"})


def main():
    server = HTTPServer(("0.0.0.0", 8090), KitAPIHandler)
    print("Kit API listening on :8090")
    server.serve_forever()


if __name__ == "__main__":
    main()
