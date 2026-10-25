"""Load repo-root .env for local CLI runs."""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

_REPO_ROOT = Path(__file__).resolve().parents[1]


def load_kit_env() -> Path:
    """Load .env from repo root; overrides stale shell variables."""
    path = _REPO_ROOT / ".env"
    if path.exists():
        if load_dotenv:
            load_dotenv(path, override=True)
        else:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")
            except Exception:
                pass
    return path
