const fs = require('fs');
const path = require('path');

const targetDirs = ['Matomo ecomm Web', 'demo/infinity-shop', '.'];

targetDirs.forEach(dir => {
  // 1. Update matomo-tracker.js
  const trackerPath = path.join(dir, 'matomo-tracker.js');
  if (fs.existsSync(trackerPath)) {
    let trackerCode = fs.readFileSync(trackerPath, 'utf8');
    if (!trackerCode.includes('function trackCategoryView')) {
      const funcDef = `
  function trackCategoryView(categoryName) {
    trackCustomEvent('Catalog', 'Category View', categoryName, 1);
  }
`;
      trackerCode = trackerCode.replace('function clearLog() {', funcDef + '\n  function clearLog() {');
      trackerCode = trackerCode.replace('trackSiteSearch,', 'trackSiteSearch,\n    trackCategoryView,');
      fs.writeFileSync(trackerPath, trackerCode, 'utf8');
      console.log(`Added trackCategoryView to ${trackerPath}`);
    }
  }

  // 2. Update app.js
  const appPath = path.join(dir, 'app.js');
  if (fs.existsSync(appPath)) {
    let appCode = fs.readFileSync(appPath, 'utf8');

    // Replace the categoryTabs listener to immediately renderProducts() first, then safe tracking
    const oldListenerRegex = /\/\/\s*Category Filter Tabs[\s\S]*?categoryTabs\?\.addEventListener\('click',\s*\(e\)\s*=>\s*\{[\s\S]*?renderProducts\(\);[\s\S]*?\}\s*\}\);/;

    const newListener = `// Category Filter Tabs
categoryTabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-pill');
  if (btn) {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.getAttribute('data-category') || 'all';

    // 1. Instantly re-render classified products for the selected category
    renderProducts();

    // 2. Analytics Tracking (Safely wrapped so telemetry never blocks UI rendering)
    try {
      if (typeof MatomoTracker !== 'undefined') {
        const catLabel = btn.textContent.trim();
        if (typeof MatomoTracker.trackCategoryView === 'function') {
          MatomoTracker.trackCategoryView(catLabel);
        }
        if (typeof MatomoTracker.trackCustomEvent === 'function') {
          MatomoTracker.trackCustomEvent('Catalog', 'Category Filter Applied', state.activeCategory);
        }
      }
    } catch (err) {
      console.warn('Analytics tracking error:', err);
    }
  }
});`;

    appCode = appCode.replace(oldListenerRegex, newListener);
    fs.writeFileSync(appPath, appCode, 'utf8');
    console.log(`Updated category click listener in ${appPath}`);
  }
});

console.log('Category filter fix applied successfully across all targets.');
