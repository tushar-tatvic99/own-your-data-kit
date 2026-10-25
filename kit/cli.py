"""Unified CLI for the Own-Your-Data Analytics Kit."""

import click
from rich.console import Console

from kit.env import load_kit_env

load_kit_env()

console = Console()


@click.group()
@click.version_option(package_name="own-your-data-kit")
def main():
    """Own-Your-Data Analytics Kit — deploy, migrate, check parity, manage DPDP."""
    pass


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option(
    "--fixture",
    is_flag=True,
    help="Use offline GA4/GTM fixtures (default if service account file is missing)",
)
def migrate(config: str, fixture: bool):
    """Run GA4/GTM migration agent."""
    from agents.migration.run import run_migration

    run_migration(config, fixture=fixture)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--date", "-d", default=None, help="Date to check (YYYY-MM-DD, default yesterday)")
@click.option(
    "--fixture",
    is_flag=True,
    help="Use offline GA4/Matomo baselines (default if service account file is missing)",
)
@click.option(
    "--break-tag",
    default=None,
    help="Rehearsal: simulate a broken Matomo event tag (e.g. purchase)",
)
def parity(config: str, date: str | None, fixture: bool, break_tag: str | None):
    """Run parity check between GA4 and Matomo."""
    from agents.parity.run import run_parity

    run_parity(config, date, fixture=fixture, break_tag=break_tag)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--user-id", required=True, help="Visitor ID or hashed email to look up")
def dsar_lookup(config: str, user_id: str):
    """DPDP: look up a person's analytics data."""
    from dpdp.dsar import lookup_user

    result = lookup_user(config, user_id)
    console.print(result)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--user-id", required=True, help="Visitor ID or hashed email to delete")
@click.option("--yes", "-y", is_flag=True, help="Skip confirmation prompt")
def dsar_delete(config: str, user_id: str, yes: bool):
    """DPDP: delete a person's analytics data."""
    if not yes and not click.confirm(
        "This will permanently delete the user's data. Continue?", default=False
    ):
        raise click.Abort()

    from dpdp.dsar import delete_user

    result = delete_user(config, user_id)
    console.print(result)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--continuous", is_flag=True, default=False, help="Run continuously in background")
@click.option("--interval", default=60, help="Interval in seconds for continuous sync")
def bq_sync(config: str, continuous: bool, interval: int):
    """Sync Matomo live events and conversions into BigQuery."""
    from connectors.bigquery_export import run_bigquery_sync

    console.print(f"[bold cyan]Starting BigQuery Sync[/bold cyan] (continuous={continuous})...")
    result = run_bigquery_sync(config, continuous=continuous, interval_seconds=interval)
    console.print(f"[bold green]✓ BigQuery Sync Complete:[/bold green] {result}")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def connectors_test(config: str):
    """Test all connector integrations."""
    from connectors.runner import test_all_connectors

    test_all_connectors(config)


@main.command("dsar-subject-id")
@click.option("--email", "-e", required=True, help="Registered email from the erasure form")
def dsar_subject_id(email: str):
    """Print Matomo User ID (dpdp-…) for an email — use with dsar-lookup."""
    from dpdp.subject_id import subject_user_id

    console.print(subject_user_id(email))


@main.command("verify-dpdp")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def verify_dpdp_cmd(config: str):
    """Verify DPDP: token, DSAR, retention, audit, PII scrub."""
    from dpdp.verify_dpdp import verify_dpdp

    raise SystemExit(0 if verify_dpdp(config) else 1)


@main.command("verify-matomo")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def verify_matomo(config: str):
    """Check Matomo API token from .env against config stack URL."""
    from kit.config import load_config
    from kit.matomo_token import resolve_matomo_token, verify_matomo_token

    cfg = load_config(config)
    token = resolve_matomo_token(cfg["stack"]["api_token"])
    verify_matomo_token(cfg["stack"]["url"], token, int(cfg["stack"]["site_id"]))
    console.print("[green]Matomo API token OK[/green]")


@main.command("verify-parts")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def verify_parts(config: str):
    """Verify all five required build parts are present."""
    from kit.verify_parts import verify_all

    ok = verify_all(config)
    raise SystemExit(0 if ok else 1)


@main.command("dsar-export")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--user-id", required=True, help="Visitor ID or hashed email to export")
def dsar_export(config: str, user_id: str):
    """DPDP: export a person's analytics data (access/portability)."""
    from dpdp.dsar import export_user

    console.print(export_user(config, user_id))


@main.command("import-ga4-history")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--start", default=None, help="Start date YYYY-MM-DD")
@click.option("--end", default=None, help="End date YYYY-MM-DD")
@click.option("--limit", type=int, default=None, help="Max rows to import")
@click.option("--fixture", is_flag=True, help="Use sample JSON instead of BigQuery")
@click.option("--dry-run", is_flag=True, help="Count only; do not send tracker hits")
@click.option("--mirror-bq", is_flag=True, help="Also write rows to kit BigQuery warehouse")
def import_ga4_history(
    config: str,
    start: str | None,
    end: str | None,
    limit: int | None,
    fixture: bool,
    dry_run: bool,
    mirror_bq: bool,
):
    """Stretch: import GA4 BigQuery export history into Matomo (backdated cdt)."""
    from agents.history.run import run_ga4_history_import

    run_ga4_history_import(
        config,
        start_date=start,
        end_date=end,
        limit=limit,
        fixture=fixture,
        dry_run=dry_run,
        mirror_bq=mirror_bq,
    )


@main.command("retention-run")
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def retention_run(config: str):
    """Apply / audit configured data retention policy."""
    from dpdp.retention import enforce_retention

    console.print(enforce_retention(config))


if __name__ == "__main__":
    main()
