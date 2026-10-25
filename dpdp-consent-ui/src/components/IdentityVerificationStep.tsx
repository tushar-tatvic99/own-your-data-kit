/**
 * ============================================================================
 * 4. IDENTITY VERIFICATION STEP COMPONENT
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 12(1): A Data Fiduciary must verify the identity of the Data Principal
 *   before honoring erasure, access, or withdrawal petitions to prevent fraud.
 * - Rate Limiting & Lockout: Locks attempt after 5 sequential failures and displays
 *   a live countdown timer.
 * - Deletion processes remain BLOCKED until positive OTP verification.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { verifyRightsRequestOtp } from '../lib/apiClient';
import { TRANSLATIONS } from '../i18n/translations';

interface IdentityVerificationStepProps {
  ticketId: string;
  maskedIdentifier: string;
  onVerified: (ticketId: string) => void;
  onCancel?: () => void;
}

export const IdentityVerificationStep: React.FC<IdentityVerificationStepProps> = ({
  ticketId,
  maskedIdentifier,
  onVerified,
  onCancel
}) => {
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedUntilSeconds, setLockedUntilSeconds] = useState<number | null>(null);

  const t = TRANSLATIONS.en.verification;

  // Countdown timer for lockout
  useEffect(() => {
    if (lockedUntilSeconds === null || lockedUntilSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockedUntilSeconds((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntilSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntilSeconds !== null && lockedUntilSeconds > 0) return;

    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit one-time verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await verifyRightsRequestOtp(ticketId, otp.trim());
      if (result.success) {
        onVerified(ticketId);
      } else {
        setErrorMessage(result.message);
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
        if (result.lockedUntil) {
          const lockMs = new Date(result.lockedUntil).getTime() - Date.now();
          setLockedUntilSeconds(Math.max(1, Math.ceil(lockMs / 1000)));
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = lockedUntilSeconds !== null && lockedUntilSeconds > 0;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">
            🔐
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t.title}</h2>
          <p className="text-xs text-slate-500 mt-1">Ticket Reference: <code className="font-mono font-bold text-slate-800">{ticketId}</code></p>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            {t.subtitle} <strong>{maskedIdentifier}</strong>.
          </p>
        </div>

        {/* Lockout Notice */}
        {isLocked ? (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm"
          >
            <strong className="block font-bold mb-1">Account Protected</strong>
            {t.lockedMessage}{' '}
            <span className="font-mono font-bold text-red-700">
              {Math.floor(lockedUntilSeconds / 60)}m {lockedUntilSeconds % 60}s
            </span>
          </div>
        ) : null}

        {/* Error Alert */}
        {errorMessage && !isLocked && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between"
          >
            <span>{errorMessage}</span>
            {remainingAttempts !== null && (
              <span className="font-bold text-amber-800">
                {t.failedAttemptsWarning} {remainingAttempts}
              </span>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="otp-input" className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
              {t.otpLabel}
            </label>
            <input
              type="text"
              id="otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
              disabled={isLocked || isSubmitting}
              placeholder="123456"
              maxLength={6}
              autoComplete="one-time-code"
              className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold px-4 py-3 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 disabled:bg-slate-100"
              required
            />
            <p className="text-[11px] text-slate-400 text-center mt-1.5">
              Code expires in 10 minutes. Mock OTP for test: <code className="font-bold text-slate-700">123456</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={isLocked || isSubmitting}
            className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? t.verifying : t.verifyButton}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel and Return
            </button>
          )}
        </form>

      </div>
    </div>
  );
};
