import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { commerceCategories, commerceProducts } from '../../shared/commerceCatalog.mjs';
import { prisma } from '../config/prisma.js';
import {
  deactivateProduct,
  synchronizeProducts,
  validateCommerceCatalog,
} from '../commerce/catalog.js';
import {
  ORDER_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
  assertOrderStatusTransition,
  assertPaymentStatusTransition,
} from '../commerce/constants.js';
import { findOwnedOrder } from '../commerce/orders.js';
import {
  assertNonNegativeKobo,
  assertPositiveKobo,
  assertProductPriceKobo,
  assertQuantity,
  multiplyKobo,
  toDatabaseBigInt,
} from '../commerce/validation.js';

if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== 'file:./test.db') {
  throw new Error('Commerce tests require the isolated test database runner');
}

const userIds = ['commerce-user-a', 'commerce-user-b'];
const orderIds = [];

const makeOrderData = (userId, suffix, overrides = {}) => ({
  orderNumber: `ORDER-${suffix}`,
  userId,
  idempotencyKey: `idempotency-${suffix}`,
  subtotalKobo: 1_500_000n,
  shippingKobo: 0n,
  totalKobo: 1_500_000n,
  recipientName: 'Commerce Tester',
  phone: '+2348012345678',
  addressLine1: '1 Test Street',
  addressLine2: null,
  cityOrLga: 'Ikeja',
  state: 'Lagos',
  postalCode: null,
  ...overrides,
});

before(async () => {
  assert.equal(await prisma.user.count(), 0, 'authentication tests must leave users clean');
});

