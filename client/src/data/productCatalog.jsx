import { candleData } from './candleData';
import { herbsData } from './herbsData';
import { homeDecorData } from './homeDecorData';
import { oilData } from './oilData';
import { productData } from './productData';
import { wellnessData } from './wellnessData';

export const productCatalog = [
  ...productData,
  ...candleData,
  ...oilData,
  ...herbsData,
  ...homeDecorData,
  ...wellnessData,
];

export function createProductLookup(products) {
  const lookup = new Map();

  for (const product of products) {
    if (!product || typeof product.id !== 'string' || product.id.length === 0) {
      throw new Error('Every product must have a non-empty string ID');
    }
    if (lookup.has(product.id)) {
      throw new Error(`Duplicate product ID: ${product.id}`);
    }
    if (!Number.isSafeInteger(product.priceKobo) || product.priceKobo <= 0) {
      throw new Error(`Invalid priceKobo for product: ${product.id}`);
    }
    lookup.set(product.id, product);
  }

  return lookup;
}

export const productsById = createProductLookup(productCatalog);

export const getProductById = (productId) => productsById.get(productId);
export const isKnownProductId = (productId) => productsById.has(productId);
