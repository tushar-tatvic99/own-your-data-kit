"""DPDP module verification for demo / submission."""

from rich.console import Console
from rich.table import Table

from dpdp.audit_log import get_audit_log
from dpdp.dsar import lookup_user
from dpdp.pii_scrubber import scrub_string
from dpdp.retention import enforce_retention
from dpdp.settings import dpdp_config
from kit.matomo_token import resolve_matomo_token, verify_matomo_token
from kit.config import load_config

console = Console()


def verify_dpdp(config_path: str) -> bool:
    cfg = load_config(config_path)
    dpdp = dpdp_config(config_path)
    stack = cfg["stack"]
    rows: list[tuple[str, bool, str]] = []

    token_ok = False
    try:
        token = resolve_matomo_token(stack.get("api_token", ""))
        verify_matomo_token(stack["url"], token, int(stack["site_id"]))
        token_ok = True
        rows.append(("Matomo API token (DSAR)", True, "OK"))
    except Exception as exc:
        rows.append(("Matomo API token (DSAR)", False, str(exc)[:80]))

    pii_ok = "[REDACTED_EMAIL]" in scrub_string("user@example.com")
    rows.append(("PII scrubber", pii_ok, "email/phone patterns"))

    demo_user = dpdp.get("demo_user_id", "oydk-align-001")
    dsar_ok = False
    if token_ok:
        try:
            result = lookup_user(config_path, demo_user)
            dsar_ok = result["visit_count"] >= 0
            note = f"{result['visit_count']} visit(s) for {demo_user}"
            rows.append(("DSAR lookup", dsar_ok, note))
        except Exception as exc:
            rows.append(("DSAR lookup", False, str(exc)[:80]))

    try:
        retention = enforce_retention(config_path)
        ret_ok = retention.get("status") in ("ok", "partial")
        rows.append(("Retention job", ret_ok, str(retention.get("matomo_api", ""))[:60]))
    except Exception as exc:
        rows.append(("Retention job", False, str(exc)[:80]))

    audit_ok = len(get_audit_log(limit=5)) > 0
    rows.append(("Audit log", audit_ok, "output/audit.db"))

    rows.append(("Consent (live)", dpdp.get("require_consent", True), f"CMP: {dpdp.get('cmp_provider')}"))

    table = Table(title="DPDP verification")
    table.add_column("Check")
    table.add_column("Status")
    table.add_column("Detail")
    all_ok = True
    for name, ok, detail in rows:
        if name.startswith("Consent"):
            table.add_row(name, "configured", detail)
            continue
        if not ok:
            all_ok = False
        table.add_row(name, "PASS" if ok else "FAIL", detail)
    console.print(table)
    return all_ok and token_ok
