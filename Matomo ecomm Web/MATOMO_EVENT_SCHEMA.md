# MATOMO ANALYTICS & ECOMMERCE EVENT SCHEMA SPECIFICATION

**Client/Project**: Aura & Blush — Parisian Atelier de Beauté  
**Implementation Specialist**: Matomo Integration Specialist  
**Specification Version**: 2.4.0 (Matomo Official Ecommerce & Custom Events Standard)  
**Tracker Global Queue**: `window._paq`  

---

## 1. Executive Architecture Overview

This project implements a complete **Matomo Analytics** architecture following the official Matomo specifications for:
1. **Standard Pageview & Heartbeat Tracking**
2. **Standard Matomo Ecommerce Tracking**:
   - Product Page View (`setEcommerceView`)
   - Category Page View (`setEcommerceView`)
   - Shopping Cart Updates (`addEcommerceItem` + `trackEcommerceCartUpdate`)
   - Complete Order / Purchase Transactions (`addEcommerceItem` + `trackEcommerceOrder`)
3. **Matomo Custom Event Tracking (`trackEvent`)**:
   - Full 4-Step Checkout Funnel progression
   - Wishlist engagement (Add, Remove, Move to Bag)
   - Promotional vouchers & coupon validation
   - Gift concierge service interactions (Gift wrap, custom calligraphy note)
   - Localization & currency switches
   - Catalog filtering and sorting
   - VIP Newsletter lead generation
4. **Real-Time Visual Inspector HUD**:
   - A floating interactive inspector (`📊 Matomo Events`) displaying every live `_paq.push()` call, method name, timestamp, and payload with zero external tool dependencies!

---

## 2. Global Initialization & Base Tracking

```javascript
var _paq = window._paq = window._paq || [];
_paq.push(['setSiteId', '1']);
_paq.push(['setTrackerUrl', 'https://analytics.auraandblush.com/matomo.php']);
_paq.push(['enableHeartBeatTimer', 15]); // 15-second ping for active engagement
_paq.push(['enableLinkTracking']);
_paq.push(['trackPageView', document.title]);
```

---

## 3. Matomo Standard Ecommerce Event Schema

### 3.1 Product Detail View
*Fired when a user clicks a product title or the Quick View modal.*

```javascript
_paq.push(['setEcommerceView',
  'p1',                               // (Required) productSKU
  'Maison de Rose Eau de Parfum',     // (Optional) productName
  'PARFUMERIE',                       // (Optional) categoryName
  128.00                              // (Optional) price
]);
_paq.push(['trackPageView', 'Product: Maison de Rose Eau de Parfum | Aura & Blush']);
```

### 3.2 Category / Collection View
*Fired when a user filters by category tab (e.g. Parfumerie, Luminous Skincare, Silk & Slumber).*

```javascript
_paq.push(['setEcommerceView',
  false,                              // Product SKU is false for category view
  false,                              // Product Name is false
  'PARFUMERIE'                        // Category name
]);
_paq.push(['trackPageView', 'Collection: PARFUMERIE | Aura & Blush']);
```

### 3.3 Shopping Cart Update
*Fired whenever items are added, removed, or quantities change in the cart.*

```javascript
// Step A: Register every item currently present in the cart
_paq.push(['addEcommerceItem',
  'p1',                               // (Required) productSKU
  'Maison de Rose Eau de Parfum',     // (Optional) productName
  'PARFUMERIE',                       // (Optional) productCategory
  128.00,                             // (Optional) price
  2                                   // (Optional) quantity
]);

// Step B: Record the updated cart total
_paq.push(['trackEcommerceCartUpdate', 256.00]);
```

### 3.4 Complete Order Transaction (Purchase Confirmation)
*Fired upon successful order authorization in Step 4.*

```javascript
// Step A: Register all purchased line items
_paq.push(['addEcommerceItem',
  'p1',                               // (Required) productSKU
  'Maison de Rose Eau de Parfum',     // (Optional) productName
  'PARFUMERIE',                       // (Optional) productCategory
  128.00,                             // (Optional) price
  2                                   // (Optional) quantity
]);
_paq.push(['addEcommerceItem',
  'p3',
  'Silk Petal Mulberry Silk Sleep Set',
  'SILK & SLUMBER',
  86.00,
  1
]);

// Step B: Submit the complete transaction record
_paq.push(['trackEcommerceOrder',
  '#AB-84920',                        // (Required) unique orderId
  303.60,                             // (Required) grandTotal
  342.00,                             // (Optional) subTotal
  0.00,                               // (Optional) tax
  12.00,                              // (Optional) shipping
  50.40                               // (Optional) discount amount
]);
```

