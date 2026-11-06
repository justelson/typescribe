import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = (relative) => readFile(path.join(root, relative), 'utf8');

test('original footer artwork renders with a mobile-safe central composition', async () => {
  const svg = await source('landing/public/assets/typescribe-footer-edge.svg');
  assert.match(svg, /viewBox="0 0 1600 400"/);
  assert.match(svg, /id="transcript-sheet"/);
  assert.match(svg, /id="headphones"/);
  assert.match(svg, /id="left-analog-tape"/);
  assert.match(svg, /id="right-paper-ribbons"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|(?:xlink:)?href=/i);
  const colors = [...new Set(svg.match(/#[a-f0-9]{6}/gi))].sort();
  assert.deepEqual(colors, ['#0f4836', '#f6c943', '#f8edcf']);
  assert.match(svg, /id="left-earcup"[^>]+d="M600 166Q584 166/);
  assert.match(svg, /id="right-earcup"[^>]+d="M980 166Q998 166/);
  assert.match(svg, /id="headband"[^>]+V65Q600 25/);
  assert.doesNotMatch(svg, /a148 148/);
  const artwork = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
  const pixel = (x, y) => [...artwork.pixels.subarray((y * artwork.width + x) * 4, (y * artwork.width + x) * 4 + 4)];
  assert.equal(pixel(520, 120)[3], 0, 'The upper field must be transparent');
  assert.equal(pixel(260, 224)[3], 0, 'The tape reel hub must reveal the section background');
  assert.deepEqual(pixel(780, 195), [248, 237, 207, 255], 'Physical paper keeps its cream fill');
  assert.deepEqual(pixel(800, 390), [15, 72, 54, 255], 'The bottom joins the forest footer body');
  assert.ok(svg.indexOf('id="footer-base"') > svg.indexOf('id="resting-hands"'), 'The green footer must cover the lower artwork, not sit behind it');
  assert.match(svg, /id="reel-mechanics"/);
  assert.deepEqual(pixel(360, 224), [248, 237, 207, 255], 'The reel has a visible fine cream rim');
  for (const [x, y] of [[800, 333], [1340, 345], [606, 352], [990, 350]]) {
    assert.deepEqual(pixel(x, y), [15, 72, 54, 255], 'Lower paper and hands must tuck behind the footer edge');
  }
  for (const width of [880, 1600]) {
    const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render();
    assert.equal(rendered.width, width);
    assert.equal(rendered.height, width / 4);
    assert.ok(rendered.asPng().length > 4000, 'Artwork rendered blank');
  }
});

test('footer follows the inspected composition with real destinations and route metadata', async () => {
  const footer = await source('landing/src/components/layout/SiteFooter.jsx');
  const css = await source('landing/src/styles/footer.css');
  assert.match(footer, /site-footer-illustration/);
  assert.match(footer, /aria-label="Footer navigation"/);
  assert.match(footer, /href=\{downloadHref\}/);
  assert.match(footer, /\{metaLeft\}/);
  assert.match(footer, /\{metaRight\}/);
  assert.match(footer, /site-footer-wordmark/);
  assert.doesNotMatch(footer, /newsletter|mailto:|instagram\.com|twitter\.com/i);
  assert.match(css, /footer\.design\/sites\/breaver-studios/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /width: 880px/);
  assert.doesNotMatch(css, /gradient|animation:/);
  assert.match(css, /background: var\(--footer-join-background, transparent\)/);
  assert.match(css, /\.site-footer-illustration \{[^}]*background: transparent/);
});

test('footer wordmark ships Patriot Bold locally with its font license', async () => {
  const font = await readFile(path.join(root, 'landing/public/assets/fonts/patriot-bold.woff2'));
  const css = await source('landing/src/styles/footer.css');
  const license = await source('docs/licenses/Patriot-OFL.txt');
  assert.equal(font.toString('ascii', 0, 4), 'wOF2');
  assert.equal(font.readUInt32BE(8), font.length, 'Font package is truncated');
  assert.ok(font.length > 4096 && font.length < 64000, 'Expected a complete compact webfont');
  assert.match(css, /font-family: 'Patriot TypeScribe'/);
  assert.match(css, /src: url\('\/assets\/fonts\/patriot-bold\.woff2'\) format\('woff2'\)/);
  assert.match(css, /font: 700 [^;]+ 'Patriot TypeScribe'/);
  assert.match(css, /\(100vw - 40px\) \* 0\.185/);
  assert.match(css, /\.site-footer-wordmark-ink \{[^}]*height: 0\.69em;[^}]*overflow: hidden/);
  assert.match(css, /padding: 18px 24px 0/);
  assert.match(css, /padding: 14px 20px 0/);
  assert.match(css, /\.site-footer-wordmark \{[^}]*min-height: 44px/);
  assert.match(license, /Behalf Studio.*Republish/);
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /page 42/);
});

test('mobile benchmark intro uses readable facts and a usable section link', async () => {
  const css = await source('landing/src/styles/benchmark.css');
  const mobile = css.slice(css.indexOf('@media (max-width: 680px)'));
  assert.match(mobile, /\.benchmark-facts \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobile, /\.benchmark-lockup h1 \{[\s\S]*?font-size: clamp\(1\.75rem, 8\.9vw, 2\.15rem\)/);
  assert.match(mobile, /\.benchmark-status a \{[\s\S]*?min-height: 44px/);
});
