"""Parity checker — compare GA4 vs Matomo, alert on gaps, diagnose causes."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from rich.console import Console
from rich.table import Table

from agents.parity.diagnosis import diagnose
from agents.parity.ga4_metrics import GA4Metrics
from dpdp.audit_log import log_action
from kit.config import load_config
from kit.matomo_client import MatomoClient

console = Console()


def _gap_percent(ga4_val: int, matomo_val: int) -> float:
    if ga4_val == 0 and matomo_val == 0:
        return 0.0
    baseline = max(ga4_val, 1)
    return abs(ga4_val - matomo_val) / baseline * 100


def run_parity(config_path: str, date: str | None = None) -> dict:
    """Run parity check for a given date."""
    cfg = load_config(config_path)
    parity_cfg = cfg["parity"]
    target_gap = parity_cfg["target_gap_percent"]

    if date is None:
        date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    console.print(f"\n[bold]Parity Check — {date}[/bold] (target: ±{target_gap}%)\n")

    # Fetch GA4 metrics
    ga4 = GA4Metrics(cfg["ga4"]["property_id"], cfg["ga4"]["credentials_file"])
    ga4_users_sessions = ga4.get_users_sessions(date)
    ga4_events = ga4.get_key_events(date, parity_cfg["key_events"])
    ga4_sources = ga4.get_traffic_sources(date)

    # Fetch Matomo metrics
    matomo = MatomoClient(cfg["stack"]["url"], cfg["stack"]["site_id"],
                           cfg["stack"]["api_token"])
    matomo_summary = matomo.get_visits_summary(period="day", date=date)
    matomo_events_raw = matomo.get_events(period="day", date=date)
    matomo_referrers = matomo.get_referrers(period="day", date=date)

    matomo_users = int(matomo_summary.get("nb_uniq_visitors", 0))
    matomo_sessions = int(matomo_summary.get("nb_visits", 0))

    # Compare
    gaps = []

    users_gap = _gap_percent(ga4_users_sessions["users"], matomo_users)
    gaps.append({
        "metric": "users",
        "ga4": ga4_users_sessions["users"],
        "matomo": matomo_users,
        "gap_percent": round(users_gap, 2),
        "within_target": users_gap <= target_gap,
    })

    sessions_gap = _gap_percent(ga4_users_sessions["sessions"], matomo_sessions)
    gaps.append({
        "metric": "sessions",
        "ga4": ga4_users_sessions["sessions"],
        "matomo": matomo_sessions,
        "gap_percent": round(sessions_gap, 2),
        "within_target": sessions_gap <= target_gap,
    })

    for event_name in parity_cfg["key_events"]:
        ga4_count = ga4_events.get(event_name, 0)
        matomo_count = sum(
            int(e.get("nb_events", 0))
            for e in matomo_events_raw
            if e.get("label", "").lower() == event_name.lower()
        )
        event_gap = _gap_percent(ga4_count, matomo_count)
        gaps.append({
            "metric": f"key_event:{event_name}",
            "ga4": ga4_count,
            "matomo": matomo_count,
            "gap_percent": round(event_gap, 2),
            "within_target": event_gap <= target_gap,
        })

    # Traffic sources — compare top channels
    ga4_total_sessions = sum(ga4_sources.values()) or 1
    matomo_total = sum(int(r.get("nb_visits", 0)) for r in matomo_referrers) or 1
    sources_gap = _gap_percent(ga4_total_sessions, matomo_total)
    gaps.append({
        "metric": "traffic_sources",
        "ga4": ga4_total_sessions,
        "matomo": matomo_total,
        "gap_percent": round(sources_gap, 2),
        "within_target": sources_gap <= target_gap,
    })

    # Display results
    table = Table(title=f"Parity Report — {date}")
    table.add_column("Metric", style="cyan")
    table.add_column("GA4", justify="right")
    table.add_column("Matomo", justify="right")
    table.add_column("Gap %", justify="right")
    table.add_column("Status")

    missed = []
    for g in gaps:
        status = "[green]OK[/green]" if g["within_target"] else "[red]MISS[/red]"
        table.add_row(g["metric"], str(g["ga4"]), str(g["matomo"]),
                      f"{g['gap_percent']}%", status)
        if not g["within_target"]:
            missed.append(g)

    console.print(table)

    # Diagnose if target missed
    report = {
        "date": date,
        "target_gap_percent": target_gap,
        "gaps": gaps,
        "all_within_target": len(missed) == 0,
        "diagnosis": [],
        "alert_sent": False,
    }

    if missed:
        console.print(f"\n[red bold]ALERT: {len(missed)} metric(s) exceeded ±{target_gap}% target[/red bold]\n")
        diagnoses = diagnose(missed)
        for d in diagnoses:
            console.print(f"  [yellow]Likely cause ({d.confidence}):[/yellow] {d.likely_cause}")
            console.print(f"  [blue]Proposed fix:[/blue] {d.proposed_fix}\n")
            report["diagnosis"].append({
                "cause": d.likely_cause,
                "confidence": d.confidence,
                "fix": d.proposed_fix,
                "affected": d.affected_metric,
            })

        # Send alert
        _send_alert(cfg, report)
        report["alert_sent"] = True
    else:
        console.print("\n[green]All metrics within target.[/green]")

    # Save report
    output_dir = Path("output/parity")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / f"parity-{date}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    log_action("parity-agent", "check", f"date:{date}",
               details={"missed": len(missed), "alert": report["alert_sent"]})

    console.print(f"Report saved: {report_path}")
    return report


def _send_alert(cfg: dict, report: dict) -> None:
    """Send alert via Slack webhook or email."""
    webhook = cfg["parity"].get("alert_slack_webhook")
    if webhook and not webhook.startswith("${"):
        missed = [g for g in report["gaps"] if not g["within_target"]]
        message = {
            "text": f"Parity Alert — {report['date']}",
            "blocks": [
                {"type": "header", "text": {"type": "plain_text", "text": "Parity Target Missed"}},
                {"type": "section", "text": {
                    "type": "mrkdwn",
                    "text": "\n".join(
                        f"• *{g['metric']}*: GA4={g['ga4']}, Matomo={g['matomo']}, gap={g['gap_percent']}%"
                        for g in missed
                    ),
                }},
            ],
        }
        if report["diagnosis"]:
            fixes = "\n".join(f"• {d['fix']}" for d in report["diagnosis"])
            message["blocks"].append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Proposed fixes:*\n{fixes}"},
            })
        try:
            requests.post(webhook, json=message, timeout=10)
            console.print("  Alert sent via Slack")
        except Exception as e:
            console.print(f"  [yellow]Alert failed: {e}[/yellow]")


if __name__ == "__main__":
    import sys
    config = sys.argv[1] if len(sys.argv) > 1 else "config/client.yaml"
    date = sys.argv[2] if len(sys.argv) > 2 else None
    run_parity(config, date)
