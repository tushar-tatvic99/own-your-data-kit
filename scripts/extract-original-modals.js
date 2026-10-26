const cp = require('child_process');
const fs = require('fs');

const orig = cp.execSync('git show cb55a6a:index.html', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });

// 1. Cart Drawer
const cartIdx = orig.indexOf('id="cartDrawer"');
const overlayIdx = orig.lastIndexOf('<div class="drawer-overlay" id="cartOverlay">', cartIdx);
const asideEnd = orig.indexOf('</aside>', cartIdx) + 8;
const cartHtml = orig.substring(overlayIdx, asideEnd);

// 2. Checkout Modal
const chkIdx = orig.indexOf('id="checkoutModal"');
const chkStart = orig.lastIndexOf('<!--', chkIdx);
const chkEnd = orig.indexOf('<!-- ============================================== -->\n  <!-- PRODUCT QUICK VIEW', chkIdx);
const chkHtml = orig.substring(chkStart, chkEnd);

// 3. Quick View Modal
const qvIdx = orig.indexOf('id="quickViewModal"');
const qvStart = orig.lastIndexOf('<!--', qvIdx);
const qvEnd = orig.indexOf('<!-- ============================================== -->\n  <!-- WISHLIST DRAWER -->', qvIdx);
const qvHtml = orig.substring(qvStart, qvEnd);

// 4. Wishlist Drawer
const wlIdx = orig.indexOf('id="wishlistDrawer"');
const wlStart = orig.lastIndexOf('<!--', wlIdx);
const wlEnd = orig.indexOf('<!-- Toast Notifications Container -->', wlIdx);
const wlHtml = orig.substring(wlStart, wlEnd);

fs.writeFileSync('extracted_modals.json', JSON.stringify({ cartHtml, chkHtml, qvHtml, wlHtml }, null, 2), 'utf8');
console.log('Extracted successfully:');
console.log('- Cart length:', cartHtml.length);
console.log('- Checkout length:', chkHtml.length);
console.log('- QuickView length:', qvHtml.length);
console.log('- Wishlist length:', wlHtml.length);
