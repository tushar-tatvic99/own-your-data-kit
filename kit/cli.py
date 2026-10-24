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
    """Check health and connectivity of the configured analytics stack."""
    from kit.config import load_config
    from kit.adapters import get_stack_adapter

    try:
        cfg = load_config(config)
        adapter = get_stack_adapter(cfg)
        result = adapter.health_check()
        console.print(f"[bold green]✓ Stack Status:[/bold green] {result['status'].upper()}")
        console.print(f"  • Engine  : {result.get('engine', 'unknown').upper()}")
        console.print(f"  • Version : {result.get('version', 'N/A')}")
        console.print(f"  • Site ID : {result.get('site_id', 'N/A')}")
    except Exception as e:
        console.print(f"[bold red]✗ Stack Health Check Failed:[/bold red] {e}")


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
def migrate(config: str):
    """Run GA4/GTM migration agent."""
    from agents.migration.run import run_migration

    run_migration(config)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--date", "-d", default=None, help="Date to check (YYYY-MM-DD, default yesterday)")
def parity(config: str, date: str | None):
    """Run parity check between GA4 and target analytics stack."""
    from agents.parity.run import run_parity

    run_parity(config, date)


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
@click.confirmation_option(prompt="This will permanently delete the user's data. Continue?")
def dsar_delete(config: str, user_id: str):
    """DPDP: delete a person's analytics data."""
    from dpdp.dsar import delete_user

    result = delete_user(config, user_id)
    console.print(result)


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
def connectors_test(config: str):
    """Test all connector integrations."""
    from connectors.runner import test_all_connectors

    test_all_connectors(config)


if __name__ == "__main__":
    main()
