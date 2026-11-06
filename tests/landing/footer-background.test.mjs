import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { footerJoinBackground } from '../../landing/src/hooks/footerSurface.js';

function fixture(t, css = '') {
  const dom = new JSDOM(`<!doctype html><html data-site-theme="dark"><head><style>${css}</style></head><body><main><section id="last-section"></section></main><footer style="background: white"></footer></body></html>`);
  t.after(() => dom.window.close());
  const { document } = dom.window;
  return {
    document,
    read: () => footerJoinBackground(document.querySelector('footer'), dom.window.getComputedStyle.bind(dom.window)),
  };
}

test('footer join uses the final section color rather than the footer or page color', (t) => {
  const { document, read } = fixture(t, 'body { background: #0c0b0e; } main { background: #0f4836; } #last-section { background: #cc3f27; }');
  assert.equal(read(), 'rgb(204, 63, 39)');
  document.getElementById('last-section').style.backgroundColor = '#f8edcf';
  assert.equal(read(), 'rgb(248, 237, 207)');
});

test('transparent section wrappers fall through to the methodology page background', (t) => {
  const { document, read } = fixture(t, 'body { background: #0c0b0e; } main { background: #0f4836; } #last-section { background: rgba(0, 0, 0, 0); }');
  assert.equal(read(), 'rgb(15, 72, 54)');
  document.documentElement.dataset.siteTheme = 'light';
  assert.equal(read(), 'rgb(15, 72, 54)');
});

test('unpainted release wrappers use the actual body theme background', (t) => {
  const { document, read } = fixture(t, 'body { background: #100e12; } html[data-site-theme="light"] body { background: #f8edcf; }');
  assert.equal(read(), 'rgb(16, 14, 18)');
  document.documentElement.dataset.siteTheme = 'light';
  assert.equal(read(), 'rgb(248, 237, 207)');
});

test('empty main and entirely unpainted documents safely fall back', (t) => {
  const { document, read } = fixture(t);
  document.querySelector('main').replaceChildren();
  document.querySelector('main').style.backgroundColor = '#0f4836';
  assert.equal(read(), 'rgb(15, 72, 54)');
  document.querySelector('main').style.backgroundColor = 'transparent';
  assert.equal(read(), 'transparent');
  assert.equal(footerJoinBackground(null, () => { throw new Error('No element should be read'); }), 'transparent');
});
