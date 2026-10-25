const fs = require('fs');
const path = require('path');

// 1. Function to patch app.js
function patchAppJs(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace unguarded top-level listeners with optional chaining (?.)
  const listenersToGuard = [
    'categoryTabs',
    'sortSelect',
    'currencySelect',
    'cartTrigger',
    'closeCartBtn',
    'cartOverlay',
    'wishlistTrigger',
    'closeWishlistBtn',
    'wishlistOverlay',
    'closeQuickViewBtn',
    'quickViewModal',
    'proceedCheckoutBtn',
    'closeCheckoutBtn',
    'step1Form',
    'step2Form',
    'step3Form',
    'cardNumber',
    'cardName',
    'cardExpiry',
    'backToBagBtn',
    'backToStep1Btn',
    'editStep1Btn',
    'backToStep2Btn',
    'printReceiptBtn',
    'finishShoppingBtn',
    'applyCouponBtn',
    'fillDemoAddressBtn',
    'giftWrapToggle',
    'giftMessageInput',
    'qvQtyMinus',
    'qvQtyPlus',
    'qvAddToCartBtn',
    'qvWishlistBtn'
  ];

  listenersToGuard.forEach(id => {
    // Replace "id.addEventListener" with "id?.addEventListener" if not already guarded
    const reg = new RegExp(`(^|\\n|\\s)(${id})\\.addEventListener`, 'g');
    code = code.replace(reg, `$1$2?.addEventListener`);
  });

  // Guard elements in renderCheckoutSummary, renderCart, etc.
  code = code.replace(/confirmedGiftSection\.style\.display/g, 'confirmedGiftSection && (confirmedGiftSection.style.display');
  code = code.replace(/payBtnText\.style\.display/g, 'payBtnText && (payBtnText.style.display');

  // Enhance initBfsiEngine
  const bfsiEngineRegex = /\/\/ =+\s*\/\/ INFINITY BANK - EXPLORE BFSI INTERACTIVE ENGINE[\s\S]*?function initApp\(\)/;
  
  const enhancedBfsiEngine = `// ============================================================================
// INFINITY BANK - EXPLORE BFSI INTERACTIVE ENGINE & REALISTIC BANKING FORMS
// ============================================================================
function initBfsiEngine() {
  // Helper to determine income/amount tiers for GA4 Custom Dimensions
  function getAmountTier(num) {
    if (num < 50000) return 'under_50k';
    if (num <= 100000) return '50k_to_100k';
    if (num <= 250000) return '100k_to_250k';
    if (num <= 500000) return '250k_to_500k';
    if (num <= 1000000) return '500k_to_1M';
    return '1M_plus';
  }

  // Helper to dispatch GA4 events with parameters mapped for Custom Dimensions
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

  // 1. Tab Navigation between BFSI Categories
  const bfsiTabs = document.querySelectorAll('#bfsiCategoryTabs .bfsi-tab');
  const bfsiPanels = {
    wealth: document.getElementById('bfsiPanelWealth'),
    lending: document.getElementById('bfsiPanelLending'),
    cards: document.getElementById('bfsiPanelCards'),
    insurance: document.getElementById('bfsiPanelInsurance')
  };

  bfsiTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-bfsi-target');
      bfsiTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.keys(bfsiPanels).forEach(key => {
        if (bfsiPanels[key]) {
          bfsiPanels[key].classList.toggle('active', key === target);
          bfsiPanels[key].style.display = (key === target) ? 'block' : 'none';
        }
      });

      pushBfsiGA4('select_financial_category', {
        financial_category: target,
        action_type: 'tab_navigation'
      });
    });
  });

  // 2. High-Yield Fixed Deposit & Wealth Yield Calculator
  const fdAmountRange = document.getElementById('fdAmountRange');
  const fdAmountVal = document.getElementById('fdAmountVal');
  const fdTenurePills = document.querySelectorAll('#fdTenurePills .tenure-btn');
  const fdApyDisplay = document.getElementById('fdApyDisplay');
  const fdMaturityTotal = document.getElementById('fdMaturityTotal');
  const fdInterestGain = document.getElementById('fdInterestGain');
  const fdMonthlyEquivalent = document.getElementById('fdMonthlyEquivalent');
  const fdPayoutRadios = document.querySelectorAll('input[name="fdPayout"]');

  let activeFdMonths = 36;
  let activeFdRate = 8.45;

  function calculateFd() {
    if (!fdAmountRange) return;
    const principal = parseFloat(fdAmountRange.value) || 100000;
    if (fdAmountVal) fdAmountVal.textContent = \`$\${principal.toLocaleString()}\`;

    const payoutMode = document.querySelector('input[name="fdPayout"]:checked')?.value || 'compounded';
    const years = activeFdMonths / 12;
    let maturity = principal;
    let interest = 0;

    if (payoutMode === 'compounded') {
      // Monthly compounding: A = P * (1 + r/12)^(12*t)
      const r = activeFdRate / 100;
      maturity = principal * Math.pow(1 + r / 12, 12 * years);
      interest = maturity - principal;
    } else {
      // Simple annual interest paid monthly
      interest = principal * (activeFdRate / 100) * years;
      maturity = principal + interest;
    }

    const monthlyEq = interest / activeFdMonths;

    if (fdMaturityTotal) fdMaturityTotal.textContent = \`$\${Math.round(maturity).toLocaleString()}\`;
    if (fdInterestGain) fdInterestGain.textContent = \`+$\${Math.round(interest).toLocaleString()}\`;
    if (fdMonthlyEquivalent) fdMonthlyEquivalent.textContent = \`$\${Math.round(monthlyEq).toLocaleString()} / mo\`;
  }

  if (fdAmountRange) {
    let fdDebounce = null;
    const onFdSliderChange = () => {
      calculateFd();
      clearTimeout(fdDebounce);
      fdDebounce = setTimeout(() => {
        const principal = parseFloat(fdAmountRange.value);
        const payout = document.querySelector('input[name="fdPayout"]:checked')?.value || 'compounded';
        fetch('/api/bfsi/calculate-yield', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ principal, months: activeFdMonths, rate: activeFdRate, payout })
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
            tenure_range: \`\${activeFdMonths}_months\`,
            financial_amount: principal,
            financial_amount_tier: getAmountTier(principal),
            interest_rate_apy: activeFdRate
          });
        });
      }, 400);
    };

    fdAmountRange.addEventListener('input', onFdSliderChange);
    fdAmountRange.addEventListener('change', onFdSliderChange);
  }

  fdTenurePills.forEach(btn => {
    btn.addEventListener('click', () => {
      fdTenurePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFdMonths = parseInt(btn.getAttribute('data-months'), 10) || 36;
      activeFdRate = parseFloat(btn.getAttribute('data-rate')) || 8.45;
      if (fdApyDisplay) fdApyDisplay.textContent = \`\${activeFdRate.toFixed(2)}% APY\`;
      calculateFd();

      pushBfsiGA4('select_tenure_option', {
        financial_product_name: 'Infinite High-Yield Multiplier Deposit',
        financial_category: 'wealth_management',
        tenure_range: \`\${activeFdMonths}_months\`,
        interest_rate_apy: activeFdRate
      });
    });
  });

  fdPayoutRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('#fdPayoutOptions .radio-chip').forEach(c => c.classList.remove('active'));
      radio.closest('.radio-chip')?.classList.add('active');
      calculateFd();
    });
  });

  calculateFd();

  // 3. Smart Lending & Loan EMI Estimator
  const loanTypePills = document.querySelectorAll('#loanTypePills .tenure-btn');
  const loanAmountRange = document.getElementById('loanAmountRange');
  const loanAmountVal = document.getElementById('loanAmountVal');
  const loanYearsRange = document.getElementById('loanYearsRange');
  const loanYearsVal = document.getElementById('loanYearsVal');
  const loanRateDisplay = document.getElementById('loanRateDisplay');
  const loanMonthlyEmi = document.getElementById('loanMonthlyEmi');
  const loanTotalInterest = document.getElementById('loanTotalInterest');
  const loanTotalPayable = document.getElementById('loanTotalPayable');

  let activeLoanRate = 7.65;
  let activeLoanType = 'Prime Home Mortgage';

  function calculateLoan() {
    if (!loanAmountRange || !loanYearsRange) return;
    const principal = parseFloat(loanAmountRange.value) || 350000;
    const years = parseInt(loanYearsRange.value, 10) || 15;

    if (loanAmountVal) loanAmountVal.textContent = \`$\${principal.toLocaleString()}\`;
    if (loanYearsVal) loanYearsVal.textContent = \`\${years} Years\`;

    const monthlyRate = (activeLoanRate / 100) / 12;
    const totalMonths = years * 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const totalPayment = emi * totalMonths;
    const totalInterest = totalPayment - principal;

    if (loanMonthlyEmi) loanMonthlyEmi.textContent = \`$\${Math.round(emi).toLocaleString()}\`;
    if (loanTotalInterest) loanTotalInterest.textContent = \`$\${Math.round(totalInterest).toLocaleString()}\`;
    if (loanTotalPayable) loanTotalPayable.textContent = \`$\${Math.round(totalPayment).toLocaleString()}\`;
  }

  if (loanAmountRange && loanYearsRange) {
    let loanDebounce = null;
    const onLoanSliderChange = () => {
      calculateLoan();
      clearTimeout(loanDebounce);
      loanDebounce = setTimeout(() => {
        const principal = parseFloat(loanAmountRange.value);
        const years = parseInt(loanYearsRange.value, 10);
        fetch('/api/bfsi/calculate-emi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ principal, years, rate: activeLoanRate, loanType: activeLoanType })
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
            financial_product_name: activeLoanType,
            financial_category: 'retail_lending',
            calculation_type: 'loan_emi',
            tenure_range: \`\${years}_years\`,
            financial_amount: principal,
            financial_amount_tier: getAmountTier(principal),
            interest_rate_apr: activeLoanRate
          });
        });
      }, 400);
    };

    loanAmountRange.addEventListener('input', onLoanSliderChange);
    loanAmountRange.addEventListener('change', onLoanSliderChange);
    loanYearsRange.addEventListener('input', onLoanSliderChange);
    loanYearsRange.addEventListener('change', onLoanSliderChange);
  }

  loanTypePills.forEach(btn => {
    btn.addEventListener('click', () => {
      loanTypePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLoanRate = parseFloat(btn.getAttribute('data-rate')) || 7.65;
      activeLoanType = btn.textContent.trim().split('(')[0].trim();
      if (loanRateDisplay) loanRateDisplay.textContent = \`\${activeLoanRate.toFixed(2)}% Fixed APR\`;
      calculateLoan();

      pushBfsiGA4('select_loan_structure', {
        financial_product_name: activeLoanType,
        financial_category: 'retail_lending',
        interest_rate_apr: activeLoanRate
      });
    });
  });

  calculateLoan();

  // 4. Insurance Tier Selections
  document.querySelectorAll('.insurance-tier-box').forEach(box => {
    box.addEventListener('click', () => {
      document.querySelectorAll('.insurance-tier-box').forEach(b => b.classList.remove('active'));
      box.classList.add('active');
      const coverage = box.getAttribute('data-coverage');
      const premium = box.getAttribute('data-premium');
      const name = box.querySelector('.ins-name')?.textContent || 'Asset Shield';

      pushBfsiGA4('select_insurance_tier', {
        financial_product_name: name,
        financial_category: 'insurance',
        insurance_coverage_amount: parseFloat(coverage),
        monthly_premium: parseFloat(premium)
      });
    });
  });

  // 5. Short & Simple Realistic BFSI Banking Application Modal
  const bfsiApplyModal = document.getElementById('bfsiApplyModal');
  const closeBfsiModalBtn = document.getElementById('closeBfsiModalBtn');
  const btnDoneBfsiModal = document.getElementById('btnDoneBfsiModal');
  const bfsiApplicationForm = document.getElementById('bfsiApplicationForm');
  const bfsiSuccessBox = document.getElementById('bfsiSuccessBox');
  const bfsiModalProductTitle = document.getElementById('bfsiModalProductTitle');
  const bfsiSelectedProduct = document.getElementById('bfsiSelectedProduct');
  const bfsiSelectedBadge = document.getElementById('bfsiSelectedBadge');
  const bfsiAmountField = document.getElementById('bfsiAmountField');
  const bfsiRefCode = document.getElementById('bfsiRefCode');
  const btnFillBfsiDemo = document.getElementById('btnFillBfsiDemo');

  function openBfsiModal(productName, defaultAmount) {
    if (!bfsiApplyModal) return;
    if (bfsiModalProductTitle) bfsiModalProductTitle.textContent = productName;
    if (bfsiSelectedProduct) bfsiSelectedProduct.value = productName;
    if (bfsiSelectedBadge) bfsiSelectedBadge.textContent = productName;
    
    // Auto-fill realistic amount from the active calculator if not provided
    if (bfsiAmountField) {
      if (defaultAmount) {
        bfsiAmountField.value = defaultAmount;
      } else if (productName.toLowerCase().includes('deposit')) {
        bfsiAmountField.value = fdAmountVal ? fdAmountVal.textContent : '$100,000';
      } else if (productName.toLowerCase().includes('loan') || productName.toLowerCase().includes('facility')) {
        bfsiAmountField.value = loanAmountVal ? loanAmountVal.textContent : '$350,000';
      } else if (productName.toLowerCase().includes('card')) {
        bfsiAmountField.value = '$50,000 Credit Facility';
      } else {
        bfsiAmountField.value = '$1,000,000 Portfolio Coverage';
      }
    }

    if (bfsiApplicationForm) {
      bfsiApplicationForm.style.display = 'block';
    }
    if (bfsiSuccessBox) {
      bfsiSuccessBox.style.display = 'none';
    }

    bfsiApplyModal.classList.add('active');

    pushBfsiGA4('financial_lead_start', {
      financial_product_name: productName,
      financial_category: productName.toLowerCase().includes('card') ? 'credit_cards' : (productName.toLowerCase().includes('deposit') ? 'wealth_management' : 'retail_lending')
    });
  }

  function closeBfsiModal() {
    if (bfsiApplyModal) bfsiApplyModal.classList.remove('active');
  }

  // Hook all BFSI action triggers
  document.getElementById('btnLockDeposit')?.addEventListener('click', function() {
    openBfsiModal('Infinite High-Yield Multiplier Deposit', fdAmountVal ? fdAmountVal.textContent : '$100,000');
  });

  document.getElementById('btnCheckLoanOffer')?.addEventListener('click', function() {
    openBfsiModal(activeLoanType || 'Prime Home Mortgage', loanAmountVal ? loanAmountVal.textContent : '$350,000');
  });

  document.querySelectorAll('.btn-apply-card').forEach(btn => {
    btn.addEventListener('click', function() {
      openBfsiModal(this.getAttribute('data-bfsi-product') || 'Infinity Black Titanium Card', '$50,000 Line of Credit');
    });
  });

  document.getElementById('btnSelectInsurance')?.addEventListener('click', function() {
    const activeIns = document.querySelector('.insurance-tier-box.active');
    const insName = activeIns ? activeIns.querySelector('.ins-name')?.textContent : 'Executive Sovereign Asset Shield';
    const insCov = activeIns ? activeIns.querySelector('.ins-coverage')?.textContent : '$2,000,000 Coverage';
    openBfsiModal(insName, insCov);
  });

  closeBfsiModalBtn?.addEventListener('click', closeBfsiModal);
  btnDoneBfsiModal?.addEventListener('click', closeBfsiModal);
  bfsiApplyModal?.addEventListener('click', (e) => {
    if (e.target === bfsiApplyModal) closeBfsiModal();
  });

  // Demo autofill for quick testing
  btnFillBfsiDemo?.addEventListener('click', () => {
    const nameEl = document.getElementById('bfsiClientName');
    const emailEl = document.getElementById('bfsiClientEmail');
    const phoneEl = document.getElementById('bfsiClientPhone');
    if (nameEl) nameEl.value = 'Lord Alistair Vance';
    if (emailEl) emailEl.value = 'alistair.vance@sovereign-holdings.ch';
    if (phoneEl) phoneEl.value = '+41 22 819 4500';
    if (typeof showToast === 'function') {
      showToast('✨', 'Demo Details Filled', 'Verified applicant details auto-filled.');
    }
  });

  // Handle Form Submission
  if (bfsiApplicationForm) {
    bfsiApplicationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const clientName = document.getElementById('bfsiClientName')?.value.trim() || 'Valued Client';
      const clientEmail = document.getElementById('bfsiClientEmail')?.value.trim() || '';
      const clientPhone = document.getElementById('bfsiClientPhone')?.value.trim() || '';
      const incomeBracket = document.getElementById('bfsiIncomeBracket')?.value || '250k-500k';
      const purpose = document.getElementById('bfsiAccountPurpose')?.value || 'yield_maximization';
      const productName = bfsiSelectedProduct ? bfsiSelectedProduct.value : 'Infinite Wealth Solution';
      const requestedAmount = bfsiAmountField ? bfsiAmountField.value : '$100,000';

      // Call Backend API for Lead Processing and Server DataLayer
      fetch('/api/bfsi/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientEmail, clientPhone, incomeBracket, purpose, productName, requestedAmount })
      })
      .then(r => r.json())
      .then(d => {
        const refId = d.referenceId || \`INF-BFSI-\${new Date().getFullYear()}-\${Math.floor(10000 + Math.random() * 90000)}\`;
        if (bfsiRefCode) bfsiRefCode.textContent = refId;
        bfsiApplicationForm.style.display = 'none';
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
        bfsiApplicationForm.style.display = 'none';
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
    });
  }
}

function initApp()`;

  code = code.replace(bfsiEngineRegex, enhancedBfsiEngine);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Patched app.js at ${filePath}`);
}

// 2. Function to update bfsi.html modal structure
function patchBfsiHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // Replace modal with short, clean, realistic application form
  const modalRegex = /<!-- Financial Lead & Product Application Modal -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
  const newModalHtml = `<!-- Financial Lead & Product Application Modal -->
  <div class="bfsi-modal-backdrop" id="bfsiApplyModal">
    <div class="bfsi-modal-window">
      <div class="bfsi-modal-header">
        <div>
          <span class="modal-pretitle">INFINITY BANK • PRIVATE WEALTH ONBOARDING</span>
          <h3 class="modal-title" id="bfsiModalProductTitle">Infinite Wealth Solution</h3>
        </div>
        <button type="button" class="bfsi-modal-close" id="closeBfsiModalBtn" aria-label="Close modal">✕</button>
      </div>

      <div class="bfsi-modal-body">
        <form class="bfsi-form" id="bfsiApplicationForm">
          <input type="hidden" id="bfsiSelectedProduct" value="Infinite High-Yield Multiplier Deposit">
          
          <div class="bfsi-selected-badge" id="bfsiSelectedBadge" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10B981; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; margin-bottom: 14px; display: inline-block;">
            Infinite High-Yield Multiplier Deposit
          </div>

          <div class="form-row-2">
            <div class="bfsi-field">
              <label for="bfsiClientName">Full Legal Name *</label>
              <input type="text" id="bfsiClientName" required placeholder="e.g. Lord Alistair Vance">
            </div>
            <div class="bfsi-field">
              <label for="bfsiClientEmail">Verified Email Address *</label>
              <input type="email" id="bfsiClientEmail" required placeholder="e.g. vance@sovereign-holdings.ch">
            </div>
          </div>

          <div class="form-row-2">
            <div class="bfsi-field">
              <label for="bfsiClientPhone">Direct Phone / Mobile *</label>
              <input type="tel" id="bfsiClientPhone" required placeholder="+41 22 819 0000">
            </div>
            <div class="bfsi-field">
              <label for="bfsiAmountField">Facility / Deposit Amount</label>
              <input type="text" id="bfsiAmountField" value="$100,000" placeholder="$100,000">
            </div>
          </div>

          <div class="form-row-2">
            <div class="bfsi-field">
              <label for="bfsiIncomeBracket">Annual Income Bracket</label>
              <select id="bfsiIncomeBracket">
                <option value="100k-250k">$100,000 – $250,000</option>
                <option value="250k-500k" selected>$250,000 – $500,000</option>
                <option value="500k-1M">$500,000 – $1,000,000</option>
                <option value="1M-plus">$1,000,000+ (Ultra High Net Worth)</option>
              </select>
            </div>
            <div class="bfsi-field">
              <label for="bfsiAccountPurpose">Primary Objective</label>
              <select id="bfsiAccountPurpose">
                <option value="yield_maximization">High-Yield Treasury &amp; FD Multiplier</option>
                <option value="real_estate_credit">Bespoke Real Estate &amp; Mortgage Lending</option>
                <option value="metal_card_lifestyle">Metal Card &amp; Global Lifestyle Privileges</option>
                <option value="generational_estate">Generational Estate Shield &amp; Assurance</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin: 4px 0 10px;">
            <button type="button" class="btn-demo-fill" id="btnFillBfsiDemo" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 6px; background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; cursor: pointer;">✨ Fill Demo Details</button>
          </div>

          <div class="bfsi-checkbox-wrap" style="margin-bottom: 14px;">
            <label class="bfsi-checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: #64748B;">
              <input type="checkbox" id="bfsiConsentCheck" checked required>
              <span>I authorize Infinity Bank Private Wealth Underwriters to process this onboarding application.</span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="btnSubmitBfsiApplication" style="height: 42px; font-size: 0.88rem; font-weight: 700;">
            <span>Submit Priority Application</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

        <div class="bfsi-success-state" id="bfsiSuccessBox" style="display: none; text-align: center; padding: 20px 10px;">
          <div class="success-badge-icon" style="font-size: 2.5rem; margin-bottom: 10px;">🏛️</div>
          <h3 class="success-title" style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">Application Approved &amp; Logged</h3>
          <p class="success-text" style="font-size: 0.84rem; color: #64748B; margin-bottom: 16px;">Your institutional relationship dossier has been generated and dispatched to our Senior Private Wealth Underwriter.</p>
          <div class="success-ref-card" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
            <span class="ref-label" style="display: block; font-size: 0.68rem; letter-spacing: 0.1em; color: #64748B; font-weight: 700; margin-bottom: 4px;">APPLICATION REFERENCE TICKET</span>
            <strong class="ref-code" id="bfsiRefCode" style="font-size: 1.25rem; font-family: monospace; color: #10B981; letter-spacing: 1px;">INF-BFSI-2026-89412</strong>
          </div>
          <p class="success-contact" style="font-size: 0.78rem; color: #64748B; margin-bottom: 16px;">A dedicated Senior Private Banker will reach out via your verified contact details within 2 business hours.</p>
          <button type="button" class="btn btn-primary" id="btnDoneBfsiModal" style="padding: 10px 24px; font-size: 0.84rem; font-weight: 700;">Done &amp; Return to Dashboard</button>
        </div>
      </div>
    </div>
  </div>`;

  html = html.replace(modalRegex, newModalHtml);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Patched bfsi.html at ${filePath}`);
}

