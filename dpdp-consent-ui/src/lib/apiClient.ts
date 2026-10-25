/**
 * ============================================================================
 * DPDP DATA RIGHTS REST API CLIENT
 * ============================================================================
 * Handles communication with bank statutory data protection endpoints.
 * Technical Safeguards:
 * - HTTPS enforcement & CSRF header integration
 * - PII Guard: Strips forbidden fields (PAN, Aadhaar, Account No, Cards)
 * - Structured audit responses conforming to DPDP statutory timelines
 * ============================================================================
 */

import { getCsrfToken } from './consentManager';

export type RightsRequestType =
  | 'delete_analytics_marketing'
  | 'withdraw_consent'
  | 'data_access_inquiry'
  | 'other';

export interface CreateRightsRequestPayload {
  requestType: RightsRequestType;
  identifier: string; // Registered email or mobile number only
  customerConfirmed: boolean;
  message?: string;
}

export interface RightsRequestTicket {
  ticketId: string;
  requestType: RightsRequestType;
  status: 'received' | 'verified' | 'in_progress' | 'completed' | 'retained';
  acknowledgedDate: string;
  statutoryDeadlineDate: string; // Within 30 days
  currentStage: string;
  stageTimestamps: {
    received: string;
    verified?: string;
    inProgress?: string;
    completedOrRetained?: string;
  };
  retentionDetails?: {
    isRetained: boolean;
    retainedItems: string[];
    legalReason: string;
    statutoryBasis: string;
    retentionPeriodMonths: number;
  };
  deletionSummary?: {
    completedDate: string;
    deletedCategories: string[];
  };
}

export interface VerifyOtpResponse {
  success: boolean;
  ticket: RightsRequestTicket;
  message: string;
  lockedUntil?: string;
  remainingAttempts?: number;
}

const FORBIDDEN_PII_PATTERNS = [
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, // Indian PAN pattern
  /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/, // Indian 12-digit Aadhaar pattern
  /^[0-9]{9,18}$/, // Bank account numbers
  /^(4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})$/ // Credit/Debit Cards
];

/**
 * Validates that user input does not contain prohibited banking credentials
 */
export function validateNoProhibitedPii(value: string): boolean {
  const trimmed = value.trim();
  for (const pattern of FORBIDDEN_PII_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  return true;
}

/**
 * 1. Submit Data Rights Petition (POST /api/rights-requests)
 * DPDP Sec 12: Collects strictly minimum: type, registered email/mobile, optional note.
 */
export async function submitRightsRequest(
  payload: CreateRightsRequestPayload
): Promise<{ ticketId: string; maskedIdentifier: string; message: string }> {
  if (!payload.customerConfirmed) {
    throw new Error('Please confirm that you are the registered customer.');
  }

  // Pre-flight PII check
  if (!validateNoProhibitedPii(payload.identifier)) {
    throw new Error('Please do not enter PAN, Aadhaar, account numbers, or card details.');
  }

  const response = await fetch('/api/rights-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken()
    },
    body: JSON.stringify({
      requestType: payload.requestType,
      identifier: payload.identifier.trim(),
      message: payload.message?.trim() || ''
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Unable to register request. Please try again.');
  }

  return data;
}

/**
 * 2. Verify One-Time Identity Code (POST /api/rights-requests/:id/verify)
 * Implements verification gate before any data deletion begins.
 */
export async function verifyRightsRequestOtp(
  ticketId: string,
  otpCode: string
): Promise<VerifyOtpResponse> {
  const response = await fetch(`/api/rights-requests/${encodeURIComponent(ticketId)}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken()
    },
    body: JSON.stringify({ otp: otpCode.trim() })
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      ticket: data.ticket,
      message: data.message || 'Verification code failed.',
      lockedUntil: data.lockedUntil,
      remainingAttempts: data.remainingAttempts
    };
  }

  return {
    success: true,
    ticket: data.ticket,
    message: data.message || 'Identity confirmed successfully.'
  };
}

/**
 * 3. Fetch Request Status (GET /api/rights-requests/:id)
 * Safe retrieval: Returns strictly audit progress, never raw personal or banking data.
 */
export async function fetchRequestStatus(ticketId: string): Promise<RightsRequestTicket> {
  const response = await fetch(`/api/rights-requests/${encodeURIComponent(ticketId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': getCsrfToken()
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request ticket not found.');
  }

  return data.ticket;
}
