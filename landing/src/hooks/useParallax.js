import { useEffect, useRef } from 'react';

export function useParallax(speed = 0.08) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let current = 0;
    let target = 0;
    let measureFrame = null;
    let animationFrame = null;

    const animate = () => {
      const difference = target - current;
      current += difference * 0.13;
      if (Math.abs(difference) < 0.12) current = target;
      node.style.setProperty('--parallax-y', `${current.toFixed(2)}px`);
      animationFrame = Math.abs(difference) >= 0.12 ? window.requestAnimationFrame(animate) : null;
    };

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const untransformedTop = rect.top - current;
      const distance = window.innerHeight / 2 - (untransformedTop + rect.height / 2);
      target = Math.max(-140, Math.min(140, distance * speed));
      measureFrame = null;
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(animate);
    };

    const requestMeasure = () => {
      if (measureFrame !== null) return;
      measureFrame = window.requestAnimationFrame(measure);
    };

    requestMeasure();
    window.addEventListener('scroll', requestMeasure, { passive: true });
    window.addEventListener('resize', requestMeasure);
    return () => {
      window.removeEventListener('scroll', requestMeasure);
      window.removeEventListener('resize', requestMeasure);
      if (measureFrame !== null) window.cancelAnimationFrame(measureFrame);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [speed]);

  return ref;
}
