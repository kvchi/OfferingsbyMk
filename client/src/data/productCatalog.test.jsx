import { describe, expect, it } from 'vitest';
import { createProductLookup, productCatalog } from './productCatalog';
import { formatNaira } from '../utils/money';
import { commerceProducts } from '../../../shared/commerceCatalog.mjs';

describe('product catalog integrity', () => {
  it('contains only unique IDs and positive integer kobo prices', () => {
    const lookup = createProductLookup(productCatalog);

    expect(productCatalog).toHaveLength(29);
    expect(lookup.size).toBe(productCatalog.length);
    for (const product of productCatalog) {
      expect(Number.isInteger(product.priceKobo)).toBe(true);
      expect(product.priceKobo).toBeGreaterThan(0);
      expect(product.category).toEqual(expect.any(String));
      expect(product.category.length).toBeGreaterThan(0);
      expect(product.shopSection).toEqual(expect.any(String));
      expect(product.shopSection.length).toBeGreaterThan(0);
      expect(product.imageAlt).toEqual(expect.any(String));
      expect(product.imageAlt.length).toBeGreaterThan(0);
      expect(product.description === null || typeof product.description === 'string').toBe(true);
    }
  });

  it('rejects duplicate IDs and invalid prices', () => {
    expect(() => createProductLookup([
      { id: 'same', priceKobo: 100 },
      { id: 'same', priceKobo: 200 },
    ])).toThrow('Duplicate product ID');
    expect(() => createProductLookup([{ id: 'bad-price', priceKobo: 1.5 }]))
      .toThrow('Invalid priceKobo');
  });

  it('formats kobo as Nigerian naira only at display time', () => {
    expect(formatNaira(1_500_000)).toMatch(/₦\s?15,000/);
  });

  it('hydrates every UI product from the shared authoritative commerce fields', () => {
    const commerceFields = ({ id, title, priceKobo, categoryId, description, currency, active, available }) => ({
      id,
      title,
      priceKobo,
      categoryId,
      description,
      currency,
      active,
      available,
    });
    const byId = (left, right) => left.id.localeCompare(right.id);

    expect(productCatalog.map(commerceFields).sort(byId))
      .toEqual(commerceProducts.map(commerceFields).sort(byId));
  });
});
