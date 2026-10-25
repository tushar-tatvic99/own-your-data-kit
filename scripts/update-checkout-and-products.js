const fs = require('fs');
const path = require('path');

// 1. Expanded PRODUCTS array (20 items, 4 per category)
const NEW_PRODUCTS = [
  {
    id: "p1",
    name: "Infinity Sovereign Chronometer",
    category: "horology",
    categoryLabel: "SWISS HOROLOGY",
    price: 450,
    rating: 4.98,
    reviews: 142,
    badge: "Sovereign Tier",
    image: "assets/images/perfume.jpg",
    description: "Swiss automatic calibre with dual-timezone complication and grade-5 titanium case.",
    highlights: [
      "Chronometer precision with 72-hour power reserve",
      "Anti-reflective sapphire crystal face",
      "Grade-5 titanium case & alligator leather strap"
    ],
    details: "41mm Titanium • Automatic Calibre"
  },
  {
    id: "p2",
    name: "Certified 24K Mint Gold Bullion (100g)",
    category: "bullion",
    categoryLabel: "PRECIOUS METALS",
    price: 680,
    rating: 4.99,
    reviews: 218,
    badge: "LBMA Certified",
    image: "assets/images/serum.jpg",
    description: "99.99% pure investment-grade physical gold bullion bar with security blister seal.",
    highlights: [
      "999.9 fine investment-grade bullion purity",
      "Serialized London Bullion Market assay certificate",
      "Allocated depository storage eligibility"
    ],
    details: "100g • 99.99% Pure Gold • LBMA Assay"
  },
  {
    id: "p3",
    name: "Titanium Cryptographic Vault Key",
    category: "security",
    categoryLabel: "SECURITY & VAULT",
    price: 185,
    rating: 4.95,
    reviews: 96,
    badge: "EAL6+ Enclave",
    image: "assets/images/silk.jpg",
    description: "Hardware cryptographic security key with biometric touch and zero-leakage memory.",
    highlights: [
      "Military EAL6+ certified hardware security enclave",
      "Sub-100ms biometric fingerprint sensor",
      "Universal FIDO2 and multi-chain ledger standard"
    ],
    details: "Grade-5 Titanium • USB-C / NFC"
  },
  {
    id: "p4",
    name: "18k Sovereign Crest Signet",
    category: "jewelry",
    categoryLabel: "BESPOKE JEWELRY",
    price: 320,
    rating: 4.91,
    reviews: 84,
    badge: "Hand-Forged",
    image: "assets/images/pearl.jpg",
    description: "Hand-engraved 18k solid gold signet ring cast in Zurich from ethical recycled bullion.",
    highlights: [
      "Solid 18k yellow gold with satin brushed finish",
      "Hand-engraved archival heritage crest",
      "Bespoke laser inner monogram included"
    ],
    details: "18k Solid Gold • 14.2g Net Weight"
  },
  {
    id: "p5",
    name: "Mongolian Cashmere Travel Set",
    category: "lifestyle",
    categoryLabel: "EXECUTIVE LIVING",
    price: 160,
    rating: 4.89,
    reviews: 130,
    badge: "First Class",
    image: "assets/images/souffle.jpg",
    description: "Combed Grade-A Mongolian cashmere travel wrap paired with a mulberry silk blackout mask.",
    highlights: [
      "100% ethically sourced Grade-A Mongolian cashmere",
      "Featherweight luxury with superior thermal warmth",
      "Includes compact water-repellent travel case"
    ],
    details: "200x70cm Wrap + Mulberry Silk Eye Mask"
  },
  {
    id: "p6",
    name: "Obsidian & Cedar Desk Vessel",
    category: "lifestyle",
    categoryLabel: "EXECUTIVE LIVING",
    price: 95,
    rating: 4.94,
    reviews: 77,
    badge: "Artisan Carved",
    image: "assets/images/candle.jpg",
    description: "Solid natural obsidian desk vessel infused with aged Atlas cedar and smoky vetiver.",
    highlights: [
      "Monolithic block of polished natural obsidian",
      "Slow-cured aromatic cedarwood and dark amber",
      "Weighted architectural silhouette"
    ],
    details: "Solid Obsidian Stone • 450g Net Weight"
  },
  {
    id: "p7",
    name: "Biometric Faraday Security Folio",
    category: "security",
    categoryLabel: "SECURITY & VAULT",
    price: 240,
    rating: 4.96,
    reviews: 63,
    badge: "RFID Shielded",
    image: "assets/images/hero_banner.jpg",
    description: "Full-grain Italian calfskin document folio with integrated electromagnetic RFID cage.",
    highlights: [
      "Hand-stitched Tuscan vegetable-tanned calfskin",
      "Internal document organizer & tablet sleeve",
      "Integrated RFID electromagnetic blocker"
    ],
    details: "Florentine Calfskin • YKK Excella Zips"
  },
  {
    id: "p8",
    name: "Tahitian South Sea Pearl Cufflinks",
    category: "jewelry",
    categoryLabel: "BESPOKE JEWELRY",
    price: 195,
    rating: 4.92,
    reviews: 115,
    badge: "AAA Luster",
    image: "assets/images/pearl.jpg",
    description: "Natural black Tahitian cultured pearls mounted on rhodium-plated sterling silver stems.",
    highlights: [
      "11mm round natural Tahitian cultured pearls",
      "Solid 925 sterling silver with mirror rhodium finish",
      "Signature swivel-back whale closure mechanism"
    ],
    details: "Pair of 2 • Tahitian Pearl & 925 Silver"
  },
  {
    id: "p9",
    name: "Certified 1kg Fine Silver Ingot",
    category: "bullion",
    categoryLabel: "PRECIOUS METALS",
    price: 210,
    rating: 4.97,
    reviews: 58,
    badge: "999 Fine Silver",
    image: "assets/images/serum.jpg",
    description: "99.9% pure investment-grade physical silver bar cast by Swiss LBMA accredited refinery.",
    highlights: [
      "999 fine investment-grade bullion purity",
      "Serialized Swiss refinery stamp and certificate",
      "Immediate allocated vault delivery eligibility"
    ],
    details: "1 Kilogram • 99.9% Pure Silver Bar"
  },
  {
    id: "p10",
    name: "Titanium Tourbillon Desk Calibre",
    category: "horology",
    categoryLabel: "SWISS HOROLOGY",
    price: 340,
    rating: 4.93,
    reviews: 89,
    badge: "Manual Wind",
    image: "assets/images/perfume.jpg",
    description: "Skeletonized manual-wind mechanical desk timepiece with exposed gyroscopic balance wheel.",
    highlights: [
      "Precision CNC-machined from solid titanium bar",
      "8-day power reserve mechanical desk movement",
      "Anti-magnetic mineral glass display dome"
    ],
    details: "Grade-5 Titanium • 8-Day Reserve"
  },
  {
    id: "p11",
    name: "Geneva Perpetual Calendar Chronograph",
    category: "horology",
    categoryLabel: "SWISS HOROLOGY",
    price: 780,
    rating: 4.99,
    reviews: 64,
    badge: "Heritage Tier",
    image: "assets/images/perfume.jpg",
    description: "Hand-assembled Swiss chronograph with perpetual moonphase dial and alligator strap.",
    highlights: [
      "Perpetual calendar complication accurate to 2100",
      "Hand-polished 18k rose gold bezel",
      "Sapphire exhibition case back with engraved rotor"
    ],
    details: "42mm Rose Gold • 28,800 vph Calibre"
  },
  {
    id: "p12",
    name: "Zurich Dual-Time Aviator Calibre",
    category: "horology",
    categoryLabel: "SWISS HOROLOGY",
    price: 520,
    rating: 4.96,
    reviews: 112,
    badge: "Aviator Edition",
    image: "assets/images/perfume.jpg",
    description: "Anti-magnetic pilot chronometer featuring dual-time timezone complication and luminescent dial.",
    highlights: [
      "Independently adjustable 24-hour GMT hour hand",
      "Brushed ceramic bi-directional rotatable bezel",
      "Water resistant to 150 meters with screw-down crown"
    ],
    details: "40mm Matte Titanium • Calibre 3285"
  },
  {
    id: "p13",
    name: "1 oz Pure Platinum Sovereign Ingot",
    category: "bullion",
    categoryLabel: "PRECIOUS METALS",
    price: 490,
    rating: 4.98,
    reviews: 83,
    badge: "999.5 Platinum",
    image: "assets/images/serum.jpg",
    description: "One troy ounce investment-grade 99.95% pure platinum bar struck by LBMA certified refiner.",
    highlights: [
      "Certified 999.5 pure physical platinum ingot",
      "Tamper-evident security blister with serial assay card",
      "Allocated Zurich and London bullion vault eligibility"
    ],
    details: "31.1g (1 oz) • 99.95% Pure Platinum"
  },
  {
    id: "p14",
    name: "Allocated 50g Fine Minted Gold Bar",
    category: "bullion",
    categoryLabel: "PRECIOUS METALS",
    price: 360,
    rating: 4.99,
    reviews: 147,
    badge: "LBMA Certified",
    image: "assets/images/serum.jpg",
    description: "50 grams of 99.99% fine 24-karat investment gold with laser-etched holographic security.",
    highlights: [
      "999.9 fine investment-grade bullion purity",
      "Laser-etched micro-security verifiable via QR",
      "Direct allocated depository delivery ready"
    ],
    details: "50g • 99.99% 24K Fine Gold"
  },
  {
    id: "p15",
    name: "Sovereign Cold-Storage Ledger",
    category: "security",
    categoryLabel: "SECURITY & VAULT",
    price: 275,
    rating: 4.97,
    reviews: 92,
    badge: "Air-Gapped",
    image: "assets/images/silk.jpg",
    description: "Air-gapped cryptographic signing device with dual OLED screens and optic QR transmission.",
    highlights: [
      "100% air-gapped architecture with zero wireless radios",
      "Dual secure elements (CC EAL6+) for asset isolation",
      "Tamper-proof brushed aerospace aluminum chassis"
    ],
    details: "Aerospace Alloy • Optical QR Airgap"
  },
  {
    id: "p16",
    name: "Hardened Aerospace Alloy Lockbox",
    category: "security",
    categoryLabel: "SECURITY & VAULT",
    price: 390,
    rating: 4.94,
    reviews: 51,
    badge: "Ballistic Grade",
    image: "assets/images/silk.jpg",
    description: "Heavy-duty biometric vault box with dual optical sensors and emergency mechanical keyway.",
    highlights: [
      "Solid milled CNC 7075 aircraft aluminum housing",
      "Dual capacitive fingerprint recognition system",
      "Integrated accelerometer anti-tamper alarm siren"
    ],
    details: "7075 Aluminum • Sub-0.2s Unlock"
  },
  {
    id: "p17",
    name: "Florentine Diamond Pavé Solitaire Pin",
    category: "jewelry",
    categoryLabel: "BESPOKE JEWELRY",
    price: 540,
    rating: 4.96,
    reviews: 73,
    badge: "VVS1 Diamond",
    image: "assets/images/pearl.jpg",
    description: "Artisan lapel pin handcrafted in Florence featuring brilliant-cut conflict-free diamonds.",
    highlights: [
      "Hand-set VVS1 clarity pavé diamonds in 18k white gold",
      "Traditional Florentine hand-engraved satin border",
      "Secure double-locking clutch mechanism"
    ],
    details: "18k White Gold • 0.85ct Diamond Pavé"
  },
  {
    id: "p18",
    name: "Handcrafted Platinum Cable Bracelet",
    category: "jewelry",
    categoryLabel: "BESPOKE JEWELRY",
    price: 430,
    rating: 4.93,
    reviews: 68,
    badge: "950 Platinum",
    image: "assets/images/pearl.jpg",
    description: "Twisted cable cuff bracelet forged from solid 950 platinum with brushed micro-texture.",
    highlights: [
      "Solid forged 950 investment-grade platinum",
      "Concealed magnetic clasp with security latch",
      "Hypoallergenic and highly resistant to oxidation"
    ],
    details: "950 Solid Platinum • 28g Net Weight"
  },
  {
    id: "p19",
    name: "Florentine Full-Grain Leather Briefcase",
    category: "lifestyle",
    categoryLabel: "EXECUTIVE LIVING",
    price: 480,
    rating: 4.97,
    reviews: 110,
    badge: "Hand-Stitched",
    image: "assets/images/hero_banner.jpg",
    description: "Tuscan vegetable-tanned calfskin executive attaché with padded laptop compartment and brass hardware.",
    highlights: [
      "Full-grain Tuscan vegetable-tanned leather that patinas beautifully",
      "Swiss-engineered solid brass key lock and hardware",
      "Tailored internal organizer with pen slots and tablet pocket"
    ],
    details: "Florentine Calfskin • Solid Brass Locks"
  },
  {
    id: "p20",
    name: "Mulberry Silk Ergonomic Sleep Suite",
    category: "lifestyle",
    categoryLabel: "EXECUTIVE LIVING",
    price: 140,
    rating: 4.92,
    reviews: 154,
    badge: "22-Momme Silk",
    image: "assets/images/souffle.jpg",
    description: "Pure 22-Momme Grade-6A mulberry silk pillowcases and contoured blackout eye mask set.",
    highlights: [
      "100% pure Grade-6A long-strand mulberry silk",
      "Natural hypoallergenic amino-acid skin protection",
      "Includes silk travel pouch and gentle laundering bag"
    ],
    details: "Pair of King Pillowcases + Mask"
  }
];

