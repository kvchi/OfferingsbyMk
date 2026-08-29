import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NIGERIA_STATES } from '../data/nigeriaStates';
import {
  CHECKOUT_ATTEMPT_STORAGE_KEY,
  buildCheckoutPayload,
  clearCheckoutAttempt,
  createCheckoutFingerprint,
  getOrCreateCheckoutAttempt,
  resetCheckoutAttemptForTests,
  validateDelivery,
} from './checkout';

const validDelivery = {
  recipientName: '  Ada   Okafor ',
  phone: '0801 234 5678',
  addressLine1: ' 12   Market Road ',
  addressLine2: '',
  cityOrLga: ' Ikeja ',
  state: 'Lagos',
  postalCode: '100001',
  country: 'Nigeria',
};

beforeEach(() => {
  sessionStorage.clear();
  resetCheckoutAttemptForTests();
});

describe('checkout request validation', () => {
  it('contains all 36 Nigerian states plus the FCT', () => {
    expect(NIGERIA_STATES).toHaveLength(37);
    expect(NIGERIA_STATES).toContain('Federal Capital Territory');
  });

  it('normalizes valid delivery data and omits empty optional values', () => {
    const result = validateDelivery(validDelivery);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      recipientName: 'Ada Okafor',
      phone: '+2348012345678',
      addressLine1: '12 Market Road',
      cityOrLga: 'Ikeja',
      state: 'Lagos',
      postalCode: '100001',
      country: 'Nigeria',
    });
  });

  it('rejects invalid delivery values and unsafe text', () => {
    const result = validateDelivery({
      ...validDelivery,
      recipientName: '<Ada>',
      phone: '+12025550123',
      state: 'Not a state',
      postalCode: '123',
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(['recipientName', 'phone', 'state', 'postalCode']));
  });

  it('builds deterministic item-only cart requests', () => {
    const payload = buildCheckoutPayload([
      { productId: 'featured-rosemary', quantity: 2, product: { title: 'Forged' }, lineTotalKobo: 1 },
      { productId: 'candle-soy-wax', quantity: 1, priceKobo: 1 },
    ], validateDelivery(validDelivery).data);
    expect(payload.items).toEqual([
      { productId: 'candle-soy-wax', quantity: 1 },
      { productId: 'featured-rosemary', quantity: 2 },
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/title|price|total|currency|userId|status/i);
  });
});

describe('checkout idempotency attempts', () => {
  it('reuses one key for the same fingerprint and replaces it for material changes', () => {
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');
    const first = getOrCreateCheckoutAttempt('fingerprint-a');
    const retry = getOrCreateCheckoutAttempt('fingerprint-a');
    const changed = getOrCreateCheckoutAttempt('fingerprint-b');

    expect(retry.key).toBe(first.key);
    expect(changed.key).not.toBe(first.key);
    expect(randomUUID).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY))).toEqual(changed);
  });

  it('survives unavailable sessionStorage using an in-memory retry key', () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error('denied'); }),
      setItem: vi.fn(() => { throw new Error('denied'); }),
      removeItem: vi.fn(() => { throw new Error('denied'); }),
    };
    const first = getOrCreateCheckoutAttempt('fingerprint-a', storage);
    expect(getOrCreateCheckoutAttempt('fingerprint-a', storage).key).toBe(first.key);
    expect(() => clearCheckoutAttempt(storage)).not.toThrow();
  });

  it('clears the attempt only when explicitly requested', () => {
    const payload = buildCheckoutPayload(
      [{ productId: 'featured-rosemary', quantity: 1 }],
      validateDelivery(validDelivery).data,
    );
    getOrCreateCheckoutAttempt(createCheckoutFingerprint(payload));
    const stored = sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(stored).not.toContain('Ada Okafor');
    expect(stored).not.toContain('Market Road');
    clearCheckoutAttempt();
    expect(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
  });
});
