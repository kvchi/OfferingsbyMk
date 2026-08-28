import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../app.js';
import { synchronizeProducts } from '../commerce/catalog.js';
import { checkoutRequestSchema } from '../commerce/checkoutValidation.js';
import { createPendingOrder } from '../commerce/orders.js';
import { prisma } from '../config/prisma.js';

if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== 'file:./test.db') {
  throw new Error('Checkout tests require the isolated test database runner');
}

const secret = process.env.SECRET;
const users = [
  {
    id: 'checkout-user-a',
    firstName: 'Checkout',
    lastName: 'Owner',
    email: 'checkout-owner@shopsphare.invalid',
    passwordHash: 'not-used-by-checkout-tests',
  },
  {
    id: 'checkout-user-b',
    firstName: 'Other',
    lastName: 'Owner',
    email: 'checkout-other@shopsphare.invalid',
    passwordHash: 'not-used-by-checkout-tests',
  },
];
const tokenFor = (user) => jwt.sign({}, secret, {
  algorithm: 'HS256',
  expiresIn: '1h',
  subject: user.id,
});
const tokens = users.map(tokenFor);
const authorize = (operation, token = tokens[0]) => operation.set('Authorization', `Bearer ${token}`);

const delivery = {
  recipientName: '  Ada   Okafor  ',
  phone: '0801 234 5678',
  addressLine1: '  12   Market Road ',
  addressLine2: '',
  cityOrLga: ' Ikeja ',
  state: ' Lagos ',
  postalCode: '100001',
  country: 'NG',
};
const checkoutBody = (overrides = {}) => ({
  items: [
    { productId: 'featured-rosemary', quantity: 2 },
    { productId: 'candle-soy-wax', quantity: 1 },
  ],
  delivery,
  ...overrides,
});

before(async () => {
  assert.equal(await prisma.user.count(), 0);
  await synchronizeProducts({ db: prisma });
  await prisma.user.createMany({ data: users });
});

after(async () => {
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany({ where: { id: { in: users.map(({ id }) => id) } } });
  await prisma.$disconnect();
});

test('checkout preview requires authentication and rejects invalid request shapes', async () => {
  const unauthenticated = await request(app).post('/api/checkout/preview').send(checkoutBody());
  assert.equal(unauthenticated.status, 401);

  const invalidBodies = [
    checkoutBody({ items: [] }),
    checkoutBody({ items: [{ productId: 'featured-rosemary', quantity: 1.5 }] }),
    checkoutBody({ unexpected: true }),
    checkoutBody({ items: [{ productId: 'featured-rosemary', quantity: 1, priceKobo: 1 }] }),
    checkoutBody({ delivery: { ...delivery, userId: users[1].id } }),
    checkoutBody({ delivery: { ...delivery, recipientName: '<script>alert(1)</script>' } }),
    checkoutBody({ delivery: { ...delivery, phone: '+12025550123' } }),
    checkoutBody({ delivery: { ...delivery, country: 'Ghana' } }),
  ];

  for (const body of invalidBodies) {
    const response = await authorize(request(app).post('/api/checkout/preview')).send(body);
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
  }
});

test('preview consolidates duplicate IDs and rejects combined quantities above 99', async () => {
  const consolidated = await authorize(request(app).post('/api/checkout/preview')).send(checkoutBody({
    items: [
      { productId: 'featured-rosemary', quantity: 2 },
      { productId: 'featured-rosemary', quantity: 3 },
    ],
  }));
  assert.equal(consolidated.status, 200);
  assert.equal(consolidated.body.checkout.lines.length, 1);
  assert.equal(consolidated.body.checkout.lines[0].quantity, 5);

  const excessive = await authorize(request(app).post('/api/checkout/preview')).send(checkoutBody({
    items: [
      { productId: 'featured-rosemary', quantity: 60 },
      { productId: 'featured-rosemary', quantity: 40 },
    ],
  }));
  assert.equal(excessive.status, 400);
  assert.equal(excessive.body.code, 'VALIDATION_ERROR');
});