// Helper to update app.js files
function updateAppJs(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace PRODUCTS array
  const productsStr = 'const PRODUCTS = ' + JSON.stringify(NEW_PRODUCTS, null, 2) + ';';
  content = content.replace(/const PRODUCTS = \[[^]*?\n\];/m, productsStr);

  // In category tab click handler, remove aggressive scrollIntoView
  content = content.replace(
    /curationsEl\.scrollIntoView\(\{\s*behavior:\s*'smooth',\s*block:\s*'start'\s*\}\);/g,
    `// Keep scroll position smooth without jumping beneath header\n    // curationsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath} with 20 rich products across all categories.`);
}

// Helper to update index.html files
function updateIndexHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // Update category tabs with exact product counts
  const oldTabsRegex = /<div class="category-tabs" id="categoryTabs">[\s\S]*?<\/div>/;
  const newTabsHtml = `<div class="category-tabs" id="categoryTabs">
          <button class="cat-pill active" data-category="all">All Curations (20)</button>
          <button class="cat-pill" data-category="horology">Swiss Horology (4)</button>
          <button class="cat-pill" data-category="bullion">Precious Metals (4)</button>
          <button class="cat-pill" data-category="security">Security &amp; Vault (4)</button>
          <button class="cat-pill" data-category="jewelry">Bespoke Jewelry (4)</button>
          <button class="cat-pill" data-category="lifestyle">Executive Living (4)</button>
        </div>`;
  html = html.replace(oldTabsRegex, newTabsHtml);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Updated ${filePath} category tabs.`);
}

// Helper to append the sleek checkout CSS rules
const SLEEK_CHECKOUT_CSS = `
/* ==========================================================================
   COMPACT, HIGH-READABILITY LUXURY CHECKOUT MODAL FIX
   ========================================================================== */
