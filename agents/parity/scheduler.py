"""OYDK Unified Background Scheduler.

Runs two jobs on independent schedules:
  1. BigQuery Sync   — incremental streaming of Matomo events → BQ (default: every 15 min)
  2. Parity Check    — GA4 vs target stack comparison + alert (default: daily at 06:00 IST)

Environment variables:
  CLIENT_CONFIG      path to client.yaml  (default: config/client.yaml)
  BQ_SYNC_SCHEDULE   cron expression      (default: */15 * * * *)
  PARITY_SCHEDULE    cron expression      (default: 0 6 * * *)
"""

import os
import threading
import time
from datetime import datetime

from croniter import croniter


def _run_bq_sync(config_path: str) -> None:
    from connectors.bigquery_export import run_bigquery_sync
    try:
        result = run_bigquery_sync(config_path)
        print(f"[BQ-SYNC] {datetime.now().isoformat()} — {result}")
    except Exception as e:
        print(f"[BQ-SYNC] ERROR: {e}")


def _run_parity(config_path: str) -> None:
    from agents.parity.run import run_parity
    try:
        report = run_parity(config_path)
        missed = [g for g in report["gaps"] if not g["within_target"]]
        status = "OK" if report.get("all_within_target") else f"ALERT — {len(missed)} metric(s) missed"
        print(f"[PARITY] {datetime.now().isoformat()} — {status}")
    except Exception as e:
        print(f"[PARITY] ERROR: {e}")


def _scheduler_loop(name: str, schedule: str, config_path: str, job_fn) -> None:
    """Generic cron loop for a single job."""
    print(f"[{name}] Started. Schedule: '{schedule}'")
    cron = croniter(schedule, datetime.now())
    while True:
        next_run = cron.get_next(datetime)
        wait_seconds = (next_run - datetime.now()).total_seconds()
        print(f"[{name}] Next run at {next_run.strftime('%Y-%m-%d %H:%M:%S')} (in {wait_seconds:.0f}s)")
        time.sleep(max(wait_seconds, 0))
        job_fn(config_path)


def main() -> None:
    config_path  = os.environ.get("CLIENT_CONFIG",    "config/client.yaml")
    bq_schedule  = os.environ.get("BQ_SYNC_SCHEDULE", "*/15 * * * *")
    parity_sched = os.environ.get("PARITY_SCHEDULE",  "0 6 * * *")

    print("=" * 60)
    print("  OYDK — Background Daemon Started")
    print(f"  Config       : {config_path}")
    print(f"  BQ Sync      : {bq_schedule}")
    print(f"  Parity Check : {parity_sched}")
    print("=" * 60)

    # Run each job in its own daemon thread so they never block each other
    bq_thread = threading.Thread(
        target=_scheduler_loop,
        args=("BQ-SYNC", bq_schedule, config_path, _run_bq_sync),
        daemon=True,
        name="bq-sync-scheduler",
    )
    parity_thread = threading.Thread(
        target=_scheduler_loop,
        args=("PARITY", parity_sched, config_path, _run_parity),
        daemon=True,
        name="parity-scheduler",
    )

    bq_thread.start()
    parity_thread.start()

    # Keep main thread alive — threads are daemons so they exit if main exits
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n[OYDK-SCHEDULER] Shutdown requested. Exiting.")


if __name__ == "__main__":
    main()
