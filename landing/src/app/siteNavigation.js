import { methodologyPages } from '../features/benchmark/methodology/methodologyPages.js';

const routePaths = new Set(['/', '/benchmark', '/downloads', ...methodologyPages.map(({ path }) => path.replace(/\/+$/, ''))]);

export function isSiteRoute(href) {
  if (typeof href !== 'string' || !/^\/(?!\/)/.test(href)) return false;
  const pathname = href.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return routePaths.has(pathname);
}
