import { prisma } from '../config/prisma.js';
import {
  ORDER_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
  SUPPORTED_CURRENCY,
  assertOrderStatusTransition,
  assertPaymentStatusTransition,
} from './constants.js';
import { commerceError } from './errors.js';
import { createPaymentReference } from './orders.js';
import { toJsonKobo } from './validation.js';
import { isPaystackAuthorizationUrl, PaystackError } from '../payments/paystack.js';

const activeInitializations = new Map();
const pendingProviderStatuses = new Set(['pending', 'ongoing', 'processing', 'queued']);
const failedProviderStatuses = new Set(['failed', 'abandoned', 'reversed', 'cancelled', 'canceled']);

const paymentInclude = {
  order: {
    include: {
      user: true,
      items: true,
    },
  },
};

const orderInclude = {
  user: true,
  items: true,
  payments: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
};

const paymentError = (code, message, status) => commerceError(code, message, status);

function mapProviderError(error) {
  if (error instanceof PaystackError) {
    return paymentError(error.code, error.message, error.status);
  }
  return error;
}

function assertAuthoritativeOrder(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
  }
  if (order.currency !== SUPPORTED_CURRENCY || order.totalKobo <= 0n || order.subtotalKobo <= 0n
    || order.shippingKobo < 0n) {
    throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
  }
  const subtotal = order.items.reduce((sum, item) => {
    if (!Number.isInteger(item.unitPriceKobo) || item.unitPriceKobo <= 0
      || !Number.isInteger(item.quantity) || item.quantity <= 0
      || item.lineTotalKobo !== BigInt(item.unitPriceKobo) * BigInt(item.quantity)) {
      throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
    }
    return sum + item.lineTotalKobo;
  }, 0n);
  if (subtotal !== order.subtotalKobo || subtotal + order.shippingKobo !== order.totalKobo) {
    throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
  }
  return order;
}

function assertOrderPayable(order) {
  assertAuthoritativeOrder(order);
  if (order.status !== ORDER_STATUS.PENDING || order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
  }
  if (order.paymentStatus !== PAYMENT_STATUS.UNPAID
    && order.paymentStatus !== PAYMENT_STATUS.INITIALIZED
    && order.paymentStatus !== PAYMENT_STATUS.PENDING
    && order.paymentStatus !== PAYMENT_STATUS.FAILED) {
    throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
  }
}

function assertPaymentMatchesOrder(payment, order) {
  if (payment.provider !== PAYMENT_PROVIDER.PAYSTACK
    || payment.expectedAmountKobo !== order.totalKobo || payment.currency !== order.currency) {
    throw paymentError('PAYMENT_MISMATCH', 'Payment verification did not match this order.', 422);
  }
}

async function findOwnedPaymentOrder({ authenticatedUserId, orderId, db = prisma }) {
  return db.order.findFirst({ where: { id: orderId, userId: authenticatedUserId }, include: orderInclude });
}

function publicStatus(order, payment) {
  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalKobo: toJsonKobo(order.totalKobo, 'totalKobo'),
      currency: order.currency,
    },
    payment: payment ? {
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
    } : null,
  };
}

const callbackForOrder = (baseUrl, orderId) => {
  const url = new URL(baseUrl);
  url.searchParams.set('orderId', orderId);
  return url.toString();
};

