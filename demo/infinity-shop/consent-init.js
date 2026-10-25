/**
 * ============================================================================
 * DPDP ACT COMPLIANT CONSENT MANAGEMENT (Vanilla CookieConsent v3)
 * ============================================================================
 * Implements strict opt-in privacy consent for Google Consent Mode v2 & Matomo.
 * - Tracking denied by default
 * - No cookies or analytics fire without affirmative consent
 * - Full user controls for Accept All, Reject All, and Custom Preferences
 * ============================================================================
 */

(function () {
  if (typeof CookieConsent === 'undefined') return;

  CookieConsent.run({
    guiOptions: {
      consentModal: {
        layout: 'box',
        position: 'bottom right',
        equalWeightButtons: true,
        flipButtons: false
      },
      preferencesModal: {
        layout: 'box',
        position: 'right',
        equalWeightButtons: true,
        flipButtons: false
      }
    },

    categories: {
      necessary: {
        enabled: true,
        readOnly: true
      },
      analytics: {
        enabled: false, // DPDP requirement: Default OFF
        autoClear: {
          cookies: [
            { name: /^(_ga|_gid|_gat|_pk_ref|_pk_cvar|_pk_id|_pk_ses)/ }
          ]
        }
      },
      marketing: {
        enabled: false, // DPDP requirement: Default OFF
        autoClear: {
          cookies: [
            { name: /^(_fbp|_gcl_au)/ }
          ]
        }
      }
    },

    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'Your Privacy Matters 🌸',
            description: 'Under the Digital Personal Data Protection (DPDP) Act, we respect your data. We only use analytical and personalized tracking when you grant explicit consent.',
            acceptAllBtn: 'Accept All',
            acceptNecessaryBtn: 'Reject All',
            showPreferencesBtn: 'Preferences',
            footer: '<a href="#privacy" style="text-decoration:underline;">Privacy Notice</a>'
          },
          preferencesModal: {
            title: 'Consent & Privacy Center',
            acceptAllBtn: 'Accept All',
            acceptNecessaryBtn: 'Reject All',
            savePreferencesBtn: 'Save My Choices',
            closeIconLabel: 'Close',
            sections: [
              {
                title: 'Data Collection & DPDP Compliance',
                description: 'You have full autonomy over how your browsing and purchase journey data is processed. You can update or revoke your consent anytime.'
              },
              {
                title: 'Strictly Necessary',
                description: 'Essential for browsing, shopping cart preservation, and bank-grade checkout security.',
                linkedCategory: 'necessary'
              },
              {
                title: 'Analytics & Performance',
                description: 'Allows us to observe site speed and navigation patterns via Matomo & Google Analytics to improve your experience.',
                linkedCategory: 'analytics'
              },
              {
                title: 'Marketing & Personalized Offers',
                description: 'Helps us deliver tailored recommendations and Parisian gift announcements.',
                linkedCategory: 'marketing'
              }
            ]
          }
        }
      }
    },

    onConsent: function ({ cookie }) {
      syncConsentState(cookie.categories);
    },

    onChange: function ({ cookie }) {
      syncConsentState(cookie.categories);
    }
  });

  function syncConsentState(categories) {
    const analyticsGranted = categories.includes('analytics');
    const marketingGranted = categories.includes('marketing');

    // 1. Google Consent Mode v2 Update
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: analyticsGranted ? 'granted' : 'denied',
        ad_storage: marketingGranted ? 'granted' : 'denied',
        ad_user_data: marketingGranted ? 'granted' : 'denied',
        ad_personalization: marketingGranted ? 'granted' : 'denied'
      });
    }

    // Push event to dataLayer for GTM triggers
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_status_update',
      consent_analytics: analyticsGranted ? 'granted' : 'denied',
      consent_marketing: marketingGranted ? 'granted' : 'denied'
    });

    // 2. Matomo Analytics Consent
    window._paq = window._paq || [];
    if (analyticsGranted) {
      window._paq.push(['rememberConsentGiven']);
      if (window.DpdpSubject && typeof window.DpdpSubject.restoreFromStorage === 'function') {
        window.DpdpSubject.restoreFromStorage();
      }
    } else {
      window._paq.push(['forgetConsentGiven']);
    }

    // Log for debugging / HUD
    if (window.MatomoTracker && typeof window.MatomoTracker.logCustomEvent === 'function') {
      window.MatomoTracker.logCustomEvent(
        'Consent',
        analyticsGranted ? 'Consent Granted' : 'Consent Denied',
        categories.join(', ')
      );
    }
  }
})();
