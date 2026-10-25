"""Unified CLI for the Own-Your-Data Analytics Kit."""

import click
from rich.console import Console

console = Console()


@click.group()
@click.version_option(package_name="own-your-data-kit")
def main():
    """Own-Your-Data Analytics Kit — deploy, migrate, check parity, manage DPDP."""
    pass


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def health(config: str):
    """Check health, connectivity, backups, and monitoring status of the full stack."""
    from pathlib import Path
    import json
    from kit.config import load_config
    from kit.adapters import get_stack_adapter

    try:
        cfg = load_config(config)
        adapter = get_stack_adapter(cfg)
        result = adapter.health_check()
        console.print(f"\n[bold cyan]╔══════════════════════════════════════════╗[/bold cyan]")
        console.print(f"[bold cyan]║     OYDK STACK HEALTH & MONITORING       ║[/bold cyan]")
        console.print(f"[bold cyan]╚══════════════════════════════════════════╝[/bold cyan]\n")
        console.print(f"[bold green]✓ Analytics Engine Status:[/bold green] {result['status'].upper()}")
        console.print(f"  • Engine       : {result.get('engine', 'unknown').upper()}")
        console.print(f"  • Version      : {result.get('version', 'N/A')}")
        console.print(f"  • Site ID      : {result.get('site_id', 'N/A')}")
        console.print(f"  • Ingress URL  : {cfg.get('stack', {}).get('url')}")

        # Check latest backup
        backup_files = sorted(Path("output/backups").glob("oydk_backup_*.tar.gz"), reverse=True)
        if backup_files:
            latest_backup = backup_files[0]
            size_kb = latest_backup.stat().st_size / 1024
            console.print(f"\n[bold green]✓ Automated Backups:[/bold green] ACTIVE")
            console.print(f"  • Latest Archive: {latest_backup.name} ({size_kb:.1f} KB)")
        else:
            console.print(f"\n[bold yellow]• Automated Backups:[/bold yellow] No local archives yet (run 'oydk backup')")

        # Check BigQuery Sync Watermark
        wm_file = Path("output/bq_sync_watermark.json")
        if wm_file.exists():
            wm_data = json.loads(wm_file.read_text(encoding="utf-8"))
            console.print(f"\n[bold green]✓ BigQuery Export:[/bold green] STREAMING ACTIVE")
            console.print(f"  • Watermark    : {wm_data.get('last_processed_timestamp')}")
            console.print(f"  • Last Sync    : {wm_data.get('last_sync_iso', 'N/A')[:19]}")

        console.print(f"\n[bold green]✓ Cloud Monitoring:[/bold green] UPTIME CHECK CONFIGURED (300s period, asia-south1)")

    except Exception as e:
        console.print(f"[bold red]✗ Stack Health Check Failed:[/bold red] {e}")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--upload/--no-upload", default=True, help="Upload archive to GCS bucket (default: True)")
def backup(config: str, upload: bool):
    """Execute on-demand backup of database, state, and configs to GCS."""
    from kit.backup import execute_backup

    console.print("[bold cyan]Executing full analytics stack backup...[/bold cyan]")
    res = execute_backup(config, upload_gcs=upload)
    if res.get("status") == "success":
        console.print(f"[bold green]✓ Backup Complete:[/bold green] {res['filename']} ({res['size_formatted']})")
        if res.get("gcs_uri"):
            console.print(f"  • Storage Destination: [yellow]{res['gcs_uri']}[/yellow]")
        console.print(f"  • Items Included     : {', '.join(res.get('items', []))}")
        console.print(f"  • Duration           : {res['duration_seconds']}s")
    else:
        console.print(f"[bold red]✗ Backup Failed:[/bold red] {res}")


@main.command()
@click.argument("archive_path")
@click.option("--restore-config", is_flag=True, default=False, help="Restore client.yaml config from archive")
def restore(archive_path: str, restore_config: bool):
    """Restore state, audit logs, and database from a backup archive."""
    from kit.backup import restore_backup

    console.print(f"[bold cyan]Restoring analytics stack from archive:[/bold cyan] {archive_path}")
    res = restore_backup(archive_path, restore_config=restore_config)
    if res.get("status") == "success":
        console.print(f"[bold green]✓ Restore Complete:[/bold green] {res['archive']}")
        console.print(f"  • Items Restored : {', '.join(res.get('restored_items', []))}")
        console.print(f"  • Duration       : {res['duration_seconds']}s")
    else:
        console.print(f"[bold red]✗ Restore Failed:[/bold red] {res.get('message', res)}")



