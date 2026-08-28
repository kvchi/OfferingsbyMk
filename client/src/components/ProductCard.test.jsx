import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { productCatalog } from '../data/productCatalog';
import cartReducer from '../store/cart';
import Candles from './Candles';
import Herbs from './Herbs';
import HomeDecor from './HomeDecor';
import Oil from './Oil';
import Products from './Products';
import Wellness from './Wellness';

function renderAllProductCards() {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items: [], statusTab: false } },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/shop']}>
        <Products />
        <Candles />
        <Oil />
        <Herbs />
        <HomeDecor />
        <Wellness />
      </MemoryRouter>
    </Provider>,
  );

  return store;
}

describe('canonical product cards', () => {
  it('gives every product a correct detail link and a separate named cart button', () => {
    renderAllProductCards();

    expect(screen.getAllByRole('article')).toHaveLength(29);
    for (const product of productCatalog) {
      const link = document.querySelector(`a[href="/product/${product.id}"]`);
      expect(link).not.toBeNull();
      expect(link).toHaveAccessibleName(`View ${product.title} details`);
      expect(link).toHaveTextContent('View details');

      const card = link.closest('article');
      const addButton = within(card).getByRole('button', { name: `Add ${product.title} to cart` });
      expect(link.contains(addButton)).toBe(false);
      expect(addButton).toHaveAttribute('type', 'button');
    }
  });

  it('adds from a card without navigating to its detail route', () => {
    const store = renderAllProductCards();
    const link = document.querySelector('a[href="/product/herb-oregano"]');
    const addButton = within(link.closest('article')).getByRole('button', { name: 'Add Oregano to cart' });

    fireEvent.click(addButton);

    expect(window.location.pathname).not.toBe('/product/herb-oregano');
    expect(store.getState().cart.items).toEqual([{ productId: 'herb-oregano', quantity: 1 }]);
  });
});
