import { useEffect, useLayoutEffect, useRef } from 'react';
import { createSmoothScrollSession } from './smoothScrollSession.js';

export function useSmoothScroll(locationKey) {
  const session = useRef(null);
  useEffect(() => {
    session.current = createSmoothScrollSession(window);
    return () => { session.current?.destroy(); session.current = null; };
  }, []);
  // Child ScrollRestoration runs first. Retain its actual native position and
  // cancel the old page's wheel target for PUSH, POP, and same-path navigation.
  useLayoutEffect(() => { session.current?.resetNativePosition(); }, [locationKey]);
}
