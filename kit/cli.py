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
def migrate(config: str):
    """Run GA4/GTM migration agent."""
    from agents.migration.run import run_migration

    run_migration(config)


@main.command()
@click.option("--config", "-c", default="config/client.yaml", help="Client config file")
@click.option("--date", "-d", default=None, help="Date to check (YYYY-MM-DD, default yesterday)")
def parity(config: str, date: str | None):
    """Run parity check between GA4 and Matomo."""
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
def connectors_test(config: str):
    """Test all connector integrations."""
    from connectors.runner import test_all_connectors

    test_all_connectors(config)


if __name__ == "__main__":
    main()
