import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseConfig } from '../config/database.js';
import { loadEnv } from '../config/env.js';

const common = {
  SECRET: 'deployment-test-secret-at-least-32-characters',
  CORS_ORIGINS: 'https://offeringsby-mk.vercel.app',
  PAYSTACK_CALLBACK_URL: 'https://offeringsby-mk.vercel.app/payments/paystack/callback',
  APP_BASE_URL: 'https://offeringsby-mk.vercel.app',
};

const production = {
  ...common,
  NODE_ENV: 'production',
  DATABASE_MODE: 'turso',
  TURSO_DATABASE_URL: 'libsql://database-name.turso.io',
  TURSO_AUTH_TOKEN: 'synthetic-test-token',
  TRUST_PROXY_HOPS: '1',
  EMAIL_DELIVERY_MODE: 'brevo',
  BREVO_API_KEY: 'synthetic-test-api-key',
  BREVO_SENDER_EMAIL: 'verified-sender@example.invalid',
  BREVO_SENDER_NAME: 'OfferingsbyMK',
};

test('local development and isolated tests require explicit SQLite file URLs', () => {
  assert.deepEqual(resolveDatabaseConfig({
    NODE_ENV: 'development', DATABASE_MODE: 'local', DATABASE_URL: 'file:./dev.db',
  }), { mode: 'local', url: 'file:./dev.db' });
  assert.deepEqual(resolveDatabaseConfig({
    NODE_ENV: 'test', DATABASE_MODE: 'local', DATABASE_URL: 'file:./test.db',
  }), { mode: 'local', url: 'file:./test.db' });
  assert.throws(
    () => resolveDatabaseConfig({ NODE_ENV: 'test', DATABASE_MODE: 'local', DATABASE_URL: 'libsql://remote' }),
    /DATABASE_URL/,
  );
});

test('production cannot fall back to a local database and Turso credentials are an inseparable pair', () => {
  assert.throws(() => resolveDatabaseConfig({
    NODE_ENV: 'production', DATABASE_MODE: 'local', DATABASE_URL: 'file:./dev.db',
  }), /DATABASE_MODE/);
  for (const partial of [
    { TURSO_DATABASE_URL: production.TURSO_DATABASE_URL },
    { TURSO_AUTH_TOKEN: production.TURSO_AUTH_TOKEN },
    {},
  ]) {
    assert.throws(() => resolveDatabaseConfig({
      NODE_ENV: 'production', DATABASE_MODE: 'turso', ...partial,
    }), /TURSO_DATABASE_URL, TURSO_AUTH_TOKEN/);
  }
  assert.throws(() => resolveDatabaseConfig({
    ...production, TURSO_DATABASE_URL: 'file:./dev.db',
  }), /TURSO_DATABASE_URL/);
});

test('production environment accepts Turso, Brevo, exact HTTPS origins, and one proxy hop', () => {
  const env = loadEnv(production);
  assert.equal(env.DATABASE_MODE, 'turso');
  assert.deepEqual(env.corsOrigins, ['https://offeringsby-mk.vercel.app']);
  assert.equal(env.TRUST_PROXY_HOPS, 1);
  assert.equal(env.EMAIL_DELIVERY_MODE, 'brevo');
});

test('database configuration does not print credentials', () => {
  const calls = [];
  const methods = ['log', 'info', 'warn', 'error'];
  const originals = Object.fromEntries(methods.map((method) => [method, console[method]]));
  try {
    for (const method of methods) console[method] = (...args) => calls.push([method, ...args]);
    resolveDatabaseConfig(production);
  } finally {
    for (const method of methods) console[method] = originals[method];
  }
  assert.deepEqual(calls, []);
});

test('production rejects preview email and incomplete or invalid Brevo sender settings', () => {
  assert.throws(() => loadEnv({ ...production, EMAIL_DELIVERY_MODE: 'preview' }), /EMAIL_DELIVERY_MODE/);
  assert.throws(() => loadEnv({ ...production, BREVO_API_KEY: '' }), /BREVO_API_KEY/);
  assert.throws(() => loadEnv({ ...production, BREVO_SENDER_EMAIL: 'not-an-email' }), /BREVO_SENDER_EMAIL/);
});
