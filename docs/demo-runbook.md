# Demo Runbook

Rehearse this twice before the event. Total demo time: ~25 minutes.

---

## Pre-demo checklist

- [ ] GCP project with credits, APIs enabled
- [ ] Service account JSON in `credentials/ga-service-account.json`
- [ ] `config/client.yaml` filled in (copy from `example.client.yaml`)
- [ ] Tatvic test website accessible
- [ ] Google Ads / Meta test account credentials ready
- [ ] Slack webhook URL for parity alerts (optional)

---

## Demo 1: One-command deploy (~10 min)

```bash
# Live deployment to fresh GCP project in India (asia-south1):
./deploy/install.sh --target gcp --project <gcp-project-id> --client demo

# Or bare-metal On-Premise Docker:
./deploy/install.sh --target on-premise --client demo

# Or instantaneous Dry-Run evaluation on judge's laptop ($0 cost):
./deploy/install.sh --dry-run --target gcp --client demo
```

**Show judges:**
- Script output progressing through 6 steps
- Matomo UI at `http://<ip>:8080` — complete setup wizard
- Kit API health check at `http://<ip>:8090/health`

---

## Demo 2: Migration agent on hidden GA4 property (~5 min)

```bash
python -m agents.migration.run --config config/client.yaml
# or: oydk migrate -c config/client.yaml
```

**Show judges:**
1. Terminal output: dimensions, goals being created
2. `output/migration/migration-report.md` — migrated items
3. GTM UI: new workspace "OYDK Migration Draft" (NOT published)
4. Unmigrated items list with reasons

---

## Demo 3: Parity check + break tag (~5 min)

```bash
# Run parity check
python -m agents.parity.run --config config/client.yaml

# Judge breaks a tag — then re-run:
python -m agents.parity.run --config config/client.yaml
```

**Show judges:**
1. Parity table: GA4 vs Matomo side by side
2. Red "MISS" on broken metric
3. Diagnosis: likely cause + proposed fix
4. Alert sent (Slack or console output)

---

## Demo 4: DPDP flows (~3 min)

**Consent:**
1. Open test site in incognito
2. Decline cookies → show Network tab: zero Matomo requests
3. Accept cookies → Matomo requests appear

**DSAR delete:**
```bash
oydk dsar-lookup --user-id test-visitor-123
oydk dsar-delete --user-id test-visitor-123
oydk dsar-lookup --user-id test-visitor-123  # confirm empty
```

---

## Demo 5: Conversion connector (~2 min)

```bash
oydk connectors-test -c config/client.yaml
```

**Show judges:** conversion visible in Google Ads or Meta test events manager.

---

## Demo 6: Stack choice (~2 min)

Walk through `docs/stack-choice.md` — five tests, why Matomo, when PostHog.
