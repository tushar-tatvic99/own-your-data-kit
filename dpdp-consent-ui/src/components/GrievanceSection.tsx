/**
 * ============================================================================
 * 7. GRIEVANCE AND COMPLAINT SECTION COMPONENT
 * ============================================================================
 * DPDP Act 2023 Compliance Notes:
 * - Section 13(1): A Data Principal shall have the right of grievance redressal
 *   provided by the Data Fiduciary.
 * - Section 13(2): The Data Fiduciary shall respond to any grievance within the
 *   period prescribed (acknowledge within 7 days, resolve within 30 days).
 * - Section 13(3): If unresolved within 30 days, right to make a complaint to the
 *   Data Protection Board of India (DPBI).
 * ============================================================================
 */

import React from 'react';
import { GrievanceOfficerConfig, TRANSLATIONS } from '../i18n/translations';

interface GrievanceSectionProps {
  config: GrievanceOfficerConfig;
  ticketId?: string;
}

export const GrievanceSection: React.FC<GrievanceSectionProps> = ({ config, ticketId }) => {
  const t = TRANSLATIONS.en.grievance;

  return (
    <section
      aria-labelledby="grievance-heading"
      className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6"
    >
      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h2 id="grievance-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>🏛️</span>
          <span>{t.title}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t.timelinesSummary}
        </p>
      </div>

      {/* Grievance Officer Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.officerTitle}
            </span>
            <h3 className="text-base font-extrabold text-slate-900">{config.name}</h3>
          </div>
          <span className="text-2xl">👤</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 pt-2 border-t border-slate-200/60">
          <div>
            <strong className="text-slate-900 block font-semibold">Email:</strong>
            <a
              href={`mailto:${config.email}${ticketId ? `?subject=DPDP Grievance regarding ${ticketId}` : ''}`}
              className="text-slate-900 font-medium underline hover:text-slate-600"
            >
              {config.email}
            </a>
          </div>
          <div>
            <strong className="text-slate-900 block font-semibold">Direct Phone:</strong>
            <a href={`tel:${config.phone.replace(/[^0-9+]/g, '')}`} className="text-slate-900 font-medium hover:underline">
              {config.phone}
            </a>
          </div>
          <div className="sm:col-span-2">
            <strong className="text-slate-900 block font-semibold">Physical Address:</strong>
            <p className="text-slate-600">{config.address}</p>
          </div>
        </div>
      </div>

      {/* Escalation Route to Data Protection Board of India */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2.5">
        <h4 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
          <span>⚖️</span>
          <span>{t.escalationTitle}</span>
        </h4>
        <p className="text-xs text-emerald-900/90 leading-relaxed">
          {t.escalationText}
        </p>
        <a
          href={config.dpbiBoardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
        >
          <span>{t.dpbiButton}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>

    </section>
  );
};
