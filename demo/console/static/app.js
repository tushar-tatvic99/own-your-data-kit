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
  if (!panel) return;
  activePanel = panel;
  document.querySelectorAll(".nav-btn").forEach((b) => {
    const on = b.getAttribute("data-panel") === panel && !b.dataset.scroll || (b.dataset.scroll === "consent-cards" && panel === "dpdp");
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
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
  document.querySelector(".output-bar")?.classList.toggle(
    "hidden",
    panel === "parity" ||
      panel === "deploy" ||
      panel === "migration" ||
      panel === "dpdp" ||
      panel === "connectors" ||
      panel === "bq" ||
      panel === "demo"
  );
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
    loadGaCredentialsStatus();
  }
}

let matomoProvisionMeta = { default_matomo_url: "", hosted_matomo: true };
let matomoDeployPollTimer = null;
let matomoGcpDeployActive = false;

function summarizeDeployLog(text) {
  const raw = (text || "").trim();
  if (!raw) return "No deploy yet";
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fail = [...lines].reverse().find((l) =>
    /deploy failed|failed|error|not recognized|CommandNotFound/i.test(l)
  );
  if (fail) {
    if (/terraform/i.test(raw) && /not recognized|CommandNotFound/i.test(raw)) {
      return "Deploy failed — Terraform is not installed (or not on PATH).";
    }
    return fail.length > 140 ? fail.slice(0, 137) + "…" : fail;
  }
  const ok = [...lines].reverse().find((l) =>
    /deploy (script )?finished|deploy complete|profile active|✓|\[OK\]/i.test(l)
  );
  if (ok) return ok.length > 140 ? ok.slice(0, 137) + "…" : ok;
  return lines[lines.length - 1].length > 140
    ? lines[lines.length - 1].slice(0, 137) + "…"
    : lines[lines.length - 1];
}

function showDeployLog(text, opts = {}) {
  const root = document.getElementById("deploy-log-root");
  const empty = document.getElementById("deploy-empty");
  const out = document.getElementById("matomo-provision-result");
  const status = document.getElementById("deploy-status");
  const full = text || "";
  if (out) out.textContent = full;
  if (status && !opts.keepStatus) {
    const summary = opts.summary || summarizeDeployLog(full);
    status.textContent = summary;
    const failed = /fail|error|not recognized|CommandNotFound/i.test(summary);
    const ok = /complete|finished|active|\[OK\]|✓/i.test(summary) && !failed;
    status.className = "deploy-status-line " + (failed ? "err" : ok ? "ok" : "");
    if (root) {
      root.classList.toggle("is-err", failed);
      root.classList.toggle("is-ok", ok);
    }
  }
  if (root) {
    root.classList.remove("hidden");
    if (!opts.expand) root.open = false;
  }
  if (empty) empty.classList.add("hidden");
}

function setDeployLog(text) {
  showDeployLog(text);
}

function focusMatomoDeployOutput() {
  const root = document.getElementById("deploy-log-root");
  document.getElementById("deploy-empty")?.classList.add("hidden");
  if (root) {
    root.classList.remove("hidden");
    root.open = false;
    root.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderDeployLogPanel(data, header) {
  const lines = [];
  if (header) lines.push(header, "");
  let summary = header || "Deploy status";
  if (data?.last_error) {
    lines.push("Deploy failed:", data.last_error, "");
    if (data.last_error.includes("terraform")) {
      lines.push(
        "Fix: install Terraform on this PC and reopen the terminal, then retry.",
        "https://developer.hashicorp.com/terraform/install",
        ""
      );
      summary = "Deploy failed — Terraform is not installed (or not on PATH).";
    } else {
      summary = data.last_error.length > 140 ? data.last_error.slice(0, 137) + "…" : data.last_error;
    }
  } else if (data?.deploy_complete) {
    lines.push("Deploy finished.", data.matomo_url ? `Matomo URL: ${data.matomo_url}` : "", "");
    summary = data.matomo_url ? `Deploy complete — ${data.matomo_url}` : "Deploy complete.";
  } else if (data?.deploy_running) {
    lines.push("Deploy running in background (refreshing every few seconds)…", "");
    summary = "GCP deploy running…";
  }
  if (data?.log_tail) lines.push("—— deploy.log (tail) ——", data.log_tail.slice(-6000));
  showDeployLog(lines.filter((x) => x !== undefined).join("\n") || "Waiting for deploy.log…", {
    summary,
  });
}

function matomoSourceMode() {
  return "own";
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
  const hidden = document.getElementById("deploy-matomo-url");
  const form = document.getElementById("deploy-form");
  if (hidden) hidden.value = clean;
  if (form?.elements?.matomo_url) form.elements.matomo_url.value = clean;
}

function setMatomoSourceMode(_mode) {
  /* Deploy tab is one-button only — keep Open Matomo / extras hidden. */
  document.getElementById("btn-open-matomo-own")?.classList.add("hidden");
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
      const wasActive = matomoGcpDeployActive;
      matomoGcpDeployActive = false;
      stopMatomoDeployPoll();
      setDeployStatus(
        data.matomo_url
          ? `Matomo live on your GCP — ${data.matomo_url}. Starting Migration → Parity → DPDP → Connectors…`
          : "GCP stack live. Starting Migration → Parity → DPDP → Connectors…",
        true
      );
      if (wasActive && !window.__oydkPostDeployKitStarted) {
        window.__oydkPostDeployKitStarted = true;
        runKitAfterDeploy(data.matomo_url || "");
      }
    } else if (data.deploy_running && matomoGcpDeployActive) {
      setDeployStatus("Hosting Matomo on your GCP… (PowerShell). Next: migration, parity, DPDP, connectors.", true);
    }
    return data;
  } catch (e) {
    if (!silent) setDeployStatus(String(e), false);
    return null;
  }
}

