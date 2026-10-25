const fs = require('fs');
const path = require('path');

console.log('Implementing Form Selector Dropdown UI in BFSI Landing Page...');

const dropdownHtml = `      <!-- =========================================================================
           BFSI FORMS SELECTOR DROPDOWN (ONLY SHOWS SELECTED FORM)
           ========================================================================= -->
      <div class="bfsi-dropdown-selector-box" id="formSelectorBox">
        <label for="bfsiFormSelectDropdown" class="bfsi-dropdown-label">
          <span class="dropdown-icon">📑</span> Select Banking Service to Open Form:
        </label>
        <div class="bfsi-select-dropdown-wrap">
          <select id="bfsiFormSelectDropdown" class="bfsi-form-dropdown" onchange="switchBfsiForm(this.value)">
            <option value="" selected>▾ Select a Form (Click to View Form)...</option>
            <option value="apply-loan">💰 1. Apply for a Loan</option>
            <option value="open-savings">🏦 2. Open Savings Account</option>
            <option value="customer-login">🔐 3. Customer NetBanking Login</option>
            <option value="dpdp-erasure">🛡️ 4. DPDP Petition for Data Erasure</option>
            <option value="all">👁️ Show All Forms</option>
          </select>
        </div>
      </div>

      <div class="bfsi-form-placeholder-hint" id="bfsiFormPromptHint">
        <p style="margin: 0; font-size: 0.88rem; color: #475569;">
          👆 <strong>Select a form from the dropdown above</strong> to display and fill the application.
        </p>
      </div>
`;

const targetDirs = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targetDirs.forEach(dir => {
  ['index.html', 'bfsi.html'].forEach(filename => {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');

      // 1. Add dropdown selector box before <section class="bfsi-simple-card" id="apply-loan">
      if (!content.includes('id="bfsiFormSelectDropdown"')) {
        const targetAnchor = '<section class="bfsi-simple-card" id="apply-loan">';
        if (content.includes(targetAnchor)) {
          content = content.replace(targetAnchor, dropdownHtml + '\n      ' + targetAnchor);
        }
      }

      // 2. Add is-hidden class to the form cards initially
      const cards = ['apply-loan', 'open-savings', 'customer-login', 'dpdp-erasure'];
      cards.forEach(cardId => {
        const regex = new RegExp(`class="bfsi-simple-card(?![^"]*is-hidden)" id="${cardId}"`, 'g');
        content = content.replace(regex, `class="bfsi-simple-card is-hidden" id="${cardId}"`);
      });

      // 3. Add collapsible header with chevron in each form card top header
      content = content.replace(
        /<div class="card-top-header">\s*<h2 class="card-heading">1\. Apply for a Loan<\/h2>\s*<\/div>/,
        `<div class="card-top-header card-collapsible-header" onclick="toggleFormCard('apply-loan')">
          <h2 class="card-heading">1. Apply for a Loan</h2>
          <span class="dropdown-chevron-icon" id="chevron-apply-loan">▾</span>
        </div>`
      );

      content = content.replace(
        /<div class="card-top-header">\s*<h2 class="card-heading">2\. Open Savings Account<\/h2>\s*<\/div>/,
        `<div class="card-top-header card-collapsible-header" onclick="toggleFormCard('open-savings')">
          <h2 class="card-heading">2. Open Savings Account</h2>
          <span class="dropdown-chevron-icon" id="chevron-open-savings">▾</span>
        </div>`
      );

      content = content.replace(
        /<div class="card-top-header">\s*<h2 class="card-heading">3\. Customer Login<\/h2>\s*<\/div>/,
        `<div class="card-top-header card-collapsible-header" onclick="toggleFormCard('customer-login')">
          <h2 class="card-heading">3. Customer Login</h2>
          <span class="dropdown-chevron-icon" id="chevron-customer-login">▾</span>
        </div>`
      );

      content = content.replace(
        /<div class="card-top-header">\s*<h2 class="card-heading">DPDP Act 2023 • Petition for Data Erasure<\/h2>\s*<\/div>/,
        `<div class="card-top-header card-collapsible-header" onclick="toggleFormCard('dpdp-erasure')">
          <h2 class="card-heading">DPDP Act 2023 • Petition for Data Erasure</h2>
          <span class="dropdown-chevron-icon" id="chevron-dpdp-erasure">▾</span>
        </div>`
      );

      // 4. Update header & footer links to trigger switchBfsiForm
      content = content.replace('href="#apply-loan">Apply loan</a>', 'href="#apply-loan" onclick="switchBfsiForm(\'apply-loan\')">Apply loan</a>');
      content = content.replace('href="#open-savings">open savings account</a>', 'href="#open-savings" onclick="switchBfsiForm(\'open-savings\')">open savings account</a>');
      content = content.replace('href="#customer-login">Login</a>', 'href="#customer-login" onclick="switchBfsiForm(\'customer-login\')">Login</a>');

      content = content.replace('href="#apply-loan">Apply Loan</a>', 'href="#apply-loan" onclick="switchBfsiForm(\'apply-loan\')">Apply Loan</a>');
      content = content.replace('href="#open-savings">Open Savings Account</a>', 'href="#open-savings" onclick="switchBfsiForm(\'open-savings\')">Open Savings Account</a>');
      content = content.replace('href="#customer-login">Customer Login</a>', 'href="#customer-login" onclick="switchBfsiForm(\'customer-login\')">Customer Login</a>');

      content = content.replace(
        'href="#apply-loan" class="hamburger-option-item" id="hamburgerOptionLoan">',
        'href="#apply-loan" class="hamburger-option-item" id="hamburgerOptionLoan" onclick="switchBfsiForm(\'apply-loan\'); toggleBfsiHamburger();">'
      );
      content = content.replace(
        'href="#customer-login" class="hamburger-option-item" id="hamburgerOptionLogin">',
        'href="#customer-login" class="hamburger-option-item" id="hamburgerOptionLogin" onclick="switchBfsiForm(\'customer-login\'); toggleBfsiHamburger();">'
      );
      content = content.replace(
        'href="#open-savings" class="hamburger-option-item" id="hamburgerOptionSavings">',
        'href="#open-savings" class="hamburger-option-item" id="hamburgerOptionSavings" onclick="switchBfsiForm(\'open-savings\'); toggleBfsiHamburger();">'
      );

      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated HTML with dropdown in ' + filePath);
    }
  });
});

