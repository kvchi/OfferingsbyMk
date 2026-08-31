import api from './client';
import { CheckoutApiError, normalizeCheckoutError } from './checkout';

const messages = {
  ORDER_NOT_FOUND: 'We could not find that order in your account.',
  RECEIPT_NOT_AVAILABLE: 'A paid receipt is not available for this order.',
  AUTHENTICATION_REQUIRED: 'Your session has expired. Please log in again.',
  TIMEOUT: 'The request took too long. Check your connection and try again.',
  NETWORK_ERROR: 'We could not reach ShopSphare. Check your connection and try again.',
  MALFORMED_RESPONSE: 'ShopSphare returned invalid order information. Please try again.',
};

const malformed = () => new CheckoutApiError({
  code: 'MALFORMED_RESPONSE',
  status: 200,
  message: messages.MALFORMED_RESPONSE,
});

const request = async (operation) => {
  try { return await operation(); } catch (error) {
    const normalized = normalizeCheckoutError(error);
    normalized.message = messages[normalized.code] || normalized.message;
    throw normalized;
  }
};

const validText = (value) => typeof value === 'string' && value.trim().length > 0;
const validDate = (value, nullable = false) => (nullable && value === null)
  || (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()));
const validKobo = (value, positive = false) => Number.isSafeInteger(value)
  && (positive ? value > 0 : value >= 0);

const validateActions = (value) => value
  && ['NONE', 'INITIALIZE', 'VERIFY'].includes(value.payment)
  && typeof value.receipt === 'boolean';

const validatePayment = (value) => value === null || (
  value
  && validText(value.provider)
  && validText(value.status)
  && validDate(value.initializedAt, true)
  && validDate(value.paidAt, true)
);

const validateBase = (value) => value
  && validText(value.id)
  && validText(value.orderNumber)
  && validText(value.status)
  && validText(value.paymentStatus)
  && value.currency === 'NGN'
  && validKobo(value.totalKobo, true)
  && validDate(value.createdAt);

export function validateOrderSummary(value) {
  if (!validateBase(value) || !Number.isInteger(value.itemCount) || value.itemCount < 1
    || !validatePayment(value.payment) || !validateActions(value.availableActions)) throw malformed();
  return value;
}

const validateLine = (line) => line
  && validText(line.productId)
  && validText(line.title)
  && Number.isInteger(line.quantity)
  && line.quantity > 0
  && validKobo(line.unitPriceKobo, true)
  && validKobo(line.lineTotalKobo, true)
  && line.lineTotalKobo === line.unitPriceKobo * line.quantity;

const validateTotals = (value) => validKobo(value.subtotalKobo, true)
  && validKobo(value.shippingKobo)
  && value.subtotalKobo + value.shippingKobo === value.totalKobo;

export function validateOrderDetail(value) {
  const linesValid = Array.isArray(value?.lines) && value.lines.length > 0
    && value.lines.every(validateLine)
    && value.lines.reduce((sum, line) => sum + line.lineTotalKobo, 0) === value.subtotalKobo;
  const delivery = value?.delivery;
  const deliveryValid = delivery && ['recipientName', 'phone', 'addressLine1', 'cityOrLga', 'state', 'country']
    .every((key) => validText(delivery[key]));
  if (!validateBase(value) || !linesValid || !validateTotals(value) || !deliveryValid
    || !validatePayment(value.payment) || !validateActions(value.availableActions)) throw malformed();
  return value;
}

export function validatePaidReceipt(value) {
  const linesValid = Array.isArray(value?.lines) && value.lines.length > 0
    && value.lines.every(validateLine)
    && value.lines.reduce((sum, line) => sum + line.lineTotalKobo, 0) === value.subtotalKobo;
  const destination = value?.destination;
  const payment = value?.payment;
  if (!validateBase(value) || value.status !== 'PAID' || value.paymentStatus !== 'PAID'
    || !linesValid || !validateTotals(value)
    || !validText(value.customer?.displayName)
    || !destination || !['cityOrLga', 'state', 'country'].every((key) => validText(destination[key]))
    || !payment || !validText(payment.provider) || payment.status !== 'PAID' || !validDate(payment.paidAt)) {
    throw malformed();
  }
  return value;
}

export const listOrders = ({ signal } = {}) => request(async () => {
  const { data } = await api.get('/api/orders', { signal });
  if (!Array.isArray(data?.orders)) throw malformed();
  return data.orders.map(validateOrderSummary).sort((left, right) => {
    const byDate = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return byDate || right.id.localeCompare(left.id);
  });
});

export const getOrderDetail = (orderId, { signal } = {}) => request(async () => {
  const { data } = await api.get(`/api/orders/${encodeURIComponent(orderId)}`, { signal });
  return validateOrderDetail(data?.order);
});

export const getPaidReceipt = (orderId, { signal } = {}) => request(async () => {
  const { data } = await api.get(`/api/orders/${encodeURIComponent(orderId)}/receipt`, { signal });
  return validatePaidReceipt(data?.receipt);
});
