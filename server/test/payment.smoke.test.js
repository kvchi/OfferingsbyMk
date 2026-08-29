import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { synchronizeProducts } from '../commerce/catalog.js';
import { checkoutRequestSchema } from '../commerce/checkoutValidation.js';
import { createPendingOrder } from '../commerce/orders.js';
import { prisma } from '../config/prisma.js';

if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== 'file:./test.db') {
  throw new Error('Payment tests require the isolated test database runner');
}

const users = [
  { id: 'payment-user-owner', firstName: 'Payment', lastName: 'Owner', email: 'owner@payments.invalid', passwordHash: 'unused' },
  { id: 'payment-user-other', firstName: 'Other', lastName: 'Owner', email: 'other@payments.invalid', passwordHash: 'unused' },
];
const token = (user = users[0]) => jwt.sign({}, process.env.SECRET, { algorithm: 'HS256', subject: user.id, expiresIn: '1h' });
const auth = (operation, user = users[0]) => operation.set('Authorization', `Bearer ${token(user)}`);
const normalizedRequest = checkoutRequestSchema.parse({
  items: [{ productId: 'featured-rosemary', quantity: 1 }],
  delivery: {
    recipientName: 'Payment Owner', phone: '08012345678', addressLine1: '1 Test Road',
    cityOrLga: 'Ikeja', state: 'Lagos', country: 'Nigeria',
  },
});
let sequence = 0;
let providerSequence = 4_099_260_000;

const createOrder = async (user = users[0], overrides = {}) => {
  sequence += 1;
  const result = await createPendingOrder({
    authenticatedUserId: user.id,
    idempotencyKey: `payment-order-${sequence}`,
    request: normalizedRequest,
  });
  if (Object.keys(overrides).length) {
    await prisma.order.update({ where: { id: result.order.id }, data: overrides });
  }
  return prisma.order.findUniqueOrThrow({ where: { id: result.order.id }, include: { user: true, items: true, payments: true } });
};

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
});
const mockInitialize = (capture) => async (url, options) => {
  const body = JSON.parse(options.body);
  capture?.({ url, options, body });
  return jsonResponse({ status: true, data: {
    authorization_url: `https://checkout.paystack.com/${body.reference}`,
    reference: body.reference,
    access_code: 'safe-access-code',
  } });
};
const providerData = (order, payment, overrides = {}) => ({
  id: ++providerSequence,
  domain: 'test',
  status: 'success',
  reference: payment.reference,
  amount: Number(order.totalKobo),
  currency: 'NGN',
  paid_at: '2026-08-29T10:00:00.000Z',
  metadata: { orderId: order.id },
  customer: { email: order.user.email },
  ...overrides,
});
const initialize = async (order) => auth(request(app).post(`/api/orders/${order.id}/payments/initialize`));
const verify = async (order) => auth(request(app).post(`/api/orders/${order.id}/payments/verify`));

before(async () => {
  assert.equal(await prisma.user.count(), 0);
  await synchronizeProducts({ db: prisma });
  await prisma.user.createMany({ data: users });
});
beforeEach(() => { globalThis.fetch = undefined; });
after(async () => {
  delete globalThis.fetch;
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

test('initialization requires authentication and does not enumerate missing or unowned orders', async () => {
  const owned = await createOrder();
  const unauthenticated = await request(app).post(`/api/orders/${owned.id}/payments/initialize`);
  const unowned = await auth(request(app).post(`/api/orders/${owned.id}/payments/initialize`), users[1]);
  const missing = await auth(request(app).post('/api/orders/missing-order/payments/initialize'));
  assert.equal(unauthenticated.status, 401);
  assert.equal(unowned.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(unowned.body, missing.body);
});

test('initialization rejects cancelled and structurally empty orders without provider calls', async () => {
  const cancelled = await createOrder(users[0], { status: 'CANCELLED' });
  const empty = await prisma.order.create({ data: {
    orderNumber: `EMPTY-${++sequence}`, userId: users[0].id, idempotencyKey: `empty-${sequence}`,
    subtotalKobo: 100n, totalKobo: 100n, recipientName: 'Empty Order', phone: '+2348012345678',
    addressLine1: '1 Empty Road', cityOrLga: 'Ikeja', state: 'Lagos',
    payments: { create: { provider: 'PAYSTACK', reference: `EMPTYREF-${sequence}`, expectedAmountKobo: 100n, status: 'UNPAID' } },
  } });
  assert.equal((await initialize(cancelled)).status, 409);
  assert.equal((await initialize(empty)).status, 409);
});

test('successful initialization uses server email and amount and duplicate clicks reuse one attempt', async () => {
  const order = await createOrder();
  const calls = [];
  globalThis.fetch = mockInitialize((call) => calls.push(call));
  const [first, duplicate] = await Promise.all([initialize(order), initialize(order)]);
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.email, order.user.email);
  assert.equal(calls[0].body.amount, String(order.totalKobo));
  assert.equal(calls[0].body.currency, 'NGN');
  assert.equal(JSON.parse(calls[0].body.metadata).orderId, order.id);
  assert.match(calls[0].body.callback_url, /^http:\/\/localhost:5174\/payments\/paystack\/callback\?orderId=/);
  assert.equal(first.body.reference, duplicate.body.reference);
  assert.match(first.body.authorizationUrl, /^https:\/\/checkout\.paystack\.com\//);
  const stored = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  assert.equal(stored.status, 'INITIALIZED');
  assert.equal(stored.initializedAt instanceof Date, true);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'PENDING');
});

test('initialization handles timeout, network failure and malformed provider output without marking paid', async () => {
  const cases = [
    [Object.assign(new Error('aborted'), { name: 'AbortError' }), 'PAYSTACK_TIMEOUT'],
    [new Error('network down'), 'PAYSTACK_UNAVAILABLE'],
  ];
  for (const [failure, code] of cases) {
    const order = await createOrder();
    globalThis.fetch = async () => { throw failure; };
    const response = await initialize(order);
    assert.equal(response.body.code, code);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, 'UNPAID');
  }
  const malformedOrder = await createOrder();
  globalThis.fetch = async () => jsonResponse({ status: true, data: { reference: 'wrong', authorization_url: 'https://evil.invalid' } });
  const malformed = await initialize(malformedOrder);
  assert.equal(malformed.body.code, 'PAYSTACK_MALFORMED_RESPONSE');
});

async function initializedOrder() {
  const order = await createOrder();
  globalThis.fetch = mockInitialize();
  assert.equal((await initialize(order)).status, 200);
  return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { user: true, items: true, payments: true } });
}

