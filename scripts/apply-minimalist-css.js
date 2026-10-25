const fs = require('fs');

const minimalistCss = `
/* ==========================================================================
   MINIMALIST UI & SUB-HEADER PORTAL BAR OVERRIDES
   ========================================================================== */

/* 1. Sub-Header Portal Experience Switcher Bar (Placed directly below header) */
.portal-bar {
  background: #FAFAFA !important;
  border-bottom: 1px solid #EAEAEA !important;
  padding: 6px 20px !important;
  position: relative !important;
  z-index: 990 !important;
}

.portal-container {
  max-width: 1240px !important;
  margin: 0 auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 12px !important;
}

.portal-bar-label {
  font-size: 0.65rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
  color: #8C94A0 !important;
  text-transform: uppercase !important;
}

.portal-pills {
  display: inline-flex !important;
  align-items: center !important;
  background: #ECEEF2 !important;
  padding: 3px !important;
  border-radius: 9999px !important;
  gap: 4px !important;
}

.portal-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 5px 14px !important;
  border-radius: 9999px !important;
  font-size: 0.76rem !important;
  font-weight: 500 !important;
  color: #556270 !important;
  text-decoration: none !important;
  transition: all 0.2s ease !important;
  white-space: nowrap !important;
}

.portal-pill:hover {
  color: #0F172A !important;
  background: rgba(255, 255, 255, 0.6) !important;
}

.portal-pill.active {
  background: #FFFFFF !important;
  color: #0F172A !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
}

.portal-tag {
  font-size: 0.65rem !important;
  padding: 1px 6px !important;
  border-radius: 9999px !important;
  background: rgba(0, 0, 0, 0.06) !important;
  color: #556270 !important;
  font-weight: 500 !important;
}

.portal-pill.active .portal-tag {
  background: #0F172A !important;
  color: #FFFFFF !important;
}

.portal-pill.bfsi-pill.active .portal-tag {
  background: #065F46 !important;
  color: #D1FAE5 !important;
}

/* 2. Global Text Size Reductions & Clean Sizing */
body {
  font-size: 13.5px !important;
  color: #334155 !important;
}

.nav-item {
  font-size: 0.82rem !important;
  font-weight: 500 !important;
  color: #475569 !important;
  letter-spacing: 0.02em !important;
}

.nav-item:hover,
.nav-item.active {
  color: #0F172A !important;
  font-weight: 600 !important;
}

.hero-title {
  font-size: 1.85rem !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  color: #0F172A !important;
  margin-bottom: 8px !important;
}

.hero-subtitle {
  font-size: 0.85rem !important;
  color: #64748B !important;
  line-height: 1.5 !important;
  margin-bottom: 16px !important;
}

.section-pretitle {
  font-size: 0.66rem !important;
  letter-spacing: 0.08em !important;
  color: #64748B !important;
}

.section-title {
  font-size: 1.45rem !important;
  font-weight: 600 !important;
  color: #0F172A !important;
  margin-bottom: 4px !important;
}

.section-desc {
  font-size: 0.82rem !important;
  color: #64748B !important;
}

.product-title {
  font-size: 0.9rem !important;
  font-weight: 600 !important;
}

.product-desc {
  font-size: 0.75rem !important;
  line-height: 1.4 !important;
}

.product-price {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
}

/* 3. Sleek, Clean, Minimalist BFSI Section (No Overly Bold/Dark Elements) */
.bfsi-hero-dark {
  background: #FAFAF7 !important;
  color: #0F172A !important;
  border-bottom: 1px solid #E5E7EB !important;
}

.bfsi-hero-dark::before {
  display: none !important;
}

.bfsi-hero-dark .hero-title {
  color: #0F172A !important;
  font-size: 1.85rem !important;
  font-weight: 600 !important;
}

.bfsi-hero-dark .hero-title .highlight-serif {
  color: #0F172A !important;
  background: none !important;
  -webkit-text-fill-color: initial !important;
  font-style: normal !important;
  font-weight: 600 !important;
}

.bfsi-hero-dark .hero-subtitle {
  color: #64748B !important;
  font-size: 0.85rem !important;
}

.bfsi-hero-dark .hero-badge {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  color: #475569 !important;
  font-size: 0.72rem !important;
}

.bfsi-hero-dark .hero-stats .stat-pill {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  color: #0F172A !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03) !important;
}

.bfsi-hero-dark .hero-stats .stat-pill strong {
  color: #0F172A !important;
  font-size: 0.8rem !important;
}

.bfsi-hero-dark .hero-stats .stat-pill small {
  color: #64748B !important;
  font-size: 0.68rem !important;
}

.bfsi-hero-dark .btn-primary {
  background: #0F172A !important;
  border-color: #0F172A !important;
  color: #FFFFFF !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.bfsi-hero-dark .btn-secondary {
  background: #FFFFFF !important;
  border-color: #E2E8F0 !important;
  color: #0F172A !important;
  font-size: 0.82rem !important;
}

.bfsi-hero-dark .btn-outline {
  background: transparent !important;
  border-color: #CBD5E1 !important;
  color: #475569 !important;
  font-size: 0.82rem !important;
}

.banking-card-mockup {
  background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12) !important;
}

.bfsi-tag {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  color: #0F172A !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04) !important;
}

.bfsi-tag .fl-title {
  color: #0F172A !important;
  font-size: 0.74rem !important;
}

.bfsi-tag .fl-desc {
  color: #059669 !important;
  font-size: 0.72rem !important;
  font-weight: 600 !important;
}

/* 4. Minimalist BFSI Module & Calculator Cards */
.bfsi-section {
  background: #FAFAF9 !important;
  padding: 28px 0 !important;
}

.bfsi-tabs-nav {
  gap: 6px !important;
  margin-bottom: 16px !important;
}

.bfsi-tab {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  color: #475569 !important;
  font-size: 0.78rem !important;
  font-weight: 500 !important;
  padding: 6px 14px !important;
  box-shadow: none !important;
  border-radius: 9999px !important;
}

.bfsi-tab:hover {
  background: #F1F5F9 !important;
  color: #0F172A !important;
}

.bfsi-tab.active {
  background: #0F172A !important;
  color: #FFFFFF !important;
  border-color: #0F172A !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12) !important;
}

.bfsi-calculator-card {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.03) !important;
  overflow: hidden !important;
}

.calc-main-content {
  padding: 20px 22px !important;
}

.calc-pill {
  font-size: 0.68rem !important;
  padding: 2px 8px !important;
  background: #F1F5F9 !important;
  color: #475569 !important;
  border-radius: 4px !important;
}

.calc-rate-badge {
  font-size: 0.72rem !important;
  padding: 2px 8px !important;
  background: #ECFDF5 !important;
  color: #059669 !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
}

.calc-title {
  font-size: 1.15rem !important;
  font-weight: 600 !important;
  color: #0F172A !important;
  margin-bottom: 2px !important;
}

.calc-sub {
  font-size: 0.78rem !important;
  color: #64748B !important;
  margin-bottom: 14px !important;
}

.slider-group {
  margin-bottom: 14px !important;
}

.slider-label {
  font-size: 0.76rem !important;
  font-weight: 500 !important;
  color: #475569 !important;
}

.slider-value {
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: #0F172A !important;
}

.slider-scale {
  font-size: 0.68rem !important;
  color: #94A3B8 !important;
}

.bfsi-range-slider {
  height: 4px !important;
  background: #E2E8F0 !important;
}

.bfsi-range-slider::-webkit-slider-thumb {
  width: 16px !important;
  height: 16px !important;
  border: 2px solid #0F172A !important;
  background: #FFFFFF !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15) !important;
}

.tenure-group {
  margin-bottom: 14px !important;
}

.tenure-btn {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  color: #475569 !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  font-size: 0.76rem !important;
  font-weight: 500 !important;
}

.tenure-btn:hover {
  background: #F8FAFC !important;
  color: #0F172A !important;
}

.tenure-btn.active {
  background: #0F172A !important;
  color: #FFFFFF !important;
  border-color: #0F172A !important;
}

.radio-chip {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  padding: 7px 12px !important;
  font-size: 0.78rem !important;
  border-radius: 6px !important;
  color: #475569 !important;
}

.radio-chip.active {
  background: #F8FAFC !important;
  border-color: #0F172A !important;
  color: #0F172A !important;
  font-weight: 600 !important;
}

/* 5. Minimalist Clean Results Sidebar (Light, Not Pitch Black) */
.calc-results-sidebar {
  background: #F8FAFC !important;
  border-left: 1px solid #E2E8F0 !important;
  color: #0F172A !important;
  padding: 20px 22px !important;
}

.results-heading {
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  margin-bottom: 12px !important;
}

.result-metric-card {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 8px !important;
  padding: 10px 12px !important;
  margin-bottom: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
}

.result-metric-card.primary-metric {
  background: #FFFFFF !important;
  border-color: #CBD5E1 !important;
}

.result-metric-card .metric-label {
  font-size: 0.66rem !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  margin-bottom: 2px !important;
}

.result-metric-card .metric-number {
  font-size: 1.35rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  line-height: 1.2 !important;
}

.result-metric-card .metric-sub {
  font-size: 0.7rem !important;
  color: #64748B !important;
}

.text-emerald {
  color: #059669 !important;
}

.calc-guarantee-note {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  font-size: 0.68rem !important;
  color: #64748B !important;
  padding: 8px 10px !important;
  border-radius: 6px !important;
  margin: 8px 0 12px !important;
}

.calc-results-sidebar .btn {
  background: #0F172A !important;
  color: #FFFFFF !important;
  font-size: 0.8rem !important;
  font-weight: 500 !important;
  padding: 8px 14px !important;
  border-radius: 6px !important;
  border: 1px solid #0F172A !important;
}

.calc-results-sidebar .btn:hover {
  background: #1E293B !important;
}
`;

function appendMinimalistCss(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const marker = '/* MINIMALIST UI & SUB-HEADER PORTAL BAR OVERRIDES */';
  if (content.includes('MINIMALIST UI & SUB-HEADER PORTAL BAR OVERRIDES')) {
    const idx = content.indexOf('/* MINIMALIST UI & SUB-HEADER PORTAL BAR OVERRIDES');
    content = content.substring(0, idx);
  }
  content = content + '\n' + minimalistCss;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated minimalist CSS in ${filePath}`);
}

appendMinimalistCss('styles.css');
appendMinimalistCss('Matomo ecomm Web/styles.css');
