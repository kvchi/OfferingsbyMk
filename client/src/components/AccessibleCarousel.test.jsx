import React, { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CarouselAutoplayControl, useAccessibleCarouselAutoplay } from './AccessibleCarousel';

const originalMatchMedia = window.matchMedia;

function Harness({ label }) {
  const carousel = useAccessibleCarouselAutoplay(4000);
  return <CarouselAutoplayControl label={label} paused={carousel.paused} onToggle={carousel.togglePaused} />;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('accessible carousel autoplay controls', () => {
  it('uses a semantic, named Pause/Resume button with a visible status', () => {
    render(<Harness label="featured products carousel" />);
    const pause = screen.getByRole('button', { name: 'Pause featured products carousel' });
    expect(pause.tagName).toBe('BUTTON');
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Autoplay running');

    pause.focus();
    expect(pause).toHaveFocus();
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Resume featured products carousel' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Autoplay paused');
  });

  it('keeps the state of separate carousels independent', () => {
    render(<><Harness label="hero carousel" /><Harness label="testimonials carousel" /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Pause hero carousel' }));

    expect(screen.getByRole('button', { name: 'Resume hero carousel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause testimonials carousel' })).toBeInTheDocument();
  });

  it('starts paused for reduced motion and does not automatically resume', () => {
    let changeListener;
    let matches = true;
    window.matchMedia = vi.fn(() => ({
      get matches() { return matches; },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_event, listener) => { changeListener = listener; },
      removeEventListener: vi.fn(),
    }));
    render(<Harness label="shop highlights carousel" />);
    expect(screen.getByRole('button', { name: 'Resume shop highlights carousel' })).toBeInTheDocument();

    matches = false;
    changeListener({ matches: false });
    expect(screen.getByRole('button', { name: 'Resume shop highlights carousel' })).toBeInTheDocument();
  });

  it('does not duplicate controls when mounted in React Strict Mode', () => {
    render(<StrictMode><Harness label="featured products carousel" /></StrictMode>);
    expect(screen.getAllByRole('button', { name: 'Pause featured products carousel' })).toHaveLength(1);
  });
});
