const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n============================================================');
console.log('   VERIFYING END-TO-END ANALYTICS (GA4 & MATOMO) PIPELINE   ');
console.log('============================================================\n');

// Mock browser globals
global.window = {
  dataLayer: [],
  _mtm: [],
  _paq: [],
  addEventListener: () => {}
};

// Create a DOM mock
const elements = new Map();
function createMockElement(id, tag = 'div') {
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      toggle(c) {
        if (this.classes.has(c)) { this.classes.delete(c); return false; }
        else { this.classes.add(c); return true; }
      },
      contains(c) { return this.classes.has(c); }
    },
    reset() { this.value = ''; },
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    appendChild() {},
    removeChild() {},
    remove() {},
    querySelectorAll() { return []; }
  };
  elements.set(id, el);
  return el;
}

global.document = {
  getElementById: (id) => elements.get(id) || createMockElement(id),
  querySelectorAll: () => [],
  querySelector: (sel) => {
    if (sel.startsWith('#')) return elements.get(sel.slice(1)) || createMockElement(sel.slice(1));
    return createMockElement('mock_' + Math.random());
  },
  createElement: (tag) => createMockElement('el_' + Math.random(), tag),
  addEventListener: () => {},
  readyState: 'complete'
};

// Setup elements
[
  'loanFullName', 'loanEmail', 'loanPhone', 'loanAmountInput', 'loanTypeSelect', 'loanTenureSelect', 'loanAnnualIncome',
  'applyLoanForm', 'loanSuccessBox', 'loanRefCode', 'loanEstimatedEmiText',
  'savingsFullName', 'savingsEmail', 'savingsPhone', 'savingsDepositAmount', 'savingsAccountType', 'savingsSourceFunds',
  'openSavingsForm', 'savingsSuccessBox', 'savingsRefCode',
  'loginCustomerId', 'loginPassword', 'loginRememberMe', 'customerLoginForm', 'loginSuccessBox', 'loggedInUserName',
  'bfsiHamburgerBtn', 'hamburgerMenuPanel', 'closeHamburgerBtn'
].forEach(id => createMockElement(id));

// Load app.js
require(path.join(__dirname, '..', 'app.js'));

// Test 1: Field interaction event
console.log('1. Testing form_interaction and form_start:');
window.handleFormFieldInteraction('apply_loan', 'loan_amount', 'focus');

const formStartEvt = window.dataLayer.find(e => e.event === 'form_start');
assert(formStartEvt, 'Must push form_start to dataLayer');
assert.strictEqual(formStartEvt.form_name, 'apply_loan');
console.log('   ✓ form_start GA4 event validated:', formStartEvt);

const formInteractionEvt = window.dataLayer.find(e => e.event === 'form_interaction');
assert(formInteractionEvt, 'Must push form_interaction to dataLayer');
assert.strictEqual(formInteractionEvt.field_name, 'loan_amount');
console.log('   ✓ form_interaction GA4 event validated:', formInteractionEvt);

const matomoFormStart = window._paq.find(args => args[0] === 'trackEvent' && args[2] === 'form_start');
assert(matomoFormStart, 'Must push form_start to Matomo');
console.log('   ✓ Matomo form_start event validated:', matomoFormStart);

// Test 2: Form 1 - Loan Demo Fill & Submit
console.log('\n2. Testing Form 1 (Apply Loan):');
window.fillLoanDemo();
assert.strictEqual(elements.get('loanFullName').value, 'Rahul Sharma');
assert.strictEqual(elements.get('loanAmountInput').value, '50000');
console.log('   ✓ fillLoanDemo populated fields correctly');

window.submitLoanForm();
const loanSubmitEvt = window.dataLayer.find(e => e.event === 'loan_application_submit');
assert(loanSubmitEvt, 'Must push loan_application_submit to dataLayer');
assert.strictEqual(loanSubmitEvt.loan_amount, 50000);
assert(loanSubmitEvt.estimated_monthly_emi > 0, 'Must have estimated_monthly_emi');
assert(loanSubmitEvt.application_reference_id.startsWith('INF-LOAN-'), 'Must have INF-LOAN- reference ID');
console.log('   ✓ loan_application_submit GA4 event validated:', loanSubmitEvt);

const matomoLoan = window._paq.find(args => args[0] === 'trackEvent' && args[2] === 'loan_application_submit');
assert(matomoLoan, 'Must push loan_application_submit to Matomo');
console.log('   ✓ Matomo loan_application_submit event validated:', matomoLoan);

// Test 3: Form 2 - Savings Demo Fill & Submit
console.log('\n3. Testing Form 2 (Open Savings Account):');
window.fillSavingsDemo();
assert.strictEqual(elements.get('savingsFullName').value, 'Priya Sharma');
assert.strictEqual(elements.get('savingsDepositAmount').value, '10000');
console.log('   ✓ fillSavingsDemo populated fields correctly');

window.submitSavingsForm();
const savingsSubmitEvt = window.dataLayer.find(e => e.event === 'savings_account_submit');
assert(savingsSubmitEvt, 'Must push savings_account_submit to dataLayer');
assert.strictEqual(savingsSubmitEvt.initial_deposit, 10000);
assert(savingsSubmitEvt.application_reference_id.startsWith('INF-ACC-'), 'Must have INF-ACC- reference ID');
console.log('   ✓ savings_account_submit GA4 event validated:', savingsSubmitEvt);

const matomoSavings = window._paq.find(args => args[0] === 'trackEvent' && args[2] === 'savings_account_submit');
assert(matomoSavings, 'Must push savings_account_submit to Matomo');
console.log('   ✓ Matomo savings_account_submit event validated:', matomoSavings);

// Test 4: Form 3 - Login Demo Fill & Submit
console.log('\n4. Testing Form 3 (Customer NetBanking Login):');
window.fillLoginDemo();
assert.strictEqual(elements.get('loginCustomerId').value, 'INF-984210');
console.log('   ✓ fillLoginDemo populated credentials correctly');

window.submitLoginForm();
const loginEvt = window.dataLayer.find(e => e.event === 'login');
assert(loginEvt, 'Must push login to dataLayer');
assert.strictEqual(loginEvt.method, 'netbanking_credentials');
console.log('   ✓ login GA4 event validated:', loginEvt);

const matomoLogin = window._paq.find(args => args[0] === 'trackEvent' && args[2] === 'login_submit');
assert(matomoLogin, 'Must push login_submit to Matomo');
console.log('   ✓ Matomo login_submit event validated:', matomoLogin);

console.log('\nAll End-to-End Analytics Tests PASSED 100%!\n');
process.exit(0);
