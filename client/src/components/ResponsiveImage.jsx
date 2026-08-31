import React from 'react';

export default function ResponsiveImage({
  image,
  alt,
  sizes,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  ...imageProps
}) {
  if (typeof image === 'string') {
    return (
      <img
        src={image}
        alt={alt}
        sizes={sizes}
        loading={loading}
        decoding={decoding}
        fetchpriority={fetchPriority}
        {...imageProps}
      />
    );
  }

  return (
    <picture>
      <source type="image/webp" srcSet={image.webpSrcSet} sizes={sizes} />
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchpriority={fetchPriority}
        {...imageProps}
      />
    </picture>
  );
}
