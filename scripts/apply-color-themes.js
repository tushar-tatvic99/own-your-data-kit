const fs = require('fs');

const colorThemesCss = `
/* ==========================================================================
   THEME 1: BFSI PORTAL — BLACK, GREY, AND WHITE MONOCHROME
   ========================================================================== */
body.page-bfsi {
  background-color: #FAFAFA !important;
  color: #111827 !important;
}

body.page-bfsi .site-header {
  background: #FFFFFF !important;
  border-bottom: 1px solid #E5E7EB !important;
}

body.page-bfsi .portal-bar {
  background: #F4F5F7 !important;
  border-bottom: 1px solid #E5E7EB !important;
}

body.page-bfsi .portal-pills {
  background: #E5E7EB !important;
}

body.page-bfsi .portal-pill.active {
  background: #111827 !important;
  color: #FFFFFF !important;
}

body.page-bfsi .hero-section,
body.page-bfsi .bfsi-hero-dark {
  background: #F4F5F7 !important;
  border-bottom: 1px solid #E5E7EB !important;
  color: #111827 !important;
}

body.page-bfsi .hero-title {
  color: #111827 !important;
}

body.page-bfsi .hero-subtitle {
  color: #4B5563 !important;
}

body.page-bfsi .hero-badge {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  color: #374151 !important;
}

body.page-bfsi .badge-dot-emerald {
  background: #111827 !important;
  box-shadow: none !important;
}

body.page-bfsi .stat-pill {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  color: #111827 !important;
}

body.page-bfsi .stat-pill strong {
  color: #111827 !important;
}

body.page-bfsi .stat-pill small {
  color: #6B7280 !important;
}

body.page-bfsi .btn-primary {
  background: #111827 !important;
  border-color: #111827 !important;
  color: #FFFFFF !important;
}

body.page-bfsi .btn-primary:hover {
  background: #374151 !important;
  border-color: #374151 !important;
}

body.page-bfsi .btn-secondary {
  background: #FFFFFF !important;
  border-color: #D1D5DB !important;
  color: #111827 !important;
}

body.page-bfsi .btn-secondary:hover {
  background: #F9FAFB !important;
  border-color: #9CA3AF !important;
}

body.page-bfsi .btn-sm-header {
  background: #111827 !important;
  border-color: #111827 !important;
  color: #FFFFFF !important;
}

body.page-bfsi .bfsi-section {
  background: #FAFAFA !important;
}

body.page-bfsi .section-title {
  color: #111827 !important;
}

body.page-bfsi .section-desc {
  color: #6B7280 !important;
}

body.page-bfsi .bfsi-tab {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  color: #4B5563 !important;
}

body.page-bfsi .bfsi-tab.active {
  background: #111827 !important;
  border-color: #111827 !important;
  color: #FFFFFF !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

body.page-bfsi .bfsi-calculator-card {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
}

body.page-bfsi .calc-main-content {
  background: #FFFFFF !important;
}

body.page-bfsi .calc-title {
  color: #111827 !important;
}

body.page-bfsi .calc-sub {
  color: #6B7280 !important;
}

body.page-bfsi .calc-pill {
  background: #F3F4F6 !important;
  color: #374151 !important;
}

body.page-bfsi .calc-rate-badge {
  background: #F3F4F6 !important;
  color: #111827 !important;
  border: 1px solid #E5E7EB !important;
}

body.page-bfsi .slider-label {
  color: #4B5563 !important;
}

body.page-bfsi .slider-value {
  color: #111827 !important;
}

body.page-bfsi .bfsi-range-slider {
  background: #E5E7EB !important;
}

body.page-bfsi .bfsi-range-slider::-webkit-slider-thumb {
  background: #111827 !important;
  border-color: #FFFFFF !important;
}

body.page-bfsi .tenure-btn {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  color: #4B5563 !important;
}

body.page-bfsi .tenure-btn.active {
  background: #111827 !important;
  border-color: #111827 !important;
  color: #FFFFFF !important;
}

body.page-bfsi .radio-chip {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  color: #4B5563 !important;
}

body.page-bfsi .radio-chip.active {
  background: #F9FAFB !important;
  border-color: #111827 !important;
  color: #111827 !important;
}

body.page-bfsi .calc-results-sidebar {
  background: #F9FAFB !important;
  border-left: 1px solid #E5E7EB !important;
  color: #111827 !important;
}

body.page-bfsi .results-heading {
  color: #6B7280 !important;
}

body.page-bfsi .result-metric-card {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
}

body.page-bfsi .result-metric-card .metric-label {
  color: #6B7280 !important;
}

body.page-bfsi .result-metric-card .metric-number {
  color: #111827 !important;
}

body.page-bfsi .result-metric-card .metric-sub,
body.page-bfsi .result-metric-card .text-emerald {
  color: #374151 !important;
  font-weight: 600 !important;
}

body.page-bfsi .calc-guarantee-note {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  color: #6B7280 !important;
}

body.page-bfsi .calc-results-sidebar .btn {
  background: #111827 !important;
  border-color: #111827 !important;
  color: #FFFFFF !important;
}

body.page-bfsi .banking-card-mockup {
  background: linear-gradient(135deg, #27272A 0%, #18181B 50%, #09090B 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}


/* ==========================================================================
   THEME 2: E-COMMERCE STORE — LIGHTEST LAVENDER AND WHITE
   ========================================================================== */
body.page-ecommerce {
  background-color: #FAF8FF !important; /* Lightest Lavender */
  color: #1E1B2E !important;
}

body.page-ecommerce .site-header {
  background: rgba(255, 255, 255, 0.96) !important;
  border-bottom: 1px solid #EDE7F6 !important;
}

body.page-ecommerce .portal-bar {
  background: #F6F2FC !important;
  border-bottom: 1px solid #ECE4F7 !important;
}

body.page-ecommerce .portal-pills {
  background: #EBE4F6 !important;
}

body.page-ecommerce .portal-pill.active {
  background: #FFFFFF !important;
  color: #311B92 !important;
  box-shadow: 0 1px 4px rgba(103, 58, 183, 0.12) !important;
}

body.page-ecommerce .hero-section {
  background: linear-gradient(180deg, #F5F0FF 0%, #FAF8FF 100%) !important;
  border-bottom: 1px solid #EFE8FA !important;
}

body.page-ecommerce .hero-badge {
  background: #FFFFFF !important;
  border: 1px solid #E8E0F5 !important;
  color: #5E35B1 !important;
}

body.page-ecommerce .hero-badge .badge-dot {
  background: #7E57C2 !important;
  box-shadow: 0 0 8px rgba(126, 87, 194, 0.4) !important;
}

body.page-ecommerce .hero-title {
  color: #1E1B2E !important;
}

body.page-ecommerce .hero-title .highlight-serif {
  color: #5E35B1 !important;
  background: none !important;
  -webkit-text-fill-color: initial !important;
}

body.page-ecommerce .hero-subtitle {
  color: #5E5873 !important;
}

body.page-ecommerce .hero-stats .stat-pill {
  background: #FFFFFF !important;
  border: 1px solid #ECE4F7 !important;
  color: #1E1B2E !important;
  box-shadow: 0 2px 8px rgba(103, 58, 183, 0.04) !important;
}

body.page-ecommerce .hero-stats .stat-pill small {
  color: #7E7896 !important;
}

body.page-ecommerce .visual-card {
  background: #FFFFFF !important;
  border: 1px solid #EDE7F6 !important;
  box-shadow: 0 12px 32px rgba(103, 58, 183, 0.08) !important;
}

body.page-ecommerce .visual-floating-tag {
  background: #FFFFFF !important;
  border: 1px solid #EDE7F6 !important;
  color: #1E1B2E !important;
  box-shadow: 0 6px 18px rgba(103, 58, 183, 0.08) !important;
}

body.page-ecommerce .products-section {
  background: #FFFFFF !important;
}

body.page-ecommerce .cat-pill {
  background: #FFFFFF !important;
  border: 1px solid #ECE4F7 !important;
  color: #5E5873 !important;
}

body.page-ecommerce .cat-pill:hover {
  border-color: #B39DDB !important;
  color: #4A148C !important;
}

body.page-ecommerce .cat-pill.active {
  background: #4A148C !important; /* Deep Royal Lavender */
  border-color: #4A148C !important;
  color: #FFFFFF !important;
  box-shadow: 0 2px 8px rgba(74, 20, 140, 0.25) !important;
}

body.page-ecommerce .product-card {
  background: #FFFFFF !important;
  border: 1px solid #EDE7F6 !important;
  box-shadow: 0 2px 10px rgba(103, 58, 183, 0.03) !important;
}

body.page-ecommerce .product-card:hover {
  border-color: #D1C4E9 !important;
  box-shadow: 0 8px 24px rgba(103, 58, 183, 0.09) !important;
}

body.page-ecommerce .product-tag {
  background: #F3EDFD !important;
  color: #5E35B1 !important;
  border: 1px solid #E1D5F6 !important;
}

body.page-ecommerce .product-category {
  color: #7E57C2 !important;
}

body.page-ecommerce .product-title {
  color: #1E1B2E !important;
}

body.page-ecommerce .product-price {
  color: #311B92 !important;
}

body.page-ecommerce .btn-add-card {
  background: #F5F0FF !important;
  border: 1px solid #D1C4E9 !important;
  color: #4A148C !important;
}

body.page-ecommerce .btn-add-card:hover {
  background: #4A148C !important;
  border-color: #4A148C !important;
  color: #FFFFFF !important;
}

body.page-ecommerce .about-section {
  background: #FAF8FF !important;
  border-top: 1px solid #EDE7F6 !important;
  border-bottom: 1px solid #EDE7F6 !important;
}

body.page-ecommerce .about-card {
  background: #FFFFFF !important;
  border: 1px solid #EDE7F6 !important;
}

body.page-ecommerce .contact-section {
  background: #FFFFFF !important;
}

body.page-ecommerce .contact-card {
  background: #FAF8FF !important;
  border: 1px solid #EDE7F6 !important;
}

body.page-ecommerce .btn-primary {
  background: #3B1A78 !important;
  border-color: #3B1A78 !important;
  color: #FFFFFF !important;
}

body.page-ecommerce .btn-primary:hover {
  background: #5025A0 !important;
  border-color: #5025A0 !important;
}


/* ==========================================================================
   THEME 3: SITE FOOTER — BLACKISH SHADE FOR CONTRAST & DIFFERENTIATION
   ========================================================================== */
.site-footer {
  background: #090B10 !important; /* Deep Blackish Shade */
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  padding: 56px 24px 28px !important;
}

.site-footer .footer-logo,
.site-footer .brand-name {
  color: #FFFFFF !important;
}

.site-footer .brand-crest {
  color: #A78BFA !important;
}

.site-footer .footer-bio {
  color: #94A3B8 !important;
  font-size: 0.84rem !important;
}

.site-footer .social-links a {
  color: #CBD5E1 !important;
  font-size: 0.8rem !important;
  font-weight: 500 !important;
}

.site-footer .social-links a:hover {
  color: #FFFFFF !important;
}

.site-footer .footer-heading {
  color: #FFFFFF !important;
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  margin-bottom: 14px !important;
}

.site-footer .footer-list a {
  color: #94A3B8 !important;
  font-size: 0.82rem !important;
  transition: color 0.2s ease !important;
}

.site-footer .footer-list a:hover {
  color: #FFFFFF !important;
  padding-left: 2px !important;
}

.site-footer .security-text {
  color: #94A3B8 !important;
  font-size: 0.8rem !important;
}

.site-footer .pay-chip {
  background: rgba(255, 255, 255, 0.07) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #F8FAFC !important;
  font-size: 0.72rem !important;
  border-radius: 4px !important;
}

.site-footer .footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #64748B !important;
  font-size: 0.78rem !important;
  padding-top: 20px !important;
}

.site-footer .btn-cookie-preferences {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #CBD5E1 !important;
  padding: 6px 12px !important;
  border-radius: 9999px !important;
  font-size: 0.76rem !important;
}

.site-footer .btn-cookie-preferences:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #FFFFFF !important;
}
`;

function applyThemes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const marker = '/* THEME 1: BFSI PORTAL — BLACK, GREY, AND WHITE';
  if (content.includes('THEME 1: BFSI PORTAL — BLACK, GREY, AND WHITE')) {
    const idx = content.indexOf('/* ==========================================================================\n   THEME 1: BFSI PORTAL');
    content = content.substring(0, idx);
  }
  content = content + '\n' + colorThemesCss;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated color themes in ${filePath}`);
}

applyThemes('styles.css');
applyThemes('Matomo ecomm Web/styles.css');
