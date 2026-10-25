const fs = require('fs');

// 1. Remove duplicate Explore BFSI button from hero in index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');

const heroActionsOld = /<div class="hero-actions">[\s\S]*?<\/div>/;
const heroActionsNew = `<div class="hero-actions">
          <a href="#curations" class="btn btn-primary" id="heroShopBtn">
            <span>Shop Curated Collection</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>`;

if (heroActionsOld.test(indexHtml)) {
  indexHtml = indexHtml.replace(heroActionsOld, heroActionsNew);
  fs.writeFileSync('index.html', indexHtml, 'utf8');
  fs.writeFileSync('Matomo ecomm Web/index.html', indexHtml, 'utf8');
  console.log('Removed duplicate BFSI button from index.html hero fold');
}

// 2. Update PRODUCTS in app.js so every category has 2 products
const updatedProducts = [
  {
    id: "p1",
    name: "Infinity Sovereign Chronometer",
    category: "horology",
    categoryLabel: "SWISS HOROLOGY",
    price: 450.00,
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
    price: 680.00,
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
    price: 185.00,
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
    price: 320.00,
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
    price: 160.00,
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
    price: 95.00,
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
    price: 240.00,
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
    price: 195.00,
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
    price: 210.00,
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
    price: 340.00,
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
  }
];

function updateAppJsCategories(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace PRODUCTS array
  const prodRegex = /\/\/ ================= PRODUCT DATA =================[\s\S]*?const PRODUCTS = \[[\s\S]*?\];/;
  const newProdStr = '// ================= PRODUCT DATA =================\nconst PRODUCTS = ' + JSON.stringify(updatedProducts, null, 2) + ';';
  content = content.replace(prodRegex, newProdStr);

  // Update categoryTabs event listener to closest('.cat-pill') and smooth scroll to #curations
  const catTabListenerRegex = /\/\/ Category Filter Tabs[\s\S]*?categoryTabs\.addEventListener\('click'[\s\S]*?renderProducts\(\);[\s\S]*?}\);/;
  const newCatTabListener = `// Category Filter Tabs
categoryTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-pill');
  if (btn) {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.getAttribute('data-category');

    // Matomo Category View & Filter Tracking
    if (typeof MatomoTracker !== 'undefined') {
      const catLabel = btn.textContent.trim();
      MatomoTracker.trackCategoryView(catLabel);
      MatomoTracker.trackCustomEvent('Catalog', 'Category Filter Applied', state.activeCategory);
    }

    renderProducts();

    // Auto-scroll slightly so filtered items are immediately in clear view
    const curationsEl = document.getElementById('curations');
    if (curationsEl) {
      curationsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});`;

  content = content.replace(catTabListenerRegex, newCatTabListener);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated products and categoryTabs handler in ${filePath}`);
}

updateAppJsCategories('app.js');
updateAppJsCategories('Matomo ecomm Web/app.js');

// 3. Update styles.css so hero doesn't push curations out of view
const heroCompactCss = `
/* Compact Hero Layout & Immediate Curations Visibility */
.hero-section {
  padding: 16px 20px 20px !important;
  max-width: 1240px !important;
}

.hero-container {
  gap: 24px !important;
}

.hero-main-img {
  height: 240px !important;
  max-height: 240px !important;
}

.products-section {
  padding: 24px 20px 36px !important;
}

.controls-bar {
  margin-bottom: 16px !important;
}

.products-grid {
  min-height: 220px !important;
}
`;

function updateStylesCompact(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('Compact Hero Layout & Immediate Curations Visibility')) {
    const idx = content.indexOf('/* Compact Hero Layout');
    content = content.substring(0, idx);
  }
  content = content + '\n' + heroCompactCss;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated compact hero CSS in ${filePath}`);
}

updateStylesCompact('styles.css');
updateStylesCompact('Matomo ecomm Web/styles.css');
