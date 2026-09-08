import test from 'node:test';
import assert from 'node:assert/strict';
import { BREVO_EMAIL_ENDPOINT, createEmailService } from '../email/emailService.js';

const resetUrl = 'https://offeringsby-mk.vercel.app/reset-password?token=synthetic-one-time-token';
const recipient = 'reset-recipient@example.invalid';
const apiKey = 'synthetic-brevo-api-key';
const baseEnv = {
  EMAIL_DELIVERY_MODE: 'brevo',
  BREVO_API_KEY: apiKey,
  BREVO_SENDER_EMAIL: 'verified-sender@example.invalid',
  BREVO_SENDER_NAME: 'OfferingsbyMK',
  BREVO_TIMEOUT_MS: 100,
};

test('Brevo mode sends one bounded HTTPS request with text and safe HTML content', async () => {
  const calls = [];
  const service = createEmailService(baseEnv, {
    fetchImpl: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ messageId: 'synthetic-message-id' }) };
    },
  });
  await service.sendPasswordReset({ to: recipient, resetUrl, expiresInMinutes: 30 });

  assert.equal(calls.length, 1, 'delivery must not retry unexpectedly');
  const [url, options] = calls[0];
  assert.equal(url, BREVO_EMAIL_ENDPOINT);
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['api-key'], apiKey);
  assert.ok(options.signal instanceof AbortSignal);
  const body = JSON.parse(options.body);
  assert.deepEqual(body.sender, { email: baseEnv.BREVO_SENDER_EMAIL, name: baseEnv.BREVO_SENDER_NAME });
  assert.deepEqual(body.to, [{ email: recipient }]);
  assert.match(body.textContent, /synthetic-one-time-token/);
  assert.match(body.htmlContent, /https:\/\/offeringsby-mk\.vercel\.app\/reset-password/);
  assert.equal(options.body.includes(apiKey), false, 'API key must remain in the authorization header only');
});

test('Brevo mode treats provider rejection and malformed success responses as failures without retries', async () => {
  for (const response of [
    { ok: false, json: async () => ({}) },
    { ok: true, json: async () => ({}) },
    { ok: true, json: async () => { throw new Error('invalid response'); } },
  ]) {
    let calls = 0;
    const service = createEmailService(baseEnv, { fetchImpl: async () => { calls += 1; return response; } });
    await assert.rejects(
      service.sendPasswordReset({ to: recipient, resetUrl, expiresInMinutes: 30 }),
      /delivery failed/,
    );
    assert.equal(calls, 1);
  }
});

test('Brevo mode aborts a slow request at the configured timeout', async () => {
  let observedSignal;
  const service = createEmailService({ ...baseEnv, BREVO_TIMEOUT_MS: 10 }, {
    fetchImpl: async (url, { signal }) => {
      observedSignal = signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    },
  });
  await assert.rejects(
    service.sendPasswordReset({ to: recipient, resetUrl, expiresInMinutes: 30 }),
    /delivery failed/,
  );
  assert.equal(observedSignal.aborted, true);
});

test('preview, test, and SMTP modes remain distinct from Brevo', async () => {
  const testService = createEmailService({ EMAIL_DELIVERY_MODE: 'test' });
  await testService.sendPasswordReset({ to: recipient, resetUrl, expiresInMinutes: 30 });
  assert.equal(testService.getTestDeliveries().length, 1);

  const previewLogs = [];
  const previewService = createEmailService({ EMAIL_DELIVERY_MODE: 'preview' }, {
    logger: { info: (message) => previewLogs.push(message) },
  });
  await previewService.sendPasswordReset({ to: recipient, resetUrl, expiresInMinutes: 30 });
  assert.equal(previewLogs.length, 1);
  assert.equal(previewLogs[0].includes(recipient), false, 'preview logging must mask the recipient');
});
