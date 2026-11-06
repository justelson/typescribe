import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { footerJoinBackground } from './footerSurface.js';

export function useFooterBackground(footerRef) {
  const { pathname } = useLocation();
  const [background, setBackground] = useState('transparent');

  useLayoutEffect(() => {
    const update = () => setBackground(footerJoinBackground(footerRef.current));
    update();

    const observer = new window.MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-site-theme'] });
    const preceding = footerRef.current?.previousElementSibling;
    if (preceding) observer.observe(preceding, { childList: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [footerRef, pathname]);

  return background;
}
