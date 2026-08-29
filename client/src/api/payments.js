import api from './client';
import { CheckoutApiError, normalizeCheckoutError } from './checkout';

const messages = {
  ORDER_NOT_PAYABLE: 'This order is not available for payment.',
  PAYMENT_NOT_CONFIGURED: 'Paystack test mode is not configured yet.',
  LIVE_KEY_REFUSED: 'ShopSphare refused an unsafe live payment configuration.',
  PAYSTACK_TIMEOUT: 'Paystack took too long to respond. Please try again.',
  PAYSTACK_UNAVAILABLE: 'Paystack is temporarily unavailable. Please try again.',
  PAYSTACK_REJECTED: 'Paystack could not start this payment. Please try again.',
  PAYSTACK_MALFORMED_RESPONSE: 'Paystack returned an invalid response. Please try again.',
  PAYMENT_MISMATCH: 'The payment details did not match this order.',
  PAYMENT_NOT_SUCCESSFUL: 'Paystack has not confirmed this payment.',
  PAYMENT_NOT_INITIALIZED: 'This payment has not been initialized.',
  PAYMENT_IN_PROGRESS: 'Payment confirmation is already in progress.',
  MALFORMED_RESPONSE: 'ShopSphare returned an invalid payment response.',
};

const paymentError = (code, status = 200) => new CheckoutApiError({
  code,
  status,
  message: messages[code] || messages.MALFORMED_RESPONSE,
});

const request = async (operation) => {
  try { return await operation(); } catch (error) {
    const normalized = normalizeCheckoutError(error);
    normalized.message = messages[normalized.code] || normalized.message;
    throw normalized;
  }
};

export function isSafePaystackAuthorizationUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.paystack.com'
      && url.username === '' && url.password === '';
  } catch { return false; }
}

const validReference = (value) => typeof value === 'string'
  && /^[A-Za-z0-9.=-]{8,128}$/.test(value);

export const initializeOrderPayment = (orderId) => request(async () => {
  const { data } = await api.post(`/api/orders/${encodeURIComponent(orderId)}/payments/initialize`);
  if (data?.alreadyPaid === true && data?.order?.id === orderId && data.order.paymentStatus === 'PAID') {
    return { alreadyPaid: true, order: data.order, payment: data.payment };
  }
  if (data?.testMode !== true || !validReference(data?.reference)
    || !isSafePaystackAuthorizationUrl(data?.authorizationUrl)) {
    throw paymentError('MALFORMED_RESPONSE');
  }
  return { authorizationUrl: data.authorizationUrl, reference: data.reference, testMode: true };
});

const validateStatusResponse = (data, orderId) => {
  const order = data?.order;
  const payment = data?.payment;
  const validOrder = order?.id === orderId && typeof order.orderNumber === 'string'
    && ['PENDING', 'PAID'].includes(order.status)
    && ['INITIALIZED', 'PENDING', 'FAILED', 'PAID'].includes(order.paymentStatus)
    && Number.isSafeInteger(order.totalKobo) && order.totalKobo > 0 && order.currency === 'NGN';
  const validPayment = payment && validReference(payment.reference)
    && ['INITIALIZED', 'PENDING', 'FAILED', 'PAID'].includes(payment.status)
    && (payment.paidAt === null || !Number.isNaN(new Date(payment.paidAt).getTime()));
  if (typeof data?.verified !== 'boolean' || !validOrder || !validPayment
    || (data.verified && (order.status !== 'PAID' || order.paymentStatus !== 'PAID' || payment.status !== 'PAID'))) {
    throw paymentError('MALFORMED_RESPONSE');
  }
  return { verified: data.verified, order, payment };
};

export const verifyOrderPayment = (orderId) => request(async () => {
  const { data } = await api.post(`/api/orders/${encodeURIComponent(orderId)}/payments/verify`);
  return validateStatusResponse(data, orderId);
});
