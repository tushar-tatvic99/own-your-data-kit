const fs = require('fs');
const path = require('path');

console.log('Ensuring DPDP Data Erasure Section is intact across all pages...');

const dpdpSectionHtml = `
      <!-- =========================================================================
           DPDP ACT 2023 • DATA ERASURE & RIGHTS CENTER
           ========================================================================= -->
      <section class="bfsi-simple-card" id="dpdp-erasure">
        <div class="card-top-header">
          <h2 class="card-heading">DPDP Act 2023 • Petition for Data Erasure</h2>
        </div>

        <form class="bfsi-form-clean" id="dpdpRequestForm">
          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="dpdpName">Full Legal Name *</label>
              <input type="text" id="dpdpName" class="form-input" required placeholder="e.g. Rahul Sharma" autocomplete="name">
            </div>
            <div class="form-field-group">
              <label for="dpdpEmail">Registered Email Address *</label>
              <input type="email" id="dpdpEmail" class="form-input" required placeholder="e.g. rahul@example.com" autocomplete="email">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="dpdpScope">Request Scope *</label>
              <select id="dpdpScope" class="form-input" required>
                <option value="full_erasure" selected>Complete Account &amp; Analytics Erasure</option>
                <option value="tracking_only">Analytics &amp; Marketing Tracking Erasure Only</option>
                <option value="revoke_consent">Revoke All Processing Consent</option>
              </select>
            </div>
            <div class="form-field-group">
              <label for="dpdpOrderNum">Order / Account Number (Optional)</label>
              <input type="text" id="dpdpOrderNum" class="form-input" placeholder="e.g. INF-84920">
            </div>
          </div>

          <div class="form-actions-row">
            <button type="submit" class="btn btn-primary" id="btnSubmitErasure">
              Submit Data Erasure Petition
            </button>
          </div>
        </form>

        <div class="form-success-box" id="dpdpReceiptBox" style="display: none;">
          <div class="success-icon">🔒</div>
          <h3>Data Erasure Petition Logged</h3>
          <p>Ticket Reference: <strong id="dpdpTicketCode">DPDP-2026-XXXXX</strong></p>
          <p style="font-size: 0.78rem; color: #64748b;" id="dpdpTimestamp"></p>
          <div id="receiptStatusBadge" style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 10px;"></div>
          <div>
            <button type="button" class="btn btn-outline btn-xs" id="btnSubmitAnotherDpdp">Submit Another Request</button>
          </div>
        </div>
      </section>
`;

const targetDirs = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targetDirs.forEach(dir => {
  const indexPath = path.join(dir, 'index.html');
  const ecomPath = path.join(dir, 'ecommerce.html');
  const bfsiPath = path.join(dir, 'bfsi.html');

  [indexPath, ecomPath, bfsiPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // If dpdpRequestForm not in file, inject before </main> or before footer
      if (!content.includes('id="dpdpRequestForm"')) {
        if (content.includes('</main>')) {
          content = content.replace('</main>', dpdpSectionHtml + '\n  </main>');
        } else if (content.includes('<footer')) {
          content = content.replace('<footer', dpdpSectionHtml + '\n  <footer');
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Injected DPDP Data Erasure section into ${filePath}`);
      } else {
        console.log(`DPDP Data Erasure already present in ${filePath}`);
      }
    }
  });
});

console.log('DPDP Data Erasure verification complete.');
