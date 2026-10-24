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


def run_migration(config_path: str = "config/client.yaml") -> dict:
    """Execute the full autonomous migration agent pipeline."""
    cfg = load_config(config_path)
    output_dir = Path(cfg.get("migration", {}).get("output_dir", "output/migration"))
    output_dir.mkdir(parents=True, exist_ok=True)

    console.print("\n[bold cyan]╔════════════════════════════════════════════════════════════╗[/bold cyan]")
    console.print("[bold cyan]║       TATVIC OYDK — AUTONOMOUS GA4 MIGRATION AGENT         ║[/bold cyan]")
    console.print("[bold cyan]╚════════════════════════════════════════════════════════════╝[/bold cyan]\n")

    # --- Step 1: Read GA4 setup ---
    console.print("[1/5] Harvesting GA4 property configuration via APIs...")
    ga4 = GA4Reader(
        property_id=cfg["ga4"]["property_id"],
        credentials_path=cfg["ga4"].get("credentials_file"),
    )
    ga4_setup = ga4.get_full_setup()
    console.print(f"  • Discovered Custom Dimensions : {len(ga4_setup['custom_dimensions'])}")
    console.print(f"  • Discovered Conversion Events : {len(ga4_setup['conversion_events'])}")
    console.print(f"  • Discovered Web Streams       : {len(ga4_setup['data_streams'])}")

    # --- Step 2: Read GTM container ---
    console.print("\n[2/5] Inspecting Google Tag Manager container architecture...")
    gtm = GTMReader(
        account_id=cfg["gtm"]["account_id"],
        container_id=cfg["gtm"]["container_id"],
        credentials_path=cfg["gtm"].get("credentials_file", ""),
    )
    gtm_container = gtm.get_full_container()
    console.print(f"  • Discovered Tags      : {len(gtm_container['tags'])}")
    console.print(f"  • Discovered Triggers  : {len(gtm_container['triggers'])}")
    console.print(f"  • Discovered Variables : {len(gtm_container['variables'])}")

    # --- Step 3: Build Open-Source Stack via Adapter ---
    stack_type = cfg.get("stack", {}).get("type", "matomo").upper()
    console.print(f"\n[3/5] Provisioning target analytics engine [{stack_type}] via Adapter...")
    adapter = get_stack_adapter(cfg)

    migrated = {"dimensions": [], "metrics": [], "goals": [], "errors": []}

    for dim in ga4_setup["custom_dimensions"]:
        mapped = map_custom_dimension(dim)
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
        cfg["stack"]["url"],
        cfg["stack"]["site_id"],
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
    gtm_json = generate_importable_gtm_json(gtm_draft, cfg.get("gtm", {}).get("container_id", "GTM-MMXM5L53"))
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
        "ga4_property_id": cfg["ga4"]["property_id"],
        "gtm_container_id": cfg["gtm"]["container_id"],
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
        resource=f"ga4:{cfg['ga4']['property_id']}",
        details={
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
        "## 2. Migrated Schema Entities",
        "",
        "### 2.1 Custom Dimensions",
        "| Dimension Name | Scope | GA4 Source Parameter | Target Engine Provisioning |",
        "| :--- | :--- | :--- | :--- |",
    ]
    for d in report["migrated"]["dimensions"]:
        lines.append(f"| **{d['name']}** | `{d['scope']}` | `{d.get('ga4_source', '')}` | `CustomDimensions.setCustomDimension` |")

    lines.extend([
        "",
        "### 2.2 Custom Metrics",
        "| Metric Name | Measurement Unit | Scope | Target Mapping |",
        "| :--- | :--- | :--- | :--- |",
    ])
    for m in report["migrated"]["metrics"]:
        lines.append(f"| **{m['name']}** | `{m.get('measurement_unit', 'STANDARD')}` | `{m.get('scope', 'action')}` | `{m.get('target_mapping')}` |")

    lines.extend([
        "",
        "### 2.3 Conversion Goals",
        "| Goal Name | Match Attribute | Target Engine Rule | Pattern |",
        "| :--- | :--- | :--- | :--- |",
    ])
    for g in report["migrated"]["goals"]:
        lines.append(f"| **{g['name']}** | `{g.get('match_attribute', 'event_action')}` | `Goals.addGoal` | `{g.get('pattern', '')}` |")

    lines.extend([
        "",
        "---",
        "",
        "## 3. Google Tag Manager Staged Draft Workspace",
        "",
        f"**Workspace Name**: `{report['gtm_workspace']['name']}`  ",
        f"**Workspace ID**: `{report['gtm_workspace'].get('workspace_id', 'ws-draft-1001')}`  ",
        "**Publish Status**: `UNPUBLISHED (DRAFT ONLY)`  ",
        "",
        "> [!IMPORTANT]",
        "> These tags are staged in draft mode only. Review and QA them in the Google Tag Manager preview mode before approving publication to production.",
        "",
        "| Staged Tag Name | Type | Firing Trigger | Status | Rationale |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ])
    for tag in report["injected_tags"]:
        lines.append(f"| **{tag['name']}** | Custom HTML | Consent Gated / Event Filter | `{tag['status']}` | {tag['note']} |")

    lines.extend([
        "",
        "### Alternative GTM Container Import",
        "For client security policies where service accounts lack write permissions on live GTM workspaces, an official container import file has been generated at:",
        "- `output/migration/gtm_draft_container.json`",
        "Import via: **Google Tag Manager -> Admin -> Import Container -> Choose Existing Workspace -> Merge**.",
        "",
        "---",
        "",
        "## 4. Gap Analysis & Workable Alternatives for Unmigrated Features",
        "",
        "The following GA4 proprietary features cannot be programmatically migrated to an open-source self-hosted stack. Technical rationale and recommended workable alternatives are provided below:",
        "",
        "| Feature | Category | Technical Rationale Why It Cannot Auto-Migrate | Recommended Workable Alternative | Action Required |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ])
    for item in report["unmigrated_entities"]:
        lines.append(f"| **{item['feature']}** | {item['category']} | {item['why']} | **{item['alternative']}** | `{item['action']}` |")

    lines.extend([
        "",
        "---",
        "",
        "## 5. Sign-Off & Verification Checklist",
        "- [ ] Staged GTM draft tags reviewed in Preview Mode by QA team.",
        "- [ ] Target engine custom dimensions verified via `kit.cli health`.",
        "- [ ] Daily parity schedule verified via `kit.cli parity`.",
        "- [ ] Client privacy officer sign-off on DPDP consent gating.",
    ])

    path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    import sys
    cfg_file = sys.argv[1] if len(sys.argv) > 1 else "config/client.yaml"
    run_migration(cfg_file)
