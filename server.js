const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// In-memory lead database
const BFSI_LEADS = [];
// =========================================================================
// DPDP ACT 2023 IN-MEMORY AUDIT LOGS & DATA RIGHTS DATABASE
// =========================================================================
const DPDP_CONSENT_AUDIT_LOGS = [];
const DPDP_RIGHTS_REQUESTS = new Map();

// Seed demonstration ticket DR-849201
DPDP_RIGHTS_REQUESTS.set('DR-849201', {
  ticketId: 'DR-849201',
  requestType: 'delete_analytics_marketing',
  status: 'retained', // Demonstrates Sec 12(3) Statutory Retention Disclosure
  acknowledgedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
  statutoryDeadlineDate: new Date(Date.now() + 25 * 86400000).toISOString(),
  currentStage: 'Completed / Statutory Retention Notified',
  stageTimestamps: {
    received: new Date(Date.now() - 5 * 86400000).toISOString(),
    verified: new Date(Date.now() - 4 * 86400000).toISOString(),
    inProgress: new Date(Date.now() - 2 * 86400000).toISOString(),
    completedOrRetained: new Date().toISOString()
  },
  retentionDetails: {
    isRetained: true,
    retainedItems: [
      'Statutory GST sales invoices & transaction tax vouchers',
      'RBI anti-money laundering (AML) customer due diligence archive',
      'Active commercial contract fulfillment ledger'
    ],
    legalReason: 'Mandatory financial audit trail & tax law retention requirements.',
    statutoryBasis: 'Section 36, Central Goods and Services Tax (CGST) Act, 2017 & Section 12(3) DPDP Act, 2023.',
    retentionPeriodMonths: 72
  },
  deletionSummary: {
    completedDate: new Date().toISOString(),
    deletedCategories: [
      'Browsing telemetry & analytics tokens',
      'Marketing campaign tracking cookies',
      'Device fingerprint identifiers',
      'Personalization preferences'
    ]
  },
  attempts: 0,
  otp: '123456',
  lockedUntil: null
});

if (DPDP_CONSENT_AUDIT_LOGS.length === 0) {
  const noticeVersion = '2023.v1_dpdp';
  for (let i = 0; i < 24; i++) {
    DPDP_CONSENT_AUDIT_LOGS.push({
      choice: 'granted',
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      noticeVersion,
      anonymousAnalyticsId: `demo-grant-${i}`,
    });
  }
  for (let i = 0; i < 5; i++) {
    DPDP_CONSENT_AUDIT_LOGS.push({
      choice: 'denied',
      timestamp: new Date(Date.now() - i * 7200000).toISOString(),
      noticeVersion,
      anonymousAnalyticsId: `demo-deny-${i}`,
    });
  }
}

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) req.destroy(); // 1MB limit
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Server-side dispatch to Matomo HTTP Tracking API
function sendServerSideMatomoEvent(action, name, value = null) {
  try {
    const matomoHost = 'matomo.35-234-210-199.nip.io';
    const params = new URLSearchParams({
      idsite: '1',
      rec: '1',
      e_c: 'BFSI_Backend_API',
      e_a: action,
      e_n: name,
      send_image: '0'
    });
    if (value !== null) params.append('e_v', String(Math.round(value)));

    const options = {
      hostname: matomoHost,
      port: 443,
      path: `/matomo.php?${params.toString()}`,
      method: 'GET',
      headers: { 'User-Agent': 'InfinityBank-Backend/1.0' },
      timeout: 3000
    };

    const request = https.request(options);
    request.on('error', () => {}); // non-blocking error handler
    request.end();
  } catch (e) {
    // silently ignore tracking connection errors
  }
}

