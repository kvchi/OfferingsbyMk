import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import {
  ORDER_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
} from './constants.js';
import { buildAuthoritativeCheckout } from './checkout.js';
import { commerceError } from './errors.js';
import { toDatabaseBigInt, toJsonKobo } from './validation.js';

const orderInclude = {
  items: {
    select: {
      productIdSnapshot: true,
      productTitleSnapshot: true,
      unitPriceKobo: true,
      quantity: true,
      lineTotalKobo: true,
    },
    orderBy: { productIdSnapshot: 'asc' },
  },
  payments: {
    select: {
      reference: true,
      provider: true,
      status: true,
      initializedAt: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
};

const assertIdentifier = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
};

const createOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `SS-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
};

export const createPaymentReference = () =>
  `SSPAY-${randomUUID().replaceAll('-', '').toUpperCase()}`;

const deliveryFromOrder = (order) => ({
  recipientName: order.recipientName,
  phone: order.phone,
  addressLine1: order.addressLine1,
  addressLine2: order.addressLine2 ?? undefined,
  cityOrLga: order.cityOrLga,
  state: order.state,
  postalCode: order.postalCode ?? undefined,
  country: order.country,
});

const linesFromOrder = (order) => order.items.map((item) => ({
  productId: item.productIdSnapshot,
  title: item.productTitleSnapshot,
  quantity: item.quantity,
  unitPriceKobo: item.unitPriceKobo,
  lineTotalKobo: toJsonKobo(item.lineTotalKobo, 'lineTotalKobo'),
}));

const preferredPayment = (payments = []) => {
  const newestFirst = [...payments].reverse();
  return newestFirst.find(({ status }) => status === PAYMENT_STATUS.PAID)
    ?? newestFirst.find(({ status }) => [PAYMENT_STATUS.INITIALIZED, PAYMENT_STATUS.PENDING].includes(status))
    ?? newestFirst.find(({ status }) => status === PAYMENT_STATUS.FAILED)
    ?? newestFirst.find(({ status }) => status === PAYMENT_STATUS.UNPAID)
    ?? null;
};

const safePayment = (payment) => payment ? {
  provider: payment.provider,
  status: payment.status,
  initializedAt: payment.initializedAt?.toISOString() ?? null,
  paidAt: payment.paidAt?.toISOString() ?? null,
} : null;

export function customerOrderActions(order) {
  const payment = preferredPayment(order.payments);
  const paidPayments = order.payments.filter(({ status }) => status === PAYMENT_STATUS.PAID);
  const receipt = order.status === ORDER_STATUS.PAID
    && order.paymentStatus === PAYMENT_STATUS.PAID
    && paidPayments.length === 1
    && paidPayments[0].paidAt instanceof Date;

  let paymentAction = 'NONE';
  if (order.status === ORDER_STATUS.PENDING) {
    if (order.paymentStatus === PAYMENT_STATUS.UNPAID
      && payment?.status === PAYMENT_STATUS.UNPAID) {
      paymentAction = 'INITIALIZE';
    } else if (order.paymentStatus === PAYMENT_STATUS.FAILED
      && payment?.status === PAYMENT_STATUS.FAILED) {
      paymentAction = 'INITIALIZE';
    } else if ([PAYMENT_STATUS.INITIALIZED, PAYMENT_STATUS.PENDING].includes(order.paymentStatus)
      && payment?.status === order.paymentStatus) {
      paymentAction = 'VERIFY';
    }
  }

  return { payment: paymentAction, receipt };
}

export function ownedOrderWhere(authenticatedUserId, orderId) {
  return {
    id: assertIdentifier(orderId, 'orderId'),
    userId: assertIdentifier(authenticatedUserId, 'authenticatedUserId'),
  };
}

export function findOwnedOrder({ authenticatedUserId, orderId, db = prisma, include = orderInclude }) {
  return db.order.findFirst({
    where: ownedOrderWhere(authenticatedUserId, orderId),
    include,
  });
}

export function serializeOrderDetail(order, { includePaymentReference = false } = {}) {
  const payment = preferredPayment(order.payments);
  const serialized = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    lines: linesFromOrder(order),
    delivery: deliveryFromOrder(order),
    subtotalKobo: toJsonKobo(order.subtotalKobo, 'subtotalKobo'),
    shippingKobo: toJsonKobo(order.shippingKobo, 'shippingKobo'),
    totalKobo: toJsonKobo(order.totalKobo, 'totalKobo'),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    payment: safePayment(payment),
    availableActions: customerOrderActions(order),
  };

  if (includePaymentReference) {
    serialized.internalPaymentReference = order.payments[0]?.reference ?? null;
  }

  return serialized;
}

export function serializeOrderSummary(order) {
  const payment = preferredPayment(order.payments);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalKobo: toJsonKobo(order.totalKobo, 'totalKobo'),
    currency: order.currency,
    itemCount: order._count.items,
    createdAt: order.createdAt.toISOString(),
    payment: safePayment(payment),
    availableActions: customerOrderActions(order),
  };
}

const maskedCustomerName = (value) => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OfferingsbyMK customer';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1).slice(0, 1).toUpperCase()}.`;
};

