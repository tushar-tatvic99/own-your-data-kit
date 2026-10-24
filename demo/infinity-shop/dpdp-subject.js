/**
 * Stable Matomo User ID from email — must match dpdp/subject_id.py (OYDK kit).
 * Demo: ?dpdp_email=demo@example.com links visits before erasure form submit.
 */
window.DpdpSubject = (function () {
  function analyticsConsented() {
    try {
      if (typeof CookieConsent !== 'undefined' && CookieConsent.acceptedCategory) {
        return CookieConsent.acceptedCategory('analytics');
      }
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  async function subjectUserId(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return '';
    const data = new TextEncoder().encode(normalized);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `dpdp-${hex.slice(0, 24)}`;
  }

  function rememberEmail(email) {
    try {
      localStorage.setItem('dpdp_subject_email', String(email || '').trim().toLowerCase());
    } catch (e) {
      /* ignore */
    }
  }

  async function applyMatomoUserId(email) {
    if (!analyticsConsented()) return '';
    const id = await subjectUserId(email);
    if (!id || !window._paq) return id;
    window._paq.push(['setUserId', id]);
    window._paq.push(['trackPageView']);
    return id;
  }

  async function restoreFromStorage() {
    try {
      const email = localStorage.getItem('dpdp_subject_email');
      if (email) return applyMatomoUserId(email);
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function initFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('dpdp_email');
      if (email) {
        rememberEmail(email);
        const field = document.getElementById('dpdpEmail');
        if (field && !field.value) field.value = email.trim();
      }
    } catch (e) {
      /* ignore */
    }
  }

  function bindEmailField() {
    const field = document.getElementById('dpdpEmail');
    if (!field || field.dataset.dpdpBound) return;
    field.dataset.dpdpBound = '1';
    let timer;
    const sync = async () => {
      const v = field.value.trim();
      if (!v || !v.includes('@')) return;
      rememberEmail(v);
      await applyMatomoUserId(v);
    };
    field.addEventListener('blur', sync);
    field.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(sync, 600);
    });
  }

  initFromQuery();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEmailField);
  } else {
    bindEmailField();
  }

  return { subjectUserId, rememberEmail, applyMatomoUserId, restoreFromStorage, initFromQuery, bindEmailField };
})();
