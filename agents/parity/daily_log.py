"""Append each parity run to a rolling CSV (daily continuity sheet)."""

import csv
from datetime import datetime, timezone
from pathlib import Path

SHEET_NAME = "parity-daily-sheet.csv"
HEADERS = [
    "run_at_utc",
    "report_date",
    "mode",
    "target_gap_percent",
    "all_within_target",
    "missed_count",
    "missed_metrics",
    "email_sent",
    "simulated_break_tag",
]


def append_parity_row(report: dict, output_dir: Path | None = None) -> Path:
    """Append one row per parity check; creates file with header if missing."""
    out = output_dir or Path("output/parity")
    out.mkdir(parents=True, exist_ok=True)
    path = out / SHEET_NAME

    missed = [g for g in report.get("gaps", []) if not g.get("within_target")]
    missed_names = ";".join(g["metric"] for g in missed)
    row = {
        "run_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "report_date": report.get("date", ""),
        "mode": report.get("mode", ""),
        "target_gap_percent": report.get("target_gap_percent", ""),
        "all_within_target": report.get("all_within_target", ""),
        "missed_count": len(missed),
        "missed_metrics": missed_names,
        "email_sent": (report.get("email_alert") or {}).get("sent", False),
        "simulated_break_tag": report.get("simulated_break_tag") or "",
    }

    write_header = not path.exists()
    with open(path, "a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=HEADERS)
        if write_header:
            writer.writeheader()
        writer.writerow(row)
    return path
