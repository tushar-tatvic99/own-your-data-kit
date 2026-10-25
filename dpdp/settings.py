"""Read DPDP flags from client config."""

from kit.config import load_config
from kit.env import load_kit_env


def dpdp_config(config_path: str = "config/client.yaml") -> dict:
    load_kit_env()
    return load_config(config_path).get("dpdp", {})
