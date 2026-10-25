# India DPDP Act, 2023 Compliant Consent & Data Rights Portal

A production-grade, accessible privacy consent management and statutory data rights UI engineered for institutional banking environments. Fully complies with India's **Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)**.

---

## 🏛️ Statutory Compliance Overview

| Section of DPDP Act, 2023 | Statutory Requirement | Implementation in this Portal |
| :--- | :--- | :--- |
| **Section 4(1)** | Lawful Purpose & Valid Consent | Gated telemetry: GA4 and Matomo remain halted until affirmative user action. |
| **Section 6(1)** | Unambiguous & Symmetrical Consent | Anti-Dark Pattern: "Accept" and "Reject" buttons have identical visual prominence. |
| **Section 6(2)** | Notice Accompanying Consent Request | Plain language consent notice with links to banking privacy policy. |
| **Section 6(4)** | Ease of Consent Withdrawal | Persistent "Manage privacy preferences" footer link; instant one-click revocation. |
| **Section 8(5)** | Purpose Limitation & Data Minimization | No PAN, Aadhaar, account numbers, or card credentials collected on forms. |
| **Section 12(1)** | Right to Access & Right to Erasure | Multi-type data rights petition form (`/privacy/requests`) with identity verification. |
| **Section 12(3)** | Statutory Retention Exemptions | Explicit disclosure of CGST/RBI accounting retentions when erasure cannot override tax law. |
| **Section 13(1)-(3)**| Grievance Redressal & DPBI Escalation | Dedicated Grievance Officer desk; 7-day acknowledgment, 30-day resolution, and DPBI escalation portal link. |

---

## 📦 Directory Structure

```text
dpdp-consent-ui/
├── package.json               # React 18, TypeScript, Tailwind CSS configuration
├── tsconfig.json              # Strict TypeScript compiler options
├── tailwind.config.js         # Accessible WCAG 2.1 AA slate & emerald design tokens
├── README.md                  # Implementation guide & legal review checklist
└── src/
    ├── main.tsx               # Application mount point
    ├── App.tsx                # Central router, layout, and header/footer
    ├── index.css              # Tailwind base, utilities, and smooth animations
    ├── lib/
    │   ├── consentManager.ts  # GA4 Consent Mode v2 & Matomo wrapper (zero PII)
    │   └── apiClient.ts       # Secure REST client with CSRF & PII guards
    ├── i18n/
    │   └── translations.ts    # Plain-language English & Hindi translations + Officer config
    └── components/
        ├── ConsentBanner.tsx             # Component 1: Equal-prominence consent banner
        ├── ManagePreferencesModal.tsx    # Component 2: Instant toggle & 30-day purge notice
        ├── DataRightsRequestPage.tsx     # Component 3: Minimalist rights petition (/privacy/requests)
        ├── IdentityVerificationStep.tsx  # Component 4: 5-attempt rate-limited OTP verification
        ├── RequestStatusPage.tsx         # Component 5: 4-stage audit status (/privacy/requests/:id)
        ├── ConfirmationReceipt.tsx       # Component 6: Verifiable erasure audit certificate
        └── GrievanceSection.tsx          # Component 7: Grievance Officer details & DPBI route
```

---

## 🛠️ Setup & Integration

### 1. Standalone React Development
```bash
cd dpdp-consent-ui
npm install
npm run dev
```

### 2. Integration with Existing Backend
The backend REST endpoints are natively scaffolded in `server.js`:
* `POST /api/consent` — Persists user consent record without logging PII.
* `POST /api/rights-requests` — Generates a statutory ticket (e.g., `DR-XXXXXX`) and acknowledges within 7 days.
* `POST /api/rights-requests/:id/verify` — Validates the 6-digit OTP with a 5-failure lockout timer.
* `GET /api/rights-requests/:id` — Returns audit progress and statutory retention details.

---

## ✏️ Placeholders to Fill In

Before production deployment, replace the following placeholders in [`src/i18n/translations.ts`](file:///c:/Users/DhruviParekh/Documents/Hackathon%20Website%20ecom/dpdp-consent-ui/src/i18n/translations.ts):

```typescript
export const GRIEVANCE_OFFICER_CONFIG = {
  name: '[Name of Grievance Officer]',          // e.g. "Shri Rajesh Sharma"
  email: '[email@yourbank.com]',                // e.g. "grievance.officer@infinitybank.com"
  phone: '[+91 Phone Number]',                 // e.g. "+91 (022) 6123-4567"
  address: '[Registered Bank Office Address]',  // e.g. "Tower 1, BKC, Mumbai 400051"
  dpbiBoardUrl: 'https://www.meity.gov.in/...', // Link to official DPBI portal
  timelines: {
    acknowledgmentDays: 7,                     // Statutory acknowledgment SLA
    analyticsDeletionDays: 30,                 // Analytics purging timeline
    grievanceResolutionDays: 30                // Final resolution SLA
  }
};
```

---

## ⚖️ Items Requiring Legal & Compliance Review

Before going live in an Indian scheduled commercial banking or NBFC environment, submit the following items to your Bank's **Legal & Regulatory Compliance Team**:

1. **Notice Versioning & Granularity:**
   * Review `CURRENT_NOTICE_VERSION = '2023.v1_dpdp'` in `consentManager.ts`. Confirm whether legal mandates storing the SHA-256 hash of the exact privacy notice displayed at consent time.
2. **Statutory Retention Periods (Section 12(3)):**
   * Validate the **72-month (6-year)** retention period under Section 36 of the CGST Act, 2017.
   * Verify RBI Master Direction on Know Your Customer (KYC) records retention (PMLA Section 12 mandates 5 years from date of transaction or cessation of relationship).
3. **SMS / Email OTP Delivery Mechanism:**
   * Replace the demonstration mock OTP (`123456`) in `server.js` with your bank's licensed Indian SMS gateway (DLT-registered template approved under TRAI guidelines).
4. **Data Protection Board of India (DPBI) URL:**
   * Once MeitY issues the operational notification for the DPBI online portal, update `dpbiBoardUrl` with the official link.
5. **Cross-Border Telemetry Restrictions:**
   * Confirm that GA4 data servers or Matomo self-hosted instances do not violate any blacklisted jurisdictions designated by the Central Government under Section 16 of the DPDP Act.