async function initializeOnce({ authenticatedUserId, orderId, paystackClient, callbackUrl, db }) {
  let order = await findOwnedPaymentOrder({ authenticatedUserId, orderId, db });
  if (!order) throw paymentError('ORDER_NOT_FOUND', 'Order not found.', 404);
  if (order.status === ORDER_STATUS.PAID && order.paymentStatus === PAYMENT_STATUS.PAID) {
    const paid = order.payments.find(({ status }) => status === PAYMENT_STATUS.PAID);
    return { alreadyPaid: true, ...publicStatus(order, paid) };
  }
  assertOrderPayable(order);

  let payment = order.payments.find(({ status }) => status === PAYMENT_STATUS.PAID)
    ?? order.payments.find(({ status }) => [PAYMENT_STATUS.INITIALIZED, PAYMENT_STATUS.PENDING].includes(status))
    ?? order.payments.find(({ status }) => status === PAYMENT_STATUS.UNPAID);

  if (payment && [PAYMENT_STATUS.INITIALIZED, PAYMENT_STATUS.PENDING].includes(payment.status)) {
    if (!isPaystackAuthorizationUrl(payment.authorizationUrl)) {
      throw paymentError('PAYMENT_IN_PROGRESS', 'Payment confirmation is already in progress.', 409);
    }
    return {
      authorizationUrl: payment.authorizationUrl,
      reference: payment.reference,
      testMode: true,
    };
  }

  if (!payment) {
    payment = await db.payment.create({
      data: {
        orderId: order.id,
        provider: PAYMENT_PROVIDER.PAYSTACK,
        reference: createPaymentReference(),
        expectedAmountKobo: order.totalKobo,
        currency: order.currency,
        status: PAYMENT_STATUS.UNPAID,
      },
    });
  }
  assertPaymentMatchesOrder(payment, order);

  let initialized;
  try {
    initialized = await paystackClient.initialize({
      email: order.user.email,
      amountKobo: toJsonKobo(order.totalKobo, 'totalKobo'),
      currency: SUPPORTED_CURRENCY,
      reference: payment.reference,
      callbackUrl: callbackForOrder(callbackUrl, order.id),
      orderId: order.id,
    });
  } catch (error) {
    throw mapProviderError(error);
  }

  assertPaymentStatusTransition(payment.status, PAYMENT_STATUS.INITIALIZED);
  [payment] = await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: PAYMENT_STATUS.INITIALIZED,
        providerReference: initialized.reference,
        authorizationUrl: initialized.authorizationUrl,
        initializedAt: new Date(),
        failureMessage: null,
      },
    }),
    db.order.update({ where: { id: order.id }, data: { paymentStatus: PAYMENT_STATUS.INITIALIZED } }),
  ]);
  return { authorizationUrl: payment.authorizationUrl, reference: payment.reference, testMode: true };
}

export function initializePayment(args) {
  const db = args.db ?? prisma;
  const key = `${args.authenticatedUserId}:${args.orderId}`;
  if (activeInitializations.has(key)) return activeInitializations.get(key);
  const promise = initializeOnce({ ...args, db }).finally(() => activeInitializations.delete(key));
  activeInitializations.set(key, promise);
  return promise;
}

function metadataOrderId(metadata) {
  if (metadata && typeof metadata === 'object') return metadata.orderId;
  if (typeof metadata === 'string') {
    try { return JSON.parse(metadata).orderId; } catch { return undefined; }
  }
  return undefined;
}

function validateProviderAssociation(payment, data) {
  const safeNumericId = typeof data?.id !== 'number' || Number.isSafeInteger(data.id);
  const transactionId = safeNumericId && (typeof data?.id === 'number' || typeof data?.id === 'string')
    ? String(data.id) : null;
  const validTransactionId = transactionId && /^\d+$/.test(transactionId)
    && BigInt(transactionId) <= 18_446_744_073_709_551_615n;
  if (!validTransactionId || data.domain !== 'test' || data.reference !== payment.reference
    || data.amount !== toJsonKobo(payment.expectedAmountKobo, 'expectedAmountKobo')
    || data.currency !== payment.currency || metadataOrderId(data.metadata) !== payment.orderId
    || data.customer?.email?.toLowerCase() !== payment.order.user.email.toLowerCase()) {
    throw paymentError('PAYMENT_MISMATCH', 'Payment verification did not match this order.', 422);
  }
  return transactionId;
}

