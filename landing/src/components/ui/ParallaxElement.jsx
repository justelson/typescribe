import { useParallax } from '../../hooks/useParallax.js';

export function ParallaxElement({ as: Component = 'div', speed = 0.08, className = '', children, ...props }) {
  const ref = useParallax(speed);
  return <Component ref={ref} className={className} {...props}>{children}</Component>;
}
