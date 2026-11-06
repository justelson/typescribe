import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const FISH_ASR_RATE_USD_PER_HOUR = 0.36;
export const FISH_ASR_MODELS = Object.freeze(['transcribe-1', 'transcribe-1-pro']);
export const FISH_BENCHMARK_SCHEMA = 'typescribe.fish-benchmark.v1';

const TRACKS = new Set(['swahili-english', 'english']);
const SAMPLE_PURPOSES = new Set(['probe', 'full']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export function parseFishBenchmarkManifest(raw, manifestDirectory) {
  if (raw?.schema !== FISH_BENCHMARK_SCHEMA) {
    throw new Error(`Manifest schema must be ${FISH_BENCHMARK_SCHEMA}.`);
  }
  if (!Array.isArray(raw.samples) || raw.samples.length === 0) {
    throw new Error('Manifest must contain a non-empty samples array.');
  }

  const ids = new Set();
  return raw.samples.map((sample, index) => {
    const row = `samples[${index}]`;
    if (!sample || typeof sample !== 'object' || Array.isArray(sample)) {
      throw new Error(`${row} must be an object.`);
    }
    if (typeof sample.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(sample.id)) {
      throw new Error(`${row}.id must be a short filename-safe identifier.`);
    }
    if (ids.has(sample.id)) throw new Error(`Duplicate sample id: ${sample.id}.`);
    ids.add(sample.id);
    if (!TRACKS.has(sample.track)) throw new Error(`${row}.track must be "swahili-english" or "english".`);
    if (!SAMPLE_PURPOSES.has(sample.purpose)) throw new Error(`${row}.purpose must be "probe" or "full".`);
    if (typeof sample.file !== 'string' || !sample.file.trim()) throw new Error(`${row}.file is required.`);

    const durationSeconds = Number(sample.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error(`${row}.durationSeconds must be a positive number.`);
    }
    const expectedSha256 = sample.sha256 == null || sample.sha256 === ''
      ? null
      : String(sample.sha256).toLowerCase();
    if (expectedSha256 && !SHA256_PATTERN.test(expectedSha256)) {
      throw new Error(`${row}.sha256 must be a 64-character hexadecimal SHA-256 hash.`);
    }

    return {
      id: sample.id,
      track: sample.track,
      purpose: sample.purpose,
      filePath: path.resolve(manifestDirectory, sample.file),
      durationSeconds,
      expectedSha256,
    };
  });
}

export function selectFishBenchmarkSamples(samples, mode, track = 'all') {
  if (!['probe', 'full'].includes(mode)) throw new Error('Mode must be "probe" or "full".');
  if (!['all', ...TRACKS].includes(track)) throw new Error('Track must be "all", "swahili-english", or "english".');
  if (mode === 'probe' && track === 'english') throw new Error('The eligibility probe is for the Swahili-English track.');

  const selected = samples.filter((sample) => sample.purpose === mode && (track === 'all' || sample.track === track));
  if (mode === 'probe') {
    if (selected.length !== 1) throw new Error('Probe mode needs exactly one Swahili-English sample marked purpose "probe".');
    if (selected[0].track !== 'swahili-english' || selected[0].durationSeconds > 60) {
      throw new Error('The Swahili-English eligibility probe must be no longer than 60 seconds.');
    }
  } else if (selected.length === 0) {
    throw new Error(`No full-capture samples found for track "${track}".`);
  }
  return selected;
}

export function validateFishBenchmarkCoverage(samples, track = 'all') {
  const expected = {
    'swahili-english': { count: 3, seconds: 1800 },
    english: { count: 3, seconds: 1800.09 },
  };
  const tracks = track === 'all' ? Object.keys(expected) : [track];
  for (const name of tracks) {
    const group = samples.filter((sample) => sample.track === name && sample.purpose === 'full');
    const target = expected[name];
    if (!target || group.length !== target.count) {
      throw new Error(`Full ${name} capture needs ${target?.count ?? 'a valid number of'} frozen samples; found ${group.length}.`);
    }
    const seconds = group.reduce((sum, sample) => sum + sample.durationSeconds, 0);
    if (Math.abs(seconds - target.seconds) > 0.1) {
      throw new Error(`Full ${name} capture totals ${seconds.toFixed(3)} seconds; expected ${target.seconds.toFixed(3)} seconds.`);
    }
  }
}

export function parseFishModels(value = 'transcribe-1') {
  const models = String(value).split(',').map((model) => model.trim()).filter(Boolean);
  if (!models.length) throw new Error('Choose at least one Fish Audio ASR model.');
  for (const model of models) {
    if (!FISH_ASR_MODELS.includes(model)) {
      throw new Error(`Unsupported Fish Audio ASR model "${model}". Choose ${FISH_ASR_MODELS.join(' or ')}.`);
    }
  }
  if (new Set(models).size !== models.length) throw new Error('A Fish Audio model may only be listed once.');
  return models;
}

export function estimateFishCostUsd(samples, modelCount = 1) {
  if (!Number.isInteger(modelCount) || modelCount < 1) throw new Error('modelCount must be a positive integer.');
  const billableSeconds = samples.reduce((total, sample) => {
    const seconds = Number(sample.durationSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Every sample needs a positive durationSeconds value.');
    return total + Math.ceil(seconds - 1e-9);
  }, 0);
  return Number((billableSeconds * modelCount * FISH_ASR_RATE_USD_PER_HOUR / 3600).toFixed(6));
}

export async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

export function parseDotEnv(text) {
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const assignment = trimmed.replace(/^export\s+/, '');
    const separator = assignment.indexOf('=');
    if (separator < 1) continue;
    const key = assignment.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = assignment.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[key] = value;
  }
  return values;
}
