import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { formatUsd, validateBenchmarkData } from '../../landing/src/features/benchmark/benchmarkData.js';
import { benchmarkStats } from '../../landing/src/features/benchmark/benchmarkStats.js';
import { familyVisual, languagePairData, languageTrackData, pointData } from '../../landing/src/features/benchmark/chartModel.js';
import { isRankedRow, rankingRows } from '../../landing/src/features/benchmark/rankingModel.js';

const raw = JSON.parse(await readFile(new URL('../../landing/benchmark/benchmark-data.json', import.meta.url), 'utf8'));
const fishIds = ['fish-audio-transcribe-1', 'fish-audio-transcribe-1-pro'];

// These assertions consume the real aggregate export. They never call a provider,
// load credentials, or read private recordings, references or transcripts.
test('Fish rows publish complete English metrics without fabricated mixed-track scores', () => {
  const data = validateBenchmarkData(raw);
  assert.equal(data.models.length, 10);
  for (const id of fishIds) {
    const model = data.models.find((candidate) => candidate.id === id);
    assert.ok(model, `${id} must exist in the real export`);
    assert.equal(model.provider, 'Fish Audio');
    assert.equal(model.apiModel, id.replace('fish-audio-', ''));
    assert.equal(model.policy, 'probe');
    assert.equal(model.coverageMinutes, 1);
    assert.equal(model.languageSupport, 'unsupported');
    assert.ok(Math.abs(model.cost30MinutesUsd - .18) < .000001, 'Native estimate preserves the frozen 1799.994563-second duration');
    assert.equal(formatUsd(model.cost30MinutesUsd), '$0.18');
    assert.equal(model.score, null);
    assert.ok(Number.isFinite(model.metrics.englishAccuracy));
    assert.ok(Number.isFinite(model.metrics.englishWer));
    for (const key of ['wordAccuracy', 'swahiliAccuracy', 'qualityScore', 'gateScore', 'typeScribeScore', 'wer', 'swahiliWer']) assert.equal(model.metrics[key], null, `${id} ${key}`);
    assert.equal(pointData(data.models, 'typescribe').some((point) => point.model.id === id), false);
    assert.equal(isRankedRow(rankingRows([model])[0]), false);
  }
});

test('benchmark facts derive tested, ranked and English counts from the validated source', () => {
  assert.deepEqual(benchmarkStats(raw), { tested: 10, ranked: 6, english: 10, probeOnly: 4 });
  assert.deepEqual(benchmarkStats(null), { tested: null, ranked: null, english: null, probeOnly: null });
  assert.deepEqual(benchmarkStats({ models: [] }), { tested: 0, ranked: 0, english: 0, probeOnly: 0 });
  const pending = structuredClone(raw);
  for (const model of pending.models) { model.score = null; model.metrics = null; }
  assert.deepEqual(benchmarkStats(pending), { tested: 10, ranked: 0, english: 0, probeOnly: 4 });
});

test('language chart includes English-only evidence and keeps paired averages separate', () => {
  const pairs = languagePairData(raw.models);
  const tracks = languageTrackData(raw.models);
  assert.equal(pairs.length, 6);
  assert.equal(tracks.length, 10);
  assert.deepEqual(tracks.slice(0, pairs.length), pairs, 'Existing paired order must remain intact');
  for (const id of fishIds) {
    const row = tracks.find((candidate) => candidate.model.id === id);
    const model = raw.models.find((candidate) => candidate.id === id);
    assert.equal(row.english, model.metrics.englishAccuracy);
    assert.equal(row.swahili, null);
    assert.equal(row.average, null, 'Single-track evidence has no combined average');
  }
});

test('zero accuracy is real evidence and missing tracks never become zero', () => {
  const models = [
    { id: 'zero-english', label: 'Synthetic zero', provider: 'Fixture', metrics: { englishAccuracy: 0, swahiliAccuracy: null } },
    { id: 'sw-only', label: 'Synthetic Swahili', provider: 'Fixture', metrics: { englishAccuracy: null, swahiliAccuracy: 50 } },
    { id: 'missing', label: 'Synthetic missing', provider: 'Fixture', metrics: null },
  ];
  const tracks = languageTrackData(models);
  assert.equal(tracks.length, 2);
  assert.deepEqual(tracks.find((row) => row.model.id === 'zero-english'), { model: models[0], english: 0, swahili: null, average: null });
  assert.deepEqual(tracks.find((row) => row.model.id === 'sw-only'), { model: models[1], english: null, swahili: 50, average: null });
  assert.equal(languagePairData(models).length, 0);
});

test('Fish models get distinct family colors without changing other families', () => {
  const fish = fishIds.map((id) => raw.models.find((model) => model.id === id));
  assert.equal(familyVisual(fish[0], raw.models).color, '#8c365b');
  assert.equal(familyVisual(fish[1], raw.models).color, '#c87796');
  assert.notEqual(familyVisual(fish[0], raw.models).color, familyVisual(fish[1], raw.models).color);
});

test('provider sources retain the official Fish logo and centered responsive layout', async () => {
  const bytes = await readFile(new URL('../../landing/public/assets/fish-audio-logo.svg', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '110d8a4009a7cca92e056ea690630b8885ac62928322c3ae4899d8d5285894f7');
  assert.doesNotMatch(bytes.toString(), /<(?:script|foreignObject|image)\b|(?:href|src)=/i);
  const css = await readFile(new URL('../../landing/src/styles/benchmark.css', import.meta.url), 'utf8');
  assert.match(css, /\.provider-cloud \{[^}]*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.provider-cloud \{[^}]*grid-template-columns: repeat\(3, 1fr\)/);
  assert.match(css, /\.provider-cloud \{[^}]*grid-template-columns: repeat\(2, 1fr\)/);
  assert.match(css, /\.provider-symbol \{[^}]*height: 42px;[^}]*align-items: center;[^}]*justify-content: center/);
  assert.match(css, /\.provider-mark \.fish-audio-logo \{[^}]*filter: none/);
});

test('aggregate schema still rejects private payload fields', () => {
  for (const field of ['text', 'raw_response', 'audio', 'credential', 'local_path']) {
    const invalid = structuredClone(raw);
    invalid.models.find((model) => model.id === fishIds[0])[field] = 'synthetic rejected fixture';
    assert.throws(() => validateBenchmarkData(invalid), /unapproved field/);
  }
});