after(async () => {
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test('forward migration creates the commerce tables on a fresh isolated database', async () => {
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name IN ('Category', 'Product', 'Order', 'OrderItem', 'Payment')
    ORDER BY name
  `;
  assert.deepEqual(tables.map(({ name }) => name), ['Category', 'Order', 'OrderItem', 'Payment', 'Product']);
});

test('product synchronization creates the approved five categories and 29 exact products', async () => {
  assert.doesNotThrow(() => JSON.parse(JSON.stringify({
    categories: commerceCategories,
    products: commerceProducts,
  })));
  for (const product of commerceProducts) {
    assert.deepEqual(
      Object.keys(product).sort(),
      ['active', 'available', 'categoryId', 'currency', 'description', 'id', 'priceKobo', 'title'],
    );
  }

  const result = await synchronizeProducts({ db: prisma });
  assert.deepEqual(result, {
    categories: commerceCategories.length,
    products: commerceProducts.length,
    createdProducts: commerceProducts.length,
    updatedProducts: 0,
  });
  assert.equal(await prisma.category.count(), 5);
  assert.equal(await prisma.product.count(), 29);

  const stored = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  const expected = [...commerceProducts]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, title, priceKobo }) => ({ id, title, priceKobo }));
  assert.deepEqual(
    stored.map(({ id, title, priceKobo }) => ({ id, title, priceKobo })),
    expected,
  );
});

test('synchronization is idempotent and deterministic for intentional commerce changes', async () => {
  const repeated = await synchronizeProducts({ db: prisma });
  assert.equal(repeated.createdProducts, 0);
  assert.equal(repeated.updatedProducts, 29);
  assert.equal(await prisma.product.count(), 29);

  const targetId = 'candle-soy-wax';
  const changedCategories = commerceCategories.map((category) => category.id === 'category-candles' ? {
    ...category,
    name: 'Updated Candles',
    slug: 'updated-candles',
    active: false,
  } : category);
  const changedProducts = commerceProducts.map((product) => product.id === targetId ? {
    ...product,
    title: 'Updated Soy Wax',
    description: 'Intentional synchronization test description.',
    categoryId: 'category-essential-oils',
    priceKobo: product.priceKobo + 100,
    active: false,
    available: false,
  } : product);

  await synchronizeProducts({ db: prisma, categories: changedCategories, products: changedProducts });
  const changedCategory = await prisma.category.findUnique({ where: { id: 'category-candles' } });
  assert.deepEqual(
    { name: changedCategory.name, slug: changedCategory.slug, active: changedCategory.active },
    { name: 'Updated Candles', slug: 'updated-candles', active: false },
  );
  const changed = await prisma.product.findUnique({ where: { id: targetId } });
  assert.deepEqual(
    {
      title: changed.title,
      description: changed.description,
      categoryId: changed.categoryId,
      priceKobo: changed.priceKobo,
      active: changed.active,
      available: changed.available,
    },
    {
      title: 'Updated Soy Wax',
      description: 'Intentional synchronization test description.',
      categoryId: 'category-essential-oils',
      priceKobo: 1_500_100,
      active: false,
      available: false,
    },
  );

  await synchronizeProducts({ db: prisma });
  const restored = await prisma.product.findUnique({ where: { id: targetId } });
  const canonical = commerceProducts.find(({ id }) => id === targetId);
  assert.deepEqual(
    {
      title: restored.title,
      description: restored.description,
      categoryId: restored.categoryId,
      priceKobo: restored.priceKobo,
      active: restored.active,
      available: restored.available,
    },
    {
      title: canonical.title,
      description: canonical.description ?? null,
      categoryId: canonical.categoryId,
      priceKobo: canonical.priceKobo,
      active: canonical.active,
      available: canonical.available,
    },
  );
});

test('synchronization never deletes products outside the authoritative catalog', async () => {
  await prisma.category.create({
    data: { id: 'category-manual', name: 'Manual Category', slug: 'manual-category' },
  });
  await prisma.product.create({
    data: {
      id: 'manual-product',
      categoryId: 'category-manual',
      title: 'Manual Product',
      priceKobo: 100,
    },
  });

  await synchronizeProducts({ db: prisma });

  assert.ok(await prisma.product.findUnique({ where: { id: 'manual-product' } }));
  assert.equal(await prisma.product.count(), 30);

  await deactivateProduct({ db: prisma, productId: 'manual-product' });
  await synchronizeProducts({ db: prisma });
  const deactivated = await prisma.product.findUnique({ where: { id: 'manual-product' } });
  assert.equal(deactivated.active, false);
  assert.equal(deactivated.available, false);
});

test('catalog validation rejects invalid IDs, categories and prices before writing', async () => {
  const mutableCategories = commerceCategories.map((category) => ({ ...category }));
  const mutableProducts = commerceProducts.map((product) => ({ ...product }));
  const invalidCatalogs = [
    { categories: mutableCategories, products: [{ ...mutableProducts[0], id: '' }, ...mutableProducts.slice(1)] },
    { categories: mutableCategories, products: [{ ...mutableProducts[0], categoryId: 'missing' }, ...mutableProducts.slice(1)] },
    { categories: mutableCategories, products: [{ ...mutableProducts[0], priceKobo: 0 }, ...mutableProducts.slice(1)] },
    { categories: mutableCategories, products: [{ ...mutableProducts[0], priceKobo: 1.5 }, ...mutableProducts.slice(1)] },
    { categories: mutableCategories, products: [{ ...mutableProducts[0], priceKobo: Number.MAX_SAFE_INTEGER + 1 }, ...mutableProducts.slice(1)] },
    { categories: mutableCategories, products: [mutableProducts[0], { ...mutableProducts[0] }, ...mutableProducts.slice(1)] },
  ];

  for (const catalog of invalidCatalogs) {
    assert.throws(() => validateCommerceCatalog(catalog), TypeError);
  }

  const before = await prisma.product.count();
  await assert.rejects(
    synchronizeProducts({
      db: prisma,
      categories: mutableCategories,
      products: [{ ...mutableProducts[0], priceKobo: -1 }, ...mutableProducts.slice(1)],
    }),
    TypeError,
  );
  assert.equal(await prisma.product.count(), before);
});

test('money, quantity and status helpers reject unsafe values and invalid transitions', () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => assertPositiveKobo(value), TypeError);
  }
  assert.equal(assertNonNegativeKobo(0), 0);
  assert.throws(() => assertNonNegativeKobo(-1), TypeError);
  assert.throws(() => assertProductPriceKobo(2_147_483_648), TypeError);
  assert.throws(() => assertQuantity(0), TypeError);
  assert.throws(() => assertQuantity(100), TypeError);
  assert.equal(multiplyKobo(1_500_000, 2), 3_000_000);
  assert.equal(toDatabaseBigInt(10_622_700_000), 10_622_700_000n);

  assert.equal(assertOrderStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PAID), ORDER_STATUS.PAID);
  assert.throws(() => assertOrderStatusTransition(ORDER_STATUS.PAID, ORDER_STATUS.PENDING), TypeError);
  assert.equal(
    assertPaymentStatusTransition(PAYMENT_STATUS.INITIALIZED, PAYMENT_STATUS.PAID),
    PAYMENT_STATUS.PAID,
  );
  assert.throws(
    () => assertPaymentStatusTransition(PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING),
    TypeError,
  );
});

test('commerce relationships, idempotency and references are protected by the database', async () => {
  await prisma.user.createMany({
    data: userIds.map((id, index) => ({
      id,
      firstName: 'Commerce',
      lastName: `Tester ${index + 1}`,
      email: `commerce-${index + 1}@shopsphare.invalid`,
      passwordHash: 'not-used-by-commerce-tests',
    })),
  });

  const order = await prisma.order.create({ data: makeOrderData(userIds[0], 'A') });
  orderIds.push(order.id);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: 'featured-rosemary' } });
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      productIdSnapshot: product.id,
      productTitleSnapshot: product.title,
      unitPriceKobo: product.priceKobo,
      quantity: 1,
      lineTotalKobo: BigInt(product.priceKobo),
    },
  });
  await prisma.payment.createMany({
    data: [
      {
        orderId: order.id,
        provider: PAYMENT_PROVIDER.PAYSTACK,
        reference: 'payment-internal-a1',
        providerReference: 'provider-a1',
        expectedAmountKobo: order.totalKobo,
        status: PAYMENT_STATUS.INITIALIZED,
      },
      {
        orderId: order.id,
        provider: PAYMENT_PROVIDER.PAYSTACK,
        reference: 'payment-internal-a2',
        providerReference: null,
        expectedAmountKobo: order.totalKobo,
        status: PAYMENT_STATUS.FAILED,
        failureMessage: 'Non-sensitive test failure.',
      },
    ],
  });

  const related = await prisma.order.findUnique({
    where: { id: order.id },
    include: { user: true, items: { include: { product: true } }, payments: true },
  });
  assert.equal(related.user.id, userIds[0]);
  assert.equal(related.items[0].product.id, product.id);
  assert.equal(related.payments.length, 2);

  await assert.rejects(
    prisma.category.create({
      data: { id: 'duplicate-category-slug', name: 'Duplicate', slug: 'candles' },
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );

  await assert.rejects(
    prisma.order.create({ data: makeOrderData(userIds[0], 'A-DUPLICATE', { idempotencyKey: 'idempotency-A' }) }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );
  const otherUserOrder = await prisma.order.create({
    data: makeOrderData(userIds[1], 'B', { idempotencyKey: 'idempotency-A' }),
  });
  orderIds.push(otherUserOrder.id);

  await assert.rejects(
    prisma.order.create({ data: makeOrderData(userIds[1], 'A') }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );
  await assert.rejects(
    prisma.payment.create({
      data: {
        orderId: otherUserOrder.id,
        provider: PAYMENT_PROVIDER.PAYSTACK,
        reference: 'payment-internal-a1',
        expectedAmountKobo: otherUserOrder.totalKobo,
        status: PAYMENT_STATUS.INITIALIZED,
      },
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );
  await assert.rejects(
    prisma.payment.create({
      data: {
        orderId: otherUserOrder.id,
        provider: PAYMENT_PROVIDER.PAYSTACK,
        reference: 'payment-internal-b1',
        providerReference: 'provider-a1',
        expectedAmountKobo: otherUserOrder.totalKobo,
        status: PAYMENT_STATUS.INITIALIZED,
      },
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );
});

test('order snapshots survive product edits and ownership helpers use authenticated identity', async () => {
  const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: 'ORDER-A' } });
  const before = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });

  await prisma.product.update({
    where: { id: before.productId },
    data: { title: 'Changed after ordering', priceKobo: before.unitPriceKobo + 500 },
  });

  const after = await prisma.orderItem.findUniqueOrThrow({ where: { id: before.id } });
  assert.equal(after.productIdSnapshot, before.productIdSnapshot);
  assert.equal(after.productTitleSnapshot, before.productTitleSnapshot);
  assert.equal(after.unitPriceKobo, before.unitPriceKobo);
  assert.equal(after.lineTotalKobo, before.lineTotalKobo);

  assert.equal(await findOwnedOrder({ db: prisma, authenticatedUserId: userIds[1], orderId: order.id }), null);
  const owned = await findOwnedOrder({ db: prisma, authenticatedUserId: userIds[0], orderId: order.id });
  assert.equal(owned.id, order.id);

  await synchronizeProducts({ db: prisma });
});

test('restrictive relations prevent deletion of historical users, orders, products and categories', async () => {
  const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: 'ORDER-A' } });
  for (const operation of [
    () => prisma.user.delete({ where: { id: userIds[0] } }),
    () => prisma.order.delete({ where: { id: order.id } }),
    () => prisma.product.delete({ where: { id: 'featured-rosemary' } }),
    () => prisma.category.delete({ where: { id: 'category-herbs-botanicals' } }),
  ]) {
    await assert.rejects(
      operation(),
      (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003',
    );
  }
});

test('Payment has no card-style or raw credential fields', () => {
  const paymentModel = Prisma.dmmf.datamodel.models.find(({ name }) => name === 'Payment');
  assert.ok(paymentModel);
  const fieldNames = new Set(paymentModel.fields.map(({ name }) => name));
  for (const forbidden of [
    'cardNumber',
    'cvv',
    'pin',
    'authorizationToken',
    'authorizationCode',
    'rawCredentials',
    'rawProviderResponse',
  ]) {
    assert.equal(fieldNames.has(forbidden), false, `${forbidden} must not exist on Payment`);
  }
});
