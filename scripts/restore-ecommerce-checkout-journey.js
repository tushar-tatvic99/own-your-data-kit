const fs = require('fs');
const path = require('path');

console.log('Restoring Complete E-Commerce Checkout Journey & Events in ecommerce.html...');

const modals = JSON.parse(fs.readFileSync('extracted_modals.json', 'utf8'));
const fullEcommerceModals = `
  <!-- ============================================== -->
  <!-- SHOPPING BAG DRAWER (Full Working Implementation) -->
  <!-- ============================================== -->
  ${modals.cartHtml}

  <!-- ============================================== -->
  <!-- 4-STEP CHECKOUT MODAL (Complete Flow with Events) -->
  <!-- ============================================== -->
  ${modals.chkHtml}

  <!-- ============================================== -->
  <!-- PRODUCT QUICK VIEW MODAL -->
  <!-- ============================================== -->
  ${modals.qvHtml}

  <!-- ============================================== -->
  <!-- WISHLIST DRAWER -->
  <!-- ============================================== -->
  ${modals.wlHtml}
`;

const targetDirs = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targetDirs.forEach(dir => {
  const filePath = path.join(dir, 'ecommerce.html');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace from <!-- Shopping Bag Drawer --> to before DPDP section or footer
    const startPattern = /<!-- Shopping Bag Drawer -->[\s\S]*?(?=(?:<!-- =*\s*DPDP ACT 2023|<section class="[^"]*" id="dpdp-erasure">|<footer))/;
    
    if (startPattern.test(content)) {
      content = content.replace(startPattern, fullEcommerceModals + '\n  ');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Restored full checkout journey markup in ' + filePath);
    } else {
      console.warn('Could not match modal block in ' + filePath);
    }
  }
});

// Update app.js to add defensive guards & dual button selector
targetDirs.forEach(dir => {
  const appPath = path.join(dir, 'app.js');
  if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');

    // 1. Guard shippingProgressBar in renderCart
    const oldProgressBar = `  const pct = Math.min(100, Math.round((totals.subtotal / totals.freeThreshold) * 100));
  shippingProgressBar.style.width = \`\${pct}%\`;
  
  if (totals.subtotal >= totals.freeThreshold) {
    shippingProgressMsg.innerHTML = \`🌸 <strong>Complimentary Luxury White-Glove Shipping Unlocked!</strong>\`;
  } else {
    const remaining = totals.freeThreshold - totals.subtotal;
    shippingProgressMsg.innerHTML = \`Add <strong>\${formatPrice(remaining)}</strong> more to unlock <strong>Free White-Glove Delivery</strong>!\`;
  }`;

    const newProgressBar = `  if (shippingProgressBar) {
    const pct = Math.min(100, Math.round((totals.subtotal / totals.freeThreshold) * 100));
    shippingProgressBar.style.width = \`\${pct}%\`;
  }
  if (shippingProgressMsg) {
    if (totals.subtotal >= totals.freeThreshold) {
      shippingProgressMsg.innerHTML = \`🌸 <strong>Complimentary Luxury White-Glove Shipping Unlocked!</strong>\`;
    } else {
      const remaining = totals.freeThreshold - totals.subtotal;
      shippingProgressMsg.innerHTML = \`Add <strong>\${formatPrice(remaining)}</strong> more to unlock <strong>Free White-Glove Delivery</strong>!\`;
    }
  }`;

    if (appContent.includes(oldProgressBar)) {
      appContent = appContent.replace(oldProgressBar, newProgressBar);
    }

    // 2. Guard cartEmptyState & drawer footer
    const oldEmptyState = `  if (state.cart.length === 0) {
    cartItemsList.innerHTML = '';
    cartItemsList.appendChild(cartEmptyState);
    cartEmptyState.style.display = 'flex';
    document.getElementById('cartDrawerFooter').style.opacity = '0.5';
    proceedCheckoutBtn.disabled = true;
  } else {
    cartEmptyState.style.display = 'none';
    document.getElementById('cartDrawerFooter').style.opacity = '1';
    proceedCheckoutBtn.disabled = false;`;

    const newEmptyState = `  if (state.cart.length === 0) {
    if (cartItemsList) cartItemsList.innerHTML = '';
    if (cartEmptyState && cartItemsList) cartItemsList.appendChild(cartEmptyState);
    if (cartEmptyState) cartEmptyState.style.display = 'flex';
    const footerEl = document.getElementById('cartDrawerFooter') || document.getElementById('cartFooter');
    if (footerEl) footerEl.style.opacity = '0.5';
    if (proceedCheckoutBtn) proceedCheckoutBtn.disabled = true;
    const chkBtn = document.getElementById('checkoutBtn');
    if (chkBtn) chkBtn.disabled = true;
  } else {
    if (cartEmptyState) cartEmptyState.style.display = 'none';
    const footerEl = document.getElementById('cartDrawerFooter') || document.getElementById('cartFooter');
    if (footerEl) footerEl.style.opacity = '1';
    if (proceedCheckoutBtn) proceedCheckoutBtn.disabled = false;
    const chkBtn = document.getElementById('checkoutBtn');
    if (chkBtn) chkBtn.disabled = false;`;

    if (appContent.includes(oldEmptyState)) {
      appContent = appContent.replace(oldEmptyState, newEmptyState);
    }

    // 3. Guard cartSubtotal & breakdown
    const oldBreakdown = `  // Breakdown rows
  cartSubtotal.textContent = formatPrice(totals.subtotal);
  if (totals.discount > 0) {
    cartDiscountRow.style.display = 'flex';
    cartDiscountAmount.textContent = \`-\${formatPrice(totals.discount)}\`;
  } else {
    cartDiscountRow.style.display = 'none';
  }
  cartShippingCost.textContent = totals.subtotal >= totals.freeThreshold ? 'Complimentary' : formatPrice(totals.shippingCost);
  cartGrandTotal.textContent = formatPrice(totals.grandTotal);`;

    const newBreakdown = `  // Breakdown rows
  if (cartSubtotal) cartSubtotal.textContent = formatPrice(totals.subtotal);
  const drawerSub = document.getElementById('drawerSubtotal');
  if (drawerSub) drawerSub.textContent = formatPrice(totals.subtotal);
  if (cartDiscountRow && cartDiscountAmount) {
    if (totals.discount > 0) {
      cartDiscountRow.style.display = 'flex';
      cartDiscountAmount.textContent = \`-\${formatPrice(totals.discount)}\`;
    } else {
      cartDiscountRow.style.display = 'none';
    }
  }
  if (cartShippingCost) {
    cartShippingCost.textContent = totals.subtotal >= totals.freeThreshold ? 'Complimentary' : formatPrice(totals.shippingCost);
  }
  if (cartGrandTotal) cartGrandTotal.textContent = formatPrice(totals.grandTotal);`;

    if (appContent.includes(oldBreakdown)) {
      appContent = appContent.replace(oldBreakdown, newBreakdown);
    }

    // 4. Ensure checkout button click listener attaches to both proceedCheckoutBtn and checkoutBtn
    if (!appContent.includes("document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);")) {
      appContent = appContent.replace(
        "proceedCheckoutBtn?.addEventListener('click', openCheckout);",
        "proceedCheckoutBtn?.addEventListener('click', openCheckout);\n  document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);"
      );
    }

    fs.writeFileSync(appPath, appContent, 'utf8');
    console.log('Added defensive guards and checkout triggers to ' + appPath);
  }
});

// Clean up scratch files
['extracted_modals.json', 'scratch_orig_index.html', 'orig_utf8.html'].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

console.log('Restoration complete!');
