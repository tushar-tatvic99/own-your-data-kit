"""GA4/GTM Migration Agent — reads setup, builds Matomo config, writes GTM draft."""

import json
from datetime import datetime, timezone
from pathlib import Path

from rich.console import Console
from rich.table import Table

from agents.migration.fixture_reader import FixtureGA4Reader, FixtureGTMReader
from agents.migration.ga4_reader import GA4Reader
from agents.migration.gtm_reader import GTMReader
from agents.migration.gtm_draft_writer import write_gtm_draft_bundle
from agents.migration.gtm_suggested_container import (
    generate_gtm_matomo_suggested_container,
    write_gtm_matomo_suggested_container,
)
from agents.migration.mtm_draft_writer import generate_mtm_container_draft, write_mtm_container_draft
from agents.migration.mapper import (
    UNMIGRATABLE,
    generate_gtm_draft_changes,
    map_conversion_event,
    map_custom_dimension,
)
from dpdp.audit_log import log_action
from kit.config import load_config
from kit.analytics_stack import analytics_stack_from_config
from kit.matomo_token import resolve_matomo_token, verify_matomo_token

console = Console()


def _fixture_paths(cfg: dict) -> tuple[Path, Path]:
    mig = cfg.get("migration", {})
    fixture_dir = Path(mig.get("fixture_dir", "agents/migration/fixtures"))
    ga4_name = mig.get("fixture_ga4", "aurablush_ga4.json")
    gtm_name = mig.get("fixture_gtm", "aurablush_gtm.json")
    return fixture_dir / ga4_name, fixture_dir / gtm_name


def _use_fixture_mode(cfg: dict, fixture_flag: bool) -> bool:
    if fixture_flag or cfg.get("migration", {}).get("use_fixture"):
        return True
    creds = Path(cfg["ga4"]["credentials_file"])
    return not creds.exists()


