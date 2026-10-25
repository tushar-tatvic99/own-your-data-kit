const output = document.getElementById("output");
let busy = false;
let linksCache = {};
let sessionCache = { mode: "default", config_path: "config/client.yaml" };
let activePanel = "demo";
const panelOutputs = {};

const ACTION_PANEL = {
  verify_parts: "demo",
  verify_dpdp: "dpdp",
  verify_matomo: "demo",
  migrate_live: "migration",
  migrate_linked: "migration",
  migrate_fixture: "migration",
  parity_live: "parity",
  parity_fixture_ok: "parity",
  parity_break_purchase: "parity",
  connectors_test: "connectors",
  history_fixture_dry: "bq",
  history_fixture_import: "bq",
  ga4_bq_import_live: "bq",
  ga4_bq_import_dry: "bq",
  bq_sync: "connectors",
};

function panelOutputEl(panel) {
  const map = {
    demo: "output-demo",
    migration: "output-migration",
    dpdp: "output-dpdp",
    connectors: "output-connectors",
    bq: "output-bq",
  };
  const id = map[panel];
  return id ? document.getElementById(id) : null;
}

function syncFooterOutput() {
  const o = panelOutputs[activePanel];
  output.classList.toggle("empty", !o?.text);
  output.classList.toggle("error", !!o?.isError);
  output.textContent = o?.text || "Output for the current tab appears here and in each panel above.";
}

function setPanelOutput(panel, text, isError) {
  panelOutputs[panel] = { text, isError: !!isError };
  const el = panelOutputEl(panel);
  if (el) {
    el.textContent = text;
    el.classList.toggle("error", !!isError);
  }
  if (panel === activePanel) syncFooterOutput();
}

function showOutput(text, isError) {
  setPanelOutput(activePanel, text, isError);
}

function activatePanel(panel) {
  activePanel = panel;
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-panel") === panel);
  });
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${panel}`)?.classList.add("active");
  const labels = {
    demo: "Run output (Demo mode)",
    deploy: "Run output (Deploy)",
    migration: "Run output (Migration)",
    parity: "Run output (Parity)",
    dpdp: "Run output (DPDP)",
    connectors: "Run output (Connectors)",
    bq: "Run output (GA4 BQ → Matomo)",
  };
  document.getElementById("output-label").textContent = labels[panel] || "Run output (active tab)";
  document.querySelector(".output-bar")?.classList.toggle("hidden", panel === "parity");
  syncFooterOutput();
  if (panel === "parity") loadParityDashboard();
  if (panel === "migration") loadMigrationDashboard();
  if (panel === "dpdp") loadDpdpDashboard();
  if (panel === "connectors") loadConnectors();
  if (panel === "bq") loadBqGuide();
  if (panel === "agent") loadAgentSites();
  if (panel === "infra") loadInfra();
  if (panel === "demo") loadSession();
  if (panel === "deploy") {
    loadMatomoProvisionStatus();
    loadGoogleAuthGuide();
  }
}

let matomoProvisionMeta = { default_matomo_url: "", hosted_matomo: true };
let matomoDeployPollTimer = null;
let matomoGcpDeployActive = false;

function focusMatomoDeployOutput() {
  document.querySelector(".matomo-provision-box")?.setAttribute("open", "");
  const out = document.getElementById("matomo-provision-result");
  const preview = document.getElementById("deploy-preview");
  out?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (preview && out) preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderDeployLogPanel(data, header) {
  const out = document.getElementById("matomo-provision-result");
  const preview = document.getElementById("deploy-preview");
  const lines = [];
  if (header) lines.push(header, "");
  if (data?.last_error) {
    lines.push("❌ Deploy failed:", data.last_error, "");
    if (data.last_error.includes("terraform")) {
      lines.push(
        "Fix: install Terraform on this PC and reopen the terminal, then retry.",
        "https://developer.hashicorp.com/terraform/install",
        ""
      );
    }
  } else if (data?.deploy_complete) {
    lines.push("✓ Deploy finished.", data.matomo_url ? `Matomo URL: ${data.matomo_url}` : "", "");
  } else if (data?.deploy_running) {
    lines.push("⏳ Deploy running in background (refreshing every few seconds)…", "");
  }
  if (data?.log_tail) lines.push("—— deploy.log (tail) ——", data.log_tail.slice(-6000));
  const text = lines.filter((x) => x !== undefined).join("\n");
  if (out) out.textContent = text || "Waiting for deploy.log…";
  if (preview && data?.log_tail) {
    preview.textContent = (preview.textContent || "") + "\n\n" + data.log_tail.slice(-3000);
  }
}

function matomoSourceMode() {
  return document.getElementById("btn-matomo-own")?.classList.contains("active") ? "own" : "hosted";
}

function isHostedMatomoUrl(url) {
  const u = (url || "").trim();
  const def = (matomoProvisionMeta.default_matomo_url || "").trim();
  if (!u) return true;
  if (def && u === def) return true;
  return u.includes("35-234-210-199");
}

function applyMatomoUrlToForms(url) {
  const clean = (url || "").trim();
  if (!clean) return;
  const prov = document.getElementById("matomo-provision-url");
  const form = document.getElementById("deploy-form");
  if (prov) prov.value = clean;
  if (form?.elements?.matomo_url) form.elements.matomo_url.value = clean;
}

function updateMatomoModeHint(hosted) {
  const hint = document.getElementById("matomo-provision-hint");
  if (!hint) return;
  if (hosted) {
    hint.textContent = matomoProvisionMeta.hint_hosted || matomoProvisionMeta.hint || "";
  } else {
    hint.textContent = matomoProvisionMeta.hint_own_gcp || matomoProvisionMeta.hint || "";
  }
}

function setMatomoSourceMode(mode) {
  const hosted = mode !== "own";
  document.getElementById("btn-matomo-hosted")?.classList.toggle("active", hosted);
  document.getElementById("btn-matomo-own")?.classList.toggle("active", !hosted);
  document.getElementById("matomo-gcp-own-panel")?.classList.toggle("hidden", hosted);
  document.getElementById("matomo-hosted-only")?.classList.toggle("hidden", !hosted);
  const urlInput = document.getElementById("matomo-provision-url");
  const openBtn = document.getElementById("btn-open-matomo");
  const openOwnBtn = document.getElementById("btn-open-matomo-own");
  const result = document.getElementById("matomo-provision-result");
  if (urlInput && hosted && matomoProvisionMeta.default_matomo_url) {
    urlInput.readOnly = true;
    urlInput.value = matomoProvisionMeta.default_matomo_url;
  }
  const matomoUrl =
    document.getElementById("deploy-form")?.elements?.matomo_url?.value?.trim() ||
    urlInput?.value?.trim() ||
    "";
  if (openBtn) openBtn.classList.toggle("hidden", !hosted || !matomoUrl);
  if (openOwnBtn) openOwnBtn.classList.toggle("hidden", hosted || !matomoUrl);
  if (result && !hosted) {
    result.textContent = "Deploy log and status appear here after you click Deploy Matomo on my GCP.";
  }
  updateMatomoModeHint(hosted);
  if (!hosted) {
    document.getElementById("deploy-form")?.elements?.gcp_project_id?.focus();
  }
}

function stopMatomoDeployPoll() {
  if (matomoDeployPollTimer) {
    clearInterval(matomoDeployPollTimer);
    matomoDeployPollTimer = null;
  }
}

async function refreshMatomoUrlFromDeploy(silent) {
  const fields = deployFields();
  const showLog = matomoGcpDeployActive || !silent;
  try {
    const q = fields.client_name ? `?client_name=${encodeURIComponent(fields.client_name)}` : "";
    const data = await apiGet(`/api/deploy/status${q}`);
    if (data.matomo_url) {
      applyMatomoUrlToForms(data.matomo_url);
      setMatomoSourceMode(matomoSourceMode());
      if (!silent) {
        setDeployStatus(`Matomo URL detected: ${data.matomo_url}`, true);
      }
    }
    if (showLog) renderDeployLogPanel(data);
    if (data.deploy_failed) {
      matomoGcpDeployActive = false;
      stopMatomoDeployPoll();
      setDeployStatus(data.last_error || "Deploy failed — see log below.", false);
      focusMatomoDeployOutput();
    } else if (data.deploy_complete) {
      matomoGcpDeployActive = false;
      stopMatomoDeployPoll();
      setDeployStatus(data.matomo_url ? `Deploy complete — ${data.matomo_url}` : "Deploy complete.", true);
    } else if (data.deploy_running && matomoGcpDeployActive) {
      setDeployStatus("GCP deploy running… watch the log in Step 1 below.", true);
    }
    return data;
  } catch (e) {
    if (!silent) setDeployStatus(String(e), false);
    return null;
  }
}

function startMatomoDeployPoll() {
  stopMatomoDeployPoll();
  matomoGcpDeployActive = true;
  matomoDeployPollTimer = setInterval(() => refreshMatomoUrlFromDeploy(true), 5000);
  refreshMatomoUrlFromDeploy(true);
}

async function deployMatomoOnMyGcp() {
  const fields = deployFields();
  if (!(fields.gcp_project_id || "").trim()) {
    setDeployStatus("Enter GCP project ID in the form below (required for your Matomo VM).", false);
    document.getElementById("deploy-form")?.elements?.gcp_project_id?.focus();
    return;
  }
  if (!(fields.client_name || "").trim()) {
    setDeployStatus("Enter Client name (used for VM name and Terraform).", false);
    return;
  }
  const dep = linksCache.deploy || {};
  const confirmMsg =
    dep.host === "cloud_run"
      ? "This hosted page cannot open PowerShell on your PC.\n\nWe will show the command to run locally. Continue?"
      : "Open PowerShell on this PC?\n\nIt will install Terraform/gcloud if needed, sign you into Google if needed, then deploy Matomo on your GCP project (15–25 min).";
  if (!confirm(confirmMsg)) return;

  setMatomoSourceMode("own");
  focusMatomoDeployOutput();
  const out = document.getElementById("matomo-provision-result");
  if (out) {
    out.textContent = "Launching PowerShell deploy window…";
  }
  let data;
  try {
    try {
      data = await apiPost("/api/deploy/start-terminal", { fields });
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes("404") && msg.includes("start-terminal")) {
        data = await apiPost("/api/deploy/start", { fields, interactive_terminal: true });
      } else {
        throw e;
      }
    }
  } catch (e) {
    const err = e?.message || String(e);
    setDeployStatus(err, false);
    renderDeployLogPanel({ last_error: err }, "Could not start deploy");
    return;
  }
  const text = formatDeployStartResponse(data);
  document.getElementById("deploy-preview").textContent = text;
  setDeployStatus(data.message || data.error || "Deploy", !!data.started);
  setPanelOutput("deploy", text, !data.started);
  if (data.started) {
    renderDeployLogPanel({ deploy_running: true, log_tail: "" }, "PowerShell deploy running");
    startMatomoDeployPoll();
  } else {
    renderDeployLogPanel({ last_error: data.error || data.message, log_tail: "" }, "Run on your PC");
  }
  focusMatomoDeployOutput();
}

function matomoLoginUrl(baseUrl) {
  const base = (baseUrl || matomoProvisionMeta.default_matomo_url || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/index.php?module=Login`;
}