function startMatomoDeployPoll() {
  stopMatomoDeployPoll();
  window.__oydkPostDeployKitStarted = false;
  matomoGcpDeployActive = true;
  matomoDeployPollTimer = setInterval(() => refreshMatomoUrlFromDeploy(true), 5000);
  refreshMatomoUrlFromDeploy(true);
}

async function runKitAfterDeploy(matomoUrl) {
  const out = document.getElementById("matomo-provision-result");
  const append = (line) => {
    if (!out) return;
    out.textContent = (out.textContent || "") + (out.textContent ? "\n" : "") + line;
  };
  try {
    const fields = deployFields();
    if (matomoUrl) {
      applyMatomoUrlToForms(matomoUrl);
      fields.matomo_url = matomoUrl;
    }
    append("");
    append("=== Kit pipeline (after GCP Matomo) ===");
    append("1) Save profile for your GA4/GTM/Matomo");
    await apiPost("/api/deploy/save-config", { fields });
    await apiPost("/api/session/custom", { fields });
    setModeUI("custom", false);

    append("2) Migration (GA4 / GTM → Matomo)");
    setDeployStatus("Running migration (GA4/GTM → Matomo)…", true);
    let mig;
    try {
      mig = await apiPost("/api/run", { action: "migrate_linked", params: {} });
    } catch (e) {
      mig = { status: "error", stderr: String(e?.message || e) };
    }
    append(
      mig.status === "ok"
        ? "   Migration OK"
        : `   Migration needs attention: ${(mig.stderr || mig.message || "").slice(0, 200)}`
    );

    append("3) Parity check (GA4 vs Matomo)");
    setDeployStatus("Running parity check…", true);
    let parity;
    try {
      parity = await apiPost("/api/run", { action: "parity_live", params: { date_offset: 1 } });
    } catch (_) {
      try {
        parity = await apiPost("/api/run", { action: "parity_fixture_ok", params: { date_offset: 1 } });
        append("   Live parity not ready yet — showed fixture parity so the flow continues.");
      } catch (e2) {
        parity = { status: "error", stderr: String(e2?.message || e2) };
      }
    }
    if (parity?.status === "ok") {
      const r = parity.result || {};
      append(
        r.all_within_target != null
          ? `   Parity OK (within target=${r.all_within_target})`
          : "   Parity finished"
      );
    } else {
      append(`   Parity: ${(parity?.stderr || "see Parity tab").slice(0, 200)}`);
    }

    append("4) DPDP verify");
    setDeployStatus("Verifying DPDP…", true);
    try {
      const dpdp = await apiPost("/api/run", { action: "verify_dpdp", params: {} });
      append(dpdp.status === "ok" ? "   DPDP OK" : `   DPDP: ${(dpdp.stderr || "").slice(0, 160)}`);
    } catch (e) {
      append(`   DPDP: ${String(e?.message || e).slice(0, 160)}`);
    }

    append("5) Connectors");
    setDeployStatus("Testing connectors…", true);
    try {
      const conn = await apiPost("/api/run", { action: "connectors_test", params: {} });
      append(conn.status === "ok" ? "   Connectors OK" : `   Connectors: ${(conn.stderr || "").slice(0, 160)}`);
    } catch (e) {
      append(`   Connectors: ${String(e?.message || e).slice(0, 160)}`);
    }

    append("");
    append("Done. Open Migration / Parity / DPDP / Connectors tabs for details.");
    setDeployStatus("Deploy + kit pipeline finished — check tabs 2–5 for details.", true);
    focusMatomoDeployOutput();
    const root = document.getElementById("deploy-log-root");
    if (root) root.open = true;
  } catch (e) {
    append(`Kit pipeline error: ${e?.message || e}`);
    setDeployStatus(
      "GCP Matomo is up, but kit steps need a Matomo API token / GA credentials — see log.",
      false
    );
    focusMatomoDeployOutput();
  }
}

function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function setGaCredentialsStatus(data) {
  const el = document.getElementById("ga-credentials-status");
  if (!el) return;
  if (data?.present) {
    el.textContent = `Key on file: ${data.client_email || "service account"} (${data.path})`;
    el.className = "ga-upload-status hint ok";
  } else if (data?.error) {
    el.textContent = data.error;
    el.className = "ga-upload-status hint err";
  } else {
    el.textContent = "No key uploaded yet — add your JSON before migration/parity.";
    el.className = "ga-upload-status hint";
  }
}

