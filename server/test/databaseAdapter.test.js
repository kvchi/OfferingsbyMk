import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { Prisma, PrismaClient } from '@prisma/client';
import { applyTrackedMigrations, readMigrations } from '../scripts/tursoMigrations.js';

if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== 'file:./test.db') {
  throw new Error('Adapter tests require the isolated test database runner.');
}

const serverRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const databasePath = resolve(serverRoot, 'prisma', 'adapter-test.db').replaceAll('\\', '/');
const libsql = createClient({ url: `file:${databasePath}` });
const prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
const userId = 'adapter-user';
const migrations = readMigrations(resolve(serverRoot, 'prisma', 'migrations'));

before(async () => {
  const first = await applyTrackedMigrations({ client: libsql, migrations });
  const second = await applyTrackedMigrations({ client: libsql, migrations });
  assert.deepEqual(first, { applied: migrations.length, skipped: 0, total: migrations.length });
  assert.deepEqual(second, { applied: 0, skipped: migrations.length, total: migrations.length });
});

test('migration tracking rejects changed SQL instead of repeating an applied migration', async () => {
  await assert.rejects(
    applyTrackedMigrations({
      client: libsql,
      migrations: [{ ...migrations[0], checksum: 'different-checksum' }],
    }),
    /no longer matches/,
  );
});

after(async () => {
  await prisma.$disconnect();
});

test('libSQL adapter preserves normal queries, field types, indexes, and unique constraints', async () => {
  await prisma.user.create({
    data: {
      id: userId,
      firstName: 'Adapter',
      lastName: 'Test',
      email: 'adapter-test@shopsphare.invalid',
      passwordHash: 'not-a-password',
    },
  });
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  assert.equal(stored.authVersion, 0);
  assert.ok(stored.createdAt instanceof Date);

  await assert.rejects(
    prisma.user.create({ data: { ...stored, id: 'duplicate-email', createdAt: undefined, updatedAt: undefined } }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );

  const indexes = await prisma.$queryRawUnsafe('PRAGMA index_list("Order")');
  assert.ok(indexes.some(({ name }) => name === 'Order_userId_idempotencyKey_key'));
});

test('nested order writes remain atomic and preserve BigInt snapshots', async () => {
  await prisma.category.create({ data: { id: 'adapter-category', name: 'Adapter', slug: 'adapter' } });
  await prisma.product.create({
    data: { id: 'adapter-product', categoryId: 'adapter-category', title: 'Adapter Product', priceKobo: 250_000 },
  });
  const order = await prisma.order.create({
    data: {
      id: 'adapter-order',
      orderNumber: 'ADAPTER-ORDER',
      userId,
      idempotencyKey: 'adapter-idempotency',
      subtotalKobo: 500_000n,
      totalKobo: 500_000n,
      recipientName: 'Adapter Test',
      phone: '+2348000000000',
      addressLine1: 'Test address',
      cityOrLga: 'Test city',
      state: 'Test state',
      items: {
        create: {
          productId: 'adapter-product',
          productIdSnapshot: 'adapter-product',
          productTitleSnapshot: 'Adapter Product',
          unitPriceKobo: 250_000,
          quantity: 2,
          lineTotalKobo: 500_000n,
        },
      },
      payments: {
        create: {
          provider: 'PAYSTACK',
          reference: 'ADAPTER-PAYMENT',
          expectedAmountKobo: 500_000n,
          status: 'UNPAID',
        },
      },
    },
    include: { items: true, payments: true },
  });
  assert.equal(order.items[0].lineTotalKobo, 500_000n);
  assert.equal(order.payments[0].expectedAmountKobo, 500_000n);

  await assert.rejects(
    prisma.order.create({
      data: {
        orderNumber: 'ADAPTER-DUPLICATE', userId, idempotencyKey: 'adapter-idempotency',
        subtotalKobo: 1n, totalKobo: 1n, recipientName: 'Test', phone: '+2348000000000',
        addressLine1: 'Test', cityOrLga: 'Test', state: 'Test',
      },
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
  );
});

test('interactive and batch transactions commit and roll back atomically', async () => {
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { authVersion: { increment: 1 } } });
      await tx.payment.update({ where: { reference: 'ADAPTER-PAYMENT' }, data: { status: 'PAID' } });
      throw new Error('intentional rollback');
    }),
    /intentional rollback/,
  );
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).authVersion, 0);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { reference: 'ADAPTER-PAYMENT' } })).status, 'UNPAID');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { authVersion: { increment: 1 } } });
    await tx.passwordResetToken.create({
      data: {
        id: 'adapter-reset', userId, tokenHash: 'adapter-token-hash',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
  });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).authVersion, 1);
  assert.ok(await prisma.passwordResetToken.findUnique({ where: { tokenHash: 'adapter-token-hash' } }));

  await prisma.$transaction([
    prisma.payment.update({ where: { reference: 'ADAPTER-PAYMENT' }, data: { status: 'INITIALIZED' } }),
    prisma.order.update({ where: { id: 'adapter-order' }, data: { paymentStatus: 'INITIALIZED' } }),
  ]);
  const [payment, order] = await Promise.all([
    prisma.payment.findUniqueOrThrow({ where: { reference: 'ADAPTER-PAYMENT' } }),
    prisma.order.findUniqueOrThrow({ where: { id: 'adapter-order' } }),
  ]);
  assert.equal(payment.status, 'INITIALIZED');
  assert.equal(order.paymentStatus, 'INITIALIZED');
});
