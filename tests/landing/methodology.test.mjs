import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { methodologyPageFromPath, methodologyPages } from '../../landing/src/features/benchmark/methodology/methodologyPages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = (relative) => readFile(path.join(root, relative), 'utf8');

test('benchmark methodology exposes seven real nested routes', () => {
  assert.equal(methodologyPages.length, 7);
  assert.equal(new Set(methodologyPages.map((page) => page.path)).size, methodologyPages.length);
  assert.equal(methodologyPageFromPath('/benchmark/methodology/').slug, 'overview');
  assert.equal(methodologyPageFromPath('/benchmark/methodology/scoring/').slug, 'scoring');
  assert.equal(methodologyPageFromPath('/benchmark/methodology/privacy').slug, 'privacy');
});

test('benchmark page replaces the audio section with a methodology brief', async () => {
  const sections = await source('landing/src/features/benchmark/BenchmarkSections.jsx');
  const page = await source('landing/src/pages/BenchmarkPage.jsx');
  assert.doesNotMatch(`${sections}\n${page}`, /Benchmark audio|CorpusSection/);
  assert.match(sections, /How the benchmark was run/);
  assert.match(sections, /\/benchmark\/methodology\//);
  assert.match(page, /<MethodologyBrief data=\{data\} \/>/);
});

test('methodology redesign keeps a semantic pipeline and consistent green docs', async () => {
  const sections = await source('landing/src/features/benchmark/BenchmarkSections.jsx');
  const briefCss = await source('landing/src/styles/methodology-brief.css');
  const docCss = await source('landing/src/styles/benchmark-methodology.css');
  assert.match(sections, /<ol className="methodology-brief-steps"/);
  assert.match(sections, /as="li"/);
  assert.match(sections, /English reference audit note/);
  assert.match(briefCss, /@media \(max-width: 480px\)/);
  assert.doesNotMatch(briefCss, /overflow-x: auto/);
  assert.match(docCss, /--chart-paper: var\(--forest\)/);
  assert.match(docCss, /--chart-ink: var\(--cream\)/);
  assert.match(docCss, /--chart-muted: #c7d6cc/);
  assert.doesNotMatch(docCss, /html\[data-site-theme="dark"\]/);
});

test('public methodology records the waived listening audit truthfully', async () => {
  const corpus = await source('landing/src/features/benchmark/methodology/CorpusMethodology.jsx');
  const privacy = await source('landing/src/features/benchmark/methodology/PrivacyMethodology.jsx');
  assert.match(corpus, /explicitly waived/i);
  assert.match(privacy, /waived rather than completed/i);
  assert.doesNotMatch(`${corpus}\n${privacy}`, /listening audit (?:was|is) complete/i);
});
