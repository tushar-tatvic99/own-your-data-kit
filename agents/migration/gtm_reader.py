"""Read and write Google Tag Manager container configurations via GTM API v2."""

import os
from typing import Any
import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build


DRY_RUN_TAGS = [
    {
        "name": "GA4 - Configuration Tag",
        "type": "gaawc",
        "tag_id": "101",
        "firing_trigger_id": ["2147479553"],
        "parameter": [{"key": "measurementId", "value": "G-DEMO12345"}],
    },
    {
        "name": "GA4 - Event - purchase",
        "type": "gaawe",
        "tag_id": "102",
        "firing_trigger_id": ["201"],
        "parameter": [
            {"key": "eventName", "value": "purchase"},
            {"key": "eventSettingsTable", "value": "ecommerce"},
        ],
    },
    {
        "name": "GA4 - Event - add_to_cart",
        "type": "gaawe",
        "tag_id": "103",
        "firing_trigger_id": ["202"],
        "parameter": [
            {"key": "eventName", "value": "add_to_cart"},
            {"key": "eventSettingsTable", "value": "ecommerce"},
        ],
    },
    {
        "name": "GA4 - Event - begin_checkout",
        "type": "gaawe",
        "tag_id": "104",
        "firing_trigger_id": ["203"],
        "parameter": [
            {"key": "eventName", "value": "begin_checkout"},
            {"key": "eventSettingsTable", "value": "ecommerce"},
        ],
    },
]

DRY_RUN_TRIGGERS = [
    {"name": "All Pages", "type": "pageview", "trigger_id": "2147479553"},
    {"name": "Custom Event - purchase", "type": "customEvent", "trigger_id": "201"},
    {"name": "Custom Event - add_to_cart", "type": "customEvent", "trigger_id": "202"},
]

DRY_RUN_VARIABLES = [
    {"name": "Page URL", "type": "u", "variable_id": "1"},
    {"name": "DLV - ecommerce", "type": "v", "variable_id": "2"},
]