function openMatomoLogin() {
  const url =
    matomoLoginUrl(document.getElementById("matomo-provision-url")?.value) ||
    matomoLoginUrl(document.getElementById("deploy-form")?.elements?.matomo_url?.value);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function loadMatomoProvisionStatus() {
  const hint = document.getElementById("matomo-provision-hint");
  if (!hint) return;
  try {
    const data = await apiGet("/api/matomo/provision/status");
    matomoProvisionMeta = data;
    hint.textContent = data.hint || "";
    const matomoInput = document.getElementById("matomo-provision-url");
    if (matomoInput && data.default_matomo_url && !matomoInput.value) {
      matomoInput.value = data.default_matomo_url;
    }
    setMatomoSourceMode(matomoSourceMode());
  } catch (e) {
    hint.textContent = String(e);
  }
}

function setDeployStatus(msg, ok) {
  const el = document.getElementById("deploy-status");
  if (!el) return;
  el.textContent = msg;
  el.className = "deploy-status " + (ok ? "ok" : ok === false ? "err" : "");
}

function formatActionOutput(data) {
  let text = [data.stdout, data.stderr].filter(Boolean).join("\n");
  if (data.result != null) text += (text ? "\n\n" : "") + JSON.stringify(data.result, null, 2);
  if (!text) text = JSON.stringify(data, null, 2);
  return text;
}

function formatStepBlock(s) {
  const head = `${s.status === "ok" ? "✓" : "✗"} ${s.label} (${s.action})`;
  const parts = [head];
  if (s.stdout) parts.push(s.stdout.trim());
  if (s.stderr) parts.push(s.stderr.trim());
  if (s.result) parts.push(JSON.stringify(s.result, null, 2));
  return parts.join("\n");
}

function deployFields() {
  const form = document.getElementById("deploy-form");
  const data = {};
  new FormData(form).forEach((v, k) => {
    data[k] = v;
  });
  data.connectors_demo = true;
  const emailEl = document.querySelector('input[name="provision_email"]');
  if (emailEl?.value) data.provision_email = emailEl.value;
  const matomoUrlEl = document.querySelector('.matomo-provision-box input[name="matomo_url"]');
  const formMatomo = form.elements.namedItem("matomo_url");
  const matomoUrl = (matomoUrlEl?.value || formMatomo?.value || "").trim();
  if (matomoUrl) data.matomo_url = matomoUrl;
  if (!(data.website_url || "").trim() && sessionCache.default_fields?.website_url) {
    data.website_url = sessionCache.default_fields.website_url;
  }
  const tokenEl = document.querySelector('input[name="provision_token"]');
  if (tokenEl?.value) data.provision_token = tokenEl.value;
  return data;
}

function fillDeployForm(fields) {
  if (!fields) return;
  const form = document.getElementById("deploy-form");
  Object.entries(fields).forEach(([k, v]) => {
    const el = form.elements.namedItem(k);
    if (el && v != null && v !== "") el.value = v;
  });
}

async function loadSession() {
  sessionCache = await apiGet("/api/session/status");
  const badge = document.getElementById("session-badge");
  badge.textContent =
    `Mode: ${sessionCache.mode} · Config: ${sessionCache.config_path}` +
    (sessionCache.credentials?.live_parity_ready ? " · Live GA4+Matomo ready" : " · Fixture fallback available");
  const creds = sessionCache.credentials || {};
  document.getElementById("cred-grid").innerHTML = [
    ["Matomo token", creds.matomo_token],
    ["GA credentials file", creds.ga_credentials_present],
    ["Live migration", creds.live_migration_ready],
    ["Live parity", creds.live_parity_ready],
    ["SMTP (email alerts)", creds.smtp_ready],
  ]
    .map(
      ([label, ok]) =>
        `<div class="cred-chip ${ok ? "ok" : "bad"}">${label}: ${ok ? "ready" : "missing"}</div>`
    )
    .join("");
  const plan = (sessionCache.suite_plan || []).map((s) => s.label).join(" → ");
  document.getElementById("suite-plan-hint").textContent = `Default suite: ${plan}`;
  const gc = sessionCache.gcloud || {};
  document.getElementById("gcloud-status").textContent =
    `Account(s): ${(gc.active_accounts || []).join(", ") || "none"}\n` +
    `Project: ${gc.project || "—"}\n` +
    `Token: ${gc.token_ok ? "valid" : "expired — use Sign in to Google Cloud"}\n` +
    (gc.token_error || "");
  const formFields =
    sessionCache.mode === "custom"
      ? sessionCache.active_fields_preview || sessionCache.default_fields
      : sessionCache.default_fields;
  fillDeployForm(formFields);
  const gcpIn = document.getElementById("gcloud-project-input");
  if (gcpIn && sessionCache.default_fields?.gcp_project_id) {
    gcpIn.value = sessionCache.default_fields.gcp_project_id;
  }
  setModeUI(sessionCache.mode || "default", false);
  await loadLinks();
  await loadGoogleAuthGuide();
}

async function loadGoogleAuthGuide() {
  const summary = document.getElementById("google-auth-summary");
  const list = document.getElementById("google-auth-needs");
  if (!summary) return;
  try {
    const data = await apiGet("/api/auth/google-guide");
    summary.textContent = data.summary || "";
    if (list && data.needs) {
      list.innerHTML = data.needs
        .map(
          (n) =>
            `<li><strong>${esc(n.task)}</strong> — ${esc(n.google_auth)}. ${esc(n.also || "")} <em>(${esc(n.where)})</em></li>`
        )
        .join("");
    }
    if (data.hosted_console && data.hosted_note) {
      summary.textContent += " " + data.hosted_note;
    }
  } catch (e) {
    summary.textContent = String(e);
  }
}

function gcloudProjectId() {
  return (
    document.getElementById("gcloud-project-input")?.value?.trim() ||
    deployFields().gcp_project_id ||
    ""
  );
}

function setModeUI(mode, navigateCustom) {
  document.getElementById("demo-mode-value").value = mode;
  document.getElementById("btn-mode-default").classList.toggle("active", mode === "default");
  document.getElementById("btn-mode-custom").classList.toggle("active", mode === "custom");
  if (navigateCustom && mode === "custom") activatePanel("deploy");
}

function formatSuiteEvidence(ev) {
  if (!ev) return "";
  const lines = [];
  const m = ev.migration || {};
  lines.push("=== Migration (last report) ===");
  if ((m.dimensions || []).length) {
    lines.push(
      "Dimensions: " + m.dimensions.map((d) => d.name || d).join(", ")
    );
  } else {
    lines.push("Dimensions: (none in report — run migrate_live)");
  }
  if ((m.goals || []).length) {
    lines.push("Goals: " + m.goals.map((g) => g.name || g).join(", "));
  }
  if ((m.gtm_draft_changes || []).length) {
    lines.push(
      "GTM draft: " + m.gtm_draft_changes.map((c) => c.name || c).join(", ")
    );
  }
  if ((m.unmigrated || []).length) {
    lines.push("Unmigrated: " + m.unmigrated.map((u) => u.item || u).join("; "));
  }

  const d = ev.dpdp || {};
  lines.push("\n=== DPDP ===");
  const c = d.consent || {};
  lines.push(
    `Shop consent granted/denied: ${c.granted ?? 0} / ${c.denied ?? 0} (${c.source || "—"})`
  );
  const shop = d.rights_requests || [];
  if (shop.length) {
    lines.push("Shop rights requests:");
    shop.forEach((r) =>
      lines.push(`  - ${r.ticketId || "—"} ${r.requestType || ""} ${r.status || ""}`)
    );
  } else {
    lines.push("Shop rights requests: none (redeploy shop with /api/dpdp/summary if expected)");
  }
  const audit = d.audit_requests || [];
  if (audit.length) {
    lines.push("Erasure / DSAR audit (latest):");
    audit.slice(0, 10).forEach((r) =>
      lines.push(
        `  - ${r.timestamp} ${r.action} ${r.resource} deleted=${r.visits_deleted ?? "—"}`
      )
    );
  } else {
    lines.push("Erasure / DSAR audit: no erasure rows in local/kit audit log");
  }

  const p = ev.parity || {};
  lines.push("\n=== Parity (daily log, last 2 days) ===");
  (p.daily_last_2_days || []).forEach((row) => {
    lines.push(
      `  ${row.report_date}: within_target=${row.all_within_target} missed=${row.missed_metrics || row.missed_count}`
    );
  });
  const latest = p.latest_report;
  if (latest?.gaps) {
    lines.push(`Latest run ${latest.date} (${latest.mode || ""}):`);
    latest.gaps.forEach((g) =>
      lines.push(`  ${g.metric}: GA4=${g.ga4} Matomo=${g.matomo} gap=${g.gap_percent}% ${g.within_target ? "OK" : "MISS"}`)
    );
  }
  lines.push("\nTip: Parity tab = full tables + email preview. DPDP tab = live shop + audit. Migration tab = dimension/goal tables.");
  lines.push("Demo break tag: Parity panel → “Demo break” (parity_break_purchase).");
  return lines.join("\n");
}

function formatSuiteSteps(steps) {
  return (steps || [])
    .map((s) => {
      let line = `${s.status === "ok" ? "✓" : "✗"} ${s.label}`;
      const r = s.result;
      if (r?.dimensions?.length) line += ` — ${r.dimensions.length} dims`;
      if (r?.goals?.length) line += `, ${r.goals.length} goals`;
      if (r?.gaps?.length) {
        const miss = r.gaps.filter((g) => !g.within_target).length;
        line += ` — ${r.date}: ${miss ? miss + " MISS" : "all OK"}`;
      }
      if (s.stderr) line += `\n    ${s.stderr.trim()}`;
      if (s.stdout && s.status === "ok" && !r?.gaps) {
        const snippet = s.stdout.trim().split("\n").slice(-6).join("\n    ");
        if (snippet) line += `\n    ${snippet}`;
      }
      return line;
    })
    .join("\n");
}

async function runDemoSuite(fixtureOnly) {
  if (busy) return;
  busy = true;
  setPanelOutput("demo", fixtureOnly ? "Running fixture-only suite…" : "Running default connection suite…", false);
  const buckets = { demo: [], migration: [], dpdp: [], parity: [], connectors: [] };
  try {
    const data = await apiPost("/api/demo/run-suite", { fixture_only: fixtureOnly });
    (data.steps || []).forEach((s) => {
      const panel = ACTION_PANEL[s.action] || "demo";
      buckets[panel].push(formatStepBlock(s));
    });
    Object.entries(buckets).forEach(([panel, lines]) => {
      if (lines.length) setPanelOutput(panel, lines.join("\n\n---\n\n"), data.status === "partial");
    });
    const combined =
      formatSuiteSteps(data.steps) +
      "\n\n" +
      formatSuiteEvidence(data.evidence);
    setPanelOutput("demo", combined, data.status === "partial");
    loadParityDashboard();
    loadMigrationDashboard();
    loadDpdpDashboard();
  } catch (e) {
    setPanelOutput("demo", String(e), true);
  } finally {
    busy = false;
  }
}

function wireDemoMode() {
  document.getElementById("btn-mode-default").addEventListener("click", async () => {
    setModeUI("default", false);
    await apiPost("/api/session/default");
    await loadSession();
    fillDeployForm(sessionCache.default_fields);
    setDeployStatus("Default demo — using config/client.yaml (Matomo site 1).", true);
    loadDpdpDashboard();
    loadParityDashboard();
  });
  document.getElementById("btn-mode-custom").addEventListener("click", async () => {
    setModeUI("custom", true);
    setDeployStatus(
      "Your Analytics Setup — fill credentials below, then Save & activate. Parity alerts default to tushar@tatvic.com; change alert emails for your inbox.",
      true
    );
    fillDeployForm(sessionCache.default_fields);
  });
  document.getElementById("btn-run-default-suite").addEventListener("click", () => runDemoSuite(false));
  document.getElementById("btn-run-fixture-suite").addEventListener("click", () => runDemoSuite(true));
  document.getElementById("btn-gcloud-login").addEventListener("click", async () => {
    const data = await apiPost("/api/gcloud/login", { gcp_project_id: gcloudProjectId() });
    setPanelOutput("demo", data.message || JSON.stringify(data), !data.started);
  });
  document.getElementById("btn-gcloud-set-project")?.addEventListener("click", async () => {
    const data = await apiPost("/api/gcloud/set-project", { gcp_project_id: gcloudProjectId() });
    setPanelOutput("demo", data.message || data.error || JSON.stringify(data), !data.ok);
    await loadSession();
  });
  document.getElementById("btn-gcloud-refresh").addEventListener("click", loadSession);
}

async function parseApiResponse(res, path) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  if (!ct.includes("application/json")) {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 80);
    throw new Error(
      `API ${path} returned ${res.status} (expected JSON). ` +
        (res.status === 404
          ? "Restart the demo console: py -3 -m kit.cli demo-ui"
          : snippet || "non-JSON response")
    );
  }
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`API ${path} returned invalid JSON (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.error = data.error;
    throw err;
  }
  return data;
}

async function apiGet(path) {
  const res = await fetch(path);
  return parseApiResponse(res, path);
}

async function apiPost(path, body = {}) {
  const payload = { ...body };
  if (!payload.config && sessionCache.config_path) payload.config = sessionCache.config_path;
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseApiResponse(res, path);
}

function setBqButtonsDisabled(disabled) {
  ["btn-ga4-bq-dry", "btn-ga4-bq-import"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

async function runAction(action, params = {}) {
  if (busy) {
    showOutput("Another job is still running — wait for it to finish.", true);
    return;
  }
  busy = true;
  const panel = ACTION_PANEL[action] || activePanel;
  if (!action.startsWith("parity")) {
    setPanelOutput(panel, `Running ${action}…`, false);
  }
  document.querySelectorAll("[data-action]").forEach((b) => (b.disabled = true));
  setBqButtonsDisabled(true);
  try {
    const data = await apiPost("/api/run", { action, params });
    if (action.startsWith("parity")) {
      await loadParityDashboard();
    } else {
      setPanelOutput(panel, formatActionOutput(data), data.status === "error");
    }
    if (action.startsWith("migrate")) loadMigrationDashboard();
    if (action === "verify_dpdp") loadDpdpDashboard();
  } catch (e) {
    setPanelOutput(panel, String(e), true);
  } finally {
    busy = false;
    document.querySelectorAll("[data-action]").forEach((b) => (b.disabled = false));
    setBqButtonsDisabled(false);
  }
}

function parityDateParams() {
  const d = document.getElementById("parity-date").value;
  return d ? { date: d } : {};
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");
}

function renderTable(container, headers, rows) {
  if (!rows.length) {
    container.innerHTML = `<p class="muted">No rows yet.</p>`;
    return;
  }
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${headers.map((h) => `<td>${esc(row[h])}</td>`).join("")}</tr>`)
    .join("");
  container.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

