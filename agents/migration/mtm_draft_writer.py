"""Matomo Tag Manager (MTM) container draft — mirrors GTM tags/triggers/variables (import in MTM UI)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agents.migration.mapper import map_gtm_tag_to_matomo

GTM_TRIGGER_TO_MTM = {
    "pageview": "PageView",
    "customEvent": "CustomEvent",
    "click": "AllElementsClick",
    "linkClick": "AllLinksClick",
    "formSubmission": "FormSubmit",
    "timer": "Timer",
    "domReady": "DomReady",
    "windowLoaded": "WindowLoaded",
}


def _map_trigger(gtm_trigger: dict, trigger_id_to_name: dict[str, str]) -> dict[str, Any]:
    gtm_type = gtm_trigger.get("type", "pageview")
    mtm_type = GTM_TRIGGER_TO_MTM.get(gtm_type, "CustomEvent")
    out: dict[str, Any] = {
        "name": gtm_trigger.get("name", "Trigger"),
        "type": mtm_type,
        "source_gtm_trigger_id": gtm_trigger.get("trigger_id"),
        "source_gtm_type": gtm_type,
    }
    if mtm_type == "CustomEvent" and gtm_trigger.get("name", "").startswith("CE - "):
        out["custom_event_name"] = gtm_trigger["name"].replace("CE - ", "").strip()
    filters = gtm_trigger.get("custom_event_filter") or []
    if filters:
        out["conditions"] = filters
    return out


def _map_variable(gtm_var: dict) -> dict[str, Any]:
    vtype = gtm_var.get("type", "v")
    mtm_type = "DataLayer" if vtype in ("v", "dlv") else "CustomJs"
    return {
        "name": gtm_var.get("name", "Variable"),
        "type": mtm_type,
        "source_gtm_variable_id": gtm_var.get("variable_id"),
        "source_gtm_type": vtype,
        "parameter": gtm_var.get("parameter") or [],
    }


def _matomo_config_tag(matomo_url: str, site_id: int) -> dict[str, Any]:
    base = matomo_url.rstrip("/")
    return {
        "name": "OYDK — Matomo base tracker",
        "type": "MatomoTag",
        "matomoConfig": {
            "matomoUrl": f"{base}/",
            "idSite": str(site_id),
            "requireConsent": True,
        },
        "fireTrigger": ["All Pages"],
        "note": "Matomo Tag Manager Matomo tag — enable dataLayer sync in container settings",
    }


def generate_mtm_container_draft(
    gtm_container: dict,
    matomo_url: str,
    site_id: int,
    ga4_property_id: str | None = None,
) -> dict[str, Any]:
    """Build MTM-shaped draft from a GTM container snapshot (not published)."""
    triggers_in = gtm_container.get("triggers") or []
    id_to_name = {str(t.get("trigger_id")): t.get("name", "") for t in triggers_in}

    mtm_triggers: list[dict] = []
    trigger_names: set[str] = set()
    for tr in triggers_in:
        mapped = _map_trigger(tr, id_to_name)
        mtm_triggers.append(mapped)
        trigger_names.add(mapped["name"])

    if "All Pages" not in trigger_names:
        mtm_triggers.insert(
            0,
            {"name": "All Pages", "type": "PageView", "note": "Default pageview (from GTM All Pages)"},
        )

    mtm_variables = [_map_variable(v) for v in (gtm_container.get("variables") or [])]

    mtm_tags: list[dict] = [_matomo_config_tag(matomo_url, site_id)]
    unmappable_tags: list[dict] = []

    for tag in gtm_container.get("tags") or []:
        gtm_type = tag.get("type", "")
        fire = [
            id_to_name.get(str(tid), f"trigger_{tid}")
            for tid in (tag.get("firing_trigger_id") or [])
        ]
        mapped = map_gtm_tag_to_matomo(tag)
        if gtm_type in ("gaawe", "gaawc"):
            if mapped and mapped.get("action") == "track_event":
                mtm_tags.append(
                    {
                        "name": f"OYDK — Matomo event: {mapped.get('event_name')}",
                        "type": "CustomHtml",
                        "html": (
                            f"_mtm.push(['event', '{mapped.get('event_name')}']); "
                            f"_paq.push(['trackEvent', '{mapped.get('category', 'general')}', "
                            f"'{mapped.get('event_name')}']);"
                        ),
                        "fireTrigger": fire or ["All Pages"],
                        "replaces_gtm_tag": tag.get("name"),
                        "source_gtm_type": gtm_type,
                    }
                )
            elif mapped and mapped.get("action") == "replace_with_matomo_config":
                mtm_tags.append(
                    {
                        "name": "OYDK — (replaces GA4 config)",
                        "type": "note",
                        "note": f"GTM tag '{tag.get('name')}' is GA4 config — use Matomo base tracker above",
                        "replaces_gtm_tag": tag.get("name"),
                    }
                )
            else:
                unmappable_tags.append(
                    {"gtm_tag": tag.get("name"), "type": gtm_type, "reason": "Could not map GA4 tag to MTM"}
                )
        elif gtm_type == "html":
            mtm_tags.append(
                {
                    "name": f"OYDK — carry HTML: {tag.get('name')}",
                    "type": "CustomHtml",
                    "html": "<!-- Review GTM HTML tag; reimplement in MTM if needed for Matomo only -->",
                    "fireTrigger": fire,
                    "source_gtm_tag": tag.get("name"),
                    "note": "Non-GA4 HTML tag — manual review (e.g. Meta pixel stays outside MTM if desired)",
                }
            )
        elif gtm_type in ("googtag", "ua"):
            unmappable_tags.append(
                {
                    "gtm_tag": tag.get("name"),
                    "type": gtm_type,
                    "reason": "Consent/legacy Google tag — configure in CMP + Matomo consent, not auto-copied",
                }
            )
        else:
            unmappable_tags.append(
                {"gtm_tag": tag.get("name"), "type": gtm_type, "reason": "Unsupported GTM tag type for MTM mirror"}
            )

    return {
        "format": "oydk-mtm-container-draft-v1",
        "publish_policy": "DRAFT ONLY — import or recreate in Matomo → Tag Manager; never auto-published",
        "container": {
            "name": "OYDK — from GTM mirror (Matomo MTM)",
            "description": (
                "Replicates client GTM structure as Matomo Tag Manager tags/triggers/variables. "
                "Enable container setting: sync from GTM dataLayer where applicable."
            ),
            "settings": {
                "dataLayerName": "dataLayer",
                "syncGtmDataLayer": True,
            },
            "matomo_url": matomo_url,
            "matomo_site_id": site_id,
            "ga4_property_id": ga4_property_id,
        },
        "source_gtm": {
            "account_id": gtm_container.get("account_id"),
            "container_id": gtm_container.get("container_id"),
            "public_id": gtm_container.get("public_id"),
            "tag_count": len(gtm_container.get("tags") or []),
            "trigger_count": len(triggers_in),
            "variable_count": len(gtm_container.get("variables") or []),
        },
        "triggers": mtm_triggers,
        "variables": mtm_variables,
        "tags": mtm_tags,
        "unmappable_gtm_tags": unmappable_tags,
        "import_hint": (
            "Matomo UI → Tag Manager → Create container → use tags/triggers below as a blueprint "
            "(or paste JSON into your import workflow). Compare with GTM suggested container for dual-tag period."
        ),
    }


def write_mtm_container_draft(output_dir: Path, draft: dict[str, Any]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "mtm-container-draft.json"
    path.write_text(json.dumps(draft, indent=2), encoding="utf-8")
    md = output_dir / "mtm-container-review.md"
    lines = [
        "# Matomo Tag Manager (MTM) draft — NOT published",
        "",
        f"**Container:** {draft['container']['name']}",
        "",
        draft["publish_policy"],
        "",
        "## Triggers",
        "",
    ]
    for t in draft.get("triggers") or []:
        lines.append(f"- **{t.get('name')}** ({t.get('type')})")
    lines.extend(["", "## Tags", ""])
    for tag in draft.get("tags") or []:
        lines.append(f"- **{tag.get('name')}** — {tag.get('note', tag.get('type', ''))}")
    if draft.get("unmappable_gtm_tags"):
        lines.extend(["", "## GTM tags needing manual review", ""])
        for u in draft["unmappable_gtm_tags"]:
            lines.append(f"- **{u.get('gtm_tag')}** ({u.get('type')}): {u.get('reason')}")
    lines.extend(["", f"Full spec: `{path.name}`", ""])
    md.write_text("\n".join(lines), encoding="utf-8")
    return path
