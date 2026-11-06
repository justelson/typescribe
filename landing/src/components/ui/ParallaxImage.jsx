import { useParallax } from '../../hooks/useParallax.js';

export function ParallaxImage({ speed = 0.08, className = '', style, ...props }) {
  const ref = useParallax(speed);
  return (
    <img
      ref={ref}
      className={`translate-y-[var(--parallax-y,0px)] will-change-transform ${className}`}
      style={style}
      {...props}
    />
  );
}
