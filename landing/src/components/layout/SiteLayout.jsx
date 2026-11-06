import { useCallback, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useMatches, useNavigation } from 'react-router-dom';
import { RouteFocus } from '../../app/RouteFocus.jsx';
import { useSmoothScroll } from '../../hooks/useSmoothScroll.js';
import '../../styles/smooth-scroll.css';
import { SiteFooter } from './SiteFooter.jsx';
import { SiteHeader } from './SiteHeader.jsx';

export function SiteLayout() {
  const location = useLocation();
  useSmoothScroll(location.key);
  const matches = useMatches();
  const navigation = useNavigation();
  const config = matches.at(-1)?.handle ?? {};
  const [footerOverride, setFooterOverride] = useState(null);
  const updateFooter = useCallback((value) => {
    setFooterOverride({ pathname: location.pathname, value });
  }, [location.pathname]);
  const footer = {
    ...config.footer,
    ...(footerOverride?.pathname === location.pathname ? footerOverride.value : {}),
  };

  return (
    <>
      <a className="skip-link" href={config.skipTarget ?? '#main-content'}>Skip to content</a>
      <SiteHeader />
      {navigation.state !== 'idle' && <span className="sr-only" role="status">Loading page…</span>}
      <Outlet context={updateFooter} />
      <SiteFooter {...footer} />
      <RouteFocus />
      <ScrollRestoration />
    </>
  );
}

export function SiteShell({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`mx-auto w-[calc(100%-48px)] max-w-[1120px] max-[760px]:w-[calc(100%-16px)] ${className}`} {...props}>
      {children}
    </Component>
  );
}
