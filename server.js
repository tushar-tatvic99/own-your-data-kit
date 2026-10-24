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