async function loadLinks() {
  linksCache = await apiGet("/api/links");
  document.getElementById("client-name").textContent = linksCache.client || "demo";
  document.getElementById("migration-config").textContent = linksCache.config_path;
  document.getElementById("parity-threshold").textContent = linksCache.parity_threshold ?? 5;
  const pill = document.getElementById("kit-pill");
  pill.textContent = linksCache.kit_api_ok ? "Kit API online" : "Kit API offline";
  pill.className = "kit-pill " + (linksCache.kit_api_ok ? "ok" : "bad");
  const erasure = document.getElementById("link-erasure");
  if (linksCache.erasure_demo) erasure.href = linksCache.erasure_demo;
  if (linksCache.parity_sheet_exists) document.getElementById("dl-sheet").classList.remove("disabled");
  const dep = linksCache.deploy || {};
  const judgeBanner = document.getElementById("judge-browser-banner");
  if (judgeBanner && dep.host === "cloud_run" && dep.hosted_console_url) {
    judgeBanner.innerHTML =
      "<strong>Hosted demo</strong> — everything runs in this browser tab. " +
      `Share this link: <a href="${esc(dep.hosted_console_url)}" target="_blank" rel="noopener">${esc(dep.hosted_console_url)}</a>`;
  }
  const banner = document.getElementById("deploy-cloud-banner");
  const btnGcp = document.getElementById("btn-deploy-start");
  const btnLocal = document.getElementById("btn-deploy-local");
  const btnGcloud = document.getElementById("btn-go-demo-gcloud");
  if (banner && dep.host === "cloud_run") {
    banner.classList.remove("hidden");
    banner.innerHTML =
      "<strong>Hosted console</strong> — Deploy to GCP and gcloud sign-in run on <em>your laptop</em>, not in this browser tab. " +
      "Use <strong>Save &amp; activate</strong>, then follow the steps when you click Deploy (we save YAML and show the PowerShell command).";
    if (btnGcp) btnGcp.textContent = "Prepare GCP deploy (run on your PC)";
    if (btnLocal) btnLocal.classList.add("hidden");
    if (btnGcloud) btnGcloud.classList.remove("hidden");
  } else if (banner) {
    banner.classList.add("hidden");
    if (btnGcp) btnGcp.textContent = "Deploy to GCP";
    if (btnLocal) btnLocal.classList.remove("hidden");
    if (btnGcloud) btnGcloud.classList.add("hidden");
  }
}

