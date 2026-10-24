/**
 * ============================================================================
 * 2. MANAGE PRIVACY PREFERENCES PANEL & FOOTER COMPONENT
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 6(4): The Data Principal shall have the right to withdraw her consent
 *   at any time, with the ease of doing so being comparable to the ease with
 *   which such consent was given.
 * - Turning the toggle off triggers immediate revocation of tracking tokens and
 *   initiates the statutory 30-day analytics purging queue.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { getStoredConsent, acceptAnalytics, revokeAnalytics } from '../lib/consentManager';
import { TRANSLATIONS } from '../i18n/translations';

interface ManagePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (granted: boolean) => void;
}

export const ManagePreferencesModal: React.FC<ManagePreferencesModalProps> = ({
  isOpen,
  onClose,
  onStatusChange
}) => {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [showRevokedNotice, setShowRevokedNotice] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const t = TRANSLATIONS.en.preferences;

  useEffect(() => {
    const current = getStoredConsent();
    setAnalyticsEnabled(!!current?.analyticsGranted);
    setShowRevokedNotice(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsUpdating(true);
    try {
      if (isChecked) {
        await acceptAnalytics();
        setAnalyticsEnabled(true);
        setShowRevokedNotice(false);
        onStatusChange?.(true);
      } else {
        await revokeAnalytics();
        setAnalyticsEnabled(false);
        setShowRevokedNotice(true);
        onStatusChange?.(false);
      }
    } catch (err) {
      console.error('[Preferences] Failed to update state:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 id="manage-privacy-title" className="text-lg font-bold text-slate-900">
              {t.panelTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              DPDP Act, 2023 Statutory Center
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closePanel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            {t.panelSubtitle}
          </p>

          {/* Revocation Confirmation Alert */}
          {showRevokedNotice && (
            <div
              role="alert"
              className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3 animate-fade-in"
            >
              <span className="text-lg">🛡️</span>
              <div>
                <strong className="block font-semibold">Consent Withdrawn</strong>
                <p className="mt-0.5 text-xs text-amber-800 leading-normal">
                  {t.turnOffMessage}
                </p>
              </div>
            </div>
          )}

          {/* Toggle Control */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex-1 pr-4">
              <label
                htmlFor="analytics-toggle"
                className="text-sm font-semibold text-slate-900 block cursor-pointer"
              >
                {t.toggleLabel}
              </label>
              <p className="text-xs text-slate-500 mt-1">
                {t.toggleDescription}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{t.statusLabel}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    analyticsEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {analyticsEnabled ? t.statusOn : t.statusOff}
                </span>
              </div>
            </div>

            {/* Accessible Toggle Switch */}
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                id="analytics-toggle"
                checked={analyticsEnabled}
                onChange={handleToggle}
                disabled={isUpdating}
                className="sr-only peer"
                aria-describedby="analytics-toggle-desc"
              />
              <div className="w-13 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-slate-900 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
          >
            {t.saveAndClose}
          </button>
        </div>

      </div>
    </div>
  );
};

export const ManagePreferencesFooterLink: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 underline transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 rounded"
      id="manage-privacy-footer-link"
    >
      <span>🛡️</span>
      <span>{TRANSLATIONS.en.preferences.footerLink}</span>
    </button>
  );
};
