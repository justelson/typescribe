import { metricValue } from './chartModel.js';

export function rankingRows(models) {
  return models.map((model) => ({
    model,
    rank: typeof model.score?.rank === 'number' ? model.score.rank : null,
    score: metricValue(model, 'typeScribeScore'),
    confidenceLow: typeof model.score?.confidenceLow === 'number' ? model.score.confidenceLow : null,
    confidenceHigh: typeof model.score?.confidenceHigh === 'number' ? model.score.confidenceHigh : null,
    wer: metricValue(model, 'wer'),
    quality: metricValue(model, 'qualityScore'),
    gates: metricValue(model, 'gateScore'),
    english: metricValue(model, 'englishAccuracy'),
    swahili: metricValue(model, 'swahiliAccuracy'),
    price: model.cost30MinutesUsd,
  }));
}

export function isRankedRow(row) {
  return row.rank !== null && row.score !== null;
}

export function sortRankingRows(rows, key = 'rank', direction = 'asc') {
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...rows].sort((left, right) => {
    const leftValue = key === 'model' ? left.model.label.toLocaleLowerCase() : left[key];
    const rightValue = key === 'model' ? right.model.label.toLocaleLowerCase() : right[key];
    if (leftValue === null && rightValue === null) return left.model.label.localeCompare(right.model.label);
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    const comparison = typeof leftValue === 'string'
      ? leftValue.localeCompare(rightValue)
      : leftValue - rightValue;
    if (comparison !== 0) return comparison * multiplier;
    return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
      || (right.score ?? -1) - (left.score ?? -1)
      || left.model.label.localeCompare(right.model.label);
  });
}
