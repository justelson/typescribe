import { useEffect, useState } from 'react';

export function useAdaptiveHeader() {
  const [compact, setCompact] = useState(() => window.scrollY > 96);

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let downwardTravel = 0;
    let upwardTravel = 0;
    let frame = null;

    const update = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      if (delta > 0) {
        downwardTravel += delta;
        upwardTravel = 0;
      } else if (delta < 0) {
        upwardTravel += Math.abs(delta);
        downwardTravel = 0;
      }

      if (y < 28) {
        setCompact(false);
        downwardTravel = 0;
        upwardTravel = 0;
      } else if (y > 96 && downwardTravel > 34) {
        setCompact(true);
        downwardTravel = 0;
      } else if (upwardTravel > 110) {
        setCompact(false);
        upwardTravel = 0;
      }

      lastY = y;
      frame = null;
    };

    const requestUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return compact;
}