.checkout-modal-backdrop {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(15, 23, 42, 0.72) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  z-index: 99999 !important; /* Always sits above sticky navbar (z-index 1000) */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 16px !important;
  box-sizing: border-box !important;
}

.checkout-modal-window {
  width: 95% !important;
  max-width: 800px !important; /* Compact & easy to read */
  max-height: 86vh !important;
  background: #FFFFFF !important;
  border-radius: 14px !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  margin: auto !important;
  position: relative !important;
}

.checkout-header {
  padding: 12px 20px !important;
  background: #F8FAFC !important;
  border-bottom: 1px solid #E2E8F0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-shrink: 0 !important;
  gap: 12px !important;
}

.checkout-brand-sub {
  font-size: 0.58rem !important;
  letter-spacing: 0.12em !important;
  color: #64748B !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  display: block !important;
  margin-bottom: 2px !important;
}

.checkout-brand-title {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  line-height: 1 !important;
}

.checkout-stepper {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.step-node {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 0.74rem !important;
  font-weight: 600 !important;
  color: #94A3B8 !important;
}

.step-node.active {
  color: #6366F1 !important;
}

.step-node.completed {
  color: #10B981 !important;
}

.step-num {
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #FFFFFF !important;
  border: 1.5px solid #CBD5E1 !important;
}

.step-node.active .step-num {
  background: #6366F1 !important;
  border-color: #6366F1 !important;
  color: #FFFFFF !important;
}

.step-node.completed .step-num {
  background: #10B981 !important;
  border-color: #10B981 !important;
  color: #FFFFFF !important;
}

.step-line {
  width: 16px !important;
  height: 2px !important;
  background: #E2E8F0 !important;
}

.step-line.active {
  background: #6366F1 !important;
}

.checkout-close-btn {
  width: 28px !important;
  height: 28px !important;
  border-radius: 50% !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  color: #64748B !important;
  font-size: 0.95rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  flex-shrink: 0 !important;
}

.checkout-close-btn:hover {
  background: #F1F5F9 !important;
  color: #0F172A !important;
  border-color: #94A3B8 !important;
}

.checkout-body {
  display: grid !important;
  grid-template-columns: 1.25fr 0.85fr !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.checkout-form-container {
  padding: 16px 20px !important;
  border-right: 1px solid #E2E8F0 !important;
  overflow-y: auto !important;
  max-height: calc(86vh - 58px) !important;
  box-sizing: border-box !important;
}

.panel-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-bottom: 12px !important;
  padding-bottom: 8px !important;
  border-bottom: 1px solid #F1F5F9 !important;
}

.panel-title-group h3 {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  margin: 0 0 2px 0 !important;
}

.panel-title-group p {
  font-size: 0.74rem !important;
  color: #64748B !important;
  margin: 0 !important;
}

.btn-demo-fill {
  padding: 4px 10px !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  background: #EEF2FF !important;
  color: #4F46E5 !important;
  border: 1px solid #C7D2FE !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
}

.btn-demo-fill:hover {
  background: #E0E7FF !important;
}

.step-form .form-group {
  margin-bottom: 10px !important;
}

.step-form .form-row {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 10px !important;
  margin-bottom: 10px !important;
}

.step-form label {
  font-size: 0.74rem !important;
  font-weight: 600 !important;
  color: #334155 !important;
  display: block !important;
  margin-bottom: 3px !important;
}

.step-form input,
.step-form select {
  width: 100% !important;
  height: 36px !important;
  padding: 6px 10px !important;
  font-size: 0.82rem !important;
  color: #0F172A !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 6px !important;
  box-sizing: border-box !important;
}

.step-form input:focus,
.step-form select:focus {
  outline: none !important;
  border-color: #6366F1 !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15) !important;
}

.field-hint {
  font-size: 0.68rem !important;
  color: #64748B !important;
  margin-top: 2px !important;
  display: block !important;
}

.step-navigation {
  margin-top: 14px !important;
  padding-top: 10px !important;
  border-top: 1px solid #F1F5F9 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
}

.step-navigation .btn {
  height: 38px !important;
  padding: 0 16px !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
}

/* Right Summary Column */
.checkout-summary-column {
  background: #F8FAFC !important;
  padding: 16px 18px !important;
  overflow-y: auto !important;
  max-height: calc(86vh - 58px) !important;
  box-sizing: border-box !important;
}

.summary-title {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  margin: 0 0 10px 0 !important;
  padding-bottom: 6px !important;
  border-bottom: 1px solid #E2E8F0 !important;
}

.summary-items-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  max-height: 160px !important;
  overflow-y: auto !important;
  margin-bottom: 12px !important;
  padding-right: 4px !important;
}

