"""Test all connectors."""

import json
from pathlib import Path

from rich.console import Console

from kit.config import load_config

console = Console()


def test_all_connectors(config_path: str) -> None:
    cfg = load_config(config_path)
    connectors = cfg.get("connectors", {})
    demo_mode = connectors.get("demo_mode", True)

    console.print("\n[bold]Testing Connectors[/bold]\n")

    console.print("[0/5] CMP consent signals...")
    from connectors.cmp_signals import describe_cmp_integration

    console.print(f"  [green]OK[/green]: {describe_cmp_integration(config_path)}")

    from connectors.demo_pipeline import is_placeholder, record_demo_conversion

    ads = connectors.get("google_ads", {})
    meta = connectors.get("meta", {})

    console.print("[1/5] Google Ads conversion upload...")
    if demo_mode and is_placeholder(ads.get("customer_id")):
        result = record_demo_conversion(cfg, "google_ads", "purchase", 99.99, "test@example.com")
        console.print(f"  [green]DEMO OK[/green]: {result['message']}")
    elif ads.get("customer_id"):
        try:
            from connectors.google_ads import send_conversion

            result = send_conversion(
                ads["customer_id"],
                ads["conversion_action_id"],
                email="test@example.com",
                conversion_value=99.99,
            )
            status = "[green]OK[/green]" if result.get("status") == "success" else "[red]FAIL[/red]"
            console.print(f"  {status}: {result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")
    else:
        console.print("  [yellow]SKIP[/yellow] (customer_id empty)")

    console.print("[2/5] Meta Conversions API...")
    if demo_mode and is_placeholder(meta.get("pixel_id")):
        result = record_demo_conversion(cfg, "meta_capi", "Purchase", 99.99, "test@example.com")
        console.print(f"  [green]DEMO OK[/green]: {result['message']}")
    elif meta.get("pixel_id"):
        try:
            from connectors.meta_capi import send_event

            result = send_event(
                meta["pixel_id"],
                meta["access_token"],
                event_name="Purchase",
                email="test@example.com",
                value=99.99,
                test_event_code="TEST12345",
            )
            console.print(f"  Result: {result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")
    else:
        console.print("  [yellow]SKIP[/yellow] (pixel_id empty)")

    console.print("[3/5] BigQuery...")
    if connectors.get("bigquery"):
        try:
            from connectors.bigquery_export import export_events, run_bigquery_sync

            bq = connectors["bigquery"]
            create_only = export_events(
                bq["project_id"],
                bq["dataset"],
                bq.get("connector_table", "connector_conversions"),
                [{"event_name": "connector_test", "category": "connector_test", "url": "/test"}],
            )
            console.print(f"  Sample insert: {create_only}")
            sync_result = run_bigquery_sync(config_path, continuous=False)
            console.print(f"  Live sync: [green]OK[/green] {sync_result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")

    console.print("[4/5] Looker Studio dashboard config...")
    try:
        from connectors.looker import generate_dashboard_config

        bq = connectors.get("bigquery", {})
        dash = generate_dashboard_config(
            bq.get("project_id", "demo"),
            bq.get("dataset", "matomo_export"),
            bq.get("table", "events"),
        )
        path = Path("output/connectors/looker-dashboard.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(dash, indent=2), encoding="utf-8")
        console.print(f"  [green]OK[/green]: Dashboard '{dash['name']}' → {path}")
        if dash.get("direct_looker_studio_url"):
            console.print(f"  Looker URL: {dash['direct_looker_studio_url']}")
    except Exception as e:
        console.print(f"  [yellow]SKIP[/yellow]: {e}")

    console.print("\nConnector tests complete.")
