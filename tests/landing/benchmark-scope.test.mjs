import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { BENCHMARK_SCHEMA_V1, BENCHMARK_SCHEMA_V2, validateBenchmarkData } from '../../landing/src/features/benchmark/benchmarkData.js';
import { benchmarkView, hasTrackResults } from '../../landing/src/features/benchmark/benchmarkScope.js';
import { getMetric } from '../../landing/src/features/benchmark/config.js';
import { pointData } from '../../landing/src/features/benchmark/chartModel.js';
import { rankingRows, sortRankingRows } from '../../landing/src/features/benchmark/rankingModel.js';
import { addBenchmarkTrackResults } from '../../scripts/lib/benchmark-track-export.mjs';

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = JSON.parse(await readFile(path.join(rootPath, 'landing/benchmark/benchmark-data.json'), 'utf8'));
const fishId = 'fish-audio-transcribe-1-pro';
const legacy = () => {
  const data = structuredClone(raw);
  data.schema = BENCHMARK_SCHEMA_V1;
  data.models.forEach((model) => { delete model.trackResults; });
  return data;
};
const empty = () => validateBenchmarkData({ ...legacy(), models: [], costs: { supportedMatrixUsd: 0, eligibilityProbesUsd: 0 } });

// Only public aggregates and synthetic report-shaped fixtures. No paid requests,
// native private workspace, credentials, audio, references or hypotheses.
test('v2 stores complete real Fish English scores while combined and Swahili remain absent', () => {
  assert.equal(validateBenchmarkData(raw).schema, BENCHMARK_SCHEMA_V2);
  const english = benchmarkView(raw, 'english');
  const fish = english.models.find((model) => model.id === fishId);
  assert.equal(fish.metrics.typeScribeScore, 89.54806625267187);
  assert.equal(fish.metrics.gateScore, 100);
  assert.equal(fish.metrics.wer, 10.282574568288853);
  assert.equal(fish.score.rank, 1, 'Use the native paired-bootstrap rank, not a UI-generated rank');
  assert.ok(fish.score.confidenceLow < fish.score.value && fish.score.confidenceHigh > fish.score.value);
  const standard = english.models.find((model) => model.id === 'fish-audio-transcribe-1');
  assert.equal(standard.metrics.typeScribeScore, 85.414273009349);
  assert.equal(standard.score.rank, 1, 'The native English tie group includes standard');
  const combined = raw.models.find((model) => model.id === fishId);
  assert.equal(combined.score, null);
  assert.equal(combined.trackResults.swahiliEnglish, null);
  assert.equal(sortRankingRows(rankingRows(english.models), 'wer', 'asc')[0].model.id, fishId);
  assert.equal(sortRankingRows(rankingRows(english.models), 'rank', 'asc')[0].model.id, fishId);
});

test('one immutable language projection supplies all scalar chart and table metrics', () => {
  const before = JSON.stringify(raw);
  assert.equal(benchmarkView(raw, 'all'), raw, 'All retains the exact source object');
  for (const [scope, count] of [['english', 10], ['sw-en', 6]]) {
    const view = benchmarkView(raw, scope);
    assert.equal(view.models.length, count);
    for (const metric of ['typescribe', 'wer', 'gates', 'quality']) assert.equal(pointData(view.models, metric).length, count);
    for (const model of view.models) {
      const track = model.trackResults[scope === 'english' ? 'english' : 'swahiliEnglish'];
      assert.deepEqual(model.score, track.score);
      assert.equal(model.metrics.typeScribeScore, track.metrics.typeScribeScore);
      assert.equal(model.metrics.wordAccuracy, track.metrics.wordAccuracy);
      assert.equal(model.policy, 'full');
      assert.equal(model.coverageMinutes, 30);
      assert.equal(model.metrics[scope === 'english' ? 'swahiliAccuracy' : 'englishAccuracy'], null);
    }
  }
  assert.equal(benchmarkView(raw, 'sw-en').models.some((model) => model.id === fishId), false);
  assert.equal(JSON.stringify(raw), before);
  assert.throws(() => benchmarkView(raw, 'unknown'), RangeError);
});

