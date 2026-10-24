/**
 * ============================================================================
 * 3. DATA RIGHTS REQUEST PAGE COMPONENT (/privacy/requests)
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 12(1): Rights of Data Principal (Right to access, right to correction
 *   and erasure of personal data).
 * - Section 8(5): Data Minimization Obligation — Strictly collects the MINIMUM
 *   contact info necessary to verify the registered account.
 * - Prohibition: NEVER solicits PAN, Aadhaar, Bank Account, or Card details.
 * - Customer verification checkbox is NOT pre-checked.
 * ============================================================================
 */

import React, { useState } from 'react';
import { submitRightsRequest, RightsRequestType, validateNoProhibitedPii } from '../lib/apiClient';
import { TRANSLATIONS } from '../i18n/translations';

interface DataRightsRequestPageProps {
  onSuccess: (ticketId: string, maskedIdentifier: string) => void;
}

export const DataRightsRequestPage: React.FC<DataRightsRequestPageProps> = ({ onSuccess }) => {
  const [requestType, setRequestType] = useState<RightsRequestType>('delete_analytics_marketing');
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = TRANSLATIONS.en.requests;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered mobile number or email address.');
      return;
    }

    if (!validateNoProhibitedPii(identifier) || !validateNoProhibitedPii(message)) {
      setErrorMessage('Security Alert: Please do NOT enter PAN, Aadhaar, bank account, or card numbers.');
      return;
    }

    if (!customerConfirmed) {
      setErrorMessage('Please confirm that you are the registered customer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitRightsRequest({
        requestType,
        identifier: identifier.trim(),
        customerConfirmed,
        message: message.trim()
      });
      onSuccess(result.ticketId, result.maskedIdentifier);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      
      {/* Page Title & Legal Context */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 mb-3">
          DPDP Act, 2023 • Section 12 Statutory Rights
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t.pageTitle}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t.pageSubtitle}
        </p>
      </div>

      {/* Main Request Form */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-10">
        
        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 animate-fade-in"
          >
            <span className="text-lg">⚠️</span>
            <p className="font-medium text-xs sm:text-sm">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Request Type */}
          <div>
            <label htmlFor="request-type" className="block text-sm font-bold text-slate-900 mb-2">
              {t.selectRequestType} *
            </label>
            <select
              id="request-type"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as RightsRequestType)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors cursor-pointer"
              required
            >
              <option value="delete_analytics_marketing">
                {t.types.delete_analytics_marketing}
              </option>
              <option value="withdraw_consent">
                {t.types.withdraw_consent}
              </option>
              <option value="data_access_inquiry">
                {t.types.data_access_inquiry}
              </option>
              <option value="other">
                {t.types.other}
              </option>
            </select>
          </div>

          {/* 2. Registered Mobile or Email (Strictly Minimal Identifier) */}
          <div>
            <label htmlFor="customer-identifier" className="block text-sm font-bold text-slate-900 mb-1">
              {t.identifierLabel} *
            </label>
            <input
              type="text"
              id="customer-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t.identifierPlaceholder}
              autoComplete="email tel"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              required
            >
            </input>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              {t.identifierHint}
            </p>
          </div>

          {/* 3. Optional Message */}
          <div>
            <label htmlFor="optional-message" className="block text-sm font-bold text-slate-900 mb-1">
              {t.optionalMessageLabel}
            </label>
            <textarea
              id="optional-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.optionalMessagePlaceholder}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors resize-none"
            />
          </div>

          {/* 4. Customer Confirmation Checkbox (Never Pre-Ticked) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="customer-confirm-check"
                checked={customerConfirmed}
                onChange={(e) => setCustomerConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                required
              />
              <span className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                {t.confirmationCheckbox}
              </span>
            </label>
          </div>

          {/* Security Notice Warning Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200/80">
            <span>🔒</span>
            <p className="leading-tight">{t.warningNotice}</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? t.submitting : t.submitButton}
          </button>

        </form>

      </div>
    </div>
  );
};
