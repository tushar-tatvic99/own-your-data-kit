const fs = require('fs');
const path = require('path');

console.log('Refining BFSI Landing Page, E-Commerce, Styles and DataLayer logging...');

// =========================================================================
// 1. REFINED BFSI LANDING PAGE (index.html) - NO EXTRA TEXT, REDUCED FONTS, SIMPLE TEXT FOOTER
// =========================================================================
const cleanBfsiHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google Consent Mode v2 Default (DPDP Compliance: Denied by default) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted'
    });
  </script>

  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-MMXM5L53');</script>
  <!-- End Google Tag Manager -->

  <!-- Matomo Tag Manager -->
  <script>
  var _mtm = window._mtm = window._mtm || [];
  _mtm.push({'mtm.startTime': (new Date().getTime()), 'event': 'mtm.Start'});
  (function() {
  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.async=true; g.src='https://matomo.35-234-210-199.nip.io/js/container_1Is4prw5.js'; s.parentNode.insertBefore(g,s);
  })();
  </script>
  <!-- End Matomo Tag Manager -->

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infinity Bank | Banking, Loans &amp; Savings</title>
  <meta name="description" content="Infinity Bank - Apply for loans, open savings accounts, and customer NetBanking login.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3.0.1/dist/cookieconsent.css">
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
</head>
<body class="page-bfsi page-bfsi-simple">
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MMXM5L53"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->

  <!-- Main Navigation Header -->
  <header class="site-header bfsi-clean-header" id="siteHeader">
    <div class="header-container">
      
      <!-- Left: Brand Logo -->
      <div class="header-left">
        <a href="index.html" class="brand-link" aria-label="Infinity Bank Home">
          <span class="brand-crest">🏛️</span>
          <span class="brand-name">Infinity Bank</span>
        </a>
      </div>

      <!-- Center Navigation Links: Home page, Apply loan, open savings account, about us, Login -->
      <nav class="nav-links desktop-only" id="mainNav">
        <a href="#apply-loan" class="nav-item">Home page</a>
        <a href="#apply-loan" class="nav-item">Apply loan</a>
        <a href="#open-savings" class="nav-item">open savings account</a>
        <a href="#about-us" class="nav-item">about us</a>
        <a href="#customer-login" class="nav-item">Login</a>
      </nav>

      <!-- Right: Hamburger Menu Button & Dropdown -->
      <div class="header-actions">
        <button class="hamburger-toggle-btn" id="bfsiHamburgerBtn" aria-label="Open menu" aria-expanded="false" title="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <!-- Dropdown Menu Triggered by Hamburger -->
        <div class="hamburger-menu-panel" id="hamburgerMenuPanel">
          <div class="hamburger-panel-header">
            <span class="hamburger-title">Navigation</span>
            <button class="hamburger-close-btn" id="closeHamburgerBtn" aria-label="Close menu">✕</button>
          </div>
          <div class="hamburger-options-list">
            <a href="ecommerce.html" class="hamburger-option-item highlight-ecom" id="switchEcommerceHamburger">
              <span class="option-icon">🛍️</span>
              <div class="option-text">
                <strong>Switch to E-Commerce Account</strong>
              </div>
            </a>
            <a href="#customer-login" class="hamburger-option-item" id="hamburgerOptionLogin">
              <span class="option-icon">🔐</span>
              <div class="option-text">
                <strong>Login</strong>
              </div>
            </a>
            <a href="#open-savings" class="hamburger-option-item" id="hamburgerOptionRegister">
              <span class="option-icon">📝</span>
              <div class="option-text">
                <strong>Account Creation</strong>
              </div>
            </a>
            <a href="#apply-loan" class="hamburger-option-item" id="hamburgerOptionLoan">
              <span class="option-icon">💰</span>
              <div class="option-text">
                <strong>Apply for Loan</strong>
              </div>
            </a>
          </div>
        </div>
      </div>

    </div>
  </header>

  <!-- =========================================================================
       3 SIMPLE FORMS (NO EXTRA TEXT, COMPACT REDUCED FONTS)
       ========================================================================= -->
  <main class="simple-forms-container">
    <div class="section-container">

      <!-- FORM 1: APPLY LOAN FORM -->
      <section class="bfsi-simple-card" id="apply-loan">
        <div class="card-top-header">
          <h2 class="card-heading">1. Apply for a Loan</h2>
        </div>

        <form class="bfsi-form-clean" id="applyLoanForm" onsubmit="submitLoanForm(event)">
          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="loanTypeSelect">Loan Type *</label>
              <select id="loanTypeSelect" class="form-input" required onchange="handleFormFieldInteraction('apply_loan', 'loan_type', 'change')">
                <option value="Prime Home Mortgage" selected>Prime Home Mortgage (7.65% APR)</option>
                <option value="Executive Personal Loan">Executive Personal Loan (9.85% APR)</option>
                <option value="Business Line of Credit">Business Line of Credit (8.95% APR)</option>
                <option value="Auto / Vehicle Loan">Auto / Vehicle Loan (6.90% APR)</option>
              </select>
            </div>

            <div class="form-field-group">
              <label for="loanAmountInput">Loan Amount ($) *</label>
              <input type="number" id="loanAmountInput" class="form-input" min="5000" max="2500000" step="5000" value="50000" required oninput="handleFormFieldInteraction('apply_loan', 'loan_amount', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'loan_amount', 'focus')">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="loanTenureSelect">Tenure *</label>
              <select id="loanTenureSelect" class="form-input" required onchange="handleFormFieldInteraction('apply_loan', 'loan_tenure', 'change')">
                <option value="1">1 Year</option>
                <option value="3">3 Years</option>
                <option value="5" selected>5 Years</option>
                <option value="10">10 Years</option>
                <option value="15">15 Years</option>
                <option value="20">20 Years</option>
              </select>
            </div>

            <div class="form-field-group">
              <label for="loanAnnualIncome">Annual Income *</label>
              <select id="loanAnnualIncome" class="form-input" required onchange="handleFormFieldInteraction('apply_loan', 'annual_income', 'change')">
                <option value="under_50k">Under $50,000</option>
                <option value="50k_100k" selected>$50,000 – $100,000</option>
                <option value="100k_250k">$100,000 – $250,000</option>
                <option value="250k_plus">$250,000+</option>
              </select>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-field-group">
              <label for="loanFullName">Full Name *</label>
              <input type="text" id="loanFullName" class="form-input" placeholder="e.g. Rahul Sharma" required oninput="handleFormFieldInteraction('apply_loan', 'full_name', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'full_name', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="loanEmail">Email *</label>
              <input type="email" id="loanEmail" class="form-input" placeholder="e.g. rahul@example.com" required oninput="handleFormFieldInteraction('apply_loan', 'email', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'email', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="loanPhone">Mobile *</label>
              <input type="tel" id="loanPhone" class="form-input" placeholder="e.g. +91 98765 43210" required oninput="handleFormFieldInteraction('apply_loan', 'phone', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'phone', 'focus')">
            </div>
          </div>

          <!-- Buttons: Load Apply Button Loan Fill, and Apply Loan -->
          <div class="form-actions-row">
            <button type="button" class="btn btn-secondary" id="btnLoanFill" onclick="fillLoanDemo()">
              ⚡ Load / Fill Demo Details
            </button>
            <button type="submit" class="btn btn-primary" id="btnApplyLoanSubmit">
              Apply Loan
            </button>
          </div>
        </form>

        <!-- Loan Result Box -->
        <div class="form-success-box" id="loanSuccessBox" style="display: none;">
          <div class="success-icon">✓</div>
          <h3>Application Submitted</h3>
          <p>Reference Ticket: <strong id="loanRefCode">INF-LOAN-2026-89412</strong></p>
          <p class="estimated-detail" id="loanEstimatedEmiText">Estimated Monthly EMI: <strong>$1,010 / month</strong></p>
          <button type="button" class="btn btn-outline btn-xs" onclick="resetLoanForm()">Apply Again</button>
        </div>
      </section>


      <!-- FORM 2: OPEN SAVINGS ACCOUNT FORM -->
      <section class="bfsi-simple-card" id="open-savings">
        <div class="card-top-header">
          <h2 class="card-heading">2. Open Savings Account</h2>
        </div>

        <form class="bfsi-form-clean" id="openSavingsForm" onsubmit="submitSavingsForm(event)">
          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="savingsAccountType">Account Type *</label>
              <select id="savingsAccountType" class="form-input" required onchange="handleFormFieldInteraction('open_savings', 'account_type', 'change')">
                <option value="High-Yield Multiplier Savings (8.45% APY)" selected>High-Yield Multiplier Savings (8.45% APY)</option>
                <option value="Classic Digital Savings (6.50% APY)">Classic Digital Savings (6.50% APY)</option>
                <option value="Institutional Treasury Account">Institutional Treasury Account (8.90% APY)</option>
              </select>
            </div>

            <div class="form-field-group">
              <label for="savingsDepositAmount">Initial Deposit ($) *</label>
              <input type="number" id="savingsDepositAmount" class="form-input" min="100" max="1000000" step="500" value="10000" required oninput="handleFormFieldInteraction('open_savings', 'initial_deposit', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'initial_deposit', 'focus')">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="savingsFullName">Full Name *</label>
              <input type="text" id="savingsFullName" class="form-input" placeholder="e.g. Priya Sharma" required oninput="handleFormFieldInteraction('open_savings', 'full_name', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'full_name', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="savingsEmail">Email *</label>
              <input type="email" id="savingsEmail" class="form-input" placeholder="e.g. priya@example.com" required oninput="handleFormFieldInteraction('open_savings', 'email', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'email', 'focus')">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="savingsPhone">Mobile *</label>
              <input type="tel" id="savingsPhone" class="form-input" placeholder="e.g. +91 98111 22334" required oninput="handleFormFieldInteraction('open_savings', 'phone', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'phone', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="savingsSourceFunds">Source of Funds *</label>
              <select id="savingsSourceFunds" class="form-input" required onchange="handleFormFieldInteraction('open_savings', 'source_of_funds', 'change')">
                <option value="Salaried Employment" selected>Salaried Employment</option>
                <option value="Business Revenue">Business Revenue</option>
                <option value="Investment Returns">Investment Returns</option>
              </select>
            </div>
          </div>

          <div class="form-actions-row">
            <button type="button" class="btn btn-secondary" id="btnSavingsFill" onclick="fillSavingsDemo()">
              ⚡ Fill Demo Details
            </button>
            <button type="submit" class="btn btn-primary" id="btnOpenSavingsSubmit">
              Open Savings Account
            </button>
          </div>
        </form>

        <!-- Savings Result Box -->
        <div class="form-success-box" id="savingsSuccessBox" style="display: none;">
          <div class="success-icon">✓</div>
          <h3>Account Created</h3>
          <p>Registration Ticket: <strong id="savingsRefCode">INF-ACC-2026-55102</strong></p>
          <button type="button" class="btn btn-outline btn-xs" onclick="resetSavingsForm()">Open Another</button>
        </div>
      </section>


      <!-- FORM 3: CUSTOMER LOGIN FORM -->
      <section class="bfsi-simple-card" id="customer-login">
        <div class="card-top-header">
          <h2 class="card-heading">3. Customer Login</h2>
        </div>

        <form class="bfsi-form-clean" id="customerLoginForm" onsubmit="submitLoginForm(event)">
          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="loginCustomerId">Customer ID / User ID *</label>
              <input type="text" id="loginCustomerId" class="form-input" placeholder="e.g. INF-984210" required oninput="handleFormFieldInteraction('customer_login', 'customer_id', 'input')" onfocus="handleFormFieldInteraction('customer_login', 'customer_id', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="loginPassword">Password / PIN *</label>
              <input type="password" id="loginPassword" class="form-input" placeholder="••••••••" required oninput="handleFormFieldInteraction('customer_login', 'password', 'input')" onfocus="handleFormFieldInteraction('customer_login', 'password', 'focus')">
            </div>
          </div>

          <div class="checkbox-row" style="margin: 8px 0 12px;">
            <label class="remember-label" style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #475569; cursor: pointer;">
              <input type="checkbox" id="loginRememberMe" checked>
              <span>Remember Customer ID</span>
            </label>
          </div>

          <div class="form-actions-row">
            <button type="button" class="btn btn-secondary" id="btnLoginFill" onclick="fillLoginDemo()">
              ⚡ Fill Demo Login
            </button>
            <button type="submit" class="btn btn-primary" id="btnLoginSubmit">
              Login to NetBanking
            </button>
          </div>
        </form>

        <!-- Logged In State Box -->
        <div class="form-success-box" id="loginSuccessBox" style="display: none;">
          <div class="success-icon">✓</div>
          <h3>NetBanking Active</h3>
          <p>Welcome back, <strong id="loggedInUserName">Lord Alistair Vance</strong> (Account: ••••8492)</p>
          <button type="button" class="btn btn-outline btn-xs" onclick="logoutCustomer()">Logout</button>
        </div>
      </section>

      <!-- ABOUT US: COMPACT & SIMPLE -->
      <section class="bfsi-simple-card about-us-card" id="about-us">
        <div class="card-top-header">
          <h2 class="card-heading">About Infinity Bank</h2>
        </div>
        <div class="about-points-simple">
          <span>🏛️ Licensed Banking Institution</span>
          <span>•</span>
          <span>🔒 256-Bit SSL &amp; DPDP Compliant</span>
          <span>•</span>
          <span>⚡ 24/7 Priority Support</span>
        </div>
      </section>

    </div>
  </main>

  <!-- =========================================================================
       FOOTER: SIMPLE TEXT WITH HYPERLINKS (NO BOXES, REDUCED COMPACT FONTS)
       ========================================================================= -->
  <footer class="simple-text-footer">
    <div class="section-container text-center">
      <div class="footer-inline-links">
        <a href="ecommerce.html" id="footerSwitchEcom">Switch to E-Commerce Store</a>
        <span class="sep">•</span>
        <a href="#apply-loan">Apply Loan</a>
        <span class="sep">•</span>
        <a href="#open-savings">Open Savings Account</a>
        <span class="sep">•</span>
        <a href="#customer-login">Customer Login</a>
        <span class="sep">•</span>
        <a href="tel:+18005550199" id="footerHelpCta">Helpline: +1 (800) 555-0199</a>
      </div>
      <p class="footer-simple-copy">© 2026 Infinity Bank. All rights reserved.</p>
    </div>
  </footer>

  <!-- Toast Container -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- Vanilla CookieConsent v3 & DPDP Configuration -->
  <script src="https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3.0.1/dist/cookieconsent.umd.js"></script>
  <script src="consent-init.js"></script>

  <!-- Main JavaScript & Matomo Modules -->
  <script src="matomo-tracker.js"></script>
  <script src="matomo.js"></script>
  <script src="app.js"></script>