test('legacy v1 keeps combined rendering without inventing individual-track scores', () => {
  const data = validateBenchmarkData(legacy());
  assert.equal(benchmarkView(data, 'all'), data);
  assert.equal(hasTrackResults(data, 'english'), false);
  assert.equal(hasTrackResults(data, 'sw-en'), false);
  assert.equal(benchmarkView(data, 'english').models.length, 0);
  assert.equal(pointData(data.models, 'typescribe').length, 6);
});

test('strict nested track schema rejects private fields, incomplete coverage and fabricated scores', () => {
  const trackMutations = [
    (track) => { track.raw_response = 'synthetic rejected payload'; },
    (track) => { track.metrics.text = 'synthetic rejected transcript'; },
    (track) => { track.score.bootstrap_samples = [1, 2]; },
    (track) => { track.score.display = 'synthetic rejected transcript'; },
    (track) => { track.coverageMinutes = 1; },
    (track) => { track.metrics.typeScribeScore = 0; },
    (track) => { track.score.rank = null; },
    (track) => { track.score.confidenceHigh = -1; },
    (track) => { track.metrics.wordAccuracy = 0; },
  ];
  for (const mutate of trackMutations) {
    const invalid = structuredClone(raw);
    mutate(invalid.models.find((model) => model.id === fishId).trackResults.english);
    assert.throws(() => validateBenchmarkData(invalid));
  }
  const invalidProbe = structuredClone(raw);
  invalidProbe.models.find((model) => model.id === fishId).trackResults.swahiliEnglish = invalidProbe.models.find((model) => model.id === fishId).trackResults.english;
  assert.throws(() => validateBenchmarkData(invalidProbe));
  const scoredLegacy = structuredClone(raw);
  scoredLegacy.schema = BENCHMARK_SCHEMA_V1;
  assert.throws(() => validateBenchmarkData(scoredLegacy), /unapproved field/);
});

test('v2 preserves real zero-valued evidence and genuine pre-grading absence', () => {
  const zero = structuredClone(raw);
  const model = zero.models.find((entry) => entry.id === fishId);
  const track = model.trackResults.english;
  track.score = { value: 0, display: '0.0', confidenceLow: 0, confidenceHigh: 0, rank: 1 };
  track.metrics = { wordAccuracy: 0, wer: 100, qualityScore: 0, gateScore: 0, typeScribeScore: 0 };
  model.metrics.englishAccuracy = 0;
  model.metrics.englishWer = 100;
  const view = benchmarkView(validateBenchmarkData(zero), 'english');
  assert.equal(pointData(view.models, 'typescribe').find((point) => point.model.id === fishId).value, 0);
  const pending = structuredClone(raw);
  pending.status = 'pre-grading';
  pending.models.forEach((entry) => { entry.score = null; entry.metrics = null; entry.trackResults = { english: null, swahiliEnglish: null }; });
  validateBenchmarkData(pending);
  assert.equal(hasTrackResults(pending, 'english'), false);
});

function syntheticReport(trackKey, trackId) {
  return {
    schema: 'transcriptbench.results.v1', benchmark: { track_id: trackId },
    leaderboard: raw.models.filter((model) => model.trackResults[trackKey]).map((model) => {
      const track = model.trackResults[trackKey];
      return {
        model_id: model.id, complete: true, chunks_scored: 3, chunks_expected: 3,
        word_accuracy: track.metrics.wordAccuracy, wer: track.metrics.wer / 100,
        quality_score: track.metrics.qualityScore, gate_score: track.metrics.gateScore,
        typescribe_score: track.metrics.typeScribeScore,
        ranks: { typescribe: track.score.rank },
        score_confidence_intervals: { typescribe_score: { low: track.score.confidenceLow, high: track.score.confidenceHigh } },
        text: 'Synthetic private field, must be discarded', bootstrap_typescribe_scores: [1, 2, 3],
      };
    }),
  };
}

