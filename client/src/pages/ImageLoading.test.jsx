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
  Swiper: ({ children, className, autoplay, loop, slidesPerView, ...props }) => (
    <div
      data-testid="swiper"
      aria-label={props['aria-label']}
      className={className}
      data-aos={props['data-aos']}
      data-autoplay-enabled={String(autoplay.enabled)}
      data-autoplay-delay={autoplay.delay}
      data-loop={String(loop)}
      data-slides-per-view={slidesPerView}
      data-pause-on-mouse-enter={String(autoplay.pauseOnMouseEnter ?? false)}
    >
      {children}
    </div>
  ),
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
  it('renders the Home hero immediately with responsive layout and image sizing', () => {
    renderPage(<Home />, '/');

    const heroSection = screen.getByRole('region', { name: 'Browse Our Collection' });
    const hero = heroSection.querySelector('aside');
    const heroCarousel = screen.getByLabelText('OfferingsbyMK featured products');
    const initial = screen.getByRole('img', { name: 'A customer relaxing with wellness products' });

    expect(hero).toHaveClass('mx-auto', 'grid', 'max-w-6xl', 'grid-cols-1', 'lg:grid-cols-2');
    expect(heroSection.querySelector('[data-aos]')).toBeNull();
    expect(heroCarousel).not.toHaveAttribute('data-aos');
    expect(heroCarousel.parentElement).toHaveClass('w-full', 'max-w-[34rem]', 'overflow-hidden');
    expect(heroCarousel).toHaveClass('w-full', 'h-[320px]', 'md:h-[430px]', 'xl:h-[460px]');
    expect(heroCarousel).toHaveAttribute('data-autoplay-enabled', 'true');
    expect(heroCarousel).toHaveAttribute('data-autoplay-delay', '4000');
    expect(heroCarousel).toHaveAttribute('data-loop', 'true');
    expect(initial).toHaveAttribute('loading', 'eager');
    expect(initial).toHaveAttribute('fetchpriority', 'high');
    expect(initial).toHaveAttribute('sizes', '(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) min(544px, calc(100vw - 4rem)), (max-width: 1279px) calc(50vw - 3.5rem), 544px');
    expect(initial).toHaveAttribute('width');
    expect(initial).toHaveAttribute('height');
    expect(initial).toHaveAttribute('srcset');
    expect(initial.closest('picture').querySelector('source')).toHaveAttribute('srcset');
    expect(screen.getByRole('link', { name: 'Shop products' })).toHaveAttribute('href', '/shop');

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

  it('retains testimonial autoplay, looping, responsive slide counts, and deferred animation', () => {
    renderPage(<Home />, '/');

    const testimonialCarousel = screen.getAllByTestId('swiper')[1];
    expect(testimonialCarousel).toHaveAttribute('data-aos', 'zoom-out');
    expect(testimonialCarousel).toHaveAttribute('data-autoplay-enabled', 'true');
    expect(testimonialCarousel).toHaveAttribute('data-autoplay-delay', '3000');
    expect(testimonialCarousel).toHaveAttribute('data-pause-on-mouse-enter', 'true');
    expect(testimonialCarousel).toHaveAttribute('data-loop', 'true');
    expect(testimonialCarousel).toHaveAttribute('data-slides-per-view', '2');
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
    expect(screen.getByLabelText('OfferingsbyMK shop highlights')).not.toHaveAttribute('data-aos');
    expect(screen.getByLabelText('OfferingsbyMK shop highlights')).toHaveAttribute('data-loop', 'true');
    expect(screen.getByLabelText('OfferingsbyMK shop highlights')).toHaveAttribute('data-autoplay-delay', '4000');
    expect(screen.queryByRole('button', { name: /(?:pause|resume).*carousel/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/autoplay (?:running|paused)/i)).not.toBeInTheDocument();
  });
});