</body>
</html>`;


// =========================================================================
// 2. CLEAN AURA BLUSH E-COMMERCE (ecommerce.html) - NO POPPING MODAL, NO EXTRA TEXT
// =========================================================================
const cleanEcommerceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google Consent Mode v2 Default (DPDP-Ready: Denied by default) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted'
    });
  </script>

  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-MMXM5L53');</script>
  <!-- End Google Tag Manager -->

  <!-- Matomo Tag Manager -->
  <script>
  var _mtm = window._mtm = window._mtm || [];
  _mtm.push({'mtm.startTime': (new Date().getTime()), 'event': 'mtm.Start'});
  (function() {
  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.async=true; g.src='https://matomo.35-234-210-199.nip.io/js/container_1Is4prw5.js'; s.parentNode.insertBefore(g,s);
  })();
  </script>
  <!-- End Matomo Tag Manager -->

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura &amp; Blush | Curated Products</title>
  <meta name="description" content="Aura &amp; Blush - Curated horology, bullion, and craftsmanship.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3.0.1/dist/cookieconsent.css">
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
</head>
<body class="page-ecommerce">
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MMXM5L53"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->

  <!-- Main Navigation Header -->
  <header class="site-header" id="siteHeader">
    <div class="header-container">
      
      <!-- Brand Logo -->
      <div class="header-left">
        <a href="ecommerce.html" class="brand-link" aria-label="Aura &amp; Blush Home">
          <span class="brand-crest">✦</span>
          <span class="brand-name">Aura &amp; Blush</span>
        </a>
      </div>

      <!-- Nav Links Center -->
      <nav class="nav-links desktop-only" id="mainNav">
        <a href="#curations" class="nav-item active">Collection</a>
      </nav>

      <!-- Header Actions Right -->
      <div class="header-actions">
        <!-- Switch to BFSI Banking -->
        <a href="index.html" class="header-dpdp-pill" title="Switch to BFSI Banking" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #10B981; font-size: 0.82rem; padding: 5px 10px;">
          <span>🏛️ BFSI Banking</span>
        </a>

        <!-- Currency Selector -->
        <div class="currency-selector">
          <select id="currencySelect" aria-label="Select Currency">
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CAD">CAD ($)</option>
          </select>
        </div>

        <!-- Wishlist Button -->
        <button class="action-btn" id="wishlistTrigger" aria-label="View Wishlist">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span class="badge-count" id="wishlistCount">0</span>
        </button>

        <!-- Cart Button -->
        <button class="action-btn cart-btn" id="cartTrigger" aria-label="Open Shopping Bag">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="badge-count" id="cartCount">0</span>
          <span class="cart-subtotal desktop-only" id="headerCartTotal">$0.00</span>
        </button>
      </div>

    </div>
  </header>

  <!-- Product Showcase Section: Exactly 7 Products, No Extra Content -->
  <section class="products-section" id="curations" style="padding: 24px 0 40px;">
    <div class="section-container">
      
      <div class="section-header" style="text-align: center; margin-bottom: 20px;">
        <h2 class="section-title" style="font-size: 1.3rem; font-weight: 700;">Curated Collection (7 Products)</h2>
      </div>

      <!-- Product Grid (Populated dynamically via app.js) -->
      <div class="products-grid" id="productsGrid">
        <!-- Rendered by app.js -->
      </div>
    </div>
  </section>

  <!-- Shopping Bag Drawer -->
  <div class="drawer-overlay" id="cartOverlay"></div>
  <aside class="cart-drawer" id="cartDrawer" aria-label="Shopping Bag">
    <div class="drawer-header">
      <div class="drawer-title-wrap">
        <h3 class="drawer-title">Shopping Bag</h3>
        <span class="item-count-badge" id="cartBadgeCount">(0 items)</span>
      </div>
      <button class="drawer-close-btn" id="closeCartBtn" aria-label="Close Shopping Bag">✕</button>
    </div>

    <div class="cart-items-container" id="cartItemsList">
      <!-- Items dynamically populated -->
    </div>

    <div class="cart-drawer-footer" id="cartFooter">
      <div class="summary-line subtotal">
        <span>Subtotal</span>
        <span class="amount" id="drawerSubtotal">$0.00</span>
      </div>
      <button class="btn btn-primary btn-checkout" id="checkoutBtn">
        <span>Proceed to Secure Checkout</span>
      </button>
    </div>
  </aside>

  <!-- Wishlist Drawer -->
  <div class="drawer-overlay" id="wishlistOverlay"></div>
  <aside class="wishlist-drawer" id="wishlistDrawer" aria-label="Saved Wishlist">
    <div class="drawer-header">
      <div class="drawer-title-wrap">
        <h3 class="drawer-title">Saved Wishlist</h3>
        <span class="item-count-badge" id="wishlistBadgeCount">(0 items)</span>
      </div>
      <button class="drawer-close-btn" id="closeWishlistBtn" aria-label="Close Wishlist">✕</button>
    </div>

    <div class="wishlist-items-container" id="wishlistItemsList">
      <!-- Items dynamically populated -->
    </div>
  </aside>

  <!-- Product Quick View Modal (Properly hidden by default with .quickview-modal) -->
  <div class="quickview-modal" id="productModal">
    <div class="modal-window">
      <button class="modal-close-btn" id="closeModalBtn" aria-label="Close modal">✕</button>
      <div class="modal-body" id="modalProductContent">
        <!-- Rendered dynamically -->
      </div>
    </div>
  </div>

  <!-- 4-Step Checkout Modal (Properly hidden by default with .checkout-modal-backdrop) -->
  <div class="checkout-modal-backdrop" id="checkoutModal">
    <div class="modal-window checkout-modal-window">
      <button class="modal-close-btn" id="closeCheckoutBtn" aria-label="Close checkout">✕</button>
      
      <div class="checkout-header">
        <h2 class="checkout-title" style="font-size: 1.15rem;">Secure Checkout</h2>
        <div class="checkout-stepper">
          <div class="step active" data-step="1"><span>1</span><label>Contact</label></div>
          <div class="step-line"></div>
          <div class="step" data-step="2"><span>2</span><label>Delivery</label></div>
          <div class="step-line"></div>
          <div class="step" data-step="3"><span>3</span><label>Payment</label></div>
          <div class="step-line"></div>
          <div class="step" data-step="4"><span>4</span><label>Receipt</label></div>
        </div>
      </div>

      <div class="checkout-body">
        <!-- Step 1: Customer Details -->
        <div class="checkout-step-panel active" id="step1">
          <h3 class="step-heading" style="font-size: 0.95rem;">Client Identity &amp; Contact</h3>
          <form class="checkout-form" id="contactForm">
            <div class="form-row">
              <div class="form-group">
                <label for="checkoutFname">First Name *</label>
                <input type="text" id="checkoutFname" required placeholder="Lord Alistair">
              </div>
              <div class="form-group">
                <label for="checkoutLname">Last Name *</label>
                <input type="text" id="checkoutLname" required placeholder="Vance">
              </div>
            </div>
            <div class="form-group">
              <label for="checkoutEmail">Email *</label>
              <input type="email" id="checkoutEmail" required placeholder="vance@sovereign-holdings.ch">
            </div>
            <div class="form-group">
              <label for="checkoutPhone">Mobile *</label>
              <input type="tel" id="checkoutPhone" required placeholder="+41 22 819 0000">
            </div>
            <div class="step-actions">
              <button type="button" class="btn btn-primary" id="toStep2Btn">Continue to Delivery</button>
            </div>
          </form>
        </div>

        <!-- Step 2: Shipping -->
        <div class="checkout-step-panel" id="step2">
          <h3 class="step-heading" style="font-size: 0.95rem;">Delivery Address</h3>
          <form class="checkout-form" id="shippingForm">
            <div class="form-group">
              <label for="shipAddress">Address *</label>
              <input type="text" id="shipAddress" required placeholder="74 Rue du Rhône, Suite 400">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="shipCity">City *</label>
                <input type="text" id="shipCity" required placeholder="Geneva">
              </div>
              <div class="form-group">
                <label for="shipZip">Postal Code *</label>
                <input type="text" id="shipZip" required placeholder="1204">
              </div>
            </div>
            <div class="step-actions dual-actions">
              <button type="button" class="btn btn-outline" id="backToStep1Btn">Back</button>
              <button type="button" class="btn btn-primary" id="toStep3Btn">Continue to Payment</button>
            </div>
          </form>
        </div>

        <!-- Step 3: Payment -->
        <div class="checkout-step-panel" id="step3">
          <h3 class="step-heading" style="font-size: 0.95rem;">Payment</h3>
          <form class="checkout-form" id="paymentForm">
            <div class="form-group">
              <label for="cardNum">Card Number *</label>
              <input type="text" id="cardNum" required placeholder="•••• •••• •••• 8492" maxlength="19">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="cardExp">Expiry *</label>
                <input type="text" id="cardExp" required placeholder="12/28" maxlength="5">
              </div>
              <div class="form-group">
                <label for="cardCvv">CVV *</label>
                <input type="password" id="cardCvv" required placeholder="•••" maxlength="4">
              </div>
            </div>
            <div class="order-summary-box">
              <div class="order-line"><span>Total</span><strong id="checkoutFinalTotal">$0.00</strong></div>
            </div>
            <div class="step-actions dual-actions">
              <button type="button" class="btn btn-outline" id="backToStep2Btn">Back</button>
              <button type="button" class="btn btn-primary" id="completeOrderBtn">Pay &amp; Complete</button>
            </div>
          </form>
        </div>

        <!-- Step 4: Receipt -->
        <div class="checkout-step-panel" id="step4">
          <div class="order-success-card">
            <div class="success-icon">✓</div>
            <h3 class="success-title">Order Confirmed</h3>
            <p class="order-id-label">TRANSACTION ID: <span id="receiptOrderId">#INF-84920</span></p>
            <button type="button" class="btn btn-primary btn-sm" id="finishCheckoutBtn">Back to Store</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Simple Text Footer -->
  <footer class="simple-text-footer">
    <div class="section-container text-center">
      <div class="footer-inline-links">
        <a href="index.html">🏛️ Go to BFSI Banking Portal</a>
        <span class="sep">•</span>
        <a href="#curations">Curated Products</a>
      </div>
      <p class="footer-simple-copy">© 2026 Aura &amp; Blush Atelier. All rights reserved.</p>
    </div>
  </footer>

  <!-- Toast Container -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- Vanilla CookieConsent v3 & DPDP Configuration -->
  <script src="https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3.0.1/dist/cookieconsent.umd.js"></script>
  <script src="consent-init.js"></script>

  <!-- Main JavaScript & Matomo Modules -->
  <script src="matomo-tracker.js"></script>
  <script src="matomo.js"></script>
  <script src="app.js"></script>
</body>
</html>`;


