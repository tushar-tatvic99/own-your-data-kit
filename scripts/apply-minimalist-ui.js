const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPDATE index.html
// ==========================================
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace header block in index.html to remove switcher from inside header
const oldHeaderRegexIndex = /<!-- Main Navigation Header -->[\s\S]*?<\/header>/;
const newHeaderIndex = `<!-- Main Navigation Header -->
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

        <a href="index.html" class="brand-link" aria-label="Infinity Luxury Home">
          <span class="brand-crest">⬡</span>
          <span class="brand-name">Infinity</span>
        </a>
      </div>

      <!-- Nav Links Center (Desktop) -->
      <nav class="nav-links desktop-only" id="mainNav">
        <a href="index.html" class="nav-item active">Home</a>
        <a href="#curations" class="nav-item">Curations</a>
        <a href="#about" class="nav-item">About Us</a>
        <a href="#contact" class="nav-item">Contact</a>
        <a href="#dpdp-erasure" class="nav-item">Privacy &amp; DPDP</a>
      </nav>

      <!-- Header Actions Right -->
      <div class="header-actions">
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
        <a href="index.html" class="mobile-nav-link active">Home</a>
        <a href="#curations" class="mobile-nav-link">Curations (10 Products)</a>
        <a href="bfsi.html" class="mobile-nav-link highlight">Explore BFSI Banking 🏛️</a>
        <a href="#about" class="mobile-nav-link">About Us</a>
        <a href="#contact" class="mobile-nav-link">Contact Concierge</a>
        <a href="#dpdp-erasure" class="mobile-nav-link">DPDP Privacy &amp; Erasure</a>
      </div>
    </div>
  </header>

  <!-- Portal Experience Switcher Bar (Placed cleanly below header) -->
  <div class="portal-bar" id="portalBar">
    <div class="portal-container">
      <span class="portal-bar-label">SELECT EXPERIENCE:</span>
      <div class="portal-pills">
        <a href="index.html" class="portal-pill active" id="switchEcommerce">
          <span class="portal-icon">🛍️</span>
          <span class="portal-label">Luxury E-Commerce</span>
          <span class="portal-tag">10 Assets</span>
        </a>
        <a href="bfsi.html" class="portal-pill" id="switchBfsi">
          <span class="portal-icon">🏛️</span>
          <span class="portal-label">Explore BFSI Banking</span>
          <span class="portal-tag">8.45% APY</span>
        </a>
      </div>
    </div>
  </div>`;

// Check if portal-bar was already in index.html to avoid duplicate
indexHtml = indexHtml.replace(/<!-- Portal Experience Switcher Bar[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');
indexHtml = indexHtml.replace(oldHeaderRegexIndex, newHeaderIndex);

fs.writeFileSync('index.html', indexHtml, 'utf8');
fs.writeFileSync('Matomo ecomm Web/index.html', indexHtml, 'utf8');
console.log('Updated index.html: Moved switcher below header');


// ==========================================
// 2. UPDATE bfsi.html
// ==========================================
let bfsiHtml = fs.readFileSync('bfsi.html', 'utf8');

const oldHeaderRegexBfsi = /<!-- Main Navigation Header -->[\s\S]*?<\/header>/;
const newHeaderBfsi = `<!-- Main Navigation Header -->
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

        <a href="index.html" class="brand-link" aria-label="Infinity Luxury Home">
          <span class="brand-crest">⬡</span>
          <span class="brand-name">Infinity</span>
        </a>
      </div>

      <!-- Nav Links Center (Desktop) -->
      <nav class="nav-links desktop-only" id="mainNav">
        <a href="index.html" class="nav-item">Home</a>
        <a href="#wealth-fd" class="nav-item" onclick="switchBfsiTab('wealth')">Yields &amp; FDs</a>
        <a href="#lending-mortgage" class="nav-item" onclick="switchBfsiTab('lending')">Lending</a>
        <a href="#metal-cards" class="nav-item" onclick="switchBfsiTab('cards')">Cards</a>
        <a href="#estate-assurance" class="nav-item" onclick="switchBfsiTab('insurance')">Assurance</a>
        <a href="#contact" class="nav-item">Contact</a>
      </nav>

      <!-- Header Actions Right -->
      <div class="header-actions">
        <!-- Direct Quick Jump to DPDP Section -->
        <a href="index.html#dpdp-erasure" class="header-dpdp-pill" title="Jump to DPDP Data Rights Center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>Privacy</span>
        </a>

        <!-- Advisory Banker CTA -->
        <button class="btn btn-primary btn-sm-header" onclick="openLeadModal('Institutional Advisory Desk', 'Private Wealth Management', '8.45% APY Treasury Portfolio')" title="Book Private Banker Consultation">
          <span>Consult Banker</span>
        </button>

        <!-- Cart Button -->
        <button class="action-btn cart-btn" id="cartTrigger" aria-label="Open Shopping Bag">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="badge-count" id="cartCount">0</span>
        </button>
      </div>

    </div>

    <!-- Mobile Navigation Drawer Panel -->
    <div class="mobile-nav-panel" id="mobileNavPanel">
      <div class="mobile-links-list">
        <a href="index.html" class="mobile-nav-link">Store Home</a>
        <a href="index.html#curations" class="mobile-nav-link">Luxury Products (10 Assets)</a>
        <a href="#wealth-fd" class="mobile-nav-link" onclick="switchBfsiTab('wealth')">Yields &amp; FDs (8.45%)</a>
        <a href="#lending-mortgage" class="mobile-nav-link" onclick="switchBfsiTab('lending')">Lending &amp; Loans</a>
        <a href="#metal-cards" class="mobile-nav-link" onclick="switchBfsiTab('cards')">Titanium Cards</a>
        <a href="#estate-assurance" class="mobile-nav-link" onclick="switchBfsiTab('insurance')">Executive Assurance</a>
        <a href="#contact" class="mobile-nav-link">Private Banker Contact</a>
        <a href="index.html#dpdp-erasure" class="mobile-nav-link">DPDP Privacy Rights</a>
      </div>
    </div>
  </header>

  <!-- Portal Experience Switcher Bar (Placed cleanly below header) -->
  <div class="portal-bar" id="portalBar">
    <div class="portal-container">
      <span class="portal-bar-label">SELECT EXPERIENCE:</span>
      <div class="portal-pills">
        <a href="index.html" class="portal-pill" id="switchEcommerce">
          <span class="portal-icon">🛍️</span>
          <span class="portal-label">Luxury E-Commerce</span>
          <span class="portal-tag">Store</span>
        </a>
        <a href="bfsi.html" class="portal-pill active" id="switchBfsi">
          <span class="portal-icon">🏛️</span>
          <span class="portal-label">Explore BFSI Banking</span>
          <span class="portal-tag">Active Portal</span>
        </a>
      </div>
    </div>
  </div>`;

bfsiHtml = bfsiHtml.replace(/<!-- Portal Experience Switcher Bar[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');
bfsiHtml = bfsiHtml.replace(oldHeaderRegexBfsi, newHeaderBfsi);

fs.writeFileSync('bfsi.html', bfsiHtml, 'utf8');
fs.writeFileSync('Matomo ecomm Web/bfsi.html', bfsiHtml, 'utf8');
console.log('Updated bfsi.html: Moved switcher below header');