function formatDeployStartResponse(data) {
  const lines = [data.message || ""];
  if (data.steps?.length) {
    lines.push("", "Steps:");
    data.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }
  if (data.checklist?.length) {
    lines.push("", "Checklist:");
    data.checklist.forEach((c) => lines.push(`  - ${c}`));
  }
  if (data.command) lines.push("", "PowerShell (repo root):", data.command);
  if (data.gcloud_reminder) lines.push("", data.gcloud_reminder);
  if (data.log) lines.push("", `Log file: ${data.log}`);
  if (data.saved_config) lines.push("", `Saved: ${data.saved_config}`);
  if (data.error) lines.push("", `Error: ${data.error}`);
  return lines.filter(Boolean).join("\n");
}

async function handleDeployStart(localOnly, opts = {}) {
  const matomoGcp = !!opts.matomoGcp;
  const dep = linksCache.deploy || {};
  if (!localOnly && dep.host === "cloud_run") {
    const data = await apiPost("/api/deploy/start", { fields: deployFields() });
    document.getElementById("deploy-preview").textContent = formatDeployStartResponse(data);
    setDeployStatus(data.message, true);
    setPanelOutput("deploy", formatDeployStartResponse(data), false);
    return;
  }
  const msg = localOnly
    ? "Start local Docker deploy on this PC?"
    : matomoGcp
      ? "Deploy Matomo + kit stack on YOUR GCP project in the background?\n\nRequires gcloud sign-in (Demo mode → Sign in to Google Cloud). This can take 15–25 minutes."
      : "Start GCP deploy in background on this PC?\n\nFirst: Demo mode → Sign in to Google Cloud (gcloud auth).";
  if (!confirm(msg)) return;
  let data;
  try {
    data = await apiPost("/api/deploy/start", {
      fields: deployFields(),
      local_only: localOnly,
    });
  } catch (e) {
    const err = e?.message || String(e);
    setDeployStatus(err, false);
    if (matomoGcp) renderDeployLogPanel({ last_error: err }, "Deploy could not start");
    focusMatomoDeployOutput();
    return;
  }
  const text = formatDeployStartResponse(data);
  document.getElementById("deploy-preview").textContent = text;
  const ok = !!data.started;
  setDeployStatus(data.message || data.error || (ok ? "Deploy started" : "Deploy did not start"), ok);
  setPanelOutput("deploy", text, !ok);
  if (matomoGcp) {
    focusMatomoDeployOutput();
    if (!ok) {
      renderDeployLogPanel(
        { last_error: data.error || data.message, log_tail: "" },
        "Deploy did not start"
      );
      if (data.preflight?.checks) {
        const hints = data.preflight.checks
          .filter((c) => !c.ok)
          .map((c) => `• ${c.name}: ${c.hint}`)
          .join("\n");
        document.getElementById("matomo-provision-result").textContent += "\n\n" + hints;
      }
    } else {
      startMatomoDeployPoll();
    }
  } else if (ok && !localOnly) {
    activatePanel("demo");
  }
}

function formatParityFromReport(report) {
  if (!report?.gaps?.length) return "";
  const lines = [
    `=== Parity ${report.date} (${report.mode || "—"}) ===`,
    `All within ±target: ${report.all_within_target ? "YES" : "NO"}`,
    "",
  ];
  report.gaps.forEach((g) => {
    lines.push(
      `${g.within_target ? "OK" : "MISS"}  ${g.metric}: GA4=${g.ga4}  Matomo=${g.matomo}  gap=${g.gap_percent}%`
    );
  });
  if ((report.diagnosis || []).length) {
    lines.push("", "Diagnosis:");
    report.diagnosis.slice(0, 3).forEach((d) => {
      lines.push(`- (${d.confidence}) ${d.cause}`);
    });
  }
  if (report._source_file) lines.push("", `Source: ${report._source_file}`);
  return lines.join("\n");
}

function renderParityMetricsTable(containerId, report) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!report?.gaps?.length) {
    el.innerHTML = "";
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  renderTable(
    el,
    ["metric", "ga4", "matomo", "gap_percent", "status"],
    report.gaps.map((g) => ({
      metric: g.metric,
      ga4: g.ga4,
      matomo: g.matomo,
      gap_percent: g.gap_percent + "%",
      status: g.within_target ? "OK" : "MISS",
    }))
  );
}

function fillParityPanel(report, preview, subjectElId, tableElId, emptyElId) {
  const subj = subjectElId ? document.getElementById(subjectElId) : null;
  const emptyEl = emptyElId ? document.getElementById(emptyElId) : null;
  if (subj) {
    if (!report) {
      subj.textContent = "";
      subj.classList.add("hidden");
    } else {
      subj.classList.remove("hidden");
      subj.textContent =
        (preview?.subject || "") + (report._source_file ? ` · ${report._source_file}` : "");
    }
  }
  renderParityMetricsTable(tableElId, report);
  if (emptyEl) {
    emptyEl.classList.toggle("hidden", !!(report?.gaps?.length));
  }
}