export function serializePaidReceipt(order) {
  const paidPayments = order.payments.filter(({ status }) => status === PAYMENT_STATUS.PAID);
  const payment = paidPayments[0];
  if (order.status !== ORDER_STATUS.PAID || order.paymentStatus !== PAYMENT_STATUS.PAID
    || paidPayments.length !== 1 || !(payment?.paidAt instanceof Date)) {
    throw commerceError(
      'RECEIPT_NOT_AVAILABLE',
      'A paid receipt is not available for this order.',
      409,
    );
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: { displayName: maskedCustomerName(order.recipientName) },
    destination: {
      cityOrLga: order.cityOrLga,
      state: order.state,
      country: order.country,
    },
    lines: linesFromOrder(order),
    subtotalKobo: toJsonKobo(order.subtotalKobo, 'subtotalKobo'),
    shippingKobo: toJsonKobo(order.shippingKobo, 'shippingKobo'),
    totalKobo: toJsonKobo(order.totalKobo, 'totalKobo'),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    payment: {
      provider: payment.provider,
      status: payment.status,
      paidAt: payment.paidAt.toISOString(),
    },
  };
}

const findByIdempotencyKey = ({ db, authenticatedUserId, idempotencyKey }) => db.order.findUnique({
  where: {
    userId_idempotencyKey: {
      userId: authenticatedUserId,
      idempotencyKey,
    },
  },
  include: orderInclude,
});

const sameOptionalText = (left, right) => (left ?? undefined) === (right ?? undefined);

export function orderMatchesRequest(order, request) {
  const delivery = deliveryFromOrder(order);
  const sameDelivery =
    delivery.recipientName === request.delivery.recipientName &&
    delivery.phone === request.delivery.phone &&
    delivery.addressLine1 === request.delivery.addressLine1 &&
    sameOptionalText(delivery.addressLine2, request.delivery.addressLine2) &&
    delivery.cityOrLga === request.delivery.cityOrLga &&
    delivery.state === request.delivery.state &&
    sameOptionalText(delivery.postalCode, request.delivery.postalCode) &&
    delivery.country === request.delivery.country;
  if (!sameDelivery || order.items.length !== request.items.length) return false;

  const storedItems = [...order.items].sort((left, right) =>
    left.productIdSnapshot.localeCompare(right.productIdSnapshot));
  return storedItems.every((item, index) =>
    item.productIdSnapshot === request.items[index].productId &&
    item.quantity === request.items[index].quantity);
}

const replayOrConflict = (order, request) => {
  if (!orderMatchesRequest(order, request)) {
    throw commerceError(
      'IDEMPOTENCY_CONFLICT',
      'The idempotency key has already been used for a different request.',
      409,
    );
  }
  return { order, replayed: true };
};

export async function createPendingOrder({
  authenticatedUserId,
  idempotencyKey,
  request,
  db = prisma,
  orderNumberFactory = createOrderNumber,
  paymentReferenceFactory = createPaymentReference,
}) {
  assertIdentifier(authenticatedUserId, 'authenticatedUserId');
  assertIdentifier(idempotencyKey, 'idempotencyKey');

  const existing = await findByIdempotencyKey({ db, authenticatedUserId, idempotencyKey });
  if (existing) return replayOrConflict(existing, request);

  const checkout = await buildAuthoritativeCheckout({ db, request });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await db.order.create({
        data: {
          orderNumber: orderNumberFactory(),
          userId: authenticatedUserId,
          idempotencyKey,
          status: ORDER_STATUS.PENDING,
          paymentStatus: PAYMENT_STATUS.UNPAID,
          currency: checkout.currency,
          subtotalKobo: toDatabaseBigInt(checkout.subtotalKobo, 'subtotalKobo'),
          shippingKobo: toDatabaseBigInt(checkout.shippingKobo, 'shippingKobo'),
          totalKobo: toDatabaseBigInt(checkout.totalKobo, 'totalKobo'),
          recipientName: checkout.delivery.recipientName,
          phone: checkout.delivery.phone,
          addressLine1: checkout.delivery.addressLine1,
          addressLine2: checkout.delivery.addressLine2 ?? null,
          cityOrLga: checkout.delivery.cityOrLga,
          state: checkout.delivery.state,
          postalCode: checkout.delivery.postalCode ?? null,
          country: checkout.delivery.country,
          items: {
            create: checkout.lines.map((line) => ({
              productId: line.productId,
              productIdSnapshot: line.productId,
              productTitleSnapshot: line.title,
              unitPriceKobo: line.unitPriceKobo,
              quantity: line.quantity,
              lineTotalKobo: toDatabaseBigInt(line.lineTotalKobo, 'lineTotalKobo'),
            })),
          },
          payments: {
            create: {
              provider: PAYMENT_PROVIDER.PAYSTACK,
              reference: paymentReferenceFactory(),
              expectedAmountKobo: toDatabaseBigInt(checkout.totalKobo, 'expectedAmountKobo'),
              currency: checkout.currency,
              status: PAYMENT_STATUS.UNPAID,
            },
          },
        },
        include: orderInclude,
      });
      return { order, replayed: false };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const concurrent = await findByIdempotencyKey({ db, authenticatedUserId, idempotencyKey });
      if (concurrent) return replayOrConflict(concurrent, request);
      if (attempt === 2) throw error;
    }
  }

  throw new Error('Unable to create a unique order reference');
}

export function listOwnedOrders({ authenticatedUserId, limit, db = prisma }) {
  assertIdentifier(authenticatedUserId, 'authenticatedUserId');
  return db.order.findMany({
    where: { userId: authenticatedUserId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      totalKobo: true,
      currency: true,
      createdAt: true,
      _count: { select: { items: true } },
      payments: {
        select: {
          provider: true,
          status: true,
          initializedAt: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export { orderInclude };
