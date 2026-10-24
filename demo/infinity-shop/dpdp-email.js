/**
 * Erasure confirmation email.
 * Modes (DPDP_EMAIL_MODE): auto | smtp | sendgrid | echo | log
 * SMTP: DPDP_SMTP_HOST, PORT, USER, PASS, DPDP_EMAIL_FROM
 * SendGrid: DPDP_SENDGRID_API_KEY, DPDP_EMAIL_FROM
 */
const https = require('https');
const nodemailer = require('nodemailer');

function buildErasureEmail({ name, ticketId, visitsDeleted, visitsFound, subjectUserId, legalHold }) {
  const greeting = name ? `Dear ${name},` : 'Dear Data Principal,';
  const foundLine = visitsFound != null ? `Records located in Matomo before erasure: ${visitsFound}.\n` : '';
  const body = legalHold
    ? `${greeting}

We received your statutory erasure request (Reference: ${ticketId}).

${foundLine}Analytics and marketing identifiers on this device have been revoked. Some records remain under legal hold (active order or tax/invoice retention per DPDP Section 12(3) and applicable GST/RBI rules).

Matomo subject identifier: ${subjectUserId}

If you have questions, contact dpo@infinitybank.com.

— Infinite Bank Data Protection Office`
    : `${greeting}

Your statutory erasure request (Reference: ${ticketId}) has been completed.

${foundLine}We deleted ${visitsDeleted} analytics visit record(s) from our self-hosted Matomo system (India region). Browser tracking cookies and local preferences on your device were also cleared.

Matomo subject identifier: ${subjectUserId}

Categories removed include browsing telemetry, analytics cookies, and pseudonymous marketing identifiers. Tax invoices and records required by law may still be retained as disclosed in our privacy notice.

— Infinite Bank Data Protection Office`;

  return {
    subject: `[Infinite Bank] DPDP Erasure Confirmation — ${ticketId}`,
    text: body
  };
}

function sendViaSendGrid({ from, to, subject, text }) {
  const apiKey = process.env.DPDP_SENDGRID_API_KEY;
  if (!apiKey) return Promise.resolve(null);
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from },
    subject,
    content: [{ type: 'text/plain', value: text }]
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.sendgrid.com',
        path: '/v3/mail/send',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 30000
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ messageId: `sendgrid-${res.statusCode}` });
          } else {
            reject(new Error(`SendGrid ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendErasureConfirmation(payload) {
  const { to } = payload;
  const { subject, text } = buildErasureEmail(payload);
  const preview = { subject, text };
  let mode = (process.env.DPDP_EMAIL_MODE || 'auto').toLowerCase();

  if (mode === 'log' || mode === 'off') {
    console.log('[DPDP Email:preview]', { to, subject, text });
    return { sent: false, mode: 'log', preview };
  }

  if (mode === 'echo') {
    return { sent: false, mode: 'echo', preview, message: 'Confirmation shown on screen (echo mode).' };
  }

  const from = process.env.DPDP_EMAIL_FROM || process.env.DPDP_SMTP_USER || 'dpo@infinitybank.com';

  const trySendGrid = mode === 'sendgrid' || (mode === 'auto' && process.env.DPDP_SENDGRID_API_KEY);
  if (trySendGrid && process.env.DPDP_SENDGRID_API_KEY) {
    try {
      const info = await sendViaSendGrid({ from, to, subject, text });
      return { sent: true, mode: 'sendgrid', messageId: info.messageId, preview };
    } catch (err) {
      console.error('[DPDP Email] SendGrid failed:', err.message);
      if (mode === 'sendgrid') {
        return { sent: false, mode: 'sendgrid', error: err.message, preview };
      }
    }
  }

  const host = process.env.DPDP_SMTP_HOST;
  const user = process.env.DPDP_SMTP_USER;
  const pass = process.env.DPDP_SMTP_PASS;
  const port = parseInt(process.env.DPDP_SMTP_PORT || '587', 10);
  const trySmtp = mode === 'smtp' || (mode === 'auto' && host && user && pass);

  if (trySmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      const info = await transporter.sendMail({ from, to, subject, text });
      return { sent: true, mode: 'smtp', messageId: info.messageId, preview };
    } catch (err) {
      console.error('[DPDP Email] SMTP failed:', err.message);
      return { sent: false, mode: 'smtp', error: err.message, preview };
    }
  }

  console.warn('[DPDP Email] No provider configured — using echo preview');
  return { sent: false, mode: 'echo', preview, message: 'Configure DPDP_SMTP_* or DPDP_SENDGRID_API_KEY on Cloud Run.' };
}

module.exports = { sendErasureConfirmation, buildErasureEmail };
