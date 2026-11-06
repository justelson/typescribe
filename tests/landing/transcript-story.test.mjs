import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { seedProjects } from '../../src/data/projects.js';
import { makeInqText, makeKaraText, makeSrt } from '../../src/utils/transcript.js';
import { demoExcerpt } from '../../landing/src/features/transcript-story/demoExcerpt.js';
import { sampleExport, sampleProject } from '../../landing/src/features/transcript-story/previewFormats.js';
import { saveSampleExport } from '../../landing/src/features/transcript-story/saveSampleExport.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = (file) => readFile(path.join(root, file), 'utf8');

test('the landing example contains only an allowlisted excerpt of the synthetic public demo', () => {
  const seed = seedProjects.find((project) => project.id === 'demo-interview');
  assert.match(seed.notes, /^Synthetic public demo/);
  assert.equal(demoExcerpt.title, seed.title);
  assert.deepEqual(demoExcerpt.segments, seed.segments.slice(3, 10).map(({ id, startMs, endMs, speakerId, text }) => ({ id, startMs, endMs, speakerId, text })));
  assert.deepEqual(Object.keys(demoExcerpt).sort(), ['segments', 'speakers', 'title']);
  assert.deepEqual(demoExcerpt.speakers, seed.speakers.filter((speaker) => demoExcerpt.segments.some((segment) => segment.speakerId === speaker.id)));
  for (const segment of demoExcerpt.segments) assert.deepEqual(Object.keys(segment).sort(), ['endMs', 'id', 'speakerId', 'startMs', 'text']);
});

test('sample formats and ranges use the same domain output as the desktop app', () => {
  const baseline = structuredClone(demoExcerpt);
  for (const [format, render, extension] of [['cara', makeKaraText, 'cara.md'], ['txt', makeInqText, 'txt'], ['srt', makeSrt, 'srt']]) {
    for (const range of ['all', 'marked']) {
      const output = sampleExport(format, range);
      assert.equal(output.content, render(sampleProject(range)));
      assert.equal(output.filename, `typescribe-public-demo-${range}.${extension}`);
    }
  }
  assert.equal(sampleProject('all').segments.length, 7);
  assert.equal(sampleProject('marked').segments.length, 6);
  assert.ok(sampleProject('marked').segments.every((segment) => segment.speakerId === 'speaker_p1'));
  assert.doesNotMatch(sampleExport('cara', 'marked').content, /what changed after the workshop/);
  assert.match(sampleExport('srt', 'marked').content, /^1\n00:00:15,400 --> 00:00:18,580\nP1:/);
  assert.deepEqual(demoExcerpt, baseline, 'Rendering or exporting mutated the source example');
  assert.throws(() => sampleProject('private'), RangeError);
  assert.throws(() => sampleExport('audio'), RangeError);
});

test('sample downloads are local, user-initiated, and release the generated object URL', async () => {
  const log = [];
  let anchor;
  let blob;
  let delayed;
  const browser = {
    Blob,
    URL: { createObjectURL(value) { blob = value; log.push('create'); return 'blob:public-demo'; }, revokeObjectURL(url) { log.push(`revoke:${url}`); } },
    document: { createElement(tag) { assert.equal(tag, 'a'); anchor = { click() { log.push('click'); }, remove() { log.push('remove'); } }; return anchor; }, body: { append(value) { assert.equal(value, anchor); log.push('append'); } } },
    setTimeout(callback, duration) { assert.equal(duration, 1000); delayed = callback; },
  };
  const output = sampleExport('txt', 'marked');
  saveSampleExport(output, browser);
  assert.equal(anchor.href, 'blob:public-demo');
  assert.equal(anchor.download, output.filename);
  assert.equal(await blob.text(), output.content);
  assert.deepEqual(log, ['create', 'append', 'click', 'remove']);
  delayed();
  assert.equal(log.at(-1), 'revoke:blob:public-demo');
  anchor = null;
  browser.document.createElement = () => { anchor = { click() { throw new Error('Download blocked'); }, remove() { log.push('remove-failed'); } }; return anchor; };
  assert.throws(() => saveSampleExport(output, browser), /Download blocked/);
  assert.equal(log.at(-1), 'remove-failed');
  delayed();
  assert.equal(log.at(-1), 'revoke:blob:public-demo');
});

test('the body is scoped, responsive, reduced-motion safe, and imports no project collection or audio', async () => {
  const css = await source('landing/src/styles/transcript-story.css');
  const domain = await source('landing/src/features/transcript-story/previewFormats.js');
  const sample = await source('landing/src/features/transcript-story/TranscriptSample.jsx');
  const preview = await source('landing/src/features/transcript-story/ProductPreviewSection.jsx');
  const confidence = await source('landing/src/features/transcript-story/TranscriptConfidenceSection.jsx');
  assert.match(domain, /src\/utils\/transcript\.js/);
  assert.doesNotMatch(`${domain}\n${sample}\n${preview}`, /seedProjects|src\/data\/projects|<audio|<video|fetch\(|localStorage|benchmark-data/);
  assert.match(css, /html\[data-site-theme="light"\] \.transcript-story/);
  assert.match(css, /@media \(max-width: 400px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(css, /position: sticky|background-attachment|\.site-header|\.site-footer|\.catalog-hero/);
  assert.match(sample, /role="status"/);
  assert.match(confidence, /Selected media goes to Deepgram only when you run transcription/);
  assert.doesNotMatch(confidence, /PaperWorld|transcript-confidence-world/, 'The closing section must not duplicate clipped paper banks above the footer');
  assert.doesNotMatch(css, /\.transcript-confidence-world/);
  assert.match(preview, /<PaperWorld className="transcript-product-world"/);
  for (const view of ['cara', 'rows']) {
    const asset = await readFile(path.join(root, `landing/public/assets/typescribe-${view}-detail.webp`));
    assert.equal(asset.toString('ascii', 8, 12), 'WEBP');
    assert.ok(asset.length > 5000);
  }
});

test('the original paper-world illustration renders safely with a transparent reading zone', async () => {
  const svg = await source('landing/public/assets/typescribe-paper-world.svg');
  assert.match(svg, /viewBox="0 0 1600 360"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|<filter|(?:xlink:)?href=/i);
  const allowed = new Set(['#0f4836', '#f8edcf', '#f3dfb5', '#f6c943', '#f2a3b8']);
  for (const color of svg.match(/#[a-f0-9]{6}/gi)) assert.ok(allowed.has(color.toLowerCase()), color);
  const render = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
  assert.equal(render.width, 1600);
  assert.equal(render.height, 360);
  const pixels = render.pixels;
  for (const [x, y] of [[360, 0], [800, 120], [1240, 240]]) assert.equal(pixels[(y * render.width + x) * 4 + 3], 0, 'Illustration competes with the reading zone');
  assert.ok(render.asPng().length > 4000);
});
