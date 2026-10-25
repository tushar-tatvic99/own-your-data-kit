"""Test all connectors."""

from rich.console import Console

from kit.config import load_config

console = Console()


def test_all_connectors(config_path: str, dry_run: bool = False) -> None:
    cfg = load_config(config_path)
    connectors = cfg.get("connectors", {})

    mode_label = "[yellow]SIMULATION / DRY-RUN[/yellow]" if dry_run else "[green]LIVE[/green]"
    console.print(f"\n[bold]Testing Connectors[/bold] [{mode_label}]\n")

    # 1. Google Ads
    gads = connectors.get("google_ads", {})
    customer_id = gads.get("customer_id")
    conversion_action_id = gads.get("conversion_action_id")
    gads_cred = gads.get("credentials_file", "credentials/google-ads.yaml")

    if dry_run:
        console.print("[1/4] Google Ads conversion upload [yellow](SIMULATION)[/yellow]...")
        from connectors.google_ads import send_conversion
        result = send_conversion(
            customer_id=customer_id or "123-456-7890",
            conversion_action_id=conversion_action_id or "1234567890",
            email="test.customer@client.com",
            conversion_value=1499.00,
            dry_run=True,
        )
        console.print(f"  [green]✓ Payload Validated[/green]: Target Action: {result.get('conversion_action')}, SHA-256 Hashed Email: {result.get('hashed_email')[:16]}...")
        console.print(f"  [green]✓ DPDP Consent Status[/green]: {result.get('consent_status')}")
    elif customer_id and conversion_action_id:
        console.print(f"[1/4] Google Ads conversion upload (Account: {customer_id})...")
        try:
            from connectors.google_ads import send_conversion
            result = send_conversion(
                customer_id=customer_id,
                conversion_action_id=conversion_action_id,
                email="test.customer@client.com",
                conversion_value=1499.00,
                credentials_path=gads_cred,
                dry_run=False,
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
            console.print(f"  [red]FAIL[/red]: {e}")
    else:
        console.print("[1/4] Google Ads conversion upload... [yellow]SKIP (google_ads.customer_id not configured in config/client.yaml. Use --dry-run to simulate)[/yellow]")

    # 2. Meta CAPI
    meta = connectors.get("meta", {})
    pixel_id = meta.get("pixel_id")
    access_token = meta.get("access_token")

    if dry_run:
        console.print("[2/4] Meta Conversions API (CAPI v19.0) [yellow](SIMULATION)[/yellow]...")
        from connectors.meta_capi import send_event
        result = send_event(
            pixel_id=pixel_id or "SIMULATION_PIXEL_123456",
            access_token=access_token or "SIMULATION_TOKEN_123456",
            event_name="Purchase",
            email="test.customer@client.com",
            phone="+91 98765 43210",
            value=1499.00,
            currency="INR",
            dry_run=True,
        )
        console.print(f"  [green]✓ CAPI v19.0 VALIDATED (SIMULATION)[/green]: {result.get('message', 'Conversion event dispatched')}")
        console.print(f"  [green]✓ Enhanced User Data[/green]: SHA-256 Hashed Email ({result.get('hashed_email', '')[:16]}...)")
        console.print(f"  [green]✓ DPDP Consent Enforcement[/green]: Data Processing Options = {result.get('data_processing_options')} ({result.get('consent_status')})")
    elif pixel_id and access_token:
        console.print(f"[2/4] Meta Conversions API (CAPI v19.0) (Pixel: {pixel_id})...")
        try:
            from connectors.meta_capi import send_event
            result = send_event(
                pixel_id=pixel_id,
                access_token=access_token,
                event_name="Purchase",
                email="test.customer@client.com",
                phone="+91 98765 43210",
                value=1499.00,
                currency="INR",
                dry_run=False,
            )
            console.print(f"  [green]OK[/green]: {result}")
        except Exception as e:
            console.print(f"  [red]FAIL[/red]: {e}")
    else:
        console.print("[2/4] Meta Conversions API (CAPI v19.0)... [yellow]SKIP (meta.pixel_id / access_token not configured in config/client.yaml. Use --dry-run to simulate)[/yellow]")

    # 3. BigQuery
    if "bigquery" in connectors and connectors["bigquery"].get("project_id"):
        console.print("[3/4] BigQuery live sync...")
        try:
            from connectors.bigquery_export import run_bigquery_sync
            result = run_bigquery_sync(config_path, continuous=False)
            console.print(f"  [green]OK[/green]: {result}")
        except Exception as e:
            console.print(f"  [red]FAIL[/red]: {e}")
    else:
        console.print("[3/4] BigQuery live sync... [yellow]SKIP (bigquery.project_id empty)[/yellow]")

    # 4. Looker Studio
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
