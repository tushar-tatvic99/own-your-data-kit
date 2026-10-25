const fs = require('fs');

['Matomo ecomm Web/matomo-tracker.js', 'demo/infinity-shop/matomo-tracker.js', 'matomo-tracker.js'].forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  if (!code.includes('window.MatomoTracker = MatomoTracker')) {
    code += "\nif (typeof window !== 'undefined') { window.MatomoTracker = MatomoTracker; }\n";
    fs.writeFileSync(f, code, 'utf8');
    console.log(`Added window.MatomoTracker to ${f}`);
  }
});
