"""Build and send daily parity report emails."""

import os
from typing import Any

from kit.notify_email import send_email, smtp_ready

# Aurablush / Tatvic demo distribution (used when YAML omits alert_emails)
DEFAULT_PARITY_ALERT_EMAILS = [
    "mohit@tatvic.com",
    "tushar@tatvic.com",
    "parshwa@tatvic.com",
    "dhruvi.p@tatvic.com",
    "prakash.katariya@tatvic.com",
]


def parity_recipients(cfg: dict) -> list[str]:
    parity = cfg.get("parity", {})
    raw = parity.get("alert_emails")
    emails: list[str] = []
    if raw:
        if isinstance(raw, str):
            emails = [e.strip() for e in raw.split(",") if e.strip()]
        else:
            emails = [str(e).strip() for e in raw if str(e).strip()]

    if not emails:
        single = (parity.get("alert_email") or "").strip()
        if single and "example.com" not in single.lower() and not single.startswith("you@"):
            emails = [single]

    if not emails:
        env = os.getenv("PARITY_ALERT_EMAILS", "")
        if env.strip():
            emails = [e.strip() for e in env.split(",") if e.strip()]

    if not emails:
        emails = list(DEFAULT_PARITY_ALERT_EMAILS)
    return emails


def _client_name(cfg: dict) -> str:
    return (cfg.get("client") or {}).get("name") or "analytics"


def build_parity_email(report: dict, client_name: str) -> tuple[str, str, str]:
    """Return (subject, plain_body, html_body) for daily parity report."""
    date = report.get("date") or "unknown"
    target = report.get("target_gap_percent", 5)
    gaps = report.get("gaps") or []
    missed = [g for g in gaps if not g.get("within_target")]
    n_miss = len(missed)
    all_ok = report.get("all_within_target", n_miss == 0)
    break_tag = report.get("simulated_break_tag")

    demo_prefix = "[DEMO] " if break_tag else ""
    if all_ok:
        subject = (
            f"{demo_prefix}[OYDK Parity] {client_name} — Daily report: "
            f"all within ±{target}% ({date})"
        )
    else:
        subject = (
            f"{demo_prefix}[OYDK Parity] {client_name} — {n_miss} metric(s) "
            f"above ±{target}% ({date})"
        )

    mode = report.get("mode", "live")
    intro_lines = [
        f"Daily GA4 vs Matomo parity report for {date}.",
        f"Threshold: ±{target}%. Mode: {mode}.",
    ]
    if break_tag:
        intro_lines.append(
            "⚠ Demo/simulation only (CLI --break-tag): not a production incident."
        )
        intro_lines.append(f"Simulated break: Matomo tag for '{break_tag}' not firing.")
    if all_ok:
        intro_lines.append("")
        intro_lines.append("All metrics are within target (OK in the table below).")
    else:
        intro_lines.append("")
        intro_lines.append(
            f"{n_miss} metric(s) exceed the threshold (MISS). "
            "See diagnosis and proposed fixes below."
        )
    intro = "\n".join(intro_lines)

    table_header = "| Metric | GA4 | Matomo | Gap % | Status |"
    table_sep = "|--------|-----|--------|-------|--------|"
    table_rows = []
    for g in gaps:
        status = "OK" if g.get("within_target") else "MISS"
        table_rows.append(
            f"| {g.get('metric')} | {g.get('ga4')} | {g.get('matomo')} | {g.get('gap_percent')}% | {status} |"
        )
    table_md = "\n".join([table_header, table_sep] + table_rows)

    diag_lines = []
    if report.get("diagnosis"):
        diag_lines.append("")
        diag_lines.append("Diagnosis & proposed fixes:")
        for d in report["diagnosis"]:
            diag_lines.append(f"- ({d['confidence']}) {d['cause']}")
            diag_lines.append(f"  Fix: {d['fix']}")

    plain = "\n".join([intro, "", "Metric comparison:", table_md] + diag_lines)
    plain += "\n\n— Own-Your-Data Analytics Kit (OYDK)"

    miss_style = ' style="background:#fde8e8;font-weight:bold"'
    html_rows = []
    for g in report["gaps"]:
        status = "OK" if g["within_target"] else "MISS"
        row_attr = miss_style if status == "MISS" else ""
        html_rows.append(
            f"<tr{row_attr}><td>{_esc(g['metric'])}</td>"
            f"<td align=\"right\">{g['ga4']}</td>"
            f"<td align=\"right\">{g['matomo']}</td>"
            f"<td align=\"right\">{g['gap_percent']}%</td>"
            f"<td>{status}</td></tr>"
        )

    diag_html = ""
    if report.get("diagnosis"):
        items = []
        for d in report["diagnosis"]:
            items.append(
                f"<li><strong>{_esc(d['confidence'])}</strong>: {_esc(d['cause'])}"
                f"<br><em>Proposed fix:</em> {_esc(d['fix'])}</li>"
            )
        diag_html = f"<h3>Diagnosis &amp; proposed fixes</h3><ul>{''.join(items)}</ul>"

    status_banner = ""
    if all_ok:
        status_banner = (
            '<p style="background:#e8f5e9;padding:10px;border-radius:6px">'
            "<strong>Status:</strong> All metrics within target.</p>"
        )
    else:
        status_banner = (
            '<p style="background:#fde8e8;padding:10px;border-radius:6px">'
            f"<strong>Action required:</strong> {n_miss} metric(s) above ±{target}% threshold.</p>"
        )

    html = f"""<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#222;max-width:720px">
<p>{_esc(intro.replace(chr(10), ' '))}</p>
{status_banner}
<h3>Metric comparison (threshold ±{target}%)</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
<thead><tr style="background:#f0f0f0">
<th>Metric</th><th>GA4</th><th>Matomo</th><th>Gap %</th><th>Status</th>
</tr></thead>
<tbody>
{''.join(html_rows)}
</tbody></table>
{diag_html}
<p style="color:#666;font-size:12px">Own-Your-Data Analytics Kit (OYDK) — scheduled daily parity</p>
</body></html>"""

    return subject, plain, html


def _esc(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def send_parity_report_email(cfg: dict, report: dict) -> dict[str, Any]:
    """Email daily parity report to alert_emails. Returns status dict."""
    parity = cfg.get("parity", {})
    if not parity.get("email_daily_report", True):
        return {"sent": False, "reason": "disabled"}

    recipients = parity_recipients(cfg)
    if not recipients:
        return {"sent": False, "reason": "no_recipients"}
    if not smtp_ready():
        return {"sent": False, "reason": "smtp_not_configured", "recipients": recipients}

    subject, plain, html = build_parity_email(report, _client_name(cfg))
    send_email(recipients, subject, plain, html)
    return {"sent": True, "recipients": recipients}


# Backwards-compatible alias
send_parity_alert_email = send_parity_report_email
