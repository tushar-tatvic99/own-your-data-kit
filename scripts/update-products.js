const fs = require('fs');
const path = require('path');

const rootAppPath = path.join(__dirname, '..', 'app.js');
const matomoAppPath = path.join(__dirname, '..', 'Matomo ecomm Web', 'app.js');

const newProducts = [
  {
    id: 'p1',
    name: 'Infinity Sovereign Chronometer',
    category: 'horology',
    categoryLabel: 'SWISS HOROLOGY',
    price: 450.00,
    rating: 4.98,
    reviews: 142,
    badge: 'Sovereign Tier',
    image: 'assets/images/perfume.jpg',
    description: 'Swiss automatic calibre with dual-timezone complication and grade-5 brushed titanium case.',
    highlights: [
      'Chronometer precision with 72-hour power reserve',
      'Anti-reflective sapphire crystal face',
      'Grade-5 titanium case & alligator leather strap'
    ],
    details: '41mm Titanium • Automatic Calibre'
  },
  {
    id: 'p2',
    name: 'Certified 24K Mint Gold Bullion (100g)',
    category: 'bullion',
    categoryLabel: 'PRECIOUS METALS',
    price: 680.00,
    rating: 4.99,
    reviews: 218,
    badge: 'LBMA Certified',
    image: 'assets/images/serum.jpg',
    description: '99.99% pure investment-grade physical gold bullion bar with tamper-evident security seal.',
    highlights: [
      '999.9 fine investment-grade bullion purity',
      'Serialized London Bullion Market assay certificate',
      'Allocated depository storage eligibility'
    ],
    details: '100g • 99.99% Pure Gold • LBMA Assay'
  },
  {
    id: 'p3',
    name: 'Titanium Cryptographic Vault Key',
    category: 'security',
    categoryLabel: 'SECURITY & VAULT',
    price: 185.00,
    rating: 4.95,
    reviews: 96,
    badge: 'EAL6+ Enclave',
    image: 'assets/images/silk.jpg',
    description: 'Hardware cryptographic security key with biometric touch verification and zero-leakage memory.',
    highlights: [
      'Military EAL6+ certified hardware security enclave',
      'Sub-100ms biometric fingerprint sensor',
      'Universal FIDO2 and multi-chain ledger standard'
    ],
    details: 'Grade-5 Titanium • USB-C / NFC'
  },
  {
    id: 'p4',
    name: '18k Sovereign Crest Signet',
    category: 'jewelry',
    categoryLabel: 'BESPOKE JEWELRY',
    price: 320.00,
    rating: 4.91,
    reviews: 84,
    badge: 'Hand-Forged',
    image: 'assets/images/pearl.jpg',
    description: 'Hand-engraved 18k solid gold signet ring cast in Zurich from recycled ethical bullion.',
    highlights: [
      'Solid 18k yellow gold with satin brushed finish',
      'Hand-engraved archival heritage crest',
      'Bespoke laser inner monogram included'
    ],
    details: '18k Solid Gold • 14.2g Net Weight'
  },
  {
    id: 'p5',
    name: 'Mongolian Cashmere Travel Set',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 160.00,
    rating: 4.89,
    reviews: 130,
    badge: 'First Class',
    image: 'assets/images/souffle.jpg',
    description: 'Combed Grade-A Mongolian cashmere travel wrap paired with a mulberry silk blackout eye mask.',
    highlights: [
      '100% ethically sourced Grade-A Mongolian cashmere',
      'Featherweight luxury with superior thermal warmth',
      'Includes compact water-repellent travel case'
    ],
    details: '200x70cm Wrap + Mulberry Silk Eye Mask'
  },
  {
    id: 'p6',
    name: 'Obsidian & Cedar Desk Vessel',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 95.00,
    rating: 4.94,
    reviews: 77,
    badge: 'Artisan Carved',
    image: 'assets/images/candle.jpg',
    description: 'Solid natural obsidian desk vessel infused with aged Atlas cedar and smoky vetiver accords.',
    highlights: [
      'Monolithic block of polished natural obsidian',
      'Slow-cured aromatic cedarwood and dark amber',
      'Weighted architectural silhouette'
    ],
    details: 'Solid Obsidian Stone • 450g Net Weight'
  },
  {
    id: 'p7',
    name: 'Florentine Leather Executive Folio',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 240.00,
    rating: 4.96,
    reviews: 63,
    badge: 'Bespoke Leather',
    image: 'assets/images/hero_banner.jpg',
    description: 'Full-grain vegetable-tanned Italian calfskin document folio with RFID-shielded passport sleeve.',
    highlights: [
      'Hand-stitched Tuscan vegetable-tanned calfskin',
      'Internal document organizer & tablet sleeve',
      'Integrated RFID electromagnetic blocker'
    ],
    details: 'Florentine Calfskin • YKK Excella Zips'
  },
  {
    id: 'p8',
    name: 'Mulberry Silk Rest Suite',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 135.00,
    rating: 4.92,
    reviews: 115,
    badge: '22 Momme Silk',
    image: 'assets/images/silk.jpg',
    description: 'Organic 22-momme pure mulberry silk pillowcase and contoured sleep mask for circadian reset.',
    highlights: [
      'Certified Grade 6A pure long-strand mulberry silk',
      'Hypoallergenic friction-free dermatological finish',
      'Temperature regulating for trans-meridian flights'
    ],
    details: '100% 22-Momme Silk • Set of 2'
  },
  {
    id: 'p9',
    name: 'Bohemian Crystal Decanter',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 210.00,
    rating: 4.97,
    reviews: 58,
    badge: 'Lead-Free',
    image: 'assets/images/perfume.jpg',
    description: 'Mouth-blown lead-free European crystal decanter with ground-glass geometric stopper.',
    highlights: [
      'Hand-blown by master glassmakers in Bohemia',
      'Precision ground airtight crystal stopper',
      'High-refractive brilliance and heavy base'
    ],
    details: '750ml Capacity • 1.4kg Crystal'
  },
  {
    id: 'p10',
    name: 'Titanium Executive Rollerball',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 115.00,
    rating: 4.93,
    reviews: 89,
    badge: 'CNC Machined',
    image: 'assets/images/serum.jpg',
    description: 'Aerospace grade-5 titanium rollerball pen with balanced ergonomic center of gravity.',
    highlights: [
      'Precision CNC-machined from solid titanium bar',
      'German ceramic tungsten-carbide ink refill',
      'Magnetic click-to-dock cap mechanism'
    ],
    details: 'Solid Titanium • 38g Balanced Weight'
  }
];

const formattedReplacement = '// ================= PRODUCT DATA =================\nconst PRODUCTS = ' + JSON.stringify(newProducts, null, 2) + ';';

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /\/\/ ================= PRODUCT DATA =================[\s\S]*?const PRODUCTS = \[[\s\S]*?\];/;
  if (!regex.test(content)) {
    console.error(`Regex failed for ${filePath}`);
    return;
  }
  content = content.replace(regex, formattedReplacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated products in ${filePath}`);
}

updateFile(rootAppPath);
updateFile(matomoAppPath);
