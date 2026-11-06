export const BENCHMARK_SCOPES = [
  { id: 'all', label: 'All languages', trackKey: null },
  { id: 'english', label: 'English', trackKey: 'english' },
  { id: 'sw-en', label: 'Swahili-English', trackKey: 'swahiliEnglish' },
];

export function benchmarkScope(scope = 'all') {
  const match = BENCHMARK_SCOPES.find((entry) => entry.id === scope);
  if (!match) throw new RangeError(`Unknown benchmark language scope: ${scope}`);
  return match;
}

export function hasTrackResults(data, scope) {
  const { trackKey } = benchmarkScope(scope);
  return !trackKey || Boolean(data?.models.some((model) => model.trackResults?.[trackKey]));
}

export function benchmarkView(data, scope = 'all') {
  const { trackKey } = benchmarkScope(scope);
  if (!data || !trackKey) return data;
  return {
    ...data,
    models: data.models.flatMap((model) => {
      const track = model.trackResults?.[trackKey];
      if (!track) return [];
      const english = scope === 'english';
      return [{
        ...model,
        policy: 'full',
        coverageMinutes: track.coverageMinutes,
        languageSupport: 'supported',
        score: track.score,
        metrics: {
          ...track.metrics,
          englishAccuracy: english ? track.metrics.wordAccuracy : null,
          swahiliAccuracy: english ? null : track.metrics.wordAccuracy,
          englishWer: english ? track.metrics.wer : null,
          swahiliWer: english ? null : track.metrics.wer,
        },
      }];
    }),
  };
}

export function benchmarkRankLabel(scope = 'all') {
  return scope === 'all' ? 'Combined rank' : `${benchmarkScope(scope).label} TypeScribe rank`;
}