function renderParityDiagnosis(live, targetGap) {
  const diagSection = document.getElementById("parity-live-diagnosis-section");
  const diagTable = document.getElementById("parity-live-diagnosis-table");
  document.querySelectorAll(".parity-threshold-inline").forEach((el) => {
    el.textContent = String(targetGap ?? 5);
  });

  const missed = live && !live.all_within_target;
  const diagnosis = live?.diagnosis || [];
  if (diagSection) {
    diagSection.classList.toggle("hidden", !missed || !diagnosis.length);
  }
  if (missed && diagnosis.length && diagTable) {
    renderTable(
      diagTable,
      ["confidence", "cause", "fix", "affected"],
      diagnosis.map((d) => ({
        confidence: d.confidence,
        cause: d.cause,
        fix: d.fix,
        affected: d.affected || "—",
      }))
    );
  } else if (diagTable) {
    diagTable.innerHTML = "";
  }
}

function renderParityAlertEmail(live, alertEmail, targetGap) {
  const emailSection = document.getElementById("parity-alert-email-section");
  const emailStatus = document.getElementById("parity-alert-email-status");
  const emailTable = document.getElementById("parity-alert-email-table");
  const meta = alertEmail || {};
  const recipients = meta.recipients || live?.email_alert?.recipients || [];
  const sent = live?.email_alert?.sent === true;
  const smtpOk = meta.smtp_ready;
  const missed = live && !live.all_within_target;

  if (emailSection) {
    emailSection.classList.toggle("sent", !!(sent && recipients.length));
    emailSection.classList.toggle("pending", !sent && missed && recipients.length);
  }
  if (emailStatus) {
    if (!live) {
      emailStatus.textContent =
        `Each live parity run emails the full report; when gap exceeds ±${targetGap}% the message includes diagnosis. Run live parity to send.`;
    } else if (sent) {
      emailStatus.textContent = `Email sent for ${live.date} (diagnosis included when over ±${targetGap}%):`;
    } else if (missed && smtpOk) {
      emailStatus.textContent = `Live gap over ±${targetGap}% on ${live.date}. Re-run live parity to resend, or check SMTP.`;
    } else if (missed) {
      emailStatus.textContent =
        `Gap over ±${targetGap}% on ${live.date}. Set OYDK_SMTP_USER / OYDK_SMTP_PASS in .env to send (recipients below):`;
    } else {
      emailStatus.textContent = `Within target on ${live.date}. Daily report still goes to:`;
    }
  }
  if (emailTable) {
    renderTable(
      emailTable,
      ["recipient"],
      recipients.map((r) => ({ recipient: r }))
    );
  }
}

async function loadParityDashboard() {
  const data = await apiGet("/api/dashboard/parity");
  const daily = data.daily_rows || [];
  const targetGap = data.target_gap_percent ?? 5;
  document.getElementById("parity-threshold").textContent = String(targetGap);
  renderTable(
    document.getElementById("parity-daily-table"),
    ["run_at_utc", "report_date", "mode", "all_within_target", "missed_count", "missed_metrics"],
    daily.slice().reverse()
  );

  const live = data.live_report;
  const fixture = data.fixture_report;
  fillParityPanel(
    live,
    data.live_email_preview,
    "parity-live-subject",
    "parity-live-metrics-table",
    "parity-live-empty"
  );
  fillParityPanel(fixture, null, null, "parity-fixture-metrics-table", "parity-fixture-empty");
  renderParityDiagnosis(live, targetGap);
  renderParityAlertEmail(live, data.alert_email, targetGap);
  const hintEl = document.getElementById("parity-live-hint");
  if (hintEl) {
    hintEl.textContent =
      "GA4 property vs Matomo site 1 (real APIs). Large gaps usually mean consent or GTM—not the wrong site.";
  }
  delete panelOutputs.parity;
  if (activePanel === "parity") syncFooterOutput();
}

let migrationBundlesCache = {};
let migrationDownloadsCache = {};
let migrationBundleViewKind = null;

const MIGRATION_DL_FILENAMES = {
  mtm: "oydk-mtm-container-draft.json",
  gtm_suggested: "oydk-gtm-matomo-suggested-container.json",
  gtm_workspace: "oydk-gtm-workspace-draft.json",
};

function bundleAvailable(data, key) {
  if (data.bundles && data.bundles[key]) return true;
  if (key === "mtm" && data.has_mtm_bundle) return true;
  if (key === "gtm_suggested" && data.has_gtm_suggested_bundle) return true;
  if (key === "gtm_workspace" && data.has_gtm_workspace_bundle) return true;
  return false;
}

function setMigrationBundleButtons(data) {
  const mtm = document.getElementById("btn-migration-mtm");
  const gtm = document.getElementById("btn-migration-gtm-suggested");
  const ws = document.getElementById("btn-migration-gtm-workspace");
  const on = (key) => bundleAvailable(data, key) || !!data.report;
  if (mtm) mtm.disabled = !on("mtm");
  if (gtm) gtm.disabled = !on("gtm_suggested");
  if (ws) ws.disabled = !on("gtm_workspace");
  ["mtm", "gtm_suggested", "gtm_workspace"].forEach((key) => {
    const id =
      key === "mtm"
        ? "dl-migration-mtm"
        : key === "gtm_suggested"
          ? "dl-migration-gtm-suggested"
          : "dl-migration-gtm-workspace";
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !on(key);
  });
}

function renderMigrationReportSections(data) {
  const root = document.getElementById("migration-report-root");
  const empty = document.getElementById("migration-report-empty");
  if (!root) return;
  const rep = data.report;
  if (!rep) {
    if (empty) empty.classList.remove("hidden");
    root.querySelectorAll(".migration-report-section").forEach((n) => n.remove());
    setMigrationBundleButtons(data);
    return;
  }
  if (empty) empty.classList.add("hidden");
  root.querySelectorAll(".migration-report-section").forEach((n) => n.remove());

  const mk = (title, inner) => {
    const sec = document.createElement("div");
    sec.className = "migration-report-section";
    sec.innerHTML = `<h3>${esc(title)}</h3>${inner}`;
    root.appendChild(sec);
  };

  const dimRows = (data.dimensions || []).map((d) => ({
    name: d.name,
    scope: d.scope,
    ga4_source: d.ga4_source,
  }));
  mk(
    "Migrated in Matomo — custom dimensions (from GA4)",
    dimRows.length
      ? `<div class="table-wrap" id="migration-dims-table"></div>`
      : `<p class="hint">No dimensions in this run.</p>`
  );
  if (dimRows.length) {
    renderTable(root.querySelector("#migration-dims-table"), ["name", "scope", "ga4_source"], dimRows);
  }

  const goalRows = (data.goals || []).map((g) => ({ name: g.name, ga4_source: g.ga4_source }));
  mk(
    "Migrated in Matomo — goals / conversions (from GA4 events)",
    goalRows.length
      ? `<div class="table-wrap" id="migration-goals-table"></div>`
      : `<p class="hint">No goals in this run.</p>`
  );
  if (goalRows.length) {
    renderTable(root.querySelector("#migration-goals-table"), ["name", "ga4_source"], goalRows);
  }

  const unmigrated = data.unmigrated || [];
  mk(
    "Could not auto-migrate (with reason)",
    unmigrated.length
      ? `<div class="table-wrap" id="migration-unmigrated-table"></div>`
      : `<p class="hint">None listed — see MTM/GTM bundles for tag-level gaps.</p>`
  );
  if (unmigrated.length) {
    renderTable(
      root.querySelector("#migration-unmigrated-table"),
      ["item", "reason"],
      unmigrated.map((u) => ({ item: u.item, reason: u.reason }))
    );
  }

  const gtmDraft = data.gtm_draft || [];
  mk(
    "GTM workspace draft tags (NOT published)",
    gtmDraft.length
      ? `<div class="table-wrap" id="migration-gtm-table"></div><p class="hint">File: <code>output/migration/gtm-draft-bundle.json</code></p>`
      : `<p class="hint">No GTM draft changes in report.</p>`
  );
  if (gtmDraft.length) {
    renderTable(
      root.querySelector("#migration-gtm-table"),
      ["name", "note"],
      gtmDraft.map((c) => ({ name: c.name, note: c.note || "" }))
    );
  }

  const mtm = data.mtm_summary;
  const gsc = data.gtm_suggested_summary;
  if (mtm || gsc) {
    const lines = [];
    if (mtm) {
      lines.push(
        `MTM draft: ${mtm.tag_count} tags, ${mtm.trigger_count} triggers, ${mtm.variable_count} variables → <code>${esc(mtm.path)}</code>`
      );
    }
    if (gsc) {
      lines.push(
        `GTM suggested container “${esc(gsc.name)}”: ${gsc.tag_count} Matomo tags → <code>${esc(gsc.path)}</code>`
      );
    }
    mk("Artifact files (same as migration-report.md)", `<ul class="prereq-list">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`);
  }

  setMigrationBundleButtons(data);
}

