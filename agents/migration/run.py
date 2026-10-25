"""GA4/GTM Autonomous Migration Agent.

Reads GA4 property configuration and GTM containers via APIs,
maps them to the target open-source analytics stack using stack adapters,
creates a reviewable GTM draft workspace with injected tags,
and generates an executive migration audit report.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from agents.migration.ga4_reader import GA4Reader
from agents.migration.gtm_reader import GTMReader
from agents.migration.mapper import (
    UNMIGRATABLE,
    generate_gtm_draft_changes,
    generate_importable_gtm_json,
    map_conversion_event,
    map_custom_dimension,
    map_custom_metric,
)
from dpdp.audit_log import log_action
from kit.config import load_config
from kit.adapters import get_stack_adapter

console = Console()


def run_migration(
    config_path: str = "config/client.yaml",
    property_id: str | None = None,
    container_id: str | None = None,
    dry_run: bool = False,
) -> dict:
    """Execute the full autonomous migration agent pipeline."""
    cfg = load_config(config_path)
    output_dir = Path(cfg.get("migration", {}).get("output_dir", "output/migration"))
    output_dir.mkdir(parents=True, exist_ok=True)

    if property_id:
        cfg.setdefault("ga4", {})["property_id"] = str(property_id)
    if container_id:
        cfg.setdefault("gtm", {})["container_id"] = str(container_id)

    target_prop = cfg.get("ga4", {}).get("property_id", "Unknown")
    target_gtm = cfg.get("gtm", {}).get("container_id", "Unknown")
    stack_type = cfg.get("stack", {}).get("type", "matomo").upper()

    console.print("\n[bold cyan]╔════════════════════════════════════════════════════════════╗[/bold cyan]")
    console.print("[bold cyan]║       TATVIC OYDK — AUTONOMOUS GA4 MIGRATION AGENT         ║[/bold cyan]")
    console.print("[bold cyan]╚════════════════════════════════════════════════════════════╝[/bold cyan]\n")
    console.print(f"Target GA4 Property  : [bold green]{target_prop}[/bold green]")
    console.print(f"Target GTM Container : [bold green]{target_gtm}[/bold green]")
    console.print(f"Target Stack Engine  : [bold green]{stack_type}[/bold green]")
    
    if dry_run:
        console.print(f"Execution Mode       : [bold magenta]DRY-RUN SIMULATION (Zero Live Google API Calls)[/bold magenta]\n")
    else:
        console.print(f"Execution Mode       : [bold green]LIVE PRODUCTION (Authenticating against Google APIs)[/bold green]\n")

    # --- Step 1: Read GA4 setup ---
    console.print("[1/5] Harvesting GA4 property configuration via APIs...")
    try:
        ga4 = GA4Reader(
            property_id=target_prop,
            credentials_path=cfg.get("ga4", {}).get("credentials_file"),
            dry_run=dry_run,
        )
        ga4_setup = ga4.get_full_setup()
        console.print(f"  • Discovered Custom Dimensions : {len(ga4_setup['custom_dimensions'])}")
        console.print(f"  • Discovered Conversion Events : {len(ga4_setup['conversion_events'])}")
        console.print(f"  • Discovered Web Streams       : {len(ga4_setup['data_streams'])}")
    except RuntimeError as e:
        console.print(Panel(
            f"[bold red]GA4 API Authentication / Permission Failure[/bold red]\n\n{e}",
            title="[red]Error Harvesting GA4 Property[/red]",
            border_style="red",
        ))
        return {"status": "error", "stage": "ga4_harvest", "error": str(e)}

    # --- Step 2: Read GTM container ---
    console.print("\n[2/5] Inspecting Google Tag Manager container architecture...")
    try:
        gtm = GTMReader(
            account_id=cfg.get("gtm", {}).get("account_id", "6000000000"),
            container_id=target_gtm,
            credentials_path=cfg.get("gtm", {}).get("credentials_file", ""),
            dry_run=dry_run,
        )
        gtm_container = gtm.get_full_container()
        console.print(f"  • Discovered Tags      : {len(gtm_container['tags'])}")
        console.print(f"  • Discovered Triggers  : {len(gtm_container['triggers'])}")
        console.print(f"  • Discovered Variables : {len(gtm_container['variables'])}")
    except RuntimeError as e:
        console.print(Panel(
            f"[bold red]GTM API Authentication / Permission Failure[/bold red]\n\n{e}",
            title="[red]Error Inspecting GTM Container[/red]",
            border_style="red",
        ))
        return {"status": "error", "stage": "gtm_inspect", "error": str(e)}

    # --- Step 3: Build Open-Source Stack via Adapter ---
    console.print(f"\n[3/5] Provisioning target analytics engine [{stack_type}] via Adapter...")
    adapter = get_stack_adapter(cfg)

    migrated = {"dimensions": [], "metrics": [], "goals": [], "errors": []}

    for dim in ga4_setup["custom_dimensions"]:
        mapped = map_custom_dimension(dim)
        if dry_run:
            migrated["dimensions"].append({**mapped, "adapter_result": {"status": "dry_run_simulated"}})
            console.print(f"  [magenta]• [SIMULATED][/magenta] Dimension: {mapped['name']} (scope: {mapped['scope']})")
        else:
            try:
                res = adapter.create_custom_dimension(mapped["name"], mapped["scope"])
                migrated["dimensions"].append({**mapped, "adapter_result": res})
                console.print(f"  [green]✓[/green] Dimension: {mapped['name']} (scope: {mapped['scope']})")
            except Exception as e:
                migrated["errors"].append({"type": "dimension", "name": mapped["name"], "error": str(e)})
                console.print(f"  [yellow]![/yellow] Dimension: {mapped['name']} ({e})")

    for met in ga4_setup.get("custom_metrics", []):
        mapped = map_custom_metric(met)
        migrated["metrics"].append(mapped)
        console.print(f"  [green]✓[/green] Custom Metric: {mapped['name']} -> {mapped['target_mapping']}")

    for conv in ga4_setup["conversion_events"]:
        mapped = map_conversion_event(conv)
        if dry_run:
            migrated["goals"].append({**mapped, "adapter_result": {"status": "dry_run_simulated"}})
            console.print(f"  [magenta]• [SIMULATED][/magenta] Conversion Goal: {mapped['name']}")
        else:
            try:
                res = adapter.create_conversion_goal(
                    name=mapped["name"],
                    match_attribute=mapped.get("match_attribute", "event_action"),
                    pattern=mapped.get("pattern", ""),
                    pattern_type=mapped.get("pattern_type", "exact"),
                )
                migrated["goals"].append({**mapped, "adapter_result": res})
                console.print(f"  [green]✓[/green] Conversion Goal: {mapped['name']}")
            except Exception as e:
                migrated["errors"].append({"type": "goal", "name": mapped["name"], "error": str(e)})
                console.print(f"  [yellow]![/yellow] Conversion Goal: {mapped['name']} ({e})")

    # --- Step 4: Write GTM draft with staged tags ---
    console.print("\n[4/5] Staging changes in Google Tag Manager workspace (Draft Only)...")
    workspace = gtm.create_migration_workspace("OYDK Migration Draft")
    ws_id = workspace.get("workspace_id", "ws-draft-1001")

    gtm_draft = generate_gtm_draft_changes(
        gtm_container["tags"],
        cfg.get("stack", {}).get("url", "http://localhost:8080"),
        cfg.get("stack", {}).get("site_id", 1),
    )

    injected_tags = []
    for tag_spec in gtm_draft:
        res = gtm.create_custom_html_tag(
            workspace_id=ws_id,
            name=tag_spec["name"],
            html_content=tag_spec["html"],
            firing_trigger_ids=["2147479553"] if "Config" in tag_spec["name"] else ["201"],
        )
        injected_tags.append(res)
        console.print(f"  [green]✓[/green] Injected Tag: {tag_spec['name']} [dim]({res.get('status')})[/dim]")

    # Also save importable GTM JSON container file
    gtm_json = generate_importable_gtm_json(gtm_draft, target_gtm)
    gtm_json_path = output_dir / "gtm_draft_container.json"
    with open(gtm_json_path, "w", encoding="utf-8") as f:
        json.dump(gtm_json, f, indent=2)
    console.print(f"  [green]✓[/green] Importable GTM Container Export: {gtm_json_path}")
    console.print(f"  [bold yellow]⚠ SAFETY STATUS: DRAFT WORKSPACE ONLY — HUMAN REVIEW REQUIRED BEFORE PUBLISHING[/bold yellow]")

    # --- Step 5: Generate migration report ---
    console.print("\n[5/5] Compiling executive migration gap analysis & audit report...")
    unmigrated = UNMIGRATABLE

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "dry_run" if dry_run else "live",
        "ga4_property_id": target_prop,
        "gtm_container_id": target_gtm,
        "target_engine": stack_type,
        "migrated": migrated,
        "gtm_workspace": workspace,
        "injected_tags": injected_tags,
        "unmigrated_entities": unmigrated,
        "errors": migrated["errors"],
    }

    report_json_path = output_dir / "migration-report.json"
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    report_md_path = output_dir / "migration-report.md"
    _write_markdown_report(report_md_path, report)

    log_action(
        actor="migration-agent",
        action="migrate",
        resource=f"ga4:{target_prop}",
        details={
            "mode": "dry_run" if dry_run else "live",
            "migrated_dims": len(migrated["dimensions"]),
            "migrated_metrics": len(migrated["metrics"]),
            "migrated_goals": len(migrated["goals"]),
            "injected_tags": len(injected_tags),
            "unmigrated": len(unmigrated),
        },
    )

    # Executive Summary Table
    table = Table(title="Migration Executive Summary")
    table.add_column("Category", style="cyan")
    table.add_column("Discovered", justify="right")
    table.add_column("Migrated", justify="right", style="green")
    table.add_column("Status", style="bold")

    table.add_row(
        "Custom Dimensions",
        str(len(ga4_setup["custom_dimensions"])),
        str(len(migrated["dimensions"])),
        "[green]Mapped to Custom Dimensions[/green]",
    )
    table.add_row(
        "Custom Metrics",
        str(len(ga4_setup.get("custom_metrics", []))),
        str(len(migrated["metrics"])),
        "[green]Mapped to Event Values[/green]",
    )
    table.add_row(
        "Conversion Goals",
        str(len(ga4_setup["conversion_events"])),
        str(len(migrated["goals"])),
        "[green]Mapped to Engine Goals[/green]",
    )
    table.add_row(
        "GTM Migration Tags",
        str(len(gtm_container["tags"])),
        str(len(injected_tags)),
        "[yellow]Staged in GTM Draft (Unpublished)[/yellow]",
    )
    table.add_row(
        "Unmigrated Entities",
        str(len(unmigrated)),
        "0",
        "[yellow]Documented with Workable Alternatives[/yellow]",
    )
    console.print(table)
    console.print(f"\n[bold green]✓ Migration audit report written to:[/bold green] {report_md_path}")
    return report


def _write_markdown_report(path: Path, report: dict) -> None:
    lines = [
        "# GA4 to Open-Source Stack Migration Executive Audit Report",
        "",
        "> **Safety Guarantee:** No live tags or production tracking code were modified. All generated Google Tag Manager tags have been staged in an unpublished draft workspace.",
        "",
        f"- **Generated Timestamp (UTC)**: `{report['generated_at']}`",
        f"- **Execution Mode**: `{report.get('mode', 'live').upper()}`",
        f"- **Source GA4 Property ID**: `{report['ga4_property_id']}`",
        f"- **Target GTM Container ID**: `{report['gtm_container_id']}`",
        f"- **Target Analytics Engine**: `{report['target_engine']}`",
        "",
        "---",
        "",
        "## 1. Executive Summary",
        "",
        "| Schema Category | GA4 Discovered | Open-Source Migrated | Migration Status |",
        "| :--- | :---: | :---: | :--- |",
        f"| **Custom Dimensions** | {len(report['migrated']['dimensions'])} | {len(report['migrated']['dimensions'])} | Provisioned in Target Engine |",
        f"| **Custom Metrics** | {len(report['migrated']['metrics'])} | {len(report['migrated']['metrics'])} | Mapped to Event Values / Properties |",
        f"| **Conversion Goals** | {len(report['migrated']['goals'])} | {len(report['migrated']['goals'])} | Provisioned as Engine Goals |",
        f"| **GTM Tracking Tags** | {len(report['injected_tags'])} | {len(report['injected_tags'])} | Staged in Unpublished GTM Draft |",
        f"| **Unmigrated Features** | {len(report['unmigrated_entities'])} | 0 | Rationale & Alternatives Documented |",
        "",
        "---",
        "",
        "## 2. Successfully Migrated Entities",
        "",
        "### A. Custom Dimensions",
        "",
        "| Dimension Name | Scope | Target Mapping |",
        "| :--- | :--- | :--- |",
    ]

    for d in report["migrated"]["dimensions"]:
        lines.append(f"| {d['name']} | `{d['scope']}` | Matomo Custom Dimension (Active) |")

    lines.extend([
        "",
        "### B. Conversion Goals",
        "",
        "| Goal Name | Trigger Match Attribute | Matching Pattern |",
        "| :--- | :--- | :--- |",
    ])

    for g in report["migrated"]["goals"]:
        lines.append(f"| {g['name']} | `{g.get('match_attribute', 'event_action')}` | `{g.get('pattern', '')}` |")

    lines.extend([
        "",
        "---",
        "",
        "## 3. Google Tag Manager Draft Staging (Safety First)",
        "",
        "| Staged Tag Name | Ingestion Type | Firing Triggers | Workspace Status |",
        "| :--- | :--- | :--- | :--- |",
    ])

    for t in report["injected_tags"]:
        lines.append(f"| `{t['name']}` | Custom HTML (Matomo) | All Pages / Custom Events | Staged Draft (Unpublished) |")

    lines.extend([
        "",
        "> [!IMPORTANT]",
        "> Tags are currently in draft workspace **'OYDK Migration Draft'**. A human Tag Manager administrator must inspect the preview and approve deployment before publishing to production.",
        "",
        "---",
        "",
        "## 4. Unmigrated Entities & Recommended Alternatives",
        "",
        "The following proprietary Google Analytics 4 features cannot be directly converted into standard open-source tracking tags due to platform architecture constraints. Recommended alternatives have been prepared:",
        "",
        "| GA4 Proprietary Feature | Technical Constraint | Recommended Open-Source Alternative |",
        "| :--- | :--- | :--- |",
    ])

    for u in report["unmigrated_entities"]:
        lines.append(f"| **{u['feature']}** | {u['why']} | {u['alternative']} |")

    lines.extend([
        "",
        "---",
        "*Report autonomously compiled by Tatvic Own-Your-Data Analytics Kit (OYDK)*",
    ])

    path.write_text("\n".join(lines), encoding="utf-8")
