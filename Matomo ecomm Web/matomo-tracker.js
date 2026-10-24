/**
 * ============================================================================
 * UNIFIED GA4 & MATOMO ECOMMERCE ANALYTICS ENGINE
 * ============================================================================
 * Implements complete official GA4 Standard Ecommerce Schema (Google Tag Manager)
 * and Matomo Ecommerce Specification.
 *
 * Supported GA4 Events:
 * 1.  view_item_list     (Category/Catalog item impressions)
 * 2.  select_item        (Clicking a product card)
 * 3.  view_item          (Product detail / quick view modal)
 * 4.  add_to_cart        (Adding item or incrementing bag)
 * 5.  remove_from_cart   (Removing item or decrementing bag)
 * 6.  view_cart          (Opening shopping bag drawer)
 * 7.  begin_checkout     (Entering Checkout Journey Step 1)
 * 8.  add_shipping_info  (Selecting shipping courier in Step 2)
 * 9.  add_payment_info   (Selecting/submitting payment in Step 3)
 * 10. purchase           (Completed order transaction in Step 4)
 * ============================================================================
 */

// Initialize global queues
window._paq = window._paq || [];
window._paq.push(['requireConsent']); // DPDP Compliance: Disables tracking until affirmative consent
window._mtm = window._mtm || [];
window.dataLayer = window.dataLayer || [];