// =========================================================================
// 3. REFINED STYLES: REDUCED FONTS, COMPACT PROPORTIONS, SIMPLE TEXT FOOTER
// =========================================================================
const cleanStyles = `
/* =========================================================================
   REFINED COMPACT BFSI & E-COMMERCE STYLES (REDUCED FONTS, NO BOX FOOTER)
   ========================================================================= */

/* Header */
.bfsi-clean-header {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  height: 60px !important;
}

.site-header .nav-links .nav-item {
  font-size: 0.82rem !important;
  font-weight: 500;
  color: #334155;
}

.hamburger-toggle-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e293b;
  transition: all 0.15s ease;
}

.hamburger-toggle-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.hamburger-menu-panel {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 16px;
  width: 260px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.12);
  z-index: 1100;
  overflow: hidden;
}

.hamburger-menu-panel.active {
  display: block;
}

.hamburger-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.hamburger-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.hamburger-close-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #94a3b8;
  cursor: pointer;
}

.hamburger-options-list {
  padding: 4px 0;
}

.hamburger-option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  text-decoration: none;
  color: #1e293b;
  font-size: 0.82rem;
  transition: background 0.15s ease;
}

.hamburger-option-item:hover {
  background: #f1f5f9;
}

.hamburger-option-item.highlight-ecom {
  background: #f0fdf4;
  border-left: 3px solid #10b981;
}

/* Reduced Container & Compact Forms */
.simple-forms-container {
  padding: 24px 16px 40px;
  background: #f8fafc;
}

.bfsi-simple-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px 22px;
  margin-bottom: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  scroll-margin-top: 70px;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}

.card-top-header {
  margin-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.card-heading {
  font-size: 1.12rem !important;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.bfsi-form-clean {
  margin-top: 10px;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.form-field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field-group label {
  font-size: 0.78rem !important;
  font-weight: 600;
  color: #475569;
}

.form-input {
  width: 100%;
  height: 36px !important;
  padding: 6px 10px !important;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem !important;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
}

.form-actions-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.form-actions-row .btn {
  flex: 1;
  min-width: 140px;
  height: 38px !important;
  font-size: 0.85rem !important;
  font-weight: 600;
  padding: 0 14px;
  border-radius: 6px;
}

.btn-secondary {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  background: #0f172a;
  border: 1px solid #0f172a;
  color: #ffffff;
}

.btn-primary:hover {
  background: #1e293b;
}

.btn-xs {
  height: 28px !important;
  padding: 0 10px !important;
  font-size: 0.75rem !important;
}

/* Success Box */
.form-success-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  margin-top: 12px;
}

.form-success-box .success-icon {
  font-size: 1.3rem;
  color: #16a34a;
  font-weight: bold;
}

.form-success-box h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #166534;
  margin: 4px 0;
}

.form-success-box p {
  font-size: 0.82rem;
  color: #15803d;
  margin: 4px 0 8px;
}

/* About Us Simple Line */
.about-points-simple {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: #64748b;
  padding: 8px 0;
}

/* =========================================================================
   SIMPLE TEXT FOOTER (NO BOXES, REDUCED COMPACT FONTS)
   ========================================================================= */
.simple-text-footer {
  background: #0f172a;
  color: #94a3b8;
  padding: 24px 16px 20px;
  border-top: 1px solid #1e293b;
}

.footer-inline-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.footer-inline-links a {
  font-size: 0.82rem !important;
  color: #cbd5e1;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s ease;
}

.footer-inline-links a:hover {
  color: #ffffff;
}

.footer-inline-links .sep {
  color: #475569;
  font-size: 0.75rem;
}

.footer-simple-copy {
  font-size: 0.74rem !important;
  color: #64748b;
  margin: 0;
}

/* Hidden Modal State Guards */
.checkout-modal-backdrop,
.quickview-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.checkout-modal-backdrop.active,
.quickview-modal.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
`;