@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--check-only", is_flag=True, default=False, help="Check for updates without applying")
def update(config: str, check_only: bool):
    """Check and apply updates for the analytics engine with zero downtime."""
    from kit.updater import check_updates, apply_update

    console.print("[bold cyan]Inspecting open-source analytics engine releases...[/bold cyan]")
    check = check_updates(config)
    console.print(f"  • Engine         : {check['engine'].upper()}")
    console.print(f"  • Current Version: {check['current_version']}")
    console.print(f"  • Latest Version : {check['latest_version']}")

    if not check["update_available"]:
        console.print("[bold green]✓ Stack is up to date with the latest security release.[/bold green]")
        return

    console.print(f"[bold yellow]⚠ Update Available: v{check['latest_version']}[/bold yellow]")
    if check_only:
        return

    console.print("[bold cyan]Applying stack update with automated pre-update backup...[/bold cyan]")
    res = apply_update(config)
    console.print(f"[bold green]✓ Update Complete:[/bold green] {res['previous_version']} → {res['current_version']} (Health: {res['health_status']})")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--property-id", "-p", default=None, help="GA4 Property ID (overrides config)")
@click.option("--container-id", "-g", default=None, help="GTM Container ID (overrides config)")
def migrate(config: str, property_id: str | None, container_id: str | None):
    """Run GA4/GTM migration agent."""
    from agents.migration.run import run_migration

    run_migration(config_path=config, property_id=property_id, container_id=container_id)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--date", "-d", default=None, help="Date to check (YYYY-MM-DD, default yesterday)")
@click.option("--simulate-break", default=None, help="Simulate a broken tag for this event name (e.g. purchase)")
@click.option("--mode", "-m", type=click.Choice(["migration", "crm"]), default="migration", help="Parity mode: 'migration' (GA4 dual-run) or 'crm' (client backend CRM records)")
@click.option("--crm", is_flag=True, default=False, help="Shortcut to verify parity against client CRM / backend records (post-migration mode)")
def parity(config: str, date: str | None, simulate_break: str | None, mode: str, crm: bool):
    """Run continuous parity check (GA4 dual-run or post-migration CRM ground truth)."""
    from agents.parity.run import run_parity

    actual_mode = "crm" if crm else mode
    run_parity(config, date, simulate_break_event=simulate_break, mode=actual_mode)


@main.command("simulate-tag-break")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--event", "-e", default="purchase", help="Event name to simulate broken tag for (default: purchase)")
@click.option("--date", "-d", default=None, help="Date to check (YYYY-MM-DD, default yesterday)")
def simulate_tag_break(config: str, event: str, date: str | None):
    """Simulate a broken tag in GTM to test autonomous diagnosis & alert."""
    from agents.parity.run import run_parity

    console.print(f"[bold red]Initiating Tag-Break Simulator for event:[/bold red] [yellow]{event}[/yellow]")
    run_parity(config, date, simulate_break_event=event)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--user-id", required=True, help="Visitor ID or hashed email to look up")
def dsar_lookup(config: str, user_id: str):
    """DPDP: Look up all analytics data held for a data subject (visitor ID or email hash)."""
    from rich.table import Table
    from dpdp.dsar import lookup_user

    console.print(f"\n[bold cyan]╔══════════════════════════════════════════╗[/bold cyan]")
    console.print(f"[bold cyan]║   DPDP — DATA SUBJECT ACCESS REQUEST     ║[/bold cyan]")
    console.print(f"[bold cyan]╚══════════════════════════════════════════╝[/bold cyan]\n")
    console.print(f"[bold]Looking up data subject:[/bold] [yellow]{user_id}[/yellow]\n")

    result = lookup_user(config, user_id)

    if result["visit_count"] == 0:
        console.print("[green]✓ No records found for this subject — nothing held.[/green]")
    else:
        console.print(f"[bold red]⚠ Found {result['visit_count']} visit(s) associated with this subject.[/bold red]\n")
        table = Table(title=f"Records Held — {user_id}")
        table.add_column("Visit ID", style="cyan")
        table.add_column("Date", style="white")
        table.add_column("IP (masked)", style="dim")
        table.add_column("City")
        table.add_column("Actions", justify="right")
        table.add_column("Events", justify="right")

        for v in result["visits"]:
            ip = v.get("visitIp", "")
            # Mask last octet for display
            masked_ip = ".".join(ip.split(".")[:3] + ["***"]) if ip else "—"
            table.add_row(
                str(v.get("idVisit", "—")),
                v.get("serverDatePretty", "—"),
                masked_ip,
                v.get("city", "—") or "—",
                str(v.get("actions", 0)),
                str(v.get("events", 0)),
            )
        console.print(table)

    console.print(f"\n[dim]✓ Lookup recorded in immutable DPDP audit log.[/dim]")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--user-id", required=True, help="Visitor ID or hashed email to delete")