async function loadGaCredentialsStatus() {
  try {
    const data = await apiGet("/api/deploy/ga-credentials");
    setGaCredentialsStatus(data);
    return data;
  } catch (e) {
    setGaCredentialsStatus({ present: false, error: String(e?.message || e) });
    return { present: false };
  }
}

async function uploadGaCredentialsFile(file) {
  if (!file) return;
  if (file.size > 512 * 1024) {
    setGaCredentialsStatus({ present: false, error: "File too large (max 512 KB)." });
    return;
  }
  const status = document.getElementById("ga-credentials-status");
  if (status) {
    status.textContent = "Uploading…";
    status.className = "ga-upload-status hint";
  }
  const text = await file.text();
  try {
    const data = await apiPost("/api/deploy/ga-credentials", { content: text });
    setGaCredentialsStatus({ present: true, client_email: data.client_email, path: data.path });
    setDeployStatus(data.message || "Service account key saved.", true);
  } catch (e) {
    setGaCredentialsStatus({ present: false, error: e?.message || String(e) });
    setDeployStatus(e?.message || "Upload failed", false);
  }
}

async function confirmDeployWithoutGaKey() {
  const st = await loadGaCredentialsStatus();
  if (st.present) return true;
  return confirm(
    "No GA/GTM service account JSON uploaded yet.\n\n" +
      "Migration and parity need a key whose service account is Administrator on your GA4 property and GTM container.\n\n" +
      "Deploy Matomo on GCP anyway? (You can upload the key later.)"
  );
}

async function downloadPowershellDeployLauncher() {
  if (!(await confirmDeployWithoutGaKey())) return null;
  const fields = deployFields();
  if (!(fields.gcp_project_id || "").trim()) {
    setDeployStatus("Enter GCP project ID in the form below (required for your Matomo VM).", false);
    document.getElementById("deploy-form")?.elements?.gcp_project_id?.focus();
    return null;
  }
  if (!(fields.client_name || "").trim()) {
    setDeployStatus("Enter Client name (used for VM name and Terraform).", false);
    return null;
  }
  const data = await apiPost("/api/deploy/powershell-launcher", { fields });
  if (!data.ok) throw new Error(data.error || "Could not build PowerShell launcher");
  downloadTextFile(data.filename || "OYDK-Deploy.cmd", data.script, data.content_type);
  const detail = [
    data.message || "Downloaded OYDK-Deploy.cmd",
    "",
    "What happens on the user's Windows PC (one deploy file):",
    "1. Double-click OYDK-Deploy.cmd",
    "2. First run: downloads full OYDK kit to %USERPROFILE%\\Projects\\own-your-data-kit (needs Git or winget)",
    "3. Installs gcloud/Terraform if needed, Google sign-in, GCP Matomo deploy (~15–25 min)",
    "4. If something fails, read %USERPROFILE%\\oydk-deploy-launcher.log",
    data.saved_config ? `Saved profile: ${data.saved_config}` : "",
    data.ga_credentials_bundled
      ? "GA key is included in the launcher (credentials/ga-service-account.json on your PC)."
      : "Upload the GA JSON on Deploy before download to bundle it into the launcher.",
  ]
    .filter(Boolean)
    .join("\n");
  showDeployLog(detail, { summary: data.message });
  setDeployStatus(data.message, true);
  focusMatomoDeployOutput();
  return data;
}

