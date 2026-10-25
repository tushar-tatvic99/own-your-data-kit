"""Ask-your-data agent — Matomo API + optional OpenAI."""

import json
import os
from typing import Any

import requests

from kit.config import load_config
from kit.matomo_client import MatomoClient
from kit.matomo_token import resolve_matomo_token


def list_matomo_sites(config_path: str) -> list[dict]:
    cfg = load_config(config_path)
    stack = cfg["stack"]
    token = resolve_matomo_token(stack["api_token"])
    base = stack["url"].rstrip("/")
    params = {
        "module": "API",
        "method": "SitesManager.getSitesWithAtLeastViewAccess",
        "format": "JSON",
        "token_auth": token,
    }
    resp = requests.post(f"{base}/index.php", data=params, timeout=30)
    data = resp.json()
    if isinstance(data, list):
        return [
            {"id": s.get("idsite"), "name": s.get("name"), "main_url": s.get("main_url")}
            for s in data
        ]
    return [{"id": int(stack["site_id"]), "name": cfg.get("client", {}).get("name", "site")}]


def _fetch_context(client: MatomoClient) -> dict[str, Any]:
    ctx: dict[str, Any] = {}
    try:
        ctx["visits_today"] = client.get_visits_summary(period="day", date="today")
    except Exception as exc:
        ctx["visits_today_error"] = str(exc)
    try:
        ctx["visits_yesterday"] = client.get_visits_summary(period="day", date="yesterday")
    except Exception as exc:
        ctx["visits_yesterday_error"] = str(exc)
    try:
        ctx["goals"] = client.list_goals()
    except Exception as exc:
        ctx["goals_error"] = str(exc)
    return ctx


def _rule_answer(question: str, ctx: dict) -> str:
    q = question.lower()
    vt = ctx.get("visits_today") or {}
    vy = ctx.get("visits_yesterday") or {}
    if "yesterday" in q and ("visit" in q or "traffic" in q or "session" in q):
        return (
            f"Yesterday: {vy.get('nb_visits', '?')} visits, "
            f"{vy.get('nb_actions', '?')} actions, "
            f"bounce rate {vy.get('bounce_rate', '?')}."
        )
    if "visit" in q or "traffic" in q or "today" in q:
        return (
            f"Today so far: {vt.get('nb_visits', '?')} visits, "
            f"{vt.get('nb_actions', '?')} actions, "
            f"unique visitors {vt.get('nb_uniq_visitors', '?')}."
        )
    if "goal" in q or "conversion" in q:
        goals = ctx.get("goals") or []
        if not goals:
            return "No goals returned from Matomo (or API error)."
        lines = [f"- {g.get('name')}: id {g.get('idgoal')}" for g in goals[:10]]
        return "Goals configured:\n" + "\n".join(lines)
    return (
        "I pulled live Matomo summaries for today/yesterday. "
        "Try: 'How many visits today?', 'Yesterday traffic?', or 'List goals'."
    )


def _openai_answer(question: str, ctx: dict, site_name: str) -> str | None:
    key = os.getenv("OYDK_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    prompt = (
        f"You are an analytics assistant for Matomo site '{site_name}'. "
        f"Use only this JSON data:\n{json.dumps(ctx, default=str)[:6000]}\n\n"
        f"User question: {question}\nAnswer concisely with numbers from the data."
    )
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("OYDK_OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 400,
            },
            timeout=45,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"]
    except Exception:
        pass
    return None


def chat(config_path: str, message: str, site_id: int | None = None) -> dict[str, Any]:
    cfg = load_config(config_path)
    stack = cfg["stack"]
    sid = int(site_id or stack["site_id"])
    token = resolve_matomo_token(stack["api_token"])
    client = MatomoClient(stack["url"], sid, token)
    ctx = _fetch_context(client)
    site_name = (cfg.get("client") or {}).get("name", f"site {sid}")
    answer = _openai_answer(message, ctx, site_name)
    mode = "openai"
    if not answer:
        answer = _rule_answer(message, ctx)
        mode = "matomo_rules"
    return {"answer": answer, "mode": mode, "site_id": sid, "context_keys": list(ctx.keys())}
