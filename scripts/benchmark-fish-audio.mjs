import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  estimateFishCostUsd,
  parseDotEnv,
  parseFishBenchmarkManifest,
  parseFishModels,
  selectFishBenchmarkSamples,
  sha256File,
  validateFishBenchmarkCoverage,
} from './lib/fish-benchmark-core.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const PRIVATE_OUTPUT_ROOT = path.join(PROJECT_ROOT, 'tmp', 'benchmark-fish-audio');
const ENDPOINT = 'https://api.fish.audio/v1/asr';
const CAPTURE_SCHEMA = 'typescribe.fish-asr.capture.v1';
const RUN_SCHEMA = 'typescribe.fish-asr.run.v1';

function usage() {
  return `Capture Fish Audio ASR responses for the private TypeScribe benchmark.

Usage:
  node scripts/benchmark-fish-audio.mjs --manifest <file> --mode probe [options]
  node scripts/benchmark-fish-audio.mjs --manifest <file> --mode full [options]

Options:
  --mode <probe|full>               Required. Probe is one Swahili-English sample up to 60s.
  --track <all|swahili-english|english>  Full mode defaults to all tracks.
  --model <transcribe-1[,transcribe-1-pro]>  Defaults to transcribe-1.
  --max-cost-usd <amount>           Required with --execute. Cap the list-price estimate.
  --execute                         Send audio to Fish Audio. Without this, only preflight runs.
  --allow-swahili                   Confirm a reviewed probe before full Swahili-English capture.
  --out-dir <directory>             Private output folder under tmp/benchmark-fish-audio/.
  --env-file <path>                  Override the benchmark .env path.
  --help                            Show this help.

Fish API key: FISH_API_KEY in the shell environment, benchmark .env (default), or project .env fallback.
`;
}

function parseArgs(argv) {
  const args = {
    mode: '',
    track: 'all',
    models: ['transcribe-1'],
    manifest: '',
    maxCostUsd: null,
    execute: false,
    allowSwahili: false,
    outDir: '',
    envFile: '',
    help: false,
  };
  const valueOptions = new Map([
    ['--mode', 'mode'], ['--track', 'track'], ['--model', 'model'],
    ['--manifest', 'manifest'], ['--max-cost-usd', 'maxCostUsd'], ['--out-dir', 'outDir'], ['--env-file', 'envFile'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      args.help = true;
      continue;
    }
    if (argument === '--execute') {
      args.execute = true;
      continue;
    }
    if (argument === '--allow-swahili') {
      args.allowSwahili = true;
      continue;
    }
    const key = valueOptions.get(argument);
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} needs a value.`);
    index += 1;
    if (key === 'model') args.models = parseFishModels(value);
    else if (key === 'maxCostUsd') {
      args.maxCostUsd = Number(value);
      if (!Number.isFinite(args.maxCostUsd) || args.maxCostUsd <= 0) throw new Error('--max-cost-usd must be a positive number.');
    } else args[key] = value;
  }

  if (args.help) return args;
  if (!args.manifest) throw new Error('--manifest is required.');
  if (!['probe', 'full'].includes(args.mode)) throw new Error('--mode must be "probe" or "full".');
  if (!['all', 'swahili-english', 'english'].includes(args.track)) throw new Error('--track must be "all", "swahili-english", or "english".');
  if (args.mode === 'probe' && args.track === 'english') throw new Error('Probe mode only applies to the Swahili-English track.');
  if (args.mode === 'full' && args.allowSwahili && args.track === 'english') throw new Error('--allow-swahili is only relevant when the Swahili-English track is selected.');
  if (args.execute && args.maxCostUsd == null) throw new Error('Paid execution requires --max-cost-usd.');
  return args;
}

async function loadBenchmarkEnv(configuredPath) {
  const candidates = [
    configuredPath ? path.resolve(configuredPath) : '',
    path.join(PROJECT_ROOT, 'benchmarks', 'transcriptbench-v1', '.env'),
    path.join(PROJECT_ROOT, '.env'),
  ].filter((filePath, index, all) => filePath && all.indexOf(filePath) === index);

  for (const filePath of candidates) {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      for (const [key, value] of Object.entries(parseDotEnv(text))) {
        if (!process.env[key] && value) process.env[key] = value;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

function resolvePrivateOutputDirectory(configuredPath) {
  const defaultName = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = path.resolve(configuredPath || path.join(PRIVATE_OUTPUT_ROOT, defaultName));
  const relative = path.relative(PRIVATE_OUTPUT_ROOT, outputDirectory);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Benchmark output must stay under ${PRIVATE_OUTPUT_ROOT}.`);
  }
  return outputDirectory;
}

async function prepareSamples(samples) {
  const prepared = [];
  for (const sample of samples) {
    const stat = await fs.stat(sample.filePath).catch(() => null);
    if (!stat?.isFile()) throw new Error(`Audio file is missing or is not a file: ${sample.filePath}`);
    const fileSha256 = await sha256File(sample.filePath);
    if (sample.expectedSha256 && fileSha256 !== sample.expectedSha256) {
      throw new Error(`SHA-256 mismatch for ${sample.id}. Expected ${sample.expectedSha256}, got ${fileSha256}.`);
    }
    prepared.push({ ...sample, fileSha256, fileBytes: stat.size });
  }
  return prepared;
}

function jsonHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function captureFileName(sample) {
  return `${sample.track}--${sample.id}.json`;
}

function updateRunCapture(run, entry) {
  const key = `${entry.model}/${entry.sampleId}`;
  const captures = run.captures.filter((capture) => `${capture.model}/${capture.sampleId}` !== key);
  captures.push(entry);
  run.captures = captures;
  run.updatedAt = new Date().toISOString();
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 1200);
}

function errorDetail(bodyText) {
  try {
    const body = JSON.parse(bodyText);
    return String(body?.message || body?.reason || body?.error || `Fish Audio returned an error.`).slice(0, 1200);
  } catch {
    return bodyText.trim().slice(0, 1200) || 'Fish Audio returned an empty error response.';
  }
}

async function requestFishAudio(sample, model, apiKey) {
  const audio = await fs.readFile(sample.filePath);
  const form = new FormData();
  form.append('audio', new Blob([audio]), path.basename(sample.filePath));
  form.append('ignore_timestamps', 'false');

  const startedAt = new Date().toISOString();
  const started = performance.now();
  let response;
  let result;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, model },
      body: form,
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    const bodyText = await response.text();
    if (!response.ok) throw Object.assign(new Error(errorDetail(bodyText)), { httpStatus: response.status });
    try {
      result = JSON.parse(bodyText);
    } catch {
      throw new Error('Fish Audio returned a successful response that was not valid JSON.');
    }
    if (typeof result?.text !== 'string' || !Number.isFinite(Number(result?.duration))) {
      throw new Error('Fish Audio response is missing transcript text or duration.');
    }
    return {
      status: 'success',
      capturedAt: startedAt,
      runtimeMs: Math.round(performance.now() - started),
      response: result,
      request: {
        method: 'POST',
        endpoint: ENDPOINT,
        modelHeader: model,
        language: 'auto-detect (no hint sent)',
        ignoreTimestamps: false,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      capturedAt: startedAt,
      runtimeMs: Math.round(performance.now() - started),
      httpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : (response?.status || null),
      error: safeErrorMessage(error),
      request: {
        method: 'POST',
        endpoint: ENDPOINT,
        modelHeader: model,
        language: 'auto-detect (no hint sent)',
        ignoreTimestamps: false,
      },
    };
  }
}

async function loadOrCreateRunIndex(filePath, expected) {
  const existing = await readJsonIfPresent(filePath);
  if (existing) {
    for (const key of ['schema', 'manifestSha256', 'mode', 'track', 'maxCostUsd']) {
      if (existing[key] !== expected[key]) throw new Error(`Existing run index has a different ${key}. Choose a new --out-dir.`);
    }
    if (JSON.stringify(existing.models) !== JSON.stringify(expected.models)) {
      throw new Error('Existing run index has a different model list. Choose a new --out-dir.');
    }
    existing.completedAt = null;
    return existing;
  }
  return {
    ...expected,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    captures: [],
  };
}