---

## 4. Matomo Custom Events Schema (`trackEvent`)

Syntax: `_paq.push(['trackEvent', category, action, name, value]);`

| Category | Action | Name (Dimension) | Value (Metric) | Triggered When |
| :--- | :--- | :--- | :--- | :--- |
| **Checkout Funnel** | `Step 1: Shipping Address Provided` | JSON `{country, city, email}` | `1` | Customer submits Step 1 contact form |
| **Checkout Funnel** | `Step 2: Courier Selected` | JSON `{courier, shippingFee}` | `2` | User chooses Standard / Royal / Parisian courier |
| **Checkout Funnel** | `Step 2: Shipping Completed` | JSON `{method}` | `2` | User completes Step 2 shipping choice |
| **Checkout Funnel** | `Step 3: Payment Authorized Initiated` | JSON `{method, cardBrand}` | `3` | User submits credit card or express payment |
| **Checkout Funnel** | `Step 4: Order Placed & Confirmed` | JSON `{orderId, grandTotal, itemsCount}` | `4` | Order successfully processed and confirmed |
| **Ecommerce** | `Add to Bag Click` | Product Name (e.g. `Maison de Rose`) | Unit Price | User clicks Add to Bag button |
| **Ecommerce** | `Item Removed from Bag` | Product Name | Unit Price | User clicks remove on cart item |
| **Ecommerce** | `Shopping Bag Opened` | Count (e.g. `2 items`) | Subtotal | User opens slideover cart drawer |
| **Wishlist** | `Add to Wishlist` | Product Name | Unit Price | User clicks heart to favorite |
| **Wishlist** | `Remove from Wishlist` | Product Name | Unit Price | User un-favorites item |
| **Wishlist** | `Move to Bag` | Product Name | Unit Price | User moves wishlist treasure directly into cart |
| **Promotions** | `Coupon Applied - Success` | Promo Code (e.g. `GIRLGLOW15`) | Discount $ | Valid promo code applied |
| **Promotions** | `Coupon Applied - Failed` | Attempted Code | `0` | Invalid promo code entered |
| **Promotions** | `Copy Promo Pill Clicked` | Code (`GIRLGLOW15`) | — | User clicks header banner promo pill |
| **Gift Concierge** | `Gift Wrap Option Toggled` | `Enabled` / `Disabled` | — | User checks/unchecks gift packaging |
| **Gift Concierge** | `Handwritten Card Message Customized` | Message length (e.g. `45 characters`) | — | User inputs customized calligraphy card note |
| **Localization** | `Currency Changed` | Currency code (`EUR`, `GBP`, `CAD`) | Exchange Rate | User switches currency in header |
| **Catalog** | `Category Filter Applied` | Category slug (`fragrance`, `silk`) | — | User clicks category pill |
| **Catalog** | `Sort Order Changed` | Sort type (`price-asc`, `rating`) | — | User changes sort dropdown |
| **Lead Generation** | `VIP Pink Society Signup` | Email address | — | User joins VIP club in newsletter section |
| **Post-Purchase** | `Print Receipt Clicked` | Order ID (`#AB-xxxxx`) | — | User clicks Print / Download invoice |

---

## 5. Matomo Live Event Inspector HUD

For instant verification and presentation, a built-in inspector is included in the bottom-left corner of the web application:
- **Floating Badge**: `📊 Matomo Events [N]` displays real-time captured event counts.
- **Filtering**: View *All Events*, *Ecommerce Spec*, *Checkout Funnel*, or *Custom Events*.
- **Payload Inspection**: View formatted JSON showing the exact `_paq.push()` array passed to Matomo.
- **Clear Log**: Clear live sessions to start fresh test journeys.

---

## 6. How to Connect to a Live Matomo Instance

In `matomo-tracker.js`, simply update:
```javascript
const config = {
  matomoUrl: 'https://your-matomo-domain.com/', // Your Matomo URL
  siteId: '1',                                  // Your Matomo Site ID
  debugMode: true,                              // Keep true for console/HUD logs
  enableHeartbeat: true
};
```
Everything is pre-wired, tested, and ready for production!
