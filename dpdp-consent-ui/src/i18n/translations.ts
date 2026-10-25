/**
 * ============================================================================
 * DPDP PLAIN LANGUAGE TRANSLATIONS (English & Hindi Scaffold)
 * ============================================================================
 * Meets DPDP Section 6(2) requirement: Plain, comprehensible language without
 * deceptive dark patterns or complex legal jargon.
 * ============================================================================
 */

export interface GrievanceOfficerConfig {
  name: string;
  email: string;
  phone: string;
  address: string;
  dpbiBoardUrl: string;
  timelines: {
    acknowledgmentDays: number; // 7 days
    analyticsDeletionDays: number; // 30 days
    grievanceResolutionDays: number; // 30 days
  };
}

export const GRIEVANCE_OFFICER_CONFIG: GrievanceOfficerConfig = {
  name: 'Shri Rajesh Sharma',
  email: 'grievance.officer@infinitybank.com',
  phone: '+91 (022) 6123-4567',
  address: 'Infinity Bank Tower, C-54 G Block, Bandra Kurla Complex, Mumbai 400051, Maharashtra, India',
  dpbiBoardUrl: 'https://www.meity.gov.in/content/digital-personal-data-protection-act-2023',
  timelines: {
    acknowledgmentDays: 7,
    analyticsDeletionDays: 30,
    grievanceResolutionDays: 30
  }
};

export const TRANSLATIONS = {
  en: {
    // 1. Consent Banner
    banner: {
      title: 'Your Privacy Choices (DPDP Act, 2023)',
      description:
        'We use analytics cookies to measure page visits and improve our banking services. We do not track your financial transactions or identity. You have the right to accept or reject analytics at any time.',
      privacyNoticeLink: 'Read our Privacy Notice',
      acceptAnalytics: 'Accept analytics',
      rejectAnalytics: 'Reject analytics',
      ariaLabel: 'Privacy Consent Banner'
    },

    // 2. Manage Preferences
    preferences: {
      footerLink: 'Manage privacy preferences',
      panelTitle: 'Manage Privacy Preferences',
      panelSubtitle:
        'In compliance with India’s Digital Personal Data Protection Act, 2023, you can turn analytics on or off whenever you choose.',
      statusLabel: 'Analytics Tracking Status:',
      statusOn: 'Active (Consent Given)',
      statusOff: 'Inactive (No Tracking)',
      toggleLabel: 'Allow Analytics Cookies (GA4 & Matomo)',
      toggleDescription:
        'When enabled, helps us measure website traffic pseudonymously. No names, phone numbers, or bank account numbers are collected.',
      turnOffMessage:
        'Analytics tracking is now off. Your existing analytics data will be deleted within 30 days.',
      closePanel: 'Close',
      saveAndClose: 'Save Preferences'
    },

    // 3. Data Rights Page
    requests: {
      pageTitle: 'Exercise Your Data Rights',
      pageSubtitle:
        'Under Section 12 of the DPDP Act, 2023, you have full authority to request data erasure, withdraw consent, or inquire about data retained by the bank.',
      selectRequestType: 'Select Request Type',
      types: {
        delete_analytics_marketing: 'Delete my analytics and marketing data',
        withdraw_consent: 'Withdraw consent for non-essential services',
        data_access_inquiry: 'Ask about personal data processed by the bank',
        other: 'Other statutory privacy grievance'
      },
      identifierLabel: 'Registered Mobile Number or Email Address',
      identifierPlaceholder: 'e.g. +91 98765 43210 or client@domain.com',
      identifierHint:
        'We will only send a one-time verification code to your registered contact. Never enter your PAN, Aadhaar, account number, or debit card PIN.',
      optionalMessageLabel: 'Specific Instructions or Comments (Optional)',
      optionalMessagePlaceholder: 'Add any specific queries or instructions regarding your request...',
      confirmationCheckbox: 'I confirm I am the registered customer.',
      submitButton: 'Submit Request & Receive One-Time Code',
      submitting: 'Submitting Request...',
      warningNotice:
        'Important Security Rule: Never share passwords, OTPs, CVV, or Aadhaar numbers on this form. Bank representatives will never solicit sensitive credentials.'
    },

    // 4. Verification Step
    verification: {
      title: 'Verify Your Identity',
      subtitle:
        'For your security, we have dispatched a 6-digit one-time code (OTP) to your registered contact.',
      otpLabel: 'Enter 6-Digit Code',
      verifyButton: 'Verify & Confirm Request',
      verifying: 'Verifying...',
      failedAttemptsWarning: 'Remaining attempts:',
      lockedMessage:
        'Too many failed attempts. For your security, this verification is locked. Please try again after:',
      lockoutTimer: 'minutes'
    },

    // 5. Request Status Page
    status: {
      pageTitle: 'Data Rights Request Status',
      ticketLabel: 'Ticket ID:',
      acknowledgedNotice: 'Acknowledged within 7 days. Resolution target: 30 days.',
      stages: {
        received: 'Received',
        verified: 'Identity Verified',
        in_progress: 'In Progress',
        completed_or_retained: 'Completed / Retained'
      },
      retentionNoticeHeader: 'Statutory Retention Disclosure (Data Retained by Law)',
      retentionExplanation:
        'Under Section 12(3) of the DPDP Act, the right to erasure does not override obligations mandated by statutory financial authorities.',
      retainedItemsLabel: 'Items Legally Retained:',
      legalReasonLabel: 'Statutory Requirement:',
      periodLabel: 'Mandatory Retention Window:'
    },

    // 6. Confirmation
    confirmation: {
      title: 'Data Rights Request Registered',
      requestDateLabel: 'Date Received:',
      targetCompletionLabel: 'Expected Completion Date:',
      scopeLabel: 'Categories Scheduled for Erasure:',
      analyticsNotice:
        'Analytics identifiers and browsing telemetry are queued for complete purging within 30 days.'
    },

    // 7. Grievance & Complaints
    grievance: {
      title: 'Statutory Grievance Redressal (Section 13, DPDP Act)',
      officerTitle: 'Data Protection & Grievance Officer',
      timelinesSummary:
        'Published Response Timelines: We acknowledge every grievance within 7 days and provide a final resolution within 30 days.',
      contactHeader: 'Contact the Grievance Officer:',
      escalationTitle: 'Escalation to Data Protection Board of India (DPBI)',
      escalationText:
        'If your grievance is not resolved to your satisfaction within 30 days, you retain the statutory right under Section 13(3) to file a formal complaint with the Data Protection Board of India.',
      dpbiButton: 'Visit DPBI Official Redressal Portal'
    }
  },

  // Structural scaffold for Hindi localization (DPDP Section 6(2) multilingual requirement)
  hi: {
    banner: {
      title: 'आपकी गोपनीयता प्राथमिकताएं (डीपीडीपी अधिनियम, 2023)',
      description:
        'हम वेबसाइट के उपयोग को समझने के लिए एनालिटिक्स का उपयोग करते हैं। आपके वित्तीय लेन-देन या व्यक्तिगत पहचान को ट्रैक नहीं किया जाता है।',
      privacyNoticeLink: 'गोपनीयता सूचना पढ़ें',
      acceptAnalytics: 'एनालिटिक्स स्वीकार करें',
      rejectAnalytics: 'एनालिटिक्स अस्वीकार करें',
      ariaLabel: 'गोपनीयता सहमति बैनर'
    }
  }
};
