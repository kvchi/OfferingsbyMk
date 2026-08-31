import express from 'express';
import {
  checkoutRequestSchema,
  idempotencyKeySchema,
  orderIdSchema,
  orderListQuerySchema,
} from '../commerce/checkoutValidation.js';
import { commerceError, sendCommerceError } from '../commerce/errors.js';
import {
  createPendingOrder,
  findOwnedOrder,
  listOwnedOrders,
  serializeOrderDetail,
  serializePaidReceipt,
  serializeOrderSummary,
} from '../commerce/orders.js';
import { initializePayment, verifyPayment } from '../commerce/payments.js';

const invalidRequest = (res, message = 'Invalid order request.') => res.status(400).json({
  error: true,
  code: 'VALIDATION_ERROR',
  message,
});

const notFound = () => commerceError('ORDER_NOT_FOUND', 'Order not found.', 404);

export function createOrdersRouter({ authenticate, paystackClient, paystackCallbackUrl }) {
  const router = express.Router();
  router.use(authenticate);

  router.post('/', async (req, res) => {
    const parsedBody = checkoutRequestSchema.safeParse(req.body);
    const parsedKey = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'));
    if (!parsedBody.success || !parsedKey.success) return invalidRequest(res);

    try {
      const result = await createPendingOrder({
        authenticatedUserId: req.user.id,
        idempotencyKey: parsedKey.data,
        request: parsedBody.data,
      });
      return res.status(result.replayed ? 200 : 201).json({
        error: false,
        replayed: result.replayed,
        order: serializeOrderDetail(result.order, { includePaymentReference: true }),
      });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  router.get('/', async (req, res) => {
    const parsed = orderListQuerySchema.safeParse(req.query);
    if (!parsed.success) return invalidRequest(res, 'Invalid order-list query.');

    try {
      const orders = await listOwnedOrders({
        authenticatedUserId: req.user.id,
        limit: parsed.data.limit,
      });
      return res.json({
        error: false,
        orders: orders.map(serializeOrderSummary),
      });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  router.get('/:orderId/receipt', async (req, res) => {
    const parsed = orderIdSchema.safeParse(req.params.orderId);
    if (!parsed.success) return sendCommerceError(res, notFound());

    try {
      const order = await findOwnedOrder({
        authenticatedUserId: req.user.id,
        orderId: parsed.data,
      });
      if (!order) return sendCommerceError(res, notFound());
      return res.json({ error: false, receipt: serializePaidReceipt(order) });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  router.get('/:orderId', async (req, res) => {
    const parsed = orderIdSchema.safeParse(req.params.orderId);
    if (!parsed.success) return sendCommerceError(res, notFound());

    try {
      const order = await findOwnedOrder({
        authenticatedUserId: req.user.id,
        orderId: parsed.data,
      });
      if (!order) return sendCommerceError(res, notFound());
      return res.json({ error: false, order: serializeOrderDetail(order) });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  router.post('/:orderId/payments/initialize', async (req, res) => {
    const parsed = orderIdSchema.safeParse(req.params.orderId);
    if (!parsed.success) return sendCommerceError(res, notFound());
    try {
      const result = await initializePayment({
        authenticatedUserId: req.user.id,
        orderId: parsed.data,
        paystackClient,
        callbackUrl: paystackCallbackUrl,
      });
      return res.json({ error: false, ...result });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  router.post('/:orderId/payments/verify', async (req, res) => {
    const parsed = orderIdSchema.safeParse(req.params.orderId);
    if (!parsed.success) return sendCommerceError(res, notFound());
    try {
      const result = await verifyPayment({
        authenticatedUserId: req.user.id,
        orderId: parsed.data,
        paystackClient,
      });
      return res.json({ error: false, ...result });
    } catch (error) {
      return sendCommerceError(res, error);
    }
  });

  return router;
}
