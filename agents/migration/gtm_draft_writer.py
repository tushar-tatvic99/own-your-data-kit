"""Persist GTM migration draft artifacts for human review (never auto-publish)."""

import json
from pathlib import Path


def write_gtm_draft_bundle(
    output_dir: Path,
    workspace: dict,
    draft_changes: list[dict],
    container: dict,
) -> Path:
    """Write machine-readable draft + link for GTM UI review."""
    bundle = {
        "workspace": workspace,
        "draft_changes": draft_changes,
        "source_container": {
            "account_id": container.get("account_id"),
            "container_id": container.get("container_id"),
            "tag_count": len(container.get("tags", [])),
        },
        "publish_policy": "NEVER auto-publish — human review required",
    }
    path = output_dir / "gtm-draft-bundle.json"
    path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")

    md = output_dir / "gtm-draft-review.md"
    lines = [
        "# GTM migration draft (review only)",
        "",
        f"- Workspace: **{workspace.get('name', 'OYDK Migration Draft')}**",
        f"- Workspace ID: `{workspace.get('workspace_id', 'manual')}`",
        f"- GTM UI: https://tagmanager.google.com/",
        "",
        "## Proposed changes",
        "",
    ]
    for change in draft_changes:
        lines.append(f"- **{change.get('name')}** — {change.get('description', '')}")
    if workspace.get("error"):
        lines.extend([
            "",
            "## GTM API note",
            "",
            "If workspace creation failed, grant the service account **Approve** on the GTM container "
            "and enable Tag Manager API. Import changes manually from the JSON bundle.",
            "",
            f"Error: `{workspace.get('error')}`",
        ])
    lines.extend(["", "## JSON bundle", "", f"See `{path.name}` for full draft spec.", ""])
    md.write_text("\n".join(lines), encoding="utf-8")
    return path
