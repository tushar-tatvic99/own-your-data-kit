/**
 * INFINITE BANK - Institutional Private Wealth & Executive Concierge
 * Comprehensive Product Showcase, Bag Drawer & 4-Step Checkout Engine
 */

// ================= PRODUCT DATA =================
const PRODUCTS = [
  {
    id: 'p1',
    name: 'Infinite Sovereign Chronometer',
    category: 'horology',
    categoryLabel: 'SWISS HOROLOGY',
    price: 450.00,
    rating: 4.98,
    reviews: 142,
    badge: 'Sovereign Tier',
    image: 'assets/images/perfume.jpg',
    description: 'Precision automatic movement with sapphire crystal face, dual-timezone complication, and brushed titanium case engineered in Geneva.',
    highlights: [
      'Chronometer-grade precision with 72-hour power reserve',
      'Scratch-resistant anti-reflective sapphire crystal',
      'Brushed titanium grade-5 case with alligator leather strap'
    ],
    details: '41mm Titanium Case • Automatic Calibre'
  },
  {
    id: 'p2',
    name: 'Certified 24K Mint Gold Bullion (100g)',
    category: 'bullion',
    categoryLabel: 'PRECIOUS METALS',
    price: 680.00,
    rating: 4.99,
    reviews: 218,
    badge: 'AAA Minted',
    image: 'assets/images/serum.jpg',
    description: '99.99% pure investment-grade physical gold bullion bar, individually numbered with an official London Bullion Market (LBMA) assay certificate.',
    highlights: [
      'Guaranteed 999.9 fine investment-grade bullion purity',
      'Tamper-evident serial numbered security blister seal',
      'Allocated physical depository storage eligibility'
    ],
    details: '100 Grams • 99.99% Pure Gold • LBMA Certified'
  },
  {
    id: 'p3',
    name: 'Titanium Cryptographic Vault Key',
    category: 'security',
    categoryLabel: 'SECURITY & VAULT',
    price: 185.00,
    rating: 4.95,
    reviews: 96,
    badge: 'EAL6+ Security',
    image: 'assets/images/silk.jpg',
    description: 'Sovereign hardware cryptographic security key with biometric touch verification, zero-leakage memory, and titanium shell.',
    highlights: [
      'Military-grade EAL6+ certified secure execution enclave',
      'Biometric fingerprint match in sub-100 milliseconds',
      'Universal FIDO2, WebAuthn & multi-chain ledger standard'
    ],
    details: 'Titanium Shell • USB-C / NFC • Biometric Key'
  },
  {
    id: 'p4',
    name: '18k Solid Gold Sovereign Signet',
    category: 'jewelry',
    categoryLabel: 'BESPOKE JEWELRY',
    price: 320.00,
    rating: 4.91,
    reviews: 84,
    badge: 'Private Edition',
    image: 'assets/images/pearl.jpg',
    description: 'Hand-engraved 18k solid gold signet ring engraved with the Infinite Bank hexagonal crest, forged in Zurich from conflict-free recycled bullion.',
    highlights: [
      'Solid 18k yellow gold forged with satin brushed finish',
      'Hand-engraved archival heritage crest of Infinite Bank',
      'Custom laser-engraved personal monogram included'
    ],
    details: '18k Solid Gold • 14.2g Net Weight'
  },
  {
    id: 'p5',
    name: 'Executive Cashmere Travel Collection',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 160.00,
    rating: 4.89,
    reviews: 130,
    badge: 'First Class Edit',
    image: 'assets/images/souffle.jpg',
    description: 'Pure 100% Mongolian combed cashmere travel wrap and contoured silk blackout eye mask, engineered for seamless transatlantic journeys.',
    highlights: [
      'Ethically sourced Grade-A Mongolian cashmere fiber',
      'Ultra-lightweight yet delivers superior thermal insulation',
      'Includes water-repellent ballistic nylon travel pouch'
    ],
    details: '200cm x 70cm Wrap + Mulberry Silk Eye Mask'
  },
  {
    id: 'p6',
    name: 'Obsidian & Cedar Executive Desk Vessel',
    category: 'lifestyle',
    categoryLabel: 'EXECUTIVE LIVING',
    price: 95.00,
    rating: 4.94,
    reviews: 77,
    badge: 'Hand-Carved',
    image: 'assets/images/candle.jpg',
    description: 'Solid obsidian stone desk vessel with natural Atlantic cedarwood and dark amber accords, handcrafted for modern executive suites.',
    highlights: [
      'Monolithic block of polished natural obsidian stone',
      'Subtle woody aromatics of Atlas cedar and smoky vetiver',
      'Substantial weighted desk presence and timeless silhouette'
    ],
    details: 'Solid Obsidian Stone • 450g Net Weight'
  }
];

// ================= MULTI-CURRENCY RATES =================
const CURRENCIES = {
  USD: { symbol: '$', rate: 1.00, code: 'USD' },
  EUR: { symbol: '€', rate: 0.92, code: 'EUR' },
  GBP: { symbol: '£', rate: 0.78, code: 'GBP' },
  CAD: { symbol: 'CA$', rate: 1.36, code: 'CAD' }
};

// ================= STATE MANAGEMENT =================
let state = {
  currentCurrency: 'USD',
  cart: [
    // Pre-populate with 1 signature item for instant delightful experience
    { productId: 'p1', quantity: 1 }
  ],
  wishlist: ['p3'],
  activeCategory: 'all',
  activeSort: 'featured',
  giftWrapEnabled: true,
  giftMessage: 'With endless love and appreciation. Happy Birthday!',
  couponCode: null,
  couponDiscount: 0,
  shippingMethod: 'standard', // 'standard' (0), 'express' (12), 'parisian' (24)
  checkoutStep: 1,
  orderData: null
};

// ================= DOM ELEMENTS =================
const productsGrid = document.getElementById('productsGrid');
const categoryTabs = document.getElementById('categoryTabs');
const sortSelect = document.getElementById('sortSelect');
const currencySelect = document.getElementById('currencySelect');

// Cart Drawer Elements
const cartTrigger = document.getElementById('cartTrigger');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const cartBadgeCount = document.getElementById('cartBadgeCount');
const headerCartTotal = document.getElementById('headerCartTotal');
const cartItemsList = document.getElementById('cartItemsList');
const cartEmptyState = document.getElementById('cartEmptyState');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartDiscountRow = document.getElementById('cartDiscountRow');
const cartDiscountAmount = document.getElementById('cartDiscountAmount');
const cartShippingCost = document.getElementById('cartShippingCost');
const cartGrandTotal = document.getElementById('cartGrandTotal');
const shippingProgressBar = document.getElementById('shippingProgressBar');
const shippingProgressMsg = document.getElementById('shippingProgressMsg');
const giftWrapToggle = document.getElementById('giftWrapToggle');
const giftMessageField = document.getElementById('giftMessageField');
const giftMessageInput = document.getElementById('giftMessageInput');
const giftCharCount = document.getElementById('giftCharCount');
const couponInput = document.getElementById('couponInput');
const applyCouponBtn = document.getElementById('applyCouponBtn');
const couponFeedback = document.getElementById('couponFeedback');
const proceedCheckoutBtn = document.getElementById('proceedCheckoutBtn');

// Wishlist Elements
const wishlistTrigger = document.getElementById('wishlistTrigger');
const wishlistDrawer = document.getElementById('wishlistDrawer');
const wishlistOverlay = document.getElementById('wishlistOverlay');
const closeWishlistBtn = document.getElementById('closeWishlistBtn');
const wishlistCount = document.getElementById('wishlistCount');
const wishlistBadgeCount = document.getElementById('wishlistBadgeCount');
const wishlistItemsList = document.getElementById('wishlistItemsList');

