import { prisma } from '../config/prisma.js';
import { SUPPORTED_CURRENCY } from './constants.js';
import { commerceError } from './errors.js';
import {
  assertPositiveKobo,
  multiplyKobo,
} from './validation.js';

export async function buildAuthoritativeCheckout({ db = prisma, request }) {
  const productIds = request.items.map(({ productId }) => productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      title: true,
      priceKobo: true,
      currency: true,
      active: true,
      available: true,
    },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  const lines = request.items.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    if (!product) {
      throw commerceError('UNKNOWN_PRODUCT', 'One or more products could not be found.', 422);
    }
    if (!product.active) {
      throw commerceError('INACTIVE_PRODUCT', 'One or more products are no longer active.', 422);
    }
    if (!product.available) {
      throw commerceError('UNAVAILABLE_PRODUCT', 'One or more products are currently unavailable.', 422);
    }
    if (product.currency !== SUPPORTED_CURRENCY) {
      throw commerceError('UNSUPPORTED_CURRENCY', 'A product has an unsupported currency.', 422);
    }

    return {
      productId: product.id,
      title: product.title,
      quantity,
      unitPriceKobo: product.priceKobo,
      lineTotalKobo: multiplyKobo(product.priceKobo, quantity),
    };
  });

  const subtotalKobo = lines.reduce(
    (total, line) => assertPositiveKobo(total + line.lineTotalKobo, 'subtotalKobo'),
    0,
  );
  const shippingKobo = 0;
  const totalKobo = assertPositiveKobo(subtotalKobo + shippingKobo, 'totalKobo');

  return {
    delivery: request.delivery,
    lines,
    subtotalKobo,
    shippingKobo,
    totalKobo,
    currency: SUPPORTED_CURRENCY,
  };
}