test('preview uses authoritative prices, normalizes delivery and makes no commerce writes', async () => {
  const products = await prisma.product.findMany({
    where: { id: { in: ['featured-rosemary', 'candle-soy-wax'] } },
    orderBy: { id: 'asc' },
  });
  const expectedSubtotal = products.reduce((total, product) =>
    total + product.priceKobo * (product.id === 'featured-rosemary' ? 2 : 1), 0);
  const before = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.payment.count(),
  ]);

  const response = await authorize(request(app).post('/api/checkout/preview')).send(checkoutBody());
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.checkout.delivery, {
    recipientName: 'Ada Okafor',
    phone: '+2348012345678',
    addressLine1: '12 Market Road',
    cityOrLga: 'Ikeja',
    state: 'Lagos',
    postalCode: '100001',
    country: 'Nigeria',
  });
  assert.equal(response.body.checkout.subtotalKobo, expectedSubtotal);
  assert.equal(response.body.checkout.shippingKobo, 0);
  assert.equal(response.body.checkout.totalKobo, expectedSubtotal);
  assert.equal(response.body.checkout.currency, 'NGN');
  for (const line of response.body.checkout.lines) {
    const stored = products.find(({ id }) => id === line.productId);
    assert.equal(line.unitPriceKobo, stored.priceKobo);
    assert.equal(line.lineTotalKobo, stored.priceKobo * line.quantity);
  }
  assert.deepEqual(await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.payment.count(),
  ]), before);
});

test('preview returns safe errors for unknown, inactive and unavailable products', async () => {
  const unknown = await authorize(request(app).post('/api/checkout/preview')).send(checkoutBody({
    items: [{ productId: 'unknown-product', quantity: 1 }],
  }));
  assert.equal(unknown.status, 422);
  assert.equal(unknown.body.code, 'UNKNOWN_PRODUCT');

  await prisma.product.update({ where: { id: 'featured-rosemary' }, data: { active: false } });
  const inactive = await authorize(request(app).post('/api/checkout/preview')).send(checkoutBody({
    items: [{ productId: 'featured-rosemary', quantity: 1 }],
  }));
  assert.equal(inactive.status, 422);
  assert.equal(inactive.body.code, 'INACTIVE_PRODUCT');

  await prisma.product.update({
    where: { id: 'featured-rosemary' },
    data: { active: true, available: false },
  });
  const unavailable = await authorize(request(app).post('/api/checkout/preview')).send(checkoutBody({
    items: [{ productId: 'featured-rosemary', quantity: 1 }],
  }));
  assert.equal(unavailable.status, 422);
  assert.equal(unavailable.body.code, 'UNAVAILABLE_PRODUCT');
  await synchronizeProducts({ db: prisma });
});

test('order creation requires authentication, a valid idempotency key and an untampered body', async () => {
  const unauthenticated = await request(app)
    .post('/api/orders')
    .set('Idempotency-Key', 'order-auth-001')
    .send(checkoutBody());
  assert.equal(unauthenticated.status, 401);

  for (const key of [undefined, 'short', 'bad key!']) {
    let operation = authorize(request(app).post('/api/orders'));
    if (key !== undefined) operation = operation.set('Idempotency-Key', key);
    const response = await operation.send(checkoutBody());
    assert.equal(response.status, 400);
  }

  const tampered = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'order-tampered-001')
    .send({ ...checkoutBody(), totalKobo: 1, status: 'PAID', userId: users[1].id });
  assert.equal(tampered.status, 400);
  assert.equal(await prisma.order.count({ where: { idempotencyKey: 'order-tampered-001' } }), 0);
});

test('order creation atomically stores authoritative snapshots and one pending payment', async () => {
  const response = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'order-create-001')
    .send(checkoutBody());
  assert.equal(response.status, 201);
  assert.equal(response.body.replayed, false);
  assert.match(response.body.order.orderNumber, /^SS-\d{8}-[A-F0-9]{10}$/);
  assert.match(response.body.order.internalPaymentReference, /^SSPAY-[A-F0-9]{32}$/);
  assert.equal(response.body.order.status, 'PENDING');
  assert.equal(response.body.order.paymentStatus, 'UNPAID');
  assert.equal(typeof response.body.order.totalKobo, 'number');
  assert.equal(Number.isSafeInteger(response.body.order.totalKobo), true);

  const stored = await prisma.order.findUniqueOrThrow({
    where: { id: response.body.order.id },
    include: { items: true, payments: true },
  });
  assert.equal(stored.userId, users[0].id);
  assert.equal(stored.items.length, 2);
  assert.equal(stored.payments.length, 1);
  assert.equal(stored.payments[0].status, 'UNPAID');
  assert.equal(stored.payments[0].initializedAt, null);
  assert.equal(stored.totalKobo, BigInt(response.body.order.totalKobo));
  for (const item of stored.items) {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: item.productId } });
    assert.equal(item.unitPriceKobo, product.priceKobo);
    assert.equal(item.lineTotalKobo, BigInt(product.priceKobo * item.quantity));
  }
});