// Update styles.css
const cssAddition = `
/* =========================================================================
   BFSI FORMS SELECTOR DROPDOWN UI
   ========================================================================= */
.bfsi-dropdown-selector-box {
  max-width: 760px;
  margin: 0 auto 16px auto;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.bfsi-dropdown-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.bfsi-select-dropdown-wrap {
  position: relative;
}

.bfsi-form-dropdown {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #1e293b;
  background: #f8fafc;
  border: 1.5px solid #94a3b8;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.bfsi-form-dropdown:hover,
.bfsi-form-dropdown:focus {
  border-color: #0284c7;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.bfsi-form-placeholder-hint {
  max-width: 760px;
  margin: 0 auto 20px auto;
  padding: 24px;
  background: #f1f5f9;
  border: 1.5px dashed #cbd5e1;
  border-radius: 8px;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.bfsi-simple-card.is-hidden {
  display: none !important;
}

.card-collapsible-header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.15s ease;
}

.card-collapsible-header:hover .card-heading {
  color: #0284c7;
}

.dropdown-chevron-icon {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 700;
  transition: transform 0.2s ease;
}
`;

targetDirs.forEach(dir => {
  const cssPath = path.join(dir, 'styles.css');
  if (fs.existsSync(cssPath)) {
    let cssContent = fs.readFileSync(cssPath, 'utf8');
    if (!cssContent.includes('.bfsi-dropdown-selector-box')) {
      cssContent += '\n' + cssAddition;
      fs.writeFileSync(cssPath, cssContent, 'utf8');
      console.log('Appended dropdown styles to ' + cssPath);
    }
  }
});

// Update app.js with switchBfsiForm and toggleFormCard
const jsFunctions = `
// ============================================================================
// BFSI FORM SELECTOR DROPDOWN LOGIC
// ============================================================================
function switchBfsiForm(formId) {
  const dropdown = document.getElementById('bfsiFormSelectDropdown');
  if (dropdown && dropdown.value !== formId) {
    dropdown.value = formId;
  }

  const hint = document.getElementById('bfsiFormPromptHint');
  const formCards = ['apply-loan', 'open-savings', 'customer-login', 'dpdp-erasure'];

  if (!formId) {
    // Hide all forms, show prompt hint
    formCards.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('is-hidden');
    });
    if (hint) hint.style.display = 'block';
    return;
  }

  if (hint) hint.style.display = 'none';

  if (formId === 'all') {
    formCards.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('is-hidden');
    });
    return;
  }

  // Show only selected form, hide other forms
  formCards.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === formId) {
        el.classList.remove('is-hidden');
      } else {
        el.classList.add('is-hidden');
      }
    }
  });

  // Smoothly scroll to the chosen form
  const targetCard = document.getElementById(formId);
  if (targetCard) {
    setTimeout(() => {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // Push tracking events for dropdown selection
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'select_financial_category',
      financial_category: formId,
      interaction_source: 'form_dropdown_ui',
      timestamp: new Date().toISOString()
    });
  }
  if (typeof MatomoTracker !== 'undefined' && typeof MatomoTracker.trackCustomEvent === 'function') {
    MatomoTracker.trackCustomEvent('BFSI_Navigation', 'form_dropdown_select', formId, 1);
  }
}

function toggleFormCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  
  const isHidden = card.classList.contains('is-hidden');
  if (isHidden) {
    switchBfsiForm(cardId);
  } else {
    card.classList.add('is-hidden');
    const dropdown = document.getElementById('bfsiFormSelectDropdown');
    if (dropdown && dropdown.value === cardId) {
      dropdown.value = '';
    }
  }
}

// Auto open form if URL has hash
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (['apply-loan', 'open-savings', 'customer-login', 'dpdp-erasure'].includes(hash)) {
      switchBfsiForm(hash);
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.replace('#', '');
    if (['apply-loan', 'open-savings', 'customer-login', 'dpdp-erasure'].includes(hash)) {
      switchBfsiForm(hash);
    }
  });
}
`;

targetDirs.forEach(dir => {
  const appPath = path.join(dir, 'app.js');
  if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');

    // Also ensure fillDemo functions un-hide parent card
    if (!appContent.includes('function switchBfsiForm(')) {
      appContent = appContent.replace(
        'function fillLoanDemo() {',
        `function fillLoanDemo() {\n  const p = document.getElementById('apply-loan'); if (p) p.classList.remove('is-hidden');`
      );
      appContent = appContent.replace(
        'function fillSavingsDemo() {',
        `function fillSavingsDemo() {\n  const p = document.getElementById('open-savings'); if (p) p.classList.remove('is-hidden');`
      );
      appContent = appContent.replace(
        'function fillLoginDemo() {',
        `function fillLoginDemo() {\n  const p = document.getElementById('customer-login'); if (p) p.classList.remove('is-hidden');`
      );

      appContent += '\n' + jsFunctions;
      fs.writeFileSync(appPath, appContent, 'utf8');
      console.log('Appended dropdown JS functions to ' + appPath);
    }
  }
});

console.log('Dropdown implementation complete!');
