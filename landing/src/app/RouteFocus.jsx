import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { prepareNativeScroll } from '../hooks/scrollPolicy.js';

function focusTarget(target) {
  if (!target) return;
  const temporaryTabIndex = !target.hasAttribute('tabindex');
  if (temporaryTabIndex) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  if (temporaryTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
}

export function RouteFocus() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousKey = useRef(null);

  useEffect(() => {
    const initial = previousKey.current === null;
    if (previousKey.current === location.key) return undefined;
    previousKey.current = location.key;
    let hash = location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch { /* Keep malformed fragments harmless. */ }
    const heading = document.querySelector('main h1, main');
    if (!hash) {
      if (!initial) focusTarget(heading);
      return undefined;
    }

    const target = document.getElementById(hash);
    if (target) {
      focusTarget(target);
      return undefined;
    }
    if (!initial) focusTarget(heading);
    // Data-backed sections can appear after the router's initial scroll pass.
    const observer = new window.MutationObserver(() => {
      const lateTarget = document.getElementById(hash);
      if (!lateTarget) return;
      observer.disconnect();
      window.clearTimeout(timeout);
      if (initial || navigationType !== 'POP') {
        prepareNativeScroll();
        lateTarget.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      focusTarget(lateTarget);
    });
    observer.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [location.hash, location.key, navigationType]);

  return null;
}
