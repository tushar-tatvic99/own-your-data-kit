"""GA4/GTM Migration Agent — reads setup, builds Matomo config, writes GTM draft."""

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
    map_conversion_event,
    map_custom_dimension,
)
from dpdp.audit_log import log_action
from kit.config import load_config
from kit.matomo_client import MatomoClient

console = Console()


def run_migration(config_path: str) -> dict:
    """Execute the full migration agent pipeline."""
    cfg = load_config(config_path)
    output_dir = Path(cfg.get("migration", {}).get("output_dir", "output/migration"))
    output_dir.mkdir(parents=True, exist_ok=True)

    console.print("\n[bold]GA4/GTM Migration Agent[/bold]\n")

    # --- Step 1: Read GA4 setup ---
    console.print("[1/5] Reading GA4 property configuration...")
    ga4 = GA4Reader(cfg["ga4"]["property_id"], cfg["ga4"]["credentials_file"])
    ga4_setup = ga4.get_full_setup()
    console.print(f"  Found {len(ga4_setup['custom_dimensions'])} custom dimensions, "
                  f"{len(ga4_setup['conversion_events'])} conversions, "
                  f"{len(ga4_setup['data_streams'])} data streams")

    # --- Step 2: Read GTM container ---
    console.print("[2/5] Reading GTM container...")
    gtm = GTMReader(cfg["gtm"]["account_id"], cfg["gtm"]["container_id"],
                    cfg["gtm"]["credentials_file"])
    gtm_container = gtm.get_full_container()
    console.print(f"  Found {len(gtm_container['tags'])} tags, "
                  f"{len(gtm_container['triggers'])} triggers, "
                  f"{len(gtm_container['variables'])} variables")

    # --- Step 3: Build Matomo setup ---
    console.print("[3/5] Building Matomo configuration...")
    matomo = MatomoClient(cfg["stack"]["url"], cfg["stack"]["site_id"],
                            cfg["stack"]["api_token"])

    migrated = {"dimensions": [], "goals": [], "errors": []}

    for dim in ga4_setup["custom_dimensions"]:
        mapped = map_custom_dimension(dim)
        try:
            result = matomo.create_custom_dimension(mapped["name"], mapped["scope"])
            migrated["dimensions"].append({**mapped, "matomo_result": result})
            console.print(f"  [green]✓[/green] Dimension: {mapped['name']}")
        except Exception as e:
            migrated["errors"].append({"type": "dimension", "name": mapped["name"], "error": str(e)})
            console.print(f"  [red]✗[/red] Dimension: {mapped['name']} — {e}")

    for conv in ga4_setup["conversion_events"]:
        mapped = map_conversion_event(conv)
        try:
            result = matomo.add_goal(
                mapped["name"],
                mapped.get("match_attribute", "event_action"),
                mapped.get("pattern", ""),
                mapped.get("pattern_type", "contains"),
            )
            migrated["goals"].append({**mapped, "matomo_result": result})
            console.print(f"  [green]✓[/green] Goal: {mapped['name']}")
        except Exception as e:
            migrated["errors"].append({"type": "goal", "name": mapped["name"], "error": str(e)})
            console.print(f"  [red]✗[/red] Goal: {mapped['name']} — {e}")

    # --- Step 4: Write GTM draft ---
    console.print("[4/5] Creating GTM migration workspace (draft only)...")
    workspace = gtm.create_migration_workspace()
    gtm_draft = generate_gtm_draft_changes(
        gtm_container["tags"],
        cfg["stack"]["url"],
        cfg["stack"]["site_id"],
    )
    console.print(f"  Workspace created: {workspace['name']} (ID: {workspace['workspace_id']})")
    console.print(f"  [yellow]NOT PUBLISHED[/yellow] — human review required")

    # --- Step 5: Generate migration report ---
    console.print("[5/5] Writing migration report...")
    unmigrated = []
    for item, reason in UNMIGRATABLE.items():
        unmigrated.append({"item": item, "reason": reason})

    # Check for GTM tags that couldn't be mapped
    for tag in gtm_container["tags"]:
        from agents.migration.mapper import map_gtm_tag_to_matomo
        if tag["type"] in ("gaawe", "gaawc") and map_gtm_tag_to_matomo(tag) is None:
            unmigrated.append({
                "item": f"GTM tag: {tag['name']}",
                "reason": f"Tag type '{tag['type']}' could not be auto-mapped",
            })

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ga4_property": cfg["ga4"]["property_id"],
        "gtm_container": cfg["gtm"]["container_id"],
        "migrated": migrated,
        "gtm_workspace": workspace,
        "gtm_draft_changes": gtm_draft,
        "unmigrated": unmigrated,
        "errors": migrated["errors"],
    }

    report_path = output_dir / "migration-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    # Also write human-readable markdown
    md_path = output_dir / "migration-report.md"
    _write_markdown_report(md_path, report)

    log_action("migration-agent", "migrate", f"ga4:{cfg['ga4']['property_id']}",
               details={"migrated_dims": len(migrated["dimensions"]),
                        "migrated_goals": len(migrated["goals"]),
                        "unmigrated": len(unmigrated)})

    # Summary table
    table = Table(title="Migration Summary")
    table.add_column("Category", style="cyan")
    table.add_column("Count", justify="right")
    table.add_row("Custom dimensions migrated", str(len(migrated["dimensions"])))
    table.add_row("Goals/conversions migrated", str(len(migrated["goals"])))
    table.add_row("GTM draft changes", str(len(gtm_draft)))
    table.add_row("Unmigrated items", str(len(unmigrated)))
    table.add_row("Errors", str(len(migrated["errors"])))
    console.print(table)
    console.print(f"\nReport: {report_path}")
    console.print(f"GTM workspace: {workspace['name']} — review in GTM UI before publishing")

    return report


def _write_markdown_report(path: Path, report: dict) -> None:
    lines = [
        "# Migration Report",
        f"Generated: {report['generated_at']}",
        f"GA4 Property: {report['ga4_property']}",
        "",
        "## Migrated",
        "",
        "### Custom Dimensions",
    ]
    for d in report["migrated"]["dimensions"]:
        lines.append(f"- **{d['name']}** (scope: {d['scope']}, GA4: `{d['ga4_source']}`)")

    lines.extend(["", "### Goals / Conversions"])
    for g in report["migrated"]["goals"]:
        lines.append(f"- **{g['name']}** (GA4 event: `{g['ga4_source']}`)")

    lines.extend(["", "## GTM Draft Changes (NOT published)"])
    for change in report["gtm_draft_changes"]:
        lines.append(f"- **{change['name']}** — {change.get('note', '')}")

    lines.extend(["", "## Unmigrated Items"])
    for item in report["unmigrated"]:
        lines.append(f"- **{item['item']}**: {item['reason']}")

    if report["errors"]:
        lines.extend(["", "## Errors"])
        for err in report["errors"]:
            lines.append(f"- {err['type']}: {err['name']} — {err['error']}")

    path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    import sys
    config = sys.argv[1] if len(sys.argv) > 1 else "config/client.yaml"
    run_migration(config)
