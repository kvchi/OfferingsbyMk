import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('./client', () => ({ default: api }));

import { initializeOrderPayment, isSafePaystackAuthorizationUrl, verifyOrderPayment } from './payments';

beforeEach(() => vi.clearAllMocks());

const order = { id: 'order-12345678', orderNumber: 'SS-20260829-TEST', status: 'PAID', paymentStatus: 'PAID', totalKobo: 1_500_000, currency: 'NGN' };
const payment = { reference: 'SSPAY-12345678', status: 'PAID', paidAt: '2026-08-29T10:00:00.000Z' };

describe('payment API contracts', () => {
  it('accepts only the hosted Paystack HTTPS authorization origin', () => {
    expect(isSafePaystackAuthorizationUrl('https://checkout.paystack.com/code')).toBe(true);
    for (const url of ['http://checkout.paystack.com/code', 'https://checkout.paystack.com.evil.invalid/code', 'https://evil.invalid/code', 'not-a-url']) {
      expect(isSafePaystackAuthorizationUrl(url)).toBe(false);
    }
  });

  it('initializes and verifies through order-scoped POST endpoints', async () => {
    api.post
      .mockResolvedValueOnce({ data: { testMode: true, authorizationUrl: 'https://checkout.paystack.com/code', reference: payment.reference } })
      .mockResolvedValueOnce({ data: { verified: true, order, payment } });
    await expect(initializeOrderPayment(order.id)).resolves.toMatchObject({ testMode: true, reference: payment.reference });
    await expect(verifyOrderPayment(order.id)).resolves.toEqual({ verified: true, order, payment });
    expect(api.post).toHaveBeenNthCalledWith(1, `/api/orders/${order.id}/payments/initialize`);
    expect(api.post).toHaveBeenNthCalledWith(2, `/api/orders/${order.id}/payments/verify`);
  });

  it('rejects unsafe initialization and malformed verification responses', async () => {
    api.post
      .mockResolvedValueOnce({ data: { testMode: true, authorizationUrl: 'https://evil.invalid/code', reference: payment.reference } })
      .mockResolvedValueOnce({ data: { verified: true, order: { ...order, totalKobo: '1500000' }, payment } });
    await expect(initializeOrderPayment(order.id)).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
    await expect(verifyOrderPayment(order.id)).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('normalizes provider timeout, authentication and network failures', async () => {
    api.post
      .mockRejectedValueOnce({ code: 'ECONNABORTED' })
      .mockRejectedValueOnce({ response: { status: 401, data: {} } })
      .mockRejectedValueOnce({ request: {} });
    await expect(initializeOrderPayment(order.id)).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(initializeOrderPayment(order.id)).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
    await expect(initializeOrderPayment(order.id)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