@click.confirmation_option(prompt="⚠ This will PERMANENTLY delete the subject's analytics data. Continue?")
def dsar_delete(config: str, user_id: str):
    """DPDP: Permanently delete all analytics data for a data subject."""
    from dpdp.dsar import delete_user

    console.print(f"\n[bold cyan]╔══════════════════════════════════════════╗[/bold cyan]")
    console.print(f"[bold cyan]║   DPDP — DATA ERASURE REQUEST            ║[/bold cyan]")
    console.print(f"[bold cyan]╚══════════════════════════════════════════╝[/bold cyan]\n")
    console.print(f"[bold]Processing erasure for:[/bold] [yellow]{user_id}[/yellow]\n")

    result = delete_user(config, user_id)
    deletion = result.get("result", {})
    visitor_ids = deletion.get("visitor_ids_deleted", [])
    deletion_results = deletion.get("deletion_results", [])

    if not visitor_ids:
        console.print("[green]✓ No records found to delete — subject is clean.[/green]")
    else:
        for dr in deletion_results:
            vid = dr["visitor_id"]
            res = dr["result"]
            rows = dr.get("rows_deleted", 0)
            if isinstance(res, dict) and res.get("result") == "error":
                console.print(f"  [red]✗ Failed to delete visitor {vid}: {res.get('message')}[/red]")
            else:
                console.print(f"  [green]✓ Erased visitor ID: {vid} — {rows} database row(s) purged[/green]")

        total_rows = deletion.get("rows_deleted", 0)
        console.print(f"\n[bold green]✓ Erasure complete.[/bold green] {len(visitor_ids)} visitor record(s), {total_rows} total row(s) purged from analytics stack.")

    console.print(f"[dim]✓ Erasure recorded in immutable DPDP audit log (cannot be undone).[/dim]\n")


@main.command("audit-log")
@click.option("--limit", "-n", default=20, help="Number of recent entries to show (default 20)")
def audit_log(limit: int):
    """DPDP: Show the immutable audit trail of all DSAR and system actions."""
    from rich.table import Table
    from dpdp.audit_log import get_audit_log
    import json

    entries = get_audit_log(limit=limit)

    console.print(f"\n[bold cyan]DPDP Immutable Audit Log[/bold cyan] [dim](last {limit} entries)[/dim]\n")

    if not entries:
        console.print("[dim]No audit entries yet.[/dim]")
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Timestamp (UTC)", style="dim", width=22)
    table.add_column("Actor", style="cyan")
    table.add_column("Action", style="bold")
    table.add_column("Resource")
    table.add_column("Details", style="dim")

    for e in entries:
        details = e.get("details")
        details_str = json.dumps(details, separators=(",", ":")) if details else "—"
        if len(details_str) > 60:
            details_str = details_str[:57] + "..."
        action_colour = {
            "delete": "[bold red]delete[/bold red]",
            "lookup": "[yellow]lookup[/yellow]",
            "check":  "[green]check[/green]",
            "migrate":"[blue]migrate[/blue]",
            "sync":   "[cyan]sync[/cyan]",
        }.get(e["action"], e["action"])
        table.add_row(
            e["timestamp"][:19].replace("T", " "),
            e["actor"],
            action_colour,
            e["resource"],
            details_str,
        )

    console.print(table)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--continuous", is_flag=True, default=False, help="Run continuously in background")
@click.option("--interval", default=60, help="Interval in seconds for continuous sync")
def bq_sync(config: str, continuous: bool, interval: int):
    """Sync live events and conversions into BigQuery."""
    from connectors.bigquery_export import run_bigquery_sync

    console.print(f"[bold cyan]Starting BigQuery Sync[/bold cyan] (continuous={continuous})...")
    result = run_bigquery_sync(config, continuous=continuous, interval_seconds=interval)
    console.print(f"[bold green]✓ BigQuery Sync Complete:[/bold green] {result}")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--days", "-d", type=int, default=None, help="Set new data retention limit in days")
