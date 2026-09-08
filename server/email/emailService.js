import nodemailer from 'nodemailer';

export const BREVO_EMAIL_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const maskedEmail = (value) => {
  const [local = '', domain = ''] = String(value).split('@');
  return `${local.slice(0, 1) || '*'}***@${domain || 'hidden'}`;
};

export function buildPasswordResetEmail({ resetUrl, expiresInMinutes }) {
  const safeUrl = escapeHtml(resetUrl);
  const subject = 'Reset your OfferingsbyMK password';
  const text = [
    'OfferingsbyMK password reset',
    '',
    `Use this link within ${expiresInMinutes} minutes to choose a new password:`,
    resetUrl,
    '',
    'If you did not request this reset, ignore this email. Your password will remain unchanged.',
  ].join('\n');
  const html = `<h1>OfferingsbyMK password reset</h1><p>Use the link below within ${expiresInMinutes} minutes to choose a new password.</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this reset, ignore this email. Your password will remain unchanged.</p>`;
  return { subject, text, html };
}

export function createEmailService(env, { logger = console, fetchImpl = globalThis.fetch } = {}) {
  const deliveries = [];
  let transporter = null;
  if (env.EMAIL_DELIVERY_MODE === 'smtp') {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD },
      connectionTimeout: env.SMTP_TIMEOUT_MS,
      greetingTimeout: env.SMTP_TIMEOUT_MS,
      socketTimeout: env.SMTP_TIMEOUT_MS,
    });
  }

  return {
    mode: env.EMAIL_DELIVERY_MODE,
    async sendPasswordReset({ to, resetUrl, expiresInMinutes }) {
      const message = buildPasswordResetEmail({ resetUrl, expiresInMinutes });
      if (env.EMAIL_DELIVERY_MODE === 'test') {
        deliveries.push({ to, resetUrl, expiresInMinutes, ...message });
        return;
      }
      if (env.EMAIL_DELIVERY_MODE === 'preview') {
        logger.info(`[DEVELOPMENT EMAIL PREVIEW — DO NOT USE IN PRODUCTION]\nRecipient: ${maskedEmail(to)}\n${message.text}`);
        return;
      }
      if (env.EMAIL_DELIVERY_MODE === 'brevo') {
        if (typeof fetchImpl !== 'function') throw new Error('Brevo email delivery is unavailable.');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), env.BREVO_TIMEOUT_MS);
        try {
          const response = await fetchImpl(BREVO_EMAIL_ENDPOINT, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              accept: 'application/json',
              'api-key': env.BREVO_API_KEY,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
              to: [{ email: to }],
              subject: message.subject,
              textContent: message.text,
              htmlContent: message.html,
            }),
          });
          if (!response.ok) throw new Error('Brevo rejected the email request.');
          let payload;
          try {
            payload = await response.json();
          } catch {
            throw new Error('Brevo returned an invalid response.');
          }
          if (typeof payload?.messageId !== 'string' || payload.messageId.length === 0) {
            throw new Error('Brevo returned an invalid response.');
          }
          return;
        } catch {
          throw new Error('Password-reset email delivery failed.');
        } finally {
          clearTimeout(timeout);
        }
      }
      await transporter.sendMail({ from: env.SMTP_FROM, to, ...message });
    },
    getTestDeliveries() {
      if (env.EMAIL_DELIVERY_MODE !== 'test') throw new Error('Email delivery capture is test-only.');
      return [...deliveries];
    },
    clearTestDeliveries() {
      if (env.EMAIL_DELIVERY_MODE !== 'test') throw new Error('Email delivery capture is test-only.');
      deliveries.length = 0;
    },
  };
}
