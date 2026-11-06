import { useReveal } from '../../hooks/useReveal.js';

const directions = {
  up: 'translate-y-8 rotate-[.4deg]',
  left: '-translate-x-12 translate-y-3 -rotate-1',
  right: 'translate-x-12 translate-y-3 rotate-1',
  sticker: 'translate-y-10 rotate-[var(--sticker-rotate,-4deg)] scale-[.86]',
};

export function Reveal({ as: Component = 'div', direction = 'up', delay = 0, className = '', children, style, ...props }) {
  const { ref, visible } = useReveal();
  return (
    <Component
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.78,.2,1)] ${visible ? 'translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100' : `opacity-0 ${directions[direction]}`} ${className}`}
      style={{ transitionDelay: `${Math.min(delay, 140)}ms`, ...style }}
      {...props}
    >
      {children}
    </Component>
  );
}
