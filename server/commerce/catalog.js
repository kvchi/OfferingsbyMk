import {
  commerceCategories,
  commerceProducts,
  SUPPORTED_CURRENCY as CATALOG_CURRENCY,
} from '../../shared/commerceCatalog.mjs';
import { prisma } from '../config/prisma.js';
import { SUPPORTED_CURRENCIES, SUPPORTED_CURRENCY } from './constants.js';
import { assertProductPriceKobo } from './validation.js';

const CATALOG_TRANSACTION_OPTIONS = Object.freeze({ timeout: 30_000 });

const assertNonEmptyString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
};

export function validateCommerceCatalog({ categories, products }) {
  if (!Array.isArray(categories) || !Array.isArray(products)) {
    throw new TypeError('Catalog categories and products must be arrays');
  }
  if (CATALOG_CURRENCY !== SUPPORTED_CURRENCY) {
    throw new TypeError('Shared catalog currency does not match server currency');
  }

  const categoryIds = new Set();
  const categorySlugs = new Set();
  for (const category of categories) {
    assertNonEmptyString(category?.id, 'category.id');
    assertNonEmptyString(category?.name, 'category.name');
    assertNonEmptyString(category?.slug, 'category.slug');
    if (typeof category.active !== 'boolean') throw new TypeError('category.active must be boolean');
    if (categoryIds.has(category.id)) throw new TypeError(`Duplicate category ID: ${category.id}`);
    if (categorySlugs.has(category.slug)) throw new TypeError(`Duplicate category slug: ${category.slug}`);
    categoryIds.add(category.id);
    categorySlugs.add(category.slug);
  }

  const productIds = new Set();
  for (const product of products) {
    assertNonEmptyString(product?.id, 'product.id');
    assertNonEmptyString(product?.title, 'product.title');
    assertNonEmptyString(product?.categoryId, 'product.categoryId');
    if (!categoryIds.has(product.categoryId)) {
      throw new TypeError(`Invalid category for product ${product.id}: ${product.categoryId}`);
    }
    if (productIds.has(product.id)) throw new TypeError(`Duplicate product ID: ${product.id}`);
    assertProductPriceKobo(product.priceKobo, `priceKobo for product ${product.id}`);
    if (!SUPPORTED_CURRENCIES.has(product.currency)) {
      throw new TypeError(`Invalid currency for product ${product.id}: ${product.currency}`);
    }
    if (product.description !== undefined && product.description !== null && typeof product.description !== 'string') {
      throw new TypeError(`Invalid description for product ${product.id}`);
    }
    if (typeof product.active !== 'boolean' || typeof product.available !== 'boolean') {
      throw new TypeError(`Product flags must be boolean for product ${product.id}`);
    }
    productIds.add(product.id);
  }

  return { categories, products };
}

export async function synchronizeProducts({
  db = prisma,
  categories = commerceCategories,
  products = commerceProducts,
} = {}) {
  validateCommerceCatalog({ categories, products });

  return db.$transaction(async (transaction) => {
    const existingProducts = await transaction.product.findMany({
      where: { id: { in: products.map((product) => product.id) } },
      select: { id: true },
    });
    const existingProductIds = new Set(existingProducts.map(({ id }) => id));

    for (const category of categories) {
      const data = { name: category.name, slug: category.slug, active: category.active };
      await transaction.category.upsert({
        where: { id: category.id },
        create: { id: category.id, ...data },
        update: data,
      });
    }

    for (const product of products) {
      const data = {
        title: product.title,
        description: product.description ?? null,
        priceKobo: product.priceKobo,
        currency: product.currency,
        active: product.active,
        available: product.available,
        categoryId: product.categoryId,
      };
      await transaction.product.upsert({
        where: { id: product.id },
        create: { id: product.id, ...data },
        update: data,
      });
    }

    return {
      categories: categories.length,
      products: products.length,
      createdProducts: products.filter(({ id }) => !existingProductIds.has(id)).length,
      updatedProducts: products.filter(({ id }) => existingProductIds.has(id)).length,
    };
  }, CATALOG_TRANSACTION_OPTIONS);
}

export async function deactivateProduct({ db = prisma, productId }) {
  assertNonEmptyString(productId, 'productId');
  return db.product.update({
    where: { id: productId },
    data: { active: false, available: false },
  });
}
