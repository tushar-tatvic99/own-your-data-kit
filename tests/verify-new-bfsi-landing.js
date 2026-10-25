const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n============================================================');
console.log('   VERIFYING NEW BFSI LANDING PAGE & ECOMMERCE SETUP        ');
console.log('============================================================\n');

// 1. Verify index.html (BFSI Landing Page)
const indexHtml = fs.readFileSync('index.html', 'utf8');

// A. No toggle of ecommerce / BFSI
assert(!indexHtml.includes('class="portal-bar"'), 'index.html must not contain the portal-bar toggle');
assert(!indexHtml.includes('id="portalBar"'), 'index.html must not contain portalBar');
console.log('✓ PASS: No toggle of ecommerce / BFSI in landing page');

// B. Header options: Apply loan, open savings account, Login, Home page, about us
assert(indexHtml.includes('>Home page</a>'), 'Header must contain "Home page"');
assert(indexHtml.includes('>Apply loan</a>'), 'Header must contain "Apply loan"');
assert(indexHtml.includes('>open savings account</a>'), 'Header must contain "open savings account"');
assert(indexHtml.includes('>about us</a>'), 'Header must contain "about us"');
assert(indexHtml.includes('>Login</a>'), 'Header must contain "Login"');
console.log('✓ PASS: Header contains exact required options (Home page, Apply loan, open savings account, about us, Login)');

// C. Header right side hamburger option with switch to ecommerce, login, account creation
assert(indexHtml.includes('id="bfsiHamburgerBtn"'), 'Header must contain hamburger button');
assert(indexHtml.includes('Switch to E-Commerce Account'), 'Hamburger menu must contain "Switch to E-Commerce Account"');
assert(indexHtml.includes('Account Creation'), 'Hamburger menu must contain "Account Creation"');
console.log('✓ PASS: Header right hamburger option present with required options');

// D. 3 Simple Forms on BFSI Landing Page
assert(indexHtml.includes('id="applyLoanForm"'), 'Must contain Form 1: Apply Loan');
assert(indexHtml.includes('id="btnLoanFill"'), 'Must contain Loan Fill demo button');
assert(indexHtml.includes('Apply Loan'), 'Must contain Apply Loan submit button');

assert(indexHtml.includes('id="openSavingsForm"'), 'Must contain Form 2: Open Savings Account');
assert(indexHtml.includes('id="btnSavingsFill"'), 'Must contain Savings Fill demo button');
assert(indexHtml.includes('Open Savings Account'), 'Must contain Open Savings Account submit button');

assert(indexHtml.includes('id="customerLoginForm"'), 'Must contain Form 3: Customer Login');
assert(indexHtml.includes('id="btnLoginFill"'), 'Must contain Login demo button');
assert(indexHtml.includes('Login to NetBanking'), 'Must contain Login submit button');
console.log('✓ PASS: All 3 simple forms present with demo fill & submit buttons');

// E. Footer has simple text with hyperlinks (no boxes)
assert(indexHtml.includes('class="footer-inline-links"'), 'Footer must have simple inline text links');
assert(!indexHtml.includes('footer-cta-card'), 'Footer must not have card boxes');
console.log('✓ PASS: Footer contains simple text with hyperlinks (no boxes)');

// F. Google Tag Manager and Matomo Tag Manager tags present
assert(indexHtml.includes('GTM-MMXM5L53'), 'index.html must include Google Tag Manager');
assert(indexHtml.includes('container_1Is4prw5.js'), 'index.html must include Matomo Tag Manager');
console.log('✓ PASS: Matomo and GA4 / GTM tags intact in index.html');

// 2. Verify ecommerce.html (Aura Blush Store)
const ecommerceHtml = fs.readFileSync('ecommerce.html', 'utf8');
assert(!ecommerceHtml.includes('class="portal-bar"'), 'ecommerce.html must not contain portal-bar toggle');
assert(ecommerceHtml.includes('Aura &amp; Blush'), 'ecommerce.html must feature Aura & Blush');
assert(ecommerceHtml.includes('GTM-MMXM5L53'), 'ecommerce.html must include GTM');
assert(ecommerceHtml.includes('container_1Is4prw5.js'), 'ecommerce.html must include Matomo');
console.log('✓ PASS: ecommerce.html is Aura Blush store without portal bar and with intact analytics');

// 3. Verify app.js has exactly 7 products and form handlers
const appJs = fs.readFileSync('app.js', 'utf8');

// Check products length
const pMatch = appJs.match(/const PRODUCTS = (\[[\s\S]*?\]);/);
assert(pMatch, 'app.js must define PRODUCTS');
const products = JSON.parse(pMatch[1]);
assert.strictEqual(products.length, 7, 'PRODUCTS must contain exactly 7 products');
console.log('✓ PASS: PRODUCTS array in app.js contains exactly 7 products');

// Check BFSI tracking functions
assert(appJs.includes('window.handleFormFieldInteraction'), 'app.js must define handleFormFieldInteraction');
assert(appJs.includes('window.fillLoanDemo'), 'app.js must define fillLoanDemo');
assert(appJs.includes('window.submitLoanForm'), 'app.js must define submitLoanForm');
assert(appJs.includes('window.fillSavingsDemo'), 'app.js must define fillSavingsDemo');
assert(appJs.includes('window.submitSavingsForm'), 'app.js must define submitSavingsForm');
assert(appJs.includes('window.fillLoginDemo'), 'app.js must define fillLoginDemo');
assert(appJs.includes('window.submitLoginForm'), 'app.js must define submitLoginForm');
assert(appJs.includes('loan_application_submit'), 'app.js must track loan_application_submit');
assert(appJs.includes('savings_account_submit'), 'app.js must track savings_account_submit');
assert(appJs.includes('form_interaction'), 'app.js must track form_interaction');
assert(appJs.includes('form_start'), 'app.js must track form_start');
assert(appJs.includes('form_submit'), 'app.js must track form_submit');
console.log('✓ PASS: Form interaction and custom event definitions in app.js verified');

console.log('\nAll Verification Tests PASSED 100%!\n');
