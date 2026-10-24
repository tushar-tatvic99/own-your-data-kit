# Kit IP vs analytics stack (Matomo today)

**Tatvic IP is not inside Matomo.** It lives in the **Own-Your-Data Kit (OYDK)** — deploy, migration agent, parity, DPDP, connectors, config, and runbooks. The analytics engine is a **replaceable adapter**.

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  OYDK — Tatvic IP (stack-agnostic)                               │
│  deploy.ps1 · agents/migration · agents/parity · dpdp · connectors│
│  kit/cli · config/client.yaml · verify-parts · docs              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ kit/analytics_stack.py
                             │ analytics_stack_from_config()
┌────────────────────────────▼─────────────────────────────────────┐
│  Adapter (per stack)                                             │
│  kit/matomo_client.py  ←── today                                 │
│  kit/posthog_client.py ←── future (same Protocol)                │
└────────────────────────────┬─────────────────────────────────────┘
                             │ vendor APIs only here
┌────────────────────────────▼─────────────────────────────────────┐
│  Open-source product (client’s cloud)                              │
│  Matomo + MariaDB + Docker (deploy/docker) — swappable image set   │
└──────────────────────────────────────────────────────────────────┘
```

## What stays the same when you change stack

| Layer | Changes when moving Matomo → PostHog? |
|-------|--------------------------------------|
| GA4 + GTM migration **read** side | No — still Google APIs |
| GTM **draft** writer | No — still Tag Manager |
| Parity **logic** (gap %, email, diagnosis) | No — still compares GA4 vs *adapter metrics* |
| DPDP (consent snippet, PII scrub, audit API) | Mostly no — subject delete maps to adapter |
| `config/client.yaml` shape | `stack.type` + url/token fields |
| **Deploy** Terraform + Docker | **Yes** — `deploy/docker` is Matomo-oriented today; PostHog would get `deploy/docker-posthog/` or profile flag |

## What you implement for a new stack

1. New client class implementing `AnalyticsStackClient` in `kit/analytics_stack.py` (Protocol).
2. Branch in `analytics_stack_from_config()` on `stack.type`.
3. Optional: deploy profile for that product’s containers.
4. **Do not** fork migration/parity/dpdp — only the adapter and deploy bundle.

## Config switch (conceptual)

```yaml
stack:
  type: matomo   # or posthog when adapter exists
  url: "https://analytics.client.com"
  site_id: 1
  api_token: "${MATOMO_API_TOKEN}"
```

## Code entry point

All agents should use:

```python
from kit.analytics_stack import analytics_stack_from_config

client = analytics_stack_from_config("config/client.yaml")
```

`matomo_client_from_config()` remains as a thin wrapper for backward compatibility.

## Related

- [stack-choice.md](stack-choice.md) — why Matomo is default
- [scaling.md](scaling.md) — sizing Matomo on GCP
