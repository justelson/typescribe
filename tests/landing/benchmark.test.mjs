import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { validateBenchmarkData } from '../../landing/src/features/benchmark/benchmarkData.js';
import { languagePairData, metricAxisScale, metricValue, niceMetricMax, pointData } from '../../landing/src/features/benchmark/chartModel.js';
import { isRankedRow, rankingRows, sortRankingRows } from '../../landing/src/features/benchmark/rankingModel.js';

const raw = JSON.parse(await readFile(new URL('../../landing/benchmark/benchmark-data.json', import.meta.url), 'utf8'));

test('current public benchmark contract validates published combined scores', () => {
  const data = validateBenchmarkData(structuredClone(raw));
  assert.equal(data.status, 'published');
  assert.equal(data.models.length, 10);
  assert.equal(pointData(data.models, 'typescribe').length, 6);
  const winner = data.models.find((model) => model.id === 'elevenlabs-scribe-v2');
  assert.equal(winner.score.rank, 1);
  assert.ok(winner.score.confidenceLow < winner.score.value);
  assert.ok(winner.score.confidenceHigh > winner.score.value);
});

test('score charts collapse an empty lower range with a truthful broken axis', () => {
  const data = validateBenchmarkData(structuredClone(raw));
  const values = data.models.map((model) => metricValue(model, 'typeScribeScore')).filter((value) => value !== null);
  assert.equal(niceMetricMax(values), 80);
  const scale = metricAxisScale(values, { higherIsBetter: true });
  assert.equal(scale.breakValue, 40);
  assert.equal(scale.position(40), 90);
  assert.equal(scale.position(0), 100);
  assert.ok(scale.position(Math.min(...values)) < 90);
});

test('language chart builds complete paired rows in strongest-first order', () => {
  const data = validateBenchmarkData(structuredClone(raw));
  const pairs = languagePairData(data.models);
  assert.equal(pairs.length, 6);
  assert.equal(pairs[0].model.id, 'elevenlabs-scribe-v2');
  assert.ok(pairs.every((pair) => pair.english > pair.swahili));
  assert.ok(pairs.every((pair, index) => index === 0 || pairs[index - 1].average >= pair.average));
  assert.deepEqual(
    { english: Number(pairs[0].english.toFixed(1)), swahili: Number(pairs[0].swahili.toFixed(1)) },
    { english: 87.3, swahili: 63.7 },
  );
});

test('ranking table keeps official ties and separates probe-only models', () => {
  const data = validateBenchmarkData(structuredClone(raw));
  const rows = rankingRows(data.models);
  const ranked = sortRankingRows(rows.filter(isRankedRow), 'rank', 'asc');
  const unranked = sortRankingRows(rows.filter((row) => !isRankedRow(row)), 'model', 'asc');
  assert.deepEqual(ranked.map((row) => row.rank), [1, 2, 2, 4, 5, 5]);
  assert.equal(ranked[0].model.id, 'elevenlabs-scribe-v2');
  assert.deepEqual(unranked.map((row) => row.model.id), ['assemblyai-universal-3-5-pro', 'deepgram-nova-3-latest', 'fish-audio-transcribe-1', 'fish-audio-transcribe-1-pro']);
  const byPrice = sortRankingRows(ranked, 'price', 'asc');
  assert.equal(byPrice[0].model.id, 'groq-whisper-large-v3-turbo');
  assert.equal(byPrice.at(-1).model.id, 'speechmatics-enhanced-sw');
});

test('pre-grading rejects scored fields', () => {
  const data = structuredClone(raw);
  data.status = 'pre-grading';
  assert.throws(() => validateBenchmarkData(data), /pre-grading/i);
});

test('legacy published sparse metrics preserve fallback and partial language behavior', () => {
  const data = structuredClone(raw);
  data.schema = 'typescribe.transcriptbench.public.v1';
  data.models.forEach((model) => { delete model.trackResults; model.score = null; model.metrics = null; });
  data.models[0].score = { value: 82.5, display: '82.5' };
  data.models[0].metrics = { wordAccuracy: 88, englishAccuracy: 91, swahiliAccuracy: 74 };
  data.models[1].metrics = { englishAccuracy: 85 };
  const validated = validateBenchmarkData(data);
  assert.equal(metricValue(validated.models[0], 'typeScribeScore'), 82.5);
  assert.equal(metricValue(validated.models[0], 'wer'), 12);
  assert.equal(pointData(validated.models, 'languages').length, 1);
});

test('unknown public fields are rejected', () => {
  const data = structuredClone(raw);
  data.privateTranscript = 'forbidden';
  assert.throws(() => validateBenchmarkData(data), /unapproved/i);
});