// Quick View Elements
const quickViewModal = document.getElementById('quickViewModal');
const closeQuickViewBtn = document.getElementById('closeQuickViewBtn');
const qvProductImg = document.getElementById('qvProductImg');
const qvProductBadge = document.getElementById('qvProductBadge');
const qvCategory = document.getElementById('qvCategory');
const qvTitle = document.getElementById('qvTitle');
const qvStars = document.getElementById('qvStars');
const qvReviews = document.getElementById('qvReviews');
const qvPrice = document.getElementById('qvPrice');
const qvDescription = document.getElementById('qvDescription');
const qvHighlights = document.getElementById('qvHighlights');
const qvQtyInput = document.getElementById('qvQtyInput');
const qvQtyMinus = document.getElementById('qvQtyMinus');
const qvQtyPlus = document.getElementById('qvQtyPlus');
const qvAddToCartBtn = document.getElementById('qvAddToCartBtn');
const qvWishlistBtn = document.getElementById('qvWishlistBtn');
let currentQvProductId = null;

// Checkout Elements
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const stepNodes = [
  document.getElementById('stepNode1'),
  document.getElementById('stepNode2'),
  document.getElementById('stepNode3'),
  document.getElementById('stepNode4')
];
const stepLines = [
  document.getElementById('stepLine1'),
  document.getElementById('stepLine2'),
  document.getElementById('stepLine3')
];
const stepPanels = [
  document.getElementById('checkoutStep1'),
  document.getElementById('checkoutStep2'),
  document.getElementById('checkoutStep3'),
  document.getElementById('checkoutStep4')
];

// Step 1 Form
const step1Form = document.getElementById('step1Form');
const fillDemoAddressBtn = document.getElementById('fillDemoAddressBtn');
const backToBagBtn = document.getElementById('backToBagBtn');
const custEmail = document.getElementById('custEmail');
const custFirstName = document.getElementById('custFirstName');
const custLastName = document.getElementById('custLastName');
const custStreet = document.getElementById('custStreet');
const custCity = document.getElementById('custCity');
const custState = document.getElementById('custState');
const custZip = document.getElementById('custZip');
const custCountry = document.getElementById('custCountry');
const custPhone = document.getElementById('custPhone');

// Step 2 Form
const step2Form = document.getElementById('step2Form');
const backToStep1Btn = document.getElementById('backToStep1Btn');
const editStep1Btn = document.getElementById('editStep1Btn');
const shipToPreview = document.getElementById('shipToPreview');
const shipOptStandard = document.getElementById('shipOptStandard');
const shipOptExpress = document.getElementById('shipOptExpress');
const shipOptParisian = document.getElementById('shipOptParisian');

// Step 3 Form (Payment)
const step3Form = document.getElementById('step3Form');
const backToStep2Btn = document.getElementById('backToStep2Btn');
const payNowBtn = document.getElementById('payNowBtn');
const payBtnText = document.getElementById('payBtnText');
const paySpinner = document.getElementById('paySpinner');
const cardNumber = document.getElementById('cardNumber');
const cardName = document.getElementById('cardName');
const cardExpiry = document.getElementById('cardExpiry');
const cardCvv = document.getElementById('cardCvv');
const cardDisplayNumber = document.getElementById('cardDisplayNumber');
const cardDisplayName = document.getElementById('cardDisplayName');
const cardDisplayExpiry = document.getElementById('cardDisplayExpiry');
const cardBrandLogo = document.getElementById('cardBrandLogo');
const cardVisual = document.getElementById('cardVisual');

// Step 4 Elements (Confirmation)
const confirmEmail = document.getElementById('confirmEmail');
const confirmedOrderId = document.getElementById('confirmedOrderId');
const confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate');
const confirmedGiftSection = document.getElementById('confirmedGiftSection');
const confirmedGiftMessageText = document.getElementById('confirmedGiftMessageText');
const printReceiptBtn = document.getElementById('printReceiptBtn');
const finishShoppingBtn = document.getElementById('finishShoppingBtn');

// Checkout Right Summary
const checkoutItemsList = document.getElementById('checkoutItemsList');
const checkoutSubtotal = document.getElementById('checkoutSubtotal');
const checkoutDiscountRow = document.getElementById('checkoutDiscountRow');
const checkoutDiscountAmount = document.getElementById('checkoutDiscountAmount');
const checkoutShippingCost = document.getElementById('checkoutShippingCost');
const checkoutGiftRow = document.getElementById('checkoutGiftRow');
const checkoutGrandTotal = document.getElementById('checkoutGrandTotal');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// ================= UTILITIES =================
function formatPrice(amountInUSD) {
  const curr = CURRENCIES[state.currentCurrency];
  const converted = amountInUSD * curr.rate;
  return `${curr.symbol}${converted.toFixed(2)}`;
}

