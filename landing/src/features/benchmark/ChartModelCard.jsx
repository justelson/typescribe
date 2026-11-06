import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatUsd } from './benchmarkData.js';
import { benchmarkRankLabel } from './benchmarkScope.js';
import { familyVisual, metricValue } from './chartModel.js';
import { getMetric } from './config.js';
import { useChartCardPosition } from './useChartCardPosition.js';

function metricDisplay(model, metricName, scope) {
  if (metricName === 'languages') {
    const english = metricValue(model, 'englishAccuracy');
    const swahili = metricValue(model, 'swahiliAccuracy');
    const available = [english === null ? null : `${english.toFixed(1)} EN`, swahili === null ? null : `${swahili.toFixed(1)} SW-EN`].filter(Boolean);
    return available.length ? available.join(' · ') : 'Pending';
  }
  const metric = getMetric(metricName, scope);
  const value = metricValue(model, metric.key);
  return value === null ? 'Pending' : metric.format(value);
}

export function ChartModelCard({ model, models, metricName, scope, anchor, id, cardEvents, pending = false }) {
  const ref = useRef(null);
  const visual = familyVisual(model, models);
  const contentKey = JSON.stringify([model.id, model.label, model.provider, model.apiModel, metricName, scope, pending, metricDisplay(model, metricName, scope), model.cost30MinutesUsd, model.score]);
  const position = useChartCardPosition(ref, anchor, contentKey);
  return createPortal(
    <aside
      ref={ref}
      id={id}
      className="chart-floating-card"
      role="tooltip"
      data-placement={position?.placement}
      style={{ '--family-color': visual.color, position: 'fixed', left: position?.x || 0, top: position?.y || 0, width: position?.width, maxWidth: position?.maxWidth, maxHeight: position?.maxHeight, visibility: position ? 'visible' : 'hidden' }}
      {...cardEvents}
    >
      <span className="chart-floating-card-heading"><strong>{model.label}</strong><b>{pending ? 'Pending' : metricDisplay(model, metricName, scope)}</b></span>
      <span>{model.provider} · {model.apiModel}</span>
      {metricName === 'typescribe' && model.score?.rank && <span>{benchmarkRankLabel(scope)}: {model.score.rank}</span>}
      {metricName === 'typescribe' && typeof model.score?.confidenceLow === 'number' && <span>95% CI: {model.score.confidenceLow.toFixed(1)} to {model.score.confidenceHigh.toFixed(1)}</span>}
      <span>30-minute price: {formatUsd(model.cost30MinutesUsd)}</span>
    </aside>,
    anchor.ownerDocument.body,
  );
}