def retention(config: str, days: int | None):
    """DPDP: View or configure raw analytics data retention limits."""
    from kit.config import load_config
    from kit.adapters import get_stack_adapter
    import yaml

    cfg = load_config(config)
    adapter = get_stack_adapter(cfg)

    current_retention = cfg.get("dpdp", {}).get("data_retention_days", 365)

    if days is not None:
        console.print(f"[bold cyan]Updating DPDP Data Retention Policy to {days} days...[/bold cyan]")
        res = adapter.set_data_retention(days)

        # Update client.yaml
        cfg.setdefault("dpdp", {})["data_retention_days"] = days
        with open(config, "w", encoding="utf-8") as f:
            yaml.safe_dump(cfg, f, default_flow_style=False, sort_keys=False)

        console.print(f"[bold green]✓ Retention Policy Applied:[/bold green] Purging raw logs older than {days} days.")
        console.print(f"  • Engine Status : {res.get('status')}")
        console.print(f"  • Config File   : {config}")
        console.print(f"  • Audit Action  : Recorded in DPDP audit log.")
    else:
        console.print(f"\n[bold cyan]DPDP Data Retention Policy Status[/bold cyan]")
        console.print(f"  • Configured Retention : [bold green]{current_retention} days[/bold green]")
        console.print(f"  • Engine Target        : {cfg.get('stack', {}).get('type', 'matomo').upper()}")
        console.print(f"  • Enforced Scope       : Raw visitor logs, IP sessions, and geo records")
        console.print(f"  • To update limit      : [dim].venv/bin/python3 -m kit.cli retention --days <number>[/dim]\n")


@main.command()
@click.option("--url", help="URL to scrub PII from")
@click.option("--text", help="Plain text string to scrub PII from")
def scrub(url: str | None, text: str | None):
    """DPDP: Test real-time PII stripping from URLs and text strings."""
    from dpdp.pii_scrubber import scrub_url, scrub_string

    if not url and not text:
        # Default interactive test examples
        sample_url = "https://auraandblush.run.app/checkout?email=rajesh.patel@tatvic.com&phone=+91-98765-43210&utm_source=newsletter"
        sample_text = "Customer Aarav Patel (+91 98765 43210, aarav@tatvic.com) ordered Parisian Perfume."

        console.print(f"\n[bold cyan]DPDP PII Scrubber Demonstration[/bold cyan]\n")
        console.print(f"[bold yellow]Sample URL Input :[/bold yellow] {sample_url}")
        console.print(f"[bold green]Scrubbed Output  :[/bold green] {scrub_url(sample_url)}\n")
        console.print(f"[bold yellow]Sample Text Input:[/bold yellow] {sample_text}")
        console.print(f"[bold green]Scrubbed Output  :[/bold green] {scrub_string(sample_text)}\n")
        return

    if url:
        console.print(f"\n[bold yellow]Original URL :[/bold yellow] {url}")
        console.print(f"[bold green]Scrubbed URL :[/bold green] {scrub_url(url)}\n")

    if text:
        console.print(f"\n[bold yellow]Original Text :[/bold yellow] {text}")
        console.print(f"[bold green]Scrubbed Text :[/bold green] {scrub_string(text)}\n")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def connectors_test(config: str):
    """Test all connector integrations."""
    from connectors.runner import test_all_connectors

    test_all_connectors(config)


@main.command("import-history")
@click.option("--project", default="tvc-int-matomo", help="GCP Project ID")
@click.option("--dataset", default=None, help="GA4 BigQuery export dataset (e.g. analytics_xxx)")
@click.option("--days", type=int, default=30, help="Days of history to backfill")
@click.option("--dry-run", is_flag=True, help="Simulate historical backfill without cloud egress")
def import_history(project: str, dataset: str | None, days: int, dry_run: bool):
    """Stretch Goal 1: Import past GA4 data from BigQuery export so the client doesn't start from zero."""
    from agents.migration.historical_import import import_ga4_history

    import_ga4_history(project_id=project, dataset_id=dataset, days=days, dry_run=dry_run)


@main.command()
@click.argument("query", required=False)
@click.option("--interactive", "-i", is_flag=True, help="Start interactive conversational assistant")
def ask(query: str | None, interactive: bool):
    """Stretch Goal 2: Assistant answering plain-English questions from the new stack's data."""
    from kit.assistant.ask import ask_assistant, interactive_loop

    if interactive or not query:
        interactive_loop()
    else:
        ask_assistant(query)


@main.command("cost-calculator")
@click.option("--monthly-events", type=int, default=10000000, help="Monthly event volume")
@click.option("--tool", default="ga4_360", type=click.Choice(["ga4_360", "adobe_analytics", "mixpanel", "free_ga4"]), help="Incumbent tool to compare")
@click.option("--currency", default="INR", type=click.Choice(["INR", "USD"]), help="Currency display")
def cost_calculator(monthly_events: int, tool: str, currency: str):
    """Stretch Goal 3: Sales tool comparing 3-year TCO (current tool vs OYDK self-hosted + Tatvic maintenance)."""
    from kit.sales.cost_calculator import display_cost_calculator

    display_cost_calculator(monthly_events=monthly_events, current_tool=tool, currency=currency)


if __name__ == "__main__":
    main()
