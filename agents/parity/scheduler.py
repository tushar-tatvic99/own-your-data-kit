"""Scheduled parity checker — runs daily during migration, weekly after."""

import os
import time
from datetime import datetime

from croniter import croniter

from agents.parity.run import run_parity


def main():
    config_path = os.environ.get("CLIENT_CONFIG", "config/client.yaml")
    # Default: daily at 6 AM IST
    schedule = os.environ.get("PARITY_SCHEDULE", "0 6 * * *")

    console_msg = f"Parity scheduler started. Schedule: {schedule}"
    print(console_msg)

    cron = croniter(schedule, datetime.now())

    while True:
        next_run = cron.get_next(datetime)
        wait_seconds = (next_run - datetime.now()).total_seconds()
        print(f"Next parity check at {next_run.isoformat()} (in {wait_seconds:.0f}s)")
        time.sleep(max(wait_seconds, 0))
        try:
            run_parity(config_path)
        except Exception as e:
            print(f"Parity check failed: {e}")


if __name__ == "__main__":
    main()
