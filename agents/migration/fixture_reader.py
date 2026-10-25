"""Load GA4/GTM snapshot fixtures for offline migration rehearsal."""

import json
from pathlib import Path


class FixtureGA4Reader:
    def __init__(self, fixture_path: str | Path):
        self.fixture_path = Path(fixture_path)
        with open(self.fixture_path, encoding="utf-8") as f:
            self._data = json.load(f)

    def get_full_setup(self) -> dict:
        return self._data


class FixtureGTMReader:
    def __init__(self, fixture_path: str | Path, account_id: str, container_id: str):
        self.fixture_path = Path(fixture_path)
        with open(self.fixture_path, encoding="utf-8") as f:
            self._data = json.load(f)
        self.account_id = account_id
        self.container_id = container_id

    def get_full_container(self) -> dict:
        return {
            "account_id": self._data.get("account_id", self.account_id),
            "container_id": self._data.get("container_id", self.container_id),
            "public_id": self._data.get("public_id"),
            "tags": self._data["tags"],
            "triggers": self._data["triggers"],
            "variables": self._data["variables"],
        }

    def create_migration_workspace(self, name: str = "OYDK Migration Draft") -> dict:
        return {
            "workspace_id": "fixture-oydk-draft",
            "workspace_path": (
                f"accounts/{self.account_id}/containers/{self.container_id}"
                f"/workspaces/fixture-oydk-draft"
            ),
            "name": name,
            "simulated": True,
            "note": "Fixture mode — workspace not created in GTM API until credentials are configured",
        }
