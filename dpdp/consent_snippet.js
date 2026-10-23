/**
 * DPDP-ready consent-gated Matomo tracker.
 * No tracking fires until the visitor grants analytics consent.
 *
 * Usage: include this script + Klaro CMP on the client's site.
 * Replace MATOMO_URL and SITE_ID with client values.
 */
(function () {
  var MATOMO_URL = "https://analytics.example.com";
  var SITE_ID = "1";

  var _paq = window._paq = window._paq || [];

  function initMatomo() {
    _paq.push(["requireConsent"]);
    _paq.push(["setTrackerUrl", MATOMO_URL + "/matomo.php"]);
    _paq.push(["setSiteId", SITE_ID]);
    _paq.push(["enableLinkTracking"]);
    _paq.push(["trackPageView"]);

    var d = document, g = d.createElement("script"), s = d.getElementsByTagName("script")[0];
    g.async = true;
    g.src = MATOMO_URL + "/matomo.js";
    s.parentNode.insertBefore(g, s);
  }

  function onConsentGranted() {
    _paq.push(["rememberConsentGiven"]);
    _paq.push(["setConsentGiven"]);
    initMatomo();
  }

  function onConsentDeclined() {
    _paq.push(["forgetConsentGiven"]);
    // No tracker loaded — zero requests to Matomo
  }

  // Klaro CMP integration
  document.addEventListener("klaro:consent-changed", function (e) {
    var consents = e.detail || {};
    if (consents.matomo || consents.analytics) {
      onConsentGranted();
    } else {
      onConsentDeclined();
    }
  });

  // Check existing consent on page load
  if (window.klaro && window.klaro.getManager) {
    var manager = window.klaro.getManager();
    if (manager.confirmed && manager.getConsent("matomo")) {
      onConsentGranted();
    }
  }
})();
