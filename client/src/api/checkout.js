import api from './client';

const defaultMessages = {
  VALIDATION_ERROR: 'Please review the checkout information and try again.',
  UNKNOWN_PRODUCT: 'A product in your cart is no longer available. Return to Shop and update your cart.',
  INACTIVE_PRODUCT: 'A product in your cart is no longer active. Return to Shop and update your cart.',
  UNAVAILABLE_PRODUCT: 'A product in your cart is currently unavailable. Return to Shop and update your cart.',
  IDEMPOTENCY_CONFLICT: 'This checkout attempt was already used for different order information.',
  ORDER_NOT_FOUND: 'We could not find that order in your account.',
  AUTHENTICATION_REQUIRED: 'Your session has expired. Please log in again.',
  TIMEOUT: 'The request took too long. Check your connection and try again.',
  NETWORK_ERROR: 'We could not reach ShopSphare. Check your connection and try again.',
  MALFORMED_RESPONSE: 'ShopSphare returned an invalid checkout response. Please try again.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
};

export class CheckoutApiError extends Error {
  constructor({ code, message, status }) {
    super(message);
    this.name = 'CheckoutApiError';
    this.code = code;
    this.status = status;
  }
}

export function normalizeCheckoutError(error) {
  if (error instanceof CheckoutApiError) return error;

  const status = error?.response?.status;
  const backendCode = error?.response?.data?.code;
  let code = backendCode || 'INTERNAL_ERROR';
  if (status === 401) code = 'AUTHENTICATION_REQUIRED';
  else if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') code = 'TIMEOUT';
  else if (!error?.response) code = 'NETWORK_ERROR';

  return new CheckoutApiError({
    code,
    status,
    message: defaultMessages[code] || defaultMessages.INTERNAL_ERROR,
  });
}

const request = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    throw normalizeCheckoutError(error);
  }
};

const isSafeInteger = (value, { positive = false } = {}) =>
  Number.isSafeInteger(value) && (positive ? value > 0 : value >= 0);

const validateCheckoutResponse = (checkout) => {
  const validLines = Array.isArray(checkout?.lines) && checkout.lines.length > 0
    && checkout.lines.every((line) =>
      typeof line?.productId === 'string'
      && typeof line?.title === 'string'
      && Number.isInteger(line?.quantity)
      && line.quantity >= 1
      && line.quantity <= 99
      && isSafeInteger(line?.unitPriceKobo, { positive: true })
      && isSafeInteger(line?.lineTotalKobo, { positive: true }));
  const validTotals = isSafeInteger(checkout?.subtotalKobo, { positive: true })
    && isSafeInteger(checkout?.shippingKobo)
    && isSafeInteger(checkout?.totalKobo, { positive: true })
    && checkout.totalKobo === checkout.subtotalKobo + checkout.shippingKobo;

  if (!checkout || typeof checkout.delivery !== 'object' || checkout.delivery === null
    || checkout.currency !== 'NGN' || !validLines || !validTotals) {
    throw new CheckoutApiError({
      code: 'MALFORMED_RESPONSE',
      message: defaultMessages.MALFORMED_RESPONSE,
      status: 200,
    });
  }
  return checkout;
};

export const previewCheckout = (payload, { signal } = {}) => request(async () => {
  const { data } = await api.post('/api/checkout/preview', payload, { signal });
  return validateCheckoutResponse(data?.checkout);
});

export const createOrder = (payload, idempotencyKey) => request(async () => {
  const { data } = await api.post('/api/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return { order: data.order, replayed: data.replayed };
});

export const getOrder = (orderId, { signal } = {}) => request(async () => {
  const { data } = await api.get(`/api/orders/${encodeURIComponent(orderId)}`, { signal });
  return data.order;
});