def run_migration(config_path: str, fixture: bool = False) -> dict:
    """Execute the full migration agent pipeline."""
    cfg = load_config(config_path)
    output_dir = Path(cfg.get("migration", {}).get("output_dir", "output/migration"))
    output_dir.mkdir(parents=True, exist_ok=True)
    fixture_mode = _use_fixture_mode(cfg, fixture)

    console.print("\n[bold]GA4/GTM Migration Agent[/bold]\n")
    if fixture_mode:
        console.print("[yellow]Fixture mode[/yellow] — using offline GA4/GTM snapshots (no Google APIs)\n")

    # --- Step 1: Read GA4 setup ---
    console.print("[1/5] Reading GA4 property configuration...")
    if fixture_mode:
        ga4_path, gtm_path = _fixture_paths(cfg)
        ga4 = FixtureGA4Reader(ga4_path)
    else:
        ga4 = GA4Reader(cfg["ga4"]["property_id"], cfg["ga4"]["credentials_file"])
    ga4_setup = ga4.get_full_setup()
    console.print(f"  Found {len(ga4_setup['custom_dimensions'])} custom dimensions, "
                  f"{len(ga4_setup['conversion_events'])} conversions, "
                  f"{len(ga4_setup['data_streams'])} data streams")

    # --- Step 2: Read GTM container ---
    console.print("[2/5] Reading GTM container...")
    if fixture_mode:
        gtm = FixtureGTMReader(
            gtm_path,
            cfg["gtm"]["account_id"],
            cfg["gtm"]["container_id"],
        )
    else:
        gtm = GTMReader(
            cfg["gtm"]["account_id"],
            cfg["gtm"]["container_id"],
            cfg["gtm"]["credentials_file"],
        )
    gtm_container = gtm.get_full_container()
    gtm_public = gtm_container.get("public_id") or cfg["gtm"].get("public_id")
    console.print(f"  Found {len(gtm_container['tags'])} tags, "
                  f"{len(gtm_container['triggers'])} triggers, "
                  f"{len(gtm_container['variables'])} variables")

    # --- Step 3: Build Matomo setup ---
    console.print("[3/5] Building Matomo configuration...")
    api_token = resolve_matomo_token(cfg["stack"]["api_token"])
    verify_matomo_token(cfg["stack"]["url"], api_token, int(cfg["stack"]["site_id"]))
    matomo = analytics_stack_from_config(config_path)

    migrated = {"dimensions": [], "goals": [], "errors": []}
    existing_dims = {
        d.get("name", "").lower()
        for d in matomo.list_custom_dimensions()
        if isinstance(d, dict)
    }
    existing_goals = {
        g.get("name", "").lower()
        for g in matomo.list_goals()
        if isinstance(g, dict)
    }

    for dim in ga4_setup["custom_dimensions"]:
        mapped = map_custom_dimension(dim)
        if mapped["name"].lower() in existing_dims:
            console.print(f"  [blue]○[/blue] Dimension exists: {mapped['name']}")
            migrated["dimensions"].append({**mapped, "matomo_result": "already_exists"})
            continue
        try:
            result = matomo.create_custom_dimension(mapped["name"], mapped["scope"])
            migrated["dimensions"].append({**mapped, "matomo_result": result})
            existing_dims.add(mapped["name"].lower())
            console.print(f"  [green]✓[/green] Dimension: {mapped['name']}")
        except Exception as e:
            err = str(e)
            if "already" in err.lower() or "exist" in err.lower():
                console.print(f"  [blue]○[/blue] Dimension exists: {mapped['name']}")
                migrated["dimensions"].append({**mapped, "matomo_result": "already_exists"})
            else:
                migrated["errors"].append({"type": "dimension", "name": mapped["name"], "error": err})
                console.print(f"  [red]✗[/red] Dimension: {mapped['name']} — {e}")

    for conv in ga4_setup["conversion_events"]:
        mapped = map_conversion_event(conv)
        if mapped["name"].lower() in existing_goals:
            console.print(f"  [blue]○[/blue] Goal exists: {mapped['name']}")
            migrated["goals"].append({**mapped, "matomo_result": "already_exists"})
            continue
        try:
            result = matomo.add_goal(
                mapped["name"],
                mapped.get("match_attribute", "event_action"),
                mapped.get("pattern", ""),
                mapped.get("pattern_type", "contains"),
            )
            migrated["goals"].append({**mapped, "matomo_result": result})
            existing_goals.add(mapped["name"].lower())
            console.print(f"  [green]✓[/green] Goal: {mapped['name']}")
        except Exception as e:
            err = str(e)
            if "already" in err.lower() or "exist" in err.lower():
                console.print(f"  [blue]○[/blue] Goal exists: {mapped['name']}")
                migrated["goals"].append({**mapped, "matomo_result": "already_exists"})
            else:
                migrated["errors"].append({"type": "goal", "name": mapped["name"], "error": err})
                console.print(f"  [red]✗[/red] Goal: {mapped['name']} — {e}")

    # --- Step 4: Write GTM draft ---
    console.print("[4/5] Creating GTM migration workspace (draft only)...")
    if fixture_mode:
        workspace = {
            "workspace_id": "fixture",
            "name": "OYDK Migration Draft",
            "created": False,
            "simulated": True,
        }
    else:
        workspace = gtm.get_or_create_migration_workspace()
        if workspace.get("error"):
            console.print(f"  [yellow]GTM workspace API: {workspace['error']}[/yellow]")
            console.print("  [yellow]Draft saved to output/migration/gtm-draft-bundle.json for manual import.[/yellow]")
        elif workspace.get("created"):
            console.print(f"  [green]Created[/green] workspace: {workspace['name']} (ID: {workspace['workspace_id']})")
        else:
            console.print(f"  Using existing workspace: {workspace['name']} (ID: {workspace['workspace_id']})")
    gtm_draft = generate_gtm_draft_changes(
        gtm_container["tags"],
        cfg["stack"]["url"],
        cfg["stack"]["site_id"],
    )
    draft_path = write_gtm_draft_bundle(output_dir, workspace, gtm_draft, gtm_container)
    console.print(f"  GTM workspace draft bundle: {draft_path}")
    console.print("  [yellow]NOT PUBLISHED[/yellow] — human review required")

    console.print("[4b/5] Building Matomo Tag Manager (MTM) container draft...")
    mtm_draft = generate_mtm_container_draft(
        gtm_container,
        cfg["stack"]["url"],
        int(cfg["stack"]["site_id"]),
        ga4_property_id=cfg["ga4"]["property_id"],
    )
    mtm_path = write_mtm_container_draft(output_dir, mtm_draft)
    console.print(f"  MTM container draft: {mtm_path}")

    console.print("[4c/5] Building suggested GTM container (Matomo-only blueprint)...")
    gtm_suggested = generate_gtm_matomo_suggested_container(
        gtm_container,
        cfg["stack"]["url"],
        int(cfg["stack"]["site_id"]),
        source_public_id=gtm_public,
    )
    gtm_suggested_path = write_gtm_matomo_suggested_container(output_dir, gtm_suggested)
    console.print(f"  GTM Matomo suggested container: {gtm_suggested_path}")

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
        "mode": "fixture" if fixture_mode else "live",
        "ga4_property": cfg["ga4"]["property_id"],
        "gtm_container": cfg["gtm"]["container_id"],
        "gtm_public_id": gtm_public,
        "migrated": migrated,
        "gtm_workspace": workspace,
        "gtm_draft_changes": gtm_draft,
        "mtm_container_draft": {
            "path": "output/migration/mtm-container-draft.json",
            "tag_count": len(mtm_draft.get("tags") or []),
            "trigger_count": len(mtm_draft.get("triggers") or []),
            "variable_count": len(mtm_draft.get("variables") or []),
        },
        "gtm_matomo_suggested_container": {
            "path": "output/migration/gtm-matomo-suggested-container.json",
            "name": gtm_suggested["suggested_container"]["name"],
            "tag_count": len(gtm_suggested.get("tags") or []),
        },
        "artifacts": {
            "migration_report_md": "output/migration/migration-report.md",
            "gtm_workspace_draft": "output/migration/gtm-draft-bundle.json",
            "mtm_container_draft": "output/migration/mtm-container-draft.json",
            "gtm_matomo_suggested_container": "output/migration/gtm-matomo-suggested-container.json",
        },
        "unmigrated": unmigrated,
        "errors": migrated["errors"],
    }

    report_path = output_dir / "migration-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    # Also write human-readable markdown
    md_path = output_dir / "migration-report.md"
    _write_markdown_report(md_path, report)

    log_action(
        "migration-agent",
        "migrate",
        f"ga4:{cfg['ga4']['property_id']}",
        details={
            "mode": "fixture" if fixture_mode else "live",
            "migrated_dims": len(migrated["dimensions"]),
            "migrated_goals": len(migrated["goals"]),
            "unmigrated": len(unmigrated),
        },
    )

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
        f"Mode: **{report.get('mode', 'live')}**",
        f"GA4 Property: {report['ga4_property']}",
        f"GTM Container: {report['gtm_container']}"
        + (f" (`{report['gtm_public_id']}`)" if report.get("gtm_public_id") else ""),
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

    lines.extend(["", "## GTM workspace draft (NOT published)"])
    for change in report["gtm_draft_changes"]:
        lines.append(f"- **{change['name']}** — {change.get('note', '')}")
    lines.append("")
    lines.append("See `gtm-draft-bundle.json` — changes for **OYDK Migration Draft** workspace only.")

    mtm = report.get("mtm_container_draft") or {}
    lines.extend(
        [
            "",
            "## Matomo Tag Manager (MTM) container draft (NOT published)",
            f"- Tags: {mtm.get('tag_count', '—')} · Triggers: {mtm.get('trigger_count', '—')} · "
            f"Variables: {mtm.get('variable_count', '—')}",
            f"- File: `{mtm.get('path', 'output/migration/mtm-container-draft.json')}`",
        ]
    )
    gsc = report.get("gtm_matomo_suggested_container") or {}
    lines.extend(
        [
            "",
            "## Suggested new GTM container — Matomo only (NOT published)",
            f"- **{gsc.get('name', 'OYDK Matomo tracking (suggested)')}**",
            f"- Proposed tags: {gsc.get('tag_count', '—')}",
            f"- File: `{gsc.get('path', 'output/migration/gtm-matomo-suggested-container.json')}`",
        ]
    )

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

    args = sys.argv[1:]
    fixture = "--fixture" in args
    args = [a for a in args if a != "--fixture"]
    config = args[0] if args else "config/client.yaml"
    run_migration(config, fixture=fixture)
