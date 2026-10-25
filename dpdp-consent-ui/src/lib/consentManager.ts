/**
 * ============================================================================
 * DPDP ACT 2023 COMPLIANT CONSENT MANAGER MODULE
 * ============================================================================
 * Statutory Compliance Reference:
 * - Section 4(1): Grounds for processing personal data (Lawful purpose & Consent)
 * - Section 6(1): Free, specific, informed, unconditional, and unambiguous consent
 * - Section 6(2): Notice requirement accompanying request for consent
 * - Section 6(4): Right to withdraw consent as easily as it was given
 * - Section 8(5): Data minimization & purpose limitation obligations
 * ============================================================================
 */

export interface ConsentRecord {
  analyticsGranted: boolean;
  timestamp: string;
  noticeVersion: string;
  anonymousAnalyticsId: string;
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    _paq?: any[];
    _mtm?: any[];
  }
}

const STORAGE_KEY_CONSENT = 'dpdp_consent_record';
const STORAGE_KEY_ANON_ID = 'dpdp_anonymous_analytics_id';
export const CURRENT_NOTICE_VERSION = '2023.v1_dpdp';

/**
 * Generates or retrieves an internal pseudonymous ID.
 * Strict Rule: Never uses PAN, Aadhaar, phone, email, or account numbers.
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let anonId = localStorage.getItem(STORAGE_KEY_ANON_ID);
  if (!anonId) {
    // Generate UUIDv4 compliant random pseudonymous token
    anonId = 'anon_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(STORAGE_KEY_ANON_ID, anonId);
  }
  return anonId;
}

/**
 * Initializes GA4 Consent Mode v2 with default DENIED state.
 * Implements Section 6(1) of DPDP: Consent must be affirmative; default is non-consent.
 */
export function initializeDefaultConsent(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  // GA4 Consent Mode v2: All storage parameters set to 'denied' prior to affirmative consent
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  // Matomo Tag Manager & Analytics initialization with consent requirement
  window._paq = window._paq || [];
  window._paq.push(['requireConsent']); // Halts all Matomo telemetry until explicit consent
  window._mtm = window._mtm || [];

  const existing = getStoredConsent();
  if (existing && existing.analyticsGranted) {
    applyConsentState(true, false);
  }
}

/**
 * Retrieves previously stored consent choice from local storage
 */
export function getStoredConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_CONSENT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

/**
 * Applies consent to GA4 and Matomo without passing any PII.
 */
function applyConsentState(granted: boolean, shouldNotifyApi = true): void {
  const anonId = getOrCreateAnonymousId();

  if (granted) {
    // 1. Google Analytics 4 Consent Mode v2 Update
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied', // Banking privacy safeguard: advertising storage remains restricted
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      // Attach strictly the pseudonymous ID — NO PII
      window.gtag('set', 'user_properties', {
        anonymous_analytics_id: anonId
      });
    }

    // 2. Matomo Tracking Engine Update
    if (window._paq) {
      window._paq.push(['setConsentGiven']);
      window._paq.push(['rememberConsentGiven']);
      window._paq.push(['setUserId', anonId]); // Strictly pseudonymous ID
    }

    // 3. Matomo Tag Manager
    if (window._mtm) {
      window._mtm.push({
        event: 'dpdp_consent_granted',
        anonymous_analytics_id: anonId
      });
    }

    logConsentAction('CONSENT_GRANTED', anonId);
  } else {
    // 1. Google Analytics 4 Deny
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }

    // 2. Matomo Revocation
    if (window._paq) {
      window._paq.push(['forgetConsentGiven']);
      window._paq.push(['resetUserId']);
    }

    // 3. Matomo Tag Manager
    if (window._mtm) {
      window._mtm.push({
        event: 'dpdp_consent_denied'
      });
    }

    logConsentAction('CONSENT_DENIED', anonId);
  }

  // Persist record locally
  const record: ConsentRecord = {
    analyticsGranted: granted,
    timestamp: new Date().toISOString(),
    noticeVersion: CURRENT_NOTICE_VERSION,
    anonymousAnalyticsId: anonId
  };
  localStorage.setItem(STORAGE_KEY_CONSENT, JSON.stringify(record));

  // Dispatch to statutory backend consent API (NOT to analytics tools)
  if (shouldNotifyApi) {
    sendConsentToBackend(record).catch((err) => {
      console.warn('[ConsentManager] Backend synchronization queued:', err.message);
    });
  }
}

/**
 * Accept Analytics: Called when user taps "Accept analytics"
 */
export async function acceptAnalytics(): Promise<ConsentRecord> {
  applyConsentState(true, true);
  return getStoredConsent()!;
}

/**
 * Reject Analytics: Called when user taps "Reject analytics"
 */
export async function rejectAnalytics(): Promise<ConsentRecord> {
  applyConsentState(false, true);
  return getStoredConsent()!;
}

/**
 * Revoke Analytics: Called from "Manage privacy preferences"
 * Section 6(4) DPDP: Right to withdraw consent with ease.
 */
export async function revokeAnalytics(): Promise<ConsentRecord> {
  applyConsentState(false, true);
  return getStoredConsent()!;
}

/**
 * Dispatches statutory consent payload to POST /api/consent
 * DPDP Compliance: Consent logs stored in regulated backend database, NEVER in third-party trackers.
 */
async function sendConsentToBackend(record: ConsentRecord): Promise<void> {
  try {
    await fetch('/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      body: JSON.stringify({
        choice: record.analyticsGranted ? 'granted' : 'denied',
        timestamp: record.timestamp,
        noticeVersion: record.noticeVersion,
        anonymousAnalyticsId: record.anonymousAnalyticsId
      })
    });
  } catch (error) {
    // Non-blocking for UI
    throw error;
  }
}

/**
 * Retrieves CSRF Token from cookie or meta tag
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return 'csrf-mock-token';
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  return meta?.content || 'csrf-bank-session-token';
}

/**
 * Privacy-safe structured logger.
 * Does NOT log customer names, emails, IPs, account numbers, or transaction amounts.
 */
function logConsentAction(action: string, anonId: string): void {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    action,
    pseudonymousId: anonId.substring(0, 12) + '...',
    compliance: 'DPDP_Act_2023_Sec_6'
  };
  console.info('[DPDP Audit Log]', JSON.stringify(auditEntry));
}
