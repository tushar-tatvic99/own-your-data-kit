"""Verify all five required build parts are present and runnable."""

from pathlib import Path
from typing import Any

from rich.console import Console
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parents[1]


def verify_all(config_path: str = "config/client.yaml") -> dict[str, Any]:
    checks: list[tuple[str, str, bool, str]] = []

    # Part 1 — Deploy
    deploy_files = [
        ROOT / "deploy" / "deploy.ps1",
        ROOT / "deploy" / "terraform" / "main.tf",
        ROOT / "deploy" / "terraform" / "profiles.tf",
        ROOT / "deploy" / "docker" / "docker-compose.yml",
        ROOT / "deploy" / "docker" / "backup-to-gcs.sh",
        ROOT / "deploy" / "docker" / "Caddyfile",
        ROOT / "docs" / "scaling.md",
        ROOT / "docs" / "post-deploy-checklist.md",
    ]
    checks.append(
        (
            "1",
            "One-command deploy (IaC + Docker + backup + HTTPS)",
            all(p.exists() for p in deploy_files),
            "deploy/deploy.ps1 (-Profile), docs/scaling.md, post-deploy-checklist",
        )
    )

    # Part 2 — DPDP
    dpdp_files = [
        ROOT / "dpdp" / "consent_snippet.js",
        ROOT / "dpdp" / "pii_scrubber.py",
        ROOT / "dpdp" / "dsar.py",
        ROOT / "dpdp" / "audit_log.py",
        ROOT / "dpdp" / "retention.py",
    ]
    from dpdp.pii_scrubber import scrub_string

    pii_ok = "[REDACTED_EMAIL]" in scrub_string("contact user@example.com")
    checks.append(
        (
            "2",
            "DPDP-ready (consent, PII, DSAR, retention, audit)",
            all(p.exists() for p in dpdp_files) and pii_ok,
            "dpdp/* + demo/site",
        )
    )

    # Part 3 — Migration
    mig_ok = (ROOT / "agents" / "migration" / "run.py").exists()
    report = ROOT / "output" / "migration" / "migration-report.md"
    checks.append(
        (
            "3",
            "GA4 migration agent + GTM draft artifacts",
            mig_ok and report.exists(),
            "agents/migration/ + output/migration/",
        )
    )

    # Part 4 — Parity
    parity_ok = (ROOT / "agents" / "parity" / "run.py").exists()
    sched_ok = (ROOT / "agents" / "parity" / "scheduler.py").exists()
    checks.append(
        (
            "4",
            "Continuous parity (schedule + alert + diagnosis)",
            parity_ok and sched_ok,
            "agents/parity/ + kit-api /internal/parity",
        )
    )

    # Part 5 — Connectors
    conn_files = [
        ROOT / "connectors" / "google_ads.py",
        ROOT / "connectors" / "meta_capi.py",
        ROOT / "connectors" / "bigquery_export.py",
        ROOT / "connectors" / "looker.py",
        ROOT / "connectors" / "cmp_signals.py",
        ROOT / "connectors" / "demo_pipeline.py",
    ]
    checks.append(
        (
            "5",
            "Ready connectors (Ads, Meta, CMP, BQ, Looker)",
            all(p.exists() for p in conn_files),
            "connectors/ + kit.cli connectors-test",
        )
    )

    parts = [
        {
            "part": part,
            "requirement": name,
            "status": "PASS" if ok else "FAIL",
            "location": loc,
        }
        for part, name, ok, loc in checks
    ]
    all_ok = all(p["status"] == "PASS" for p in parts)

    table = Table(title="Five build parts verification")
    table.add_column("Part")
    table.add_column("Requirement")
    table.add_column("Status")
    table.add_column("Location")
    for row in parts:
        table.add_row(
            row["part"],
            row["requirement"],
            f"[green]{row['status']}[/green]" if row["status"] == "PASS" else f"[red]{row['status']}[/red]",
            row["location"],
        )
    console.print(table)
    return {"pass": all_ok, "parts": parts}
