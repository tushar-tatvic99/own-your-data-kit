const fs = require('fs');
const path = require('path');

// 1. UPDATE app.js
function getNewBfsiEngineCode() {
  return `
// ============================================================================
// INFINITY BANK - EXPLORE BFSI INTERACTIVE ENGINE & REALISTIC BANKING FORMS
// ============================================================================
window.activeFdMonths = 36;
window.activeFdRate = 8.45;
window.activeLoanRate = 7.65;
window.activeLoanType = 'Prime Home Mortgage';
window.activeInsuranceName = 'Executive Shield';
window.activeInsuranceCoverage = '$2,000,000 Coverage';
window.activeInsurancePremium = '$185 / month';

function getAmountTier(num) {
  if (num < 50000) return 'under_50k';
  if (num <= 100000) return '50k_to_100k';
  if (num <= 250000) return '100k_to_250k';
  if (num <= 500000) return '250k_to_500k';
  if (num <= 1000000) return '500k_to_1M';
  return '1M_plus';
}

function pushBfsiGA4(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];
  const eventPayload = {
    event: eventName,
    institution: 'Infinity Bank',
    timestamp: new Date().toISOString(),
    ...params
  };
  window.dataLayer.push(eventPayload);

  // Push to Matomo Tag Manager (MTM)
  window._mtm = window._mtm || [];
  window._mtm.push(eventPayload);

  // Also push to Matomo for dual-tracking
  if (window._paq && Array.isArray(window._paq)) {
    window._paq.push(['trackEvent', 'BFSI', eventName, params.financial_product_name || params.financial_category || '', params.financial_amount || 0]);
  }
}

// Global BFSI Category Tab Switcher
window.switchBfsiTab = function(target) {
  const bfsiTabs = document.querySelectorAll('#bfsiCategoryTabs .bfsi-tab');
  const bfsiPanels = {
    wealth: document.getElementById('bfsiPanelWealth'),
    lending: document.getElementById('bfsiPanelLending'),
    cards: document.getElementById('bfsiPanelCards'),
    insurance: document.getElementById('bfsiPanelInsurance')
  };

  bfsiTabs.forEach(t => {
    const isTarget = t.getAttribute('data-bfsi-target') === target;
    t.classList.toggle('active', isTarget);
  });

  Object.keys(bfsiPanels).forEach(key => {
    if (bfsiPanels[key]) {
      const isMatch = (key === target);
      bfsiPanels[key].classList.toggle('active', isMatch);
      bfsiPanels[key].style.display = isMatch ? 'block' : 'none';
    }
  });

  pushBfsiGA4('select_financial_category', {
    financial_category: target,
    action_type: 'tab_navigation'
  });
};

// Global High-Yield Fixed Deposit & Wealth Yield Calculator
let fdDebounceTimer = null;
window.calculateFd = function() {
  const fdAmountRange = document.getElementById('fdAmountRange');
  const fdAmountVal = document.getElementById('fdAmountVal');
  const fdMaturityTotal = document.getElementById('fdMaturityTotal');
  const fdInterestGain = document.getElementById('fdInterestGain');
  const fdMonthlyEquivalent = document.getElementById('fdMonthlyEquivalent');

  if (!fdAmountRange) return;
  const principal = parseFloat(fdAmountRange.value) || 100000;
  if (fdAmountVal) fdAmountVal.textContent = \`$\${principal.toLocaleString()}\`;

  const payoutMode = document.querySelector('input[name="fdPayout"]:checked')?.value || 'compounded';
  const years = (window.activeFdMonths || 36) / 12;
  const rate = window.activeFdRate || 8.45;
  let maturity = principal;
  let interest = 0;

  if (payoutMode === 'compounded') {
    // Monthly compounding: A = P * (1 + r/12)^(12*t)
    const r = rate / 100;
    maturity = principal * Math.pow(1 + r / 12, 12 * years);
    interest = maturity - principal;
  } else {
    // Simple annual interest paid monthly
    interest = principal * (rate / 100) * years;
    maturity = principal + interest;
  }

  const monthlyEq = interest / (window.activeFdMonths || 36);

  if (fdMaturityTotal) fdMaturityTotal.textContent = \`$\${Math.round(maturity).toLocaleString()}\`;
  if (fdInterestGain) fdInterestGain.textContent = \`+$\${Math.round(interest).toLocaleString()}\`;
  if (fdMonthlyEquivalent) fdMonthlyEquivalent.textContent = \`$\${Math.round(monthlyEq).toLocaleString()} / mo\`;

  // Debounced API call for analytics and server verification
  clearTimeout(fdDebounceTimer);
  fdDebounceTimer = setTimeout(() => {
    fetch('/api/bfsi/calculate-yield', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal, months: window.activeFdMonths || 36, rate, payout: payoutMode })
    })
    .then(r => r.json())
    .then(d => {
      if (d.dataLayer) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(d.dataLayer);
        window._mtm = window._mtm || [];
        window._mtm.push(d.dataLayer);
      }
    })
    .catch(() => {
      pushBfsiGA4('calculate_fd_yield', {
        financial_product_name: 'Infinite High-Yield Multiplier Deposit',
        financial_category: 'wealth_management',
        calculation_type: 'fd_yield',
        tenure_range: \`\${window.activeFdMonths || 36}_months\`,
        financial_amount: principal,
        financial_amount_tier: getAmountTier(principal),
        interest_rate_apy: rate
      });
    });
  }, 400);
};

// Global Tenure Setter
window.setFdTenure = function(months, rate, btnEl) {
  window.activeFdMonths = parseInt(months, 10) || 36;
  window.activeFdRate = parseFloat(rate) || 8.45;
  document.querySelectorAll('#fdTenurePills .tenure-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  const apyEl = document.getElementById('fdApyDisplay');
  if (apyEl) apyEl.textContent = \`\${window.activeFdRate.toFixed(2)}% APY\`;
  window.calculateFd();

  pushBfsiGA4('select_tenure_option', {
    financial_product_name: 'Infinite High-Yield Multiplier Deposit',
    financial_category: 'wealth_management',
    tenure_range: \`\${window.activeFdMonths}_months\`,
    interest_rate_apy: window.activeFdRate
  });
};

// Global Payout Setter
window.setFdPayout = function(mode, inputEl) {
  document.querySelectorAll('#fdPayoutOptions .radio-chip').forEach(c => c.classList.remove('active'));
  inputEl?.closest('.radio-chip')?.classList.add('active');
  window.calculateFd();
};

// Global Smart Lending Calculator
let loanDebounceTimer = null;
window.calculateLoan = function() {
  const loanAmountRange = document.getElementById('loanAmountRange');
  const loanAmountVal = document.getElementById('loanAmountVal');
  const loanYearsRange = document.getElementById('loanYearsRange');
  const loanYearsVal = document.getElementById('loanYearsVal');
  const loanMonthlyEmi = document.getElementById('loanMonthlyEmi');
  const loanTotalInterest = document.getElementById('loanTotalInterest');
  const loanTotalPayable = document.getElementById('loanTotalPayable');

  if (!loanAmountRange || !loanYearsRange) return;
  const principal = parseFloat(loanAmountRange.value) || 350000;
  const years = parseInt(loanYearsRange.value, 10) || 15;
  const rate = window.activeLoanRate || 7.65;

  if (loanAmountVal) loanAmountVal.textContent = \`$\${principal.toLocaleString()}\`;
  if (loanYearsVal) loanYearsVal.textContent = \`\${years} Years\`;

  const monthlyRate = (rate / 100) / 12;
  const totalMonths = years * 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const totalPayment = emi * totalMonths;
  const totalInterest = totalPayment - principal;

  if (loanMonthlyEmi) loanMonthlyEmi.textContent = \`$\${Math.round(emi).toLocaleString()} / mo\`;
  if (loanTotalInterest) loanTotalInterest.textContent = \`$\${Math.round(totalInterest).toLocaleString()}\`;
  if (loanTotalPayable) loanTotalPayable.textContent = \`$\${Math.round(totalPayment).toLocaleString()}\`;

  clearTimeout(loanDebounceTimer);
  loanDebounceTimer = setTimeout(() => {
    fetch('/api/bfsi/calculate-emi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal, years, rate, loanType: window.activeLoanType || 'Prime Home Mortgage' })
    })
    .then(r => r.json())
    .then(d => {
      if (d.dataLayer) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(d.dataLayer);
        window._mtm = window._mtm || [];
        window._mtm.push(d.dataLayer);
      }
    })
    .catch(() => {
      pushBfsiGA4('calculate_loan_emi', {
        financial_product_name: window.activeLoanType || 'Prime Home Mortgage',
        financial_category: 'retail_lending',
        calculation_type: 'loan_emi',
        tenure_range: \`\${years}_years\`,
        financial_amount: principal,
        financial_amount_tier: getAmountTier(principal),
        interest_rate_apr: rate
      });
    });
  }, 400);
};

// Global Loan Type Setter
window.setLoanType = function(type, rate, btnEl) {
  window.activeLoanType = type;
  window.activeLoanRate = parseFloat(rate) || 7.65;
  document.querySelectorAll('#loanTypePills .tenure-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  const rateEl = document.getElementById('loanRateDisplay');
  if (rateEl) rateEl.textContent = \`\${window.activeLoanRate.toFixed(2)}% Fixed APR\`;
  window.calculateLoan();

  pushBfsiGA4('select_loan_structure', {
    financial_product_name: type,
    financial_category: 'retail_lending',
    interest_rate_apr: window.activeLoanRate
  });
};

// Global Insurance Tier Setter
window.setInsuranceTier = function(coverage, premium, name, boxEl) {
  window.activeInsuranceName = name;
  window.activeInsuranceCoverage = \`$\${parseInt(coverage, 10).toLocaleString()} Coverage\`;
  window.activeInsurancePremium = \`$\${premium} / month\`;

  document.querySelectorAll('.insurance-tier-box').forEach(b => b.classList.remove('active'));
  if (boxEl) boxEl.classList.add('active');

  const covEl = document.getElementById('insSelectedCoverage');
  const premEl = document.getElementById('insSelectedPremium');
  if (covEl) covEl.textContent = \`$\${parseInt(coverage, 10).toLocaleString()}\`;
  if (premEl) premEl.textContent = \`$\${premium} / mo\`;

  pushBfsiGA4('select_insurance_tier', {
    financial_product_name: name,
    financial_category: 'insurance',
    insurance_coverage_amount: parseFloat(coverage),
    monthly_premium: parseFloat(premium)
  });
};

// Open Insurance Modal
window.openInsuranceModal = function() {
  const activeIns = document.querySelector('.insurance-tier-box.active');
  const insName = activeIns ? activeIns.querySelector('.ins-name')?.textContent : (window.activeInsuranceName || 'Executive Sovereign Asset Shield');
  const insCov = activeIns ? activeIns.querySelector('.ins-coverage')?.textContent : (window.activeInsuranceCoverage || '$2,000,000 Coverage');
  window.openBfsiModal(insName, insCov);
};

// Global Realistic BFSI Modal Handlers
window.openBfsiModal = function(productName, defaultAmount) {
  const bfsiApplyModal = document.getElementById('bfsiApplyModal');
  const bfsiModalProductTitle = document.getElementById('bfsiModalProductTitle');
  const bfsiSelectedProduct = document.getElementById('bfsiSelectedProduct');
  const bfsiSelectedBadge = document.getElementById('bfsiSelectedBadge');
  const bfsiAmountField = document.getElementById('bfsiAmountField');
  const bfsiApplicationForm = document.getElementById('bfsiApplicationForm');
  const bfsiSuccessBox = document.getElementById('bfsiSuccessBox');

  if (!bfsiApplyModal) return;
  const pName = productName || 'Infinite Wealth Solution';
  if (bfsiModalProductTitle) bfsiModalProductTitle.textContent = pName;
  if (bfsiSelectedProduct) bfsiSelectedProduct.value = pName;
  if (bfsiSelectedBadge) bfsiSelectedBadge.textContent = pName;

  if (bfsiAmountField) {
    if (defaultAmount) {
      bfsiAmountField.value = defaultAmount;
    } else if (pName.toLowerCase().includes('deposit')) {
      const val = document.getElementById('fdAmountVal')?.textContent;
      bfsiAmountField.value = val || '$100,000';
    } else if (pName.toLowerCase().includes('loan') || pName.toLowerCase().includes('mortgage') || pName.toLowerCase().includes('facility')) {
      const val = document.getElementById('loanAmountVal')?.textContent;
      bfsiAmountField.value = val || '$350,000';
    } else if (pName.toLowerCase().includes('card')) {
      bfsiAmountField.value = '$50,000 Revolving Line';
    } else {
      bfsiAmountField.value = '$2,000,000 Coverage';
    }
  }

  if (bfsiApplicationForm) bfsiApplicationForm.style.display = 'block';
  if (bfsiSuccessBox) bfsiSuccessBox.style.display = 'none';

  bfsiApplyModal.classList.add('active');

  pushBfsiGA4('financial_lead_start', {
    financial_product_name: pName,
    financial_category: pName.toLowerCase().includes('card') ? 'credit_cards' : (pName.toLowerCase().includes('deposit') ? 'wealth_management' : 'retail_lending')
  });
};

window.openLeadModal = function(desk, category, defaultAmount) {
  window.openBfsiModal(\`\${desk} - \${category}\`, defaultAmount);
};

window.closeBfsiModal = function() {
  const bfsiApplyModal = document.getElementById('bfsiApplyModal');
  if (bfsiApplyModal) bfsiApplyModal.classList.remove('active');
};

window.fillBfsiDemo = function() {
  const nameEl = document.getElementById('bfsiClientName');
  const emailEl = document.getElementById('bfsiClientEmail');
  const phoneEl = document.getElementById('bfsiClientPhone');
  if (nameEl) nameEl.value = 'Lord Alistair Vance';
  if (emailEl) emailEl.value = 'alistair.vance@sovereign-holdings.ch';
  if (phoneEl) phoneEl.value = '+41 22 819 4500';
  if (typeof showToast === 'function') {
    showToast('✨', 'Demo Details Filled', 'Verified applicant details auto-filled.');
  }
};

window.submitBfsiLead = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const clientName = document.getElementById('bfsiClientName')?.value.trim() || 'Valued Client';
  const clientEmail = document.getElementById('bfsiClientEmail')?.value.trim() || '';
  const clientPhone = document.getElementById('bfsiClientPhone')?.value.trim() || '';
  const incomeBracket = document.getElementById('bfsiIncomeBracket')?.value || '250k-500k';
  const purpose = document.getElementById('bfsiAccountPurpose')?.value || 'yield_maximization';
  const productName = document.getElementById('bfsiSelectedProduct')?.value || 'Infinite Wealth Solution';
  const requestedAmount = document.getElementById('bfsiAmountField')?.value || '$100,000';
  const bfsiApplicationForm = document.getElementById('bfsiApplicationForm');
  const bfsiSuccessBox = document.getElementById('bfsiSuccessBox');
  const bfsiRefCode = document.getElementById('bfsiRefCode');

  fetch('/api/bfsi/submit-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientName, clientEmail, clientPhone, incomeBracket, purpose, productName, requestedAmount })
  })
  .then(r => r.json())
  .then(d => {
    const refId = d.referenceId || \`INF-BFSI-\${new Date().getFullYear()}-\${Math.floor(10000 + Math.random() * 90000)}\`;
    if (bfsiRefCode) bfsiRefCode.textContent = refId;
    if (bfsiApplicationForm) bfsiApplicationForm.style.display = 'none';
    if (bfsiSuccessBox) bfsiSuccessBox.style.display = 'block';

    if (d.dataLayer) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(d.dataLayer);
      window._mtm = window._mtm || [];
      window._mtm.push(d.dataLayer);
    }

    if (typeof showToast === 'function') {
      showToast('🏛️', 'Application Approved & Logged', \`Reference Ticket: \${refId}\`);
    }
  })
  .catch(() => {
    const refId = \`INF-BFSI-\${new Date().getFullYear()}-\${Math.floor(10000 + Math.random() * 90000)}\`;
    if (bfsiRefCode) bfsiRefCode.textContent = refId;
    if (bfsiApplicationForm) bfsiApplicationForm.style.display = 'none';
    if (bfsiSuccessBox) bfsiSuccessBox.style.display = 'block';

    pushBfsiGA4('financial_lead_submitted', {
      financial_product_name: productName,
      financial_category: productName.toLowerCase().includes('card') ? 'credit_cards' : (productName.toLowerCase().includes('deposit') ? 'wealth_management' : 'retail_lending'),
      customer_income_bracket: incomeBracket,
      primary_financial_objective: purpose,
      application_reference_id: refId
    });

    if (typeof showToast === 'function') {
      showToast('🏛️', 'Application Logged', \`Reference Ticket: \${refId}\`);
    }
  });
};

function initBfsiEngine() {
  // Direct Event Listeners for Sliders & Elements
  const fdAmountRange = document.getElementById('fdAmountRange');
  if (fdAmountRange) {
    fdAmountRange.addEventListener('input', window.calculateFd);
    fdAmountRange.addEventListener('change', window.calculateFd);
  }

  const loanAmountRange = document.getElementById('loanAmountRange');
  const loanYearsRange = document.getElementById('loanYearsRange');
  if (loanAmountRange) {
    loanAmountRange.addEventListener('input', window.calculateLoan);
    loanAmountRange.addEventListener('change', window.calculateLoan);
  }
  if (loanYearsRange) {
    loanYearsRange.addEventListener('input', window.calculateLoan);
    loanYearsRange.addEventListener('change', window.calculateLoan);
  }

  // Hook button clicks as fallback
  document.getElementById('btnLockDeposit')?.addEventListener('click', () => {
    window.openBfsiModal('Infinite High-Yield Multiplier Deposit');
  });

  document.getElementById('btnCheckLoanOffer')?.addEventListener('click', () => {
    window.openBfsiModal(window.activeLoanType || 'Prime Home Mortgage');
  });

  document.getElementById('btnApplyInsurance')?.addEventListener('click', () => {
    window.openInsuranceModal();
  });

  document.querySelectorAll('.btn-apply-card').forEach(btn => {
    btn.addEventListener('click', function() {
      const p = this.getAttribute('data-bfsi-product') || 'Infinity Black Titanium Card';
      window.openBfsiModal(p);
    });
  });

  const bfsiApplyModal = document.getElementById('bfsiApplyModal');
  const closeBfsiModalBtn = document.getElementById('closeBfsiModalBtn');
  const btnDoneBfsiModal = document.getElementById('btnDoneBfsiModal');
  const btnFillBfsiDemo = document.getElementById('btnFillBfsiDemo');
  const bfsiApplicationForm = document.getElementById('bfsiApplicationForm');

  closeBfsiModalBtn?.addEventListener('click', window.closeBfsiModal);
  btnDoneBfsiModal?.addEventListener('click', window.closeBfsiModal);
  btnFillBfsiDemo?.addEventListener('click', window.fillBfsiDemo);
  bfsiApplyModal?.addEventListener('click', (e) => {
    if (e.target === bfsiApplyModal) window.closeBfsiModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeBfsiModal();
  });

  if (bfsiApplicationForm) {
    bfsiApplicationForm.addEventListener('submit', window.submitBfsiLead);
  }

  // Initialize initial calculations
  window.calculateFd();
  window.calculateLoan();
}
`;
}

function updateAppJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace initBfsiEngine and related code
  const startMarker = '// ============================================================================\n// INFINITY BANK - EXPLORE BFSI INTERACTIVE ENGINE & REALISTIC BANKING FORMS';
  const endMarker = '// ================= MOBILE NAVIGATION TOGGLE =================';

  if (content.includes(startMarker) && content.includes(endMarker)) {
    const before = content.split(startMarker)[0];
    const after = content.split(endMarker)[1];
    content = before + getNewBfsiEngineCode().trim() + '\n\n' + endMarker + after;
  } else {
    console.error('Markers not found in', filePath);
    return;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated app.js at', filePath);
}

// 2. UPDATE bfsi.html with interactive inline bindings
function updateBfsiHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. fdAmountRange inline handlers
  html = html.replace(
    /<input type="range" class="bfsi-range-slider" id="fdAmountRange"[^>]*>/,
    '<input type="range" class="bfsi-range-slider" id="fdAmountRange" min="10000" max="1000000" step="5000" value="100000" oninput="calculateFd()" onchange="calculateFd()">'
  );

  // 2. Tenure pills onclick
  html = html.replace(
    /<div class="tenure-pills" id="fdTenurePills">[\s\S]*?<\/div>/,
    `<div class="tenure-pills" id="fdTenurePills">
                <button type="button" class="tenure-btn" data-months="12" data-rate="7.25" onclick="setFdTenure(12, 7.25, this)">12 Months (7.25%)</button>
                <button type="button" class="tenure-btn" data-months="24" data-rate="7.80" onclick="setFdTenure(24, 7.80, this)">24 Months (7.80%)</button>
                <button type="button" class="tenure-btn active" data-months="36" data-rate="8.45" onclick="setFdTenure(36, 8.45, this)">36 Months (8.45%)</button>
                <button type="button" class="tenure-btn" data-months="60" data-rate="8.90" onclick="setFdTenure(60, 8.90, this)">60 Months (8.90%)</button>
              </div>`
  );

  // 3. Payout radios onchange
  html = html.replace(
    /<div class="payout-options" id="fdPayoutOptions">[\s\S]*?<\/div>/,
    `<div class="payout-options" id="fdPayoutOptions">
                <label class="radio-chip active">
                  <input type="radio" name="fdPayout" value="compounded" checked onchange="setFdPayout('compounded', this)">
                  <span>Reinvest &amp; Compound at Maturity</span>
                </label>
                <label class="radio-chip">
                  <input type="radio" name="fdPayout" value="monthly" onchange="setFdPayout('monthly', this)">
                  <span>Monthly Interest Payout</span>
                </label>
              </div>`
  );

  // 4. Lock deposit button
  html = html.replace(
    /<button type="button" class="btn btn-primary btn-block" id="btnLockDeposit"[^>]*>/,
    '<button type="button" class="btn btn-primary btn-block" id="btnLockDeposit" data-bfsi-product="Infinite High-Yield Multiplier Deposit" onclick="openBfsiModal(\'Infinite High-Yield Multiplier Deposit\')">'
  );

  // 5. Loan type pills
  html = html.replace(
    /<div class="tenure-pills" id="loanTypePills">[\s\S]*?<\/div>/,
    `<div class="tenure-pills" id="loanTypePills">
                <button type="button" class="tenure-btn active" data-loan-type="home" data-rate="7.65" onclick="setLoanType('Prime Home Mortgage', 7.65, this)">Prime Home Mortgage (7.65%)</button>
                <button type="button" class="tenure-btn" data-loan-type="enterprise" data-rate="8.95" onclick="setLoanType('Private Enterprise Credit', 8.95, this)">Private Enterprise Credit (8.95%)</button>
                <button type="button" class="tenure-btn" data-loan-type="personal" data-rate="9.85" onclick="setLoanType('Executive Personal Line', 9.85, this)">Executive Personal Line (9.85%)</button>
              </div>`
  );

  // 6. Loan sliders
  html = html.replace(
    /<input type="range" class="bfsi-range-slider" id="loanAmountRange"[^>]*>/,
    '<input type="range" class="bfsi-range-slider" id="loanAmountRange" min="50000" max="2500000" step="25000" value="350000" oninput="calculateLoan()" onchange="calculateLoan()">'
  );
  html = html.replace(
    /<input type="range" class="bfsi-range-slider" id="loanYearsRange"[^>]*>/,
    '<input type="range" class="bfsi-range-slider" id="loanYearsRange" min="5" max="30" step="1" value="15" oninput="calculateLoan()" onchange="calculateLoan()">'
  );

  // 7. Check loan offer button
  html = html.replace(
    /<button type="button" class="btn btn-primary btn-block" id="btnCheckLoanOffer"[^>]*>/,
    '<button type="button" class="btn btn-primary btn-block" id="btnCheckLoanOffer" data-bfsi-product="Prime Wealth Lending Facility" onclick="openBfsiModal(window.activeLoanType || \'Prime Home Mortgage\')">'
  );

  // 8. Insurance tiers
  html = html.replace(
    /<div class="insurance-tiers-grid">[\s\S]*?<\/div>\s*<div class="calc-guarantee-note"/,
    `<div class="insurance-tiers-grid">
              <div class="insurance-tier-box active" data-coverage="2000000" data-premium="185" onclick="setInsuranceTier(2000000, 185, 'Executive Shield', this)">
                <span class="ins-name">Executive Shield</span>
                <span class="ins-coverage">$2,000,000 Coverage</span>
                <span class="ins-rate">$185 / month</span>
              </div>
              <div class="insurance-tier-box" data-coverage="5000000" data-premium="395" onclick="setInsuranceTier(5000000, 395, 'Family Sovereign', this)">
                <span class="ins-name">Family Sovereign</span>
                <span class="ins-coverage">$5,000,000 Coverage</span>
                <span class="ins-rate">$395 / month</span>
              </div>
              <div class="insurance-tier-box" data-coverage="10000000" data-premium="740" onclick="setInsuranceTier(10000000, 740, 'Ultra-High Net Worth', this)">
                <span class="ins-name">Ultra-High Net Worth</span>
                <span class="ins-coverage">$10,000,000+ Coverage</span>
                <span class="ins-rate">$740 / month</span>
              </div>
            </div>

            <div class="calc-guarantee-note"`
  );

  // 9. Insurance button
  html = html.replace(
    /<button type="button" class="btn btn-primary btn-block" id="btnApplyInsurance"[^>]*>/,
    '<button type="button" class="btn btn-primary btn-block" id="btnApplyInsurance" data-bfsi-product="Executive Sovereign Asset Shield" onclick="openInsuranceModal()">'
  );

  // 10. Card apply buttons
  html = html.replace(
    /<button type="button" class="btn btn-primary btn-block btn-apply-card" data-bfsi-product="Infinity Black Titanium Card"[^>]*>/,
    '<button type="button" class="btn btn-primary btn-block btn-apply-card" data-bfsi-product="Infinity Black Titanium Card" data-bfsi-tier="titanium" onclick="openBfsiModal(\'Infinity Black Titanium Card\', \'$50,000 Revolving Line\')">'
  );
  html = html.replace(
    /<button type="button" class="btn btn-primary btn-block btn-apply-card" data-bfsi-product="Sovereign Privilege Checking Account"[^>]*>/,
    '<button type="button" class="btn btn-primary btn-block btn-apply-card" data-bfsi-product="Sovereign Privilege Checking Account" data-bfsi-tier="sovereign" onclick="openBfsiModal(\'Sovereign Privilege Checking Account\', \'$100,000 Minimum Balance\')">'
  );
  html = html.replace(
    /<button type="button" class="btn btn-primary btn-block btn-apply-card" data-bfsi-product="Horizon Treasury Institutional Fund"[^>]*>/,
    '<button type="button" class="btn btn-primary btn-block btn-apply-card" data-bfsi-product="Horizon Treasury Institutional Fund" data-bfsi-tier="horizon" onclick="openBfsiModal(\'Horizon Treasury Institutional Fund\', \'$250,000 Initial Allocation\')">'
  );

  // 11. Modal form submission & buttons
  html = html.replace(
    /<form class="bfsi-form" id="bfsiApplicationForm">/,
    '<form class="bfsi-form" id="bfsiApplicationForm" onsubmit="submitBfsiLead(event)">'
  );
  html = html.replace(
    /<button type="button" class="bfsi-modal-close" id="closeBfsiModalBtn"[^>]*>/,
    '<button type="button" class="bfsi-modal-close" id="closeBfsiModalBtn" onclick="closeBfsiModal()" aria-label="Close modal">'
  );
  html = html.replace(
    /<button type="button" class="btn btn-primary" id="btnDoneBfsiModal"[^>]*>/,
    '<button type="button" class="btn btn-primary" id="btnDoneBfsiModal" onclick="closeBfsiModal()">'
  );
  html = html.replace(
    /<button type="button" class="btn-demo-fill" id="btnFillBfsiDemo"[^>]*>/,
    '<button type="button" class="btn-demo-fill" id="btnFillBfsiDemo" onclick="fillBfsiDemo()" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 6px; background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; cursor: pointer;">'
  );

  // 12. Modal backdrop outside click
  html = html.replace(
    /<div class="bfsi-modal-backdrop" id="bfsiApplyModal">/,
    '<div class="bfsi-modal-backdrop" id="bfsiApplyModal" onclick="if(event.target===this)closeBfsiModal()">'
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Updated bfsi.html at', filePath);
}

// Run for all three directories
['Matomo ecomm Web/app.js', 'demo/infinity-shop/app.js', 'app.js'].forEach(p => {
  const full = path.resolve(__dirname, '..', p);
  if (fs.existsSync(full)) updateAppJs(full);
});

['Matomo ecomm Web/bfsi.html', 'demo/infinity-shop/bfsi.html', 'bfsi.html'].forEach(p => {
  const full = path.resolve(__dirname, '..', p);
  if (fs.existsSync(full)) updateBfsiHtml(full);
});

console.log('All updates complete.');