.summary-items-list::-webkit-scrollbar {
  width: 4px !important;
}

.summary-items-list::-webkit-scrollbar-thumb {
  background: #CBD5E1 !important;
  border-radius: 4px !important;
}

.summary-item-row {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding-bottom: 6px !important;
  border-bottom: 1px solid #F1F5F9 !important;
}

.summary-item-img {
  width: 38px !important;
  height: 38px !important;
  border-radius: 6px !important;
  object-fit: cover !important;
  border: 1px solid #E2E8F0 !important;
  flex-shrink: 0 !important;
}

.summary-item-details {
  flex-grow: 1 !important;
  min-width: 0 !important;
}

.summary-item-title {
  font-size: 0.78rem !important;
  font-weight: 600 !important;
  color: #0F172A !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.2 !important;
}

.summary-item-qty {
  font-size: 0.68rem !important;
  color: #64748B !important;
}

.summary-item-price {
  font-size: 0.78rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  flex-shrink: 0 !important;
}

.summary-breakdown {
  border-top: 1px solid #E2E8F0 !important;
  padding-top: 8px !important;
}

.summary-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 3px 0 !important;
  font-size: 0.78rem !important;
  color: #475569 !important;
}

.summary-row.grand-total {
  border-top: 1px solid #CBD5E1 !important;
  margin-top: 6px !important;
  padding-top: 8px !important;
  font-size: 0.95rem !important;
  font-weight: 800 !important;
  color: #0F172A !important;
}

