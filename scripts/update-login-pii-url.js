const fs = require('fs');
const path = require('path');

console.log('Updating app.js with login URL query parameter and dataLayer user tracking...');

const targetDirs = ['.', 'Matomo ecomm Web', 'demo/infinity-shop'];

targetDirs.forEach(dir => {
  const appPath = path.join(dir, 'app.js');
  if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, 'utf8');

    // Update handleFormFieldInteraction to attach user_id and user_email to login interaction and URL
    const oldInteraction = `  // 2. Trigger form_interaction
  const interactionPayload = {
    event: 'form_interaction',
    form_name: formName,
    form_id: formName === 'apply_loan' ? 'applyLoanForm' : (formName === 'open_savings' ? 'openSavingsForm' : 'customerLoginForm'),
    field_name: fieldName,
    interaction_type: interactionType,
    timestamp: new Date().toISOString()
  };`;

    const newInteraction = `  // 2. Trigger form_interaction
  const interactionPayload = {
    event: 'form_interaction',
    form_name: formName,
    form_id: formName === 'apply_loan' ? 'applyLoanForm' : (formName === 'open_savings' ? 'openSavingsForm' : 'customerLoginForm'),
    field_name: fieldName,
    interaction_type: interactionType,
    timestamp: new Date().toISOString()
  };

  // If customer login, attach user details to interaction and URL
  if (formName === 'customer_login') {
    const enteredUser = document.getElementById('loginCustomerId')?.value.trim();
    if (enteredUser) {
      interactionPayload.user_id = enteredUser;
      interactionPayload.user_email = enteredUser.includes('@') ? enteredUser : enteredUser + '@infinitybank.com';
      try {
        if (typeof window !== 'undefined' && window.location) {
          const url = new URL(window.location.href);
          url.searchParams.set('user_id', enteredUser);
          url.searchParams.set('user_email', interactionPayload.user_email);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    }
  }`;

    if (content.includes(oldInteraction)) {
      content = content.replace(oldInteraction, newInteraction);
    }

    // Update submitLoginForm to push user details to URL and GA4 / Matomo dataLayers
    const oldSubmitLogin = `window.submitLoginForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const customerId = document.getElementById('loginCustomerId')?.value.trim() || 'INF-984210';
  const formEl = document.getElementById('customerLoginForm');
  const successBox = document.getElementById('loginSuccessBox');

  if (formEl) formEl.style.display = 'none';
  if (successBox) successBox.style.display = 'block';

  const ga4Payload = {
    event: 'login',
    method: 'netbanking_credentials',
    form_name: 'customer_login',
    form_id: 'customerLoginForm',
    timestamp: new Date().toISOString()
  };`;

    const newSubmitLogin = `window.submitLoginForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const customerId = document.getElementById('loginCustomerId')?.value.trim() || 'INF-984210';
  const customerEmail = customerId.includes('@') ? customerId : customerId + '@infinitybank.com';
  const formEl = document.getElementById('customerLoginForm');
  const successBox = document.getElementById('loginSuccessBox');

  if (formEl) formEl.style.display = 'none';
  if (successBox) successBox.style.display = 'block';

  // Update URL query string with login user identifier
  try {
    if (typeof window !== 'undefined' && window.location) {
      const url = new URL(window.location.href);
      url.searchParams.set('user_id', customerId);
      url.searchParams.set('user_email', customerEmail);
      window.history.replaceState({}, '', url.toString());
    }
  } catch (err) {}

  const ga4Payload = {
    event: 'login',
    method: 'netbanking_credentials',
    form_name: 'customer_login',
    form_id: 'customerLoginForm',
    user_id: customerId,
    user_email: customerEmail,
    timestamp: new Date().toISOString()
  };`;

    if (content.includes(oldSubmitLogin)) {
      content = content.replace(oldSubmitLogin, newSubmitLogin);
    }

    // Ensure login_submit also includes user_id & user_email
    content = content.replace(
      `    event: 'login_submit',
    form_name: 'customer_login',
    form_id: 'customerLoginForm',
    login_status: 'success'`,
      `    event: 'login_submit',
    form_name: 'customer_login',
    form_id: 'customerLoginForm',
    user_id: customerId,
    user_email: customerEmail,
    login_status: 'success'`
    );

    // Ensure Matomo also tracks user_id and login event
    content = content.replace(
      `    window._paq.push(['trackEvent', 'BFSI_Auth', 'login_submit', 'netbanking_credentials']);`,
      `    window._paq.push(['setUserId', customerId]);
    window._paq.push(['trackEvent', 'BFSI_Auth', 'login_submit', customerId]);`
    );

    fs.writeFileSync(appPath, content, 'utf8');
    console.log('Updated login URL and dataLayer in ' + appPath);
  }
});

console.log('All updates complete.');
