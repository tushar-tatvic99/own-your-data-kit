"""Load repo-root .env for local CLI runs."""

from pathlib import Path

from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[1]


def load_kit_env() -> Path:
    """Load .env from repo root; overrides stale shell variables."""
    path = _REPO_ROOT / ".env"
    load_dotenv(path, override=True)
    return path
