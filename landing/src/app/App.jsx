import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';

const homeRoute = () => import('../pages/HomePage.jsx').then(({ HomePage }) => ({ Component: HomePage }));
const benchmarkFooter = {
  statement: 'A privacy-safe public speech-to-text benchmark.',
  metaLeft: 'TypeScribe Bench · aggregate-only report',
  metaRight: 'No audio or transcript text is served here.',
};

export const siteRoutes = [{
  Component: SiteLayout,
  HydrateFallback: () => <div className="min-h-screen bg-[var(--page-bg)]" aria-label="Loading page" />,
  children: [
    { index: true, lazy: homeRoute },
    {
      path: 'benchmark',
      lazy: () => import('../pages/BenchmarkPage.jsx').then(({ BenchmarkPage }) => ({ Component: BenchmarkPage })),
      handle: { footer: benchmarkFooter },
    },
    {
      path: 'benchmark/methodology/*',
      lazy: () => import('../pages/BenchmarkMethodologyPage.jsx').then(({ BenchmarkMethodologyPage }) => ({ Component: BenchmarkMethodologyPage })),
      handle: {
        footer: {
          statement: benchmarkFooter.statement,
          metaLeft: 'TypeScribe Bench methodology v2',
          metaRight: 'Aggregate methods and results only.',
        },
      },
    },
    {
      path: 'downloads',
      lazy: () => import('../pages/ReleasesPage.jsx').then(({ ReleasesPage }) => ({ Component: ReleasesPage })),
      handle: { skipTarget: '#releases', footer: { metaLeft: 'TypeScribe releases' } },
    },
    { path: '*', lazy: homeRoute },
  ],
}];

export function createSiteRouter() {
  return createBrowserRouter(siteRoutes);
}

let browserRouter;

export function App({ router }) {
  const siteRouter = router ?? (browserRouter ??= createSiteRouter());
  return <RouterProvider router={siteRouter} />;
}