class GTMReader:
    def __init__(
        self,
        account_id: str,
        container_id: str,
        workspace_id: str | None = None,
        credentials_path: str | None = None,
        dry_run: bool = False,
    ):
        self.account_id = str(account_id).strip()
        self.container_id = str(container_id).strip()
        self.workspace_id = str(workspace_id).strip() if workspace_id else None
        self.credentials_path = credentials_path
        self.dry_run = dry_run
        self._container_path = f"accounts/{self.account_id}/containers/{self.container_id}"
        self.service = None

        if self.dry_run:
            return

        if credentials_path and os.path.exists(credentials_path):
            try:
                self.credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=[
                        "https://www.googleapis.com/auth/tagmanager.readonly",
                        "https://www.googleapis.com/auth/tagmanager.edit.containers",
                    ],
                )
                self.service = build("tagmanager", "v2", credentials=self.credentials)
            except Exception as e:
                raise RuntimeError(
                    f"Failed to initialize GTM Client from credentials file '{credentials_path}': {e}"
                )
        else:
            try:
                creds, _ = google.auth.default(
                    scopes=[
                        "https://www.googleapis.com/auth/tagmanager.readonly",
                        "https://www.googleapis.com/auth/tagmanager.edit.containers",
                    ]
                )
                self.service = build("tagmanager", "v2", credentials=creds)
            except Exception as e:
                raise RuntimeError(
                    f"GTM credentials missing or invalid for container '{self.container_id}'.\n"
                    f"Expected credentials at '{credentials_path}' or via Application Default Credentials (ADC).\n"
                    f"Details: {e}\n"
                    f"Hint: Run with '--dry-run' if you wish to simulate without live Google authentication."
                )

        self._resolve_container_path()

    def _resolve_container_path(self) -> None:
        """Resolve numeric container ID if publicId (e.g. GTM-XXXX) was supplied."""
        if not self.container_id.isdigit() and self.service:
            try:
                containers = (
                    self.service.accounts()
                    .containers()
                    .list(parent=f"accounts/{self.account_id}")
                    .execute()
                    .get("container", [])
                )
                for c in containers:
                    if c.get("publicId") == self.container_id:
                        self.container_id = str(c.get("containerId"))
                        self._container_path = f"accounts/{self.account_id}/containers/{self.container_id}"
                        return
            except Exception:
                pass

    def get_default_workspace_id(self) -> str:
        """Resolve the active workspace ID (from config, or by discovering the Default Workspace)."""
        if self.workspace_id:
            return self.workspace_id
        if self.dry_run:
            self.workspace_id = "1"
            return self.workspace_id

        try:
            workspaces_resp = (
                self.service.accounts()
                .containers()
                .workspaces()
                .list(parent=self._container_path)
                .execute()
            )
            workspaces = workspaces_resp.get("workspace", [])
            if not workspaces:
                raise RuntimeError(
                    f"No workspaces found in GTM Container '{self._container_path}'."
                )

            # Prioritize workspace named "Default Workspace"
            for ws in workspaces:
                if ws.get("name", "").strip().lower() == "default workspace":
                    self.workspace_id = str(ws.get("workspaceId"))
                    return self.workspace_id

            # Fallback to the first available workspace
            self.workspace_id = str(workspaces[0].get("workspaceId"))
            return self.workspace_id
        except Exception as e:
            raise RuntimeError(
                f"Google Tag Manager API error while listing workspaces in '{self._container_path}':\n"
                f"{e}\n\n"
                f"Action Required:\n"
                f"1. Ensure the Service Account / ADC has 'Edit' or 'User' permission on GTM Container '{self.container_id}'.\n"
                f"2. You can also specify 'gtm.workspace_id' in config/client.yaml or pass '--workspace-id <id>'.\n"
                f"3. Run with '--dry-run' if you want to test migration workflows offline."
            )

    def get_tags(self) -> list[dict[str, Any]]:
        """Harvest tags from live GTM container (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_TAGS

        try:
            ws_id = self.get_default_workspace_id()
            parent = f"{self._container_path}/workspaces/{ws_id}"
            result = self.service.accounts().containers().workspaces().tags().list(parent=parent).execute()
            tags = []
            for tag in result.get("tag", []):
                tags.append({
                    "name": tag.get("name"),
                    "type": tag.get("type"),
                    "firing_trigger_id": tag.get("firingTriggerId", []),
                    "parameter": tag.get("parameter", []),
                    "tag_id": tag.get("tagId"),
                })
            return tags
        except Exception as e:
            raise RuntimeError(
                f"Google Tag Manager API error while listing tags in '{self._container_path}/workspaces/{getattr(self, 'workspace_id', 'default')}':\n"
                f"{e}\n\n"
                f"Action Required:\n"
                f"1. Ensure the Service Account has 'Edit' or 'User' role in GTM Container '{self.container_id}'.\n"
                f"2. Ensure the 'tagmanager.googleapis.com' API is enabled in your GCP project.\n"
                f"3. Run with '--dry-run' if you want to test migration workflows offline."
            )

    def get_triggers(self) -> list[dict[str, Any]]:
        """Harvest triggers from live GTM container (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_TRIGGERS

        try:
            ws_id = self.get_default_workspace_id()
            parent = f"{self._container_path}/workspaces/{ws_id}"
            result = self.service.accounts().containers().workspaces().triggers().list(parent=parent).execute()
            triggers = []
            for trigger in result.get("trigger", []):
                triggers.append({
                    "name": trigger.get("name"),
                    "type": trigger.get("type"),
                    "trigger_id": trigger.get("triggerId"),
                    "custom_event_filter": trigger.get("customEventFilter", []),
                })
            return triggers
        except Exception as e:
            raise RuntimeError(
                f"Google Tag Manager API error while listing triggers in '{self._container_path}/workspaces/{getattr(self, 'workspace_id', 'default')}':\n{e}"
            )

    def get_variables(self) -> list[dict[str, Any]]:
        """Harvest variables from live GTM container (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_VARIABLES

        try:
            ws_id = self.get_default_workspace_id()
            parent = f"{self._container_path}/workspaces/{ws_id}"
            result = self.service.accounts().containers().workspaces().variables().list(parent=parent).execute()
            variables = []
            for var in result.get("variable", []):
                variables.append({
                    "name": var.get("name"),
                    "type": var.get("type"),
                    "variable_id": var.get("variableId"),
                    "parameter": var.get("parameter", []),
                })
            return variables
        except Exception as e:
            raise RuntimeError(
                f"Google Tag Manager API error while listing variables in '{self._container_path}/workspaces/{getattr(self, 'workspace_id', 'default')}':\n{e}"
            )

    def create_migration_workspace(self, name: str = "OYDK Migration Draft") -> dict[str, Any]:
        """Create a new GTM workspace for migration changes (draft only)."""
        if self.dry_run:
            return {
                "workspace_id": "ws-draft-simulation",
                "workspace_path": f"{self._container_path}/workspaces/ws-draft-simulation",
                "name": name,
                "status": "created_draft_simulation",
            }

        try:
            result = self.service.accounts().containers().workspaces().create(
                parent=self._container_path,
                body={
                    "name": name,
                    "description": "Auto-generated by Own-Your-Data Kit migration agent. Human review required before publishing.",
                },
            ).execute()
            return {
                "workspace_id": result.get("workspaceId"),
                "workspace_path": result.get("path"),
                "name": result.get("name"),
                "status": "created_live",
            }
        except Exception as e:
            raise RuntimeError(
                f"Google Tag Manager API error while creating draft workspace '{name}' in '{self._container_path}':\n{e}"
            )

    def get_or_create_migration_workspace(self, name: str = "OYDK Migration Draft") -> dict[str, Any]:
        """Return OYDK draft workspace, creating it if it doesn't already exist."""
        if self.dry_run:
            return self.create_migration_workspace(name)

        try:
            listed = self.service.accounts().containers().workspaces().list(parent=self._container_path).execute()
            for workspace in listed.get("workspace", []):
                if workspace.get("name") == name:
                    return {
                        "workspace_id": workspace.get("workspaceId"),
                        "workspace_path": workspace.get("path"),
                        "name": workspace.get("name"),
                        "created": False,
                    }
            res = self.create_migration_workspace(name)
            res["created"] = True
            return res
        except Exception:
            return self.create_migration_workspace(name)

    def create_custom_html_tag(
        self,
        workspace_id: str,
        name: str,
        html_content: str,
        firing_trigger_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        """Inject a custom HTML tag directly into the GTM draft workspace via API."""
        if self.dry_run:
            return {
                "name": name,
                "tag_id": f"tag-simulated-{abs(hash(name)) % 10000}",
                "status": "staged_in_simulation",
                "note": "Draft created (Simulation)",
            }

        workspace_parent = f"{self._container_path}/workspaces/{workspace_id}"

        # 1. Fetch valid triggers currently present in this target workspace
        valid_trigger_ids = set()
        pageview_trigger_id = None
        try:
            ws_triggers = (
                self.service.accounts()
                .containers()
                .workspaces()
                .triggers()
                .list(parent=workspace_parent)
                .execute()
                .get("trigger", [])
            )
            for tr in ws_triggers:
                tid = str(tr.get("triggerId", ""))
                if tid:
                    valid_trigger_ids.add(tid)
                t_type = str(tr.get("type", "")).lower()
                t_name = str(tr.get("name", "")).lower()
                if t_type == "pageview" or "all pages" in t_name:
                    pageview_trigger_id = tid
        except Exception:
            pass

        # 2. If it's a base config tracker, ensure a pageview trigger exists in this workspace
        if "config" in name.lower() and not pageview_trigger_id:
            try:
                new_trig = (
                    self.service.accounts()
                    .containers()
                    .workspaces()
                    .triggers()
                    .create(
                        parent=workspace_parent,
                        body={
                            "name": "All Pages",
                            "type": "pageview",
                        },
                    )
                    .execute()
                )
                pageview_trigger_id = str(new_trig.get("triggerId"))
                valid_trigger_ids.add(pageview_trigger_id)
            except Exception:
                pass

        # 3. Filter requested firing trigger IDs to ONLY those that exist in this workspace
        safe_firing_ids = []
        if firing_trigger_ids:
            safe_firing_ids = [str(fid) for fid in firing_trigger_ids if str(fid) in valid_trigger_ids]

        # 4. If it's a base config tag and safe_firing_ids is empty, attach the pageview trigger
        if not safe_firing_ids and "config" in name.lower() and pageview_trigger_id:
            safe_firing_ids = [pageview_trigger_id]

        tag_body: dict[str, Any] = {
            "name": name,
            "type": "html",
            "parameter": [
                {"type": "template", "key": "html", "value": html_content},
                {"type": "boolean", "key": "supportDocumentWrite", "value": "false"},
            ],
        }
        if safe_firing_ids:
            tag_body["firingTriggerId"] = safe_firing_ids

        try:
            # Idempotency check: if tag with this name already exists in workspace, update it
            try:
                existing_tags = (
                    self.service.accounts()
                    .containers()
                    .workspaces()
                    .tags()
                    .list(parent=workspace_parent)
                    .execute()
                    .get("tag", [])
                )
                for existing in existing_tags:
                    if existing.get("name") == name:
                        tag_id = existing.get("tagId")
                        tag_path = f"{workspace_parent}/tags/{tag_id}"
                        tag_body["tagId"] = tag_id
                        res = (
                            self.service.accounts()
                            .containers()
                            .workspaces()
                            .tags()
                            .update(path=tag_path, body=tag_body)
                            .execute()
                        )
                        return {
                            "name": name,
                            "tag_id": res.get("tagId"),
                            "status": "updated_in_live_workspace",
                            "note": "Draft tag updated in GTM Workspace",
                        }
            except Exception:
                pass

            res = (
                self.service.accounts()
                .containers()
                .workspaces()
                .tags()
                .create(parent=workspace_parent, body=tag_body)
                .execute()
            )
            return {
                "name": name,
                "tag_id": res.get("tagId"),
                "status": "created_in_live_workspace",
                "note": "Draft created in GTM Workspace",
            }
        except Exception as e:
            raise RuntimeError(
                f"Google Tag Manager API error while injecting tag '{name}' in workspace '{workspace_id}':\n{e}"
            )

    def get_full_container(self) -> dict[str, Any]:
        return {
            "account_id": self.account_id,
            "container_id": self.container_id,
            "tags": self.get_tags(),
            "triggers": self.get_triggers(),
            "variables": self.get_variables(),
        }
