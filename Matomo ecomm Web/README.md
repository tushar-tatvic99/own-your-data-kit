# AURA & BLUSH — Parisian Feminine Luxuries & Atelier

An elegant boutique e-commerce web application featuring high-end feminine products, luxury aesthetics, and a complete interactive 4-step checkout journey.

---

## ✨ Features & Visual Aesthetics

### 🌸 Brand Identity & Design System
- **Palette**: Soft French blush pink (`#FAF2F0`, `#F1C9C3`, `#C06173`), Champagne & Antique Gold (`#DFBA73`, `#C99E58`), Alabaster and deep rosewood.
- **Typography**: Editorial Parisian serif headings (*Cormorant Garamond*, *Playfair Display*), clean modern UI text (*Plus Jakarta Sans*), and elegant calligraphy signatures (*Great Vibes*).
- **Aesthetic Details**: Glassmorphic frosted cards, subtle floating ambient glows, micro-interactions, gold foil button gradients, and real studio product photography.

---

## 💎 The Curated Treasures (6 Luxury Products)
1. **Maison de Rose Eau de Parfum** ($128.00) — Handcrafted Grasse rose de mai, pink peppercorn & cashmere wood.
2. **Aura Glow Rose Quartz & Face Elixir** ($74.00) — Cold-pressed rosehip squalane & certified Brazilian Grade-A rose quartz gua sha.
3. **Silk Petal Mulberry Silk Sleep Set** ($86.00) — 22-Momme 6A-grade pure silk pillowcase, cushioned eye mask & scrunchie.
4. **Gilded Pearl 18k Baroque Pearl Choker** ($115.00) — Hand-selected iridescent baroque freshwater pearl on 18k gold vermeil.
5. **Rose & Peony Luminous Body Soufflé** ($48.00) — Triple-whipped French peony, fair-trade shea butter & sunlit rose gold mica.
6. **Celestial Bloom Botanical Soy Candle** ($52.00) — Hand-poured coconut-soy wax, dried rose petals & crackling wooden wick.

---

## 🛍️ Interactive Shopping & Checkout Journey

### 1. Product Experience
- **Category Filter Tabs**: Parfumerie, Luminous Skincare, Silk & Slumber, Fine Jewelry, Artisanal Living.
- **Sort By**: Featured Atelier Edit, Price: Low to High, Price: High to Low, Highest Customer Rating.
- **Quick View Modal**: Deep-dive into ingredients, origin story, quantity selector, and instant add-to-bag.
- **Wishlist Drawer**: Save favorites with heart animations and move directly to bag in 1-click.
- **Multi-Currency Switcher**: Real-time conversions across USD ($), EUR (€), GBP (£), and CAD (CA$).

### 2. Slideover Shopping Bag Drawer
- **Free Shipping Progress Meter**: Dynamic live calculation towards the $75 complimentary white-glove shipping threshold.
- **Promo Code Engine**: Try `GIRLGLOW15` (15% off), `BLUSH20` (20% off), or `LUXE10` ($10 gift credit).
- **Complimentary Gift Wrapping Toggle**: Includes Parisian pink box, satin ribbon, and personalized handwritten gold calligraphy card note.

### 3. Comprehensive 4-Step Checkout Journey
- **Step 1: Details & Delivery**: Contact email and shipping address with a **"✨ Fill Demo Details"** button for instant demonstration.
- **Step 2: Shipping Method**:
  - *Atelier Standard Delivery* (Free over $75 or $5.00)
  - *Priority Royal Courier 👑* ($12.00, thermal silk cushioned packaging)
  - *Parisian Rose Express 🌹* ($24.00, white-glove hand-delivery with a fresh Ecuadorian rose)
- **Step 3: Luxury Payment**:
  - Express instant checkout options (Apple Pay, Google Pay, PayPal)
  - **Interactive 3D Credit Card**: Card number, name, and expiration sync live onto the metallic gradient card graphic as you type!
  - Simulated 256-bit SSL authorization with animated spinner.
- **Step 4: Celebration & Order Confirmation**:
  - Dazzling celebratory confetti shower (`canvas-confetti`).
  - Unique generated Order ID (e.g. `#AB-84920`).
  - Estimated delivery date calculation.
  - **Live Order Tracking Timeline** (Order Placed → Atelier Packaging → Courier Dispatched → Delivered).
  - Handwritten gift card note display.
  - **Print / Download Invoice** action.

---

## 📊 Matomo Analytics & Ecommerce Event Schema Integration

As a Matomo Integration Specialist, the web application includes a comprehensive, production-grade **Matomo (Piwik)** tracking architecture with both standard ecommerce and custom event schemas:

### 1. Official Matomo Ecommerce Events
- **Product Detail View**: `_paq.push(['setEcommerceView', productSKU, productName, category, price])` followed by `trackPageView`.
- **Category View**: `_paq.push(['setEcommerceView', false, false, categoryName])` followed by `trackPageView`.
- **Cart Update**: `_paq.push(['addEcommerceItem', ...])` for all active items followed by `_paq.push(['trackEcommerceCartUpdate', grandTotal])`.
- **Order / Transaction**: `_paq.push(['addEcommerceItem', ...])` followed by `_paq.push(['trackEcommerceOrder', orderId, grandTotal, subTotal, tax, shipping, discount])`.

### 2. Custom Matomo Events (`trackEvent`)
- **Checkout Funnel**: Step 1 (Address), Step 2 (Shipping method selection), Step 3 (Payment authorization), Step 4 (Order placed & confirmed).
- **Wishlist**: Add to wishlist, remove, and move-to-bag.
- **Promotions**: Coupon validation success & failure (`GIRLGLOW15`, `BLUSH20`, `LUXE10`).
- **Gift Concierge**: Gift wrapping toggles & custom handwritten calligraphy card message inputs.
- **Localization**: Multi-currency conversion switches (`USD`, `EUR`, `GBP`, `CAD`).
- **Catalog Navigation**: Filter pill clicks and sort order dropdown changes.
- **Lead Generation**: VIP Pink Society newsletter subscriptions.
- **Post-Purchase**: Print receipt / invoice clicks.

### 3. Matomo Live Event Inspector HUD
- Click the floating **`📊 Matomo Events`** button in the bottom-left corner of the website to inspect the real-time event stream, method names, and exact `_paq.push()` payloads!
- Complete technical specification documented in: [MATOMO_EVENT_SCHEMA.md](file:///c:/Users/DhruviParekh/Documents/Hackathon%20Website%20ecom/MATOMO_EVENT_SCHEMA.md).

---

## 🚀 How to Run Locally

The server is currently running at:
```
http://localhost:3000
```

To run manually at any time:
```bash
node server.js
```
Open your favorite browser (Chrome, Edge, Safari, Firefox) and navigate to `http://localhost:3000`.