test('same-key retries replay, different payloads conflict and concurrent requests create one order', async () => {
  const firstRetry = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'order-create-001')
    .send(checkoutBody());
  assert.equal(firstRetry.status, 200);
  assert.equal(firstRetry.body.replayed, true);

  const conflict = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'order-create-001')
    .send(checkoutBody({ items: [{ productId: 'featured-rosemary', quantity: 1 }] }));
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'IDEMPOTENCY_CONFLICT');

  const makeConcurrent = () => authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'order-concurrent-001')
    .send(checkoutBody());
  const responses = await Promise.all([makeConcurrent(), makeConcurrent()]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 201]);
  assert.equal(responses.filter(({ body }) => body.replayed).length, 1);
  assert.equal(await prisma.order.count({ where: {
    userId: users[0].id,
    idempotencyKey: 'order-concurrent-001',
  } }), 1);
});

test('different authenticated users may use the same idempotency key', async () => {
  const key = 'shared-user-key-001';
  const [owner, other] = await Promise.all([
    authorize(request(app).post('/api/orders'), tokens[0]).set('Idempotency-Key', key).send(checkoutBody()),
    authorize(request(app).post('/api/orders'), tokens[1]).set('Idempotency-Key', key).send(checkoutBody()),
  ]);
  assert.equal(owner.status, 201);
  assert.equal(other.status, 201);
  const stored = await prisma.order.findMany({ where: { idempotencyKey: key }, orderBy: { userId: 'asc' } });
  assert.deepEqual(stored.map(({ userId }) => userId), users.map(({ id }) => id));
});

test('a nested-write failure rolls back order and item creation', async () => {
  const existingPayment = await prisma.payment.findFirstOrThrow();
  const before = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.payment.count(),
  ]);
  const normalized = checkoutRequestSchema.parse(checkoutBody());

  await assert.rejects(
    createPendingOrder({
      authenticatedUserId: users[0].id,
      idempotencyKey: 'forced-rollback-001',
      request: normalized,
      db: prisma,
      paymentReferenceFactory: () => existingPayment.reference,
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );
  assert.deepEqual(await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.payment.count(),
  ]), before);
});

test('stored snapshots and JSON totals remain stable after product edits', async () => {
  const created = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'snapshot-order-001')
    .send(checkoutBody({ items: [{ productId: 'featured-rosemary', quantity: 99 }] }));
  assert.equal(created.status, 201);
  const originalLine = created.body.order.lines[0];
  assert.equal(typeof originalLine.lineTotalKobo, 'number');
  assert.equal(Number.isSafeInteger(originalLine.lineTotalKobo), true);

  await prisma.product.update({
    where: { id: 'featured-rosemary' },
    data: { title: 'Edited Product', priceKobo: originalLine.unitPriceKobo + 500 },
  });
  const detail = await authorize(request(app).get(`/api/orders/${created.body.order.id}`));
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.order.lines[0], originalLine);
  await synchronizeProducts({ db: prisma });
});

test('owned order retrieval is newest-first, non-enumerating and excludes sensitive data', async () => {
  const first = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'retrieval-first-001')
    .send(checkoutBody());
  const second = await authorize(request(app).post('/api/orders'))
    .set('Idempotency-Key', 'retrieval-second-001')
    .send(checkoutBody());
  await prisma.order.update({ where: { id: first.body.order.id }, data: { createdAt: new Date('2099-01-01') } });
  await prisma.order.update({ where: { id: second.body.order.id }, data: { createdAt: new Date('2099-01-02') } });

  const list = await authorize(request(app).get('/api/orders?limit=2'));
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.orders.map(({ id }) => id), [second.body.order.id, first.body.order.id]);
  assert.equal(list.body.orders.every(({ paymentStatus }) => paymentStatus === 'UNPAID'), true);

  const detail = await authorize(request(app).get(`/api/orders/${second.body.order.id}`));
  assert.equal(detail.status, 200);
  assert.equal(detail.body.order.id, second.body.order.id);
  for (const forbidden of ['passwordHash', 'failureMessage', 'providerReference', 'authorizationToken', 'cardNumber']) {
    assert.equal(JSON.stringify({ list: list.body, detail: detail.body }).includes(forbidden), false);
  }

  const anotherUser = await authorize(
    request(app).get(`/api/orders/${second.body.order.id}`),
    tokens[1],
  );
  const unknown = await authorize(request(app).get('/api/orders/not-a-real-order'));
  assert.equal(anotherUser.status, 404);
  assert.equal(unknown.status, 404);
  assert.deepEqual(anotherUser.body, unknown.body);

  const invalidLimit = await authorize(request(app).get('/api/orders?limit=500&userId=checkout-user-b'));
  assert.equal(invalidLimit.status, 400);
});

test('order and payment references remain unique', async () => {
  const orders = await prisma.order.findMany({ select: { orderNumber: true } });
  const payments = await prisma.payment.findMany({ select: { reference: true } });
  assert.equal(new Set(orders.map(({ orderNumber }) => orderNumber)).size, orders.length);
  assert.equal(new Set(payments.map(({ reference }) => reference)).size, payments.length);
});
