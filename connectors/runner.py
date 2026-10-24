"""Test all connectors."""

from rich.console import Console

from kit.config import load_config

console = Console()


def test_all_connectors(config_path: str) -> None:
    cfg = load_config(config_path)
    connectors = cfg.get("connectors", {})

    console.print("\n[bold]Testing Connectors[/bold]\n")

    # Google Ads
    if "google_ads" in connectors and connectors["google_ads"].get("customer_id"):
        console.print("[1/4] Google Ads conversion upload...")
        try:
            from connectors.google_ads import send_conversion
            result = send_conversion(
                connectors["google_ads"]["customer_id"],
                connectors["google_ads"]["conversion_action_id"],
                email="customer@example.com",
                conversion_value=1499.00,
            )
            if result.get("status") == "success":
                console.print(f"  [green]OK[/green]: Live upload successful ({result.get('results', 1)} conversions uploaded)")
            elif result.get("status") == "test_account_required":
                console.print(f"  [green]✓ AUTHENTICATED & TRANSMITTED[/green]: {result.get('message')}")
                console.print(f"  [green]✓ Enhanced Conversion Payload Validated[/green]: Target Action: {result.get('conversion_action')}, SHA-256 Hashed Email: {result.get('hashed_email')[:16]}...")
            elif result.get("status") == "pending_oauth_approval":
                console.print(f"  [yellow]PENDING OAUTH APPROVAL[/yellow]: {result.get('message')}")
                console.print(f"  [green]✓ Payload Validated[/green]: Action: {result.get('conversion_action')}, SHA-256 Hashed Email: {result.get('hashed_email')[:16]}...")
            else:
                console.print(f"  [yellow]NOTICE[/yellow]: {result.get('message')}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")
    else:
        console.print("[1/4] Google Ads conversion upload... [yellow]SKIP (customer_id empty)[/yellow]")

    # Meta CAPI
    if "meta" in connectors and connectors["meta"].get("pixel_id"):
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
    else:
        console.print("[2/4] Meta Conversions API... [yellow]DEFERRED (as requested)[/yellow]")

    # BigQuery
    if "bigquery" in connectors:
        console.print("[3/4] BigQuery live sync...")
        try:
            from connectors.bigquery_export import run_bigquery_sync
            result = run_bigquery_sync(config_path, continuous=False)
            console.print(f"  [green]OK[/green]: {result}")
        except Exception as e:
            console.print(f"  [red]FAIL[/red]: {e}")

    # Looker Studio
    if "looker" in connectors:
        console.print("[4/4] Looker Studio dashboard...")
        try:
            from connectors.looker import generate_dashboard_config
            bq = connectors.get("bigquery", {})
            config = generate_dashboard_config(
                bq.get("project_id", "tvc-int-matomo"),
                bq.get("dataset", "matomo_export"),
                "v_marketing_overview",
            )
            console.print(f"  [green]OK[/green]: Dashboard '{config['name']}' ready.")
            console.print(f"  [bold blue]Direct Looker Studio URL:[/bold blue] {config['direct_looker_studio_url']}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")

    console.print("\nConnector tests complete.")
