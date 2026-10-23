"""Load and validate client configuration."""

import os
import re
from pathlib import Path
from typing import Any

import yaml


def _resolve_env(value: str) -> str:
    """Replace ${VAR} placeholders with environment variables."""
    if not isinstance(value, str):
        return value

    def replacer(match: re.Match) -> str:
        var = match.group(1)
        return os.environ.get(var, match.group(0))

    return re.sub(r"\$\{([^}]+)\}", replacer, value)


def _resolve_dict(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _resolve_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_resolve_dict(v) for v in obj]
    if isinstance(obj, str):
        return _resolve_env(obj)
    return obj


def load_config(path: str | Path) -> dict:
    """Load client YAML config with env var substitution."""
    config_path = Path(path)
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    with open(config_path, encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    return _resolve_dict(raw)