function showToast(icon, title, message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-msg">
      <strong>${title}</strong>
      <small>${message}</small>
    </div>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ================= PRODUCT RENDERING =================
function renderProducts() {
  let filtered = [...PRODUCTS];

  // Category Filter
  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === state.activeCategory);
  }

  // Sort
  if (state.activeSort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.activeSort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.activeSort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  productsGrid.innerHTML = '';
  filtered.forEach(product => {
    const isWishlisted = state.wishlist.includes(product.id);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-media">
        <span class="product-tag ${product.badge === 'Bestseller' ? 'tag-bestseller' : ''}">${product.badge}</span>
        
        <div class="card-overlay-actions">
          <button class="icon-btn-circle ${isWishlisted ? 'wishlisted' : ''}" 
                  data-wishlist-id="${product.id}" 
                  title="${isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}" 
                  aria-label="Wishlist">
            ${isWishlisted ? '♥' : '♡'}
          </button>
          <button class="icon-btn-circle" 
                  data-quickview-id="${product.id}" 
                  title="Quick View" 
                  aria-label="Quick View">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>

        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy">
      </div>

      <div class="product-info">
        <span class="product-category">${product.categoryLabel}</span>
        <h3 class="product-title" data-quickview-id="${product.id}">${product.name}</h3>
        
        <div class="product-rating-row">
          <span class="rating-star-text">★★★★★</span>
          <span class="review-count-text">${product.rating} (${product.reviews})</span>
        </div>

        <p class="product-desc">${product.description}</p>

        <div class="product-footer-row">
          <div class="product-price">${formatPrice(product.price)}</div>
          <button class="btn-add-card" data-add-id="${product.id}">
            <span>Add to Bag</span>
            <span>+</span>
          </button>
        </div>
      </div>
    `;
    productsGrid.appendChild(card);
  });

  // GA4 & Matomo: view_item_list (Item catalog / category impressions)
  if (typeof MatomoTracker !== 'undefined' && typeof MatomoTracker.trackViewItemList === 'function') {
    const listTitle = state.activeCategory === 'all'
      ? 'All Curated Treasures'
      : (PRODUCTS.find(p => p.category === state.activeCategory)?.categoryLabel || state.activeCategory);
    MatomoTracker.trackViewItemList(listTitle, filtered);
  }
}

// ================= CART DRAWER ENGINE =================
function calculateCartTotals() {
  const curr = CURRENCIES[state.currentCurrency];
  let subtotal = 0;
  let itemCount = 0;

  state.cart.forEach(item => {
    const prod = PRODUCTS.find(p => p.id === item.productId);
    if (prod) {
      subtotal += prod.price * item.quantity;
      itemCount += item.quantity;
    }
  });

  // Calculate discount
  let discount = 0;
  if (state.couponCode) {
    if (state.couponCode === 'PRIME15') discount = subtotal * 0.15;
    if (state.couponCode === 'INFINITE20') discount = subtotal * 0.20;
    if (state.couponCode === 'LUXE10') discount = Math.min(10, subtotal);
  }

  // Calculate shipping based on chosen method and subtotal threshold ($75)
  let shippingCost = 0;
  const freeThreshold = 75.00;
  
  if (state.shippingMethod === 'standard') {
    shippingCost = subtotal >= freeThreshold ? 0 : 5.00;
  } else if (state.shippingMethod === 'express') {
    shippingCost = 12.00;
  } else if (state.shippingMethod === 'parisian') {
    shippingCost = 24.00;
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingCost);

  return {
    subtotal,
    discount,
    shippingCost,
    grandTotal,
    itemCount,
    freeThreshold
  };
}

function renderCart() {
  const totals = calculateCartTotals();

  // Badges and counts
  cartCount.textContent = totals.itemCount;
  cartBadgeCount.textContent = `(${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'})`;
  headerCartTotal.textContent = formatPrice(totals.subtotal);

  // Free shipping progress bar
  const pct = Math.min(100, Math.round((totals.subtotal / totals.freeThreshold) * 100));
  shippingProgressBar.style.width = `${pct}%`;
  
  if (totals.subtotal >= totals.freeThreshold) {
    shippingProgressMsg.innerHTML = `🌸 <strong>Complimentary Luxury White-Glove Shipping Unlocked!</strong>`;
  } else {
    const remaining = totals.freeThreshold - totals.subtotal;
    shippingProgressMsg.innerHTML = `Add <strong>${formatPrice(remaining)}</strong> more to unlock <strong>Free White-Glove Delivery</strong>!`;
  }

  // Matomo Ecommerce Cart Update Tracking
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCartUpdate(state.cart, totals.grandTotal, PRODUCTS);
  }

  // Empty state vs items
  if (state.cart.length === 0) {
    cartItemsList.innerHTML = '';
    cartItemsList.appendChild(cartEmptyState);
    cartEmptyState.style.display = 'flex';
    document.getElementById('cartDrawerFooter').style.opacity = '0.5';
    proceedCheckoutBtn.disabled = true;
  } else {
    cartEmptyState.style.display = 'none';
    document.getElementById('cartDrawerFooter').style.opacity = '1';
    proceedCheckoutBtn.disabled = false;
    cartItemsList.innerHTML = '';

    state.cart.forEach(item => {
      const prod = PRODUCTS.find(p => p.id === item.productId);
      if (!prod) return;

      const itemTotal = prod.price * item.quantity;
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${prod.image}" alt="${prod.name}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${prod.name}</h4>
          <span class="cart-item-unit-price">${formatPrice(prod.price)} each</span>
          <div class="cart-item-controls">
            <button class="qty-control-btn" data-cart-action="dec" data-id="${prod.id}">-</button>
            <span class="qty-number">${item.quantity}</span>
            <button class="qty-control-btn" data-cart-action="inc" data-id="${prod.id}">+</button>
          </div>
        </div>
        <div class="cart-item-right">
          <span class="cart-item-total">${formatPrice(itemTotal)}</span>
          <button class="btn-item-remove" data-cart-action="del" data-id="${prod.id}">Remove</button>
        </div>
      `;
      cartItemsList.appendChild(itemEl);
    });
  }

  // Breakdown rows
  cartSubtotal.textContent = formatPrice(totals.subtotal);
  if (totals.discount > 0) {
    cartDiscountRow.style.display = 'flex';
    cartDiscountAmount.textContent = `-${formatPrice(totals.discount)}`;
  } else {
    cartDiscountRow.style.display = 'none';
  }

  if (totals.subtotal >= totals.freeThreshold) {
    cartShippingCost.innerHTML = `<span class="free-tag">Complimentary</span>`;
  } else {
    cartShippingCost.textContent = `${formatPrice(5.00)}`;
  }

  cartGrandTotal.textContent = formatPrice(totals.subtotal - totals.discount + (totals.subtotal >= totals.freeThreshold ? 0 : 5.00));

  // Gift Wrap initial state
  giftWrapToggle.checked = state.giftWrapEnabled;
  giftMessageField.style.display = state.giftWrapEnabled ? 'block' : 'none';
  giftMessageInput.value = state.giftMessage;
  giftCharCount.textContent = state.giftMessage.length;
}

function addToCart(productId, quantity = 1) {
  const existing = state.cart.find(item => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({ productId, quantity });
  }

  const prod = PRODUCTS.find(p => p.id === productId);
  
  // GA4 & Matomo: add_to_cart
  if (typeof MatomoTracker !== 'undefined' && prod) {
    const totals = calculateCartTotals();
    MatomoTracker.trackAddToCart(prod, quantity, totals.grandTotal);
  }

  renderCart();
  openCartDrawer();
  showToast('🛍️', 'Added to Shopping Bag', `${prod ? prod.name : 'Item'} has been placed in your bag.`);
}

function openCartDrawer() {
  cartDrawer.classList.add('active');
  cartOverlay.classList.add('active');

  // GA4 & Matomo: view_cart
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackViewCart(state.cart, PRODUCTS, totals);
  }
}

function closeCartDrawer() {
  cartDrawer.classList.remove('active');
  cartOverlay.classList.remove('active');
}

// ================= WISHLIST ENGINE =================
function toggleWishlist(productId) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  const idx = state.wishlist.indexOf(productId);
  if (idx > -1) {
    state.wishlist.splice(idx, 1);
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackWishlist('Remove from Wishlist', prod.name, prod.price);
    }
    showToast('🤍', 'Removed from Wishlist', `${prod.name} was removed from your saved treasures.`);
  } else {
    state.wishlist.push(productId);
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackWishlist('Add to Wishlist', prod.name, prod.price);
    }
    showToast('💖', 'Saved to Wishlist', `${prod.name} was added to your curated loves.`);
  }

  renderProducts();
  renderWishlist();
}

function renderWishlist() {
  wishlistCount.textContent = state.wishlist.length;
  wishlistBadgeCount.textContent = `(${state.wishlist.length} item${state.wishlist.length === 1 ? '' : 's'})`;

  wishlistItemsList.innerHTML = '';
  if (state.wishlist.length === 0) {
    wishlistItemsList.innerHTML = `
      <div class="cart-empty-state">
        <span class="empty-icon">♡</span>
        <h4>Your Wishlist is Dreaming</h4>
        <p>Click the heart icon on any treasure to save it for later.</p>
      </div>
    `;
    return;
  }

  state.wishlist.forEach(id => {
    const prod = PRODUCTS.find(p => p.id === id);
    if (!prod) return;

    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <img src="${prod.image}" alt="${prod.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${prod.name}</h4>
        <span class="cart-item-unit-price">${formatPrice(prod.price)}</span>
        <button class="btn btn-primary" style="padding: 6px 14px; font-size: 0.78rem; margin-top: 6px;" data-move-to-cart="${prod.id}">
          Move to Bag
        </button>
      </div>
      <div class="cart-item-right">
        <button class="btn-item-remove" data-remove-wishlist="${prod.id}">Remove</button>
      </div>
    `;
    wishlistItemsList.appendChild(el);
  });
}

function openWishlistDrawer() {
  wishlistDrawer.classList.add('active');
  wishlistOverlay.classList.add('active');
}

function closeWishlistDrawer() {
  wishlistDrawer.classList.remove('active');
  wishlistOverlay.classList.remove('active');
}

// ================= QUICK VIEW MODAL =================
function openQuickView(productId) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  currentQvProductId = productId;
  qvProductImg.src = prod.image;
  qvProductBadge.textContent = prod.badge;
  qvCategory.textContent = prod.categoryLabel;
  qvTitle.textContent = prod.name;
  qvReviews.textContent = `${prod.rating} (${prod.reviews} reviews)`;
  qvPrice.textContent = formatPrice(prod.price);
  qvDescription.textContent = prod.description;
  qvQtyInput.value = 1;

  // Highlights
  qvHighlights.innerHTML = prod.highlights
    .map(h => `<div class="highlight-item"><span style="color:var(--primary-rose)">✓</span> <span>${h}</span></div>`)
    .join('');

  // Wishlist button state
  const isWish = state.wishlist.includes(productId);
  qvWishlistBtn.textContent = isWish ? '♥' : '♡';
  qvWishlistBtn.style.color = isWish ? 'var(--primary-rose)' : 'var(--text-muted)';

  // Matomo Standard Ecommerce Event: Product Detail View
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackProductView(prod);
  }

  quickViewModal.classList.add('active');
}

function closeQuickView() {
  quickViewModal.classList.remove('active');
  currentQvProductId = null;
}

// ================= 4-STEP CHECKOUT ENGINE =================
function openCheckout() {
  if (state.cart.length === 0) {
    showToast('⚠️', 'Shopping Bag is Empty', 'Please add at least one treasure before checkout.');
    return;
  }
  closeCartDrawer();
  goToCheckoutStep(1);
  renderCheckoutSummary();
  checkoutModal.classList.add('active');

  // GA4 & Matomo: begin_checkout (Step 1 Initiated)
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackBeginCheckout(state.cart, PRODUCTS, totals, state.couponCode);
  }
}

function closeCheckout() {
  checkoutModal.classList.remove('active');
}

function goToCheckoutStep(stepNumber) {
  state.checkoutStep = stepNumber;

  // Update panels
  stepPanels.forEach((panel, i) => {
    panel.classList.toggle('active', i + 1 === stepNumber);
  });

  // Update stepper UI
  stepNodes.forEach((node, i) => {
    const nodeStep = i + 1;
    node.classList.remove('active', 'completed');
    if (nodeStep === stepNumber) {
      node.classList.add('active');
    } else if (nodeStep < stepNumber) {
      node.classList.add('completed');
    }
  });

  stepLines.forEach((line, i) => {
    line.classList.toggle('active', i + 1 < stepNumber);
  });

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const totals = calculateCartTotals();

  // Summary items list
  checkoutItemsList.innerHTML = '';
  state.cart.forEach(item => {
    const prod = PRODUCTS.find(p => p.id === item.productId);
    if (!prod) return;

    const row = document.createElement('div');
    row.className = 'summary-item-row';
    row.innerHTML = `
      <img src="${prod.image}" alt="${prod.name}" class="summary-item-img">
      <div class="summary-item-details">
        <div class="summary-item-title">${prod.name}</div>
        <div class="summary-item-qty">Qty: ${item.quantity}</div>
      </div>
      <div class="summary-item-price">${formatPrice(prod.price * item.quantity)}</div>
    `;
    checkoutItemsList.appendChild(row);
  });

  // Breakdown values
  checkoutSubtotal.textContent = formatPrice(totals.subtotal);

  if (totals.discount > 0) {
    checkoutDiscountRow.style.display = 'flex';
    checkoutDiscountAmount.textContent = `-${formatPrice(totals.discount)}`;
  } else {
    checkoutDiscountRow.style.display = 'none';
  }

  // Shipping
  if (state.shippingMethod === 'standard') {
    if (totals.subtotal >= totals.freeThreshold) {
      checkoutShippingCost.innerHTML = `<span class="free-tag">Free White-Glove</span>`;
    } else {
      checkoutShippingCost.textContent = formatPrice(5.00);
    }
  } else if (state.shippingMethod === 'express') {
    checkoutShippingCost.textContent = formatPrice(12.00);
  } else if (state.shippingMethod === 'parisian') {
    checkoutShippingCost.textContent = formatPrice(24.00);
  }

  // Gift row
  if (state.giftWrapEnabled) {
    checkoutGiftRow.style.display = 'flex';
  } else {
    checkoutGiftRow.style.display = 'none';
  }

  checkoutGrandTotal.textContent = formatPrice(totals.grandTotal);
}

// Quick Demo Details Filler
function fillDemoDetails() {
  custEmail.value = 'claire.dupont@vogue.fr';
  custFirstName.value = 'Claire';
  custLastName.value = 'Dupont';
  custStreet.value = '24 Rue de Rivoli, Apt 4B';
  custCity.value = 'Paris';
  custState.value = 'Île-de-France';
  custZip.value = '75001';
  custCountry.value = 'France';
  custPhone.value = '+33 6 12 34 56 78';
  showToast('✨', 'Demo Details Applied', 'Parisian address and contact details auto-filled.');
}

// Step 1: Submit Details & Validate
step1Form.addEventListener('submit', (e) => {
  e.preventDefault();

  const addressSummary = `${custStreet.value}, ${custCity.value}, ${custZip.value}, ${custCountry.value}`;
  shipToPreview.textContent = addressSummary;

  // Matomo Custom Event: Checkout Step 1 Completed
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCheckoutStep(1, 'Shipping Address Provided', {
      country: custCountry.value,
      city: custCity.value,
      email: custEmail.value
    });
  }

  goToCheckoutStep(2);
});

