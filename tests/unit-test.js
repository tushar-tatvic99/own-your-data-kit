const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let serverProcess = null;
const PORT = 3000;

// Helper to perform HTTP GET
function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

// Helper to perform HTTP POST JSON
function httpPost(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, json: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ statusCode: res.statusCode, json: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runUnitTests() {
  console.log('\n============================================================');
  console.log('   RUNNING COMPREHENSIVE UNIT TEST SUITE (INFINITY SUITE)   ');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. PRODUCT CATALOG UNIT TESTS
  console.log('--- 1. Product Catalog & Data Integrity Tests ---');
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const matomoTrackerJs = fs.readFileSync(path.join(__dirname, '..', 'matomo-tracker.js'), 'utf8');
  
  test('PRODUCTS catalog should contain 7 curated assets (Aura Blush Store)', () => {
    const match = appJs.match(/const PRODUCTS = (\[[\s\S]*?\]);/);
    assert(match, 'PRODUCTS definition found in app.js');
    const products = JSON.parse(match[1]);
    assert.strictEqual(products.length, 7, 'Expected exactly 7 products for streamlined Aura Blush store');
    
    // Verify each product schema
    products.forEach((p, idx) => {
      assert(p.id, `Product at index ${idx} must have an ID`);
      assert(p.name, `Product ${p.id} must have a name`);
      assert(p.price > 0, `Product ${p.id} price must be > 0`);
      assert(p.category, `Product ${p.id} must have a category`);
      assert(p.image, `Product ${p.id} must have an image path`);
      assert(p.description, `Product ${p.id} must have a description`);
    });
  });

  // Try checking if server is already running, else start it in-process
  let serverInstance = null;
  try {
    await httpGet('/');
  } catch (e) {
    // Start server in-process
    process.env.PORT = PORT;
    const serverFile = path.join(__dirname, '..', 'Matomo ecomm Web', 'server.js');
    // We can require server.js
    try {
      require(serverFile);
      // Wait 500ms for listen
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log('Note: Server already running or started:', err.message);
    }
  }

  // 2. BACKEND API UNIT TESTS
  console.log('\n--- 2. Backend BFSI Financial Calculator API Tests ---');
  
  await testAsync('API POST /api/bfsi/calculate-yield (FD / Treasury Compound Yield)', async () => {
    const res = await httpPost('/api/bfsi/calculate-yield', {
      principal: 100000,
      months: 36,
      rate: 8.45,
      payout: 'compounded'
    });
    assert.strictEqual(res.statusCode, 200, 'HTTP status should be 200');
    assert.strictEqual(res.json.status, 'success', 'Response status should be success');
    assert(res.json.calculations.maturityTotal > 100000, 'Maturity should be > principal');
    assert.strictEqual(res.json.dataLayer.event, 'calculate_fd_yield');
  });

  await testAsync('API POST /api/bfsi/calculate-emi (Lending / Mortgage Amortization)', async () => {
    const res = await httpPost('/api/bfsi/calculate-emi', {
      principal: 350000,
      years: 15,
      rate: 7.65,
      loanType: 'Prime Home Mortgage'
    });
    assert.strictEqual(res.statusCode, 200, 'HTTP status should be 200');
    assert.strictEqual(res.json.status, 'success', 'Response status should be success');
    assert(res.json.calculations.monthlyEmi > 0, 'Monthly EMI should be calculated');
    assert.strictEqual(res.json.dataLayer.event, 'calculate_loan_emi');
  });

  await testAsync('API POST /api/bfsi/submit-lead (Client Advisory Concierge Intake)', async () => {
    const res = await httpPost('/api/bfsi/submit-lead', {
      clientName: 'Rahul Sharma',
      clientEmail: 'rahul@example.com',
      clientPhone: '+91 98765 43210',
      incomeBracket: '250k-500k',
      purpose: 'loan_application',
      productName: 'Prime Home Mortgage',
      requestedAmount: '$350,000'
    });
    assert.strictEqual(res.statusCode, 200, 'HTTP status should be 200');
    assert.strictEqual(res.json.status, 'success', 'Response status should be success');
    assert(res.json.referenceId.startsWith('INF-BFSI-'), 'Reference ID should have proper prefix');
    assert.strictEqual(res.json.dataLayer.event, 'financial_lead_submitted');
  });

  // 3. FRONTEND PAGES & ROUTING TESTS
  console.log('\n--- 3. Page Routing, Headers & Navigation Tests ---');

  await testAsync('GET / (BFSI Dedicated Landing Page)', async () => {
    const res = await httpGet('/');
    assert.strictEqual(res.statusCode, 200, 'index.html should return 200 OK');
    assert(res.data.includes('site-header'), 'Should contain site-header');
    assert(!res.data.includes('class="portal-bar"'), 'Must NOT contain portal-bar toggle');
    assert(res.data.includes('>Home page</a>'), 'Must contain Home page link');
    assert(res.data.includes('>Apply loan</a>'), 'Must contain Apply loan link');
    assert(res.data.includes('>open savings account</a>'), 'Must contain open savings account link');
    assert(res.data.includes('>about us</a>'), 'Must contain about us link');
    assert(res.data.includes('>Login</a>'), 'Must contain Login link');
    assert(res.data.includes('bfsiHamburgerBtn'), 'Must contain hamburger button');
    assert(res.data.includes('applyLoanForm'), 'Must contain Apply Loan form');
    assert(res.data.includes('openSavingsForm'), 'Must contain Open Savings Account form');
    assert(res.data.includes('customerLoginForm'), 'Must contain Customer Login form');
  });

  await testAsync('GET /ecommerce.html (Aura Blush E-Commerce Page)', async () => {
    const res = await httpGet('/ecommerce.html');
    assert.strictEqual(res.statusCode, 200, 'ecommerce.html should return 200 OK');
    assert(res.data.includes('Aura &amp; Blush'), 'Should contain Aura & Blush branding');
    assert(res.data.includes('productsGrid'), 'Should contain products grid');
    assert(!res.data.includes('class="portal-bar"'), 'Must NOT contain portal-bar toggle');
  });

  // 4. DATALAYER & TRACKING INTEGRITY TESTS
  console.log('\n--- 4. DataLayer & Analytics Event Pipelines Tests ---');

  test('GA4 Standard Ecommerce Schema events are defined in matomo-tracker.js', () => {
    const ga4Events = [
      'view_item_list',
      'select_item',
      'view_item',
      'add_to_cart',
      'remove_from_cart',
      'view_cart',
      'begin_checkout',
      'purchase'
    ];
    ga4Events.forEach(evt => {
      assert(matomoTrackerJs.includes(evt), `matomo-tracker.js must define GA4 event '${evt}'`);
    });
  });

  test('app.js integrates all user interaction hooks with tracker methods', () => {
    const requiredHooks = [
      'trackViewItemList',
      'trackSelectItem',
      'trackProductView',
      'trackAddToCart',
      'trackRemoveFromCart',
      'trackViewCart',
      'trackBeginCheckout',
      'trackOrder',
      'handleFormFieldInteraction',
      'submitLoanForm',
      'submitSavingsForm',
      'submitLoginForm'
    ];
    requiredHooks.forEach(hook => {
      assert(appJs.includes(hook), `app.js must trigger '${hook}'`);
    });
  });

  // 5. CSS STYLING & COMPACT PROPORTIONS TESTS
  console.log('\n--- 5. CSS & Proportional Scale Tests ---');
  const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

  test('Sticky Header has solid background to prevent see-through overlapping', () => {
    assert(stylesCss.includes('background: #FFFFFF !important'), 'Header must have solid #FFFFFF background');
    assert(stylesCss.includes('z-index: 1000 !important'), 'Header must have z-index 1000');
  });

  test('All anchor targets have scroll-margin-top to prevent tucking under header', () => {
    assert(stylesCss.includes('scroll-margin-top: 75px !important') || stylesCss.includes('scroll-margin-top: 80px'), 'All sections must have scroll-margin-top offset');
  });

  test('Clean BFSI Landing Page and 3 Forms styles present in styles.css', () => {
    assert(stylesCss.includes('.bfsi-clean-header'), 'Must style clean BFSI header');
    assert(stylesCss.includes('.hamburger-toggle-btn'), 'Must style hamburger button');
    assert(stylesCss.includes('.hamburger-menu-panel'), 'Must style hamburger dropdown menu');
    assert(stylesCss.includes('.bfsi-simple-card'), 'Must style BFSI simple form cards');
    assert(stylesCss.includes('.footer-3-ctas-grid'), 'Must style footer 3 CTAs');
  });

  console.log('\n============================================================');
  console.log(`   UNIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED   `);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runUnitTests().catch(err => {
  console.error('Test Suite Failed with fatal error:', err);
  process.exit(1);
});
