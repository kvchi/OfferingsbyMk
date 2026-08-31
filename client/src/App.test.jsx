import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router-dom';
import App, { appRoutes } from './App';
import store from './store';

vi.mock('aos', () => ({ default: { init: vi.fn(), refresh: vi.fn() } }));
vi.mock('swiper/modules', () => ({ Autoplay: {} }));
vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>,
}));

const renderAt = (path) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <Provider store={store}>
      <App router={router} />
    </Provider>,
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe('application route and layout smoke tests', () => {
  it.each([
    ['/', /Browse Our Collection/i],
    ['/about', /About us/i],
    ['/login', /Get Exclusive Access/i],
    ['/shop', /Your Shopping Destination/i],
    ['/product/featured-rosemary', /^Rosemary$/i],
  ])('renders %s without a route error', (path, expectedContent) => {
    renderAt(path);
    expect(screen.getByText(expectedContent)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('provides recovery navigation for an invalid product ID', () => {
    renderAt('/product/not-a-product');
    expect(screen.getByRole('heading', { name: /product not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse shop/i })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/');
  });

  it('provides recovery navigation for an unmatched route', () => {
    renderAt('/route-that-does-not-exist');
    const header = screen.getByRole('banner');
    expect(header.nextElementSibling).toHaveAttribute('data-header-spacer');
    expect(header.nextElementSibling).toHaveClass('h-16', 'md:h-20');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /browse shop/i })).toHaveAttribute('href', '/shop');
  });

  it.each([
    '/checkout',
    '/orders',
    '/orders/order-owned-1',
    '/orders/order-owned-1/receipt',
    '/orders/order-owned-1/payment',
    '/payments/paystack/callback?orderId=order-owned-1',
  ])('protects %s and redirects logged-out visitors to Login', async (path) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: /get exclusive access/i })).toBeInTheDocument();
  });

  it('does not emit obsolete React Router 6 future-flag warnings', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderAt('/');

    expect(warning.mock.calls.flat().join(' ')).not.toMatch(/React Router Future Flag Warning|v7_/i);
    warning.mockRestore();
  });
});

describe('footer and placeholder navigation integrity', () => {
  it('renders existing social destinations as safe external anchors', () => {
    renderAt('/about');
    const footer = screen.getByRole('contentinfo');
    const destinations = [
      ['OfferingsbyMK on Facebook', 'https://www.facebook.com/chedres'],
      ['OfferingsbyMK on Twitter', 'https://www.twitter.com/chedres'],
      ['OfferingsbyMK on Instagram', 'https://www.instagram.com/chedres'],
    ];

    for (const [name, href] of destinations) {
      const link = within(footer).getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('uses valid internal destinations and leaves unfinished footer items noninteractive', () => {
    renderAt('/about');
    const footer = screen.getByRole('contentinfo');

    expect(within(footer).getByRole('link', { name: 'Candles' })).toHaveAttribute('href', '/shop#candles');
    expect(within(footer).getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop');

    for (const label of ['Terms of use', 'Privacy', 'Customer Service']) {
      const item = within(footer).getByText(new RegExp(`${label}.*Coming soon`, 'i'));
      expect(item.closest('a')).toBeNull();
      expect(item.closest('button')).toBeNull();
    }
  });

  it('clearly disables unfinished actions and links category cards to existing sections', () => {
    const home = renderAt('/');
    for (const control of screen.getAllByRole('button', { name: /place order.*coming soon/i })) {
      expect(control).toBeDisabled();
    }
    expect(screen.getByRole('link', { name: /view all products/i })).toHaveAttribute('href', '/shop');
    expect(screen.getByLabelText(/newsletter signup unavailable/i)).toBeDisabled();

    home.unmount();
    renderAt('/shop');
    expect(screen.getAllByRole('link', { name: /Candles/i })[0]).toHaveAttribute('href', '/shop#candles');
  });
});