// Step 2: Shipping method selection
document.querySelectorAll('input[name="shippingMethod"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.shippingMethod = e.target.value;
    
    // UI highlight
    document.querySelectorAll('.shipping-option').forEach(opt => opt.classList.remove('selected'));
    e.target.closest('.shipping-option').classList.add('selected');
    
    const totals = calculateCartTotals();

    // Matomo Custom Event: Checkout Step 2 Courier Option Selected
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackCheckoutStep(2, 'Courier Selected', {
        courier: state.shippingMethod,
        shippingFee: totals.shippingCost
      });
    }

    renderCheckoutSummary();
  });
});

step2Form.addEventListener('submit', (e) => {
  e.preventDefault();

  // GA4 & Matomo: add_shipping_info (Step 2 Completed)
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackAddShippingInfo(state.cart, PRODUCTS, totals, state.shippingMethod, state.couponCode);
  }

  goToCheckoutStep(3);
});

// Step 3: Interactive Credit Card Live Sync & Payment
cardNumber.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  val = val.substring(0, 16);
  const formatted = val.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
  cardDisplayNumber.textContent = formatted;
  e.target.value = val.match(/.{1,4}/g)?.join(' ') || '';

  // Auto detect brand
  if (val.startsWith('4')) {
    cardBrandLogo.textContent = 'VISA';
  } else if (val.startsWith('5')) {
    cardBrandLogo.textContent = 'MC';
  } else if (val.startsWith('3')) {
    cardBrandLogo.textContent = 'AMEX';
  } else {
    cardBrandLogo.textContent = 'VISA';
  }
});

cardName.addEventListener('input', (e) => {
  const val = e.target.value.trim().toUpperCase();
  cardDisplayName.textContent = val || 'CLAIRE DUPONT';
});

cardExpiry.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length >= 2) {
    val = val.substring(0, 2) + '/' + val.substring(2, 4);
  }
  e.target.value = val.substring(0, 5);
  cardDisplayExpiry.textContent = e.target.value || 'MM/YY';
});

// Handle Step 3 Authorization (Payment)
step3Form.addEventListener('submit', (e) => {
  e.preventDefault();

  // GA4 & Matomo: add_payment_info (Step 3 Payment Info Added)
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackAddPaymentInfo(state.cart, PRODUCTS, totals, `Credit Card (${cardBrandLogo.textContent})`, state.couponCode);
  }

  processPayment();
});

