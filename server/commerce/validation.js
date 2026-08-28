import { MAX_CART_QUANTITY, MAX_DATABASE_INTEGER } from './constants.js';

const assertSafeInteger = (value, fieldName) => {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${fieldName} must be a safe integer`);
  }
  return value;
};

export function assertPositiveKobo(value, fieldName = 'amountKobo') {
  assertSafeInteger(value, fieldName);
  if (value <= 0) throw new TypeError(`${fieldName} must be positive`);
  return value;
}

export function assertNonNegativeKobo(value, fieldName = 'amountKobo') {
  assertSafeInteger(value, fieldName);
  if (value < 0) throw new TypeError(`${fieldName} must not be negative`);
  return value;
}

export function assertProductPriceKobo(value, fieldName = 'priceKobo') {
  assertPositiveKobo(value, fieldName);
  if (value > MAX_DATABASE_INTEGER) {
    throw new TypeError(`${fieldName} exceeds the Product integer limit`);
  }
  return value;
}

export function assertQuantity(value, fieldName = 'quantity') {
  assertSafeInteger(value, fieldName);
  if (value <= 0 || value > MAX_CART_QUANTITY) {
    throw new TypeError(`${fieldName} must be between 1 and ${MAX_CART_QUANTITY}`);
  }
  return value;
}

export function multiplyKobo(unitPriceKobo, quantity) {
  assertPositiveKobo(unitPriceKobo, 'unitPriceKobo');
  assertQuantity(quantity);
  return assertPositiveKobo(unitPriceKobo * quantity, 'lineTotalKobo');
}

export function toDatabaseBigInt(value, fieldName = 'amountKobo') {
  return BigInt(assertNonNegativeKobo(value, fieldName));
}
