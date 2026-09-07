import { useEffect, useId, useRef, useState } from 'react';

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
    paused,
    togglePaused: () => setPaused((value) => !value),
  };
}

export function CarouselAutoplayControl({ label, paused, onToggle }) {
  const statusId = useId();
  const action = paused ? 'Resume' : 'Pause';

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-700 dark:text-primary">
      <button
        type="button"
        aria-pressed={paused}
        aria-describedby={statusId}
        aria-label={`${action} ${label}`}
        onClick={onToggle}
        className="min-h-11 rounded-md border-2 border-current px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
      >
        {action} carousel
      </button>
      <span id={statusId} role="status" aria-live="polite">
        Autoplay {paused ? 'paused' : 'running'}
      </span>
    </div>
  );
}
