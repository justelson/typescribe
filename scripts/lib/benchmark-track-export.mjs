import { BENCHMARK_SCHEMA_V2, validateBenchmarkData } from '../../landing/src/features/benchmark/benchmarkData.js';

function trackResult(row, expectedChunks, coverageMinutes) {
  if (!row || !row.complete || row.chunks_scored !== expectedChunks || row.chunks_expected !== expectedChunks) return null;
  const interval = row.score_confidence_intervals?.typescribe_score;
  const rank = row.ranks?.typescribe;
  if (!interval || !Number.isInteger(rank) || rank < 1) throw new Error(`Missing scored track uncertainty/rank for ${row.model_id}`);
  return {
    coverageMinutes,
    score: {
      value: Number(row.typescribe_score.toFixed(4)),
      display: row.typescribe_score.toFixed(1),
      confidenceLow: Number(interval.low.toFixed(4)),
      confidenceHigh: Number(interval.high.toFixed(4)),
      rank,
    },
    metrics: {
      wordAccuracy: row.word_accuracy,
      wer: row.wer * 100,
      qualityScore: row.quality_score,
      gateScore: row.gate_score,
      typeScribeScore: row.typescribe_score,
    },
  };
}

export function addBenchmarkTrackResults(base, { english, swahiliEnglish }) {
  validateBenchmarkData(base);
  for (const [report, id] of [[english, 'english'], [swahiliEnglish, 'sw-en']]) {
    if (report.schema !== 'transcriptbench.results.v1' || report.benchmark?.track_id !== id) throw new Error(`Wrong frozen report for ${id}`);
  }
  const englishById = new Map(english.leaderboard.map((row) => [row.model_id, row]));
  const swById = new Map(swahiliEnglish.leaderboard.map((row) => [row.model_id, row]));
  const expectedChunks = base.corpus.trials.length;
  const result = {
    ...base,
    schema: BENCHMARK_SCHEMA_V2,
    models: base.models.map((model) => ({
      ...model,
      trackResults: {
        english: trackResult(englishById.get(model.id), expectedChunks, base.corpus.durationMinutes),
        swahiliEnglish: model.policy === 'probe' ? null : trackResult(swById.get(model.id), expectedChunks, base.corpus.durationMinutes),
      },
    })),
  };
  return validateBenchmarkData(result);
}
