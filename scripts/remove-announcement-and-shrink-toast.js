const fs = require('fs');

// 1. Remove Announcement Bar from index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
const annRegexIndex = /<!-- Top Announcement Bar -->[\s\S]*?<\/div>\s*<\/div>/;
if (annRegexIndex.test(indexHtml)) {
  indexHtml = indexHtml.replace(annRegexIndex, '<!-- Top Announcement Bar Removed -->');
  fs.writeFileSync('index.html', indexHtml, 'utf8');
  fs.writeFileSync('Matomo ecomm Web/index.html', indexHtml, 'utf8');
  console.log('Removed announcement bar from index.html & Matomo ecomm Web/index.html');
}

// 2. Remove Announcement Bar from bfsi.html
let bfsiHtml = fs.readFileSync('bfsi.html', 'utf8');
const annRegexBfsi = /<!-- Top Announcement Bar -->[\s\S]*?<\/div>\s*<\/div>/;
if (annRegexBfsi.test(bfsiHtml)) {
  bfsiHtml = bfsiHtml.replace(annRegexBfsi, '<!-- Top Announcement Bar Removed -->');
  fs.writeFileSync('bfsi.html', bfsiHtml, 'utf8');
  fs.writeFileSync('Matomo ecomm Web/bfsi.html', bfsiHtml, 'utf8');
  console.log('Removed announcement bar from bfsi.html & Matomo ecomm Web/bfsi.html');
}

// 3. Update showToast in app.js for compact micro-toast
function updateAppJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const toastFuncRegex = /function showToast\(icon, title, message\) {[\s\S]*?toastContainer\.appendChild\(toast\);[\s\S]*?3500\);[\s\S]*?}/;
  
  const newToastFunc = `function showToast(icon, title, message) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = \`
    <span class="toast-icon">\${icon}</span>
    <div class="toast-msg">
      <strong>\${title}</strong>
    </div>
  \`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, 1800);
}`;

  if (toastFuncRegex.test(content)) {
    content = content.replace(toastFuncRegex, newToastFunc);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated showToast function in ${filePath}`);
  }
}

updateAppJs('app.js');
updateAppJs('Matomo ecomm Web/app.js');

// 4. Update styles.css with compact micro-toast styles and hide announcement-bar
const toastMicroCss = `
/* ==========================================================================
   MICRO-TOAST NOTIFICATIONS & SUPPRESSION OF ANNOUNCEMENT BAR
   ========================================================================== */

/* Completely hide announcement bar */
.announcement-bar,
#announcementBar {
  display: none !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  visibility: hidden !important;
}

/* Minimalist Small Micro-Toast Pill */
.toast-container,
#toastContainer {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  z-index: 9999 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  pointer-events: none !important;
}

.toast {
  background: #0F172A !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 9999px !important;
  padding: 6px 14px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: auto !important;
  max-width: fit-content !important;
  width: auto !important;
  pointer-events: auto !important;
  animation: slideInToast 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  transition: opacity 0.25s ease, transform 0.25s ease !important;
}

.toast-icon {
  font-size: 0.85rem !important;
  line-height: 1 !important;
  display: inline-flex !important;
  align-items: center !important;
}

.toast-msg {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.toast-msg strong {
  display: inline !important;
  font-size: 0.76rem !important;
  font-weight: 600 !important;
  color: #FFFFFF !important;
  white-space: nowrap !important;
  line-height: 1 !important;
}

.toast-msg small {
  display: none !important; /* Hide verbose subtitle text for ultra-small clean badge */
}
`;

function updateStyles(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('MICRO-TOAST NOTIFICATIONS & SUPPRESSION')) {
    const idx = content.indexOf('/* MICRO-TOAST NOTIFICATIONS & SUPPRESSION');
    content = content.substring(0, idx);
  }
  content = content + '\n' + toastMicroCss;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated micro-toast styles in ${filePath}`);
}

updateStyles('styles.css');
updateStyles('Matomo ecomm Web/styles.css');
