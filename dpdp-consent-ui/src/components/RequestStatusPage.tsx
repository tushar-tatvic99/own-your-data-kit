/**
 * ============================================================================
 * 5. REQUEST STATUS PAGE COMPONENT (/privacy/requests/:ticketId)
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 12(3): Statutory Retention Exemption Disclosure.
 *   Explicitly details what is legally kept (e.g. Tax Invoices under CGST Act
 *   Sec 36, RBI AML records), the statutory justification, and retention period.
 * - Anti-Data Leakage Rule: NEVER displays account numbers, transactions, PAN,
 *   Aadhaar, or customer identifiers on status pages.
 * - Redressal Route: Direct embedded escalation paths to Grievance Officer and DPBI.
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { fetchRequestStatus, RightsRequestTicket } from '../lib/apiClient';
import { TRANSLATIONS, GRIEVANCE_OFFICER_CONFIG } from '../i18n/translations';
import { GrievanceSection } from './GrievanceSection';

interface RequestStatusPageProps {
  ticketId: string;
  onBackToPortal?: () => void;
}

export const RequestStatusPage: React.FC<RequestStatusPageProps> = ({
  ticketId,
  onBackToPortal
}) => {
  const [ticket, setTicket] = useState<RightsRequestTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS.en.status;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchRequestStatus(ticketId)
      .then((data) => {
        if (isMounted) setTicket(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Unable to retrieve ticket status.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Retrieving statutory audit status...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-900">
          <span className="text-3xl block mb-2">⚠️</span>
          <h2 className="text-lg font-bold">Ticket Not Located</h2>
          <p className="text-xs sm:text-sm text-red-700 mt-1">{error || 'Invalid Ticket Reference ID.'}</p>
          {onBackToPortal && (
            <button
              onClick={onBackToPortal}
              className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
            >
              Back to Data Rights Center
            </button>
          )}
        </div>
      </div>
    );
  }

  // Stages evaluation
  const stages = [
    { key: 'received', label: t.stages.received, date: ticket.stageTimestamps.received },
    { key: 'verified', label: t.stages.verified, date: ticket.stageTimestamps.verified },
    { key: 'in_progress', label: t.stages.in_progress, date: ticket.stageTimestamps.inProgress },
    {
      key: 'completed_or_retained',
      label: ticket.status === 'retained' ? 'Legally Retained' : t.stages.completed_or_retained,
      date: ticket.stageTimestamps.completedOrRetained
    }
  ];

  const getStageStatus = (stageIndex: number) => {
    const statusOrder: Record<string, number> = {
      received: 0,
      verified: 1,
      in_progress: 2,
      completed: 3,
      retained: 3
    };
    const currentOrder = statusOrder[ticket.status] ?? 0;
    if (stageIndex < currentOrder) return 'completed';
    if (stageIndex === currentOrder) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 space-y-8">
      
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statutory Petition Status
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {t.ticketLabel} <code className="font-mono text-emerald-700">{ticket.ticketId}</code>
            </h1>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
            {ticket.status.replace('_', ' ')}
          </div>
        </div>

        {/* Timelines notice */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 mb-8 border border-slate-200/60">
          <span>⏱️</span>
          <span>
            {t.acknowledgedNotice} Statutory deadline: <strong>{new Date(ticket.statutoryDeadlineDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
          </span>
        </div>

        {/* 4-Stage Visual Progress Stepper */}
        <div className="relative">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stages.map((stg, idx) => {
              const state = getStageStatus(idx);
              return (
                <div key={stg.key} className="flex flex-col items-center text-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                      state === 'completed'
                        ? 'bg-slate-900 text-white'
                        : state === 'current'
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {state === 'completed' ? '✓' : idx + 1}
                  </div>
                  <strong className="text-xs font-bold text-slate-900 leading-tight">
                    {stg.label}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-1">
                    {stg.date ? new Date(stg.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Statutory Retention Disclosure (If Data is Retained under Sec 12(3)) */}
      {ticket.retentionDetails?.isRetained && (
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm sm:text-base">
            <span className="text-xl">⚖️</span>
            <h3>{t.retentionNoticeHeader}</h3>
          </div>

          <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
            {t.retentionExplanation}
          </p>

          <div className="bg-white/80 rounded-xl p-4 border border-amber-200 space-y-3 text-xs sm:text-sm">
            <div>
              <span className="font-bold text-slate-800 block mb-1">{t.retainedItemsLabel}</span>
              <ul className="list-disc pl-5 text-slate-700 space-y-1">
                {ticket.retentionDetails.retainedItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="font-bold text-slate-800 block">{t.legalReasonLabel}</span>
              <p className="text-slate-700">{ticket.retentionDetails.legalReason}</p>
              <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 block mt-1">
                Statutory Basis: {ticket.retentionDetails.statutoryBasis}
              </code>
            </div>

            <div>
              <span className="font-bold text-slate-800 block">{t.periodLabel}</span>
              <p className="text-slate-700">
                {ticket.retentionDetails.retentionPeriodMonths} Months (6 Years from end of financial year)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Details if Completed */}
      {ticket.status === 'completed' && ticket.deletionSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-950 space-y-2">
          <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
            <span>✨</span> Statutory Erasure Completed
          </h3>
          <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
            All analytics identifiers, marketing consent tokens, and non-statutory records were securely destroyed on{' '}
            <strong>{new Date(ticket.deletionSummary.completedDate).toLocaleDateString()}</strong>.
          </p>
          <div className="mt-2 text-xs text-emerald-800">
            <strong>Categories Purged:</strong> {ticket.deletionSummary.deletedCategories.join(', ')}
          </div>
        </div>
      )}

      {/* Section 7 Grievance & Complaints Component */}
      <GrievanceSection config={GRIEVANCE_OFFICER_CONFIG} ticketId={ticket.ticketId} />

      {/* Back button */}
      {onBackToPortal && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onBackToPortal}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
          >
            ← Return to Privacy Portal
          </button>
        </div>
      )}

    </div>
  );
};
