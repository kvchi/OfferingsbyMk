import { describe, expect, it } from 'vitest';
import { createProductLookup, productCatalog } from './productCatalog';
import { formatNaira } from '../utils/money';

describe('product catalog integrity', () => {
  it('contains only unique IDs and positive integer kobo prices', () => {
    const lookup = createProductLookup(productCatalog);

    expect(lookup.size).toBe(productCatalog.length);
    for (const product of productCatalog) {
      expect(Number.isInteger(product.priceKobo)).toBe(true);
      expect(product.priceKobo).toBeGreaterThan(0);
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
});
