import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('./client', () => ({ default: api }));

import {
  CheckoutApiError,
  createOrder,
  getOrder,
  normalizeCheckoutError,
  previewCheckout,
} from './checkout';

beforeEach(() => vi.clearAllMocks());

const liveCheckout = {
  delivery: { recipientName: 'Ada Okafor', country: 'Nigeria' },
  lines: [{
    productId: 'featured-rosemary',
    title: 'Rosemary',
    quantity: 1,
    unitPriceKobo: 1_500_000,
    lineTotalKobo: 1_500_000,
  }],
  subtotalKobo: 1_500_000,
  shippingKobo: 0,
  totalKobo: 1_500_000,
  currency: 'NGN',
};

describe('checkout API module', () => {
  it('uses focused endpoints and puts the idempotency key only in the header', async () => {
    const payload = { items: [{ productId: 'featured-rosemary', quantity: 1 }], delivery: { country: 'Nigeria' } };
    api.post.mockResolvedValueOnce({ data: { checkout: liveCheckout } });
    api.post.mockResolvedValueOnce({ data: { replayed: false, order: { id: 'order-1' } } });
    api.get.mockResolvedValueOnce({ data: { order: { id: 'order-1' } } });

    await expect(previewCheckout(payload)).resolves.toEqual(liveCheckout);
    await expect(createOrder(payload, 'attempt-key-001')).resolves.toEqual({ replayed: false, order: { id: 'order-1' } });
    await expect(getOrder('order/unsafe')).resolves.toEqual({ id: 'order-1' });

    expect(api.post).toHaveBeenNthCalledWith(1, '/api/checkout/preview', payload, { signal: undefined });
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/orders', payload, { headers: { 'Idempotency-Key': 'attempt-key-001' } });
    expect(api.get).toHaveBeenCalledWith('/api/orders/order%2Funsafe', { signal: undefined });
  });

  it('normalizes backend, timeout, network and authentication failures', () => {
    expect(normalizeCheckoutError({ response: { status: 409, data: { code: 'IDEMPOTENCY_CONFLICT' } } }).code).toBe('IDEMPOTENCY_CONFLICT');
    expect(normalizeCheckoutError({ code: 'ECONNABORTED' }).code).toBe('TIMEOUT');
    expect(normalizeCheckoutError({ request: {} }).code).toBe('NETWORK_ERROR');
    expect(normalizeCheckoutError({ response: { status: 401, data: {} } }).code).toBe('AUTHENTICATION_REQUIRED');
    expect(normalizeCheckoutError(new CheckoutApiError({ code: 'KNOWN', message: 'Known', status: 400 })).code).toBe('KNOWN');
  });

  it('rejects malformed successful preview responses with a safe recoverable error', async () => {
    api.post.mockResolvedValueOnce({ data: { checkout: { totalKobo: 1_500_000 } } });

    await expect(previewCheckout({ items: [], delivery: {} })).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
      status: 200,
      message: expect.stringMatching(/invalid checkout response/i),
    });
  });
});
