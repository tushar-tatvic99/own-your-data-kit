const fs = require('fs');
const path = require('path');

console.log('Simplifying DPDP Data Erasure Section across all directories...');

const simplifiedDpdpHtml = `      <!-- =========================================================================
           DPDP ACT 2023 • PETITION FOR DATA ERASURE
           ========================================================================= -->
      <section class="bfsi-simple-card" id="dpdp-erasure">
        <div class="card-top-header">
          <h2 class="card-heading">DPDP Act 2023 • Petition for Data Erasure</h2>
        </div>

        <form class="bfsi-form-clean" id="dpdpRequestForm">
          <div class="dpdp-categories-list" style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #334155; margin-bottom: 8px;">
              Select data categories to purge from our systems:
            </label>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem; color: #475569;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" name="dpdpCategory" value="analytics_telemetry" checked>
                <span>Browsing telemetry, device identifiers &amp; pageview analytics</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" name="dpdpCategory" value="lead_forms" checked>
                <span>Banking inquiry drafts &amp; loan / savings applications</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" name="dpdpCategory" value="cookies_marketing" checked>
                <span>Marketing cookies, consent records &amp; session tokens</span>
              </label>
            </div>
          </div>

          <div class="form-actions-row">
            <button type="submit" class="btn btn-primary" id="btnSubmitErasure">
              Submit Data Erasure Petition
            </button>
          </div>
        </form>

        <div class="form-success-box" id="dpdpReceiptBox" style="display: none;">
          <div class="success-icon">✓</div>
          <h3>Data Erasure Petition Logged &amp; Purged</h3>
          <p>Ticket Reference: <strong id="dpdpTicketCode">DPDP-2026-XXXXX</strong></p>
          <p style="font-size: 0.78rem; color: #64748b;" id="dpdpTimestamp"></p>
          <div id="receiptStatusBadge" style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 10px;"></div>
          <div>
            <button type="button" class="btn btn-outline btn-xs" id="btnSubmitAnotherDpdp">Submit Another Request</button>
          </div>
        </div>
      </section>`;

const targetDirs = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targetDirs.forEach(dir => {
  ['index.html', 'ecommerce.html', 'bfsi.html'].forEach(filename => {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Match from DPDP header comment or section id="dpdp-erasure" to </section>
      const sectionRegex = /(?:<!-- =*\s*DPDP ACT 2023[\s\S]*?)?<section class="[^"]*" id="dpdp-erasure">[\s\S]*?<\/section>/;
      if (sectionRegex.test(content)) {
        content = content.replace(sectionRegex, () => simplifiedDpdpHtml);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
      } else {
        console.warn('Pattern not found in ' + filePath);
      }
    }
  });
});

// Update app.js
targetDirs.forEach(dir => {
  const appPath = path.join(dir, 'app.js');
  if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');

    // Replace the form fields reading
    const targetBlock = `      const name = document.getElementById('dpdpName').value.trim();
      const email = document.getElementById('dpdpEmail').value.trim();
      const scope = document.getElementById('dpdpScope').value;
      const orderNum = document.getElementById('dpdpOrderNum').value.trim();`;

    const replacementBlock = `      const name = document.getElementById('dpdpName')?.value?.trim() || 'Active Device User';
      const email = document.getElementById('dpdpEmail')?.value?.trim() || (localStorage.getItem('user_email') || 'user@current-session');
      const selectedCategories = Array.from(document.querySelectorAll('input[name="dpdpCategory"]:checked')).map(cb => cb.value);
      const scope = selectedCategories.length ? selectedCategories.join(',') : 'all_data';
      const orderNum = document.getElementById('dpdpOrderNum')?.value?.trim() || '';`;

    if (appContent.includes(targetBlock)) {
      appContent = appContent.replace(targetBlock, () => replacementBlock);
    } else {
      console.warn('Target block not found in ' + appPath + ', checking regex...');
      const regexBlock = /const name = document\.getElementById\('dpdpName'\)[\s\S]*?const orderNum = document\.getElementById\('dpdpOrderNum'\)\.value\.trim\(\);/;
      if (regexBlock.test(appContent)) {
        appContent = appContent.replace(regexBlock, () => replacementBlock);
      }
    }

    // Ensure dpdp_data_erasure_submitted is pushed to dataLayer alongside dpdp_erasure_request
    const oldPush = `window.dataLayer.push({
          event: 'dpdp_erasure_request',`;
    const newPush = `window.dataLayer.push({
          event: 'dpdp_data_erasure_submitted',
          dpdp_ticket: refId,
          dpdp_scope: scope,
          dpdp_status: hasActiveOrder ? 'partially_approved' : 'approved',
          dpdp_has_order: hasActiveOrder
        });
        window.dataLayer.push({
          event: 'dpdp_erasure_request',`;

    if (appContent.includes(oldPush) && !appContent.includes("event: 'dpdp_data_erasure_submitted'")) {
      appContent = appContent.replace(oldPush, () => newPush);
    }

    fs.writeFileSync(appPath, appContent, 'utf8');
    console.log('Updated app.js in ' + appPath);
  }
});

console.log('All files updated successfully.');
