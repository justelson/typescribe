import assert from 'node:assert/strict';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addBenchmarkTrackResults } from './lib/benchmark-track-export.mjs';

// Local aggregate export only. No provider adapter, credential loading or network.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceArg = process.argv.indexOf('--workspace');
const workspace = workspaceArg >= 0
  ? path.resolve(process.argv[workspaceArg + 1])
  : path.join(root, 'benchmarks', 'transcriptbench-v1');
const readJson = async (filename) => JSON.parse(await readFile(filename, 'utf8'));
const destination = path.join(root, 'landing', 'benchmark', 'benchmark-data.json');
const base = await readJson(destination);
const english = await readJson(path.join(workspace, 'tracks', 'english', 'reports', 'benchmark-results.json'));
const swahiliEnglish = await readJson(path.join(workspace, 'reports', 'benchmark-results.json'));
const swConfig = await readJson(path.join(workspace, 'config', 'benchmark.json'));
const enConfig = await readJson(path.join(workspace, 'tracks', 'english', 'config', 'benchmark.json'));
const enPrices = new Map(enConfig.models.map((model) => [model.id, model.price_usd_per_minute]));
for (const model of swConfig.models.filter((model) => base.models.some((entry) => entry.id === model.id))) {
  assert.equal(enPrices.get(model.id), model.price_usd_per_minute, 'Track-specific prices require a separately reviewed price export');
}
const exported = addBenchmarkTrackResults(base, { english, swahiliEnglish });
for (let index = 0; index < base.models.length; index += 1) {
  const { trackResults: _oldTracks, ...before } = base.models[index];
  const { trackResults: _newTracks, ...after } = exported.models[index];
  assert.deepEqual(after, before, 'Existing combined/public model fields must remain unchanged');
}
assert.deepEqual(exported.corpus, base.corpus);
assert.deepEqual(exported.costs, base.costs);
const temporary = `${destination}.aggregate-export-tmp`;
await writeFile(temporary, `${JSON.stringify(exported, null, 2)}\n`);
await rename(temporary, destination);
console.log(JSON.stringify({ schema: exported.schema, models: exported.models.length, fullEnglish: exported.models.filter((model) => model.trackResults.english).length, fullSwahiliEnglish: exported.models.filter((model) => model.trackResults.swahiliEnglish).length, combinedPreserved: true, providerCalls: 0 }, null, 2));
