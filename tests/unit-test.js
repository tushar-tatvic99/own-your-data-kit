const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Helper to perform HTTP GET
function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
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
      port: 3000,
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
  
  test('PRODUCTS catalog should contain 10 curated luxury assets', () => {
    const match = appJs.match(/const PRODUCTS = (\[[\s\S]*?\]);/);
    assert(match, 'PRODUCTS definition found in app.js');
    const products = JSON.parse(match[1]);
    assert(products.length >= 10, 'Expected at least 10 products');
    
    // Verify each product schema
    products.forEach((p, idx) => {
      assert(p.id, `Product at index ${idx} must have an ID`);
      assert(p.name, `Product ${p.id} must have a name`);
      assert(p.price > 0, `Product ${p.id} price must be > 0`);
      assert(p.category, `Product ${p.id} must have a category`);
      assert(p.image, `Product ${p.id} must have an image path`);
      assert(p.description, `Product ${p.id} must have a description`);
      assert(p.description.length < 150, `Product ${p.id} description must be concise and optimized (<150 chars)`);
    });
  });

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
    assert(res.json.calculations.maturityTotal >= 128000, 'Maturity capital for 8.45% 36m should exceed $128,000');
    assert.strictEqual(res.json.dataLayer.event, 'calculate_fd_yield', 'DataLayer event name should match');
    assert.strictEqual(res.json.dataLayer.interest_rate_apy, 8.45);
  });

  await testAsync('API POST /api/bfsi/calculate-emi (Lending / Mortgage Amortization)', async () => {
    const res = await httpPost('/api/bfsi/calculate-emi', {
      principal: 500000,
      years: 15,
      rate: 7.65,
      loanType: 'Prime Sovereign Mortgage'
    });
    assert.strictEqual(res.statusCode, 200, 'HTTP status should be 200');
    assert.strictEqual(res.json.status, 'success', 'Response status should be success');
    assert(res.json.calculations.monthlyEmi > 0, 'Monthly EMI must be > 0');
    assert(res.json.calculations.totalPayable > 500000, 'Total payable must include interest');
    assert.strictEqual(res.json.dataLayer.event, 'calculate_loan_emi');
  });

  await testAsync('API POST /api/bfsi/submit-lead (Client Advisory Concierge Intake)', async () => {
    const res = await httpPost('/api/bfsi/submit-lead', {
      clientName: 'Dhruvi Parekh',
      clientEmail: 'dhruvi@example.com',
      clientPhone: '+1 555-0199',
      incomeBracket: '500k-1m',
      purpose: 'yield_maximization',
      productName: 'Infinite High-Yield Multiplier Deposit'
    });
    assert.strictEqual(res.statusCode, 200, 'HTTP status should be 200');
    assert.strictEqual(res.json.status, 'success', 'Response status should be success');
    assert(res.json.referenceId.startsWith('INF-BFSI-'), 'Reference ID should have proper prefix');
    assert.strictEqual(res.json.dataLayer.event, 'financial_lead_submitted');
  });

  // 3. FRONTEND PAGES & ROUTING TESTS
  console.log('\n--- 3. Page Routing, Headers & Navigation Tests ---');

  await testAsync('GET / (E-Commerce Store Landing Page)', async () => {
    const res = await httpGet('/');
    assert.strictEqual(res.statusCode, 200, 'index.html should return 200 OK');
    assert(res.data.includes('site-header'), 'Should contain site-header');
    assert(res.data.includes('switchEcommerce'), 'Should contain E-Commerce switcher');
    assert(res.data.includes('switchBfsi'), 'Should contain Explore BFSI switcher');
    assert(res.data.includes('All Curations'), 'Should show curations in category filter');
    // Ensure no duplicate header links
    const matchesPrivacy = (res.data.match(/class="nav-item">Privacy<\/a>/g) || []).length;
    assert(matchesPrivacy <= 1, 'Should not have duplicate Privacy links in desktop nav');
  });

  await testAsync('GET /bfsi.html (Explore BFSI Dedicated Banking Page)', async () => {
    const res = await httpGet('/bfsi.html');
    assert.strictEqual(res.statusCode, 200, 'bfsi.html should return 200 OK');
    assert(res.data.includes('wealth-fd'), 'Should contain High-Yield FD calculator');
    assert(res.data.includes('lending-mortgage'), 'Should contain Lending calculator');
    assert(res.data.includes('metal-cards'), 'Should contain Metal Cards showcase');
    assert(res.data.includes('estate-assurance'), 'Should contain Executive Assurance section');
    assert(res.data.includes('switchBfsiTab'), 'Should include tab switcher handlers');
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
      'trackOrder'
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
    assert(stylesCss.includes('scroll-margin-top: 75px !important'), 'All sections must have scroll-margin-top offset');
  });

  test('Brand logo stacked multi-line text is suppressed for sleek clean single line', () => {
    assert(stylesCss.includes('display: none !important'), 'Stacked brand sub/tag must be hidden');
  });

  test('Product media image max-height is capped to 180px-190px (no huge images)', () => {
    assert(stylesCss.includes('max-height: 180px !important'), 'Product media max-height must be capped to 180px');
  });

  test('Sub-Header Portal Switcher Bar is positioned below header for clean layout', () => {
    assert(stylesCss.includes('.portal-bar'), 'styles.css must style .portal-bar');
    assert(stylesCss.includes('.portal-pills'), 'styles.css must style .portal-pills');
  });

  test('BFSI Section uses Blackish theme glassmorphism', () => {
    assert(stylesCss.includes('.bfsi-section {\n  background: radial-gradient'), 'BFSI section must have blackish radial-gradient canvas');
    assert(stylesCss.includes('backdrop-filter: blur'), 'BFSI section must implement glassmorphism backdrop-filter');
    assert(stylesCss.includes('.bfsi-section .bfsi-calculator-card {\n  background: rgba'), 'BFSI calculator card must be styled with translucent dark glass');
  });

  test('Color Themes: BFSI glassmorphism, E-Commerce lightest lavender/white, and blackish footer', () => {
    assert(stylesCss.includes('body.page-ecommerce'), 'styles.css must implement page-ecommerce lightest lavender theme');
    assert(stylesCss.includes('#FAF8FF !important'), 'E-commerce background must be lightest lavender #FAF8FF');
    assert(stylesCss.includes('.site-footer {\n  background: #090B10 !important'), 'Footer must be styled in a blackish shade for differentiation');
  });

  console.log('\n============================================================');
  console.log(`   UNIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED   `);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests().catch(err => {
  console.error('Test Suite Failed with fatal error:', err);
  process.exit(1);
});
