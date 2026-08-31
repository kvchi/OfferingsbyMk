export const ORDER_STATUS = Object.freeze({ PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED' });
export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'UNPAID',
  INITIALIZED: 'INITIALIZED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  PAID: 'PAID',
});

const presentations = {
  unpaid: {
    key: 'UNPAID', label: 'Pending payment', orderLabel: 'Order pending', paymentLabel: 'Unpaid', tone: 'amber',
    description: 'Payment has not started. The order is reserved as a pending test order.',
  },
  initialized: {
    key: 'INITIALIZED', label: 'Payment initialized', orderLabel: 'Order pending', paymentLabel: 'Initialized', tone: 'blue',
    description: 'A Paystack test payment was started but has not been confirmed.',
  },
  failed: {
    key: 'FAILED', label: 'Payment failed', orderLabel: 'Order pending', paymentLabel: 'Failed', tone: 'red',
    description: 'The payment attempt did not complete. The order can be retried if the server permits it.',
  },
  paid: {
    key: 'PAID', label: 'Payment confirmed', orderLabel: 'Order paid', paymentLabel: 'Paid', tone: 'green',
    description: 'The server verified this payment and confirmed the order.',
  },
  cancelled: {
    key: 'CANCELLED', label: 'Order cancelled', orderLabel: 'Order cancelled', paymentLabel: 'No payment due', tone: 'slate',
    description: 'This order was cancelled and is no longer available for payment.',
  },
  unknown: {
    key: 'UNKNOWN', label: 'Order status needs review', orderLabel: 'Status unavailable', paymentLabel: 'Status unavailable', tone: 'slate',
    description: 'This order has an unrecognized or inconsistent state. Refresh it or contact support before taking further action.',
  },
};

export function getOrderPresentation(order) {
  const paymentAction = order?.availableActions?.payment;
  const receipt = order?.availableActions?.receipt === true;
  if (order?.status === ORDER_STATUS.CANCELLED && paymentAction === 'NONE' && !receipt) return presentations.cancelled;
  if (order?.status === ORDER_STATUS.PAID && order?.paymentStatus === PAYMENT_STATUS.PAID
    && order?.payment?.status === PAYMENT_STATUS.PAID && receipt) return presentations.paid;
  if (order?.status === ORDER_STATUS.PENDING && order?.paymentStatus === PAYMENT_STATUS.UNPAID
    && paymentAction === 'INITIALIZE') return presentations.unpaid;
  if (order?.status === ORDER_STATUS.PENDING
    && [PAYMENT_STATUS.INITIALIZED, PAYMENT_STATUS.PENDING].includes(order?.paymentStatus)
    && paymentAction === 'VERIFY') return presentations.initialized;
  if (order?.status === ORDER_STATUS.PENDING && order?.paymentStatus === PAYMENT_STATUS.FAILED
    && paymentAction === 'INITIALIZE') return presentations.failed;
  return presentations.unknown;
}

export const formatOrderDate = (value, options = { dateStyle: 'long', timeStyle: 'short' }) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-NG', options).format(date);
};

export const itemCountLabel = (count) => `${count} ${count === 1 ? 'item' : 'items'}`;