function migrationBundleTableRows(kind, bundle) {
  if (kind === "mtm") {
    const tags = (bundle.tags || []).map((t) => ({
      type: "tag",
      name: t.name,
      detail: t.type || t.note || "",
      source: t.replaces_gtm_tag || t.source_gtm_tag || "—",
    }));
    const triggers = (bundle.triggers || []).map((t) => ({
      type: "trigger",
      name: t.name,
      detail: t.type,
      source: t.source_gtm_trigger_id || "—",
    }));
    const vars = (bundle.variables || []).map((v) => ({
      type: "variable",
      name: v.name,
      detail: v.type,
      source: v.source_gtm_variable_id || "—",
    }));
    return [...triggers, ...vars, ...tags];
  }
  if (kind === "gtm_suggested") {
    const tags = (bundle.tags || []).map((t) => ({
      type: "tag",
      name: t.name,
      detail: t.note || t.tag_type,
      source: t.replaces_ga4_tag || "new",
    }));
    const triggers = (bundle.triggers || []).map((t) => ({
      type: "trigger",
      name: t.name,
      detail: t.type,
      source: "from client GTM",
    }));
    const vars = (bundle.variables || []).map((v) => ({
      type: "variable",
      name: v.name,
      detail: v.type,
      source: "from client GTM",
    }));
    const refs = (bundle.ga4_to_matomo_mapping_reference || []).map((r) => ({
      type: "mapping",
      name: r.source_gtm_tag,
      detail: JSON.stringify(r.matomo_equivalent || {}),
      source: r.type,
    }));
    return [...triggers, ...vars, ...tags, ...refs];
  }
  const changes = bundle.draft_changes || [];
  return changes.map((c) => ({
    type: c.type || "change",
    name: c.name,
    detail: c.note || c.action,
    source: c.replaces_ga4_tag || "—",
  }));
}