function processPayment() {
  // Show spinner
  payBtnText.style.display = 'none';
  paySpinner.style.display = 'block';
  payNowBtn.disabled = true;

  // Snapshot cart items and totals BEFORE clearing for Matomo order tracking
  const totals = calculateCartTotals();
  const purchasedItems = state.cart.map(item => {
    const prod = PRODUCTS.find(p => p.id === item.productId);
    return {
      sku: prod ? prod.id : item.productId,
      name: prod ? prod.name : 'Luxury Treasure',
      category: prod ? prod.categoryLabel : 'Atelier Collection',
      price: prod ? prod.price : 0,
      quantity: item.quantity
    };
  });

  setTimeout(() => {
    // Generate Order ID
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `#AB-${randomNum}`;

    // Estimated delivery date (3 days from now)
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 3);
    const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    const formattedArrival = arrivalDate.toLocaleDateString('en-US', dateOptions);

    confirmEmail.textContent = custEmail.value || 'claire.dupont@vogue.fr';
    confirmedOrderId.textContent = orderId;
    confirmedDeliveryDate.textContent = formattedArrival;

    if (state.giftWrapEnabled && state.giftMessage.trim()) {
      confirmedGiftSection.style.display = 'block';
      confirmedGiftMessageText.textContent = `“${state.giftMessage.trim()}”`;
    } else {
      confirmedGiftSection.style.display = 'none';
    }

    // Reset button
    payBtnText.style.display = 'inline';
    paySpinner.style.display = 'none';
    payNowBtn.disabled = false;

    // Advance to Step 4
    goToCheckoutStep(4);

    // ========================================================================
    // MATOMO OFFICIAL ECOMMERCE SPECIFICATION: trackEcommerceOrder
    // ========================================================================
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackOrder({
        orderId: orderId,
        items: purchasedItems,
        grandTotal: totals.grandTotal,
        subTotal: totals.subtotal,
        tax: 0,
        shipping: totals.shippingCost,
        discount: totals.discount
      });

      MatomoTracker.trackCheckoutStep(4, 'Order Placed & Confirmed', {
        orderId: orderId,
        grandTotal: totals.grandTotal,
        itemsCount: totals.itemCount
      });
    }

    // Trigger Confetti explosion
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#0F172A', '#D4AF37', '#94A3B8', '#FFFFFF']
      });
    }

    showToast('✨', 'Order Authorized!', `Your order ${orderId} has been successfully placed.`);
    
    // Clear cart
    state.cart = [];
    renderCart();
  }, 1200);
}

// Express Checkout triggers
document.getElementById('expressApplePayBtn').addEventListener('click', () => {
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackAddPaymentInfo(state.cart, PRODUCTS, totals, 'Apple Pay', state.couponCode);
  }
  fillDemoDetails();
  processPayment();
});

document.getElementById('expressGPayBtn').addEventListener('click', () => {
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackAddPaymentInfo(state.cart, PRODUCTS, totals, 'Google Pay', state.couponCode);
  }
  fillDemoDetails();
  processPayment();
});

document.getElementById('expressPayPalBtn').addEventListener('click', () => {
  if (typeof MatomoTracker !== 'undefined') {
    const totals = calculateCartTotals();
    MatomoTracker.trackAddPaymentInfo(state.cart, PRODUCTS, totals, 'PayPal', state.couponCode);
  }
  fillDemoDetails();
  processPayment();
});

// Step navigation buttons
backToBagBtn.addEventListener('click', () => {
  closeCheckout();
  openCartDrawer();
});

backToStep1Btn.addEventListener('click', () => goToCheckoutStep(1));
editStep1Btn.addEventListener('click', () => goToCheckoutStep(1));
backToStep2Btn.addEventListener('click', () => goToCheckoutStep(2));

// Print Receipt
printReceiptBtn.addEventListener('click', () => {
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Post-Purchase', 'Print Receipt Clicked', confirmedOrderId.textContent);
  }
  window.print();
});

// Finish Shopping
finishShoppingBtn.addEventListener('click', () => {
  closeCheckout();
  goToCheckoutStep(1);
});

// ================= COUPON CODE ENGINE =================
applyCouponBtn.addEventListener('click', () => {
  const code = couponInput.value.trim().toUpperCase();
  const totals = calculateCartTotals();

  if (code === 'PRIME15') {
    state.couponCode = code;
    couponFeedback.className = 'coupon-feedback success';
    couponFeedback.textContent = '✓ Code applied: 15% luxury discount activated!';
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackPromoCode('Applied - Success', code, totals.subtotal * 0.15);
    }
    showToast('🎀', 'Promo Applied', '15% discount has been applied to your order.');
  } else if (code === 'INFINITE20') {
    state.couponCode = code;
    couponFeedback.className = 'coupon-feedback success';
    couponFeedback.textContent = '✓ Code applied: 20% VIP Atelier discount activated!';
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackPromoCode('Applied - Success', code, totals.subtotal * 0.20);
    }
    showToast('🎀', 'Promo Applied', '20% discount has been applied to your order.');
  } else if (code === 'LUXE10') {
    state.couponCode = code;
    couponFeedback.className = 'coupon-feedback success';
    couponFeedback.textContent = '✓ Code applied: $10 gift voucher credited!';
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackPromoCode('Applied - Success', code, 10.00);
    }
    showToast('🎀', 'Promo Applied', '$10 gift credit has been applied.');
  } else {
    couponFeedback.className = 'coupon-feedback error';
    couponFeedback.textContent = 'Invalid code. Try PRIME15 or INFINITE20.';
    if (typeof MatomoTracker !== 'undefined') {
      MatomoTracker.trackPromoCode('Applied - Failed', code, 0);
    }
  }
  renderCart();
  renderCheckoutSummary();
});

// Copy promo code pill in announcement bar
document.getElementById('copyPromoBtn').addEventListener('click', () => {
  navigator.clipboard.writeText('PRIME15');
  couponInput.value = 'PRIME15';
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Promotions', 'Copy Promo Pill Clicked', 'PRIME15');
  }
  showToast('📋', 'Code Copied', 'Promo code PRIME15 copied to clipboard!');
});

// Gift Wrap checkbox toggle
giftWrapToggle.addEventListener('change', (e) => {
  state.giftWrapEnabled = e.target.checked;
  giftMessageField.style.display = state.giftWrapEnabled ? 'block' : 'none';

  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackGiftService(
      'Gift Wrap Option Toggled',
      state.giftWrapEnabled ? 'Enabled' : 'Disabled'
    );
  }

  renderCheckoutSummary();
});

giftMessageInput.addEventListener('change', (e) => {
  state.giftMessage = e.target.value;
  giftCharCount.textContent = e.target.value.length;

  if (typeof MatomoTracker !== 'undefined' && e.target.value.trim().length > 0) {
    MatomoTracker.trackGiftService('Handwritten Card Message Customized', `${e.target.value.length} characters`);
  }
});

// ================= EVENT DELEGATION & LISTENERS =================

// Category Filter Tabs
categoryTabs.addEventListener('click', (e) => {
  if (e.target.classList.contains('cat-pill')) {
    document.querySelectorAll('.cat-pill').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    state.activeCategory = e.target.getAttribute('data-category');

    // Matomo Category View & Filter Tracking
    if (typeof MatomoTracker !== 'undefined') {
      const catLabel = e.target.textContent.trim();
      MatomoTracker.trackCategoryView(catLabel);
      MatomoTracker.trackCustomEvent('Catalog', 'Category Filter Applied', state.activeCategory);
    }

    renderProducts();
  }
});

// Sort Dropdown
sortSelect.addEventListener('change', (e) => {
  state.activeSort = e.target.value;

  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Catalog', 'Sort Order Changed', state.activeSort);
  }

  renderProducts();
});

// Currency Switcher
currencySelect.addEventListener('change', (e) => {
  state.currentCurrency = e.target.value;
  const curr = CURRENCIES[state.currentCurrency];

  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCurrencyChange(state.currentCurrency, curr.rate);
  }

  renderProducts();
  renderCart();
  renderCheckoutSummary();
  showToast('💱', 'Currency Updated', `Displaying prices in ${state.currentCurrency}.`);
});