.concierge-badge {
  margin-top: 10px !important;
  padding: 8px 10px !important;
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 8px !important;
  font-size: 0.7rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}
`;

function updateStylesCss(filePath) {
  if (!fs.existsSync(filePath)) return;
  let css = fs.readFileSync(filePath, 'utf8');
  if (!css.includes('COMPACT, HIGH-READABILITY LUXURY CHECKOUT MODAL FIX')) {
    css += '\n' + SLEEK_CHECKOUT_CSS;
    fs.writeFileSync(filePath, css, 'utf8');
    console.log(`Updated ${filePath} with compact checkout styles.`);
  } else {
    console.log(`${filePath} already contains checkout styles.`);
  }
}

// Run updates for both directories and root
const targets = ['Matomo ecomm Web', 'demo/infinity-shop'];
targets.forEach(dir => {
  updateAppJs(path.join(dir, 'app.js'));
  updateIndexHtml(path.join(dir, 'index.html'));
  updateStylesCss(path.join(dir, 'styles.css'));
});

// Also synchronize to root
fs.copyFileSync('Matomo ecomm Web/app.js', 'app.js');
fs.copyFileSync('Matomo ecomm Web/index.html', 'index.html');
fs.copyFileSync('Matomo ecomm Web/styles.css', 'styles.css');
console.log('Synchronized root files (app.js, index.html, styles.css).');
