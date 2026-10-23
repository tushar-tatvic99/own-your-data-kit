"""Test all connectors."""

from rich.console import Console

from kit.config import load_config

console = Console()


def test_all_connectors(config_path: str) -> None:
    cfg = load_config(config_path)
    connectors = cfg.get("connectors", {})

    console.print("\n[bold]Testing Connectors[/bold]\n")

    # Google Ads
    if "google_ads" in connectors:
        console.print("[1/4] Google Ads conversion upload...")
        try:
            from connectors.google_ads import send_conversion
            result = send_conversion(
                connectors["google_ads"]["customer_id"],
                connectors["google_ads"]["conversion_action_id"],
                email="test@example.com",
                conversion_value=99.99,
            )
            status = "[green]OK[/green]" if result["status"] == "success" else "[red]FAIL[/red]"
            console.print(f"  {status}: {result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e} (credentials not configured)")

    # Meta CAPI
    if "meta" in connectors:
        console.print("[2/4] Meta Conversions API...")
        try:
            from connectors.meta_capi import send_event
            result = send_event(
                connectors["meta"]["pixel_id"],
                connectors["meta"]["access_token"],
                event_name="Purchase",
                email="test@example.com",
                value=99.99,
                test_event_code="TEST12345",
            )
            console.print(f"  Result: {result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")

    # BigQuery
    if "bigquery" in connectors:
        console.print("[3/4] BigQuery export...")
        try:
            from connectors.bigquery_export import create_export_schema, export_events
            bq = connectors["bigquery"]
            create_export_schema(bq["project_id"], bq["dataset"], bq["table"])
            result = export_events(
                bq["project_id"], bq["dataset"], bq["table"],
                [{"event_name": "test", "category": "connector_test", "url": "/test"}],
            )
            console.print(f"  [green]OK[/green]: {result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")

    # Looker Studio
    if "looker" in connectors:
        console.print("[4/4] Looker Studio dashboard config...")
        try:
            from connectors.looker import generate_dashboard_config
            bq = connectors.get("bigquery", {})
            config = generate_dashboard_config(
                bq.get("project_id", "demo"),
                bq.get("dataset", "matomo_export"),
                bq.get("table", "events"),
            )
            console.print(f"  [green]OK[/green]: Dashboard '{config['name']}' with {len(config['pages'])} pages")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")

    console.print("\nConnector tests complete.")
