const fs = require('fs');

const bfsiGlassmorphismCss = `
/* ==========================================================================
   JUST THE BFSI SECTION: BLACKISH THEME GLASSMORPHISM
   ========================================================================== */
.bfsi-section {
  background: radial-gradient(circle at 50% 15%, #141923 0%, #090B10 65%, #050608 100%) !important;
  color: #FFFFFF !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  position: relative !important;
  padding: 40px 0 !important;
}

/* Subtle glass ambient glow */
.bfsi-section::before {
  content: '' !important;
  position: absolute !important;
  top: 10% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 800px !important;
  height: 500px !important;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, rgba(16, 185, 129, 0.04) 40%, transparent 70%) !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.bfsi-section .section-container {
  position: relative !important;
  z-index: 2 !important;
}

/* Headers in BFSI Section */
.bfsi-section .section-pretitle {
  color: #94A3B8 !important;
  letter-spacing: 0.12em !important;
  font-weight: 600 !important;
}

.bfsi-section .section-title {
  color: #FFFFFF !important;
  font-weight: 700 !important;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5) !important;
}

.bfsi-section .section-desc {
  color: #94A3B8 !important;
}

/* Glassmorphism Category Tabs */
.bfsi-section .bfsi-tabs-nav {
  gap: 8px !important;
  margin-bottom: 22px !important;
}

.bfsi-section .bfsi-tab {
  background: rgba(255, 255, 255, 0.04) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #CBD5E1 !important;
  font-size: 0.78rem !important;
  font-weight: 500 !important;
  padding: 7px 16px !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
  transition: all 0.25s ease !important;
}

.bfsi-section .bfsi-tab:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #FFFFFF !important;
}

.bfsi-section .bfsi-tab.active {
  background: rgba(255, 255, 255, 0.16) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

/* Glassmorphism Calculator Card (Blackish Glass) */
.bfsi-section .bfsi-calculator-card {
  background: rgba(16, 22, 34, 0.6) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 16px !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  color: #FFFFFF !important;
  overflow: hidden !important;
}

.bfsi-section .calc-main-content {
  background: transparent !important;
  padding: 24px 26px !important;
}

.bfsi-section .calc-pill {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #E2E8F0 !important;
  font-size: 0.7rem !important;
  border-radius: 6px !important;
}

.bfsi-section .calc-rate-badge {
  background: rgba(16, 185, 129, 0.12) !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  color: #34D399 !important;
  font-size: 0.74rem !important;
  border-radius: 6px !important;
  font-weight: 700 !important;
  text-shadow: 0 0 10px rgba(52, 211, 153, 0.3) !important;
}

.bfsi-section .calc-title {
  color: #FFFFFF !important;
  font-size: 1.25rem !important;
  font-weight: 700 !important;
  margin-bottom: 4px !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4) !important;
}

.bfsi-section .calc-sub {
  color: #94A3B8 !important;
  font-size: 0.8rem !important;
  margin-bottom: 16px !important;
}

.bfsi-section .slider-label {
  color: #CBD5E1 !important;
  font-size: 0.78rem !important;
  font-weight: 500 !important;
}

.bfsi-section .slider-value {
  color: #FFFFFF !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  text-shadow: 0 0 14px rgba(255, 255, 255, 0.25) !important;
}

.bfsi-section .slider-scale {
  color: #64748B !important;
  font-size: 0.68rem !important;
}

.bfsi-section .bfsi-range-slider {
  background: rgba(255, 255, 255, 0.15) !important;
  height: 4px !important;
  border-radius: 2px !important;
}

.bfsi-section .bfsi-range-slider::-webkit-slider-thumb {
  width: 18px !important;
  height: 18px !important;
  border: 2px solid #FFFFFF !important;
  background: #090B10 !important;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.6) !important;
}

.bfsi-section .tenure-btn {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #CBD5E1 !important;
  padding: 7px 12px !important;
  border-radius: 8px !important;
  font-size: 0.78rem !important;
  font-weight: 500 !important;
  backdrop-filter: blur(10px) !important;
  transition: all 0.2s ease !important;
}

.bfsi-section .tenure-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
}

.bfsi-section .tenure-btn.active {
  background: #FFFFFF !important;
  border-color: #FFFFFF !important;
  color: #090B10 !important;
  font-weight: 700 !important;
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.25) !important;
}

.bfsi-section .radio-chip {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 8px 14px !important;
  font-size: 0.78rem !important;
  border-radius: 8px !important;
  color: #CBD5E1 !important;
  backdrop-filter: blur(10px) !important;
}

.bfsi-section .radio-chip.active {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
}

/* Glassmorphism Results Sidebar (Deep Dark Glass) */
.bfsi-section .calc-results-sidebar {
  background: rgba(8, 11, 18, 0.8) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(28px) !important;
  -webkit-backdrop-filter: blur(28px) !important;
  padding: 24px 26px !important;
  color: #FFFFFF !important;
}

.bfsi-section .results-heading {
  color: #94A3B8 !important;
  font-size: 0.74rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  margin-bottom: 14px !important;
}

.bfsi-section .result-metric-card {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 10px !important;
  padding: 12px 14px !important;
  margin-bottom: 10px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(12px) !important;
}

.bfsi-section .result-metric-card.primary-metric {
  background: rgba(255, 255, 255, 0.07) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.bfsi-section .result-metric-card .metric-label {
  color: #94A3B8 !important;
  font-size: 0.68rem !important;
  letter-spacing: 0.06em !important;
}

.bfsi-section .result-metric-card .metric-number {
  color: #FFFFFF !important;
  font-size: 1.45rem !important;
  font-weight: 800 !important;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.2) !important;
}

.bfsi-section .result-metric-card .text-emerald {
  color: #34D399 !important;
  text-shadow: 0 0 14px rgba(52, 211, 153, 0.35) !important;
}

.bfsi-section .result-metric-card .text-accent {
  color: #38BDF8 !important;
  text-shadow: 0 0 14px rgba(56, 189, 248, 0.35) !important;
}

.bfsi-section .calc-guarantee-note {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  font-size: 0.72rem !important;
  color: #94A3B8 !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  margin: 10px 0 14px !important;
}

.bfsi-section .calc-results-sidebar .btn {
  background: #FFFFFF !important;
  border-color: #FFFFFF !important;
  color: #090B10 !important;
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  padding: 10px 18px !important;
  border-radius: 8px !important;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2) !important;
  transition: all 0.2s ease !important;
}

.bfsi-section .calc-results-sidebar .btn:hover {
  background: #E2E8F0 !important;
  border-color: #E2E8F0 !important;
  transform: translateY(-1px) !important;
}

/* Glassmorphism Cards Showcase & Insurance Tiers */
.bfsi-section .bfsi-card-item {
  background: rgba(16, 22, 34, 0.6) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 14px !important;
  padding: 24px 20px !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  color: #FFFFFF !important;
}

.bfsi-section .card-item-title {
  color: #FFFFFF !important;
}

.bfsi-section .card-item-desc {
  color: #94A3B8 !important;
}

.bfsi-section .card-perks-list li {
  color: #CBD5E1 !important;
}

.bfsi-section .card-fee-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #94A3B8 !important;
}

.bfsi-section .fee-val {
  color: #FFFFFF !important;
}

.bfsi-section .insurance-tier-box {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(12px) !important;
  border-radius: 8px !important;
  color: #FFFFFF !important;
}

.bfsi-section .insurance-tier-box.active {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.15) !important;
}

.bfsi-section .ins-name {
  color: #FFFFFF !important;
}

.bfsi-section .ins-coverage {
  color: #CBD5E1 !important;
}

.bfsi-section .ins-rate {
  color: #34D399 !important;
}
`;

function applyBfsiGlassmorphism(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const marker = '/* JUST THE BFSI SECTION: BLACKISH THEME GLASSMORPHISM';
  if (content.includes('JUST THE BFSI SECTION: BLACKISH THEME GLASSMORPHISM')) {
    const idx = content.indexOf('/* ==========================================================================\n   JUST THE BFSI SECTION');
    content = content.substring(0, idx);
  }
  content = content + '\n' + bfsiGlassmorphismCss;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated BFSI glassmorphism in ${filePath}`);
}

applyBfsiGlassmorphism('styles.css');
applyBfsiGlassmorphism('Matomo ecomm Web/styles.css');
