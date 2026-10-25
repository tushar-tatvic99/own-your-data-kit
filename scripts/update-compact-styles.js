const fs = require('fs');
const path = require('path');

// 1. UPDATE styles.css
function updateStyles(cssPath) {
  let css = fs.readFileSync(cssPath, 'utf8');

  const compactBfsiCss = `
/* ==========================================================================
   ULTRA-SLEEK COMPACT BFSI CALCULATOR & INTERACTIVE SUITE
   ========================================================================== */
body.page-bfsi .bfsi-section {
  padding: 24px 16px 40px !important;
}

body.page-bfsi .section-header {
  margin-bottom: 18px !important;
  text-align: center !important;
}

body.page-bfsi .section-pretitle {
  font-size: 0.68rem !important;
  letter-spacing: 0.12em !important;
}

body.page-bfsi .section-title {
  font-size: 1.5rem !important;
  margin-bottom: 4px !important;
}

body.page-bfsi .section-desc {
  font-size: 0.8rem !important;
  color: #64748B !important;
}

body.page-bfsi .bfsi-tabs-nav {
  max-width: 860px !important;
  margin: 0 auto 16px !important;
  display: flex !important;
  gap: 8px !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
}

body.page-bfsi .bfsi-tab {
  padding: 6px 14px !important;
  font-size: 0.78rem !important;
  border-radius: 8px !important;
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  color: #475569 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

body.page-bfsi .bfsi-tab:hover {
  border-color: #0F172A !important;
  color: #0F172A !important;
}

body.page-bfsi .bfsi-tab.active {
  background: #0F172A !important;
  border-color: #0F172A !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15) !important;
}

body.page-bfsi .bfsi-calculator-card {
  max-width: 860px !important;
  margin: 0 auto !important;
  display: grid !important;
  grid-template-columns: 1.25fr 1fr !important;
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 14px !important;
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06) !important;
  overflow: hidden !important;
}

@media (max-width: 820px) {
  body.page-bfsi .bfsi-calculator-card {
    grid-template-columns: 1fr !important;
  }
}

body.page-bfsi .calc-main-content {
  padding: 16px 20px !important;
  background: #FFFFFF !important;
}

body.page-bfsi .calc-badge-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin-bottom: 8px !important;
}

body.page-bfsi .calc-pill {
  font-size: 0.65rem !important;
  padding: 3px 8px !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em !important;
  background: #F1F5F9 !important;
  color: #475569 !important;
}

body.page-bfsi .calc-rate-badge {
  font-size: 0.7rem !important;
  padding: 3px 8px !important;
  border-radius: 4px !important;
  font-weight: 700 !important;
  background: #ECFDF5 !important;
  color: #059669 !important;
  border: 1px solid #A7F3D0 !important;
}

body.page-bfsi .calc-title {
  font-size: 1.12rem !important;
  font-weight: 700 !important;
  margin: 0 0 2px !important;
  color: #0F172A !important;
}

body.page-bfsi .calc-sub {
  font-size: 0.75rem !important;
  margin-bottom: 12px !important;
  color: #64748B !important;
}

body.page-bfsi .slider-group {
  margin-bottom: 12px !important;
}

body.page-bfsi .slider-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 4px !important;
}

body.page-bfsi .slider-label {
  font-size: 0.74rem !important;
  font-weight: 600 !important;
  color: #475569 !important;
  margin-bottom: 0 !important;
}

body.page-bfsi .slider-value {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
}

body.page-bfsi .bfsi-range-slider {
  width: 100% !important;
  height: 5px !important;
  margin: 6px 0 4px !important;
  accent-color: #0F172A !important;
  cursor: pointer !important;
}

body.page-bfsi .slider-scale {
  display: flex !important;
  justify-content: space-between !important;
  font-size: 0.65rem !important;
  color: #94A3B8 !important;
}

body.page-bfsi .tenure-group {
  margin-bottom: 12px !important;
}

body.page-bfsi .tenure-pills {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  margin-top: 4px !important;
}

body.page-bfsi .tenure-btn {
  padding: 5px 10px !important;
  font-size: 0.72rem !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  border: 1px solid #E2E8F0 !important;
  background: #FFFFFF !important;
  color: #334155 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

body.page-bfsi .tenure-btn:hover {
  border-color: #0F172A !important;
  color: #0F172A !important;
}

body.page-bfsi .tenure-btn.active {
  background: #0F172A !important;
  border-color: #0F172A !important;
  color: #FFFFFF !important;
}

body.page-bfsi .payout-group {
  margin-bottom: 4px !important;
}

body.page-bfsi .payout-options {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  margin-top: 4px !important;
}

body.page-bfsi .radio-chip {
  padding: 5px 10px !important;
  font-size: 0.72rem !important;
  font-weight: 500 !important;
  border-radius: 6px !important;
  border: 1px solid #E2E8F0 !important;
  background: #FFFFFF !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

body.page-bfsi .radio-chip.active {
  background: #F8FAFC !important;
  border-color: #0F172A !important;
  color: #0F172A !important;
}

/* RIGHT RESULTS COLUMN */
body.page-bfsi .calc-results-sidebar {
  padding: 16px 18px !important;
  background: #F8FAFC !important;
  border-left: 1px solid #E2E8F0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
}

body.page-bfsi .results-heading {
  font-size: 0.7rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  font-weight: 700 !important;
  margin: 0 0 10px !important;
}

body.page-bfsi .result-metric-card {
  padding: 10px 12px !important;
  border-radius: 8px !important;
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  margin-bottom: 8px !important;
}

body.page-bfsi .primary-metric {
  margin-bottom: 8px !important;
}

body.page-bfsi .metric-label {
  font-size: 0.65rem !important;
  color: #64748B !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  font-weight: 600 !important;
  display: block !important;
  margin-bottom: 2px !important;
}

body.page-bfsi .metric-number {
  font-size: 1.18rem !important;
  font-weight: 800 !important;
  color: #0F172A !important;
  line-height: 1.1 !important;
}

body.page-bfsi .primary-metric .metric-number {
  font-size: 1.35rem !important;
}

body.page-bfsi .metric-sub {
  font-size: 0.65rem !important;
  color: #94A3B8 !important;
  margin-top: 2px !important;
  display: block !important;
}

body.page-bfsi .metrics-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 8px !important;
  margin-bottom: 8px !important;
}

body.page-bfsi .metrics-grid .result-metric-card {
  margin-bottom: 0 !important;
}

body.page-bfsi .calc-guarantee-note {
  font-size: 0.68rem !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  background: #EFF6FF !important;
  border: 1px solid #DBEAFE !important;
  color: #1E40AF !important;
  margin-bottom: 10px !important;
}

body.page-bfsi #btnLockDeposit,
body.page-bfsi #btnCheckLoanOffer,
body.page-bfsi #btnApplyInsurance {
  height: 38px !important;
  padding: 0 16px !important;
  font-size: 0.78rem !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
}

/* CARDS TAB GRID */
body.page-bfsi .bfsi-cards-grid {
  max-width: 860px !important;
  margin: 0 auto !important;
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 14px !important;
}

@media (max-width: 768px) {
  body.page-bfsi .bfsi-cards-grid {
    grid-template-columns: 1fr !important;
  }
}

body.page-bfsi .bfsi-card-item {
  padding: 16px 16px !important;
  border-radius: 12px !important;
}

body.page-bfsi .card-item-title {
  font-size: 1.05rem !important;
  margin-bottom: 4px !important;
}

body.page-bfsi .card-item-desc {
  font-size: 0.74rem !important;
  margin-bottom: 10px !important;
}

body.page-bfsi .card-perks-list {
  font-size: 0.72rem !important;
  margin-bottom: 12px !important;
}

body.page-bfsi .card-perks-list li {
  margin-bottom: 4px !important;
}

/* INSURANCE TIERS GRID */
body.page-bfsi .insurance-tiers-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 10px !important;
  margin-top: 10px !important;
}

@media (max-width: 650px) {
  body.page-bfsi .insurance-tiers-grid {
    grid-template-columns: 1fr !important;
  }
}

body.page-bfsi .insurance-tier-box {
  padding: 10px 12px !important;
  border-radius: 8px !important;
  border: 1px solid #E2E8F0 !important;
  background: #FFFFFF !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

body.page-bfsi .insurance-tier-box:hover {
  border-color: #0F172A !important;
}

body.page-bfsi .insurance-tier-box.active {
  background: #F8FAFC !important;
  border-color: #0F172A !important;
  box-shadow: 0 0 0 1px #0F172A !important;
}

body.page-bfsi .ins-name {
  font-size: 0.76rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  display: block !important;
  margin-bottom: 2px !important;
}

body.page-bfsi .ins-coverage {
  font-size: 0.72rem !important;
  color: #059669 !important;
  font-weight: 600 !important;
  display: block !important;
}

body.page-bfsi .ins-rate {
  font-size: 0.7rem !important;
  color: #64748B !important;
  display: block !important;
  margin-top: 2px !important;
}
`;

  // Remove existing block if already appended before
  const marker = '/* ==========================================================================\n   ULTRA-SLEEK COMPACT BFSI CALCULATOR & INTERACTIVE SUITE';
  if (css.includes(marker)) {
    css = css.split(marker)[0].trim() + '\n\n';
  }

  css = css + '\n' + compactBfsiCss;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log(`Updated styles at ${cssPath}`);
}

['Matomo ecomm Web/styles.css', 'demo/infinity-shop/styles.css', 'styles.css'].forEach(p => {
  const full = path.resolve(__dirname, '..', p);
  if (fs.existsSync(full)) updateStyles(full);
});

console.log('Styles update complete.');
