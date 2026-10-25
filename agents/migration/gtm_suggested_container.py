"""Suggested standalone GTM container export — Matomo tags only (new container, human publishes)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agents.migration.mapper import generate_gtm_draft_changes, map_gtm_tag_to_matomo

SUGGESTED_CONTAINER_NAME = "OYDK Matomo tracking (suggested)"


def generate_gtm_matomo_suggested_container(
    gtm_container: dict,
    matomo_url: str,
    site_id: int,
    source_public_id: str | None = None,
) -> dict[str, Any]:
    """
    Proposed *new* GTM container content: Matomo config + mirrored event tags.
    Client creates a new container in tagmanager.google.com and imports this blueprint.
    """
    draft_changes = generate_gtm_draft_changes(
        gtm_container.get("tags") or [],
        matomo_url,
        site_id,
    )

    triggers: list[dict] = []
    for tr in gtm_container.get("triggers") or []:
        triggers.append(
            {
                "name": tr.get("name"),
                "type": tr.get("type"),
                "source_trigger_id": tr.get("trigger_id"),
                "oydk_note": "Copy trigger into new container (same name/type as source GTM)",
            }
        )
    if not any(t.get("name") == "All Pages" for t in triggers):
        triggers.insert(0, {"name": "All Pages", "type": "pageview", "oydk_note": "Default"})

    variables: list[dict] = []
    for var in gtm_container.get("variables") or []:
        variables.append(
            {
                "name": var.get("name"),
                "type": var.get("type"),
                "source_variable_id": var.get("variable_id"),
                "oydk_note": "Recreate as Data Layer Variable in new container",
            }
        )

    proposed_tags: list[dict] = []
    for change in draft_changes:
        proposed_tags.append(
            {
                "name": change.get("name"),
                "tag_type": change.get("tag_type"),
                "action": change.get("action", "create"),
                "html": change.get("html"),
                "firing_trigger": change.get("firing_trigger"),
                "replaces_ga4_tag": change.get("replaces_ga4_tag"),
                "note": change.get("note"),
            }
        )

    ga4_tags_kept_for_reference: list[dict] = []
    for tag in gtm_container.get("tags") or []:
        if tag.get("type") in ("gaawe", "gaawc"):
            mapped = map_gtm_tag_to_matomo(tag)
            ga4_tags_kept_for_reference.append(
                {
                    "source_gtm_tag": tag.get("name"),
                    "type": tag.get("type"),
                    "matomo_equivalent": mapped,
                    "oydk_policy": "Do NOT copy GA4 tags into suggested container — use Matomo tags above",
                }
            )

    return {
        "format": "oydk-gtm-suggested-container-v1",
        "publish_policy": (
            "DRAFT ONLY — create a NEW GTM container (or use workspace 'OYDK Migration Draft' on source container). "
            "Nothing is published by OYDK."
        ),
        "suggested_container": {
            "name": SUGGESTED_CONTAINER_NAME,
            "description": (
                "Matomo-only GTM container for clients who keep Google Tag Manager during migration. "
                f"Mirrors event structure from source container {source_public_id or gtm_container.get('public_id') or '—'}."
            ),
            "matomo_url": matomo_url,
            "matomo_site_id": site_id,
        },
        "source_gtm": {
            "account_id": gtm_container.get("account_id"),
            "container_id": gtm_container.get("container_id"),
            "public_id": gtm_container.get("public_id"),
        },
        "triggers": triggers,
        "variables": variables,
        "tags": proposed_tags,
        "ga4_to_matomo_mapping_reference": ga4_tags_kept_for_reference,
        "gtm_ui_steps": [
            "1. tagmanager.google.com → Create Container → Web → name as suggested_container.name",
            "2. Recreate triggers/variables from this JSON (or use OYDK Migration Draft workspace on live container)",
            "3. Add Custom HTML tags from tags[] — fire on listed triggers",
            "4. Preview + QA with consent → Submit version when ready (human approval)",
        ],
    }


def write_gtm_matomo_suggested_container(output_dir: Path, spec: dict[str, Any]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "gtm-matomo-suggested-container.json"
    path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    md = output_dir / "gtm-matomo-suggested-container.md"
    lines = [
        "# Google Tag Manager — suggested Matomo container (NOT published)",
        "",
        f"**{spec['suggested_container']['name']}**",
        "",
        spec["publish_policy"],
        "",
        "## Proposed Matomo tags (Custom HTML)",
        "",
    ]
    for tag in spec.get("tags") or []:
        lines.append(f"- **{tag.get('name')}** — {tag.get('note', '')}")
    lines.extend(["", "## GA4 → Matomo reference (do not copy GA4 into new container)", ""])
    for ref in spec.get("ga4_to_matomo_mapping_reference") or []:
        lines.append(f"- {ref.get('source_gtm_tag')} → {ref.get('matomo_equivalent')}")
    lines.extend(["", f"Full JSON: `{path.name}`", ""])
    md.write_text("\n".join(lines), encoding="utf-8")
    return path
