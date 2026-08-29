import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { processChargeSuccess } from '../commerce/payments.js';
import { sendCommerceError } from '../commerce/errors.js';
import { assertPaystackTestKey, PaystackError } from '../payments/paystack.js';

function validSignature(rawBody, supplied, secretKey) {
  if (!Buffer.isBuffer(rawBody) || typeof supplied !== 'string' || !/^[a-f0-9]{128}$/i.test(supplied)) {
    return false;
  }
  const expected = createHmac('sha512', secretKey).update(rawBody).digest();
  const actual = Buffer.from(supplied, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createPaystackWebhookRouter({ secretKey }) {
  const router = express.Router();
  router.post('/', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
    let key;
    try {
      key = assertPaystackTestKey(secretKey);
    } catch (error) {
      if (error instanceof PaystackError) {
        return res.status(error.status).json({ error: true, code: error.code, message: error.message });
      }
      return res.status(503).json({ error: true, code: 'PAYMENT_NOT_CONFIGURED', message: 'Paystack test mode is not configured.' });
    }
    if (!validSignature(req.body, req.get('x-paystack-signature'), key)) {
      return res.status(401).json({ error: true, code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature.' });
    }
    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: true, code: 'INVALID_WEBHOOK_PAYLOAD', message: 'Invalid webhook payload.' });
    }
    if (event?.event !== 'charge.success') return res.status(200).json({ received: true, handled: false });
    try {
      const result = await processChargeSuccess({ data: event.data });
      return res.status(200).json({ received: true, handled: result.handled });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });
  return router;
}
