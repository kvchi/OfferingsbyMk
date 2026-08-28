import { candleData } from './candleData';
import { herbsData } from './herbsData';
import { homeDecorData } from './homeDecorData';
import { oilData } from './oilData';
import { productData } from './productData';
import { wellnessData } from './wellnessData';

const addCatalogMetadata = (products, category, shopSection) => products.map((product) => ({
  ...product,
  category: product.category ?? category,
  shopSection: product.shopSection ?? shopSection,
  imageAlt: product.imageAlt ?? product.alt ?? `${product.title} product`,
}));

export const productCatalog = [
  ...addCatalogMetadata(productData, 'Featured Products', ''),
  ...addCatalogMetadata(candleData, 'Candles', 'candles'),
  ...addCatalogMetadata(oilData, 'Essential Oils', 'essential-oils'),
  ...addCatalogMetadata(herbsData, 'Herbs & Botanicals', 'herbs-botanicals'),
  ...addCatalogMetadata(homeDecorData, 'Home Decorations', 'home-decor'),
  ...addCatalogMetadata(wellnessData, 'Wellness & Relaxation', 'wellness-relaxation'),
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
    if (!Number.isInteger(product.priceKobo) || product.priceKobo <= 0) {
      throw new Error(`Invalid priceKobo for product: ${product.id}`);
    }
    lookup.set(product.id, product);
  }

  return lookup;
}

export const productsById = createProductLookup(productCatalog);

export const getProductById = (productId) => productsById.get(productId);
export const isKnownProductId = (productId) => productsById.has(productId);