async function captureOne(outputDirectory, sample, model, apiKey, run) {
  const modelDirectory = path.join(outputDirectory, model);
  const capturePath = path.join(modelDirectory, captureFileName(sample));
  const existing = await readJsonIfPresent(capturePath);
  if (existing) {
    const sameCapture = existing.schema === CAPTURE_SCHEMA
      && existing.status === 'success'
      && existing.model === model
      && existing.sample?.id === sample.id
      && existing.sample?.sha256 === sample.fileSha256;
    if (!sameCapture) {
      throw new Error(`Existing capture ${capturePath} is not a matching success. Inspect it before retrying; no automatic retry was made.`);
    }
    updateRunCapture(run, {
      model,
      sampleId: sample.id,
      track: sample.track,
      status: 'reused',
      file: path.relative(outputDirectory, capturePath).replaceAll(path.sep, '/'),
      durationSeconds: Number(existing.response.duration),
      costEstimateUsd: estimateFishCostUsd([{ durationSeconds: Number(existing.response.duration) }]),
    });
    return { reused: true, durationSeconds: Number(existing.response.duration) };
  }

  const result = await requestFishAudio(sample, model, apiKey);
  const capture = {
    schema: CAPTURE_SCHEMA,
    provider: 'Fish Audio',
    ...result,
    model,
    sample: {
      id: sample.id,
      track: sample.track,
      purpose: sample.purpose,
      filePath: sample.filePath,
      declaredDurationSeconds: sample.durationSeconds,
      durationSeconds: result.status === 'success' ? Number(result.response.duration) : null,
      fileBytes: sample.fileBytes,
      sha256: sample.fileSha256,
    },
  };
  await writeJsonAtomic(capturePath, capture);

  const entry = {
    model,
    sampleId: sample.id,
    track: sample.track,
    status: result.status,
    file: path.relative(outputDirectory, capturePath).replaceAll(path.sep, '/'),
    runtimeMs: result.runtimeMs,
    durationSeconds: capture.sample.durationSeconds,
    costEstimateUsd: result.status === 'success'
      ? estimateFishCostUsd([{ durationSeconds: capture.sample.durationSeconds }])
      : null,
  };
  updateRunCapture(run, entry);
  return { reused: false, ...entry };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const manifestPath = path.resolve(args.manifest);
  const manifestText = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  const allSamples = parseFishBenchmarkManifest(manifest, path.dirname(manifestPath));
  const selected = selectFishBenchmarkSamples(allSamples, args.mode, args.track);
  if (args.mode === 'full') {
    validateFishBenchmarkCoverage(selected, args.track);
    if (selected.some((sample) => sample.track === 'swahili-english') && !args.allowSwahili) {
      throw new Error('Full Swahili-English capture needs --allow-swahili after you review the separate eligibility probe.');
    }
  }
  const samples = await prepareSamples(selected);
  const manifestSha256 = createHash('sha256').update(manifestText).digest('hex');
  const estimateUsd = estimateFishCostUsd(samples, args.models.length);
  const outputDirectory = resolvePrivateOutputDirectory(args.outDir);
  const maxCostUsd = args.maxCostUsd;

  process.stdout.write(`Fish Audio ${args.mode} preflight\n`);
  process.stdout.write(`Models: ${args.models.join(', ')}\n`);
  process.stdout.write(`Samples: ${samples.length}\n`);
  for (const sample of samples) {
    process.stdout.write(`  ${sample.track} / ${sample.id}: ${sample.durationSeconds}s, ${sample.fileBytes} bytes, sha256 ${sample.fileSha256}\n`);
  }
  process.stdout.write(`Estimated list-price cost: $${estimateUsd.toFixed(4)}\n`);
  if (maxCostUsd != null) process.stdout.write(`Requested estimate cap: $${maxCostUsd.toFixed(4)}\n`);
  process.stdout.write(`Private output: ${outputDirectory}\n`);

  if (!args.execute) {
    process.stdout.write('Preflight only. Add --execute and --max-cost-usd to send audio to Fish Audio.\n');
    return;
  }
  if (estimateUsd > maxCostUsd + 1e-9) {
    throw new Error(`Estimated cost $${estimateUsd.toFixed(4)} exceeds --max-cost-usd $${maxCostUsd.toFixed(4)}. No audio was sent.`);
  }
  await loadBenchmarkEnv(args.envFile);
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new Error('FISH_API_KEY is missing. Set it in .env or the shell environment.');

  const runIndexPath = path.join(outputDirectory, 'run.json');
  const runIndex = await loadOrCreateRunIndex(runIndexPath, {
    schema: RUN_SCHEMA,
    manifestSha256,
    manifestPath,
    mode: args.mode,
    track: args.track,
    models: args.models,
    maxCostUsd,
    listPriceUsdPerAudioHour: 0.36,
    estimateUsd,
    settings: { language: 'auto-detect', ignoreTimestamps: false },
  });
  const runIndexHash = jsonHash({ manifestSha256, mode: args.mode, track: args.track, models: args.models, maxCostUsd });
  if (runIndex.runConfigurationHash && runIndex.runConfigurationHash !== runIndexHash) {
    throw new Error('Existing run configuration changed. Choose a new --out-dir.');
  }
  runIndex.runConfigurationHash = runIndexHash;
  await writeJsonAtomic(runIndexPath, runIndex);

  let estimatedTotalUsd = 0;
  for (const model of args.models) {
    for (const sample of samples) {
      const result = await captureOne(outputDirectory, sample, model, apiKey, runIndex);
      if (result.status === 'error') {
        await writeJsonAtomic(runIndexPath, runIndex);
        throw new Error(`Fish Audio request failed for ${model}/${sample.id} with HTTP ${result.httpStatus ?? 'network error'}: ${result.error}. No automatic retry was made.`);
      }
      const durationSeconds = Number(result.durationSeconds);
      const fileEstimateUsd = estimateFishCostUsd([{ durationSeconds }]);
      estimatedTotalUsd += fileEstimateUsd;
      await writeJsonAtomic(runIndexPath, runIndex);
      process.stdout.write(`${result.reused ? 'Reused' : 'Captured'} ${model}/${sample.id}, ${durationSeconds}s, estimated $${fileEstimateUsd.toFixed(4)}\n`);
      if (estimatedTotalUsd > maxCostUsd + 1e-9) {
        throw new Error(`Provider-reported durations put the run estimate above the cap ($${estimatedTotalUsd.toFixed(4)} > $${maxCostUsd.toFixed(4)}). No more files will be sent.`);
      }
    }
  }
  runIndex.completedAt = new Date().toISOString();
  runIndex.updatedAt = runIndex.completedAt;
  runIndex.reportedDurationCostEstimateUsd = Number(estimatedTotalUsd.toFixed(6));
  await writeJsonAtomic(runIndexPath, runIndex);
  process.stdout.write(`Capture complete. Estimated list-price cost: $${estimatedTotalUsd.toFixed(4)}.\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`Fish benchmark stopped: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
