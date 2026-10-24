/**
 * ============================================================================
 * 6. CONFIRMATION RECEIPT COMPONENT
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 12(1)(d): Provides verifiable proof of completion of data erasure.
 * - Confirms: Request Date, Completion Date, Categories Erased, and Ticket ID.
 * ============================================================================
 */

import React from 'react';
import { TRANSLATIONS } from '../i18n/translations';

interface ConfirmationReceiptProps {
  ticketId: string;
  requestDate: string;
  completionDate: string;
  deletedCategories: string[];
  onDone?: () => void;
}

export const ConfirmationReceipt: React.FC<ConfirmationReceiptProps> = ({
  ticketId,
  requestDate,
  completionDate,
  deletedCategories,
  onDone
}) => {
  const t = TRANSLATIONS.en.confirmation;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
      
      {/* Success Badge Header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
          ✓
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">{t.title}</h2>
        <p className="text-xs text-slate-500 mt-1">
          Statutory Audit Certificate under DPDP Act, 2023
        </p>
      </div>

      {/* Structured Receipt Breakdown */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs sm:text-sm space-y-3">
        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80">
          <span className="font-semibold text-slate-500">Statutory Reference Ticket:</span>
          <code className="font-mono font-bold text-slate-900 text-sm">{ticketId}</code>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80">
          <span className="font-semibold text-slate-500">{t.requestDateLabel}</span>
          <span className="font-bold text-slate-900">{new Date(requestDate).toLocaleDateString()}</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/80">
          <span className="font-semibold text-slate-500">{t.targetCompletionLabel}</span>
          <span className="font-bold text-emerald-700">{new Date(completionDate).toLocaleDateString()}</span>
        </div>

        <div className="py-2">
          <span className="font-semibold text-slate-500 block mb-1.5">{t.scopeLabel}</span>
          <div className="flex flex-wrap gap-1.5">
            {deletedCategories.map((cat, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 text-xs font-medium"
              >
                ✓ {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Statutory Notice */}
      <div className="p-3.5 bg-emerald-50/60 rounded-lg text-emerald-900 text-xs leading-relaxed border border-emerald-200">
        <p>{t.analyticsNotice}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors"
        >
          Print Receipt
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="flex-1 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm"
          >
            Done
          </button>
        )}
      </div>

    </div>
  );
};
