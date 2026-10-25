const fs = require('fs');
const path = require('path');

console.log('Updating app.js and styles.css...');

// 1. UPDATE app.js
let appJsContent = fs.readFileSync('app.js', 'utf8');

// Ensure PRODUCTS has exactly 7 products
const productsArrayRegex = /const PRODUCTS = \[([\s\S]*?)\];/;
const productsMatch = appJsContent.match(productsArrayRegex);

if (productsMatch) {
  try {
    // Parse or slice the items: keep p1 through p7
    const currentProducts = JSON.parse('[' + productsMatch[1].replace(/,\s*$/, '') + ']');
    const sevenProducts = currentProducts.slice(0, 7);
    const newProductsCode = 'const PRODUCTS = ' + JSON.stringify(sevenProducts, null, 2) + ';';
    appJsContent = appJsContent.replace(productsArrayRegex, newProductsCode);
    console.log(`Trimmed PRODUCTS to exactly ${sevenProducts.length} products.`);
  } catch (e) {
    console.log('Regex parsing PRODUCTS array directly...');
    // If JSON parsing fails due to trailing comma or formatting, find 7th product closing
    const p7Idx = appJsContent.indexOf('"id": "p7"');
    if (p7Idx !== -1) {
      const p8Idx = appJsContent.indexOf('{\n    "id": "p8"', p7Idx);
      if (p8Idx !== -1) {
        const p7End = appJsContent.lastIndexOf('}', p8Idx);
        const productsEnd = appJsContent.indexOf('];', p8Idx);
        if (p7End !== -1 && productsEnd !== -1) {
          appJsContent = appJsContent.substring(0, p7End + 1) + '\n];' + appJsContent.substring(productsEnd + 2);
          console.log('Trimmed PRODUCTS to p1..p7 via string index.');
        }
      }
    }
  }
}

