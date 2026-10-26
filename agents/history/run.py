"""Import GA4 history from BigQuery export into Matomo (stretch goal)."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from rich.console import Console
from rich.table import Table

from agents.history.ga4_bq_reader import read_from_bigquery, read_from_fixture
from agents.history.matomo_replay import replay_rows
from agents.history.warehouse_mirror import mirror_to_warehouse
from dpdp.audit_log import log_action
from kit.config import load_config

console = Console()
ROOT = Path(__file__).resolve().parents[2]


def run_ga4_history_import(
    config_path: str,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = None,
    fixture: bool = False,
    dry_run: bool = False,
    mirror_bq: bool = False,
) -> dict:
    cfg = load_config(config_path)
    hist = cfg.get("history", {})
    ga4 = cfg.get("ga4", {})
    stack = cfg["stack"]
    bq_hist = hist.get("ga4_bigquery", {})

    if limit is None:
        limit = int(hist.get("import_limit", 1000))
    if dry_run is False and hist.get("dry_run"):
        dry_run = True

    if end_date is None:
        end_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    if start_date is None:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        start_date = (end_dt - timedelta(days=7)).strftime("%Y-%m-%d")

    project_id = bq_hist.get("project_id") or cfg.get("connectors", {}).get("bigquery", {}).get(
        "project_id"
    )
    dataset = bq_hist.get("dataset") or f"analytics_{ga4.get('property_id', '')}"
    fixture_path = Path(
        hist.get("fixture_file", "agents/history/fixtures/sample_ga4_bq_rows.json")
    )

    console.print(f"\n[bold]GA4 history import[/bold] {start_date} → {end_date} (limit {limit})\n")

    rows: list[dict] = []
    source = "fixture"
    if fixture or hist.get("use_fixture"):
        if not fixture_path.is_absolute():
            fixture_path = ROOT / fixture_path
        rows = read_from_fixture(fixture_path, limit)
        console.print(f"[yellow]Fixture mode[/yellow] — {fixture_path.name}\n")
    else:
        source = "bigquery"
        bq_location = bq_hist.get("location") or cfg.get("client", {}).get("region")
        try:
            rows = read_from_bigquery(
                project_id, dataset, start_date, end_date, limit, location=bq_location
            )
        except Exception as exc:
            console.print(f"[red]BigQuery read failed:[/red] {exc}")
            console.print(
                "[yellow]GA4 export dataset is not the same as matomo_export.[/yellow]\n"
                "  • Enable GA4 → BigQuery link (Admin → Product links) — creates analytics_<PROPERTY_ID>\n"
                f"  • Or set history.ga4_bigquery.project_id / dataset / location (e.g. asia-south1)\n"
                "  • Demo without BQ: Preview (fixture) or --fixture"
            )
            return {"status": "error", "message": str(exc)}

    console.print(f"Loaded {len(rows)} events from {source}")

    if not rows:
        return {"status": "empty", "rows": 0}

    table = Table(title="Sample rows (first 5)")
    table.add_column("cdt")
    table.add_column("event")
    table.add_column("url")
    for r in rows[:5]:
        table.add_row(str(r.get("cdt")), r.get("event_name", ""), (r.get("page_url") or "")[:50])
    console.print(table)

    replay = replay_rows(
        stack["url"],
        int(stack["site_id"]),
        rows,
        dry_run=dry_run,
        throttle_ms=int(hist.get("throttle_ms", 0)),
    )
    console.print(replay)

    mirror_result = None
    if mirror_bq or hist.get("mirror_to_warehouse"):
        wh = cfg.get("connectors", {}).get("bigquery", {})
        mirror_result = mirror_to_warehouse(
            wh.get("project_id", project_id),
            wh.get("dataset", "matomo_export"),
            hist.get("warehouse_table", "ga4_history_import"),
            rows,
        )
        console.print(f"Warehouse mirror: {mirror_result}")

    report = {
        "status": "ok",
        "source": source,
        "date_range": {"start": start_date, "end": end_date},
        "rows_loaded": len(rows),
        "matomo_replay": replay,
        "warehouse_mirror": mirror_result,
        "dry_run": dry_run,
    }

    out_dir = ROOT / "output" / "history"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / f"import-{start_date}-to-{end_date}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    console.print(f"\nReport: {report_path}")

    log_action(
        "history-import",
        "ga4_bq",
        f"{start_date}:{end_date}",
        details={"rows": len(rows), "dry_run": dry_run, "sent": replay.get("sent")},
    )
    return report


if __name__ == "__main__":
    import sys

    run_ga4_history_import(
        sys.argv[1] if len(sys.argv) > 1 else "config/client.yaml",
        fixture="--fixture" in sys.argv,
        dry_run="--dry-run" in sys.argv,
    )
