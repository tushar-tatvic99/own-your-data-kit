/**
 * ============================================================================
 * DPDP PRIVACY & DATA RIGHTS APPLICATION (Main Router & Layout)
 * ============================================================================
 * Coordinates:
 * - Consent Mode v2 & Matomo Gating on initial page load
 * - Consent Banner & Preference Panel with Section 6 compliance
 * - Statutory Data Rights Navigation (/privacy/requests, /privacy/requests/:ticketId)
 * - WCAG 2.1 AA Accessibility Compliant Navigation
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { initializeDefaultConsent, getStoredConsent } from './lib/consentManager';
import { ConsentBanner } from './components/ConsentBanner';
import { ManagePreferencesModal, ManagePreferencesFooterLink } from './components/ManagePreferencesModal';
import { DataRightsRequestPage } from './components/DataRightsRequestPage';
import { IdentityVerificationStep } from './components/IdentityVerificationStep';
import { RequestStatusPage } from './components/RequestStatusPage';
import { GrievanceSection } from './components/GrievanceSection';
import { GRIEVANCE_OFFICER_CONFIG } from './i18n/translations';

type ViewMode = 'portal' | 'request_form' | 'verify_otp' | 'view_status';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('portal');
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string>('DR-849201');
  const [maskedIdentifier, setMaskedIdentifier] = useState<string>('+91 ••••• ••210');
  const [searchTicketInput, setSearchTicketInput] = useState<string>('');

  useEffect(() => {
    // 1. Initialize GA4 Consent Mode v2 default (denied) and requireConsent in Matomo
    initializeDefaultConsent();

    // 2. Parse URL path if user visited /privacy/requests or /privacy/requests/:ticketId
    const pathname = window.location.pathname;
    if (pathname.includes('/privacy/requests/')) {
      const parts = pathname.split('/privacy/requests/');
      if (parts[1]) {
        setActiveTicketId(parts[1]);
        setCurrentView('view_status');
      }
    } else if (pathname.includes('/privacy/requests')) {
      setCurrentView('request_form');
    }
  }, []);

  const handleRequestCreated = (ticketId: string, maskedContact: string) => {
    setActiveTicketId(ticketId);
    setMaskedIdentifier(maskedContact);
    setCurrentView('verify_otp');
  };

  const handleOtpVerified = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setCurrentView('view_status');
    // Update browser URL without page reload
    window.history.pushState({}, '', `/privacy/requests/${ticketId}`);
  };

  const handleTrackTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicketInput.trim()) return;
    setActiveTicketId(searchTicketInput.trim().toUpperCase());
    setCurrentView('view_status');
    window.history.pushState({}, '', `/privacy/requests/${searchTicketInput.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
      
      {/* Top Banking Compliance Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setCurrentView('portal');
              window.history.pushState({}, '', '/');
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-slate-900 rounded p-1"
          >
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center">
              ⬡
            </span>
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-wide block leading-none">
                INFINITY BANK
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mt-0.5">
                Statutory Privacy &amp; Data Rights
              </span>
            </div>
          </button>

          <nav className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrentView('request_form');
                window.history.pushState({}, '', '/privacy/requests');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              Submit Rights Petition
            </button>
            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              Cookie Choices
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Router */}
      <main className="flex-1">
        
        {/* VIEW 1: Portal Overview & Ticket Lookup */}
        {currentView === 'portal' && (
          <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-12">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                DPDP Act, 2023 Compliant Architecture
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Digital Privacy &amp; Customer Data Rights
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Empowering customers with complete sovereignty over personal data. Petition for immediate
                erasure, withdraw consent, or track statutory requests in strict compliance with Indian law.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Submit Request */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg mb-4">
                    📝
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Exercise Data Rights (Sec 12)</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                    Petition for complete deletion of analytics telemetry, withdraw consent for marketing,
                    or access personal data categories processed by the bank.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('request_form');
                    window.history.pushState({}, '', '/privacy/requests');
                  }}
                  className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                >
                  Start Data Rights Request →
                </button>
              </div>

              {/* Card 2: Track Existing Ticket */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg mb-4">
                    🔍
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Track Request Status</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                    Check the statutory progress of an existing request. Review audit milestones, verification
                    dates, and legal retention disclosures.
                  </p>
                </div>

                <form onSubmit={handleTrackTicketSubmit} className="mt-6 flex gap-2">
                  <input
                    type="text"
                    value={searchTicketInput}
                    onChange={(e) => setSearchTicketInput(e.target.value)}
                    placeholder="e.g. DR-849201"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Track
                  </button>
                </form>
              </div>

            </div>

            {/* Grievance Officer Section */}
            <GrievanceSection config={GRIEVANCE_OFFICER_CONFIG} />

          </div>
        )}

        {/* VIEW 2: Data Rights Form (/privacy/requests) */}
        {currentView === 'request_form' && (
          <DataRightsRequestPage onSuccess={handleRequestCreated} />
        )}

        {/* VIEW 3: OTP Verification */}
        {currentView === 'verify_otp' && (
          <IdentityVerificationStep
            ticketId={activeTicketId}
            maskedIdentifier={maskedIdentifier}
            onVerified={handleOtpVerified}
            onCancel={() => setCurrentView('request_form')}
          />
        )}

        {/* VIEW 4: Status Page (/privacy/requests/:ticketId) */}
        {currentView === 'view_status' && (
          <RequestStatusPage
            ticketId={activeTicketId}
            onBackToPortal={() => {
              setCurrentView('portal');
              window.history.pushState({}, '', '/');
            }}
          />
        )}

      </main>

      {/* Mandatory Footer with "Manage privacy preferences" on every page */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500">
          <div>
            <strong className="text-slate-800 font-bold block sm:inline">INFINITY BANK</strong>{' '}
            • Regulated under Banking &amp; DPDP Statutory Framework. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            {/* The Mandatory Footer Link */}
            <ManagePreferencesFooterLink onClick={() => setIsPreferencesOpen(true)} />
            <a
              href="#privacy-notice"
              className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      {/* 1. First Visit Consent Banner */}
      <ConsentBanner
        onConsentChange={(granted) => console.log('[DPDP App] Consent changed:', granted)}
        onOpenPrivacyNotice={() => setIsPreferencesOpen(true)}
      />

      {/* 2. Manage Preferences Modal */}
      <ManagePreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

    </div>
  );
};
export default App;
