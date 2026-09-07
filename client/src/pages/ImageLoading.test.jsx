import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartReducer from '../store/cart';
import Home from './Home';
import Shop from './Shop';

vi.mock('aos', () => ({ default: { init: vi.fn(), refresh: vi.fn() } }));
vi.mock('swiper/modules', () => ({ Autoplay: {} }));
vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }) => <div data-testid="swiper-slide">{children}</div>,
}));

const renderPage = (page, path) => {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items: [], statusTab: false } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </Provider>,
  );
};

beforeEach(() => localStorage.clear());

describe('deliberate page image loading', () => {
  it('prioritizes only the initial Home hero slide', () => {
    renderPage(<Home />, '/');

    const initial = screen.getByRole('img', { name: 'A customer relaxing with wellness products' });
    expect(initial).toHaveAttribute('loading', 'eager');
    expect(initial).toHaveAttribute('fetchpriority', 'high');
    expect(initial).toHaveAttribute('sizes', '(max-width: 767px) calc(100vw - 4rem), 400px');
    expect(initial).toHaveAttribute('width');
    expect(initial).toHaveAttribute('height');

    for (const alt of [
      'Secure card payment',
      'Shopping cart ready for an order',
      'Woman enjoying a calming sage ritual',
      'Natural sage and botanical products',
    ]) {
      const laterSlide = screen.getByRole('img', { name: alt });
      expect(laterSlide).toHaveAttribute('loading', 'lazy');
      expect(laterSlide).toHaveAttribute('fetchpriority', 'low');
    }
    expect(screen.getAllByTestId('swiper-slide')).toHaveLength(12);
    expect(screen.queryByRole('button', { name: /(?:pause|resume).*carousel/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/autoplay (?:running|paused)/i)).not.toBeInTheDocument();
  });

  it('lazy-loads below-the-fold Home product and promotional imagery', () => {
    renderPage(<Home />, '/');

    expect(screen.getByRole('img', { name: 'Rosemary product' })).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('img', { name: 'Rosemary product' })).toHaveAttribute('sizes', '180px');
    const decorativeImages = Array.from(document.querySelectorAll('img[alt=""]'));
    expect(decorativeImages.filter((image) => image.getAttribute('loading') === 'lazy').length)
      .toBeGreaterThanOrEqual(9);
  });

  it('prioritizes the first Shop slide while cards and later slides stay lazy', () => {
    renderPage(<Shop />, '/shop');

    const candleImages = screen.getAllByRole('img', { name: 'Candles category' });
    expect(candleImages[0]).toHaveAttribute('loading', 'eager');
    expect(candleImages[0]).toHaveAttribute('fetchpriority', 'high');
    expect(candleImages[1]).toHaveAttribute('loading', 'lazy');

    for (const image of screen.getAllByRole('img', { name: 'Essential oils category' })) {
      expect(image).toHaveAttribute('loading', 'lazy');
    }
    expect(screen.getByRole('img', { name: 'Soy Wax product' })).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('img', { name: 'Soy Wax product' })).toHaveAttribute('sizes', '250px');
    expect(screen.getAllByTestId('swiper')).toHaveLength(1);
    expect(screen.getAllByTestId('swiper-slide')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /(?:pause|resume).*carousel/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/autoplay (?:running|paused)/i)).not.toBeInTheDocument();
  });
});