// Add the BFSI 3 simple forms handler and tracking engine
const bfsiNewEngineCode = `
// ============================================================================
// BFSI LANDING PAGE: 3 SIMPLE FORMS INTERACTION & ANALYTICS ENGINE
// ============================================================================
const formTouchedMap = {};

window.handleFormFieldInteraction = function(formName, fieldName, interactionType) {
  // 1. Trigger form_start on first interaction
  if (!formTouchedMap[formName]) {
    formTouchedMap[formName] = true;
    const formStartPayload = {
      event: 'form_start',
      form_name: formName,
      form_id: formName === 'apply_loan' ? 'applyLoanForm' : (formName === 'open_savings' ? 'openSavingsForm' : 'customerLoginForm'),
      timestamp: new Date().toISOString()
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(formStartPayload);
    window._mtm = window._mtm || [];
    window._mtm.push(formStartPayload);
    if (window._paq && Array.isArray(window._paq)) {
      window._paq.push(['trackEvent', 'BFSI_Forms', 'form_start', formName]);
    }
  }

  // 2. Trigger form_interaction
  const interactionPayload = {
    event: 'form_interaction',
    form_name: formName,
    form_id: formName === 'apply_loan' ? 'applyLoanForm' : (formName === 'open_savings' ? 'openSavingsForm' : 'customerLoginForm'),
    field_name: fieldName,
    interaction_type: interactionType,
    timestamp: new Date().toISOString()
  };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(interactionPayload);
  window._mtm = window._mtm || [];
  window._mtm.push(interactionPayload);
  if (window._paq && Array.isArray(window._paq)) {
    window._paq.push(['trackEvent', 'BFSI_Forms', 'form_interaction', formName + '_' + fieldName + '_' + interactionType]);
  }
};

window.fillLoanDemo = function() {
  const nameEl = document.getElementById('loanFullName');
  const emailEl = document.getElementById('loanEmail');
  const phoneEl = document.getElementById('loanPhone');
  const amountEl = document.getElementById('loanAmountInput');
  const typeEl = document.getElementById('loanTypeSelect');
  const tenureEl = document.getElementById('loanTenureSelect');
  const incomeEl = document.getElementById('loanAnnualIncome');

  if (nameEl) nameEl.value = 'Rahul Sharma';
  if (emailEl) emailEl.value = 'rahul.sharma@example.com';
  if (phoneEl) phoneEl.value = '+91 98765 43210';
  if (amountEl) amountEl.value = '50000';
  if (typeEl) typeEl.value = 'Prime Home Mortgage';
  if (tenureEl) tenureEl.value = '5';
  if (incomeEl) incomeEl.value = '50k_100k';

  window.handleFormFieldInteraction('apply_loan', 'demo_autofill', 'autofill');

  if (typeof showToast === 'function') {
    showToast('⚡', 'Demo Loan Details Loaded', 'Sample loan details auto-filled.');
  }
};

window.submitLoanForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const loanType = document.getElementById('loanTypeSelect')?.value || 'Prime Home Mortgage';
  const loanAmount = parseFloat(document.getElementById('loanAmountInput')?.value) || 50000;
  const tenureYears = parseInt(document.getElementById('loanTenureSelect')?.value, 10) || 5;
  const annualIncome = document.getElementById('loanAnnualIncome')?.value || '50k_100k';
  const fullName = document.getElementById('loanFullName')?.value.trim() || 'Valued Applicant';
  const email = document.getElementById('loanEmail')?.value.trim() || '';
  const phone = document.getElementById('loanPhone')?.value.trim() || '';

  const rate = 7.65;
  const monthlyRate = (rate / 100) / 12;
  const months = tenureYears * 12;
  const emi = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1));

  const refId = 'INF-LOAN-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

  const formEl = document.getElementById('applyLoanForm');
  const successBox = document.getElementById('loanSuccessBox');
  const refCodeEl = document.getElementById('loanRefCode');
  const emiTextEl = document.getElementById('loanEstimatedEmiText');

  if (formEl) formEl.style.display = 'none';
  if (successBox) successBox.style.display = 'block';
  if (refCodeEl) refCodeEl.textContent = refId;
  if (emiTextEl) emiTextEl.innerHTML = 'Estimated Monthly EMI: <strong>$' + emi.toLocaleString() + ' / month</strong> (Tenure: ' + tenureYears + ' Years)';

  const ga4Payload = {
    event: 'loan_application_submit',
    form_name: 'apply_loan',
    form_id: 'applyLoanForm',
    loan_type: loanType,
    loan_amount: loanAmount,
    loan_tenure_years: tenureYears,
    annual_income: annualIncome,
    estimated_monthly_emi: emi,
    application_reference_id: refId,
    timestamp: new Date().toISOString()
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(ga4Payload);
  window.dataLayer.push({
    event: 'form_submit',
    form_name: 'apply_loan',
    form_id: 'applyLoanForm',
    application_reference_id: refId
  });

  window._mtm = window._mtm || [];
  window._mtm.push(ga4Payload);

  if (window._paq && Array.isArray(window._paq)) {
    window._paq.push(['trackEvent', 'BFSI_Lead', 'loan_application_submit', loanType, loanAmount]);
  }

  fetch('/api/bfsi/submit-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientName: fullName,
      clientEmail: email,
      clientPhone: phone,
      incomeBracket: annualIncome,
      purpose: 'loan_application',
      productName: loanType,
      requestedAmount: '$' + loanAmount.toLocaleString()
    })
  }).catch(() => {});

  if (typeof showToast === 'function') {
    showToast('🎉', 'Loan Application Pre-Approved', 'Reference: ' + refId);
  }
};

window.resetLoanForm = function() {
  const formEl = document.getElementById('applyLoanForm');
  const successBox = document.getElementById('loanSuccessBox');
  if (formEl) {
    formEl.reset();
    formEl.style.display = 'block';
  }
  if (successBox) successBox.style.display = 'none';
};

window.fillSavingsDemo = function() {
  const nameEl = document.getElementById('savingsFullName');
  const emailEl = document.getElementById('savingsEmail');
  const phoneEl = document.getElementById('savingsPhone');
  const amountEl = document.getElementById('savingsDepositAmount');
  const typeEl = document.getElementById('savingsAccountType');
  const sourceEl = document.getElementById('savingsSourceFunds');

  if (nameEl) nameEl.value = 'Priya Sharma';
  if (emailEl) emailEl.value = 'priya.sharma@example.com';
  if (phoneEl) phoneEl.value = '+91 98111 22334';
  if (amountEl) amountEl.value = '10000';
  if (typeEl) typeEl.value = 'High-Yield Multiplier Savings (8.45% APY)';
  if (sourceEl) sourceEl.value = 'Salaried Employment';

  window.handleFormFieldInteraction('open_savings', 'demo_autofill', 'autofill');

  if (typeof showToast === 'function') {
    showToast('⚡', 'Demo Savings Details Loaded', 'Sample savings details auto-filled.');
  }
};

window.submitSavingsForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const accountType = document.getElementById('savingsAccountType')?.value || 'High-Yield Multiplier Savings';
  const depositAmount = parseFloat(document.getElementById('savingsDepositAmount')?.value) || 10000;
  const fullName = document.getElementById('savingsFullName')?.value.trim() || 'Valued Saver';
  const email = document.getElementById('savingsEmail')?.value.trim() || '';
  const phone = document.getElementById('savingsPhone')?.value.trim() || '';
  const sourceOfFunds = document.getElementById('savingsSourceFunds')?.value || 'Salaried Employment';

  const refId = 'INF-ACC-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

  const formEl = document.getElementById('openSavingsForm');
  const successBox = document.getElementById('savingsSuccessBox');
  const refCodeEl = document.getElementById('savingsRefCode');

  if (formEl) formEl.style.display = 'none';
  if (successBox) successBox.style.display = 'block';
  if (refCodeEl) refCodeEl.textContent = refId;

  const ga4Payload = {
    event: 'savings_account_submit',
    form_name: 'open_savings',
    form_id: 'openSavingsForm',
    account_type: accountType,
    initial_deposit: depositAmount,
    source_of_funds: sourceOfFunds,
    application_reference_id: refId,
    timestamp: new Date().toISOString()
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(ga4Payload);
  window.dataLayer.push({
    event: 'form_submit',
    form_name: 'open_savings',
    form_id: 'openSavingsForm',
    application_reference_id: refId
  });

  window._mtm = window._mtm || [];
  window._mtm.push(ga4Payload);

  if (window._paq && Array.isArray(window._paq)) {
    window._paq.push(['trackEvent', 'BFSI_Lead', 'savings_account_submit', accountType, depositAmount]);
  }

  fetch('/api/bfsi/submit-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientName: fullName,
      clientEmail: email,
      clientPhone: phone,
      incomeBracket: '250k-500k',
      purpose: 'savings_account_opening',
      productName: accountType,
      requestedAmount: '$' + depositAmount.toLocaleString()
    })
  }).catch(() => {});

  if (typeof showToast === 'function') {
    showToast('🏛️', 'Savings Account Registered', 'Dossier: ' + refId);
  }
};

window.resetSavingsForm = function() {
  const formEl = document.getElementById('openSavingsForm');
  const successBox = document.getElementById('savingsSuccessBox');
  if (formEl) {
    formEl.reset();
    formEl.style.display = 'block';
  }
  if (successBox) successBox.style.display = 'none';
};

window.fillLoginDemo = function() {
  const idEl = document.getElementById('loginCustomerId');
  const pwdEl = document.getElementById('loginPassword');
  if (idEl) idEl.value = 'INF-984210';
  if (pwdEl) pwdEl.value = 'SecurityPass#2026';

  window.handleFormFieldInteraction('customer_login', 'demo_autofill', 'autofill');

  if (typeof showToast === 'function') {
    showToast('⚡', 'Demo Credentials Loaded', 'Verified client credentials filled.');
  }
};

window.submitLoginForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const customerId = document.getElementById('loginCustomerId')?.value.trim() || 'INF-984210';
  const formEl = document.getElementById('customerLoginForm');
  const successBox = document.getElementById('loginSuccessBox');

  if (formEl) formEl.style.display = 'none';
  if (successBox) successBox.style.display = 'block';

  const ga4Payload = {
    event: 'login',
    method: 'netbanking_credentials',
    form_name: 'customer_login',
    form_id: 'customerLoginForm',
    timestamp: new Date().toISOString()
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(ga4Payload);
  window.dataLayer.push({
    event: 'login_submit',
    form_name: 'customer_login',
    form_id: 'customerLoginForm',
    login_status: 'success'
  });
  window.dataLayer.push({
    event: 'form_submit',
    form_name: 'customer_login',
    form_id: 'customerLoginForm'
  });

  window._mtm = window._mtm || [];
  window._mtm.push(ga4Payload);

  if (window._paq && Array.isArray(window._paq)) {
    window._paq.push(['trackEvent', 'BFSI_Auth', 'login_submit', 'netbanking_credentials']);
  }

  if (typeof showToast === 'function') {
    showToast('🔐', 'NetBanking Login Successful', 'Welcome back, Lord Alistair Vance');
  }
};

window.logoutCustomer = function() {
  const formEl = document.getElementById('customerLoginForm');
  const successBox = document.getElementById('loginSuccessBox');
  if (formEl) {
    formEl.reset();
    formEl.style.display = 'block';
  }
  if (successBox) successBox.style.display = 'none';

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'logout', method: 'netbanking' });
  if (window._paq && Array.isArray(window._paq)) {
    window._paq.push(['trackEvent', 'BFSI_Auth', 'logout', 'netbanking']);
  }

  if (typeof showToast === 'function') {
    showToast('🔒', 'Session Ended', 'You have been securely logged out.');
  }
};

function initBfsiHamburgerAndNav() {
  const hamburgerBtn = document.getElementById('bfsiHamburgerBtn');
  const menuPanel = document.getElementById('hamburgerMenuPanel');
  const closeBtn = document.getElementById('closeHamburgerBtn');

  if (hamburgerBtn && menuPanel) {
    hamburgerBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = menuPanel.classList.toggle('active');
      hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'hamburger_toggle',
        menu_state: isOpen ? 'open' : 'closed',
        timestamp: new Date().toISOString()
      });
      if (window._paq && Array.isArray(window._paq)) {
        window._paq.push(['trackEvent', 'Navigation', 'hamburger_toggle', isOpen ? 'open' : 'closed']);
      }
    });

    closeBtn?.addEventListener('click', function() {
      menuPanel.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', function(e) {
      if (!menuPanel.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        menuPanel.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    menuPanel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        menuPanel.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const ecomSwitchLinks = document.querySelectorAll('#switchEcommerceHamburger, #footerSwitchEcom');
  ecomSwitchLinks.forEach(link => {
    link.addEventListener('click', function() {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'portal_switch',
        source_portal: 'bfsi',
        destination_portal: 'ecommerce',
        timestamp: new Date().toISOString()
      });
      if (window._paq && Array.isArray(window._paq)) {
        window._paq.push(['trackEvent', 'Navigation', 'portal_switch', 'to_ecommerce']);
      }
    });
  });
}
`;

