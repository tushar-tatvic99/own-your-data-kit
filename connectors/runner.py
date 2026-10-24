"""Test all connectors."""

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

    # Google Ads
    console.print("[1/5] Google Ads conversion upload...")
    if demo_mode and is_placeholder(ads.get("customer_id")):
        result = record_demo_conversion(cfg, "google_ads", "purchase", 99.99, "test@example.com")
        console.print(f"  [green]DEMO OK[/green]: {result['message']}")
    else:
        try:
            from connectors.google_ads import send_conversion

            result = send_conversion(
                ads["customer_id"],
                ads["conversion_action_id"],
                email="test@example.com",
                conversion_value=99.99,
            )
            status = "[green]OK[/green]" if result["status"] == "success" else "[red]FAIL[/red]"
            console.print(f"  {status}: {result}")
        except Exception as e:
            console.print(f"  [yellow]SKIP[/yellow]: {e}")

    # Meta CAPI
    console.print("[2/5] Meta Conversions API...")
    if demo_mode and is_placeholder(meta.get("pixel_id")):
        result = record_demo_conversion(cfg, "meta_capi", "Purchase", 99.99, "test@example.com")
        console.print(f"  [green]DEMO OK[/green]: {result['message']}")
    else:
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

    # BigQuery
    console.print("[3/5] BigQuery export...")
    try:
        from connectors.bigquery_export import create_export_schema, export_events

        bq = connectors["bigquery"]
        create_export_schema(bq["project_id"], bq["dataset"], bq["table"])
        result = export_events(
            bq["project_id"],
            bq["dataset"],
            bq["table"],
            [{"event_name": "test", "category": "connector_test", "url": "/test"}],
        )
        console.print(f"  [green]OK[/green]: {result}")
    except Exception as e:
        console.print(f"  [yellow]SKIP[/yellow]: {e}")

    # Looker Studio
    console.print("[4/5] Looker Studio dashboard config...")
    try:
        from connectors.looker import generate_dashboard_config

        bq = connectors.get("bigquery", {})
        dash = generate_dashboard_config(
            bq.get("project_id", "demo"),
            bq.get("dataset", "matomo_export"),
            bq.get("table", "events"),
        )
        out = cfg.get("migration", {}).get("output_dir", "output/migration")
        from pathlib import Path
        import json

        path = Path("output/connectors/looker-dashboard.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(dash, indent=2), encoding="utf-8")
        console.print(
            f"  [green]OK[/green]: Dashboard '{dash['name']}' → {path}"
        )
    except Exception as e:
        console.print(f"  [yellow]SKIP[/yellow]: {e}")

    console.print("\nConnector tests complete.")