const server = http.createServer(async (req, res) => {
  let reqPath = req.url.split('?')[0];

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =========================================================================
  // BACKEND BFSI API ENDPOINTS WITH ENRICHED DATALAYER PAYLOADS
  // =========================================================================

  // 1. Calculate FD Yield (Backend Calculation & DataLayer Generator)
  if (req.method === 'POST' && reqPath === '/api/bfsi/calculate-yield') {
    try {
      const data = await parseJsonBody(req);
      const principal = parseFloat(data.principal) || 100000;
      const months = parseInt(data.months, 10) || 36;
      const rate = parseFloat(data.rate) || 8.45;
      const payout = data.payout || 'compounded';

      const years = months / 12;
      let maturityTotal = 0;
      let interestGain = 0;

      if (payout === 'compounded') {
        maturityTotal = Math.round(principal * Math.pow(1 + (rate / 100) / 12, 12 * years));
        interestGain = maturityTotal - principal;
      } else {
        interestGain = Math.round(principal * (rate / 100) * years);
        maturityTotal = principal + interestGain;
      }

      const monthlyEquivalent = Math.round(interestGain / months);

      // Enriched Server-Side DataLayer Event
      const dataLayerPayload = {
        event: 'calculate_fd_yield',
        financial_product_name: 'Infinite High-Yield Multiplier Deposit',
        financial_category: 'wealth_management',
        calculation_type: 'fd_yield',
        financial_amount: principal,
        financial_amount_tier: principal >= 500000 ? 'high_tier_500k_plus' : (principal >= 100000 ? 'mid_tier_100k_500k' : 'standard_tier_under_100k'),
        interest_rate_apy: rate,
        tenure_range: `${months}_months`,
        payout_mode: payout,
        projected_maturity_capital: maturityTotal,
        net_interest_yield: interestGain,
        server_verified: true,
        source: 'backend_api',
        timestamp: new Date().toISOString()
      };

      sendServerSideMatomoEvent('calculate_fd_yield', `${months}m_${rate}%`, principal);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        calculations: {
          maturityTotal,
          interestGain,
          monthlyEquivalent
        },
        dataLayer: dataLayerPayload
      }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // 2. Calculate Loan EMI (Backend Calculation & DataLayer Generator)
  if (req.method === 'POST' && reqPath === '/api/bfsi/calculate-emi') {
    try {
      const data = await parseJsonBody(req);
      const principal = parseFloat(data.principal) || 350000;
      const years = parseInt(data.years, 10) || 15;
      const rate = parseFloat(data.rate) || 7.65;
      const loanType = data.loanType || 'Prime Home Mortgage';

      const monthlyRate = (rate / 100) / 12;
      const totalMonths = years * 12;
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
      const totalPayment = emi * totalMonths;
      const totalInterest = totalPayment - principal;

      // Enriched Server-Side DataLayer Event
      const dataLayerPayload = {
        event: 'calculate_loan_emi',
        financial_product_name: loanType,
        financial_category: 'retail_lending',
        calculation_type: 'loan_emi',
        financial_amount: principal,
        financial_amount_tier: principal >= 500000 ? 'high_tier_500k_plus' : 'standard_tier_under_500k',
        interest_rate_apr: rate,
        tenure_range: `${years}_years`,
        estimated_monthly_emi: Math.round(emi),
        total_interest_payable: Math.round(totalInterest),
        total_repayment_outflow: Math.round(totalPayment),
        server_verified: true,
        source: 'backend_api',
        timestamp: new Date().toISOString()
      };

      sendServerSideMatomoEvent('calculate_loan_emi', `${loanType}_${years}y`, principal);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        calculations: {
          monthlyEmi: Math.round(emi),
          totalInterest: Math.round(totalInterest),
          totalPayable: Math.round(totalPayment)
        },
        dataLayer: dataLayerPayload
      }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // 3. Submit BFSI Lead Application (Backend Lead Engine & DataLayer Generator)
  if (req.method === 'POST' && reqPath === '/api/bfsi/submit-lead') {
    try {
      const data = await parseJsonBody(req);
      const clientName = data.clientName || 'Valued Client';
      const clientEmail = data.clientEmail || '';
      const clientPhone = data.clientPhone || '';
      const incomeBracket = data.incomeBracket || '250k-500k';
      const purpose = data.purpose || 'yield_maximization';
      const productName = data.productName || 'Infinite High-Yield Multiplier Deposit';

      // Generate server-validated reference ID
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const referenceId = `INF-BFSI-${new Date().getFullYear()}-${randomId}`;

      const leadRecord = {
        referenceId,
        clientNameMasked: clientName.split(' ')[0] + ' ' + (clientName.split(' ')[1] ? clientName.split(' ')[1][0] + '.' : ''),
        clientEmailDomain: clientEmail.split('@')[1] || '',
        incomeBracket,
        purpose,
        productName,
        createdAt: new Date().toISOString()
      };

      BFSI_LEADS.push(leadRecord);

      // Determine category
      const lower = productName.toLowerCase();
      const category = lower.includes('card') ? 'credit_cards' : (lower.includes('deposit') ? 'wealth_management' : (lower.includes('shield') || lower.includes('assurance') ? 'insurance' : 'retail_lending'));

      // Comprehensive DataLayer Payload
      const dataLayerPayload = {
        event: 'financial_lead_submitted',
        financial_product_name: productName,
        financial_category: category,
        customer_income_bracket: incomeBracket,
        primary_financial_objective: purpose,
        application_reference_id: referenceId,
        application_status: 'pre_approved_instant',
        server_verified: true,
        source: 'backend_api',
        timestamp: new Date().toISOString()
      };

      // Server-Side Matomo Track
      sendServerSideMatomoEvent('financial_lead_submitted', productName);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        referenceId,
        message: 'Priority relationship dossier dispatched to Senior Wealth Underwriter.',
        dataLayer: dataLayerPayload
      }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // 4. Tab Category Navigation
  if (req.method === 'POST' && reqPath === '/api/bfsi/select-category') {
    try {
      const data = await parseJsonBody(req);
      const target = data.target || 'wealth';
      const dataLayerPayload = {
        event: 'select_financial_category',
        institution: 'Infinity Bank',
        financial_category: target,
        action_type: 'tab_navigation',
        server_verified: true,
        source: 'backend_api',
        timestamp: new Date().toISOString()
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', dataLayer: dataLayerPayload }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  
  // =========================================================================
  // DPDP ACT 2023 STATUTORY API ENDPOINTS
  // =========================================================================

  // GET /api/dpdp/summary — consent counts + rights tickets (no PII) for OYDK console
  if (req.method === 'GET' && reqPath === '/api/dpdp/summary') {
    const granted = DPDP_CONSENT_AUDIT_LOGS.filter((c) => c.choice === 'granted').length;
    const denied = DPDP_CONSENT_AUDIT_LOGS.filter((c) => c.choice === 'denied').length;
    const rights_requests = Array.from(DPDP_RIGHTS_REQUESTS.values()).map((t) => ({
      ticketId: t.ticketId,
      requestType: t.requestType,
      status: t.status,
      acknowledgedDate: t.acknowledgedDate,
      currentStage: t.currentStage,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      consent: { granted, denied, total: DPDP_CONSENT_AUDIT_LOGS.length },
      rights_requests,
    }));
    return;
  }

  // 1. POST /api/consent (Save choice, timestamp, and notice version without PII)
  if (req.method === 'POST' && reqPath === '/api/consent') {
    try {
      const data = await parseJsonBody(req);
      const consentEntry = {
        choice: data.choice === 'granted' ? 'granted' : 'denied',
        timestamp: data.timestamp || new Date().toISOString(),
        noticeVersion: data.noticeVersion || '2023.v1_dpdp',
        anonymousAnalyticsId: (data.anonymousAnalyticsId || '').substring(0, 36)
      };

      DPDP_CONSENT_AUDIT_LOGS.push(consentEntry);

      // Section 8 Audit Logging without personal data
      console.log(`[DPDP Consent Audit] Choice: ${consentEntry.choice} | Version: ${consentEntry.noticeVersion} | AnonId: ${consentEntry.anonymousAnalyticsId.substring(0, 10)}...`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Consent recorded successfully.' }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // 2. POST /api/rights-requests (Create Data Rights Ticket)
  if (req.method === 'POST' && reqPath === '/api/rights-requests') {
    try {
      const data = await parseJsonBody(req);
      const identifier = (data.identifier || '').trim();
      const requestType = data.requestType || 'delete_analytics_marketing';
      const message = (data.message || '').trim();

      // Mask identifier for privacy protection (e.g. j***@domain.com or +91 ••••• ••210)
      let masked = '••••••••';
      if (identifier.includes('@')) {
        const [user, domain] = identifier.split('@');
        masked = user[0] + '•••••@' + domain;
      } else if (identifier.length >= 4) {
        masked = identifier.substring(0, 3) + ' ••••• ••' + identifier.slice(-3);
      }

      const ticketId = 'DR-' + Math.floor(100000 + Math.random() * 900000);
      const now = new Date();
      const deadline = new Date(now.getTime() + 30 * 86400000); // 30 Calendar Days statutory limit

      const ticketRecord = {
        ticketId,
        requestType,
        status: 'received',
        acknowledgedDate: now.toISOString(),
        statutoryDeadlineDate: deadline.toISOString(),
        currentStage: 'Received & Queued for Identity Verification',
        stageTimestamps: {
          received: now.toISOString()
        },
        attempts: 0,
        otp: '123456', // In production, generate random crypto 6-digit OTP
        lockedUntil: null
      };

      DPDP_RIGHTS_REQUESTS.set(ticketId, ticketRecord);

      // Log statutory event with timestamp and ticketId (NO PII)
      console.log(`[DPDP Data Rights Audit] Ticket: ${ticketId} | Action: PETITION_CREATED | Type: ${requestType}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        ticketId,
        maskedIdentifier: masked,
        acknowledgedDate: now.toISOString(),
        message: 'Request acknowledged within 7 days. Verification code dispatched.'
      }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // 3. POST /api/rights-requests/:id/verify (Verify OTP with 5-attempt rate limiter)
  if (req.method === 'POST' && reqPath.startsWith('/api/rights-requests/') && reqPath.endsWith('/verify')) {
    try {
      const parts = reqPath.split('/');
      const ticketId = parts[3];
      const data = await parseJsonBody(req);
      const userOtp = (data.otp || '').trim();

      const ticket = DPDP_RIGHTS_REQUESTS.get(ticketId);
      if (!ticket) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Ticket not located.' }));
        return;
      }

      // Check lockout status
      if (ticket.lockedUntil && new Date(ticket.lockedUntil).getTime() > Date.now()) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'locked',
          message: 'Verification locked due to too many failed attempts.',
          lockedUntil: ticket.lockedUntil
        }));
        return;
      }

      // Verify OTP (accepts '123456' mock code or stored OTP)
      if (userOtp === ticket.otp || userOtp === '123456') {
        ticket.status = 'in_progress';
        ticket.stageTimestamps.verified = new Date().toISOString();
        ticket.stageTimestamps.inProgress = new Date().toISOString();
        ticket.attempts = 0;
        ticket.lockedUntil = null;

        console.log(`[DPDP Data Rights Audit] Ticket: ${ticketId} | Action: IDENTITY_VERIFIED_SUCCESS`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          ticket,
          message: 'Identity verified. Statutory data rights processing initiated.'
        }));
        return;
      } else {
        ticket.attempts = (ticket.attempts || 0) + 1;
        const remaining = Math.max(0, 5 - ticket.attempts);

        if (ticket.attempts >= 5) {
          // Lock for 15 minutes
          ticket.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        console.warn(`[DPDP Data Rights Audit] Ticket: ${ticketId} | Action: VERIFICATION_ATTEMPT_FAILED | Remaining: ${remaining}`);

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'failed',
          message: 'Incorrect 6-digit one-time code.',
          remainingAttempts: remaining,
          lockedUntil: ticket.lockedUntil
        }));
        return;
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // 4. GET /api/rights-requests/:id (Return status only, NO personal data)
  if (req.method === 'GET' && reqPath.startsWith('/api/rights-requests/') && !reqPath.endsWith('/verify')) {
    try {
      const parts = reqPath.split('/');
      const ticketId = parts[3];

      const ticket = DPDP_RIGHTS_REQUESTS.get(ticketId);
      if (!ticket) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Ticket not found.' }));
        return;
      }

      // Safe return: Strip any internal tokens or sensitive details
      const safeTicket = {
        ticketId: ticket.ticketId,
        requestType: ticket.requestType,
        status: ticket.status,
        acknowledgedDate: ticket.acknowledgedDate,
        statutoryDeadlineDate: ticket.statutoryDeadlineDate,
        currentStage: ticket.currentStage,
        stageTimestamps: ticket.stageTimestamps,
        retentionDetails: ticket.retentionDetails,
        deletionSummary: ticket.deletionSummary
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', ticket: safeTicket }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
  }

  // Matomo Beacon Endpoint (/matomo.php)
  if (reqPath === '/matomo.php' || reqPath === '/piwik.php') {
    const transparentGif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(transparentGif);
    return;
  }

  // Static File Serving
  if (reqPath === '/') reqPath = '/index.html';
  
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Infinity Bank Web Application running at http://localhost:${PORT}`);
});
