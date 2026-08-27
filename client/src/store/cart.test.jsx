import { beforeEach, describe, expect, it } from 'vitest';
import cartReducer, {
  MAX_CART_QUANTITY,
  addToCart,
  changeQuantity,
  clearCart,
  readStoredCart,
  sanitizeCartItems,
  selectCartItemCount,
  selectCartSubtotalKobo,
  selectCartTotalQuantity,
  selectFormattedCartSubtotal,
  selectResolvedCartLines,
} from './cart';

const rosemaryId = 'featured-rosemary';
const lavenderId = 'featured-lavender';
const stateWith = (items, statusTab = false) => ({ items, statusTab });

describe('cart reducer invariants', () => {
  beforeEach(() => localStorage.clear());

  it('adds, increments, decrements, and removes valid products', () => {
    let state = cartReducer(stateWith([]), addToCart({ productId: rosemaryId, quantity: 2 }));
    state = cartReducer(state, addToCart({ productId: rosemaryId, quantity: 3 }));
    expect(state.items).toEqual([{ productId: rosemaryId, quantity: 5 }]);

    state = cartReducer(state, changeQuantity({ productId: rosemaryId, quantity: 4 }));
    expect(state.items[0].quantity).toBe(4);

    state = cartReducer(state, changeQuantity({ productId: rosemaryId, quantity: 0 }));
    expect(state.items).toEqual([]);
  });

  it('rejects unknown products and invalid quantities', () => {
    const original = stateWith([{ productId: rosemaryId, quantity: 2 }]);
    const actions = [
      addToCart({ productId: 'unknown', quantity: 1 }),
      addToCart({ productId: rosemaryId, quantity: 0 }),
      addToCart({ productId: rosemaryId, quantity: 1.5 }),
      changeQuantity({ productId: rosemaryId, quantity: -1 }),
      changeQuantity({ productId: rosemaryId, quantity: 2.5 }),
    ];

    for (const action of actions) {
      expect(cartReducer(original, action)).toEqual(original);
    }
  });

  it('caps additions and quantity changes at the maximum', () => {
    let state = cartReducer(
      stateWith([{ productId: rosemaryId, quantity: MAX_CART_QUANTITY - 1 }]),
      addToCart({ productId: rosemaryId, quantity: 10 })
    );
    expect(state.items[0].quantity).toBe(MAX_CART_QUANTITY);

    state = cartReducer(state, changeQuantity({ productId: rosemaryId, quantity: 500 }));
    expect(state.items[0].quantity).toBe(MAX_CART_QUANTITY);
  });

  it('ignores safe quantity changes for missing IDs', () => {
    const original = stateWith([{ productId: rosemaryId, quantity: 2 }]);
    expect(cartReducer(
      original,
      changeQuantity({ productId: lavenderId, quantity: 3 })
    )).toEqual(original);
  });

  it('consolidates duplicate persisted IDs, filters malformed entries, and caps totals', () => {
    const stored = [
      { productId: rosemaryId, quantity: 40 },
      { productId: rosemaryId, quantity: 70 },
      { productId: lavenderId, quantity: 2 },
      { productId: 'unknown', quantity: 1 },
      { productId: lavenderId, quantity: 0 },
      { productId: lavenderId, quantity: -2 },
      { productId: lavenderId, quantity: 1.5 },
      null,
    ];

    expect(sanitizeCartItems(stored)).toEqual([
      { productId: rosemaryId, quantity: MAX_CART_QUANTITY },
      { productId: lavenderId, quantity: 2 },
    ]);

    localStorage.setItem('carts', JSON.stringify(stored));
    const restored = readStoredCart();
    expect(restored).toEqual(sanitizeCartItems(stored));
    expect(JSON.parse(localStorage.getItem('carts'))).toEqual(restored);
  });

  it('clears items, persists an empty array, and preserves drawer state', () => {
    const state = cartReducer(
      stateWith([{ productId: rosemaryId, quantity: 2 }], true),
      clearCart()
    );

    expect(state).toEqual({ items: [], statusTab: true });
    expect(localStorage.getItem('carts')).toBe('[]');
  });
});

describe('cart selectors', () => {
  const rootState = {
    cart: stateWith([
      { productId: rosemaryId, quantity: 2 },
      { productId: lavenderId, quantity: 3 },
    ]),
  };

  it('calculates line count, total quantity, resolved lines, and display-only subtotal', () => {
    expect(selectCartItemCount(rootState)).toBe(2);
    expect(selectCartTotalQuantity(rootState)).toBe(5);
    expect(selectResolvedCartLines(rootState)).toHaveLength(2);
    expect(selectCartSubtotalKobo(rootState)).toBe(10_500_000);
    expect(selectFormattedCartSubtotal(rootState)).toMatch(/₦\s?105,000/);
  });
});
