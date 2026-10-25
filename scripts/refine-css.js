const fs = require('fs');

const sleekCss = `
/* ==========================================================================
   SLEEK, PROFESSIONAL COMPACT UI & CLEAN HEADER OVERRIDES
   ========================================================================== */

/* 1. Header Layout */
.site-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 1000 !important;
  background: #FFFFFF !important;
  border-bottom: 1px solid #E2E8F0 !important;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06) !important;
}

.header-container {
  max-width: 1360px !important;
  margin: 0 auto !important;
  padding: 0 24px !important;
  height: 58px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
}

.header-left {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  flex-shrink: 0 !important;
}

.brand-link {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  text-decoration: none !important;
  line-height: 1 !important;
}

.brand-crest {
  font-size: 1.3rem !important;
  color: #D4AF37 !important;
  line-height: 1 !important;
}

.brand-name {
  font-family: var(--font-sans) !important;
  font-size: 1.15rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
  color: #0F172A !important;
  text-transform: uppercase !important;
  line-height: 1 !important;
}

.brand-sub,
.brand-tag {
  display: none !important;
}

.header-section-switcher {
  display: inline-flex !important;
  align-items: center !important;
  background: #F1F5F9 !important;
  padding: 3px !important;
  border-radius: 9999px !important;
  border: 1px solid #E2E8F0 !important;
}

.switcher-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 5px 12px !important;
  border-radius: 9999px !important;
  font-size: 0.8rem !important;
  font-weight: 600 !important;
  color: #64748B !important;
  text-decoration: none !important;
  transition: all 0.2s ease !important;
  white-space: nowrap !important;
}

.switcher-pill:hover {
  color: #0F172A !important;
}

.switcher-pill.active {
  background: #0F172A !important;
  color: #FFFFFF !important;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.15) !important;
}

.switcher-pill.bfsi-pill.active {
  background: #064E3B !important;
  color: #D1FAE5 !important;
  border: 1px solid #059669 !important;
}

.nav-links {
  display: flex !important;
  align-items: center !important;
  gap: 18px !important;
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
}

.nav-item {
  font-size: 0.86rem !important;
  font-weight: 600 !important;
  color: #475569 !important;
  letter-spacing: 0.02em !important;
  text-decoration: none !important;
  padding: 6px 4px !important;
  transition: color 0.2s ease !important;
  white-space: nowrap !important;
}

.nav-item:hover,
.nav-item.active {
  color: #0F172A !important;
}

.nav-item::after {
  display: none !important;
}

.nav-item.nav-highlight {
  background: transparent !important;
  color: #059669 !important;
  padding: 6px 4px !important;
}

.header-actions {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  flex-shrink: 0 !important;
}

.header-dpdp-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 5px 12px !important;
  background: #F8FAFC !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 9999px !important;
  font-size: 0.78rem !important;
  font-weight: 600 !important;
  color: #475569 !important;
  text-decoration: none !important;
  transition: all 0.2s ease !important;
}

.header-dpdp-pill:hover {
  background: #F1F5F9 !important;
  color: #0F172A !important;
  border-color: #CBD5E1 !important;
}

.btn-sm-header {
  padding: 6px 14px !important;
  font-size: 0.8rem !important;
  border-radius: 9999px !important;
  white-space: nowrap !important;
  background: #064E3B !important;
  color: #FFFFFF !important;
  border: 1px solid #059669 !important;
  cursor: pointer;
}

.btn-sm-header:hover {
  background: #047857 !important;
}

/* 2. Scroll margin for sticky header */
#wealth-fd,
#lending-mortgage,
#metal-cards,
#estate-assurance,
#curations,
#about,
#contact,
#dpdp-erasure,
.bfsi-section,
.products-section,
.about-section,
.contact-section {
  scroll-margin-top: 75px !important;
}

/* 3. Compact Proportions across sections */
.hero-section {
  padding: 24px 20px 32px !important;
  max-width: 1240px !important;
}

.hero-container {
  gap: 36px !important;
}

.hero-title {
  font-size: 2.1rem !important;
  line-height: 1.2 !important;
  margin-bottom: 10px !important;
}

.hero-subtitle {
  font-size: 0.92rem !important;
  line-height: 1.5 !important;
  margin-bottom: 18px !important;
}

.hero-actions {
  gap: 10px !important;
  margin-bottom: 20px !important;
}

.hero-actions .btn {
  padding: 9px 18px !important;
  font-size: 0.86rem !important;
}

.hero-main-img {
  height: 280px !important;
  max-height: 280px !important;
  object-fit: cover !important;
  border-radius: 12px !important;
}

.bfsi-visual-card {
  padding: 18px !important;
}

.banking-card-mockup {
  height: 170px !important;
}

/* 4. BFSI Calculator Scale Reductions */
.bfsi-section {
  padding: 32px 0 !important;
}

.section-header {
  margin-bottom: 20px !important;
  text-align: center;
}

.section-title {
  font-size: 1.65rem !important;
  margin-bottom: 4px !important;
}

.section-desc {
  font-size: 0.88rem !important;
  margin-bottom: 0 !important;
}

.bfsi-tabs-nav {
  margin-bottom: 20px !important;
  gap: 8px !important;
}

.bfsi-tab {
  padding: 7px 16px !important;
  font-size: 0.82rem !important;
}

.bfsi-calculator-card {
  border-radius: 14px !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05) !important;
}

.calc-main-content {
  padding: 22px 24px !important;
}

.calc-title {
  font-size: 1.3rem !important;
  margin-bottom: 4px !important;
}

.calc-sub {
  font-size: 0.82rem !important;
  margin-bottom: 16px !important;
}

.slider-group {
  margin-bottom: 16px !important;
}

.slider-label {
  font-size: 0.82rem !important;
}

.slider-value {
  font-size: 1.15rem !important;
}

.tenure-group {
  margin-bottom: 16px !important;
}

.calc-results-sidebar {
  padding: 22px 24px !important;
}

.results-heading {
  font-size: 0.8rem !important;
  margin-bottom: 14px !important;
}

.result-metric-card {
  padding: 12px 14px !important;
  margin-bottom: 10px !important;
}

.result-metric-card .metric-number {
  font-size: 1.55rem !important;
}

.calc-guarantee-note {
  margin: 10px 0 14px !important;
  padding: 8px 10px !important;
  font-size: 0.72rem !important;
}

/* 5. Products Showcase Grid & Image Reductions */
.products-section {
  padding: 32px 20px !important;
}

.controls-bar {
  margin-bottom: 20px !important;
}

.products-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
  gap: 18px !important;
}

.product-card {
  border-radius: 12px !important;
  border: 1px solid #E2E8F0 !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

.product-card:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07) !important;
}

.product-media {
  height: 180px !important;
  max-height: 180px !important;
  position: relative !important;
  overflow: hidden !important;
  border-radius: 12px 12px 0 0 !important;
}

.product-img {
  height: 100% !important;
  width: 100% !important;
  object-fit: cover !important;
}

.product-info {
  padding: 12px 14px !important;
}

.product-category {
  font-size: 0.68rem !important;
  letter-spacing: 0.05em !important;
  margin-bottom: 3px !important;
}

.product-title {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  margin-bottom: 4px !important;
  line-height: 1.3 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 1 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

.product-rating-row {
  margin-bottom: 6px !important;
  font-size: 0.74rem !important;
}

.product-desc {
  font-size: 0.78rem !important;
  line-height: 1.4 !important;
  color: #64748B !important;
  margin-bottom: 10px !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

.product-footer-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.product-price {
  font-size: 1rem !important;
  font-weight: 800 !important;
}

.btn-add-card {
  padding: 6px 12px !important;
  font-size: 0.75rem !important;
  border-radius: 9999px !important;
}

/* 6. About & Contact Sections */
.about-section,
.contact-section {
  padding: 36px 20px !important;
}

.about-grid,
.contact-grid {
  gap: 14px !important;
  margin-top: 20px !important;
}

.about-card,
.contact-card {
  padding: 20px 16px !important;
}

.about-card-title,
.contact-title {
  font-size: 1.05rem !important;
}

.about-card-desc,
.contact-detail {
  font-size: 0.82rem !important;
}
`;

function appendCss(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Check if marker exists
  const marker = '/* SLEEK, PROFESSIONAL COMPACT UI & CLEAN HEADER OVERRIDES */';
  if (content.includes('SLEEK, PROFESSIONAL COMPACT UI & CLEAN HEADER OVERRIDES')) {
    // Replace old overrides section
    const idx = content.indexOf('/* SLEEK, PROFESSIONAL COMPACT UI');
    content = content.substring(0, idx);
  }
  content = content + '\n' + sleekCss;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated CSS in ${filePath}`);
}

appendCss('styles.css');
appendCss('Matomo ecomm Web/styles.css');
