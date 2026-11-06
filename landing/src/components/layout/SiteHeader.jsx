import { Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SiteLink } from '../ui/SiteLink.jsx';
import { PlatformIcon } from '../ui/PlatformIcon.jsx';
import { installableAssets, snapshotReleases } from '../../features/releases/releaseData.js';
import { useAdaptiveHeader } from '../../hooks/useAdaptiveHeader.js';
import { useDetectedPlatform } from '../../hooks/useDetectedPlatform.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useTheme } from '../../hooks/useTheme.js';

const navigation = [
  { label: 'Model benchmarks', href: '/benchmark/' },
  { label: 'Release', href: '/downloads/' },
  { label: 'GitHub', href: 'https://github.com/justelson/typescribe' },
];

function pathMatches(href, pathname) {
  if (!href.startsWith('/')) return false;
  const route = href.replace(/\/+$/, '') || '/';
  const current = pathname.replace(/\/+$/, '') || '/';
  return current === route || (route !== '/' && current.startsWith(`${route}/`));
}

export function SiteHeader() {
  const compact = useAdaptiveHeader();
  const { theme, toggleTheme } = useTheme();
  const detectedPlatform = useDetectedPlatform();
  const platformInstaller = installableAssets(snapshotReleases[0]).find((asset) => asset.platform.key === detectedPlatform.key);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useMediaQuery('(max-width: 860px)');
  const { pathname, key } = useLocation();

  useEffect(() => { setMenuOpen(false); }, [key]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', mobile && menuOpen);
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('menu-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen, mobile]);

  useEffect(() => {
    if (!mobile) setMenuOpen(false);
  }, [mobile]);

  const shellSize = compact
    ? 'w-[calc(100%-32px)] max-w-[900px] min-h-14 max-[860px]:w-[calc(100%-24px)] max-[860px]:min-h-[52px]'
    : 'w-[calc(100%-48px)] max-w-[1120px] min-h-[70px] max-[860px]:w-[calc(100%-16px)] max-[860px]:min-h-[58px]';

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[90] h-1.5 bg-[linear-gradient(90deg,#f2a3b8_0_25%,#f6c943_25%_50%,#176348_50%_75%,#49bdc3_75%)]" aria-hidden="true" />
      <header className="sticky top-0 z-[80] pt-[17px]" data-site-header>
        <div
          className={`relative mx-auto grid grid-cols-[minmax(215px,auto)_minmax(0,1fr)_auto] items-center border border-[var(--page-line)] bg-[var(--header-bg)] shadow-[0_14px_36px_var(--header-shadow)] transition-[width,max-width,min-height,background,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] max-[860px]:grid-cols-[minmax(0,1fr)_auto] ${shellSize}`}
        >
          <SiteLink
            className={`header-slide header-slide-wordmark flex h-full items-center border-r border-[var(--page-line)] px-6 font-display font-extrabold tracking-[-0.05em] text-[var(--page-copy)] no-underline transition-[padding,font-size] duration-500 max-[860px]:border-r-0 max-[860px]:px-3.5 ${compact ? 'text-[.98rem]' : 'text-base'}`}
            href="/"
            aria-label="TypeScribe home"
            onClick={() => setMenuOpen(false)}
          >
            TypeScribe
          </SiteLink>

          <nav
            id="primary-navigation"
            aria-label="Primary navigation"
            aria-hidden={mobile && !menuOpen}
            inert={mobile && !menuOpen ? true : undefined}
            className={`${menuOpen ? 'max-[860px]:flex' : 'max-[860px]:hidden'} flex h-full items-stretch justify-center max-[860px]:absolute max-[860px]:inset-[76px_8px_auto] max-[860px]:z-20 max-[860px]:h-auto max-[860px]:w-auto max-[860px]:flex-col max-[860px]:border max-[860px]:border-yellow max-[860px]:bg-ink max-[860px]:p-[10px_14px_18px]`}
          >
            {navigation.map((item, index) => {
              const active = pathMatches(item.href, pathname);
              const lineColor = index === 0 ? 'bg-pink' : index === 1 ? 'bg-cyan' : 'bg-yellow';
              return (
                <span className="contents" key={item.label}>
                  {index > 0 && <i className={`my-auto h-1 w-1 ${index === 1 ? 'bg-cyan' : 'bg-yellow'} max-[860px]:hidden`} aria-hidden="true" />}
                  <SiteLink
                    className={`group relative flex min-h-[54px] items-center px-5 font-mono text-[.62rem] font-semibold uppercase tracking-[.02em] no-underline transition-colors hover:text-yellow max-[860px]:min-h-[50px] max-[860px]:border-b max-[860px]:border-white/15 max-[860px]:px-1 max-[860px]:text-cream ${active ? 'text-yellow' : 'text-[var(--page-copy)]'}`}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                    <span className={`absolute inset-x-5 bottom-2.5 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100 ${lineColor} ${active ? 'scale-x-100' : ''}`} aria-hidden="true" />
                  </SiteLink>
                </span>
              );
            })}
          </nav>

          <div className="flex h-full items-stretch border-l border-[var(--page-line)] max-[860px]:col-start-2">
            <button
              className="header-slide header-slide-theme flex w-12 items-center justify-center border-0 border-r border-[var(--page-line)] bg-transparent text-yellow"
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={(event) => toggleTheme(event.currentTarget)}
            >
              <span className="theme-icon-switch" key={theme}>
                {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
              </span>
            </button>
            {platformInstaller ? (
              <a
                className="header-slide header-slide-download header-download-cell inline-flex min-w-[178px] items-center justify-center gap-2 px-4 font-mono text-[.6rem] font-bold no-underline max-[540px]:hidden"
                href={platformInstaller.url}
                aria-label={`Download TypeScribe for ${detectedPlatform.label}`}
              >
                <PlatformIcon platform={detectedPlatform} className="header-platform-icon h-4 w-4" /> Download for {detectedPlatform.label}
              </a>
            ) : (
              <span className="header-slide header-slide-download inline-flex min-w-[178px] cursor-not-allowed items-center justify-center gap-2 px-4 font-mono text-[.6rem] font-bold text-[var(--page-muted)] max-[540px]:hidden" aria-disabled="true">
                <PlatformIcon platform={detectedPlatform} className="h-4 w-4" /> {detectedPlatform.label} coming soon
              </span>
            )}
            <button
              className="header-slide header-slide-menu hidden w-11 items-center justify-center border-0 bg-transparent text-[var(--page-copy)] max-[860px]:flex"
              type="button"
              aria-controls="primary-navigation"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
