import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { rosemary } from '../assets/images';
import ResponsiveImage from './ResponsiveImage';

describe('ResponsiveImage', () => {
  it('renders modern and fallback candidates with intrinsic dimensions', () => {
    render(<ResponsiveImage image={rosemary} alt="Rosemary product" sizes="250px" />);

    const image = screen.getByRole('img', { name: 'Rosemary product' });
    expect(image).toHaveAttribute('src', rosemary.src);
    expect(image).toHaveAttribute('srcset', rosemary.srcSet);
    expect(image).toHaveAttribute('sizes', '250px');
    expect(image).toHaveAttribute('width', String(rosemary.width));
    expect(image).toHaveAttribute('height', String(rosemary.height));
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image.closest('picture').querySelector('source[type="image/webp"]'))
      .toHaveAttribute('srcset', rosemary.webpSrcSet);
  });

  it('supports deliberate LCP priority without changing alternative text', () => {
    render(
      <ResponsiveImage
        image={rosemary}
        alt="Fresh rosemary"
        sizes="400px"
        loading="eager"
        fetchPriority="high"
      />,
    );

    const image = screen.getByRole('img', { name: 'Fresh rosemary' });
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
    expect(image).toHaveAttribute('alt', 'Fresh rosemary');
  });

  it('keeps remote images compatible with native loading attributes', () => {
    render(<ResponsiveImage image="https://example.invalid/photo.jpg" alt="Remote example" sizes="80px" />);
    const image = screen.getByRole('img', { name: 'Remote example' });
    expect(image).toHaveAttribute('src', 'https://example.invalid/photo.jpg');
    expect(image).toHaveAttribute('loading', 'lazy');
  });
});
