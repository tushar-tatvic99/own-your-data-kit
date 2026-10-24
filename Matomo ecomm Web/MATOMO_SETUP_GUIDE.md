# Complete Beginner's Guide: Setting Up Matomo Analytics & Ecommerce From Scratch

Welcome to the complete step-by-step guide for setting up **Matomo** (formerly Piwik) for your **Aura & Blush** boutique. This guide assumes zero prior experience and explains everything from account creation to database storage and report verification.

---

## Table of Contents
1. [What is Matomo and How Does it Work?](#1-what-is-matomo-and-how-does-it-work)
2. [Step 1: Choose Your Matomo Setup (Cloud vs. Free Self-Hosted)](#2-step-1-choose-your-matomo-setup-cloud-vs-free-self-hosted)
3. [Step 2: Create Your Website in Matomo & Enable Ecommerce](#3-step-2-create-your-website-in-matomo--enable-ecommerce)
4. [Step 3: Connect Your Website Code to Matomo](#4-step-3-connect-your-website-code-to-matomo)
5. [Step 4: How Data is Stored Inside Matomo](#5-step-4-how-data-is-stored-inside-matomo)
6. [Step 5: Testing & Seeing Events in Real Time](#6-step-5-testing--seeing-events-in-real-time)
7. [Step 6: Where to Find Your Reports in Matomo](#7-step-6-where-to-find-your-reports-in-matomo)
8. [Troubleshooting & Common Pitfalls](#8-troubleshooting--common-pitfalls)

---

## 1. What is Matomo and How Does it Work?

Matomo is an ethical, privacy-first web analytics platform (the leading open-source alternative to Google Analytics).

### How Tracking Works Behind the Scenes:
1. **User Action**: A customer visits your store, clicks a product, adds an item to their bag, or completes checkout.
2. **`_paq.push(...)`**: JavaScript puts tracking data into a global queue (`window._paq`).
3. **HTTP Request**: The `matomo.js` tracker sends a lightweight HTTP GET/POST request (a tiny 1x1 invisible pixel) to `your-matomo-url/matomo.php?idsite=1&...`.
4. **Database Storage**: Matomo receives the request and records it in its MySQL/MariaDB database.
5. **Dashboard Visualization**: Matomo processes raw logs into visual charts, conversion rates, and revenue tables.

---

## 2. Step 1: Choose Your Matomo Setup (Cloud vs. Free Self-Hosted)

You have two choices for where your Matomo server lives:

### Option A: Matomo Cloud (Easiest — 2 Minutes, No Server Required)
*Recommended if you want to start testing immediately without server maintenance.*
1. Go to [https://matomo.org/pricing/](https://matomo.org/pricing/) and click **Start 21-day Free Trial** (no credit card needed).
2. Choose your subdomain (e.g. `aurablush.matomo.cloud`).
3. Your Matomo URL will be: `https://aurablush.matomo.cloud/`.

### Option B: Self-Hosted with Docker (100% Free Forever)
*If you have Docker installed on your computer or server:*
```bash
# Run Matomo with MySQL in Docker
docker run -d --name matomo-db -e MYSQL_ROOT_PASSWORD=matomoroot -e MYSQL_DATABASE=matomo -e MYSQL_USER=matomo -e MYSQL_PASSWORD=matomopass mariadb:latest
docker run -d --name matomo-web --link matomo-db:db -p 8080:80 matomo:latest
```
Your Matomo URL will be: `http://localhost:8080/`.

---

## 3. Step 2: Create Your Website in Matomo & Enable Ecommerce

Once logged into your Matomo dashboard:

### 1. Find the Admin Settings
Click the **Gear icon (⚙️)** in the top right navigation bar.

### 2. Add Your Website
1. In the left sidebar, navigate to **Measurables** ➔ **Manage**.
2. Click the green **+ Add a new website** button.
3. Select **Website**.
4. Fill in the fields:
   - **Name**: `Aura & Blush Luxury Boutique`
   - **URLs**: `http://localhost:3000` (or your live domain)
   - **Timezone**: Select your local timezone.
   - **Currency**: `USD ($)` (or your preferred base currency).

### 3. CRITICAL: Turn On Ecommerce!
1. Scroll down to the **Ecommerce** section of the website settings form.
2. Change the setting from *Not an Ecommerce site* to:
   👉 **Ecommerce enabled**
3. Click **Save**.

### 4. Note Your Site ID
Once saved, Matomo will show your website in the list. Look at the **ID** column:
- Usually this is `1` for your first site.

---

## 4. Step 3: Connect Your Website Code to Matomo

Open the project file [matomo-tracker.js](file:///c:/Users/DhruviParekh/Documents/Hackathon%20Website%20ecom/matomo-tracker.js).

At the top of the file (lines 28–33), locate the `config` object:

```javascript
const config = {
  matomoUrl: 'https://analytics.auraandblush.com/', // <-- REPLACE THIS WITH YOUR MATOMO URL
  siteId: '1',                                      // <-- REPLACE THIS WITH YOUR SITE ID
  debugMode: true,                                  // Keep true to see events in console & HUD
  enableHeartbeat: true                             // Keeps active session alive
};
```

### Examples:
- **If using Matomo Cloud**:
  ```javascript
  matomoUrl: 'https://aurablush.matomo.cloud/',
  siteId: '1',
  ```
- **If using local Docker**:
  ```javascript
  matomoUrl: 'http://localhost:8080/',
  siteId: '1',
  ```

> [!IMPORTANT]
> Always ensure the `matomoUrl` ends with a trailing slash `/`.

---

## 5. Step 4: How Data is Stored Inside Matomo

Understanding the backend storage gives you full control as an analytics specialist.

### 1. Raw Log Tables (Captured Instantly)
Matomo stores real-time incoming visitor hits in high-performance log tables:
* `matomo_log_visit`: Records each visitor session, device, country, referral source, and total duration.
* `matomo_log_link_visit_action`: Records every pageview, outlink click, file download, and **Custom Event** (`category`, `action`, `name`, `value`).
* `matomo_log_conversion`: Records completed transactions when `trackEcommerceOrder` is fired, storing `order_id`, `revenue`, `subtotal`, `tax`, `shipping`, `discount`, and `items_count`.
* `matomo_log_conversion_item`: Stores individual purchased items (SKU, name, category, price, quantity) associated with the order.

### 2. Aggregated Archive Tables (Reports)
Periodically (every few minutes in development, or via daily cron in production), Matomo runs its archiving process (`core:archive`) to summarize raw rows into fast-loading reporting tables (`matomo_archive_numeric_*` and `matomo_archive_blob_*`).

---

## 6. Step 5: Testing & Seeing Events in Real Time

We built a **Live Event Inspector** right into the Aura & Blush website so you can verify events before even checking Matomo!

### Test Run:
1. Open your browser to **`http://localhost:3000`**.
2. Look at the bottom-left corner of the screen: click the black badge labeled **`📊 Matomo Events`**.
3. A sleek terminal window opens showing all live events captured.
4. Try these actions and watch new events appear in real-time:
   - **View a product**: Click on any product title to open the Quick View modal ➔ triggers `setEcommerceView`.
   - **Filter a category**: Click "Parfumerie" or "Fine Jewelry" ➔ triggers category `setEcommerceView` and `trackEvent`.
   - **Add to Bag**: Click "+ Add to Bag" ➔ triggers `addEcommerceItem` + `trackEcommerceCartUpdate`.
   - **Enter promo code**: Type `GIRLGLOW15` in the bag drawer and click Apply ➔ triggers `trackPromoCode (Applied - Success, value: $19.20)`.
   - **Checkout**: Click *Proceed to Checkout*, click *Fill Demo Details*, select shipping, and complete payment ➔ triggers `trackCheckoutStep (Steps 1–4)` and `trackEcommerceOrder` with the full order breakdown!

---

## 7. Step 6: Where to Find Your Reports in Matomo

Log into your Matomo admin dashboard to see your data:

### 1. Real-Time Visitor Stream
*Go to*: **Visitors** ➔ **Real-time** (or **Visits Log**).
- You will see your exact visit, your browser, IP, location, and a chronological stream of every action you just took (Pageview ➔ Product View ➔ Cart Update ➔ Custom Events ➔ Purchase!).

### 2. Ecommerce Reports
*Go to*: **Ecommerce** ➔ **Overview**.
- **Ecommerce Orders**: Total revenue, average order value, conversion rate.
- **Products**: Breakdown of which perfume, serum, or silk set generated the most revenue.
- **Abandoned Carts**: See carts that added products but did not complete checkout.

### 3. Custom Events Report
*Go to*: **Behavior** ➔ **Events**.
- **Event Categories**:
  - `Checkout Funnel`: See drop-off rates across Steps 1, 2, 3, and 4.
  - `Wishlist`: See which products get favorited most.
  - `Promotions`: See which coupon codes customers use.
  - `Gift Concierge`: See how many users toggle Parisian gift wrapping and write calligraphy notes.

---

## 8. Troubleshooting & Common Pitfalls

### Issue 1: Ad-blockers blocking tracking
*Symptom*: No hits appear in the Matomo server.  
*Reason*: Browser extensions like uBlock Origin or Brave Shields block domain names containing `matomo.php` or `analytics`.  
*Fix*: Disable your ad blocker on `localhost:3000` for testing, or whitelist your Matomo domain.

### Issue 2: "Do Not Track" is enabled in browser
*Symptom*: Matomo skips recording your visit.  
*Fix*: In Matomo Admin ➔ **Privacy** ➔ **Users opt-out**, verify if *Support Do Not Track* is active. You can temporarily disable DNT in your browser settings while testing.

### Issue 3: CORS error when running Matomo on a different port
*Symptom*: Browser console shows `CORS policy: No 'Access-Control-Allow-Origin' header`.  
*Fix*: Matomo handles image beacons (`/matomo.php`) without CORS issues. If using POST beacon API, ensure your Matomo server allows requests from `localhost:3000`.