// 3. CSS for bfsi modal z-index and elegance
const BFSI_MODAL_CSS = `
/* Ensure BFSI Modal is above headers and compact */
.bfsi-modal-backdrop {
  z-index: 99999 !important;
}

.bfsi-modal-window {
  max-width: 540px !important;
  border-radius: 14px !important;
}

.bfsi-modal-header {
  padding: 14px 20px !important;
}

.bfsi-modal-body {
  padding: 20px !important;
}

.form-row-2 {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 10px !important;
  margin-bottom: 10px !important;
}

.bfsi-field label {
  font-size: 0.74rem !important;
  font-weight: 600 !important;
  color: #334155 !important;
  margin-bottom: 3px !important;
  display: block !important;
}

.bfsi-field input,
.bfsi-field select {
  width: 100% !important;
  height: 36px !important;
  padding: 6px 10px !important;
  font-size: 0.82rem !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 6px !important;
  box-sizing: border-box !important;
}

.bfsi-modal-close {
  background: rgba(255, 255, 255, 0.15) !important;
  border: none !important;
  color: #FFFFFF !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 50% !important;
  font-size: 0.95rem !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
`;

function patchStylesCss(filePath) {
  if (!fs.existsSync(filePath)) return;
  let css = fs.readFileSync(filePath, 'utf8');
  if (!css.includes('Ensure BFSI Modal is above headers and compact')) {
    css += '\n' + BFSI_MODAL_CSS;
    fs.writeFileSync(filePath, css, 'utf8');
    console.log(`Patched styles.css at ${filePath}`);
  }
}

// Run for all target directories
const dirs = ['Matomo ecomm Web', 'demo/infinity-shop', '.'];
dirs.forEach(d => {
  patchAppJs(path.join(d, 'app.js'));
  patchBfsiHtml(path.join(d, 'bfsi.html'));
  patchStylesCss(path.join(d, 'styles.css'));
});

console.log('All files patched successfully.');