const MatomoTracker = (function () {
  const config = {
    matomoUrl: (typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin + '/' : 'http://localhost:3000/'),
    siteId: '1',
    debugMode: true,
    enableHeartbeat: true
  };

  const eventLog = [];
  const listeners = [];

  /**
   * Helper to push to Matomo _paq and notify HUD
   */
  function push(methodName, args = []) {
    const eventPayload = [methodName, ...args];
    window._paq.push(eventPayload);

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      method: `Matomo: ${methodName}`,
      args: args,
      raw: eventPayload,
      type: 'matomo'
    };

    eventLog.unshift(logEntry);
    if (eventLog.length > 100) eventLog.pop();

    if (config.debugMode) {
      console.log(
        `%c[Matomo Analytics 📊]%c ${methodName}`,
        'background: #1E1B19; color: #DFC89B; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
        'color: #1E1B19; font-weight: bold;',
        args
      );
    }
    listeners.forEach(fn => fn(logEntry, eventLog));
  }

  /**
   * Helper to push official GA4 Standard Ecommerce payload into dataLayer
   */
  function pushGA4(eventName, ecommerceData) {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    
    // Google best practice: reset previous ecommerce state to prevent data leakage
    window.dataLayer.push({ ecommerce: null });

    const payload = {
      event: eventName,
      ecommerce: ecommerceData
    };
    window.dataLayer.push(payload);

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      method: `GA4: ${eventName}`,
      args: [ecommerceData],
      raw: payload,
      type: 'ga4'
    };

    eventLog.unshift(logEntry);
    if (eventLog.length > 100) eventLog.pop();

    if (config.debugMode) {
      console.log(
        `%c[GA4 Ecommerce 🛍️]%c ${eventName}`,
        'background: #B89658; color: #FFFFFF; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
        'color: #1E1B19; font-weight: bold;',
        ecommerceData
      );
    }
    listeners.forEach(fn => fn(logEntry, eventLog));
  }

  // ==========================================================================
  // INITIALIZATION & PAGE TRACKING
  // ==========================================================================
  function init() {
    push('setSiteId', [config.siteId]);
    push('setTrackerUrl', [`${config.matomoUrl}matomo.php`]);
    if (config.enableHeartbeat) {
      push('enableHeartBeatTimer', [15]);
    }
    push('enableLinkTracking');
    push('trackPageView', [document.title]);

    if (typeof document !== 'undefined' && !document.getElementById('matomo-script')) {
      const g = document.createElement('script');
      g.id = 'matomo-script';
      g.async = true;
      g.src = `${config.matomoUrl}matomo.js`;
      const s = document.getElementsByTagName('script')[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(g, s);
      }
    }
  }

  function trackPageView(pageTitle, customUrl) {
    if (pageTitle) push('setDocumentTitle', [pageTitle]);
    if (customUrl) push('setCustomUrl', [customUrl]);
    push('trackPageView');
  }

  // ==========================================================================
  // 10 GA4 & MATOMO STANDARD ECOMMERCE EVENTS
  // ==========================================================================

  /**
   * 1. View Item List (Catalog / Collection Page)
   * GA4: view_item_list
   * Matomo: setEcommerceView(false, false, category)
   */
  function trackViewItemList(listName, products = []) {
    push('setEcommerceView', [false, false, listName]);
    push('trackPageView', [`Collection: ${listName} | Aura & Blush`]);

    pushGA4('view_item_list', {
      item_list_id: listName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      item_list_name: listName,
      items: products.map((prod, idx) => ({
        item_id: prod.id,
        item_name: prod.name,
        item_category: prod.categoryLabel || prod.category,
        price: parseFloat(prod.price),
        index: idx + 1
      }))
    });
  }

  /**
   * 2. Select Item (Clicking a Product Card)
   * GA4: select_item
   * Matomo: trackEvent('Catalog', 'Select Item', productName, price)
   */
  function trackSelectItem(product, listName = 'Featured Atelier Edit', index = 1) {
    push('trackEvent', ['Catalog', 'Select Item', product.name, parseFloat(product.price)]);

    pushGA4('select_item', {
      item_list_id: listName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      item_list_name: listName,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.categoryLabel || product.category,
        price: parseFloat(product.price),
        index: index
      }]
    });
  }

  /**
   * 3. View Item (Product Details / Quick View Modal)
   * GA4: view_item
   * Matomo: setEcommerceView(SKU, Name, Category, Price)
   */
  function trackProductView(product) {
    push('setEcommerceView', [
      product.id,
      product.name,
      product.categoryLabel || product.category,
      parseFloat(product.price)
    ]);
    push('trackPageView', [`Product: ${product.name} | Aura & Blush`]);

    pushGA4('view_item', {
      currency: 'USD',
      value: parseFloat(product.price),
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.categoryLabel || product.category,
        price: parseFloat(product.price),
        quantity: 1
      }]
    });
  }

  /**
   * 4. Add to Cart
   * GA4: add_to_cart
   * Matomo: addEcommerceItem & trackEcommerceCartUpdate
   */
  function trackAddToCart(product, quantity = 1, currentGrandTotal = 0) {
    push('addEcommerceItem', [
      product.id,
      product.name,
      product.categoryLabel || product.category,
      parseFloat(product.price),
      parseInt(quantity, 10)
    ]);
    push('trackEcommerceCartUpdate', [parseFloat(currentGrandTotal.toFixed(2))]);

    pushGA4('add_to_cart', {
      currency: 'USD',
      value: parseFloat((product.price * quantity).toFixed(2)),
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.categoryLabel || product.category,
        price: parseFloat(product.price),
        quantity: parseInt(quantity, 10)
      }]
    });
  }

  /**
   * 5. Remove from Cart
   * GA4: remove_from_cart
   * Matomo: trackEcommerceCartUpdate & custom event
   */
  function trackRemoveFromCart(product, quantity = 1, currentGrandTotal = 0) {
    push('trackEvent', ['Ecommerce', 'Remove from Cart', product.name, parseFloat(product.price)]);
    push('trackEcommerceCartUpdate', [parseFloat(currentGrandTotal.toFixed(2))]);

    pushGA4('remove_from_cart', {
      currency: 'USD',
      value: parseFloat((product.price * quantity).toFixed(2)),
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.categoryLabel || product.category,
        price: parseFloat(product.price),
        quantity: parseInt(quantity, 10)
      }]
    });
  }

  /**
   * 6. View Cart (Shopping Bag Opened)
   * GA4: view_cart
   * Matomo: trackEvent('Ecommerce', 'Shopping Bag Viewed')
   */
  function trackViewCart(cartItems, allProducts, cartTotals) {
    push('trackEvent', ['Ecommerce', 'Shopping Bag Viewed', `${cartTotals.itemCount} items`, cartTotals.subtotal]);

    pushGA4('view_cart', {
      currency: 'USD',
      value: parseFloat(cartTotals.subtotal.toFixed(2)),
      items: cartItems.map(item => {
        const prod = allProducts ? allProducts.find(p => p.id === item.productId) : null;
        return {
          item_id: item.productId,
          item_name: prod ? prod.name : item.productId,
          item_category: prod ? (prod.categoryLabel || prod.category) : 'Atelier Collection',
          price: prod ? parseFloat(prod.price) : 0,
          quantity: parseInt(item.quantity, 10)
        };
      })
    });
  }

  /**
   * 7. Begin Checkout (Step 1 Initiated)
   * GA4: begin_checkout
   * Matomo: trackCheckoutStep(1)
   */
  function trackBeginCheckout(cartItems, allProducts, cartTotals, couponCode = undefined) {
    trackCustomEvent('Checkout Funnel', 'Step 1: Contact Details', `${cartTotals.itemCount} items`, 1);

    pushGA4('begin_checkout', {
      currency: 'USD',
      value: parseFloat(cartTotals.grandTotal.toFixed(2)),
      coupon: cartTotals.discount > 0 ? couponCode : undefined,
      items: cartItems.map(item => {
        const prod = allProducts ? allProducts.find(p => p.id === item.productId) : null;
        return {
          item_id: item.productId,
          item_name: prod ? prod.name : item.productId,
          item_category: prod ? (prod.categoryLabel || prod.category) : 'Atelier Collection',
          price: prod ? parseFloat(prod.price) : 0,
          quantity: parseInt(item.quantity, 10)
        };
      })
    });
  }

  /**
   * 8. Add Shipping Info (Step 2 Selected / Submitted)
   * GA4: add_shipping_info
   * Matomo: trackCheckoutStep(2)
   */
  function trackAddShippingInfo(cartItems, allProducts, cartTotals, shippingTier, couponCode = undefined) {
    trackCustomEvent('Checkout Funnel', 'Step 2: Shipping Selected', shippingTier, 2);

    pushGA4('add_shipping_info', {
      currency: 'USD',
      value: parseFloat(cartTotals.grandTotal.toFixed(2)),
      shipping_tier: shippingTier,
      coupon: cartTotals.discount > 0 ? couponCode : undefined,
      items: cartItems.map(item => {
        const prod = allProducts ? allProducts.find(p => p.id === item.productId) : null;
        return {
          item_id: item.productId,
          item_name: prod ? prod.name : item.productId,
          item_category: prod ? (prod.categoryLabel || prod.category) : 'Atelier Collection',
          price: prod ? parseFloat(prod.price) : 0,
          quantity: parseInt(item.quantity, 10)
        };
      })
    });
  }

  /**
   * 9. Add Payment Info (Step 3 Payment Method Selected / Authorized)
   * GA4: add_payment_info
   * Matomo: trackCheckoutStep(3)
   */
  function trackAddPaymentInfo(cartItems, allProducts, cartTotals, paymentType, couponCode = undefined) {
    trackCustomEvent('Checkout Funnel', 'Step 3: Payment Method Selected', paymentType, 3);

    pushGA4('add_payment_info', {
      currency: 'USD',
      value: parseFloat(cartTotals.grandTotal.toFixed(2)),
      payment_type: paymentType,
      coupon: cartTotals.discount > 0 ? couponCode : undefined,
      items: cartItems.map(item => {
        const prod = allProducts ? allProducts.find(p => p.id === item.productId) : null;
        return {
          item_id: item.productId,
          item_name: prod ? prod.name : item.productId,
          item_category: prod ? (prod.categoryLabel || prod.category) : 'Atelier Collection',
          price: prod ? parseFloat(prod.price) : 0,
          quantity: parseInt(item.quantity, 10)
        };
      })
    });
  }

  /**
   * 10. Purchase (Step 4 Order Completed)
   * GA4: purchase
   * Matomo: trackEcommerceOrder
   */
  function trackOrder(orderData) {
    const {
      orderId,
      items,
      grandTotal,
      subTotal,
      tax = 0,
      shipping = 0,
      discount = 0,
      couponCode = undefined
    } = orderData;

    // Attach items to Matomo
    items.forEach(item => {
      push('addEcommerceItem', [
        item.sku || item.id,
        item.name,
        item.category || 'Atelier Collection',
        parseFloat(item.price),
        parseInt(item.quantity, 10)
      ]);
    });

    // Send Matomo transaction
    push('trackEcommerceOrder', [
      orderId,
      parseFloat(grandTotal.toFixed(2)),
      parseFloat(subTotal.toFixed(2)),
      parseFloat(tax.toFixed(2)),
      parseFloat(shipping.toFixed(2)),
      parseFloat(discount.toFixed(2))
    ]);

    // Send GA4 Purchase Event
    pushGA4('purchase', {
      transaction_id: orderId,
      value: parseFloat(grandTotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      currency: 'USD',
      coupon: discount > 0 ? couponCode : undefined,
      items: items.map(item => ({
        item_id: item.sku || item.id,
        item_name: item.name,
        item_category: item.category || 'Atelier Collection',
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity, 10)
      }))
    });
  }

  /**
   * Cart State Update (General sync)
   */
  function trackCartUpdate(cartItems, grandTotal, allProducts) {
    cartItems.forEach(item => {
      const product = allProducts ? allProducts.find(p => p.id === item.productId) : null;
      if (product) {
        push('addEcommerceItem', [
          product.id,
          product.name,
          product.categoryLabel || product.category,
          parseFloat(product.price),
          parseInt(item.quantity, 10)
        ]);
      }
    });
    push('trackEcommerceCartUpdate', [parseFloat(grandTotal.toFixed(2))]);
  }

  // ==========================================================================
  // CUSTOM EVENTS
  // ==========================================================================
  function trackCustomEvent(category, action, name = undefined, value = undefined) {
    const args = [category, action];
    if (name !== undefined) args.push(name);
    if (value !== undefined) args.push(parseFloat(value) || value);
    push('trackEvent', args);
  }

  function trackCheckoutStep(stepNumber, stepName, details = {}) {
    trackCustomEvent(
      'Checkout Funnel',
      `Step ${stepNumber}: ${stepName}`,
      JSON.stringify(details),
      stepNumber
    );
  }

  function trackWishlist(action, productName, price) {
    trackCustomEvent('Wishlist', action, productName, price);
  }

  function trackPromoCode(status, code, discountAmount) {
    trackCustomEvent('Promotions', `Coupon ${status}`, code, discountAmount);
  }

  function trackGiftService(action, details) {
    trackCustomEvent('Gift Concierge', action, details);
  }

  function trackCurrencyChange(currencyCode, exchangeRate) {
    trackCustomEvent('Localization', 'Currency Changed', currencyCode, exchangeRate);
  }

  function trackSiteSearch(keyword, count) {
    push('trackSiteSearch', [keyword, false, count]);
  }

  // ==========================================================================
  // LIVE INSPECTOR HUD HELPER
  // ==========================================================================
  function onEvent(callback) {
    listeners.push(callback);
  }

  function getEventLog() {
    return [...eventLog];
  }

  function clearLog() {
    eventLog.length = 0;
    listeners.forEach(fn => fn(null, eventLog));
  }

  return {
    init,
    push,
    pushGA4,
    trackPageView,
    trackViewItemList,
    trackSelectItem,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackViewCart,
    trackBeginCheckout,
    trackAddShippingInfo,
    trackAddPaymentInfo,
    trackOrder,
    trackCartUpdate,
    trackCustomEvent,
    trackCheckoutStep,
    trackWishlist,
    trackPromoCode,
    trackGiftService,
    trackCurrencyChange,
    trackSiteSearch,
    onEvent,
    getEventLog,
    clearLog
  };
})();

// Auto-initialize standard tracker
MatomoTracker.init();