// Insert bfsiNewEngineCode before initApp using a replacer function to avoid $' pattern
if (!appJsContent.includes('initBfsiHamburgerAndNav')) {
  appJsContent = appJsContent.replace('function initApp() {', () => bfsiNewEngineCode + '\nfunction initApp() {\n  try { initBfsiHamburgerAndNav(); } catch(e) { console.error(e); }');
}

// 2. APPEND CSS STYLES TO styles.css
let stylesCssContent = fs.readFileSync('styles.css', 'utf8');

const bfsiNewStyles = `
/* =========================================================================
   CLEAN BFSI LANDING PAGE, HAMBURGER & 3 SIMPLE FORMS STYLES
   ========================================================================= */

.bfsi-clean-header {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.hamburger-toggle-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e293b;
  transition: all 0.2s ease;
}

.hamburger-toggle-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.hamburger-menu-panel {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 16px;
  width: 290px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  overflow: hidden;
}

.hamburger-menu-panel.active {
  display: block;
  animation: fadeInDownMenu 0.2s ease;
}

@keyframes fadeInDownMenu {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.hamburger-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.hamburger-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.hamburger-close-btn {
  background: none;
  border: none;
  font-size: 1rem;
  color: #94a3b8;
  cursor: pointer;
}

.hamburger-options-list {
  padding: 8px 0;
}

.hamburger-option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  text-decoration: none;
  color: #1e293b;
  transition: background 0.15s ease;
}

.hamburger-option-item:hover {
  background: #f1f5f9;
}

.hamburger-option-item.highlight-ecom {
  background: #f0fdf4;
  border-left: 3px solid #10b981;
}

.hamburger-option-item.highlight-ecom:hover {
  background: #dcfce7;
}

.option-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.option-text strong {
  display: block;
  font-size: 0.88rem;
  color: #0f172a;
}

.option-text small {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
}

.simple-bfsi-hero {
  padding: 44px 16px 28px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.simple-hero-badge {
  display: inline-block;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.simple-hero-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 10px;
}

.simple-hero-subtitle {
  font-size: 1rem;
  color: #64748b;
  max-width: 680px;
  margin: 0 auto 20px;
  line-height: 1.5;
}

.simple-hero-quicklinks {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.simple-forms-container {
  padding: 40px 16px;
  background: #f8fafc;
}

.bfsi-simple-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
  margin-bottom: 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  scroll-margin-top: 80px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.card-top-header {
  margin-bottom: 20px;
}

.card-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #4f46e5;
  background: #eef2ff;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.card-heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.card-subtext {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.bfsi-form-clean {
  margin-top: 16px;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.92rem;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.form-actions-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.form-actions-row .btn {
  flex: 1;
  min-width: 160px;
  height: 44px;
  font-size: 0.92rem;
  font-weight: 600;
}

.form-success-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  margin-top: 16px;
}

.form-success-box .success-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.form-success-box h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #166534;
  margin-bottom: 6px;
}

.form-success-box p {
  font-size: 0.88rem;
  color: #15803d;
  margin-bottom: 12px;
}

.ref-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #86efac;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #166534;
  margin-bottom: 14px;
}

.ref-pill strong {
  font-family: monospace;
  font-size: 1rem;
  color: #047857;
}

.estimated-detail {
  font-size: 0.95rem;
  color: #1e293b;
  margin-bottom: 14px;
}

.about-points-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.about-point-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.about-point-item .about-icon {
  font-size: 1.5rem;
  margin-bottom: 8px;
  display: block;
}

.about-point-item h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.about-point-item p {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.simple-bfsi-footer {
  background: #0f172a;
  color: #f8fafc;
  padding: 40px 16px 24px;
}

.footer-3-ctas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.footer-cta-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 16px;
  text-decoration: none;
  color: #ffffff;
  transition: all 0.2s ease;
}

.footer-cta-card:hover {
  background: #334155;
  transform: translateY(-2px);
}

.footer-cta-card.highlight-ecom-cta {
  background: #064e3b;
  border-color: #059669;
}

.footer-cta-card.highlight-ecom-cta:hover {
  background: #047857;
}

.cta-emoji {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.cta-info {
  flex: 1;
}

.cta-info strong {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 2px;
}

.cta-info span {
  display: block;
  font-size: 0.78rem;
  color: #94a3b8;
}

.cta-arrow {
  font-size: 1.2rem;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.footer-cta-card:hover .cta-arrow {
  transform: translateX(4px);
  color: #ffffff;
}

.footer-bottom-line {
  text-align: center;
  border-top: 1px solid #334155;
  padding-top: 20px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.footer-bottom-line p {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
}
`;

if (!stylesCssContent.includes('CLEAN BFSI LANDING PAGE, HAMBURGER & 3 SIMPLE FORMS STYLES')) {
  stylesCssContent += '\n' + bfsiNewStyles;
}

// Write to targets
const targets = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targets.forEach(dir => {
  const appPath = path.join(dir, 'app.js');
  const cssPath = path.join(dir, 'styles.css');

  if (fs.existsSync(appPath)) {
    fs.writeFileSync(appPath, appJsContent, 'utf8');
    console.log('Updated app.js in ' + dir);
  }
  if (fs.existsSync(cssPath)) {
    fs.writeFileSync(cssPath, stylesCssContent, 'utf8');
    console.log('Updated styles.css in ' + dir);
  }
});

console.log('Update complete.');
