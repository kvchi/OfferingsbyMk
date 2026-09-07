import nodemailer from 'nodemailer';

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

export function createEmailService(env, { logger = console } = {}) {
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
