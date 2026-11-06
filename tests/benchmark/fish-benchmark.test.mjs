import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  estimateFishCostUsd,
  parseDotEnv,
  parseFishBenchmarkManifest,
  parseFishModels,
  selectFishBenchmarkSamples,
  validateFishBenchmarkCoverage,
} from '../../scripts/lib/fish-benchmark-core.mjs';

function sample(id, track, purpose, durationSeconds) {
  return { id, track, purpose, file: `${id}.wav`, durationSeconds };
}

const fullSamples = [
  sample('sw-01', 'swahili-english', 'full', 600),
  sample('sw-02', 'swahili-english', 'full', 600),
  sample('sw-03', 'swahili-english', 'full', 600),
  sample('en-01', 'english', 'full', 600.126),
  sample('en-02', 'english', 'full', 600.159),
  sample('en-03', 'english', 'full', 599.805),
];

test('manifest parser resolves audio paths relative to the manifest and checks fields', () => {
  const parsed = parseFishBenchmarkManifest({
    schema: 'typescribe.fish-benchmark.v1',
    samples: [sample('sw-probe', 'swahili-english', 'probe', 60)],
  }, 'C:/private/bench');
  assert.equal(parsed[0].filePath, 'C:\\private\\bench\\sw-probe.wav');
  assert.throws(() => parseFishBenchmarkManifest({ schema: 'wrong', samples: [] }, '.'), /schema/i);
  assert.throws(() => parseFishBenchmarkManifest({
    schema: 'typescribe.fish-benchmark.v1',
    samples: [sample('bad', 'english', 'full', 600), { ...sample('bad', 'english', 'full', 600), id: 'bad' }],
  }, '.'), /duplicate/i);
});

test('checked-in manifest example matches both frozen TypeScribe tracks', async () => {
  const text = await readFile(new URL('../../scripts/fish-benchmark.manifest.example.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(text);
  const samples = parseFishBenchmarkManifest(manifest, '.');
  assert.equal(selectFishBenchmarkSamples(samples, 'probe').length, 1);
  validateFishBenchmarkCoverage(selectFishBenchmarkSamples(samples, 'full'), 'all');
});

test('probe selection is a single Swahili-English sample capped at 60 seconds', () => {
  const probe = sample('sw-probe', 'swahili-english', 'probe', 60);
  assert.deepEqual(selectFishBenchmarkSamples([probe], 'probe').map(({ id }) => id), ['sw-probe']);
  assert.throws(() => selectFishBenchmarkSamples([sample('too-long', 'swahili-english', 'probe', 61)], 'probe'), /60 seconds/i);
  assert.throws(() => selectFishBenchmarkSamples([probe, { ...probe, id: 'second' }], 'probe'), /exactly one/i);
});

test('full-track validation requires the frozen three-file duration for each benchmark track', () => {
  validateFishBenchmarkCoverage(fullSamples, 'all');
  assert.throws(() => validateFishBenchmarkCoverage(fullSamples.slice(0, 2), 'swahili-english'), /3 frozen samples/i);
  assert.throws(() => validateFishBenchmarkCoverage(fullSamples.slice(0, 3), 'english'), /3 frozen samples/i);
});

test('Fish models and per-request rounded cost are validated', () => {
  assert.deepEqual(parseFishModels('transcribe-1, transcribe-1-pro'), ['transcribe-1', 'transcribe-1-pro']);
  assert.throws(() => parseFishModels('unknown-model'), /unsupported/i);
  assert.throws(() => parseFishModels('transcribe-1,transcribe-1'), /once/i);
  assert.equal(estimateFishCostUsd([{ durationSeconds: 600.126 }, { durationSeconds: 599.805 }]), 0.1201);
  assert.equal(estimateFishCostUsd([{ durationSeconds: 60 }], 2), 0.012);
});

test('.env parser handles comments, export, and quoted values', () => {
  assert.deepEqual(parseDotEnv(`\n# local key\nexport FISH_API_KEY="abc#123"\nPORT=4177 # comment\nBAD LINE\n`), {
    FISH_API_KEY: 'abc#123',
    PORT: '4177',
  });
});
