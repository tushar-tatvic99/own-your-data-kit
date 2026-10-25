const fs = require('fs');

const MOBILE_NAV_FUNC = `
// ================= MOBILE NAVIGATION TOGGLE =================
function initMobileNav() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const siteHeader = document.getElementById('siteHeader');
  const mainNavLinks = document.querySelectorAll('#mainNav a, #mobileNavPanel a');

  if (mobileMenuBtn && siteHeader) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      siteHeader.classList.toggle('mobile-nav-open');
    });

    mainNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        siteHeader.classList.remove('mobile-nav-open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!siteHeader.contains(e.target)) {
        siteHeader.classList.remove('mobile-nav-open');
      }
    });
  }
}
`;

['Matomo ecomm Web/app.js', 'demo/infinity-shop/app.js', 'app.js'].forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  if (!code.includes('function initMobileNav()')) {
    code = code.replace('function initApp()', MOBILE_NAV_FUNC + '\nfunction initApp()');
    fs.writeFileSync(f, code, 'utf8');
    console.log(`Restored initMobileNav in ${f}`);
  }
});
