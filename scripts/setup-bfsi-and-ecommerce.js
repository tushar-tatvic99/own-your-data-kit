const fs = require('fs');
const path = require('path');

console.log('Building BFSI Landing Page, Streamlined Aura Blush E-Commerce, and Analytics...');

// =========================================================================
// 1. GENERATE BFSI LANDING PAGE (index.html)
// =========================================================================
const bfsiLandingHtml = `<!DOCTYPE html>
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
  <meta name="description" content="Apply for personal and mortgage loans, open high-yield savings accounts, and access secure NetBanking at Infinity Bank.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
        <a href="#home" class="nav-item">Home page</a>
        <a href="#apply-loan" class="nav-item">Apply loan</a>
        <a href="#open-savings" class="nav-item">open savings account</a>
        <a href="#about-us" class="nav-item">about us</a>
        <a href="#customer-login" class="nav-item">Login</a>
      </nav>

      <!-- Right: Hamburger Menu Button & Dropdown -->
      <div class="header-actions">
        <button class="hamburger-toggle-btn" id="bfsiHamburgerBtn" aria-label="Open menu" aria-expanded="false" title="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <!-- Dropdown Menu Triggered by Hamburger -->
        <div class="hamburger-menu-panel" id="hamburgerMenuPanel">
          <div class="hamburger-panel-header">
            <span class="hamburger-title">Account &amp; Navigation</span>
            <button class="hamburger-close-btn" id="closeHamburgerBtn" aria-label="Close menu">✕</button>
          </div>
          <div class="hamburger-options-list">
            <a href="ecommerce.html" class="hamburger-option-item highlight-ecom" id="switchEcommerceHamburger">
              <span class="option-icon">🛍️</span>
              <div class="option-text">
                <strong>Switch to E-Commerce Account</strong>
                <small>Visit Aura Blush Store</small>
              </div>
            </a>
            <a href="#customer-login" class="hamburger-option-item" id="hamburgerOptionLogin">
              <span class="option-icon">🔐</span>
              <div class="option-text">
                <strong>Login</strong>
                <small>Sign in to NetBanking portal</small>
              </div>
            </a>
            <a href="#open-savings" class="hamburger-option-item" id="hamburgerOptionRegister">
              <span class="option-icon">📝</span>
              <div class="option-text">
                <strong>Account Creation</strong>
                <small>Open a new savings account</small>
              </div>
            </a>
            <a href="#apply-loan" class="hamburger-option-item" id="hamburgerOptionLoan">
              <span class="option-icon">💰</span>
              <div class="option-text">
                <strong>Apply for Loan</strong>
                <small>Quick loan application</small>
              </div>
            </a>
          </div>
        </div>
      </div>

    </div>
  </header>

  <!-- Clean BFSI Hero / Welcome Section -->
  <section class="simple-bfsi-hero" id="home">
    <div class="section-container text-center">
      <div class="simple-hero-badge">🏛️ Licensed &amp; Insured Banking Institution</div>
      <h1 class="simple-hero-title">Infinity Banking &amp; Financial Services</h1>
      <p class="simple-hero-subtitle">Simple, straightforward banking. Apply for loans, open high-yield savings accounts, or login to your online account below.</p>
      <div class="simple-hero-quicklinks">
        <a href="#apply-loan" class="btn btn-primary btn-sm">Apply for Loan ↓</a>
        <a href="#open-savings" class="btn btn-secondary btn-sm">Open Savings Account ↓</a>
        <a href="#customer-login" class="btn btn-outline btn-sm">Customer Login ↓</a>
      </div>
    </div>
  </section>

  <!-- =========================================================================
       THE 3 SIMPLE FORMS CONTAINER
       ========================================================================= -->
  <main class="simple-forms-container">
    <div class="section-container">

      <!-- FORM 1: APPLY LOAN FORM -->
      <section class="bfsi-simple-card" id="apply-loan">
        <div class="card-top-header">
          <div class="card-badge">💰 LOAN APPLICATION</div>
          <h2 class="card-heading">1. Apply for a Loan</h2>
          <p class="card-subtext">Competitive fixed rates starting at 7.65% APR. Complete the simple form below for an instant quote.</p>
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
              <label for="loanAmountInput">Requested Loan Amount ($) *</label>
              <input type="number" id="loanAmountInput" class="form-input" min="5000" max="2500000" step="5000" value="50000" required oninput="handleFormFieldInteraction('apply_loan', 'loan_amount', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'loan_amount', 'focus')">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="loanTenureSelect">Repayment Tenure *</label>
              <select id="loanTenureSelect" class="form-input" required onchange="handleFormFieldInteraction('apply_loan', 'loan_tenure', 'change')">
                <option value="1">1 Year (12 Months)</option>
                <option value="3">3 Years (36 Months)</option>
                <option value="5" selected>5 Years (60 Months)</option>
                <option value="10">10 Years (120 Months)</option>
                <option value="15">15 Years (180 Months)</option>
                <option value="20">20 Years (240 Months)</option>
              </select>
            </div>

            <div class="form-field-group">
              <label for="loanAnnualIncome">Annual Income Bracket *</label>
              <select id="loanAnnualIncome" class="form-input" required onchange="handleFormFieldInteraction('apply_loan', 'annual_income', 'change')">
                <option value="under_50k">Under $50,000</option>
                <option value="50k_100k" selected>$50,000 – $100,000</option>
                <option value="100k_250k">$100,000 – $250,000</option>
                <option value="250k_plus">$250,000+ (High Net Worth)</option>
              </select>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-field-group">
              <label for="loanFullName">Full Legal Name *</label>
              <input type="text" id="loanFullName" class="form-input" placeholder="e.g. Rahul Sharma" required oninput="handleFormFieldInteraction('apply_loan', 'full_name', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'full_name', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="loanEmail">Email Address *</label>
              <input type="email" id="loanEmail" class="form-input" placeholder="e.g. rahul@example.com" required oninput="handleFormFieldInteraction('apply_loan', 'email', 'input')" onfocus="handleFormFieldInteraction('apply_loan', 'email', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="loanPhone">Mobile Number *</label>
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
          <div class="success-icon">🎉</div>
          <h3>Loan Application Submitted Successfully!</h3>
          <p>Your application dossier has been verified and pre-approved by our underwriting desk.</p>
          <div class="ref-pill">
            <span>Reference Ticket:</span>
            <strong id="loanRefCode">INF-LOAN-2026-89412</strong>
          </div>
          <p class="estimated-detail" id="loanEstimatedEmiText">Estimated Monthly EMI: <strong>$1,010 / month</strong></p>
          <button type="button" class="btn btn-outline btn-sm" onclick="resetLoanForm()">Apply for Another Loan</button>
        </div>
      </section>


      <!-- FORM 2: OPEN SAVINGS ACCOUNT FORM -->
      <section class="bfsi-simple-card" id="open-savings">
        <div class="card-top-header">
          <div class="card-badge">📈 SAVINGS &amp; WEALTH</div>
          <h2 class="card-heading">2. Open Savings Account</h2>
          <p class="card-subtext">Earn high annualized yields up to 8.45% APY with zero account opening or maintenance fees.</p>
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
              <label for="savingsDepositAmount">Initial Deposit Amount ($) *</label>
              <input type="number" id="savingsDepositAmount" class="form-input" min="100" max="1000000" step="500" value="10000" required oninput="handleFormFieldInteraction('open_savings', 'initial_deposit', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'initial_deposit', 'focus')">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="savingsFullName">Full Legal Name *</label>
              <input type="text" id="savingsFullName" class="form-input" placeholder="e.g. Priya Sharma" required oninput="handleFormFieldInteraction('open_savings', 'full_name', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'full_name', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="savingsEmail">Email Address *</label>
              <input type="email" id="savingsEmail" class="form-input" placeholder="e.g. priya@example.com" required oninput="handleFormFieldInteraction('open_savings', 'email', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'email', 'focus')">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="savingsPhone">Mobile Number *</label>
              <input type="tel" id="savingsPhone" class="form-input" placeholder="e.g. +91 98111 22334" required oninput="handleFormFieldInteraction('open_savings', 'phone', 'input')" onfocus="handleFormFieldInteraction('open_savings', 'phone', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="savingsSourceFunds">Primary Source of Funds *</label>
              <select id="savingsSourceFunds" class="form-input" required onchange="handleFormFieldInteraction('open_savings', 'source_of_funds', 'change')">
                <option value="Salaried Employment" selected>Salaried Employment</option>
                <option value="Business Revenue">Business Revenue / Self-Employed</option>
                <option value="Investment Returns">Investment Returns / Dividends</option>
                <option value="Inheritance or Savings">Inheritance or Personal Savings</option>
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
          <div class="success-icon">🏛️</div>
          <h3>Savings Account Registered!</h3>
          <p>Your digital onboarding is complete. A welcome kit and credentials have been dispatched to your email.</p>
          <div class="ref-pill">
            <span>Account Registration ID:</span>
            <strong id="savingsRefCode">INF-ACC-2026-55102</strong>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="resetSavingsForm()">Open Another Account</button>
        </div>
      </section>


      <!-- FORM 3: CUSTOMER LOGIN / ACCOUNT PORTAL FORM -->
      <section class="bfsi-simple-card" id="customer-login">
        <div class="card-top-header">
          <div class="card-badge">🔐 SECURE NETBANKING</div>
          <h2 class="card-heading">3. Customer Login</h2>
          <p class="card-subtext">Access your Infinity Bank accounts, transfer funds, download tax statements, and manage cards.</p>
        </div>

        <form class="bfsi-form-clean" id="customerLoginForm" onsubmit="submitLoginForm(event)">
          <div class="form-grid-2">
            <div class="form-field-group">
              <label for="loginCustomerId">Customer ID / User ID *</label>
              <input type="text" id="loginCustomerId" class="form-input" placeholder="e.g. INF-984210" required oninput="handleFormFieldInteraction('customer_login', 'customer_id', 'input')" onfocus="handleFormFieldInteraction('customer_login', 'customer_id', 'focus')">
            </div>

            <div class="form-field-group">
              <label for="loginPassword">NetBanking Password / PIN *</label>
              <input type="password" id="loginPassword" class="form-input" placeholder="••••••••" required oninput="handleFormFieldInteraction('customer_login', 'password', 'input')" onfocus="handleFormFieldInteraction('customer_login', 'password', 'focus')">
            </div>
          </div>

          <div class="checkbox-row" style="margin: 10px 0 16px;">
            <label class="remember-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #475569; cursor: pointer;">
              <input type="checkbox" id="loginRememberMe" checked>
              <span>Remember my Customer ID on this secure device</span>
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
          <div class="success-icon">✅</div>
          <h3>NetBanking Session Active</h3>
          <p>Welcome back, <strong id="loggedInUserName">Lord Alistair Vance</strong>!</p>
          <div class="ref-pill" style="margin: 12px auto; max-width: 380px;">
            <span>Account Number:</span>
            <strong>•••• •••• •••• 8492</strong>
            <span style="margin-left: 12px; color: #10B981; font-weight: 700;">Balance: $148,250.00</span>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="logoutCustomer()">Secure Logout</button>
        </div>
      </section>

      <!-- ABOUT US SECTION -->
      <section class="bfsi-simple-card about-us-card" id="about-us">
        <div class="card-top-header">
          <div class="card-badge">ℹ️ INSTITUTIONAL PROFILE</div>
          <h2 class="card-heading">About Infinity Bank</h2>
          <p class="card-subtext">Infinity Bank delivers high-tier retail banking, bespoke lending, and sovereign wealth management.</p>
        </div>
        <div class="about-points-grid">
          <div class="about-point-item">
            <span class="about-icon">🏛️</span>
            <h4>Licensed &amp; Regulated</h4>
            <p>Operates under central banking authority regulations with statutory customer asset segregation.</p>
          </div>
          <div class="about-point-item">
            <span class="about-icon">🔒</span>
            <h4>DPDP &amp; 256-Bit SSL</h4>
            <p>Full statutory compliance with the Digital Personal Data Protection (DPDP) Act and bank-grade data security.</p>
          </div>
          <div class="about-point-item">
            <span class="about-icon">⚡</span>
            <h4>24/7 Client Support</h4>
            <p>Instant digital banking, direct branch assistance, and priority customer care desks.</p>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- =========================================================================
       FOOTER: JUST 3 SIMPLE CTAs AS REQUESTED
       ========================================================================= -->
  <footer class="simple-bfsi-footer">
    <div class="section-container">
      <div class="footer-3-ctas-grid">
        <!-- CTA 1: Switch to E-Commerce Account -->
        <a href="ecommerce.html" class="footer-cta-card highlight-ecom-cta" id="footerSwitchEcom">
          <span class="cta-emoji">🛍️</span>
          <div class="cta-info">
            <strong>Switch to E-Commerce Store</strong>
            <span>Explore Aura Blush Curated Products</span>
          </div>
          <span class="cta-arrow">→</span>
        </a>

        <!-- CTA 2: Privacy & DPDP Rights Center -->
        <a href="ecommerce.html#dpdp-erasure" class="footer-cta-card" id="footerPrivacyCta">
          <span class="cta-emoji">🔒</span>
          <div class="cta-info">
            <strong>DPDP Privacy &amp; Data Rights</strong>
            <span>Manage Consent, Download or Erase Data</span>
          </div>
          <span class="cta-arrow">→</span>
        </a>

        <!-- CTA 3: 24/7 Support Helpline -->
        <a href="tel:+18005550199" class="footer-cta-card" id="footerHelpCta">
          <span class="cta-emoji">📞</span>
          <div class="cta-info">
            <strong>24/7 Priority Banking Helpline</strong>
            <span>Direct Concierge: +1 (800) 555-0199</span>
          </div>
          <span class="cta-arrow">→</span>
        </a>
      </div>

      <div class="footer-bottom-line">
        <p>© 2026 Infinity Financial Services Ltd. All rights reserved. Statutory Deposit Insurance Scheme applies.</p>
      </div>
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
// 2. GENERATE STREAMLINED AURA BLUSH E-COMMERCE PAGE (ecommerce.html)
// =========================================================================
const ecommerceHtml = `<!DOCTYPE html>
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
  <title>Aura &amp; Blush Atelier | Curated Collection</title>
  <meta name="description" content="Aura &amp; Blush Atelier - Fine horology, certified physical bullion, and cryptographic security.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
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
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="header-left">
        <button class="mobile-toggle-btn" id="mobileMenuBtn" aria-label="Toggle navigation menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <a href="ecommerce.html" class="brand-link" aria-label="Aura &amp; Blush Home">
          <span class="brand-crest">✦</span>
          <span class="brand-name">Aura &amp; Blush</span>
        </a>
      </div>

      <!-- Nav Links Center (Desktop) -->
      <nav class="nav-links desktop-only" id="mainNav">
        <a href="#curations" class="nav-item active">Collection</a>
        <a href="#about" class="nav-item">About Us</a>
        <a href="#dpdp-erasure" class="nav-item">Privacy &amp; DPDP</a>
      </nav>

      <!-- Header Actions Right -->
      <div class="header-actions">
        <!-- Direct Quick Jump to BFSI Banking -->
        <a href="index.html" class="header-dpdp-pill" title="Switch to BFSI Banking" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #10B981;">
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

    <!-- Mobile Navigation Drawer Panel -->
    <div class="mobile-nav-panel" id="mobileNavPanel">
      <div class="mobile-links-list">
        <a href="index.html" class="mobile-nav-link highlight">🏛️ Go to BFSI Banking</a>
        <a href="#curations" class="mobile-nav-link active">Collection (7 Products)</a>
        <a href="#about" class="mobile-nav-link">About Aura &amp; Blush</a>
        <a href="#dpdp-erasure" class="mobile-nav-link">DPDP Privacy &amp; Erasure</a>
      </div>
    </div>
  </header>

  <!-- Clean Minimal Hero -->
  <section class="hero-section" id="hero" style="padding: 40px 0 20px;">
    <div class="hero-container text-center" style="max-width: 800px; margin: 0 auto;">
      <div class="hero-badge" style="display: inline-flex; margin-bottom: 12px;">
        <span class="badge-dot badge-dot-emerald"></span>
        <span>Aura &amp; Blush Atelier</span>
      </div>
      <h1 class="hero-title" style="font-size: 2.2rem; margin-bottom: 10px;">
        Curated Luxury &amp; <span class="highlight-serif">Fine Horology</span>
      </h1>
      <p class="hero-subtitle" style="font-size: 0.95rem; color: #64748b; margin-bottom: 16px;">
        Precision Swiss chronometers, 24K minted gold bullion, and bespoke craftsmanship.
      </p>
    </div>
  </section>

  <!-- Main Product Showcase Section: Exactly 7 Products -->
  <section class="products-section" id="curations">
    <div class="section-container">
      
      <div class="section-header" style="text-align: center; margin-bottom: 24px;">
        <span class="section-pretitle">ATELIER SHOWCASE</span>
        <h2 class="section-title">Curated Collection (7 Products)</h2>
      </div>

      <!-- Product Grid (Populated dynamically via app.js) -->
      <div class="products-grid" id="productsGrid">
        <!-- Rendered by app.js -->
      </div>
    </div>
  </section>

  <!-- Minimal About Section -->
  <section class="about-section" id="about" style="padding: 40px 0; background: #fafafa; border-top: 1px solid #eaeaea;">
    <div class="section-container" style="max-width: 800px; text-align: center; margin: 0 auto;">
      <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 10px;">About Aura &amp; Blush</h3>
      <p style="font-size: 0.9rem; color: #64748b; line-height: 1.6;">
        Aura &amp; Blush Atelier is committed to certified purity, authentic craftsmanship, and fully encrypted, DPDP-compliant private commerce.
      </p>
      <div style="margin-top: 16px;">
        <a href="index.html" class="btn btn-primary btn-sm">🏛️ Switch to BFSI Banking Portal</a>
      </div>
    </div>
  </section>

  <!-- DPDP Section (Minimal & Compliant) -->
  <section class="dpdp-section" id="dpdp-erasure" style="padding: 30px 0; border-top: 1px solid #eee;">
    <div class="section-container" style="max-width: 800px; margin: 0 auto; text-align: center;">
      <span style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; color: #4F46E5;">DPDP ACT 2023 COMPLIANCE</span>
      <h4 style="font-size: 1.2rem; font-weight: 700; margin: 6px 0 12px;">Your Data Privacy Rights</h4>
      <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 16px;">Exercise your rights to withdraw consent, request summary of data, or request erasure under Section 12.</p>
      <button type="button" class="btn btn-outline btn-sm" onclick="showToast('🔒', 'Privacy Center', 'DPDP Compliance Active. All rights preserved.')">Data Privacy Options</button>
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
      <p class="tax-shipping-note">Complimentary insured armored courier on all orders.</p>
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

  <!-- Product Quick View Modal -->
  <div class="modal-backdrop" id="productModal">
    <div class="modal-window">
      <button class="modal-close-btn" id="closeModalBtn" aria-label="Close modal">✕</button>
      <div class="modal-body" id="modalProductContent">
        <!-- Rendered dynamically -->
      </div>
    </div>
  </div>

  <!-- 4-Step Checkout Modal -->
  <div class="modal-backdrop" id="checkoutModal">
    <div class="modal-window checkout-modal-window">
      <button class="modal-close-btn" id="closeCheckoutBtn" aria-label="Close checkout">✕</button>
      
      <div class="checkout-header">
        <h2 class="checkout-title">Secure Checkout</h2>
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
          <h3 class="step-heading">Client Identity &amp; Contact</h3>
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
          <h3 class="step-heading">Armored Escort Delivery</h3>
          <form class="checkout-form" id="shippingForm">
            <div class="form-group">
              <label for="shipAddress">Vault / Residence Address *</label>
              <input type="text" id="shipAddress" required placeholder="74 Rue du Rhône, Private Suite 400">
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
            <div class="shipping-options">
              <label class="shipping-radio selected">
                <input type="radio" name="courier" value="armored" checked>
                <div class="radio-info">
                  <strong>Brinks Global Armored Courier (Insured)</strong>
                  <small>Delivered in biometric tamper-evident seal</small>
                </div>
                <span class="radio-price">Complimentary</span>
              </label>
            </div>
            <div class="step-actions dual-actions">
              <button type="button" class="btn btn-outline" id="backToStep1Btn">Back</button>
              <button type="button" class="btn btn-primary" id="toStep3Btn">Continue to Payment</button>
            </div>
          </form>
        </div>

        <!-- Step 3: Payment -->
        <div class="checkout-step-panel" id="step3">
          <h3 class="step-heading">Payment Authorization</h3>
          <div class="payment-tabs">
            <button type="button" class="payment-tab active" data-method="card">Infinity Titanium Card</button>
            <button type="button" class="payment-tab" data-method="wire">Direct Bank Wire</button>
          </div>
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
              <div class="order-line"><span>Total Payable</span><strong id="checkoutFinalTotal">$0.00</strong></div>
            </div>
            <div class="step-actions dual-actions">
              <button type="button" class="btn btn-outline" id="backToStep2Btn">Back</button>
              <button type="button" class="btn btn-primary" id="completeOrderBtn">Authorize &amp; Purchase</button>
            </div>
          </form>
        </div>

        <!-- Step 4: Receipt -->
        <div class="checkout-step-panel" id="step4">
          <div class="order-success-card">
            <div class="success-icon">✦</div>
            <h3 class="success-title">Order Confirmed</h3>
            <p class="order-id-label">TRANSACTION DOSSIER: <span id="receiptOrderId">#INF-84920</span></p>
            <p class="success-desc">Your order has been allocated from our private depository and scheduled for insured armored dispatch.</p>
            <button type="button" class="btn btn-primary" id="finishCheckoutBtn">Done &amp; Return to Atelier</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notifications Container -->
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
// 3. WRITE HTML FILES
// =========================================================================
const targets = [
  '.',
  'Matomo ecomm Web',
  'demo/infinity-shop'
];

targets.forEach(dir => {
  const indexPath = path.join(dir, 'index.html');
  const ecomPath = path.join(dir, 'ecommerce.html');
  const bfsiPath = path.join(dir, 'bfsi.html');

  fs.writeFileSync(indexPath, bfsiLandingHtml, 'utf8');
  fs.writeFileSync(ecomPath, ecommerceHtml, 'utf8');
  fs.writeFileSync(bfsiPath, bfsiLandingHtml, 'utf8'); // Also keep bfsi.html matching index.html
  console.log('Successfully generated index.html, ecommerce.html, bfsi.html in ' + dir);
});

console.log('HTML generation complete.');