function downloadMigrationJson(kind) {
  const filename = MIGRATION_DL_FILENAMES[kind] || "oydk-migration-bundle.json";
  const cached = migrationBundlesCache[kind];
  if (cached) {
    const blob = new Blob([JSON.stringify(cached, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const url =
    migrationDownloadsCache[kind] ||
    (kind === "mtm"
      ? "/api/download/migration-mtm"
      : kind === "gtm_suggested"
        ? "/api/download/migration-gtm-suggested"
        : "/api/download/migration-gtm-workspace");
  downloadAsset(url, filename);
}

function renderMigrationBundleView(kind, bundle) {
  migrationBundleViewKind = kind;
  const panel = document.getElementById("migration-bundle-panel");
  const title = document.getElementById("migration-bundle-title");
  const blurb = document.getElementById("migration-bundle-blurb");
  const jsonEl = document.getElementById("migration-bundle-json");
  const tableEl = document.getElementById("migration-bundle-table");
  if (!panel) return;
  panel.classList.remove("hidden");
  const titles = {
    mtm: "Matomo Tag Manager (MTM) — container draft",
    gtm_suggested: "Google Tag Manager — new Matomo-only container (suggested)",
    gtm_workspace: "GTM — OYDK Migration Draft workspace bundle",
  };
  const blurbs = {
    mtm: bundle.publish_policy || bundle.import_hint || "",
    gtm_suggested: bundle.publish_policy || "",
    gtm_workspace: bundle.publish_policy || "Review in GTM UI before publish.",
  };
  if (title) title.textContent = titles[kind] || data.filename;
  if (blurb) blurb.textContent = blurbs[kind] || "";
  const rows = migrationBundleTableRows(kind, bundle);
  renderTable(tableEl, ["type", "name", "detail", "source"], rows);
  if (jsonEl) jsonEl.textContent = JSON.stringify(bundle, null, 2);
}

async function showMigrationBundle(kind) {
  const panel = document.getElementById("migration-bundle-panel");
  const title = document.getElementById("migration-bundle-title");
  const blurb = document.getElementById("migration-bundle-blurb");
  if (!panel) return;
  panel.classList.remove("hidden");
  if (title) title.textContent = "Loading…";
  if (blurb) blurb.textContent = "";

  let bundle = migrationBundlesCache[kind];
  if (!bundle) {
    try {
      const data = await apiGet(`/api/migration/bundle?kind=${encodeURIComponent(kind)}`);
      if (data.error) {
        if (title) title.textContent = "Bundle unavailable";
        blurb.textContent =
          data.error +
          " Restart the demo console (scripts\\Open-OYDK-Console.ps1) and run migration again, or open files under output/migration/.";
        return;
      }
      bundle = data.bundle;
    } catch (e) {
      if (title) title.textContent = "Bundle unavailable";
      if (blurb) {
        blurb.textContent =
          String(e) +
          " Restart demo-ui so /api/migration/bundle is available, or Ctrl+F5 after restart.";
      }
      return;
    }
  }
  renderMigrationBundleView(kind, bundle || {});
}

async function loadMigrationDashboard() {
  const data = await apiGet("/api/dashboard/migration");
  migrationBundlesCache = data.bundles || {};
  migrationDownloadsCache = data.downloads || {};
  renderMigrationReportSections(data);
}

async function loadDpdpDashboard() {
  const data = await apiGet("/api/dashboard/dpdp");
  const c = data.consent || {};
  const grantedToday = c.granted_today != null ? c.granted_today : "—";
  const deniedToday = c.denied_today != null ? c.denied_today : "—";
  document.getElementById("consent-cards").innerHTML = `
    <div class="stat-card"><span>Consent granted (shop log)</span><strong>${c.granted ?? 0}</strong><small>All time · today: ${grantedToday}</small></div>
    <div class="stat-card"><span>Consent denied (shop log)</span><strong>${c.denied ?? 0}</strong><small>All time · today: ${deniedToday}</small></div>
    <div class="stat-card"><span>Matomo visits today</span><strong>${c.matomo_visits_today ?? "—"}</strong><small>${esc(data.matomo_note)}</small></div>`;
  const rightsHint = document.getElementById("dpdp-rights-hint");
  if (rightsHint) {
    if (data.rights_requests_source === "aurablush_demo_seed") {
      rightsHint.textContent =
        "Demo tickets (shop /api/dpdp/summary offline). Includes DR-849201 retention + DPDP-2026-5YN04 erasure. Redeploy shop for live list.";
    } else if (data.rights_requests_source === "live_shop_api") {
      rightsHint.textContent = "Live from shop /api/dpdp/summary — submit new requests on the shop DPDP page.";
    }
  }
  renderTable(
    document.getElementById("shop-requests-table"),
    ["ticketId", "requestType", "status", "currentStage"],
    data.rights_requests || []
  );
  renderTable(
    document.getElementById("audit-requests-table"),
    ["timestamp", "action", "resource", "visits_deleted", "visits_before"],
    (data.audit_requests || []).map((r) => ({
      timestamp: r.timestamp,
      action: r.action,
      resource: r.resource,
      visits_deleted: r.visits_deleted ?? "",
      visits_before: r.visits_before ?? "",
    }))
  );
  const note = document.getElementById("dpdp-consent-note");
  if (note) {
    const c = data.consent || {};
    const extra =
      data.shop_fetch_error && c.source !== "aurablush_demo_seed" && c.source !== "live_shop_api"
        ? ` · ${data.shop_fetch_error}`
        : "";
    note.textContent = (c.note || "") + extra + (c.shop_url ? ` · Shop: ${c.shop_url}` : "");
  }
}

let activeConnectorId = null;

function renderConnectorDetail(view) {
  const el = document.getElementById("connector-detail");
  if (!el) return;
  if (!view || view.error) {
    el.innerHTML = `<p class="hint">${esc(view?.error || "Select a connector.")}</p>`;
    return;
  }
  const lines = (view.preview_lines || []).map((l) => `<li>${esc(l)}</li>`).join("");
  let sample = "";
  if ((view.sample_rows || []).length) {
    sample =
      "<h5>Latest rows (BigQuery)</h5>" +
      renderTableHtml(
        ["event_timestamp", "event_name", "event_category", "page_url"],
        view.sample_rows
      );
  }
  const live = view.live_check;
  const liveBit =
    live && live.status !== "not_run"
      ? `<p class="hint"><strong>Live check:</strong> ${esc(live.status)} ${esc(live.message || JSON.stringify(live.result || ""))}</p>`
      : "";
  el.innerHTML = `
    <h4>${esc(view.title)}</h4>
    <p>${esc(view.summary || "")}</p>
    <ul class="prereq-list">${lines}</ul>
    ${liveBit}
    ${sample}
    <div class="btn-row">
      ${
        view.open_url
          ? `<a class="btn primary" href="${esc(view.open_url)}" target="_blank" rel="noopener">${esc(view.open_label || "Open")}</a>`
          : ""
      }
      ${
        view.secondary_open_url
          ? `<a class="btn secondary" href="${esc(view.secondary_open_url)}" target="_blank" rel="noopener">${esc(view.secondary_open_label || "Open")}</a>`
          : ""
      }
      ${
        view.id === "meta"
          ? `<span class="hint">Configure Meta in YAML to enable.</span>`
          : ""
      }
    </div>`;
}

function renderTableHtml(columns, rows) {
  const head = columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${columns.map((c) => `<td>${esc(String(r[c] ?? ""))}</td>`).join("")}</tr>`
    )
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

async function openConnectorView(id) {
  if (id === "meta") {
    const data = await apiGet("/api/connectors/view?id=meta");
    renderConnectorDetail(data);
    return;
  }
  activeConnectorId = id;
  document.querySelectorAll(".connector-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.connectorId === id);
  });
  try {
    const data = await apiGet(`/api/connectors/view?id=${encodeURIComponent(id)}`);
    renderConnectorDetail(data);
  } catch (e) {
    renderConnectorDetail({ error: String(e) });
  }
}

async function loadConnectors() {
  const data = await apiGet("/api/dashboard/connectors");
  const grid = document.getElementById("connector-grid");
  grid.innerHTML = (data.connectors || [])
    .map((c) => {
      const isMeta = c.id === "meta";
      const tag = isMeta
        ? "Not configured"
        : `${c.ready ? "Configured" : "Needs config"}${c.demo ? " · demo" : " · live"}`;
      return `
    <article class="connector-card ${c.ready ? "ready" : ""} ${isMeta ? "disabled" : ""}" data-connector-id="${esc(c.id)}" role="button" tabindex="0">
      <h4>${esc(c.name)}</h4>
      <span class="tag">${tag}</span>
      <small class="hint">${isMeta ? "Click for setup notes" : "Click for live view"}</small>
    </article>`;
    })
    .join("");
  grid.querySelectorAll(".connector-card").forEach((card) => {
    card.addEventListener("click", () => openConnectorView(card.dataset.connectorId));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openConnectorView(card.dataset.connectorId);
      }
    });
  });
  if (activeConnectorId) openConnectorView(activeConnectorId);
}

function bqDateParams() {
  const s = document.getElementById("bq-start")?.value;
  const e = document.getElementById("bq-end")?.value;
  const p = {};
  if (s) p.start_date = s;
  if (e) p.end_date = e;
  return p;
}

function defaultBqDateRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

async function loadBqGuide() {
  const data = await apiGet("/api/bq/guide");
  const startEl = document.getElementById("bq-start");
  const endEl = document.getElementById("bq-end");
  if (startEl && endEl && !startEl.value && !endEl.value) {
    const { start, end } = defaultBqDateRange();
    startEl.value = start;
    endEl.value = end;
  }
  const flow = document.getElementById("bq-flow");
  if (flow) flow.textContent = data.flow || "";
  const banner = document.getElementById("bq-dataset-banner");
  if (banner) {
    const ds = data.ga4_export_dataset || {};
    if (ds.exists) {
      banner.className = "deploy-banner ok";
      banner.textContent = `GA4 export dataset found: ${ds.dataset_id} (${ds.location || "region OK"})`;
      banner.classList.remove("hidden");
    } else if (ds.dataset_id) {
      banner.className = "deploy-banner err";
      banner.innerHTML =
        `<strong>Live import blocked</strong> — BigQuery dataset <code>${esc(ds.dataset_id)}</code> does not exist yet. ` +
        `${esc(ds.detail || "")} ${esc(data.demo_without_bq || "")}`;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  }
  document.getElementById("bq-prereq").innerHTML = (data.prerequisites || [])
    .map((p) => `<li>${esc(p)}</li>`)
    .join("");
  const rows = (data.matomo_vs_ga4 || []).map((r) => ({
    topic: r.topic,
    ga4: r.ga4,
    matomo: r.matomo,
  }));
  renderTable(document.getElementById("bq-diff-table"), ["topic", "ga4", "matomo"], rows);
}

async function loadAgentSites() {
  const data = await apiGet("/api/agent/sites");
  const sel = document.getElementById("agent-site");
  sel.innerHTML = (data.sites || [])
    .map((s) => `<option value="${s.id}">${esc(s.name)} (${s.id})</option>`)
    .join("");
}

function wireNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => activatePanel(btn.getAttribute("data-panel")));
  });
}

async function loadInfra() {
  const data = await apiGet("/api/infra/verify");
  document.getElementById("infra-fix").innerHTML = (data.fix_commands || [])
    .map((c) => `<li><code>${esc(c)}</code></li>`)
    .join("");
  renderTable(
    document.getElementById("infra-table"),
    ["name", "ok", "detail"],
    (data.checks || []).map((c) => ({
      name: c.name,
      ok: c.ok ? "PASS" : c.required === false ? "optional" : "FAIL",
      detail: (c.detail || "").slice(0, 120),
    }))
  );
  const pill = document.getElementById("kit-pill");
  const kitCheck = (data.checks || []).find((c) => c.name && c.name.includes("health"));
  if (kitCheck) {
    pill.textContent = kitCheck.ok ? "Kit API online" : "Kit API offline";
    pill.className = "kit-pill " + (kitCheck.ok ? "ok" : "bad");
  }
}

function wireDeploy() {
  document.querySelector(".matomo-source-row")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-matomo-source]");
    if (!btn) return;
    e.preventDefault();
    setMatomoSourceMode(btn.getAttribute("data-matomo-source") === "own" ? "own" : "hosted");
  });
  document.getElementById("btn-matomo-gcp-deploy")?.addEventListener("click", (e) => {
    e.preventDefault();
    deployMatomoOnMyGcp();
  });
  document.getElementById("btn-matomo-refresh-url")?.addEventListener("click", (e) => {
    e.preventDefault();
    refreshMatomoUrlFromDeploy(false);
  });
  document.getElementById("btn-open-matomo")?.addEventListener("click", (e) => {
    e.preventDefault();
    openMatomoLogin();
  });
  document.getElementById("btn-open-matomo-own")?.addEventListener("click", (e) => {
    e.preventDefault();
    openMatomoLogin();
  });
  document.getElementById("btn-deploy-preview")?.addEventListener("click", async () => {
    const data = await apiPost("/api/deploy/preview", { fields: deployFields() });
    document.getElementById("deploy-preview").textContent =
      "Interactive (recommended on laptop):\n" +
      (data.interactive_command || ".\\deploy\\enterprise-deploy.ps1") +
      "\n\nNon-interactive / console:\n" +
      data.command +
      (data.dry_run_command ? "\n\nDry-run:\n" + data.dry_run_command : "") +
      "\n\nChecklist:\n- " +
      (data.checklist || []).join("\n- ") +
      "\n\n--- YAML ---\n" +
      (data.yaml_preview || "");
    setDeployStatus("Preview ready — review command and YAML below. Nothing is saved until you click Save.", true);
  });
  document.getElementById("btn-deploy-save")?.addEventListener("click", async () => {
    const data = await apiPost("/api/deploy/save-config", { fields: deployFields() });
    setDeployStatus(`Saved client YAML to ${data.path}. Next: Save & activate, or Deploy to GCP.`, true);
    document.getElementById("deploy-preview").textContent =
      `✓ Written: ${data.path}\n\n` + (document.getElementById("deploy-preview").textContent || "");
  });
  document.getElementById("btn-matomo-provision")?.addEventListener("click", async () => {
    const out = document.getElementById("matomo-provision-result");
    const fields = deployFields();
    if (!fields.provision_email) {
      setDeployStatus("Enter work email for the new Matomo user.", false);
      return;
    }
    if (!fields.website_url) {
      setDeployStatus("Enter Shop / website URL in the form below first.", false);
      return;
    }
    out.textContent = "Creating your Matomo site… (up to a minute)";
    const btn = document.getElementById("btn-matomo-provision");
    if (btn) btn.disabled = true;
    try {
      const payload = { ...fields, matomo_source: matomoSourceMode() };
      const data = await apiPost("/api/matomo/provision", { fields: payload });
      if (data.error) throw new Error(data.error);
      const useCustom = document.getElementById("demo-mode-value")?.value === "custom";
      const form = document.getElementById("deploy-form");
      if (useCustom) {
        if (form.elements.matomo_url) form.elements.matomo_url.value = data.matomo_url || "";
        if (form.elements.site_id) form.elements.site_id.value = String(data.site_id || "");
      }
      const lines = [
        data.message,
        "",
        `Matomo URL: ${data.matomo_url}`,
        `Site ID: ${data.site_id}`,
        `Matomo login: ${data.user_login}`,
      ];
      if (!useCustom) {
        lines.push(
          "",
          "Default demo still uses bundled Aurablush (Matomo site ID 1).",
          "To run tests on this new site: Demo mode → Your Analytics Setup → Save & activate."
        );
      }
      if (data.user_password) lines.push(`One-time password (save it): ${data.user_password}`);
      if (data.api_token && !data.use_shared_api) {
        lines.push("", `Optional per-user token:\n${data.env_snippet}`);
      } else if (data.use_shared_api) {
        lines.push("", "API: using hosted Matomo token (nothing to paste).");
      }
      lines.push(
        "",
        "—— What to do next ——",
        useCustom
          ? "1. Demo mode → Run all connection tests (your site ID " + data.site_id + ")."
          : "1. Demo mode → Default demo → Run all default connection tests (site ID 1).",
        "2. Optional: Open Matomo login (new tab) with the login + password above.",
        "3. Deploy tab → fill GA4/GTM if needed → Deploy to GCP when ready."
      );
      out.textContent = lines.join("\n");
      document.getElementById("btn-open-matomo")?.classList.remove("hidden");
      if (useCustom) {
        const savedFields = deployFields();
        await apiPost("/api/deploy/save-config", { fields: savedFields });
        const activated = await apiPost("/api/session/custom", { fields: savedFields });
        setModeUI("custom", false);
        fillDeployForm(activated.active_fields_preview || savedFields);
        setDeployStatus("Matomo site linked — profile activated (Your Analytics Setup).", true);
      } else {
        setDeployStatus("Matomo site created — default demo unchanged (site 1).", true);
      }
      await loadSession();
    } catch (e) {
      const msg = e?.message || e?.error || String(e);
      out.textContent = msg.includes("Failed to fetch")
        ? "Could not reach the demo console server. Restart: py -3 -m kit.cli demo-ui"
        : msg;
      setDeployStatus("Matomo provisioning failed — see details above.", false);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  document.getElementById("btn-deploy-activate")?.addEventListener("click", async () => {
    const saved = await apiPost("/api/deploy/save-config", { fields: deployFields() });
    const data = await apiPost("/api/session/custom", { fields: deployFields() });
    setModeUI("custom", false);
    await loadSession();
    setDeployStatus(
      `Activated ${data.config_path} for all tabs (saved to ${saved.path}). Run the demo suite from Demo mode.`,
      true
    );
    setPanelOutput("deploy", `Profile active:\n${data.config_path}\n\nParity alerts: ${deployFields().alert_emails}`, false);
  });
  document.getElementById("btn-deploy-start")?.addEventListener("click", () => handleDeployStart(false));
  document.getElementById("btn-deploy-local")?.addEventListener("click", () => handleDeployStart(true));
  document.getElementById("btn-go-demo-gcloud")?.addEventListener("click", () => {
    activatePanel("demo");
    document.getElementById("btn-gcloud-login")?.scrollIntoView({ behavior: "smooth" });
  });
}

const PROFILE_COST = { small: 4200, standard: 9800, enterprise: 42000 };

function calcCost() {
  const hits = Number(document.getElementById("calc-hits").value) || 0;
  const events = Number(document.getElementById("calc-events").value) || 0;
  const ga4 = Number(document.getElementById("calc-ga4").value) || 0;
  const years = Number(document.getElementById("calc-years").value) || 3;
  const profile = document.getElementById("calc-profile").value;
  const monthly = PROFILE_COST[profile] || PROFILE_COST.standard;
  const deployOnce = 250000;
  const eventFactor = 1 + Math.min(events / 100000, 2) * 0.15;
  const matomo = (deployOnce + monthly * 12 * years * eventFactor) * 1.18;
  const ga4Total = ga4 * years;
  const el = document.getElementById("calc-result");
  el.innerHTML = `
    <p><strong>Self-hosted (OYDK + Matomo, ${profile}, ${years} yr)</strong><br>~₹${Math.round(matomo).toLocaleString()} incl. deploy, VM, maintenance, event load</p>
    <p><strong>GA4 360</strong><br>₹${ga4Total.toLocaleString()} (${hits.toLocaleString()} hits/mo reference)</p>
    <p class="savings">Indicative savings: ₹${Math.round(ga4Total - matomo).toLocaleString()}</p>`;
}

function appendChat(role, text) {
  const log = document.getElementById("chat-log");
  const div = document.createElement("div");
  div.className = "chat-msg " + role;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendAgent() {
  const input = document.getElementById("agent-input");
  const msg = input.value.trim();
  if (!msg) return;
  appendChat("user", msg);
  input.value = "";
  const siteId = Number(document.getElementById("agent-site").value);
  const data = await apiPost("/api/agent/chat", { message: msg, site_id: siteId });
  appendChat("bot", data.answer || data.error || JSON.stringify(data));
}

function wireActions() {
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      let params = {};
      if (action.startsWith("parity_")) params = parityDateParams();
      runAction(action, params);
    });
  });
  document.getElementById("btn-refresh-parity").addEventListener("click", loadParityDashboard);
  document.getElementById("btn-refresh-dpdp").addEventListener("click", loadDpdpDashboard);
  document.getElementById("btn-calc").addEventListener("click", calcCost);
  document.getElementById("btn-agent-send").addEventListener("click", sendAgent);
  document.getElementById("agent-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendAgent();
  });
  document.getElementById("btn-copy-out").addEventListener("click", () => {
    navigator.clipboard.writeText(panelOutputs[activePanel]?.text || output.textContent);
  });
  document.getElementById("btn-infra-verify").addEventListener("click", () => {
    loadInfra();
    showOutput("Infra checks refreshed — see Infra checklist table.", false);
  });
  document.getElementById("btn-ga4-bq-dry")?.addEventListener("click", () =>
    runAction("ga4_bq_import_dry", bqDateParams())
  );
  document.getElementById("btn-ga4-bq-import")?.addEventListener("click", () => {
    if (!confirm("Import GA4 BigQuery rows into Matomo?")) return;
    runAction("ga4_bq_import_live", bqDateParams());
  });
  document.getElementById("btn-migration-mtm")?.addEventListener("click", () => showMigrationBundle("mtm"));
  document.getElementById("btn-migration-gtm-suggested")?.addEventListener("click", () =>
    showMigrationBundle("gtm_suggested")
  );
  document.getElementById("btn-migration-gtm-workspace")?.addEventListener("click", () =>
    showMigrationBundle("gtm_workspace")
  );
  document.getElementById("btn-migration-bundle-close")?.addEventListener("click", () => {
    document.getElementById("migration-bundle-panel")?.classList.add("hidden");
  });
  document.getElementById("btn-migration-bundle-download")?.addEventListener("click", () => {
    if (migrationBundleViewKind) downloadMigrationJson(migrationBundleViewKind);
  });
  document.querySelectorAll(".migration-dl-btn[data-dl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.getAttribute("data-kind");
      if (kind) downloadMigrationJson(kind);
      else downloadAsset(btn.getAttribute("data-dl"), btn.getAttribute("data-filename"));
    });
  });
}

async function downloadAsset(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    showOutput(`Download failed: ${e}`, true);
  }
}

function wireDownloads() {
  document.querySelectorAll("[data-dl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      downloadAsset(btn.getAttribute("data-dl"), btn.getAttribute("data-filename"));
    });
  });
}

wireNav();
wireDemoMode();
wireDeploy();
wireActions();
wireDownloads();
loadSession();
loadParityDashboard();
loadMatomoProvisionStatus();
