export const BENCHMARK_SCHEMA_V1 = "typescribe.transcriptbench.public.v1";
export const BENCHMARK_SCHEMA_V2 = "typescribe.transcriptbench.public.v2";
const VALID_SCHEMAS = new Set([BENCHMARK_SCHEMA_V1, BENCHMARK_SCHEMA_V2]);
const VALID_POLICIES = new Set(["full", "probe"]);
const VALID_SUPPORT = new Set(["supported", "unsupported", "unknown"]);
const VALID_STATUSES = new Set(["pre-grading", "published"]);

function fail(message) {
  throw new Error(`Invalid TypeScribe Bench data: ${message}`);
}

function object(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${path} must be an object`);
  return value;
}

function exactKeys(value, allowed, path) {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) fail(`${path} contains unapproved ${extra.length === 1 ? "field" : "fields"}: ${extra.join(", ")}`);
}

function string(value, path) {
  if (typeof value !== "string" || !value.trim()) fail(`${path} must be a non-empty string`);
  return value.trim();
}

function number(value, path, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${path} must be a finite number`);
  if (options.integer && !Number.isInteger(value)) fail(`${path} must be an integer`);
  if (options.min !== undefined && value < options.min) fail(`${path} must be at least ${options.min}`);
  if (options.max !== undefined && value > options.max) fail(`${path} must be at most ${options.max}`);
  return value;
}

function array(value, path, options = {}) {
  if (!Array.isArray(value)) fail(`${path} must be an array`);
  if (options.nonEmpty && value.length === 0) fail(`${path} must not be empty`);
  return value;
}

function unique(items, key, path) {
  const values = new Set();
  items.forEach((item, index) => {
    const value = item[key];
    if (values.has(value)) fail(`${path}[${index}].${key} duplicates ${value}`);
    values.add(value);
  });
}

function approximatelyEqual(a, b, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance;
}

function validateScore(value, path) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return number(value, path, { min: 0 });
  const score = object(value, path);
  exactKeys(score, ["display", "value", "confidenceLow", "confidenceHigh", "rank"], path);
  if (score.display !== undefined) string(score.display, `${path}.display`);
  if (score.value !== undefined) number(score.value, `${path}.value`, { min: 0 });
  if (score.confidenceLow !== undefined) number(score.confidenceLow, `${path}.confidenceLow`, { min: 0 });
  if (score.confidenceHigh !== undefined) number(score.confidenceHigh, `${path}.confidenceHigh`, { min: 0 });
  if (score.rank !== undefined) number(score.rank, `${path}.rank`, { integer: true, min: 1 });
  if (score.confidenceLow !== undefined && score.confidenceHigh !== undefined && score.confidenceLow > score.confidenceHigh) fail(`${path} confidence interval is reversed`);
  if (score.display === undefined && score.value === undefined) fail(`${path} must include display or value`);
  return value;
}

function validateMetrics(value, path) {
  if (value === null || value === undefined) return null;
  const metrics = object(value, path);
  const bounded = ["wordAccuracy", "englishAccuracy", "swahiliAccuracy", "qualityScore", "gateScore", "typeScribeScore"];
  const errorRates = ["wer", "englishWer", "swahiliWer"];
  exactKeys(metrics, [...bounded, ...errorRates], path);
  bounded.forEach((key) => {
    if (metrics[key] !== null && metrics[key] !== undefined) number(metrics[key], `${path}.${key}`, { min: 0, max: 100 });
  });
  errorRates.forEach((key) => {
    if (metrics[key] !== null && metrics[key] !== undefined) number(metrics[key], `${path}.${key}`, { min: 0 });
  });
  return metrics;
}

function validateTrackResult(value, path, durationMinutes) {
  if (value === null) return null;
  const track = object(value, path);
  exactKeys(track, ["coverageMinutes", "score", "metrics"], path);
  const coverage = number(track.coverageMinutes, `${path}.coverageMinutes`, { min: 0 });
  if (!approximatelyEqual(coverage, durationMinutes, 0.0001)) fail(`${path} requires complete full-track coverage`);
  const score = object(track.score, `${path}.score`);
  validateScore(score, `${path}.score`);
  const display = string(score.display, `${path}.score.display`);
  if (!/^\d{1,3}\.\d$/.test(display)) fail(`${path}.score.display must be a one-decimal score`);
  for (const key of ["value", "confidenceLow", "confidenceHigh"]) number(score[key], `${path}.score.${key}`, { min: 0, max: 100 });
  number(score.rank, `${path}.score.rank`, { integer: true, min: 1 });
  const metrics = object(track.metrics, `${path}.metrics`);
  exactKeys(metrics, ["wordAccuracy", "wer", "qualityScore", "gateScore", "typeScribeScore"], `${path}.metrics`);
  for (const key of ["wordAccuracy", "qualityScore", "gateScore", "typeScribeScore"]) number(metrics[key], `${path}.metrics.${key}`, { min: 0, max: 100 });
  number(metrics.wer, `${path}.metrics.wer`, { min: 0 });
  if (!approximatelyEqual(Number(display), score.value, 0.0501)) fail(`${path} display must match its score`);
  if (!approximatelyEqual(score.value, metrics.typeScribeScore, 0.0001)) fail(`${path} score must match its track metric`);
  if (!approximatelyEqual(metrics.wordAccuracy, Math.max(0, 100 - metrics.wer), 0.0001)) fail(`${path} word accuracy must match track WER`);
  return track;
}

