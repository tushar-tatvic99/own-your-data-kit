const fs = require('fs');

// 1. Update index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');

const portalBarOldIndex = /<!-- Portal Experience Switcher Bar[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const portalBarNew = `<!-- Minimalist Portal Switcher Bar -->
  <div class="portal-bar" id="portalBar">
    <div class="portal-container">
      <div class="portal-pills">
        <a href="index.html" class="portal-pill active" id="switchEcommerce">
          <span class="portal-icon">🛍️</span>
          <span>E-Commerce</span>
        </a>
        <a href="bfsi.html" class="portal-pill bfsi-pill" id="switchBfsi">
          <span class="portal-icon">🏛️</span>
          <span>BFSI</span>
        </a>
      </div>
    </div>
  </div>`;

indexHtml = indexHtml.replace(portalBarOldIndex, portalBarNew);
fs.writeFileSync('index.html', indexHtml, 'utf8');
fs.writeFileSync('Matomo ecomm Web/index.html', indexHtml, 'utf8');
console.log('Updated index.html: Cleaned portal-bar');

// 2. Update bfsi.html
let bfsiHtml = fs.readFileSync('bfsi.html', 'utf8');
const portalBarOldBfsi = /<!-- Portal Experience Switcher Bar[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const portalBarNewBfsi = `<!-- Minimalist Portal Switcher Bar -->
  <div class="portal-bar" id="portalBar">
    <div class="portal-container">
      <div class="portal-pills">
        <a href="index.html" class="portal-pill" id="switchEcommerce">
          <span class="portal-icon">🛍️</span>
          <span>E-Commerce</span>
        </a>
        <a href="bfsi.html" class="portal-pill bfsi-pill active" id="switchBfsi">
          <span class="portal-icon">🏛️</span>
          <span>BFSI</span>
        </a>
      </div>
    </div>
  </div>`;

bfsiHtml = bfsiHtml.replace(portalBarOldBfsi, portalBarNewBfsi);
fs.writeFileSync('bfsi.html', bfsiHtml, 'utf8');
fs.writeFileSync('Matomo ecomm Web/bfsi.html', bfsiHtml, 'utf8');
console.log('Updated bfsi.html: Cleaned portal-bar');
