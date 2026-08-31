import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./client', () => ({ default: api }));

import { getOrderDetail, getPaidReceipt, listOrders } from './orders';
import { baseOrder, orderState, summaryFrom } from '../test/orderFixtures';

beforeEach(() => vi.clearAllMocks());

describe('customer order API contracts', () => {
  it('validates and newest-first sorts safe list responses', async () => {
    const older = summaryFrom(baseOrder);
    const newer = summaryFrom(baseOrder, { id: 'order-newer-456', orderNumber: 'SS-NEWER', createdAt: '2026-08-30T08:00:00.000Z' });
    api.get.mockResolvedValueOnce({ data: { orders: [older, newer] } });
    await expect(listOrders()).resolves.toEqual([newer, older]);
    expect(api.get).toHaveBeenCalledWith('/api/orders', { signal: undefined });
  });

  it('loads detail and paid receipt through ownership-scoped endpoints', async () => {
    const paid = orderState('paid');
    const receipt = {
      id: paid.id, orderNumber: paid.orderNumber, status: 'PAID', paymentStatus: 'PAID',
      customer: { displayName: 'Ada O.' }, destination: { cityOrLga: 'Ikeja', state: 'Lagos', country: 'Nigeria' },
      lines: paid.lines, subtotalKobo: paid.subtotalKobo, shippingKobo: 0, totalKobo: paid.totalKobo,
      currency: 'NGN', createdAt: paid.createdAt, payment: { provider: 'PAYSTACK', status: 'PAID', paidAt: paid.payment.paidAt },
    };
    api.get.mockResolvedValueOnce({ data: { order: paid } }).mockResolvedValueOnce({ data: { receipt } });
    await expect(getOrderDetail(paid.id)).resolves.toEqual(paid);
    await expect(getPaidReceipt(paid.id)).resolves.toEqual(receipt);
    expect(api.get.mock.calls.map(([url]) => url)).toEqual([`/api/orders/${paid.id}`, `/api/orders/${paid.id}/receipt`]);
  });

  it('rejects malformed successful list, detail, and receipt responses', async () => {
    api.get
      .mockResolvedValueOnce({ data: { orders: [{ ...summaryFrom(baseOrder), totalKobo: '3000000' }] } })
      .mockResolvedValueOnce({ data: { order: { ...baseOrder, subtotalKobo: 1 } } })
      .mockResolvedValueOnce({ data: { receipt: { ...orderState('paid'), payment: { provider: 'PAYSTACK', status: 'PAID', paidAt: null } } } });
    await expect(listOrders()).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
    await expect(getOrderDetail(baseOrder.id)).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
    await expect(getPaidReceipt(baseOrder.id)).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });
});