// Product Card Click Delegation (Add to cart, Wishlist, Quick view)
productsGrid.addEventListener('click', (e) => {
  const addBtn = e.target.closest('[data-add-id]');
  if (addBtn) {
    const id = addBtn.getAttribute('data-add-id');
    addToCart(id, 1);
    return;
  }

  const wishBtn = e.target.closest('[data-wishlist-id]');
  if (wishBtn) {
    const id = wishBtn.getAttribute('data-wishlist-id');
    toggleWishlist(id);
    return;
  }

  const qvBtn = e.target.closest('[data-quickview-id]');
  if (qvBtn) {
    const id = qvBtn.getAttribute('data-quickview-id');
    const prod = PRODUCTS.find(p => p.id === id);
    if (typeof MatomoTracker !== 'undefined' && prod) {
      MatomoTracker.trackSelectItem(prod, 'Featured Atelier Edit', 1);
    }
    openQuickView(id);
    return;
  }
});

// Cart Drawer Interaction Delegation
cartItemsList.addEventListener('click', (e) => {
  const incBtn = e.target.closest('[data-cart-action="inc"]');
  if (incBtn) {
    const id = incBtn.getAttribute('data-id');
    const item = state.cart.find(i => i.productId === id);
    const prod = PRODUCTS.find(p => p.id === id);
    if (item && prod) {
      item.quantity++;
      const totals = calculateCartTotals();
      if (typeof MatomoTracker !== 'undefined') {
        MatomoTracker.trackAddToCart(prod, 1, totals.grandTotal);
      }
      renderCart();
    }
    return;
  }

  const decBtn = e.target.closest('[data-cart-action="dec"]');
  if (decBtn) {
    const id = decBtn.getAttribute('data-id');
    const item = state.cart.find(i => i.productId === id);
    const prod = PRODUCTS.find(p => p.id === id);
    if (item && prod) {
      if (item.quantity > 1) {
        item.quantity--;
      } else {
        state.cart = state.cart.filter(i => i.productId !== id);
      }
      const totals = calculateCartTotals();
      if (typeof MatomoTracker !== 'undefined') {
        MatomoTracker.trackRemoveFromCart(prod, 1, totals.grandTotal);
      }
      renderCart();
    }
    return;
  }

  const delBtn = e.target.closest('[data-cart-action="del"]');
  if (delBtn) {
    const id = delBtn.getAttribute('data-id');
    const item = state.cart.find(i => i.productId === id);
    const prod = PRODUCTS.find(p => p.id === id);
    const qty = item ? item.quantity : 1;
    state.cart = state.cart.filter(i => i.productId !== id);
    const totals = calculateCartTotals();
    if (typeof MatomoTracker !== 'undefined' && prod) {
      MatomoTracker.trackRemoveFromCart(prod, qty, totals.grandTotal);
    }
    renderCart();
    return;
  }
});

// Wishlist Drawer Interaction Delegation
wishlistItemsList.addEventListener('click', (e) => {
  const moveBtn = e.target.closest('[data-move-to-cart]');
  if (moveBtn) {
    const id = moveBtn.getAttribute('data-move-to-cart');
    const prod = PRODUCTS.find(p => p.id === id);
    if (typeof MatomoTracker !== 'undefined' && prod) {
      MatomoTracker.trackWishlist('Move to Bag', prod.name, prod.price);
    }
    addToCart(id, 1);
    state.wishlist = state.wishlist.filter(wId => wId !== id);
    renderWishlist();
    renderProducts();
    return;
  }

  const remBtn = e.target.closest('[data-remove-wishlist]');
  if (remBtn) {
    const id = remBtn.getAttribute('data-remove-wishlist');
    toggleWishlist(id);
    return;
  }
});

// Quick View Controls
qvQtyMinus.addEventListener('click', () => {
  let val = parseInt(qvQtyInput.value, 10);
  if (val > 1) qvQtyInput.value = val - 1;
});

qvQtyPlus.addEventListener('click', () => {
  let val = parseInt(qvQtyInput.value, 10);
  if (val < 10) qvQtyInput.value = val + 1;
});

qvAddToCartBtn.addEventListener('click', () => {
  if (currentQvProductId) {
    const qty = parseInt(qvQtyInput.value, 10) || 1;
    addToCart(currentQvProductId, qty);
    closeQuickView();
  }
});

qvWishlistBtn.addEventListener('click', () => {
  if (currentQvProductId) {
    toggleWishlist(currentQvProductId);
    const isWish = state.wishlist.includes(currentQvProductId);
    qvWishlistBtn.textContent = isWish ? '♥' : '♡';
    qvWishlistBtn.style.color = isWish ? 'var(--primary-rose)' : 'var(--text-muted)';
  }
});

// Cart Trigger Buttons
cartTrigger.addEventListener('click', openCartDrawer);
closeCartBtn.addEventListener('click', closeCartDrawer);
cartOverlay.addEventListener('click', closeCartDrawer);

// Wishlist Trigger Buttons
wishlistTrigger.addEventListener('click', openWishlistDrawer);
closeWishlistBtn.addEventListener('click', closeWishlistDrawer);
wishlistOverlay.addEventListener('click', closeWishlistDrawer);

// Quick View Close Buttons
closeQuickViewBtn.addEventListener('click', closeQuickView);
quickViewModal.addEventListener('click', (e) => {
  if (e.target === quickViewModal) closeQuickView();
});

// Checkout Open & Close Buttons
proceedCheckoutBtn.addEventListener('click', openCheckout);
closeCheckoutBtn.addEventListener('click', closeCheckout);
fillDemoAddressBtn.addEventListener('click', fillDemoDetails);

// Empty Cart action
document.getElementById('emptyCartShopBtn')?.addEventListener('click', () => {
  closeCartDrawer();
  document.getElementById('curations').scrollIntoView({ behavior: 'smooth' });
});

// Hero Buttons
document.getElementById('heroGiftConciergeBtn')?.addEventListener('click', () => {
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Engagement', 'Hero Gift Concierge Clicked');
  }
  document.getElementById('why-us').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('giftBannerAddBtn')?.addEventListener('click', () => {
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Engagement', 'Gift Banner Explore Clicked');
  }
  document.getElementById('curations').scrollIntoView({ behavior: 'smooth' });
});

// VIP Newsletter form
document.getElementById('newsletterForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail').value;
  const feedback = document.getElementById('newsletterFeedback');

  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Lead Generation', 'Private Client Advisory Signup', email);
  }

  feedback.innerHTML = `✨ Merci, ${email}! Use secret VIP code <strong>INFINITE20</strong> for 20% off your entire curation.`;
  showToast('💌', 'Welcome to the Society', 'Check your inbox for your private 20% privilege code.');
});

// Footer Filter Link handlers
document.querySelectorAll('.footer-list a[data-filter]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const filter = link.getAttribute('data-filter');
    const tabBtn = document.querySelector(`.cat-pill[data-category="${filter}"]`);
    if (tabBtn) {
      tabBtn.click();
      document.getElementById('curations').scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Footer Concierge links
document.getElementById('footerTrackOrderBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (typeof MatomoTracker !== 'undefined') {
    MatomoTracker.trackCustomEvent('Concierge', 'Footer Track Order Clicked');
  }
  showToast('🕊️', 'Concierge Order Tracking', 'Enter your order reference #AB-xxxxx in checkout or reply to your email confirmation.');
});

document.getElementById('footerGiftWrapBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  openCartDrawer();
  giftWrapToggle.checked = true;
  state.giftWrapEnabled = true;
  giftMessageField.style.display = 'block';
  showToast('🎀', 'Gift Wrapping Enabled', 'Complimentary French box & handwritten gold card added to your bag.');
});

// Keyboard Accessibility (ESC to close modals)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCartDrawer();
    closeWishlistDrawer();
    closeQuickView();
    closeCheckout();
    document.getElementById('matomoInspectorBackdrop')?.classList.remove('active');
  }
});


