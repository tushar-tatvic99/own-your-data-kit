# Stack Choice: Matomo

## Decision

We chose **Matomo** (self-hosted) as the default analytics stack for the Own-Your-Data Analytics Kit.

PostHog was evaluated but rejected for our primary client segment (marketing-led, regulated, high-traffic e-commerce and BFSI).

---

## Evaluation Against Five Tests

### 1. Enterprise traffic (millions of events/month)

| | Matomo | PostHog |
|---|---|---|
| **Verdict** | **Pass** | Fail for default |
| **Evidence** | Matomo is used in production by enterprise clients at 100M+ hits/month. Horizontal scaling via multiple tracker nodes + read replicas is documented and battle-tested. | PostHog's own docs state the open-source version runs on a single machine and is "unlikely to scale past a couple 100ks events without significant effort." |

### 2. Licence allows Tatvic to deploy for clients and charge maintenance

| | Matomo | PostHog |
|---|---|---|
| **Verdict** | **Pass** | Pass (with caveat) |
| **Evidence** | Matomo is GPL v3. Tatvic can deploy, customise, and charge for maintenance without sharing modifications to the core, as long as we don't distribute modified binaries. Matomo Cloud is separate from self-hosted. | PostHog is MIT for the core but their cloud features are proprietary. Self-hosted is fine for deployment, but the feature gap vs cloud creates support burden. |

### 3. Security fixes released regularly, active community

| | Matomo | PostHog |
|---|---|---|
| **Verdict** | **Pass** | Pass |
| **Evidence** | Matomo releases security patches regularly (monthly minor releases, immediate critical patches). 19,000+ GitHub stars, active forum, dedicated security team. CVE response within days. | PostHog also has active security releases, but the project is younger and the self-hosted surface area is larger (ClickHouse, Kafka, etc.). |

### 4. Tatvic can support it after the hackathon

| | Matomo | PostHog |
|---|---|---|
| **Verdict** | **Pass** | Uncertain |
| **Evidence** | Tatvic already has Matomo deployment and consulting experience with existing clients. The team knows Matomo's plugin architecture, PHP codebase, and MySQL backend. | PostHog requires ClickHouse, Kafka, and a more complex microservices architecture. No existing Tatvic expertise. |

### 5. One tool, not two

| | Matomo | PostHog |
|---|---|---|
| **Verdict** | **Pass** | Partial |
| **Evidence** | Matomo covers web analytics, goals/conversions, custom dimensions, segments, campaign tracking, and e-commerce reporting in one platform. Google Ads integration is a built-in plugin. | PostHog excels at product analytics (funnels, feature flags, session replay) but lacks marketing-grade campaign reports, referrer analysis, and ad platform integrations that marketing teams expect. |

---

## When to use PostHog instead

PostHog is the right choice only for **app-led or product-led clients at modest traffic** (<200k events/month) where:
- Feature flags and session replay matter more than marketing campaign reports
- The client has a product team, not just a marketing team
- Traffic is low enough that single-machine deployment is sufficient

---

## Architecture principle

Our IP lives in the **kit layer** (deploy, migration agent, parity checker, connectors, DPDP module) — not in Matomo itself. The kit is stack-agnostic: swapping Matomo for PostHog means changing the `MatomoClient` adapter, not rewriting the agents.
