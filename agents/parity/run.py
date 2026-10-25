"""Parity checker — compare GA4 vs Matomo, alert on gaps, diagnose causes."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from rich.console import Console
from rich.table import Table

from agents.parity.daily_log import append_parity_row
from agents.parity.diagnosis import diagnose
from agents.parity.fixture_metrics import FixtureGA4Metrics
from agents.parity.ga4_metrics import GA4Metrics
from dpdp.audit_log import log_action
from kit.config import load_config
from kit.analytics_stack import analytics_stack_from_config

console = Console()


def _gap_percent(ga4_val: int, matomo_val: int) -> float:
    if ga4_val == 0 and matomo_val == 0:
        return 0.0
    baseline = max(ga4_val, 1)
    return abs(ga4_val - matomo_val) / baseline * 100


def _use_fixture_mode(cfg: dict, fixture_flag: bool) -> bool:
    if fixture_flag or cfg.get("parity", {}).get("use_fixture"):
        return True
    return not Path(cfg["ga4"]["credentials_file"]).exists()


def run_parity(
    config_path: str,
    date: str | None = None,
    fixture: bool = False,
    break_tag: str | None = None,
) -> dict:
    """Run parity check for a given date."""
    cfg = load_config(config_path)
    parity_cfg = cfg["parity"]
    target_gap = parity_cfg["target_gap_percent"]
    fixture_mode = _use_fixture_mode(cfg, fixture)

    if date is None:
        date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    console.print(f"\n[bold]Parity Check — {date}[/bold] (target: ±{target_gap}%)\n")
    if fixture_mode:
        console.print("[yellow]Fixture mode[/yellow] — GA4 + Matomo baselines from snapshot\n")
    if break_tag:
        console.print(
            f"[red]Simulated break[/red] — Matomo tag for [bold]{break_tag}[/bold] not firing\n"
        )

    fixture_reader: FixtureGA4Metrics | None = None
    if fixture_mode:
        fixture_path = Path(
            parity_cfg.get("fixture_file", "agents/parity/fixtures/aurablush_parity.json")
        )
        fixture_reader = FixtureGA4Metrics(fixture_path)
        ga4_users_sessions = fixture_reader.get_users_sessions(date)
        ga4_events = fixture_reader.get_key_events(date, parity_cfg["key_events"])
        ga4_sources = fixture_reader.get_traffic_sources(date)
        matomo_baseline = fixture_reader.get_matomo_baseline(date)
        matomo_users = int(matomo_baseline["users"])
        matomo_sessions = int(matomo_baseline["sessions"])
        matomo_event_counts = dict(matomo_baseline.get("key_events", {}))
        matomo_sources_total = int(matomo_baseline.get("traffic_sources_total", matomo_sessions))
    else:
        ga4 = GA4Metrics(cfg["ga4"]["property_id"], cfg["ga4"]["credentials_file"])
        ga4_users_sessions = ga4.get_users_sessions(date)
        ga4_events = ga4.get_key_events(date, parity_cfg["key_events"])
        ga4_sources = ga4.get_traffic_sources(date)

        matomo = analytics_stack_from_config(config_path)
        matomo_summary = matomo.get_visits_summary(period="day", date=date)
        matomo_events_raw = matomo.get_events(period="day", date=date)
        matomo_referrers = matomo.get_referrers(period="day", date=date)

        matomo_users = int(matomo_summary.get("nb_uniq_visitors", 0))
        matomo_sessions = int(matomo_summary.get("nb_visits", 0))
        matomo_event_counts = None
        matomo_sources_total = sum(int(r.get("nb_visits", 0)) for r in matomo_referrers) or 0

    if break_tag and fixture_mode:
        matomo_event_counts = matomo_event_counts or {}
        matomo_event_counts[break_tag] = 0

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
        if fixture_mode:
            matomo_count = int((matomo_event_counts or {}).get(event_name, 0))
        else:
            matomo_count = sum(
                int(e.get("nb_events", 0))
                for e in matomo_events_raw
                if e.get("label", "").lower() == event_name.lower()
            )
        if break_tag and not fixture_mode and event_name == break_tag:
            matomo_count = 0
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
    if fixture_mode:
        matomo_total = matomo_sources_total or 1
    else:
        matomo_total = matomo_sources_total or 1
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
        "mode": "fixture" if fixture_mode else "live",
        "simulated_break_tag": break_tag,
        "target_gap_percent": target_gap,
        "gaps": gaps,
        "all_within_target": len(missed) == 0,
        "diagnosis": [],
        "alert_sent": False,
        "email_alert": None,
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

        _send_threshold_alert(cfg, report)
        report["alert_sent"] = True
    else:
        console.print("\n[green]All metrics within target.[/green]")

    _send_daily_report_email(cfg, report)

    # Save report (fixture must not overwrite live JSON for the same date)
    output_dir = Path("output/parity")
    output_dir.mkdir(parents=True, exist_ok=True)
    mode_tag = "-fixture" if fixture_mode else ""
    if break_tag:
        suffix = f"{mode_tag}-break-{break_tag}" if mode_tag else f"-break-{break_tag}"
    else:
        suffix = mode_tag
    report_path = output_dir / f"parity-{date}{suffix}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    report["report_path"] = str(report_path)
    report["report_file"] = report_path.name

    md_path = output_dir / f"parity-{date}{suffix}.md"
    _write_markdown_report(md_path, report)
    sheet_path = append_parity_row(report, output_dir)
    report["parity_daily_sheet"] = str(sheet_path)

    log_action(
        "parity-agent",
        "check",
        f"date:{date}",
        details={
            "mode": report["mode"],
            "missed": len(missed),
            "alert": report["alert_sent"],
            "email": (report.get("email_alert") or {}).get("sent"),
            "break_tag": break_tag,
        },
    )

    console.print(f"Report saved: {report_path}")
    console.print(f"Summary: {md_path}")
    console.print(f"Daily sheet: {sheet_path}")
    return report


def _write_markdown_report(path: Path, report: dict) -> None:
    lines = [
        f"# Parity Report — {report['date']}",
        f"Mode: **{report.get('mode', 'live')}** | Target: ±{report['target_gap_percent']}%",
    ]
    if report.get("simulated_break_tag"):
        lines.append(f"Simulated break: **{report['simulated_break_tag']}** (Matomo tag not firing)")
    lines.extend(["", "| Metric | GA4 | Matomo | Gap % | Status |", "|--------|-----|--------|-------|--------|"])
    for g in report["gaps"]:
        status = "OK" if g["within_target"] else "**MISS**"
        lines.append(
            f"| {g['metric']} | {g['ga4']} | {g['matomo']} | {g['gap_percent']}% | {status} |"
        )
    if report["diagnosis"]:
        lines.extend(["", "## Diagnosis"])
        for d in report["diagnosis"]:
            lines.append(f"- **{d['confidence']}**: {d['cause']}")
            lines.append(f"  - Fix: {d['fix']}")
    path.write_text("\n".join(lines), encoding="utf-8")


def _send_threshold_alert(cfg: dict, report: dict) -> None:
    """Log threshold miss and optional Slack (email is sent with every daily report)."""
    from pathlib import Path

    missed = [g for g in report["gaps"] if not g["within_target"]]
    alert_line = (
        f"Parity ALERT {report['date']}: "
        + ", ".join(f"{g['metric']} gap={g['gap_percent']}%" for g in missed)
    )
    console.print(f"  [bold red]{alert_line}[/bold red]")
    log_dir = Path("output/parity")
    log_dir.mkdir(parents=True, exist_ok=True)
    with open(log_dir / "alerts.log", "a", encoding="utf-8") as fh:
        fh.write(alert_line + "\n")

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


def _send_daily_report_email(cfg: dict, report: dict) -> None:
    """Email full daily parity table to alert_emails; includes diagnosis when over threshold."""
    from agents.parity.email_alert import send_parity_report_email

    email_status = send_parity_report_email(cfg, report)
    report["email_alert"] = email_status
    if email_status.get("sent"):
        label = "Daily parity report emailed to"
        console.print(f"  [green]{label}: {', '.join(email_status['recipients'])}[/green]")
    elif email_status.get("reason") == "smtp_not_configured":
        console.print(
            "  [yellow]Daily report not emailed — set OYDK_SMTP_USER/OYDK_SMTP_PASS "
            f"(recipients: {', '.join(email_status.get('recipients', []))})[/yellow]"
        )
    elif email_status.get("reason") == "no_recipients":
        console.print("  [yellow]Daily report not emailed — no parity.alert_emails[/yellow]")
    elif email_status.get("reason") == "disabled":
        pass


if __name__ == "__main__":
    import sys

    args = sys.argv[1:]
    fixture = "--fixture" in args
    break_tag = None
    if "--break-tag" in args:
        idx = args.index("--break-tag")
        break_tag = args[idx + 1]
        args = args[:idx] + args[idx + 2 :]
    args = [a for a in args if a != "--fixture"]
    config = args[0] if args else "config/client.yaml"
    date = args[1] if len(args) > 1 else None
    run_parity(config, date, fixture=fixture, break_tag=break_tag)
