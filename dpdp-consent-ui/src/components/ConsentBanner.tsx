/**
 * ============================================================================
 * 1. CONSENT BANNER COMPONENT (First Visit)
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 6(1): Consent must be freely given without deceptive design patterns.
 * - Anti-Dark Pattern Guarantee: "Accept analytics" and "Reject analytics"
 *   buttons possess IDENTICAL height, width, font-weight, and color contrast.
 * - Neither choice is pre-selected or pre-ticked.
 * - GA4 & Matomo do NOT load or log telemetry until "Accept" is explicitly clicked.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { acceptAnalytics, rejectAnalytics, getStoredConsent } from '../lib/consentManager';
import { TRANSLATIONS } from '../i18n/translations';

interface ConsentBannerProps {
  onConsentChange?: (granted: boolean) => void;
  onOpenPrivacyNotice?: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  onConsentChange,
  onOpenPrivacyNotice
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const t = TRANSLATIONS.en.banner;

  useEffect(() => {
    // Only display banner if no consent choice has been recorded yet
    const existing = getStoredConsent();
    if (!existing) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await acceptAnalytics();
      setIsVisible(false);
      onConsentChange?.(true);
    } catch (err) {
      console.error('[ConsentBanner] Failed to register acceptance:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await rejectAnalytics();
      setIsVisible(false);
      onConsentChange?.(false);
    } catch (err) {
      console.error('[ConsentBanner] Failed to register rejection:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label={t.ariaLabel}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-2xl p-4 sm:p-6 transition-all duration-300 animate-slide-up"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
        
        {/* Banner Text Content */}
        <div className="flex-1 pr-0 lg:pr-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {t.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.description}{' '}
            <button
              type="button"
              onClick={onOpenPrivacyNotice}
              className="text-slate-900 underline font-semibold hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded"
            >
              {t.privacyNoticeLink}
            </button>
          </p>
        </div>

        {/* Buttons with EQUAL Size, Weight, and Prominence (No Dark Patterns) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Button 1: Reject Analytics */}
          <button
            type="button"
            onClick={handleReject}
            disabled={isProcessing}
            className="w-full sm:w-44 h-11 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg border border-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 text-center"
            id="dpdp-reject-analytics-btn"
          >
            {t.rejectAnalytics}
          </button>

          {/* Button 2: Accept Analytics (Identical Dimensions and Visual Weight) */}
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            className="w-full sm:w-44 h-11 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg border border-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 text-center"
            id="dpdp-accept-analytics-btn"
          >
            {t.acceptAnalytics}
          </button>
        </div>

      </div>
    </aside>
  );
};
