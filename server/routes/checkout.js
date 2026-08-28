import express from 'express';
import { buildAuthoritativeCheckout } from '../commerce/checkout.js';
import { checkoutRequestSchema } from '../commerce/checkoutValidation.js';
import { sendCommerceError } from '../commerce/errors.js';

const invalidRequest = (res) => res.status(400).json({
  error: true,
  code: 'VALIDATION_ERROR',
  message: 'Invalid checkout request.',
});

export function createCheckoutRouter({ authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  router.post('/preview', async (req, res) => {
    const parsed = checkoutRequestSchema.safeParse(req.body);
    if (!parsed.success) return invalidRequest(res);

    try {
      const checkout = await buildAuthoritativeCheckout({ request: parsed.data });
      return res.json({ error: false, checkout });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  return router;
}
