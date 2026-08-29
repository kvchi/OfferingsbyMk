import { NIGERIA_STATES } from '../data/nigeriaStates';

export const CHECKOUT_ATTEMPT_STORAGE_KEY = 'shopsphare:checkout-attempt';
const unsafeTextPattern = /[\u0000-\u001f\u007f<>]/;
const stateSet = new Set(NIGERIA_STATES);
let memoryAttempt = null;

const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const validateText = (values, errors, field, label, min, max) => {
  const value = normalizeText(values[field]);
  if (value.length < min) errors[field] = `${label} must contain at least ${min} characters.`;
  else if (value.length > max) errors[field] = `${label} must contain no more than ${max} characters.`;
  else if (unsafeTextPattern.test(value)) errors[field] = `${label} contains unsupported characters.`;
  return value;
};

export function validateDelivery(values) {
  const errors = {};
  const data = {
    recipientName: validateText(values, errors, 'recipientName', 'Recipient name', 2, 100),
    phone: normalizeText(values.phone).replace(/[\s().-]/g, ''),
    addressLine1: validateText(values, errors, 'addressLine1', 'Address line 1', 3, 160),
    cityOrLga: validateText(values, errors, 'cityOrLga', 'City or LGA', 2, 100),
    state: normalizeText(values.state),
    country: 'Nigeria',
  };

  const addressLine2 = normalizeText(values.addressLine2);
  if (addressLine2) {
    if (addressLine2.length < 3 || addressLine2.length > 160 || unsafeTextPattern.test(addressLine2)) {
      errors.addressLine2 = 'Address line 2 must contain 3–160 supported characters.';
    } else data.addressLine2 = addressLine2;
  }

  if (/^0[789]\d{9}$/.test(data.phone)) data.phone = `+234${data.phone.slice(1)}`;
  if (!/^\+234[789]\d{9}$/.test(data.phone)) {
    errors.phone = 'Enter a Nigerian mobile number, such as 08012345678 or +2348012345678.';
  }

  if (!stateSet.has(data.state)) errors.state = 'Choose a Nigerian state or the FCT.';

  const postalCode = normalizeText(values.postalCode);
  if (postalCode) {
    if (!/^\d{6}$/.test(postalCode)) errors.postalCode = 'Postal code must contain exactly 6 digits.';
    else data.postalCode = postalCode;
  }

  return { data, errors, valid: Object.keys(errors).length === 0 };
}

export function buildCheckoutPayload(cartLines, delivery) {
  const items = cartLines
    .map(({ productId, quantity }) => ({ productId, quantity }))
    .filter(({ productId, quantity }) =>
      typeof productId === 'string' && productId.length > 0 && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99)
    .sort((left, right) => left.productId.localeCompare(right.productId));

  if (items.length === 0 || items.length !== cartLines.length) {
    throw new TypeError('Checkout requires valid cart lines.');
  }
  return { items, delivery };
}

export const createCheckoutFingerprint = (payload) => {
  const serialized = JSON.stringify({
    items: [...payload.items].sort((left, right) => left.productId.localeCompare(right.productId)),
    delivery: payload.delivery,
  });
  let first = 0x9e3779b9;
  let second = 0x85ebca6b;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    first = Math.imul(first ^ code, 0x85ebca6b);
    second = Math.imul(second ^ code, 0xc2b2ae35);
  }
  return `v1-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}-${serialized.length}`;
};

export function generateIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

const readStoredAttempt = (storage) => {
  try {
    const parsed = JSON.parse(storage?.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) || 'null');
    if (parsed && typeof parsed.fingerprint === 'string' && typeof parsed.key === 'string') return parsed;
  } catch {
    // The in-memory attempt below keeps retry behavior safe when storage is unavailable.
  }
  return null;
};

export function getOrCreateCheckoutAttempt(fingerprint, storage = globalThis.sessionStorage) {
  const existing = readStoredAttempt(storage) ?? memoryAttempt;
  if (existing?.fingerprint === fingerprint) {
    memoryAttempt = existing;
    return existing;
  }

  const attempt = { fingerprint, key: generateIdempotencyKey() };
  memoryAttempt = attempt;
  try {
    storage?.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // In-memory fallback remains available for the lifetime of this page session.
  }
  return attempt;
}

export function clearCheckoutAttempt(storage = globalThis.sessionStorage) {
  memoryAttempt = null;
  try {
    storage?.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // Explicit cancellation and successful creation still clear the in-memory attempt.
  }
}

export const resetCheckoutAttemptForTests = () => {
  memoryAttempt = null;
};
