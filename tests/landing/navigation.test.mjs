import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import { isSiteRoute } from '../../landing/src/app/siteNavigation.js';
import { methodologyPages } from '../../landing/src/features/benchmark/methodology/methodologyPages.js';
import { sampleExport } from '../../landing/src/features/transcript-story/previewFormats.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await act(async () => { await pause(10); });
    if (predicate()) return;
  }
  assert.fail(message);
}

test('only real site routes use client navigation', () => {
  for (const href of ['/', '/benchmark/', '/downloads?platform=windows', '/benchmark/#methodology', '/benchmark/methodology/scoring/']) assert.equal(isSiteRoute(href), true, href);
  for (const href of ['#editor', 'https://github.com/justelson/typescribe', '//github.com/justelson/typescribe', '/assets/tool-recorder.webp', '/benchmark/benchmark-data.json', '/downloads/TypeScribe.exe', 'mailto:test@example.com', null]) assert.equal(isSiteRoute(href), false, String(href));
});

test('internal page changes preserve the shared shell and methodology sidebar', async (t) => {
  const dom = new JSDOM('<!doctype html><html data-site-theme="dark"><head><meta name="description"><meta name="theme-color"></head><body><div id="root"></div></body></html>', {
    url: 'http://127.0.0.1:8780/benchmark/methodology/',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  // SSR imports do not inject CSS into JSDOM. Painted section fixtures exercise
  // real computed-style -> hook -> persistent-footer synchronization, not layout.
  const surfaces = window.document.createElement('style');
  surfaces.textContent = `
    body { background: #100e12; }
    html[data-site-theme="light"] body { background: #f8edcf; }
    .methodology-page { background: #0f4836; }
    .product-return { background: #f8edcf; }
    .office-marquee { background: #cc3f27; }
    .transcript-confidence { background: #100e12; }
    html[data-site-theme="light"] .transcript-confidence { background: #f8edcf; }
  `;
  window.document.head.append(surfaces);
  const mediaQueries = new Map();
  window.matchMedia = (query) => {
    if (!mediaQueries.has(query)) {
      const listeners = new Set();
      mediaQueries.set(query, {
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: (_event, listener) => listeners.add(listener),
        removeEventListener: (_event, listener) => listeners.delete(listener),
        setMatches(matches) {
          this.matches = matches;
          for (const listener of listeners) listener({ matches });
        },
      });
    }
    return mediaQueries.get(query);
  };
  const scrolls = [];
  window.scrollTo = (first, second) => {
    const top = typeof first === 'object' ? first.top : second;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: top || 0 });
    scrolls.push(top || 0);
  };
  window.HTMLElement.prototype.scrollIntoView = function () { scrolls.push(this.id); };

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    localStorage: window.localStorage,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const originalFetch = globalThis.fetch;
  const benchmark = JSON.parse(await readFile(path.join(projectRoot, 'landing/benchmark/benchmark-data.json'), 'utf8'));
  let benchmarkRequests = 0;
  let benchmarkDelay = 0;
  let releasesOnline = false;
  const liveRelease = {
    tag_name: 'v9.8.7', name: 'TypeScribe v9.8.7', draft: false, prerelease: false,
    html_url: 'https://github.com/justelson/typescribe/releases/tag/v9.8.7',
    published_at: '2026-10-07T00:00:00Z', body: 'A synthetic release used only by the local regression test.',
    assets: [{ name: 'TypeScribe-Setup-9.8.7.exe', size: 1000, download_count: 0, browser_download_url: 'https://github.com/justelson/typescribe/releases/download/v9.8.7/TypeScribe-Setup-9.8.7.exe' }],
  };
  globalThis.fetch = async (url) => {
    if (String(url).includes('benchmark-data.json')) {
      benchmarkRequests += 1;
      if (benchmarkDelay) await pause(benchmarkDelay);
      return new Response(JSON.stringify(benchmark), { headers: { 'Content-Type': 'application/json' } });
    }
    if (releasesOnline && String(url).startsWith('https://api.github.com/')) return new Response(JSON.stringify([liveRelease]), { headers: { 'Content-Type': 'application/json' } });
    // No actual network: exercise both the bundled fallback and a live-shaped response.
    throw new Error('Offline release fixture');
  };

  let server;
  let router;
  let root;
  t.after(async () => {
    if (root) await act(async () => root.unmount());
    router?.dispose();
    await server?.close();
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    window.close();
  });
  server = await createServer({
    configFile: path.join(projectRoot, 'vite.landing.config.js'),
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const module = await server.ssrLoadModule('/src/app/App.jsx');
  router = module.createSiteRouter();
  root = createRoot(window.document.getElementById('root'));

  await act(async () => root.render(createElement(module.App, { router })));
  await waitFor(() => window.document.querySelector('.methodology-sidebar'), 'Methodology did not render');
  const header = window.document.querySelector('[data-site-header]');
  const footer = window.document.querySelector('footer');
  const sidebar = window.document.querySelector('.methodology-sidebar');
  const documentIdentity = window.document;
  const requestsBefore = benchmarkRequests;
  assert.equal(footer.style.getPropertyValue('--footer-join-background'), 'rgb(15, 72, 54)');
  const click = async (selector, options = {}) => {
    const link = window.document.querySelector(selector);
    assert.ok(link, `Missing link: ${selector}`);
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...options });
    await act(async () => link.dispatchEvent(event));
    return event;
  };

  const corpusClick = await click('.methodology-sidebar a[href="/benchmark/methodology/corpus/"]');
  assert.equal(corpusClick.defaultPrevented, true, 'Internal link allowed a full document navigation');
  await waitFor(() => window.location.pathname === '/benchmark/methodology/corpus/' && window.document.querySelector('h1')?.textContent === 'Corpus and references', 'Corpus route did not change in place');
  assert.equal(window.document, documentIdentity);
  assert.equal(window.document.querySelector('[data-site-header]'), header);
  assert.equal(window.document.querySelector('footer'), footer);
  assert.equal(window.document.querySelector('.methodology-sidebar'), sidebar);
  assert.equal(benchmarkRequests, requestsBefore, 'Methodology tab change refetched the benchmark');
  assert.equal(window.document.title, 'Corpus and references · TypeScribe Bench');
  assert.equal(window.document.querySelector('.methodology-sidebar a[aria-current="page"]').textContent, '02Corpus');
  for (const page of methodologyPages) {
    await click(`.methodology-sidebar a[href="${page.path}"]`);
    await waitFor(() => window.document.querySelector('h1')?.textContent === page.title, `${page.slug} did not render`);
    assert.equal(window.document.querySelector('.methodology-sidebar'), sidebar);
    assert.equal(window.document.querySelector('[data-site-header]'), header);
    assert.equal(window.document.querySelector('footer'), footer);
    assert.deepEqual([...window.document.querySelectorAll('.methodology-article-header dd')].slice(0, 2).map((node) => node.textContent), [benchmark.version, benchmark.updated]);
    if (page.slug === 'overview') {
      assert.deepEqual([...window.document.querySelectorAll('.method-fact-band strong')].map((node) => node.textContent), ['2 × 30 min', String(benchmark.models.length), '6', '10,000']);
    }
    if (page.slug === 'models') {
      const matrix = window.document.querySelector('table');
      assert.equal(matrix.querySelectorAll('tbody tr').length, benchmark.models.length);
      for (const id of ['fish-audio-transcribe-1', 'fish-audio-transcribe-1-pro']) {
        const model = benchmark.models.find((candidate) => candidate.id === id);
        const row = [...matrix.querySelectorAll('tbody tr')].find((node) => node.querySelector('th')?.textContent.includes(model.label));
        assert.deepEqual([...row.querySelectorAll('td')].slice(1, 4).map((node) => node.textContent), ['60-second probe', 'Full 30 min', 'Not ranked']);
      }
    }
  }
  assert.equal(benchmarkRequests, requestsBefore, 'Changing methodology pages restarted data loading');

  const themeButton = window.document.querySelector('button[aria-label="Switch to light theme"]');
  await act(async () => themeButton.click());
  assert.equal(window.document.documentElement.dataset.siteTheme, 'light');
  assert.equal(footer.style.getPropertyValue('--footer-join-background'), 'rgb(15, 72, 54)', 'Documentation seam must stay forest in light theme');

  await click('.methodology-back-link');
  await waitFor(() => window.document.querySelector('h1')?.textContent === 'TypeScribe Bench', 'Results route did not render');
  assert.equal(window.document.querySelector('[data-site-header]'), header);
  assert.equal(window.document.querySelector('footer'), footer);
  assert.equal(window.document.documentElement.dataset.siteTheme, 'light');
  assert.equal(window.document.querySelector('nav[aria-label="Primary navigation"] a[aria-current="page"]').getAttribute('href'), '/benchmark/');
  assert.equal(footer.style.getPropertyValue('--footer-join-background'), 'rgb(248, 237, 207)', 'Benchmark seam must follow its final cream section');
  assert.deepEqual([...window.document.querySelectorAll('.methodology-brief-steps li h3')].map((item) => item.textContent), ['Freeze', 'Capture', 'Normalize', 'Score', 'Combine']);
  assert.match(window.document.querySelector('.methodology-brief-audit').textContent, /explicitly waived/);
  assert.equal(window.document.querySelector('.methodology-brief-link').getAttribute('href'), '/benchmark/methodology/');
  assert.deepEqual([...window.document.querySelectorAll('.methodology-brief-facts dd')].map((node) => node.textContent.trim()), ['2 × 30 min', `${benchmark.models.length} tested`, '6 eligible', '10,000 resamples']);
  await waitFor(() => window.document.querySelectorAll('.ranking-unranked-group tr').length === 5, 'Unranked English-only rows did not render');
  for (const id of ['fish-audio-transcribe-1', 'fish-audio-transcribe-1-pro']) {
    const model = benchmark.models.find((candidate) => candidate.id === id);
    const row = [...window.document.querySelectorAll('.ranking-unranked-group tr')].find((node) => node.querySelector('.ranking-model-cell')?.textContent.includes(model.label));
    assert.ok(row);
    assert.match(row.textContent, /Full English · SW-EN probe/);
    assert.equal(row.querySelectorAll('td')[5].textContent, `${model.metrics.englishAccuracy.toFixed(1)}%`);
    assert.equal(row.querySelectorAll('td')[6].textContent, '—');
  }
  const languagesButton = [...window.document.querySelectorAll('.metric-tabs button')].find((button) => button.textContent === 'Languages');
  await act(async () => languagesButton.click());
  assert.equal(window.document.querySelectorAll('.language-pair-row').length, 10);
  assert.equal(window.document.querySelectorAll('.language-pair-connector').length, 6);
  assert.equal(window.document.querySelectorAll('.language-pair-point.is-english').length, 10);
  assert.equal(window.document.querySelectorAll('.language-pair-point.is-swahili').length, 6);
  assert.equal(window.document.querySelector('.chart-count').textContent, '6 paired · 4 single-track');
  const proModel = benchmark.models.find((model) => model.id === 'fish-audio-transcribe-1-pro');
  const proPoint = [...window.document.querySelectorAll('.language-pair-point.is-english')].find((button) => button.getAttribute('aria-label').startsWith(`${proModel.label}: English accuracy`));
  assert.ok(proPoint, 'Fish Pro needs a real English-only chart point');
  await act(async () => proPoint.focus());
  assert.ok(window.document.querySelector('.chart-floating-card').textContent.includes(proModel.label));
  assert.doesNotMatch(window.document.querySelector('.chart-floating-card').textContent, /Combined rank|Pending/);
  assert.equal(window.document.querySelector('.provider-mark.fish-audio').getAttribute('href'), 'https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits');
  assert.equal(window.document.querySelector('.provider-mark.fish-audio img').getAttribute('src'), '/assets/fish-audio-logo.svg');
  assert.equal(window.document.querySelectorAll('.provider-cloud .provider-symbol').length, 6, 'Provider symbols share a centered height slot');

  // Native link behavior must remain available for new tabs and downloads.
  const nativeClick = async (selector, options = {}) => {
    let intercepted;
    const stopNative = (event) => { intercepted = event.defaultPrevented; event.preventDefault(); };
    window.document.addEventListener('click', stopNative, { once: true });
    await click(selector, options);
    return intercepted;
  };
  assert.equal(await nativeClick('nav[aria-label="Primary navigation"] a[href="/downloads/"]', { ctrlKey: true }), false);
  assert.equal(await nativeClick('nav[aria-label="Primary navigation"] a[href="https://github.com/justelson/typescribe"]'), false);
  assert.equal(await nativeClick('.product-return a[href^="https://github.com/"]'), false);
  assert.equal(window.location.pathname, '/benchmark/');

  window.scrollTo(0, 480);
  await act(async () => mediaQueries.get('(max-width: 860px)').setMatches(true));
  await act(async () => window.document.querySelector('button[aria-label="Open navigation"]').click());
  assert.equal(window.document.body.classList.contains('menu-open'), true);
  await click('nav[aria-label="Primary navigation"] a[href="/downloads/"]');
  await waitFor(() => window.document.querySelector('h1')?.textContent === 'Download TypeScribe', 'Releases route did not render');
  assert.equal(window.document.querySelector('[data-site-header]'), header);
  assert.equal(window.document.querySelector('footer'), footer);
  assert.equal(window.document.body.classList.contains('menu-open'), false);
  assert.equal(window.document.querySelector('.skip-link').getAttribute('href'), '#releases');
  assert.equal(footer.style.getPropertyValue('--footer-join-background'), 'rgb(248, 237, 207)', 'Release seam must fall through to the light page background');
  await act(async () => window.document.querySelector('button[aria-label="Switch to dark theme"]').click());
  await waitFor(() => footer.style.getPropertyValue('--footer-join-background') === 'rgb(16, 14, 18)', 'Footer seam did not respond to a theme change');
  await act(async () => window.document.querySelector('button[aria-label="Switch to light theme"]').click());
  assert.match(footer.textContent, /v[\d.]+ latest release/);
  assert.equal(window.scrollY, 0, 'New page did not reset its scroll position');

  await act(async () => window.history.back());
  await waitFor(() => window.document.querySelector('h1')?.textContent === 'TypeScribe Bench', 'Browser Back did not restore results');
  assert.equal(window.scrollY, 480, 'Back did not restore the saved scroll position');
  assert.equal(window.document.querySelector('[data-site-header]'), header);
  assert.equal(window.document.querySelector('.skip-link').getAttribute('href'), '#main-content');
  await act(async () => window.history.forward());
  await waitFor(() => window.document.querySelector('h1')?.textContent === 'Download TypeScribe', 'Browser Forward did not restore releases');

  await click('[data-site-header] a[aria-label="TypeScribe home"]');
  await waitFor(() => window.document.title === 'TypeScribe | The transcript desk', 'Home route did not render');
  assert.equal(window.document.querySelector('[data-site-header]'), header);
  assert.equal(window.document.querySelector('footer'), footer);
  assert.match(footer.textContent, /TypeScribe 0.1.0 · Windows desktop/);
  assert.deepEqual([...window.document.querySelector('main').children].map((element) => [...element.classList].find((name) => ['catalog-hero', 'office-marquee', 'transcript-product', 'transcript-work', 'transcript-confidence'].includes(name))), ['catalog-hero', 'office-marquee', 'transcript-product', 'transcript-work', 'transcript-confidence']);
  assert.equal(window.document.querySelector('.transcript-confidence .transcript-paper-world'), null, 'Closing scene duplicates clipped paper decorations');
  assert.equal(window.document.querySelectorAll('.transcript-product .transcript-paper-world').length, 1, 'The earlier paper scene was removed unnecessarily');
  assert.equal(window.document.getElementById('editor'), null);
  assert.equal(window.document.querySelector('.hero-actions a[href="#editor"]'), null);
  assert.equal(window.document.querySelectorAll('.hero-actions a').length, 1);
  assert.equal(footer.style.getPropertyValue('--footer-join-background'), 'rgb(248, 237, 207)', 'Home seam must follow its new final paper section');

  // The landing preview is a real local interaction, not a second editor/API.
  const key = async (selector, value) => {
    const target = window.document.querySelector(selector);
    const event = new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
    await act(async () => target.dispatchEvent(event));
    assert.equal(event.defaultPrevented, true);
  };
  await key('#product-view-cara-tab', 'ArrowRight');
  assert.equal(window.document.activeElement.id, 'product-view-rows-tab');
  assert.equal(window.document.getElementById('product-view-rows-panel').hidden, false);
  assert.equal(window.document.getElementById('product-view-cara-panel').hidden, true);
  await key('#product-view-rows-tab', 'Home');
  assert.equal(window.document.getElementById('product-view-cara-panel').hidden, false);
  assert.equal(window.document.getElementById('product-view-cara-tab').tabIndex, 0);
  assert.equal(window.document.getElementById('product-view-rows-tab').tabIndex, -1);
  await key('#work-view-rows-tab', 'ArrowDown');
  assert.equal(window.document.activeElement.id, 'work-view-cara-tab');
  assert.equal(window.document.getElementById('work-view-cara-panel').hidden, false);
  assert.equal(window.document.querySelector('.transcript-reading-copy').textContent, sampleExport('cara').content);
  await key('#work-view-cara-tab', 'End');
  assert.equal(window.document.getElementById('work-view-export-panel').hidden, false);
  const select = async (name, value) => {
    const element = window.document.querySelector(`select[name="${name}"]`);
    await act(async () => { element.value = value; element.dispatchEvent(new window.Event('change', { bubbles: true })); });
  };
  await select('sample-format', 'srt');
  await select('sample-range', 'marked');
  assert.equal(window.document.querySelector('.transcript-export-copy').textContent, sampleExport('srt', 'marked').content);
  assert.doesNotMatch(window.document.querySelector('.transcript-export-copy').textContent, /what changed after the workshop/);
  let sampleBlob;
  let sampleFilename;
  window.URL.createObjectURL = (blob) => { sampleBlob = blob; return 'blob:public-demo'; };
  window.URL.revokeObjectURL = () => {};
  const preventSampleNavigation = (event) => {
    if (event.target instanceof window.HTMLAnchorElement && event.target.download) { sampleFilename = event.target.download; event.preventDefault(); }
  };
  window.document.addEventListener('click', preventSampleNavigation);
  await click('.transcript-export-actions button');
  window.document.removeEventListener('click', preventSampleNavigation);
  assert.equal(sampleFilename, sampleExport('srt', 'marked').filename);
  assert.ok(sampleBlob instanceof window.Blob);
  const downloadedText = await new Promise((resolve, reject) => {
    const reader = new window.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(sampleBlob);
  });
  assert.equal(downloadedText, sampleExport('srt', 'marked').content);
  assert.match(window.document.querySelector('.transcript-export-notice').textContent, /prepared for download/);
  await select('sample-format', 'txt');
  assert.equal(window.document.querySelector('.transcript-export-notice').textContent, '', 'A previous sample download notice became stale');
  await key('#work-view-export-tab', 'Home');
  assert.equal(window.document.getElementById('work-view-rows-panel').hidden, false);
  assert.equal(window.document.querySelectorAll('.transcript-sample tbody tr').length, 7);
  await act(async () => window.document.querySelector('button[aria-label="Switch to dark theme"]').click());
  await waitFor(() => footer.style.getPropertyValue('--footer-join-background') === 'rgb(16, 14, 18)', 'New home footer join did not follow dark theme');
  await act(async () => window.document.querySelector('button[aria-label="Switch to light theme"]').click());
  assert.equal(window.document.querySelector('footer'), footer);
  const insertedSection = window.document.createElement('section');
  insertedSection.style.backgroundColor = '#49bdc3';
  await act(async () => window.document.querySelector('main').append(insertedSection));
  await waitFor(() => footer.style.getPropertyValue('--footer-join-background') === 'rgb(73, 189, 195)', 'Footer did not follow an asynchronously inserted final section');
  await act(async () => insertedSection.remove());
  await waitFor(() => footer.style.getPropertyValue('--footer-join-background') === 'rgb(248, 237, 207)', 'Footer did not restore the new final section color');
  assert.equal(window.document.querySelector('footer'), footer);
  await act(async () => window.document.querySelector('button[aria-label="Open navigation"]').click());
  assert.equal(window.document.body.classList.contains('menu-open'), true);
  await click('[data-site-header] a[aria-label="TypeScribe home"]');
  assert.equal(window.document.body.classList.contains('menu-open'), false, 'Same-page home link retained the menu scroll lock');

  releasesOnline = true;
  await click('.site-footer-navigation a[href="/downloads/"]');
  await waitFor(() => window.document.querySelector('.site-footer-meta')?.textContent === 'v9.8.7 latest release', 'Live release tag did not reach the persistent footer');
  assert.match(window.document.getElementById('latest-release-title').textContent, /v9\.8\.7/);
  assert.equal(window.document.querySelector('.site-footer-download').href, liveRelease.assets[0].browser_download_url);
  assert.equal(window.document.querySelector('footer'), footer);

  await act(async () => router.navigate('/benchmark'));
  await waitFor(() => window.document.querySelector('h1')?.textContent === 'TypeScribe Bench', 'Slashless benchmark route did not render');
  assert.equal(window.document.querySelector('nav[aria-label="Primary navigation"] a[aria-current="page"]').getAttribute('href'), '/benchmark/');
  assert.equal(window.document.querySelector('.site-footer-meta').textContent, 'TypeScribe Bench · aggregate-only report');

  await click('[data-site-header] a[aria-label="TypeScribe home"]');
  await waitFor(() => window.document.title === 'TypeScribe | The transcript desk', 'Home did not return before the delayed hash test');
  benchmarkDelay = 160;
  await act(async () => router.navigate('/benchmark/#score-chart-title'));
  await waitFor(() => window.document.getElementById('score-chart-title') && scrolls.includes('score-chart-title'), 'Late chart hash target was never scrolled into view');
  assert.equal(window.document.activeElement.id, 'score-chart-title');

  await act(async () => router.navigate('/benchmark/#methodology'));
  await waitFor(() => window.location.hash === '#methodology' && window.document.querySelector('.methodology-brief'), 'Cross-page section link did not render');
  assert.ok(scrolls.includes('methodology'), 'Cross-page hash did not scroll to its section');
  assert.equal(window.document.activeElement.id, 'methodology');
  assert.equal(window.document.querySelector('[data-site-header]'), header);
  assert.equal(window.document.querySelector('footer'), footer);
});
