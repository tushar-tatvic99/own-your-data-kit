"""Run default-profile demo tests (migration, parity, DPDP, GA4 BQ import)."""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from demo.console.actions import run_action
from demo.console.dashboard import dpdp_dashboard
from demo.console.session import credential_status

CFG = "config/client.yaml"


def main() -> None:
    creds = credential_status(CFG)
    print("=== CREDENTIALS ===")
    print(json.dumps(creds, indent=2))

    mig = "migrate_live" if creds.get("live_migration_ready") else "migrate_fixture"
    print(f"\n=== MIGRATION ({mig}) ===")
    r = run_action(mig, CFG, {})
    print("status:", r["status"])
    print((r["stdout"] or "")[:4000])
    if r["stderr"]:
        print("stderr:", r["stderr"][:500])

    pa = "parity_live" if creds.get("live_parity_ready") else "parity_fixture_ok"
    print(f"\n=== PARITY LAST 2 DAYS ({pa}) ===")
    for days_ago in (1, 2):
        d = (datetime.now(timezone.utc) - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        r = run_action(pa, CFG, {"date": d})
        print(f"\n--- {d} status={r['status']} ---")
        print((r["stdout"] or "")[:2200])
        if r.get("result"):
            print("result:", r["result"])

    print("\n=== PARITY BREAK TAG (threshold alert demo) ===")
    r = run_action("parity_break_purchase", CFG, {})
    print((r["stdout"] or "")[:2800])
    print("result:", r.get("result"))

    print("\n=== DPDP ERASURE / DELETION ===")
    dp = dpdp_dashboard(CFG)
    erasures = [
        x
        for x in dp.get("audit_requests", [])
        if any(k in (x.get("action") or "").lower() for k in ("eras", "delete"))
    ]
    print(
        json.dumps(
            {
                "consent": dp.get("consent"),
                "shop_rights_requests": dp.get("rights_requests"),
                "erasure_audit": erasures,
            },
            indent=2,
            default=str,
        )[:5000]
    )

    print("\n=== GA4 BIGQUERY → MATOMO (fixture dry-run) ===")
    r = run_action("history_fixture_dry", CFG, {})
    print((r["stdout"] or "")[:2500])
    print("result:", r.get("result"))


if __name__ == "__main__":
    main()
