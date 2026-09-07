import { useEffect, useRef, useState } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(reducedMotionQuery).matches
);

export function useAccessibleCarouselAutoplay(delay) {
  const initialReducedMotion = useRef(prefersReducedMotion()).current;
  const [paused, setPaused] = useState(initialReducedMotion);
  const swiperRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(reducedMotionQuery);
    const handleChange = (event) => {
      if (event.matches) setPaused(true);
    };

    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    const autoplay = swiperRef.current?.autoplay;
    if (!autoplay) return;
    if (paused) autoplay.stop?.();
    else autoplay.start?.();
  }, [paused]);

  const onSwiper = (swiper) => {
    swiperRef.current = swiper;
    if (paused) swiper.autoplay?.stop?.();
  };

  return {
    autoplay: { delay, enabled: !initialReducedMotion },
    onSwiper,
  };
}
