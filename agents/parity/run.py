"""Parity checker — compare GA4 vs Matomo, alert on gaps, diagnose causes."""

import json
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any

import requests
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from agents.parity.diagnosis import diagnose
from agents.parity.ga4_metrics import GA4Metrics
from agents.parity.crm_metrics import CRMBackendMetrics
from dpdp.audit_log import log_action
from kit.adapters import get_stack_adapter
from kit.config import load_config

console = Console()


def _gap_percent(source_val: float, engine_val: float) -> float:
    if source_val == 0.0 and engine_val == 0.0:
        return 0.0
    baseline = max(abs(source_val), 1.0)
    return abs(source_val - engine_val) / baseline * 100.0


def run_parity(
    config_path: str = "config/client.yaml",
    date: str | None = None,
    simulate_break_event: str | None = None,
    mode: str = "migration",
    dry_run: bool = False,
    override_events: list[str] | None = None,
) -> dict:
    """Run continuous parity check (migration dual-run or post-migration CRM ground truth)."""
    cfg = load_config(config_path)
    parity_cfg = cfg.get("parity", {})
    target_gap = float(parity_cfg.get("target_gap_percent", 5.0))
    stack_type = cfg.get("stack", {}).get("type", "matomo").upper()

    if date is None:
        date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    sim_badge = f" [bold red][TAG-BREAK SIMULATION: {simulate_break_event}][/bold red]" if simulate_break_event else ""
    mode_label = "MIGRATION DUAL-RUN (GA4 vs New Stack)" if mode == "migration" else "STEADY-STATE (New Stack vs Backend/CRM Truth)"
    exec_mode_label = "[bold magenta]DRY-RUN SIMULATION[/bold magenta]" if dry_run else "[bold green]LIVE PRODUCTION TELEMETRY[/bold green]"

    console.print(f"\n[bold]Parity Check — {date}[/bold] [cyan]({mode_label})[/cyan] (target: ±{target_gap}%){sim_badge}")
    console.print(f"Execution Mode: {exec_mode_label}\n")

    # Connect to target engine via adapter
    try:
        adapter = get_stack_adapter(cfg)
        if dry_run:
            # Explicit simulation fixtures for target engine
            summary = {"users": 12, "sessions": 15}
            engine_events_raw = [
                {"label": "purchase", "nb_events": 3, "revenue": 4497.0},
                {"label": "add_to_cart", "nb_events": 5, "revenue": 0.0},
                {"label": "financial_lead_submitted", "nb_events": 1, "revenue": 0.0},
            ]
            engine_referrers = [{"name": "Direct", "nb_visits": 10}, {"name": "Search", "nb_visits": 5}]
        else:
            summary = adapter.get_daily_summary(date)
            engine_events_raw = adapter.get_daily_events(date)
            engine_referrers = adapter.get_daily_referrers(date)
    except Exception as e:
        console.print(Panel(
            f"[bold red]Failed to fetch telemetry from analytics engine [{stack_type}][/bold red]\n\n"
            f"Error: {e}\n\n"
            f"Action Required:\n"
            f"1. Check that the analytics stack is online at {cfg.get('stack', {}).get('url')}.\n"
            f"2. Run 'oydk health' to test container connectivity.\n"
            f"3. Run with '--dry-run' if you want to test parity workflows offline.",
            title="[red]Engine Telemetry Fetch Error[/red]",
            border_style="red",
        ))
        return {"status": "error", "stage": "engine_telemetry", "error": str(e)}

    engine_users = int(summary.get("users", 0))
    engine_sessions = int(summary.get("sessions", 0))

    gaps = []

    # =========================================================================
    # PATH A: POST-MIGRATION STEADY STATE (GA4 SWITCHED OFF -> BACKEND/CRM TRUTH)
    # =========================================================================
    if mode == "crm":
        try:
            crm = CRMBackendMetrics(cfg, dry_run=dry_run)
            backend_orders_data = crm.get_backend_orders(date)
            backend_leads_data = crm.get_crm_leads(date)
        except RuntimeError as e:
            console.print(Panel(
                f"[bold red]Ground-Truth Backend / CRM Query Failed[/bold red]\n\n{e}",
                title="[red]CRM Ground-Truth Error[/red]",
                border_style="red",
            ))
            return {"status": "error", "stage": "crm_ground_truth", "error": str(e)}

        # 1. Orders Comparison (Analytics purchase vs Backend order ledger)
        if simulate_break_event and simulate_break_event.lower() == "purchase":
            analytics_orders = 0
            console.print(f"  [red]⚡ [SIMULATOR] Muting 'purchase' telemetry from {stack_type} to simulate broken tag[/red]")
        else:
            analytics_orders = sum(
                int(e.get("nb_events", 0))
                for e in engine_events_raw
                if str(e.get("label", "")).lower() == "purchase"
            )

        orders_gap = _gap_percent(float(backend_orders_data["orders"]), float(analytics_orders))
        gaps.append({
            "metric": "backend_orders",
            "source": f"Backend Orders ({backend_orders_data['source']})",
            "source_val": backend_orders_data["orders"],
            "target_engine": analytics_orders,
            "gap_percent": round(orders_gap, 2),
            "within_target": orders_gap <= target_gap,
        })

        # 2. Revenue Comparison (Analytics revenue vs Accounting settled revenue)
        if simulate_break_event and simulate_break_event.lower() == "purchase":
            analytics_revenue = 0.0
        else:
            analytics_revenue = sum(
                float(e.get("revenue", 0.0) or 0.0)
                for e in engine_events_raw
            )

        rev_gap = _gap_percent(float(backend_orders_data["revenue"]), float(analytics_revenue))
        gaps.append({
            "metric": "settled_revenue",
            "source": f"Accounting Settled Revenue ({backend_orders_data['source']})",
            "source_val": f"₹{backend_orders_data['revenue']:,.0f}" if isinstance(backend_orders_data['revenue'], (int, float)) else backend_orders_data['revenue'],
            "target_engine": f"₹{analytics_revenue:,.0f}",
            "gap_percent": round(rev_gap, 2),
            "within_target": rev_gap <= target_gap,
        })

        # 3. CRM Leads Comparison
        if simulate_break_event and simulate_break_event.lower() in ("financial_lead_submitted", "lead"):
            analytics_leads = 0
            console.print(f"  [red]⚡ [SIMULATOR] Muting '{simulate_break_event}' telemetry to simulate broken lead tag[/red]")
        else:
            analytics_leads = sum(
                int(e.get("nb_events", 0))
                for e in engine_events_raw
                if str(e.get("label", "")).lower() in ("financial_lead_submitted", "lead", "generate_lead")
            )

        leads_gap = _gap_percent(float(backend_leads_data["leads"]), float(analytics_leads))
        gaps.append({
            "metric": "crm_leads",
            "source": f"CRM Leads ({backend_leads_data['source']})",
            "source_val": backend_leads_data["leads"],
            "target_engine": analytics_leads,
            "gap_percent": round(leads_gap, 2),
            "within_target": leads_gap <= target_gap,
        })

        # Display results table
        table = Table(title=f"Steady-State Parity Report — {date} (Engine vs Client Backend/CRM Ground Truth)")
        table.add_column("Business Metric & Ground Truth", style="cyan")
        table.add_column("Backend / CRM Truth", justify="right")
        table.add_column(f"{stack_type}", justify="right")
        table.add_column("Gap %", justify="right")
        table.add_column("Status")

        missed = []
        for g in gaps:
            status = "[green]OK[/green]" if g["within_target"] else "[red]MISS[/red]"
            table.add_row(g["source"], str(g["source_val"]), str(g["target_engine"]), f"{g['gap_percent']}%", status)
            if not g["within_target"]:
                missed.append(g)

    # =========================================================================
    # PATH B: MIGRATION DUAL-RUN (GA4 VS OPEN-SOURCE TARGET ENGINE)
    # =========================================================================
    else:
        # Fetch GA4 metrics
        try:
            ga4 = GA4Metrics(
                property_id=cfg.get("ga4", {}).get("property_id", ""),
                credentials_path=cfg.get("ga4", {}).get("credentials_file"),
                dry_run=dry_run,
            )
            ga4_users_sessions = ga4.get_users_sessions(date)
            monitored_events = override_events or parity_cfg.get("key_events", ["purchase", "add_to_cart"])
            ga4_events = ga4.get_key_events(date, monitored_events)
            ga4_sources = ga4.get_traffic_sources(date)
        except RuntimeError as e:
            console.print(Panel(
                f"[bold red]GA4 Data API Query Failed[/bold red]\n\n{e}",
                title="[red]GA4 Parity Fetch Error[/red]",
                border_style="red",
            ))
            return {"status": "error", "stage": "ga4_metrics", "error": str(e)}

        users_gap = _gap_percent(float(ga4_users_sessions["users"]), float(engine_users))
        gaps.append({
            "metric": "users",
            "ga4": ga4_users_sessions["users"],
            "matomo": engine_users,
            "target_engine": engine_users,
            "gap_percent": round(users_gap, 2),
            "within_target": users_gap <= target_gap,
        })

        sessions_gap = _gap_percent(float(ga4_users_sessions["sessions"]), float(engine_sessions))
        gaps.append({
            "metric": "sessions",
            "ga4": ga4_users_sessions["sessions"],
            "matomo": engine_sessions,
            "target_engine": engine_sessions,
            "gap_percent": round(sessions_gap, 2),
            "within_target": sessions_gap <= target_gap,
        })

        for event_name in monitored_events:
            ga4_count = ga4_events.get(event_name, 0)
            
            # Check if this event tag is simulated broken
            if simulate_break_event and simulate_break_event.lower() == event_name.lower():
                engine_count = 0
                console.print(f"  [red]⚡ [SIMULATOR] Muting '{event_name}' telemetry from {stack_type} to simulate broken tag[/red]")
            else:
                engine_count = sum(
                    int(e.get("nb_events", 0))
                    for e in engine_events_raw
                    if str(e.get("label", "")).lower() == event_name.lower()
                )

            event_gap = _gap_percent(float(ga4_count), float(engine_count))
            gaps.append({
                "metric": f"key_event:{event_name}",
                "ga4": ga4_count,
                "matomo": engine_count,
                "target_engine": engine_count,
                "gap_percent": round(event_gap, 2),
                "within_target": event_gap <= target_gap,
            })

        # Traffic sources — compare top channels
        ga4_total_sessions = sum(ga4_sources.values())
        engine_total = sum(int(r.get("nb_visits", 0)) for r in engine_referrers)
        sources_gap = _gap_percent(float(ga4_total_sessions), float(engine_total))
        gaps.append({
            "metric": "traffic_sources",
            "ga4": ga4_total_sessions,
            "matomo": engine_total,
            "target_engine": engine_total,
            "gap_percent": round(sources_gap, 2),
            "within_target": sources_gap <= target_gap,
        })

        # Display results table
        table = Table(title=f"Parity Report — {date} (Migration Dual-Run: GA4 vs {stack_type})")
        table.add_column("Metric", style="cyan")
        table.add_column("GA4", justify="right")
        table.add_column(f"{stack_type}", justify="right")
        table.add_column("Gap %", justify="right")
        table.add_column("Status")

        missed = []
        for g in gaps:
            status = "[green]OK[/green]" if g["within_target"] else "[red]MISS[/red]"
            table.add_row(g["metric"], str(g.get("ga4", 0)), str(g.get("target_engine", 0)), f"{g['gap_percent']}%", status)
            if not g["within_target"]:
                missed.append(g)

    console.print(table)

    # Diagnose if target missed
    report = {
        "date": date,
        "mode": mode,
        "execution_mode": "dry_run" if dry_run else "live",
        "target_engine": stack_type,
        "target_gap_percent": target_gap,
        "simulated_break": simulate_break_event,
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

        # Send multi-recipient alerts (Email + Slack)
        _send_alert(cfg, report, missed)
        report["alert_sent"] = True
    else:
        console.print("\n[green]✓ All metrics within target tolerance.[/green]")

    # Save report
    output_dir = Path("output/parity")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_filename = f"parity-crm-{date}.json" if mode == "crm" else f"parity-{date}.json"
    report_path = output_dir / report_filename
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    log_action(
        actor="parity-agent",
        action="parity_crm_check" if mode == "crm" else "check",
        resource=f"parity:{mode}:{date}",
        details={
            "mode": mode,
            "execution": "dry_run" if dry_run else "live",
            "missed": len(missed),
            "alert": report["alert_sent"],
            "simulated_break": simulate_break_event,
        },
    )

    console.print(f"\nReport saved: [bold cyan]{report_path}[/bold cyan]")
    return report


def _get_alert_recipients(parity_cfg: dict) -> list[str]:
    """Extract list of alert recipients from config."""
    recipients = []
    # Support list format
    if "alert_emails" in parity_cfg and isinstance(parity_cfg["alert_emails"], list):
        recipients.extend([e.strip() for e in parity_cfg["alert_emails"] if e and isinstance(e, str)])
    # Support legacy single email string
    elif "alert_email" in parity_cfg and parity_cfg["alert_email"]:
        single = str(parity_cfg["alert_email"]).strip()
        if single:
            recipients.append(single)
    return list(dict.fromkeys(recipients))  # Unique preserve order


def _send_alert(cfg: dict, report: dict, missed: list[dict]) -> None:
    """Send alert via multi-recipient email and/or Slack webhook."""
    parity_cfg = cfg.get("parity", {})
    recipients = _get_alert_recipients(parity_cfg)
    date = report.get("date", "Unknown Date")
    target_gap = report.get("target_gap_percent", 5.0)

    # 1. Format Email Content
    subject = f"[OYDK ALERT] Analytics Parity Variance Exceeded ±{target_gap}% on {date}"
    
    body_lines = [
        f"TATVIC OYDK — AUTOMATED PARITY ALERT",
        f"==================================================",
        f"Date: {date}",
        f"Target Tolerance: ±{target_gap}%",
        f"Missed Metrics: {len(missed)}",
        f"Engine: {report.get('target_engine')}",
        "",
        "Variance Summary:",
        "--------------------------------------------------",
    ]
    for g in missed:
        src = g.get("metric") or g.get("source")
        src_val = g.get("ga4") if "ga4" in g else g.get("source_val")
        tgt_val = g.get("target_engine")
        gap = g.get("gap_percent")
        body_lines.append(f"  • {src}: Source = {src_val}, Target = {tgt_val} (Gap: {gap}%)")

    if report.get("diagnosis"):
        body_lines.extend([
            "",
            "Root-Cause Diagnoses & Proposed Fixes:",
            "--------------------------------------------------",
        ])
        for d in report["diagnosis"]:
            body_lines.append(f"  • Cause ({d['confidence']}): {d['cause']}")
            body_lines.append(f"    Fix: {d['fix']}")

    body_lines.extend([
        "",
        "--------------------------------------------------",
        "Generated autonomously by Tatvic Own-Your-Data Analytics Kit",
    ])
    email_text = "\n".join(body_lines)

    # Log to permanent alerts file
    alert_log_path = Path("output/parity/alerts.log")
    alert_log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(alert_log_path, "a", encoding="utf-8") as f:
        f.write(f"\n--- Alert dispatched at {datetime.now(timezone.utc).isoformat()} ---\n")
        f.write(f"Recipients: {', '.join(recipients) if recipients else 'None configured'}\n")
        f.write(email_text + "\n")

    # Dispatch via SMTP if configured
    smtp_cfg = parity_cfg.get("smtp", {})
    smtp_host = os.environ.get("SMTP_HOST") or smtp_cfg.get("host")
    smtp_port = int(os.environ.get("SMTP_PORT") or smtp_cfg.get("port", 587))
    smtp_user = os.environ.get("SMTP_USER") or smtp_cfg.get("user")
    smtp_pass = os.environ.get("SMTP_PASSWORD") or smtp_cfg.get("password")

    if recipients:
        if smtp_host:
            try:
                msg = EmailMessage()
                msg["Subject"] = subject
                msg["From"] = smtp_user or "oydk-alerts@tatvic.com"
                msg["To"] = ", ".join(recipients)
                msg.set_content(email_text)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    if smtp_user and smtp_pass:
                        server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                console.print(f"  [green]✓ Email alert transmitted via SMTP to:[/green] {', '.join(recipients)}")
            except Exception as e:
                console.print(f"  [yellow]Notice: SMTP transmission error ({e}). Alert logged to {alert_log_path}[/yellow]")
        else:
            console.print(f"  [cyan]ℹ Notification alert recorded for {len(recipients)} recipient(s):[/cyan] {', '.join(recipients)}")
            console.print(f"    [dim](Logged to {alert_log_path}. Set SMTP_HOST in env to relay live outbound emails)[/dim]")

    # 2. Dispatch via Slack if configured
    webhook = parity_cfg.get("alert_slack_webhook") or os.environ.get("SLACK_WEBHOOK_URL")
    if webhook and not webhook.startswith("${") and webhook.startswith("http"):
        slack_payload = {
            "text": f"⚠️ Parity Alert — {date}: {len(missed)} metric(s) exceeded ±{target_gap}%",
            "blocks": [
                {"type": "header", "text": {"type": "plain_text", "text": f"🚨 Parity Variance Alert — {date}"}},
                {"type": "section", "text": {
                    "type": "mrkdwn",
                    "text": "\n".join(
                        f"• *{g.get('metric', g.get('source'))}*: Source={g.get('ga4', g.get('source_val'))}, Target={g.get('target_engine')} (*{g['gap_percent']}%* gap)"
                        for g in missed
                    ),
                }},
            ],
        }
        if report.get("diagnosis"):
            fixes = "\n".join(f"• *{d['cause']}*\n  `Fix:` {d['fix']}" for d in report["diagnosis"])
            slack_payload["blocks"].append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Proposed Remediation:*\n{fixes}"},
            })
        try:
            resp = requests.post(webhook, json=slack_payload, timeout=10)
            if resp.status_code == 200:
                console.print("  [green]✓ Alert dispatched to Slack channel[/green]")
        except Exception as e:
            console.print(f"  [yellow]Slack alert webhook notice: {e}[/yellow]")