async function completePayment({ payment, data, db = prisma }) {
  const transactionId = validateProviderAssociation(payment, data);
  if (data.status !== 'success') {
    throw paymentError('PAYMENT_NOT_SUCCESSFUL', 'Payment has not been confirmed.', 409);
  }
  const paidAt = new Date(data.paid_at);
  if (Number.isNaN(paidAt.getTime())) {
    throw paymentError('PAYSTACK_MALFORMED_RESPONSE', 'Paystack returned an invalid verification response.', 502);
  }

  return db.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id }, include: paymentInclude });
    if (!current) throw paymentError('PAYMENT_NOT_FOUND', 'Payment attempt not found.', 404);
    if (current.status === PAYMENT_STATUS.PAID && current.order.status === ORDER_STATUS.PAID) {
      return publicStatus(current.order, current);
    }
    assertAuthoritativeOrder(current.order);
    assertPaymentMatchesOrder(current, current.order);
    validateProviderAssociation(current, data);
    if (current.order.status !== ORDER_STATUS.PENDING || current.order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
    }
    assertPaymentStatusTransition(current.status, PAYMENT_STATUS.PAID);
    assertOrderStatusTransition(current.order.status, ORDER_STATUS.PAID);
    const updatedPayment = await tx.payment.update({
      where: { id: current.id },
      data: {
        status: PAYMENT_STATUS.PAID,
        providerTransactionId: transactionId,
        verifiedAt: new Date(),
        paidAt,
        failureMessage: null,
      },
    });
    const updatedOrder = await tx.order.update({
      where: { id: current.orderId },
      data: { status: ORDER_STATUS.PAID, paymentStatus: PAYMENT_STATUS.PAID },
    });
    return publicStatus(updatedOrder, updatedPayment);
  });
}

async function recordNonSuccessful(payment, data, db) {
  const normalized = String(data.status || '').toLowerCase();
  const next = pendingProviderStatuses.has(normalized) ? PAYMENT_STATUS.PENDING
    : failedProviderStatuses.has(normalized) ? PAYMENT_STATUS.FAILED : null;
  if (!next) throw paymentError('PAYSTACK_MALFORMED_RESPONSE', 'Paystack returned an invalid verification response.', 502);
  if (payment.status === PAYMENT_STATUS.PAID) return publicStatus(payment.order, payment);
  assertPaymentStatusTransition(payment.status, next);
  const [updated] = await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: next,
        verifiedAt: new Date(),
        failureMessage: next === PAYMENT_STATUS.FAILED ? 'Paystack reported that this attempt was not successful.' : null,
      },
    }),
    db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: next } }),
  ]);
  return publicStatus({ ...payment.order, paymentStatus: next }, updated);
}

export async function verifyPayment({ authenticatedUserId, orderId, paystackClient, db = prisma }) {
  const order = await findOwnedPaymentOrder({ authenticatedUserId, orderId, db });
  if (!order) throw paymentError('ORDER_NOT_FOUND', 'Order not found.', 404);
  const paid = order.payments.find(({ status }) => status === PAYMENT_STATUS.PAID);
  if (order.status === ORDER_STATUS.PAID && order.paymentStatus === PAYMENT_STATUS.PAID && paid) {
    return { verified: true, ...publicStatus(order, paid) };
  }
  assertAuthoritativeOrder(order);
  if (order.status !== ORDER_STATUS.PENDING) throw paymentError('ORDER_NOT_PAYABLE', 'This order cannot be paid.', 409);
  const payment = order.payments.find(({ initializedAt }) => initializedAt !== null);
  if (!payment) throw paymentError('PAYMENT_NOT_INITIALIZED', 'No initialized payment was found.', 409);
  payment.order = order;
  let data;
  try { data = await paystackClient.verify(payment.reference); } catch (error) { throw mapProviderError(error); }
  if (data.status === 'success') {
    const result = await completePayment({ payment, data, db });
    return { verified: true, ...result };
  }
  validateProviderAssociation(payment, data);
  const result = await recordNonSuccessful(payment, data, db);
  return { verified: false, ...result };
}

export async function processChargeSuccess({ data, db = prisma }) {
  if (!data || typeof data.reference !== 'string') return { handled: false };
  const payment = await db.payment.findUnique({ where: { reference: data.reference }, include: paymentInclude });
  if (!payment) return { handled: false };
  const result = await completePayment({ payment, data, db });
  return { handled: true, ...result };
}

export { publicStatus };
