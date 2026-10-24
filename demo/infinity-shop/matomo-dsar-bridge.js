/**
 * Server-side Matomo DSAR delete (Cloud Run → Matomo HTTPS).
 * User ID scheme matches dpdp/subject_id.py and dpdp-subject.js
 */
const crypto = require('crypto');
const https = require('https');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function subjectUserId(email) {
  const normalized = normalizeEmail(email);
  const digest = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 24);
  return `dpdp-${digest}`;
}

function matomoLookupIds(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  return [...new Set([normalized, subjectUserId(normalized), `email:${normalized}`])];
}

function matomoApiPost(baseUrl, token, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      module: 'API',
      format: 'JSON',
      token_auth: token,
      idSite: '1',
      ...params
    }).toString();
    const url = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname.replace(/\/$/, '')}/index.php`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 45000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          reject(new Error(data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function findVisitsForUserId(baseUrl, token, userId) {
  const segments = [`userId==${userId}`, `visitorId==${userId}`];
  for (const segment of segments) {
    const { json } = await matomoApiPost(baseUrl, token, {
      method: 'Live.getLastVisitsDetails',
      period: 'month',
      date: 'today',
      filterLimit: '100',
      segment
    });
    if (json && json.result === 'error') continue;
    if (Array.isArray(json) && json.length) return json;
  }
  return [];
}

async function deleteVisits(baseUrl, token, visits) {
  const params = { method: 'PrivacyManager.deleteDataSubjects' };
  let i = 0;
  for (const visit of visits) {
    const idVisit = visit.idVisit || visit.idvisit;
    const idSite = visit.idSite || visit.idsite || 1;
    if (idVisit == null) continue;
    params[`visits[${i}][idsite]`] = String(idSite);
    params[`visits[${i}][idvisit]`] = String(idVisit);
    i += 1;
  }
  if (i === 0) return { result: 'skipped', message: 'no visits' };
  const { json } = await matomoApiPost(baseUrl, token, params);
  return json;
}

async function countMatomoVisits(email, options = {}) {
  const token = options.token || process.env.MATOMO_API_TOKEN;
  const baseUrl = options.matomoUrl || process.env.MATOMO_URL || 'https://matomo.35-234-210-199.nip.io';
  if (!token) return { visit_count: 0, subject_user_id: subjectUserId(email) };

  const seen = new Set();
  let total = 0;
  for (const id of matomoLookupIds(email)) {
    const visits = await findVisitsForUserId(baseUrl, token, id);
    for (const v of visits) {
      const key = v.idVisit || v.idvisit;
      if (key != null && seen.has(key)) continue;
      if (key != null) seen.add(key);
      total += 1;
    }
  }
  return { visit_count: total, subject_user_id: subjectUserId(email) };
}

async function processMatomoErasure(email, options = {}) {
  const token = options.token || process.env.MATOMO_API_TOKEN;
  const baseUrl = options.matomoUrl || process.env.MATOMO_URL || 'https://matomo.35-234-210-199.nip.io';
  const scope = options.scope || 'full_erasure';
  const legalHold = Boolean(options.legalHold);

  if (!token) {
    return { status: 'error', message: 'MATOMO_API_TOKEN not configured on shop server' };
  }
  if (scope === 'access_inquiry') {
    const ids = matomoLookupIds(email);
    let total = 0;
    for (const id of ids) {
      total += (await findVisitsForUserId(baseUrl, token, id)).length;
    }
    return {
      status: 'completed',
      subject_user_id: subjectUserId(email),
      matomo_visits_deleted: 0,
      visit_count: total,
      message: 'Access inquiry only; no deletion.'
    };
  }
  if (legalHold) {
    return {
      status: 'partial',
      subject_user_id: subjectUserId(email),
      matomo_visits_deleted: 0,
      message: 'Erasure deferred (legal hold / active order).'
    };
  }

  const seen = new Set();
  const allVisits = [];
  for (const id of matomoLookupIds(email)) {
    const visits = await findVisitsForUserId(baseUrl, token, id);
    for (const v of visits) {
      const key = v.idVisit || v.idvisit;
      if (key != null && seen.has(key)) continue;
      if (key != null) seen.add(key);
      allVisits.push(v);
    }
  }

  let deletionResult = null;
  if (allVisits.length) {
    deletionResult = await deleteVisits(baseUrl, token, allVisits);
  }

  return {
    status: allVisits.length ? 'completed' : 'completed_no_visits',
    subject_user_id: subjectUserId(email),
    matomo_visits_found: allVisits.length,
    matomo_visits_deleted: allVisits.length,
    deletion_results: deletionResult ? [deletionResult] : [],
    message: allVisits.length
      ? `Matomo analytics data removed for ${allVisits.length} visit(s).`
      : 'No Matomo visits matched this email yet.'
  };
}

module.exports = {
  subjectUserId,
  countMatomoVisits,
  processMatomoErasure
};