test('aggregate exporter selects only approved scalars and never changes combined results', () => {
  const base = legacy();
  const reports = { english: syntheticReport('english', 'english'), swahiliEnglish: syntheticReport('swahiliEnglish', 'sw-en') };
  const result = addBenchmarkTrackResults(base, reports);
  assert.equal(result.schema, BENCHMARK_SCHEMA_V2);
  assert.doesNotMatch(JSON.stringify(result), /Synthetic private|bootstrap_typescribe_scores|"text"/);
  for (let index = 0; index < base.models.length; index += 1) {
    const { trackResults, ...model } = result.models[index];
    assert.deepEqual(model, base.models[index]);
  }
  reports.english.leaderboard.find((model) => model.model_id === fishId).chunks_scored = 1;
  assert.throws(() => addBenchmarkTrackResults(base, reports), /requires a full track result/);
});

test('shared UI selection switches every chart and table while retaining interaction state', async (t) => {
  const dom = new JSDOM('<!doctype html><html data-site-theme="dark"><head><meta name="description"></head><body><div id="root"></div></body></html>', { url: 'http://127.0.0.1:8780/benchmark/', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = (query) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  const globals = { window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, Element: window.Element, localStorage: window.localStorage, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window), IS_REACT_ACT_ENVIRONMENT: true };
  const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const originalFetch = globalThis.fetch;
  let payload = raw;
  let delayed;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    if (delayed) await delayed;
    if (payload === 'error') throw new Error('Synthetic offline benchmark');
    return new Response(JSON.stringify(payload));
  };
  let server;
  let root;
  t.after(async () => {
    if (root) await act(async () => root.unmount());
    await server?.close();
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    window.close();
  });
  server = await createServer({ configFile: path.join(rootPath, 'vite.landing.config.js'), server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { BenchmarkPage } = await server.ssrLoadModule('/src/pages/BenchmarkPage.jsx');
  const mount = async () => {
    if (root) await act(async () => root.unmount());
    root = createRoot(window.document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(BenchmarkPage))));
  };
  const wait = async (predicate) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
      if (predicate()) return;
    }
    assert.fail(`Expected benchmark UI state did not appear: ${window.document.querySelector('.board-state')?.className || 'ready'}; points=${window.document.querySelectorAll('.score-point').length}`);
  };
  const button = (selector, label) => [...window.document.querySelectorAll(`${selector} button`)].find((node) => node.textContent === label);
  const choose = async (selector, label) => { await act(async () => button(selector, label).click()); };
  await mount();
  await wait(() => window.document.querySelectorAll('.score-point').length === 6);
  const initialRequests = requests;
  assert.equal(button('.benchmark-language-tabs', 'All languages').getAttribute('aria-pressed'), 'true');
  for (const theme of ['light', 'dark']) {
    window.document.documentElement.dataset.siteTheme = theme;
    for (const [scope, label, count] of [['all', 'All languages', 6], ['english', 'English', 10], ['sw-en', 'Swahili-English', 6]]) {
      await choose('.benchmark-language-tabs', label);
      for (const [metric, metricLabel] of [['typescribe', 'TypeScribe score'], ['wer', 'WER'], ['gates', 'Pass gates'], ['quality', 'Quality'], ['languages', 'Languages']]) {
        await choose('.metric-tabs', metricLabel);
        assert.equal(button('.benchmark-language-tabs', label).getAttribute('aria-pressed'), 'true');
        assert.equal(window.document.querySelector('#score-chart-title').textContent, getMetric(metric, scope).title);
        assert.equal(window.document.querySelectorAll('.ranking-table-scroll tbody tr').length, scope === 'all' ? 11 : count);
        if (metric === 'languages') {
          assert.equal(window.document.querySelectorAll('.language-pair-point.is-english').length, scope === 'sw-en' ? 0 : 10);
          assert.equal(window.document.querySelectorAll('.language-pair-point.is-swahili').length, scope === 'english' ? 0 : 6);
          assert.equal(window.document.querySelectorAll('.language-pair-connector').length, scope === 'all' ? 6 : 0);
          assert.equal(window.document.querySelectorAll('.language-pair-missing').length, scope === 'all' ? 4 : 0);
        } else {
          assert.equal(window.document.querySelectorAll('.score-point').length, count);
          const pro = [...window.document.querySelectorAll('.score-point')].find((point) => point.getAttribute('aria-label').startsWith('Fish Audio Transcribe-1 Pro:'));
          assert.equal(Boolean(pro), scope === 'english');
          if (scope === 'english') {
            const model = benchmarkView(raw, scope).models.find((candidate) => candidate.id === fishId);
            assert.equal(pro.getAttribute('aria-label'), `${model.label}: ${getMetric(metric).format(model.metrics[getMetric(metric).key])}`);
          }
        }
      }
    }
  }
  assert.equal(requests, initialRequests, 'Scope and metric changes must not trigger new fetches');
  await choose('.benchmark-language-tabs', 'English');
  await choose('.metric-tabs', 'TypeScribe score');
  const proPoint = [...window.document.querySelectorAll('.score-point')].find((point) => point.getAttribute('aria-label').startsWith('Fish Audio Transcribe-1 Pro:'));
  await act(async () => proPoint.focus());
  assert.match(window.document.querySelector('.chart-floating-card').textContent, /English TypeScribe rank: 1/);
  assert.doesNotMatch(window.document.querySelector('.chart-floating-card').textContent, /Combined rank/);
  await act(async () => window.document.querySelector('.chart-expand-button').click());
  await act(async () => window.document.querySelector('.ranking-table-toggle').click());
  await choose('.benchmark-language-tabs', 'Swahili-English');
  assert.equal(window.document.querySelector('.chart-floating-card'), null);
  assert.equal(window.document.querySelector('.ranking-table-disclosure').getAttribute('aria-hidden'), 'true');
  assert.equal(window.document.querySelector('.ranking-table-disclosure').hasAttribute('inert'), true);
  assert.equal(window.document.querySelector('.chart-expand-button').getAttribute('aria-pressed'), 'true');
  await choose('.benchmark-language-tabs', 'English');
  assert.equal(window.document.querySelector('.chart-floating-card'), null, 'Returning must not revive a stale hover');
  await act(async () => window.document.querySelector('.ranking-table-toggle').click());
  assert.equal(window.document.querySelector('.ranking-table-disclosure').getAttribute('aria-hidden'), 'false');
  assert.match(window.document.querySelector('.ranking-table-scroll tbody tr').textContent, /Fish Audio Transcribe-1 Pro/);
  await act(async () => window.document.querySelector('th[aria-sort] button').click());
  await choose('.benchmark-language-tabs', 'All languages');
  await act(async () => button('.ranking-table-scroll thead', 'English').click());
  await choose('.benchmark-language-tabs', 'Swahili-English');
  assert.equal(window.document.querySelector('th[aria-sort="ascending"]').textContent, 'Rank');
  assert.doesNotMatch(window.document.querySelector('.ranking-table-scroll table').textContent, /Fish Audio|Combined rank|Full English/);

  payload = legacy();
  await mount();
  await wait(() => window.document.querySelectorAll('.score-point').length === 6);
  assert.equal(button('.benchmark-language-tabs', 'English').disabled, true);
  assert.equal(button('.benchmark-language-tabs', 'All languages').getAttribute('aria-pressed'), 'true');
  payload = empty();
  await mount();
  await wait(() => window.document.querySelector('.board-empty'));
  assert.equal(window.document.querySelector('.leaderboard-board'), null);
  payload = 'error';
  await mount();
  await wait(() => window.document.querySelector('.board-error'));
  assert.equal(button('.benchmark-language-tabs', 'English').disabled, true);
  payload = raw;
  await act(async () => window.document.querySelector('.board-error button').click());
  await wait(() => window.document.querySelectorAll('.score-point').length === 6);
  let release;
  delayed = new Promise((resolve) => { release = resolve; });
  await mount();
  assert.ok(window.document.querySelector('.board-loading'));
  assert.equal(button('.benchmark-language-tabs', 'English').disabled, true);
  delayed = null;
  await act(async () => release());
  await wait(() => window.document.querySelectorAll('.score-point').length === 6);
});
