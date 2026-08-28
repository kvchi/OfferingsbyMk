export const SUPPORTED_CURRENCY = 'NGN';
export const SUPPORTED_COUNTRY = 'Nigeria';
export const MAX_CART_QUANTITY = 99;
export const MAX_DATABASE_INTEGER = 2_147_483_647;

export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'UNPAID',
  INITIALIZED: 'INITIALIZED',
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
});

export const PAYMENT_PROVIDER = Object.freeze({
  PAYSTACK: 'PAYSTACK',
});

export const ORDER_STATUSES = new Set(Object.values(ORDER_STATUS));
export const PAYMENT_STATUSES = new Set(Object.values(PAYMENT_STATUS));
export const SUPPORTED_CURRENCIES = new Set([SUPPORTED_CURRENCY]);
export const PAYMENT_PROVIDERS = new Set(Object.values(PAYMENT_PROVIDER));

const orderTransitions = new Map([
  [ORDER_STATUS.PENDING, new Set([ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED])],
  [ORDER_STATUS.PAID, new Set()],
  [ORDER_STATUS.CANCELLED, new Set()],
]);

const paymentTransitions = new Map([
  [PAYMENT_STATUS.UNPAID, new Set([PAYMENT_STATUS.INITIALIZED])],
  [PAYMENT_STATUS.INITIALIZED, new Set([PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED])],
  [PAYMENT_STATUS.PENDING, new Set([PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED])],
  [PAYMENT_STATUS.PAID, new Set()],
  [PAYMENT_STATUS.FAILED, new Set()],
]);

export function assertAllowedValue(value, allowedValues, fieldName) {
  if (!allowedValues.has(value)) throw new TypeError(`Invalid ${fieldName}: ${value}`);
  return value;
}

export function assertOrderStatusTransition(currentStatus, nextStatus) {
  assertAllowedValue(currentStatus, ORDER_STATUSES, 'order status');
  assertAllowedValue(nextStatus, ORDER_STATUSES, 'order status');
  if (currentStatus !== nextStatus && !orderTransitions.get(currentStatus).has(nextStatus)) {
    throw new TypeError(`Invalid order status transition: ${currentStatus} -> ${nextStatus}`);
  }
  return nextStatus;
}

export function assertPaymentStatusTransition(currentStatus, nextStatus) {
  assertAllowedValue(currentStatus, PAYMENT_STATUSES, 'payment status');
  assertAllowedValue(nextStatus, PAYMENT_STATUSES, 'payment status');
  if (currentStatus !== nextStatus && !paymentTransitions.get(currentStatus).has(nextStatus)) {
    throw new TypeError(`Invalid payment status transition: ${currentStatus} -> ${nextStatus}`);
  }
  return nextStatus;
}