async function deployMatomoOnMyGcp() {
  if (!(await confirmDeployWithoutGaKey())) return;
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
  // Hosted browser cannot spawn PowerShell on the user's PC — download a launcher instead.
  if (dep.host === "cloud_run") {
    try {
      await downloadPowershellDeployLauncher();
    } catch (e) {
      setDeployStatus(String(e?.message || e), false);
    }
    return;
  }

  if (
    !confirm(
      "One-command deploy for your data?\n\n" +
        `GCP: ${fields.gcp_project_id}\nClient: ${fields.client_name}\n\n` +
        "1) Host Matomo + kit on your GCP\n" +
        "2) Migrate GA4/GTM → Matomo\n" +
        "3) Parity check\n" +
        "4) DPDP verify\n" +
        "5) Connectors\n\n" +
        "PowerShell runs step 1 (~15–25 min). This console continues 2–5 when Matomo is up."
    )
  ) {
    return;
  }

  setMatomoSourceMode("own");
  focusMatomoDeployOutput();
  const out = document.getElementById("matomo-provision-result");
  if (out) {
    out.textContent = "Saving your profile, then launching one-command deploy…";
  }
  try {
    await apiPost("/api/deploy/save-config", { fields });
    await apiPost("/api/session/custom", { fields });
    setModeUI("custom", false);
  } catch (_) {
    /* deploy can still run; profile activation is best-effort */
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
  setDeployLog(text);
  setDeployStatus(data.message || data.error || "Deploy", !!data.started);
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
    matomoLoginUrl(document.getElementById("deploy-matomo-url")?.value) ||
    matomoLoginUrl(document.getElementById("deploy-form")?.elements?.matomo_url?.value);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function loadMatomoProvisionStatus() {
  try {
    const data = await apiGet("/api/matomo/provision/status");
    matomoProvisionMeta = data;
    // Do not pre-fill Matomo URL on Deploy — only set after the user's GCP deploy completes.
    setMatomoSourceMode("own");
  } catch (_) {
    setMatomoSourceMode("own");
  }
}

function setDeployStatus(msg, ok) {
  const el = document.getElementById("deploy-status");
  const root = document.getElementById("deploy-log-root");
  const empty = document.getElementById("deploy-empty");
  if (!el) return;
  el.textContent = msg || "";
  el.className = "deploy-status-line " + (ok ? "ok" : ok === false ? "err" : "");
  if (root) {
    root.classList.remove("hidden");
    root.classList.toggle("is-ok", ok === true);
    root.classList.toggle("is-err", ok === false);
    root.open = false;
  }
  if (empty && msg) empty.classList.add("hidden");
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
  const matomoUrlEl = document.getElementById("deploy-matomo-url");
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

const DEPLOY_FORM_SKIP_PREFILL = new Set(["matomo_url", "site_id"]);

function fillDeployForm(fields) {
  if (!fields) return;
  const form = document.getElementById("deploy-form");
  Object.entries(fields).forEach(([k, v]) => {
    if (DEPLOY_FORM_SKIP_PREFILL.has(k)) return;
    const el = form.elements.namedItem(k);
    if (el && v != null && v !== "") el.value = v;
  });
}

async function loadSession() {
  sessionCache = await apiGet("/api/session/status");
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

function suiteStepSummary(s) {
  const r = s.result || {};
  if (r.parts?.length) {
    const fail = r.parts.filter((p) => p.status !== "PASS").length;
    return fail ? `${fail} part(s) failed` : `${r.parts.length} parts OK`;
  }
  if (r.dimensions || r.goals) {
    return `${(r.dimensions || []).length} dims · ${(r.goals || []).length} goals`;
  }
  if (r.gaps?.length) {
    const miss = r.gaps.filter((g) => !g.within_target).length;
    return miss ? `${miss} metric(s) over threshold` : `all within ±${r.target_gap_percent ?? 5}%`;
  }
  if (r.consent) {
    return `consent ${r.consent.granted ?? 0}/${r.consent.denied ?? 0}`;
  }
  if (r.message) return String(r.message);
  if (r.pass === true) return "passed";
  if (r.pass === false) return "failed";
  if (s.stderr) return s.stderr.trim().split("\n")[0].slice(0, 100);
  return s.status === "ok" ? "done" : "error";
}

function suiteStepDetailHtml(s) {
  const r = s.result || {};
  const blocks = [];
  if (r.parts?.length) {
    blocks.push(
      renderTableHtml(
        ["part", "requirement", "status", "location"],
        r.parts.map((p) => ({
          part: p.part,
          requirement: p.requirement,
          status: p.status,
          location: p.location,
        }))
      )
    );
  }
  if (r.dimensions?.length) {
    blocks.push("<h4>Dimensions</h4>");
    blocks.push(
      renderTableHtml(
        ["name", "scope"],
        r.dimensions.map((d) => ({
          name: d.name || d.dimension || String(d),
          scope: d.scope || d.type || "",
        }))
      )
    );
  }
  if (r.goals?.length) {
    blocks.push("<h4>Goals</h4>");
    blocks.push(
      renderTableHtml(
        ["name", "id"],
        r.goals.map((g) => ({
          name: g.name || String(g),
          id: g.id ?? g.goal_id ?? "",
        }))
      )
    );
  }
  if (r.gaps?.length) {
    blocks.push("<h4>Parity gaps</h4>");
    blocks.push(
      renderTableHtml(
        ["date", "metric", "ga4", "matomo", "gap_percent", "status"],
        r.gaps.map((g) => ({
          date: g.date || r.date || "",
          metric: g.metric,
          ga4: g.ga4,
          matomo: g.matomo,
          gap_percent: `${g.gap_percent}%`,
          status: g.within_target ? "OK" : "MISS",
        }))
      )
    );
  }
  if (r.rights_requests?.length) {
    blocks.push("<h4>Shop rights requests</h4>");
    blocks.push(
      renderTableHtml(
        ["ticketId", "requestType", "status", "currentStage"],
        r.rights_requests
      )
    );
  }
  if (r.audit_requests?.length) {
    blocks.push("<h4>Erasure / DSAR audit</h4>");
    blocks.push(
      renderTableHtml(
        ["timestamp", "action", "resource", "visits_deleted"],
        r.audit_requests.slice(0, 8).map((a) => ({
          timestamp: a.timestamp,
          action: a.action,
          resource: a.resource,
          visits_deleted: a.visits_deleted ?? "",
        }))
      )
    );
  }
  if (r.consent && !r.parts) {
    blocks.push(
      `<p class="hint">Consent granted ${r.consent.granted ?? 0} · denied ${r.consent.denied ?? 0}</p>`
    );
  }
  if (s.stderr?.trim() && s.status !== "ok") {
    blocks.push(`<p class="hint suite-err">${esc(s.stderr.trim().slice(0, 400))}</p>`);
  }
  if (!blocks.length) {
    blocks.push(`<p class="hint">${esc(suiteStepSummary(s))}</p>`);
  }
  return blocks.join("");
}

function renderSuiteReport(data) {
  const root = document.getElementById("suite-report");
  if (!root) return;
  const steps = data.steps || [];
  if (!steps.length) {
    root.innerHTML = `<p class="hint">No suite steps returned.</p>`;
    return;
  }
  const summaryRows = steps.map((s, i) => ({
    step: String(i + 1),
    check: s.label || s.action,
    status: s.status === "ok" ? "PASS" : "FAIL",
    summary: suiteStepSummary(s),
  }));
  const details = steps
    .map(
      (s, i) => `
      <details class="suite-step">
        <summary>
          <span class="suite-step-num">${i + 1}</span>
          <span class="suite-step-label">${esc(s.label || s.action)}</span>
          <span class="tag ${s.status === "ok" ? "fixture" : "live"}">${s.status === "ok" ? "PASS" : "FAIL"}</span>
        </summary>
        <div class="suite-step-body">${suiteStepDetailHtml(s)}</div>
      </details>`
    )
    .join("");
  root.innerHTML = `
    <div class="consent-cards migration-summary-cards">
      <div class="stat-card"><span>Steps</span><strong>${steps.length}</strong><small>in this run</small></div>
      <div class="stat-card"><span>Passed</span><strong>${steps.filter((s) => s.status === "ok").length}</strong><small>OK</small></div>
      <div class="stat-card"><span>Failed</span><strong>${steps.filter((s) => s.status !== "ok").length}</strong><small>needs review</small></div>
      <div class="stat-card"><span>Overall</span><strong>${data.status === "ok" ? "OK" : "Partial"}</strong><small>${esc(data.config || "")}</small></div>
    </div>
    <h4>Step overview</h4>
    ${renderTableHtml(["step", "check", "status", "summary"], summaryRows)}
    <h4>Step details</h4>
    <div class="suite-steps">${details}</div>`;
}

function suiteReportPlainText(data) {
  return (data.steps || [])
    .map((s, i) => `${i + 1}. ${s.status === "ok" ? "PASS" : "FAIL"} ${s.label} — ${suiteStepSummary(s)}`)
    .join("\n");
}

async function runDemoSuite(fixtureOnly) {
  if (busy) return;
  busy = true;
  const report = document.getElementById("suite-report");
  if (report) {
    report.innerHTML = `<p class="hint">${fixtureOnly ? "Running fixture-only suite…" : "Running default connection suite…"}</p>`;
  }
  setPanelOutput("demo", fixtureOnly ? "Running fixture-only suite…" : "Running default connection suite…", false);
  const buckets = { demo: [], migration: [], dpdp: [], parity: [], connectors: [], bq: [] };
  try {
    const data = await apiPost("/api/demo/run-suite", { fixture_only: fixtureOnly });
    (data.steps || []).forEach((s) => {
      const panel = ACTION_PANEL[s.action] || "demo";
      if (!buckets[panel]) buckets[panel] = [];
      buckets[panel].push(`${s.status === "ok" ? "PASS" : "FAIL"} ${s.label} — ${suiteStepSummary(s)}`);
    });
    Object.entries(buckets).forEach(([panel, lines]) => {
      if (lines.length) setPanelOutput(panel, lines.join("\n"), data.status === "partial");
    });
    renderSuiteReport(data);
    setPanelOutput("demo", suiteReportPlainText(data), data.status === "partial");
    loadParityDashboard();
    loadMigrationDashboard();
    loadDpdpDashboard();
  } catch (e) {
    if (report) report.innerHTML = `<p class="hint suite-err">${esc(String(e))}</p>`;
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
  document.getElementById("btn-run-default-suite")?.addEventListener("click", () => runDemoSuite(false));
  document.getElementById("btn-gcloud-login")?.addEventListener("click", async () => {
    const data = await apiPost("/api/gcloud/login", { gcp_project_id: gcloudProjectId() });
    const msg = data.message || data.error || "Google Cloud sign-in";
    const failed = !data.started;
    setPanelOutput("demo", msg, failed);
    const report = document.getElementById("suite-report");
    if (report) {
      report.innerHTML = `<p class="hint${failed ? " suite-err" : ""}">${esc(msg)}</p>`;
    }
  });
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
    } else if (action === "connectors_test") {
      setPanelOutput(panel, formatActionOutput(data), data.status === "error");
      await loadConnectors();
      const cards = document.getElementById("connectors-summary-cards");
      if (cards && data.status !== "error") {
        const note = document.createElement("p");
        note.className = "hint";
        note.id = "connectors-test-note";
        note.textContent = "Connector test finished — open a card for live detail.";
        document.getElementById("connectors-test-note")?.remove();
        cards.after(note);
      }
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

function defaultParityDateRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function parityDateParams() {
  const startEl = document.getElementById("parity-start");
  const endEl = document.getElementById("parity-end");
  const start = startEl?.value || "";
  const end = endEl?.value || start;
  if (!start && !end) return {};
  return { start_date: start || end, end_date: end || start, date: end || start };
}

function renderParityCheckResult(report) {
  const empty = document.getElementById("parity-empty");
  const root = document.getElementById("parity-report-root");
  const table = document.getElementById("parity-metrics-table");
  const cards = document.getElementById("parity-summary-cards");
  const gaps = report?.gaps || [];
  const targetGap = report?.target_gap_percent ?? 5;
  const thr = document.getElementById("parity-threshold");
  if (thr) thr.textContent = String(targetGap);

  if (!gaps.length) {
    if (empty) empty.classList.remove("hidden");
    if (root) root.classList.add("hidden");
    if (cards) cards.innerHTML = "";
    renderParityDiagnosis(null, targetGap);
    return;
  }
  if (empty) empty.classList.add("hidden");
  if (root) root.classList.remove("hidden");

  const okCount = gaps.filter((g) => g.within_target).length;
  const missCount = gaps.length - okCount;
  const days = report?.days_checked || (report?.start_date && report?.end_date ? "range" : 1);
  if (cards) {
    cards.innerHTML = `
      <div class="stat-card"><span>Within target</span><strong>${okCount}</strong><small>OK metrics</small></div>
      <div class="stat-card"><span>Over threshold</span><strong>${missCount}</strong><small>±${targetGap}%</small></div>
      <div class="stat-card"><span>Days checked</span><strong>${days}</strong><small>${esc(report.start_date || report.date || "—")} → ${esc(report.end_date || report.date || "—")}</small></div>
      <div class="stat-card"><span>Status</span><strong>${missCount ? "Review" : "OK"}</strong><small>${missCount ? "see below" : "all within target"}</small></div>`;
  }

  if (!table) return;
  const hasDate = gaps.some((g) => g.date);
  const headers = hasDate
    ? ["date", "metric", "ga4", "matomo", "gap_percent", "status"]
    : ["metric", "ga4", "matomo", "gap_percent", "status"];
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = gaps
    .map((g) => {
      const statusClass = g.within_target ? "parity-status-ok" : "parity-status-miss";
      const cells = {
        date: g.date || "",
        metric: g.metric,
        ga4: g.ga4,
        matomo: g.matomo,
        gap_percent: `${g.gap_percent}%`,
        status: `<span class="${statusClass}">${g.within_target ? "OK" : "MISS"}</span>`,
      };
      return `<tr>${headers.map((h) => `<td>${h === "status" ? cells[h] : esc(cells[h])}</td>`).join("")}</tr>`;
    })
    .join("");
  table.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  renderParityDiagnosis(report, targetGap);
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
  const clientNameEl = document.getElementById("client-name");
  if (clientNameEl) clientNameEl.textContent = linksCache.client || "demo";
  document.getElementById("migration-config").textContent = linksCache.config_path;
  document.getElementById("parity-threshold").textContent = linksCache.parity_threshold ?? 5;
  const pill = document.getElementById("kit-pill");
  pill.textContent = linksCache.kit_api_ok ? "Kit API online" : "Kit API offline";
  pill.className = "kit-pill " + (linksCache.kit_api_ok ? "ok" : "bad");
  const erasure = document.getElementById("link-erasure");
  if (linksCache.erasure_demo) erasure.href = linksCache.erasure_demo;
  const judgeBanner = document.getElementById("judge-browser-banner");
  if (judgeBanner) judgeBanner.classList.add("hidden");
  const banner = document.getElementById("deploy-cloud-banner");
  if (banner) banner.classList.add("hidden");
  const btnGcp = document.getElementById("btn-deploy-start");
  const btnGcloudLogin = document.getElementById("btn-gcloud-login");
  if (btnGcp) {
    btnGcp.classList.remove("hidden");
    btnGcp.textContent = "Deploy";
  }
  if (btnGcloudLogin) btnGcloudLogin.classList.remove("hidden");
  [
    "btn-matomo-gcp-deploy",
    "btn-open-powershell-deploy",
    "btn-deploy-activate",
    "btn-open-matomo-own",
    "btn-deploy-local",
    "btn-go-demo-gcloud",
    "btn-deploy-preview",
    "btn-deploy-save",
  ].forEach((id) => document.getElementById(id)?.classList.add("hidden"));
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
  const dep = linksCache.deploy || {};
  // Hosted console cannot spawn PowerShell — download .cmd that runs the same steps on the user's PC.
  if (!localOnly && dep.host === "cloud_run") {
    try {
      await downloadPowershellDeployLauncher();
    } catch (e) {
      setDeployStatus(String(e?.message || e), false);
    }
    return;
  }
  // Local console: full one-command path in a visible PowerShell window (install tools → auth → deploy).
  if (!localOnly) {
    await deployMatomoOnMyGcp();
    return;
  }
  const msg = "Start local Docker Matomo + kit stack on this PC?";
  if (!confirm(msg)) return;
  let data;
  try {
    data = await apiPost("/api/deploy/start", {
      fields: deployFields(),
      local_only: true,
    });
  } catch (e) {
    const err = e?.message || String(e);
    setDeployStatus(err, false);
    renderDeployLogPanel({ last_error: err }, "Local Docker could not start");
    focusMatomoDeployOutput();
    return;
  }
  const text = formatDeployStartResponse(data);
  setDeployLog(text);
  const ok = !!data.started;
  setDeployStatus(data.message || data.error || (ok ? "Local Docker started" : "Did not start"), ok);
  focusMatomoDeployOutput();
  if (ok) startMatomoDeployPoll();
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
  const diagSection = document.getElementById("parity-diagnosis-section");
  const diagTable = document.getElementById("parity-diagnosis-table");
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

async function loadParityDashboard() {
  const startEl = document.getElementById("parity-start");
  const endEl = document.getElementById("parity-end");
  if (startEl && endEl && !startEl.value && !endEl.value) {
    const { start, end } = defaultParityDateRange();
    startEl.value = start;
    endEl.value = end;
  }
  let data;
  try {
    data = await apiGet("/api/dashboard/parity");
  } catch (e) {
    const empty = document.getElementById("parity-empty");
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = String(e);
    }
    return;
  }
  if (data.error) {
    const empty = document.getElementById("parity-empty");
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = `Parity error: ${data.error}`;
    }
    return;
  }
  const targetGap = data.target_gap_percent ?? 5;
  const thr = document.getElementById("parity-threshold");
  if (thr) thr.textContent = String(targetGap);
  const live = data.live_report;
  if (live?.gaps?.length) {
    renderParityCheckResult({ ...live, target_gap_percent: targetGap });
  } else {
    const empty = document.getElementById("parity-empty");
    if (empty) empty.classList.remove("hidden");
    renderParityDiagnosis(null, targetGap);
  }
}

async function runParityCheck() {
  const params = parityDateParams();
  if (!params.start_date && !params.date) {
    const empty = document.getElementById("parity-empty");
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = "Choose start and end dates first.";
    }
    return;
  }
  if (busy) return;
  busy = true;
  const btn = document.getElementById("btn-parity-run");
  if (btn) btn.disabled = true;
  const empty = document.getElementById("parity-empty");
  if (empty) {
    empty.classList.remove("hidden");
    empty.textContent = "Running parity check…";
  }
  try {
    const data = await apiPost("/api/run", { action: "parity_live", params });
    const report = data.result || data;
    if (data.status === "error") {
      if (empty) empty.textContent = data.stderr || data.error || "Parity check failed";
      return;
    }
    renderParityCheckResult(report);
  } catch (e) {
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = String(e);
    }
  } finally {
    busy = false;
    if (btn) btn.disabled = false;
  }
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
  if (ws) {
    ws.disabled = !on("gtm_workspace");
    ws.classList.toggle("hidden", !on("gtm_workspace"));
  }
}

function renderMigrationReportSections(data) {
  const root = document.getElementById("migration-report-root");
  const empty = document.getElementById("migration-report-empty");
  const cards = document.getElementById("migration-summary-cards");
  if (!root) return;
  const rep = data.report;
  const dims = data.dimensions || [];
  const goals = data.goals || [];
  const unmigrated = data.unmigrated || [];
  const mtm = data.mtm_summary;
  const gsc = data.gtm_suggested_summary;

  if (!rep) {
    if (empty) empty.classList.remove("hidden");
    root.classList.add("hidden");
    if (cards) cards.innerHTML = "";
    setMigrationBundleButtons(data);
    return;
  }
  if (empty) empty.classList.add("hidden");
  root.classList.remove("hidden");

  if (cards) {
    cards.innerHTML = `
      <div class="stat-card"><span>Dimensions</span><strong>${dims.length}</strong><small>in Matomo</small></div>
      <div class="stat-card"><span>Goals</span><strong>${goals.length}</strong><small>in Matomo</small></div>
      <div class="stat-card"><span>Needs review</span><strong>${unmigrated.length}</strong><small>manual follow-up</small></div>
      <div class="stat-card"><span>Drafts</span><strong>${(mtm ? 1 : 0) + (gsc ? 1 : 0)}</strong><small>ready to download</small></div>`;
  }

  const doneRows = [
    ...dims.map((d) => ({ type: "Dimension", name: d.name, from: d.ga4_source || "—" })),
    ...goals.map((g) => ({ type: "Goal", name: g.name, from: g.ga4_source || "—" })),
  ];
  const doneTable = document.getElementById("migration-done-table");
  if (doneTable) {
    if (doneRows.length) renderTable(doneTable, ["type", "name", "from"], doneRows);
    else doneTable.innerHTML = `<p class="hint">Nothing migrated in this run.</p>`;
  }

  const reviewTable = document.getElementById("migration-review-table");
  if (reviewTable) {
    if (unmigrated.length) {
      renderTable(
        reviewTable,
        ["item", "reason"],
        unmigrated.map((u) => ({ item: u.item, reason: u.reason }))
      );
    } else {
      reviewTable.innerHTML = `<p class="hint">All clear — nothing blocked.</p>`;
    }
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
      detail: (r.matomo_equivalent && r.matomo_equivalent.tag) || "Matomo equivalent",
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
}

let activeConnectorId = null;

function renderConnectorDetail(view) {
  const el = document.getElementById("connector-detail");
  const empty = document.getElementById("connectors-empty");
  if (!el) return;
  if (!view || view.error) {
    el.innerHTML = "";
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = view?.error || "Click a connector for live config and sample data.";
    }
    return;
  }
  if (empty) empty.classList.add("hidden");
  const lines = (view.preview_lines || []).map((l) => `<li>${esc(l)}</li>`).join("");
  let sample = "";
  if ((view.sample_rows || []).length) {
    sample =
      "<h3>Latest rows</h3>" +
      renderTableHtml(
        ["event_timestamp", "event_name", "event_category", "page_url"],
        view.sample_rows
      );
  }
  const live = view.live_check;
  const liveMsg = live?.message || "";
  const liveBit =
    live && live.status !== "not_run"
      ? `<p class="hint"><strong>Live check:</strong> ${esc(live.status)}${liveMsg ? " — " + esc(liveMsg) : ""}</p>`
      : "";
  el.innerHTML = `
    <h3>${esc(view.title)}</h3>
    <p class="hint">${esc(view.summary || "")}</p>
    ${lines ? `<ul class="prereq-list">${lines}</ul>` : ""}
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
  const list = data.connectors || [];
  const ready = list.filter((c) => c.ready && c.id !== "meta").length;
  const needs = list.filter((c) => !c.ready || c.id === "meta").length;
  const cards = document.getElementById("connectors-summary-cards");
  if (cards) {
    cards.innerHTML = `
      <div class="stat-card"><span>Ready</span><strong>${ready}</strong><small>Configured for this client</small></div>
      <div class="stat-card"><span>Needs setup</span><strong>${needs}</strong><small>Missing credentials or YAML</small></div>
      <div class="stat-card"><span>Total</span><strong>${list.length}</strong><small>Ads · Meta · BigQuery · Looker</small></div>`;
  }
  const grid = document.getElementById("connector-grid");
  grid.innerHTML = list
    .map((c) => {
      const isMeta = c.id === "meta";
      const tag = isMeta
        ? "Not configured"
        : `${c.ready ? "Configured" : "Needs config"}${c.demo ? " · demo" : " · live"}`;
      return `
    <article class="connector-card ${c.ready ? "ready" : ""} ${isMeta ? "disabled" : ""}" data-connector-id="${esc(c.id)}" role="button" tabindex="0">
      <h4>${esc(c.name)}</h4>
      <span class="tag">${tag}</span>
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
  document.querySelectorAll(".nav-btn[data-panel]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      activatePanel(btn.getAttribute("data-panel"));
      const target = btn.dataset.scroll;
      if (target) {
        document.querySelectorAll(".nav-btn").forEach((b) => { b.classList.remove("active"); b.removeAttribute("aria-current"); });
        btn.classList.add("active");
        btn.setAttribute("aria-current", "page");
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
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
  document.getElementById("ga-credentials-upload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) uploadGaCredentialsFile(file);
  });
  document.getElementById("btn-matomo-gcp-deploy")?.addEventListener("click", (e) => {
    e.preventDefault();
    deployMatomoOnMyGcp();
  });
  document.getElementById("btn-open-powershell-deploy")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const dep = linksCache.deploy || {};
    if (dep.host === "cloud_run") {
      try {
        await downloadPowershellDeployLauncher();
      } catch (err) {
        setDeployStatus(String(err?.message || err), false);
      }
      return;
    }
    deployMatomoOnMyGcp();
  });
  document.getElementById("btn-open-matomo-own")?.addEventListener("click", (e) => {
    e.preventDefault();
    openMatomoLogin();
  });
  document.getElementById("btn-deploy-preview")?.addEventListener("click", async () => {
    const data = await apiPost("/api/deploy/preview", { fields: deployFields() });
    setDeployLog(
      "Interactive (recommended on laptop):\n" +
        (data.interactive_command || ".\\deploy\\enterprise-deploy.ps1") +
        "\n\nNon-interactive / console:\n" +
        data.command +
        (data.dry_run_command ? "\n\nDry-run:\n" + data.dry_run_command : "") +
        "\n\nChecklist:\n- " +
        (data.checklist || []).join("\n- ") +
        "\n\n--- YAML ---\n" +
        (data.yaml_preview || "")
    );
    setDeployStatus("Preview ready — see Step 1 log. Nothing is saved until you click Save.", true);
    focusMatomoDeployOutput();
  });
  document.getElementById("btn-deploy-save")?.addEventListener("click", async () => {
    const data = await apiPost("/api/deploy/save-config", { fields: deployFields() });
    setDeployStatus(`Saved client YAML to ${data.path}. Next: Save & activate, or Deploy to GCP.`, true);
    setDeployLog(`✓ Written: ${data.path}\n\n` + (document.getElementById("matomo-provision-result")?.textContent || ""));
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
    setDeployLog(`Profile active:\n${data.config_path}\n\nParity alerts: ${deployFields().alert_emails}`);
  });
  document.getElementById("btn-deploy-start")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleDeployStart(false);
  });
  document.getElementById("btn-deploy-local")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleDeployStart(true);
  });
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
  document.getElementById("btn-parity-run")?.addEventListener("click", runParityCheck);
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
