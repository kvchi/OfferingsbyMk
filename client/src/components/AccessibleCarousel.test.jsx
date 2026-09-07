import React, { StrictMode, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAccessibleCarouselAutoplay } from './AccessibleCarousel';

const originalMatchMedia = window.matchMedia;

function Harness({ swiper }) {
  const carousel = useAccessibleCarouselAutoplay(4000);

  useEffect(() => {
    carousel.onSwiper(swiper);
  }, [carousel.onSwiper, swiper]);

  return (
    <div
      data-testid="carousel-settings"
      data-autoplay-enabled={String(carousel.autoplay.enabled)}
      data-autoplay-delay={carousel.autoplay.delay}
    />
  );
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('reduced-motion carousel autoplay', () => {
  it('keeps autoplay enabled without rendering visible controls by default', () => {
    const swiper = { autoplay: { start: vi.fn(), stop: vi.fn() } };
    render(<Harness swiper={swiper} />);

    expect(screen.getByTestId('carousel-settings')).toHaveAttribute('data-autoplay-enabled', 'true');
    expect(screen.getByTestId('carousel-settings')).toHaveAttribute('data-autoplay-delay', '4000');
    expect(screen.queryByRole('button', { name: /carousel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('disables autoplay when reduced motion is already requested', () => {
    window.matchMedia = vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const swiper = { autoplay: { start: vi.fn(), stop: vi.fn() } };

    render(<Harness swiper={swiper} />);

    expect(screen.getByTestId('carousel-settings')).toHaveAttribute('data-autoplay-enabled', 'false');
    expect(swiper.autoplay.stop).toHaveBeenCalled();
  });

  it('stops autoplay when reduced motion is enabled and does not resume it automatically', () => {
    let changeListener;
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_event, listener) => { changeListener = listener; },
      removeEventListener: vi.fn(),
    }));
    const swiper = { autoplay: { start: vi.fn(), stop: vi.fn() } };
    render(<Harness swiper={swiper} />);

    act(() => changeListener({ matches: true }));
    expect(swiper.autoplay.stop).toHaveBeenCalled();

    act(() => changeListener({ matches: false }));
    expect(swiper.autoplay.start).not.toHaveBeenCalled();
  });

  it('does not render duplicate UI in React Strict Mode', () => {
    const swiper = { autoplay: { start: vi.fn(), stop: vi.fn() } };
    render(<StrictMode><Harness swiper={swiper} /></StrictMode>);

    expect(screen.getAllByTestId('carousel-settings')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /carousel/i })).not.toBeInTheDocument();
  });
});
