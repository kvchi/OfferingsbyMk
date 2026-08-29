const PAYSTACK_API_URL = 'https://api.paystack.co';
const PAYSTACK_CHECKOUT_HOST = 'checkout.paystack.com';

export class PaystackError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'PaystackError';
    this.code = code;
    this.status = status;
  }
}

export function assertPaystackTestKey(secretKey) {
  if (typeof secretKey === 'string' && secretKey.startsWith('sk_live_')) {
    throw new PaystackError('LIVE_KEY_REFUSED', 'Live Paystack keys are not permitted.', 503);
  }
  if (typeof secretKey !== 'string' || !secretKey.startsWith('sk_test_')
    || secretKey === 'sk_test_replace_me' || secretKey.length < 16) {
    throw new PaystackError('PAYMENT_NOT_CONFIGURED', 'Paystack test mode is not configured.', 503);
  }
  return secretKey;
}

export function isPaystackAuthorizationUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === PAYSTACK_CHECKOUT_HOST
      && url.username === ''
      && url.password === '';
  } catch {
    return false;
  }
}

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new PaystackError('PAYSTACK_MALFORMED_RESPONSE', 'Paystack returned an invalid response.');
  }
};

export function createPaystackClient({ secretKey, timeoutMs = 8000, fetchImpl } = {}) {
  const request = async (path, options = {}) => {
    const key = assertPaystackTestKey(secretKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response;
      try {
        const performFetch = fetchImpl ?? globalThis.fetch;
        response = await performFetch(`${PAYSTACK_API_URL}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          },
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new PaystackError('PAYSTACK_TIMEOUT', 'Paystack did not respond in time.', 504);
        }
        throw new PaystackError('PAYSTACK_UNAVAILABLE', 'Paystack is temporarily unavailable.');
      }

      const payload = await parseJsonResponse(response);
      if (!response.ok || payload?.status !== true) {
        throw new PaystackError('PAYSTACK_REJECTED', 'Paystack rejected the payment request.');
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    async initialize({ email, amountKobo, currency, reference, callbackUrl, orderId }) {
      const payload = await request('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email,
          amount: String(amountKobo),
          currency,
          reference,
          callback_url: callbackUrl,
          metadata: JSON.stringify({ orderId }),
        }),
      });
      const data = payload?.data;
      if (!data || data.reference !== reference || !isPaystackAuthorizationUrl(data.authorization_url)) {
        throw new PaystackError('PAYSTACK_MALFORMED_RESPONSE', 'Paystack returned an invalid initialization response.');
      }
      return { authorizationUrl: data.authorization_url, reference: data.reference };
    },

    async verify(reference) {
      const payload = await request(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
      if (!payload?.data || typeof payload.data !== 'object') {
        throw new PaystackError('PAYSTACK_MALFORMED_RESPONSE', 'Paystack returned an invalid verification response.');
      }
      return payload.data;
    },
  };
}