test('successful verification atomically marks payment and order paid and duplicate verification is idempotent', async () => {
  const order = await initializedOrder();
  const payment = order.payments[0];
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse({ status: true, data: providerData(order, payment) }); };
  const first = await verify(order);
  assert.equal(first.status, 200);
  assert.equal(first.body.verified, true);
  const [storedOrder, storedPayment] = await Promise.all([
    prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
  ]);
  assert.equal(storedOrder.status, 'PAID');
  assert.equal(storedOrder.paymentStatus, 'PAID');
  assert.equal(storedPayment.status, 'PAID');
  assert.match(storedPayment.providerTransactionId, /^\d+$/);
  assert.equal(storedPayment.paidAt?.toISOString(), '2026-08-29T10:00:00.000Z');
  const duplicate = await verify(order);
  assert.equal(duplicate.body.verified, true);
  assert.equal(calls, 1);
  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 1);
});

test('pending and failed verification preserve safe states and never mark the order paid', async () => {
  for (const [providerStatus, expected] of [['pending', 'PENDING'], ['failed', 'FAILED']]) {
    const order = await initializedOrder();
    const payment = order.payments[0];
    globalThis.fetch = async () => jsonResponse({ status: true, data: providerData(order, payment, { status: providerStatus, paid_at: null }) });
    const response = await verify(order);
    assert.equal(response.status, 200);
    assert.equal(response.body.verified, false);
    assert.equal(response.body.payment.status, expected);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'PENDING');
  }
});

test('verification rejects mismatched amount, currency and reference without changing successful state', async () => {
  const mismatches = [
    (order, payment) => providerData(order, payment, { amount: Number(order.totalKobo) + 1 }),
    (order, payment) => providerData(order, payment, { currency: 'USD' }),
    (order, payment) => providerData(order, payment, { reference: 'DIFFERENT-REFERENCE' }),
  ];
  for (const mismatch of mismatches) {
    const order = await initializedOrder();
    const payment = order.payments[0];
    globalThis.fetch = async () => jsonResponse({ status: true, data: mismatch(order, payment) });
    const response = await verify(order);
    assert.equal(response.status, 422);
    assert.equal(response.body.code, 'PAYMENT_MISMATCH');
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'PENDING');
  }
});

const signedWebhook = (event, signature) => request(app)
  .post('/api/payments/paystack/webhook')
  .set('Content-Type', 'application/json')
  .set('x-paystack-signature', signature)
  .send(JSON.stringify(event));

test('webhook rejects invalid signatures and safely handles unknown references', async () => {
  const event = { event: 'charge.success', data: { reference: 'UNKNOWN-REFERENCE' } };
  assert.equal((await signedWebhook(event, '0'.repeat(128))).status, 401);
  const raw = JSON.stringify(event);
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  const unknown = await signedWebhook(event, signature);
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.handled, false);
});

test('valid charge.success webhook completes atomically and duplicate delivery is idempotent', async () => {
  const order = await initializedOrder();
  const event = { event: 'charge.success', data: providerData(order, order.payments[0]) };
  const raw = JSON.stringify(event);
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  const first = await signedWebhook(event, signature);
  const duplicate = await signedWebhook(event, signature);
  assert.equal(first.status, 200);
  assert.equal(first.body.handled, true);
  assert.equal(duplicate.status, 200);
  assert.equal(await prisma.payment.count({ where: { orderId: order.id, status: 'PAID' } }), 1);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'PAID');
});
