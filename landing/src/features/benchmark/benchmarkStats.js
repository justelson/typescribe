import { metricValue } from './chartModel.js';
import { isRankedRow, rankingRows } from './rankingModel.js';

export function benchmarkStats(data) {
  if (!data) return { tested: null, ranked: null, english: null, probeOnly: null };
  return {
    tested: data.models.length,
    ranked: rankingRows(data.models).filter(isRankedRow).length,
    english: data.models.filter((model) => metricValue(model, 'englishAccuracy') !== null).length,
    probeOnly: data.models.filter((model) => model.policy === 'probe').length,
  };
}
