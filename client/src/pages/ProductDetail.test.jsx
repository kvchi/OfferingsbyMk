import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { afterEach, describe, expect, it } from 'vitest';
import { productCatalog } from '../data/productCatalog';
import cartReducer, { MAX_CART_QUANTITY } from '../store/cart';
import { formatNaira } from '../utils/money';
import ProductDetail, { PRODUCT_DESCRIPTION_FALLBACK } from './ProductDetail';

function renderProductDetail(productId, items = []) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items, statusTab: false } },
  });

  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/product/${productId}`]}>
        <Routes>
          <Route path='/product/:id' element={<ProductDetail />} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </Provider>,
  );

  return { store, ...view };
}

afterEach(() => {
  localStorage.clear();
});

describe('canonical product detail route', () => {
  it.each(productCatalog)('resolves $id with canonical metadata and kobo formatting', (product) => {
    renderProductDetail(product.id);

    expect(screen.getByRole('heading', { name: product.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: product.imageAlt })).toHaveAttribute('src', product.image);
    expect(screen.getAllByText(product.category).length).toBeGreaterThan(0);
    expect(screen.getByText(formatNaira(product.priceKobo))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `Return to ${product.category}` }))
      .toHaveAttribute('href', `/shop#${product.shopSection}`);
  });

  it('shows safe recovery content for an invalid ID', () => {
    renderProductDetail('not-a-product');

    expect(screen.getByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Shop' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  });

  it('renders an existing description and the neutral fallback when unavailable', () => {
    const described = renderProductDetail('featured-rosemary');
    expect(screen.queryByText(PRODUCT_DESCRIPTION_FALLBACK)).not.toBeInTheDocument();
    described.unmount();

    renderProductDetail('candle-soy-wax');
    expect(screen.getByText('Candles')).toBeInTheDocument();
    expect(screen.getByText(PRODUCT_DESCRIPTION_FALLBACK)).toBeInTheDocument();
  });

  it('enforces quantity minimum and maximum with an accessible maximum state', () => {
    renderProductDetail('candle-soy-wax');
    const decrease = screen.getByRole('button', { name: 'Decrease Soy Wax quantity' });
    const quantity = screen.getByLabelText('Soy Wax quantity');

    expect(decrease).toBeDisabled();
    expect(quantity).toHaveTextContent('1');

    for (let currentQuantity = 1; currentQuantity < MAX_CART_QUANTITY; currentQuantity += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Increase Soy Wax quantity' }));
    }

    expect(quantity).toHaveTextContent(String(MAX_CART_QUANTITY));
    const maximum = screen.getByRole('button', {
      name: `Soy Wax is at the maximum quantity of ${MAX_CART_QUANTITY}`,
    });
    expect(maximum).toBeDisabled();
    expect(maximum).toHaveAttribute('title', `Maximum quantity is ${MAX_CART_QUANTITY}`);

    fireEvent.click(decrease);
    expect(quantity).toHaveTextContent(String(MAX_CART_QUANTITY - 1));
    expect(screen.getByRole('button', { name: 'Increase Soy Wax quantity' })).toBeEnabled();
  });

  it('adds the selected quantity to the cart and displays success feedback', async () => {
    const { store } = renderProductDetail('oil-rose');
    const increase = screen.getByRole('button', { name: 'Increase Rose Oil quantity' });
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(screen.getByRole('button', { name: 'Add Rose Oil to cart' }));

    expect(store.getState().cart.items).toEqual([{ productId: 'oil-rose', quantity: 3 }]);
    expect(localStorage.getItem('carts')).toBe(JSON.stringify([{ productId: 'oil-rose', quantity: 3 }]));
    expect(await screen.findByText('Rose Oil added to cart')).toBeInTheDocument();
  });
});