export function validateBenchmarkData(raw) {
  const data = object(raw, "root");
  exactKeys(data, ["schema", "version", "updated", "status", "corpus", "costs", "models"], "root");
  const schema = string(data.schema, "schema");
  if (!VALID_SCHEMAS.has(schema)) fail(`schema must be one of: ${[...VALID_SCHEMAS].join(", ")}`);
  const trackSchema = schema === BENCHMARK_SCHEMA_V2;
  string(data.version, "version");
  string(data.updated, "updated");
  const status = string(data.status, "status");
  if (!VALID_STATUSES.has(status)) fail(`status must be one of: ${[...VALID_STATUSES].join(", ")}`);

  const corpus = object(data.corpus, "corpus");
  exactKeys(corpus, ["durationMinutes", "acceptedBlocks", "languages", "trials"], "corpus");
  number(corpus.durationMinutes, "corpus.durationMinutes", { min: 0 });
  number(corpus.acceptedBlocks, "corpus.acceptedBlocks", { integer: true, min: 0 });
  const languages = array(corpus.languages, "corpus.languages", { nonEmpty: true });
  languages.forEach((language, index) => string(language, `corpus.languages[${index}]`));
  if (new Set(languages).size !== languages.length) fail("corpus.languages must be unique");

  const trials = array(corpus.trials, "corpus.trials", { nonEmpty: true });
  trials.forEach((trialValue, index) => {
    const trial = object(trialValue, `corpus.trials[${index}]`);
    exactKeys(trial, ["id", "window", "durationMinutes", "acceptedBlocks", "confidence", "audioSizeMb"], `corpus.trials[${index}]`);
    string(trial.id, `corpus.trials[${index}].id`);
    string(trial.window, `corpus.trials[${index}].window`);
    number(trial.durationMinutes, `corpus.trials[${index}].durationMinutes`, { min: 0 });
    number(trial.acceptedBlocks, `corpus.trials[${index}].acceptedBlocks`, { integer: true, min: 0 });
    number(trial.audioSizeMb, `corpus.trials[${index}].audioSizeMb`, { min: 0 });
    const confidence = object(trial.confidence, `corpus.trials[${index}].confidence`);
    exactKeys(confidence, ["high", "medium", "low"], `corpus.trials[${index}].confidence`);
    const high = number(confidence.high, `corpus.trials[${index}].confidence.high`, { integer: true, min: 0 });
    const medium = number(confidence.medium, `corpus.trials[${index}].confidence.medium`, { integer: true, min: 0 });
    const low = number(confidence.low, `corpus.trials[${index}].confidence.low`, { integer: true, min: 0 });
    if (high + medium + low !== trial.acceptedBlocks) fail(`corpus.trials[${index}] confidence counts must equal acceptedBlocks`);
  });
  unique(trials, "id", "corpus.trials");

  const trialMinutes = trials.reduce((sum, trial) => sum + trial.durationMinutes, 0);
  const trialBlocks = trials.reduce((sum, trial) => sum + trial.acceptedBlocks, 0);
  if (!approximatelyEqual(trialMinutes, corpus.durationMinutes, 0.0001)) fail("trial durations must equal corpus.durationMinutes");
  if (trialBlocks !== corpus.acceptedBlocks) fail("trial acceptedBlocks must equal corpus.acceptedBlocks");

  const models = array(data.models, "models");
  models.forEach((modelValue, index) => {
    const model = object(modelValue, `models[${index}]`);
    exactKeys(model, ["id", "label", "provider", "apiModel", "policy", "coverageMinutes", "languageSupport", "cost30MinutesUsd", "score", "family", "familyOrder", "metrics", ...(trackSchema ? ["trackResults"] : [])], `models[${index}]`);
    string(model.id, `models[${index}].id`);
    string(model.label, `models[${index}].label`);
    string(model.provider, `models[${index}].provider`);
    string(model.apiModel, `models[${index}].apiModel`);
    const policy = string(model.policy, `models[${index}].policy`);
    if (!VALID_POLICIES.has(policy)) fail(`models[${index}].policy must be full or probe`);
    const support = string(model.languageSupport, `models[${index}].languageSupport`);
    if (!VALID_SUPPORT.has(support)) fail(`models[${index}].languageSupport is unsupported by the public schema`);
    const coverage = number(model.coverageMinutes, `models[${index}].coverageMinutes`, { min: 0 });
    number(model.cost30MinutesUsd, `models[${index}].cost30MinutesUsd`, { min: 0 });
    validateScore(model.score, `models[${index}].score`);
    if (model.family !== undefined) string(model.family, `models[${index}].family`);
    if (model.familyOrder !== undefined) number(model.familyOrder, `models[${index}].familyOrder`, { min: 0 });
    validateMetrics(model.metrics, `models[${index}].metrics`);
    if (trackSchema) {
      const tracks = object(model.trackResults, `models[${index}].trackResults`);
      exactKeys(tracks, ["english", "swahiliEnglish"], `models[${index}].trackResults`);
      for (const [key, accuracyKey, werKey] of [["english", "englishAccuracy", "englishWer"], ["swahiliEnglish", "swahiliAccuracy", "swahiliWer"]]) {
        const track = validateTrackResult(tracks[key], `models[${index}].trackResults.${key}`, corpus.durationMinutes);
        if (track && model.metrics?.[accuracyKey] != null && !approximatelyEqual(track.metrics.wordAccuracy, model.metrics[accuracyKey], 0.0001)) fail(`models[${index}] ${key} accuracy disagrees with existing metrics`);
        if (track && model.metrics?.[werKey] != null && !approximatelyEqual(track.metrics.wer, model.metrics[werKey], 0.0001)) fail(`models[${index}] ${key} WER disagrees with existing metrics`);
        if (!track && model.metrics?.[accuracyKey] != null) fail(`models[${index}] ${key} scored accuracy requires a full track result`);
      }
      if (policy === "probe" && tracks.swahiliEnglish !== null) fail(`models[${index}] Swahili probes must not carry full-track scores`);
      if (model.score != null && (!tracks.english || !tracks.swahiliEnglish)) fail(`models[${index}] combined scores require both track results`);
    }
    if (policy === "full" && !approximatelyEqual(coverage, corpus.durationMinutes, 0.0001)) fail(`models[${index}] full coverage must equal corpus duration`);
    if (policy === "probe" && (coverage <= 0 || coverage >= corpus.durationMinutes)) fail(`models[${index}] probe coverage must be between zero and corpus duration`);
  });
  unique(models, "id", "models");
  if (status === "pre-grading" && models.some((model) => (
    (model.score !== null && model.score !== undefined)
    || (model.metrics && Object.values(model.metrics).some((value) => value !== null && value !== undefined))
    || (model.trackResults && Object.values(model.trackResults).some((value) => value !== null))
  ))) {
    fail("pre-grading models must keep scores and metrics set to null");
  }

  const costs = object(data.costs, "costs");
  exactKeys(costs, ["supportedMatrixUsd", "eligibilityProbesUsd"], "costs");
  const supportedMatrixUsd = number(costs.supportedMatrixUsd, "costs.supportedMatrixUsd", { min: 0 });
  const eligibilityProbesUsd = number(costs.eligibilityProbesUsd, "costs.eligibilityProbesUsd", { min: 0 });
  const fullCost = models.filter((model) => model.policy === "full").reduce((sum, model) => sum + model.cost30MinutesUsd, 0);
  const probeCost = models.filter((model) => model.policy === "probe").reduce(
    (sum, model) => sum + model.cost30MinutesUsd * (model.coverageMinutes / corpus.durationMinutes),
    0,
  );
  if (!approximatelyEqual(fullCost, supportedMatrixUsd)) fail("costs.supportedMatrixUsd does not match full-model costs");
  if (!approximatelyEqual(probeCost, eligibilityProbesUsd)) fail("costs.eligibilityProbesUsd does not match probe costs");

  return data;
}

export async function loadBenchmarkData(url = "./benchmark-data.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`TypeScribe Bench data returned ${response.status}`);
  return validateBenchmarkData(await response.json());
}

export function formatUsd(value, options = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const minimumFractionDigits = options.minimumFractionDigits ?? (amount < 0.1 ? 3 : 2);
  const maximumFractionDigits = options.maximumFractionDigits ?? (amount < 0.1 ? 4 : 3);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function scoreLabel(model) {
  if (model.score === null || model.score === undefined) return "Pending";
  if (typeof model.score === "number") return String(model.score);
  if (typeof model.score.display === "string") return model.score.display;
  if (typeof model.score.value === "number") return String(model.score.value);
  return "Pending";
}
