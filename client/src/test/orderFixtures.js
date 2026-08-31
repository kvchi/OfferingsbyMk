export const baseOrder = {
  id: 'order-owned-123',
  orderNumber: 'SS-20260829-ORDER001',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  lines: [{
    productId: 'featured-rosemary',
    title: 'Historical Rosemary Snapshot',
    quantity: 2,
    unitPriceKobo: 1_500_000,
    lineTotalKobo: 3_000_000,
  }],
  delivery: {
    recipientName: 'Ada Okafor',
    phone: '+2348012345678',
    addressLine1: '12 Market Road',
    cityOrLga: 'Ikeja',
    state: 'Lagos',
    country: 'Nigeria',
  },
  subtotalKobo: 3_000_000,
  shippingKobo: 0,
  totalKobo: 3_000_000,
  currency: 'NGN',
  createdAt: '2026-08-29T08:00:00.000Z',
  payment: { provider: 'PAYSTACK', status: 'UNPAID', initializedAt: null, paidAt: null },
  availableActions: { payment: 'INITIALIZE', receipt: false },
};

export const summaryFrom = (order, overrides = {}) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  totalKobo: order.totalKobo,
  currency: order.currency,
  itemCount: order.lines.length,
  createdAt: order.createdAt,
  payment: order.payment,
  availableActions: order.availableActions,
  ...overrides,
});

export const orderState = (kind) => {
  if (kind === 'initialized') return {
    ...baseOrder,
    paymentStatus: 'INITIALIZED',
    payment: { provider: 'PAYSTACK', status: 'INITIALIZED', initializedAt: '2026-08-29T08:05:00.000Z', paidAt: null },
    availableActions: { payment: 'VERIFY', receipt: false },
  };
  if (kind === 'failed') return {
    ...baseOrder,
    paymentStatus: 'FAILED',
    payment: { provider: 'PAYSTACK', status: 'FAILED', initializedAt: '2026-08-29T08:05:00.000Z', paidAt: null },
    availableActions: { payment: 'INITIALIZE', receipt: false },
  };
  if (kind === 'cancelled') return {
    ...baseOrder,
    status: 'CANCELLED',
    availableActions: { payment: 'NONE', receipt: false },
  };
  if (kind === 'paid') return {
    ...baseOrder,
    status: 'PAID',
    paymentStatus: 'PAID',
    payment: { provider: 'PAYSTACK', status: 'PAID', initializedAt: '2026-08-29T08:05:00.000Z', paidAt: '2026-08-29T08:10:00.000Z' },
    availableActions: { payment: 'NONE', receipt: true },
  };
  if (kind === 'unknown') return {
    ...baseOrder,
    status: 'REVIEW',
    paymentStatus: 'MYSTERY',
    payment: null,
    availableActions: { payment: 'NONE', receipt: false },
  };
  return baseOrder;
};