// ================= DPDP ACT ERASURE & FAQ ENGINE =================
function initDpdpCenter() {
  // 1. Accordion Toggling
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Close other items for crisp accordion UX
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('active');
            const otherBtn = other.querySelector('.faq-trigger');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });
        // Toggle current item
        if (isActive) {
          item.classList.remove('active');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // 2. Erasure Request Form Submission
  const form = document.getElementById('dpdpRequestForm');
  const receiptBox = document.getElementById('dpdpReceiptBox');
  const ticketCode = document.getElementById('dpdpTicketCode');
  const timestampEl = document.getElementById('dpdpTimestamp');
  const copyBtn = document.getElementById('copyTicketBtn');
  const statusBadge = document.getElementById('receiptStatusBadge');
  const pendingOrderRow = document.getElementById('auditPendingOrderRow');
  const btnSubmitAnother = document.getElementById('btnSubmitAnotherDpdp');
  const btnPrintReceipt = document.getElementById('btnPrintReceiptBtn');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('dpdpName').value.trim();
      const email = document.getElementById('dpdpEmail').value.trim();
      const scope = document.getElementById('dpdpScope').value;
      const orderNum = document.getElementById('dpdpOrderNum').value.trim();

      // Check if user has active transaction / order reference
      const hasActiveOrder = !!orderNum || (state.cart && state.cart.length > 0);

      // Generate official DPDP statutory reference ID
      const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
      const refId = `DPDP-2026-${randomHex}`;

      if (ticketCode) ticketCode.textContent = refId;
      if (timestampEl) {
        timestampEl.textContent = new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      // Configure Dynamic Audit Decision Breakdown
      if (hasActiveOrder) {
        if (statusBadge) {
          statusBadge.textContent = 'AUDIT COMPLETE • PARTIALLY APPROVED (LEGAL HOLD APPLIED)';
          statusBadge.style.background = '#D9822B';
        }
        if (pendingOrderRow) pendingOrderRow.style.display = 'table-row';
      } else {
        if (statusBadge) {
          statusBadge.textContent = 'AUDIT COMPLETE • FULLY APPROVED & PURGED';
          statusBadge.style.background = '#27AE60';
        }
        if (pendingOrderRow) pendingOrderRow.style.display = 'none';
      }

      // Execute REAL device-level privacy purge
      try {
        // 1. Purge Cart & Wishlist
        state.cart = [];
        state.wishlist = [];
        localStorage.removeItem('aura_blush_cart');
        localStorage.removeItem('aura_blush_wishlist');
        renderCart();
        renderWishlist();

        // 2. Revoke Tracking in Matomo
        if (window._paq) {
          window._paq.push(['forgetConsentGiven']);
          window._paq.push(['forgetUserOptOut']);
        }

        // 3. Revoke Google Consent Mode
        if (typeof window.gtag === 'function') {
          window.gtag('consent', 'update', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied'
          });
        }

        // 4. Reset CookieConsent if available
        if (typeof CookieConsent !== 'undefined' && typeof CookieConsent.reset === 'function') {
          CookieConsent.reset();
        }
      } catch (err) {
        console.warn('Local device privacy purge exception:', err);
      }

      // Push to GTM dataLayer & Matomo for compliance auditing
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'dpdp_erasure_request',
          dpdp_ticket: refId,
          dpdp_scope: scope,
          dpdp_status: hasActiveOrder ? 'partially_approved' : 'approved',
          dpdp_has_order: hasActiveOrder
        });
      }

      if (typeof MatomoTracker !== 'undefined' && typeof MatomoTracker.trackCustomEvent === 'function') {
        MatomoTracker.trackCustomEvent('DPDP Compliance', 'Erasure Petition Submitted', scope, 1);
      }

      // Render executive receipt state
      form.style.display = 'none';
      if (receiptBox) {
        receiptBox.style.display = 'block';
        receiptBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (typeof showToast === 'function') {
        showToast('🛡️', 'DPDP Audit Complete', `Reference ${refId} issued. Legal retention applied to tax records.`);
      }
    });
  }

  // 3. Copy Reference ID Button
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = ticketCode ? ticketCode.textContent : '';
      if (textToCopy && navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy ID'; }, 2000);
        });
      }
    });
  }

  // 4. Submit Another Request Button
  if (btnSubmitAnother && form && receiptBox) {
    btnSubmitAnother.addEventListener('click', () => {
      form.reset();
      form.style.display = 'flex';
      receiptBox.style.display = 'none';
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

// ============================================================================
// INFINITE BANK - EXPLORE BFSI INTERACTIVE ENGINE & GA4 CD EVENT DISPATCHER
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
      institution: 'Infinite BANK',
      timestamp: new Date().toISOString(),
      ...params
    };
    window.dataLayer.push(eventPayload);

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
    if (fdAmountVal) fdAmountVal.textContent = `$${principal.toLocaleString()}`;

    const payoutMode = document.querySelector('input[name="fdPayout"]:checked')?.value || 'compounded';
    const years = activeFdMonths / 12;
    let maturity = principal;
    let interest = 0;

    if (payoutMode === 'compounded') {
      // Monthly compounding
      const r = activeFdRate / 100;
      maturity = principal * Math.pow(1 + r / 12, 12 * years);
      interest = maturity - principal;
    } else {
      // Simple annual interest paid monthly
      interest = principal * (activeFdRate / 100) * years;
      maturity = principal + interest;
    }

    const monthlyEq = interest / activeFdMonths;

    if (fdMaturityTotal) fdMaturityTotal.textContent = `$${Math.round(maturity).toLocaleString()}`;
    if (fdInterestGain) fdInterestGain.textContent = `+$${Math.round(interest).toLocaleString()}`;
    if (fdMonthlyEquivalent) fdMonthlyEquivalent.textContent = `$${Math.round(monthlyEq).toLocaleString()} / mo`;
  }

  if (fdAmountRange) {
    let fdDebounce = null;
    fdAmountRange.addEventListener('input', () => {
      calculateFd();
      clearTimeout(fdDebounce);
      fdDebounce = setTimeout(() => {
        const principal = parseFloat(fdAmountRange.value);
        pushBfsiGA4('calculate_fd_yield', {
          financial_product_name: 'Infinite High-Yield Multiplier Deposit',
          financial_category: 'wealth_management',
          calculation_type: 'fd_yield',
          tenure_range: `${activeFdMonths}_months`,
          financial_amount: principal,
          financial_amount_tier: getAmountTier(principal),
          interest_rate_apy: activeFdRate
        });
      }, 500);
    });
  }

  fdTenurePills.forEach(btn => {
    btn.addEventListener('click', () => {
      fdTenurePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFdMonths = parseInt(btn.getAttribute('data-months'), 10);
      activeFdRate = parseFloat(btn.getAttribute('data-rate'));
      if (fdApyDisplay) fdApyDisplay.textContent = `${activeFdRate.toFixed(2)}% APY`;
      calculateFd();

      pushBfsiGA4('select_tenure_option', {
        financial_product_name: 'Infinite High-Yield Multiplier Deposit',
        financial_category: 'wealth_management',
        tenure_range: `${activeFdMonths}_months`,
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

  function calculateLoanEmi() {
    if (!loanAmountRange || !loanYearsRange) return;
    const principal = parseFloat(loanAmountRange.value) || 350000;
    const years = parseInt(loanYearsRange.value, 10) || 15;

    if (loanAmountVal) loanAmountVal.textContent = `$${principal.toLocaleString()}`;
    if (loanYearsVal) loanYearsVal.textContent = `${years} Year${years > 1 ? 's' : ''}`;

    const monthlyRate = (activeLoanRate / 100) / 12;
    const totalMonths = years * 12;

    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const totalPayment = emi * totalMonths;
    const totalInt = totalPayment - principal;

    if (loanMonthlyEmi) loanMonthlyEmi.textContent = `$${Math.round(emi).toLocaleString()}`;
    if (loanTotalInterest) loanTotalInterest.textContent = `$${Math.round(totalInt).toLocaleString()}`;
    if (loanTotalPayable) loanTotalPayable.textContent = `$${Math.round(totalPayment).toLocaleString()}`;
  }

  loanTypePills.forEach(btn => {
    btn.addEventListener('click', () => {
      loanTypePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLoanRate = parseFloat(btn.getAttribute('data-rate'));
      activeLoanType = btn.textContent.trim();
      if (loanRateDisplay) loanRateDisplay.textContent = `${activeLoanRate.toFixed(2)}% Fixed APR`;
      calculateLoanEmi();

      pushBfsiGA4('select_loan_structure', {
        financial_product_name: activeLoanType,
        financial_category: 'retail_lending',
        interest_rate_apr: activeLoanRate
      });
    });
  });

  if (loanAmountRange && loanYearsRange) {
    let loanDebounce = null;
    const handleLoanChange = () => {
      calculateLoanEmi();
      clearTimeout(loanDebounce);
      loanDebounce = setTimeout(() => {
        const principal = parseFloat(loanAmountRange.value);
        const years = parseInt(loanYearsRange.value, 10);
        pushBfsiGA4('calculate_loan_emi', {
          financial_product_name: activeLoanType,
          financial_category: 'retail_lending',
          calculation_type: 'loan_emi',
          financial_amount: principal,
          financial_amount_tier: getAmountTier(principal),
          tenure_range: `${years}_years`,
          interest_rate_apr: activeLoanRate
        });
      }, 500);
    };

    loanAmountRange.addEventListener('input', handleLoanChange);
    loanYearsRange.addEventListener('input', handleLoanChange);
  }

  calculateLoanEmi();

  // 4. Insurance Tiers Selection
  const insuranceBoxes = document.querySelectorAll('.insurance-tier-box');
  const insSelectedCoverage = document.getElementById('insSelectedCoverage');
  const insSelectedPremium = document.getElementById('insSelectedPremium');

  insuranceBoxes.forEach(box => {
    box.addEventListener('click', () => {
      insuranceBoxes.forEach(b => b.classList.remove('active'));
      box.classList.add('active');
      const coverage = parseFloat(box.getAttribute('data-coverage'));
      const premium = parseFloat(box.getAttribute('data-premium'));

      if (insSelectedCoverage) insSelectedCoverage.textContent = `$${coverage.toLocaleString()}`;
      if (insSelectedPremium) insSelectedPremium.textContent = `$${premium.toLocaleString()} / mo`;

      pushBfsiGA4('select_insurance_tier', {
        financial_product_name: 'Executive Sovereign Asset Shield',
        financial_category: 'insurance',
        coverage_amount: coverage,
        monthly_premium: premium
      });
    });
  });

  // 5. Digital Onboarding Application Modal
  const bfsiApplyModal = document.getElementById('bfsiApplyModal');
  const closeBfsiModalBtn = document.getElementById('closeBfsiModalBtn');
  const btnDoneBfsiModal = document.getElementById('btnDoneBfsiModal');
  const bfsiApplicationForm = document.getElementById('bfsiApplicationForm');
  const bfsiSuccessBox = document.getElementById('bfsiSuccessBox');
  const bfsiModalProductTitle = document.getElementById('bfsiModalProductTitle');
  const bfsiSelectedProduct = document.getElementById('bfsiSelectedProduct');
  const bfsiRefCode = document.getElementById('bfsiRefCode');

  function openBfsiModal(productName) {
    if (!bfsiApplyModal) return;
    if (bfsiModalProductTitle) bfsiModalProductTitle.textContent = productName;
    if (bfsiSelectedProduct) bfsiSelectedProduct.value = productName;
    if (bfsiApplicationForm) {
      bfsiApplicationForm.style.display = 'block';
      bfsiApplicationForm.reset();
    }
    if (bfsiSuccessBox) bfsiSuccessBox.style.display = 'none';

    bfsiApplyModal.classList.add('active');

    pushBfsiGA4('financial_lead_start', {
      financial_product_name: productName,
      financial_category: productName.toLowerCase().includes('card') ? 'credit_cards' : (productName.toLowerCase().includes('deposit') ? 'wealth_management' : 'retail_lending'),
      application_status: 'initiated'
    });
  }

  function closeBfsiModal() {
    if (bfsiApplyModal) bfsiApplyModal.classList.remove('active');
  }

  // Trigger buttons
  document.getElementById('btnLockDeposit')?.addEventListener('click', function () {
    openBfsiModal(this.getAttribute('data-bfsi-product') || 'Infinite High-Yield Multiplier Deposit');
  });

  document.getElementById('btnCheckLoanOffer')?.addEventListener('click', function () {
    openBfsiModal(this.getAttribute('data-bfsi-product') || 'Prime Wealth Lending Facility');
  });

  document.querySelectorAll('.btn-apply-card').forEach(btn => {
    btn.addEventListener('click', function () {
      openBfsiModal(this.getAttribute('data-bfsi-product') || 'Infinite Black Titanium Card');
    });
  });

  document.getElementById('btnApplyInsurance')?.addEventListener('click', function () {
    openBfsiModal(this.getAttribute('data-bfsi-product') || 'Executive Sovereign Asset Shield');
  });

  closeBfsiModalBtn?.addEventListener('click', closeBfsiModal);
  btnDoneBfsiModal?.addEventListener('click', closeBfsiModal);
  bfsiApplyModal?.addEventListener('click', (e) => {
    if (e.target === bfsiApplyModal) closeBfsiModal();
  });

  // Form Submission
  if (bfsiApplicationForm) {
    bfsiApplicationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const clientName = document.getElementById('bfsiClientName')?.value.trim() || 'Valued Client';
      const clientEmail = document.getElementById('bfsiClientEmail')?.value.trim() || '';
      const incomeBracket = document.getElementById('bfsiIncomeBracket')?.value || '250k-500k';
      const purpose = document.getElementById('bfsiAccountPurpose')?.value || 'yield_maximization';
      const productName = bfsiSelectedProduct ? bfsiSelectedProduct.value : 'Infinite Wealth Solution';

      const refId = `INF-BFSI-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      if (bfsiRefCode) bfsiRefCode.textContent = refId;

      bfsiApplicationForm.style.display = 'none';
      if (bfsiSuccessBox) bfsiSuccessBox.style.display = 'block';

      // Push official GA4 custom dimensions & parameters
      pushBfsiGA4('financial_lead_submitted', {
        financial_product_name: productName,
        financial_category: productName.toLowerCase().includes('card') ? 'credit_cards' : (productName.toLowerCase().includes('deposit') ? 'wealth_management' : 'retail_lending'),
        customer_income_bracket: incomeBracket,
        primary_financial_objective: purpose,
        application_reference_id: refId,
        application_status: 'pre_approved_instant',
        client_name_masked: clientName.split(' ')[0]
      });

      showToast('🏛️', 'Application Dispatched', `Dossier ${refId} submitted to Private Underwriting.`);
    });
  }
}

// ================= INITIALIZATION =================
function initApp() {
  try { initBfsiEngine(); } catch (e) { console.error('Error initializing BFSI:', e); }
  try { renderProducts(); } catch (e) { console.error('Error rendering products:', e); }
  try { renderCart(); } catch (e) { console.error('Error rendering cart:', e); }
  try { renderWishlist(); } catch (e) { console.error('Error rendering wishlist:', e); }
  try { initDpdpCenter(); } catch (e) { console.error('Error initializing DPDP:', e); }
  console.log('INFINITE BANK - Private Wealth & BFSI Platform Initialized Successfully.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

