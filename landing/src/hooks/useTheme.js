import { flushSync } from 'react-dom';
import { useCallback, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'typescribe-site-theme';

function resolveTheme() {
  const preset = document.documentElement.dataset.siteTheme;
  if (preset === 'light' || preset === 'dark') return preset;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState(resolveTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.siteTheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f8edcf' : '#0c0b0e');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = useCallback((origin) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reducedMotion) {
      setTheme(nextTheme);
      return;
    }

    const bounds = origin?.getBoundingClientRect();
    const x = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
    const y = bounds ? bounds.top + bounds.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme));
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 620,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    }).catch(() => {
      // The theme has already switched; unsupported animation details can fail safely.
    });
  }, [theme]);

  return { theme, toggleTheme };
}