// =========================================================================
// 4. WRITE REFINED FILES ACROSS ALL DIRECTORIES
// =========================================================================
const targetDirs = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targetDirs.forEach(dir => {
  const indexPath = path.join(dir, 'index.html');
  const ecomPath = path.join(dir, 'ecommerce.html');
  const bfsiPath = path.join(dir, 'bfsi.html');
  const cssPath = path.join(dir, 'styles.css');

  fs.writeFileSync(indexPath, cleanBfsiHtml, 'utf8');
  fs.writeFileSync(ecomPath, cleanEcommerceHtml, 'utf8');
  fs.writeFileSync(bfsiPath, cleanBfsiHtml, 'utf8');

  let currentCss = fs.readFileSync(cssPath, 'utf8');
  // Remove previously appended block if present
  if (currentCss.includes('REFINED COMPACT BFSI & E-COMMERCE STYLES')) {
    const cutIdx = currentCss.indexOf('REFINED COMPACT BFSI & E-COMMERCE STYLES');
    currentCss = currentCss.substring(0, cutIdx - 3);
  }
  fs.writeFileSync(cssPath, currentCss + '\n' + cleanStyles, 'utf8');
  console.log('Synchronized index.html, ecommerce.html, bfsi.html, and styles.css in ' + dir);
});

// Update dataLayer logging in app.js for full visibility
targetDirs.forEach(dir => {
  const appPath = path.join(dir, 'app.js');
  if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');
    
    // Add enhanced console logging for all dataLayer events
    if (!appContent.includes('[GA4 dataLayer.push 📊]')) {
      appContent = appContent.replace(
        'window.dataLayer.push(interactionPayload);',
        `window.dataLayer.push(interactionPayload);
  console.log('%c[GA4 dataLayer.push 📊]%c form_interaction', 'background: #0284c7; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 3px;', 'color: #0f172a; font-weight: bold;', interactionPayload);`
      );
      appContent = appContent.replace(
        'window.dataLayer.push(ga4Payload);',
        `window.dataLayer.push(ga4Payload);
  console.log('%c[GA4 dataLayer.push 📊]%c ' + ga4Payload.event, 'background: #16a34a; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 3px;', 'color: #0f172a; font-weight: bold;', ga4Payload);`
      );
      fs.writeFileSync(appPath, appContent, 'utf8');
      console.log('Enhanced dataLayer console logging in ' + appPath);
    }
  }
});

console.log('All refinements applied successfully!');
