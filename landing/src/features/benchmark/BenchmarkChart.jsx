import { Maximize2, Minimize2 } from 'lucide-react';
import { useId, useRef } from 'react';
import { formatUsd } from './benchmarkData.js';
import { getMetric } from './config.js';
import { benchmarkScope } from './benchmarkScope.js';
import { ChartModelCard } from './ChartModelCard.jsx';
import { useChartLabels } from './useChartLabels.js';
import { useChartInteraction } from './useChartInteraction.js';
import { useLanguageLabels } from './useLanguageLabels.js';
import { chartScaleMax, familyName, familyOrder, familyVisual, languagePairData, languageTrackData, metricAxisScale, metricValue, modelsInDisplayOrder, pointData } from './chartModel.js';

function FamilyTrails({ points, models, maskId }) {
  const grouped = new Map();
  points.forEach((point) => {
    const family = familyName(point.model);
    if (!grouped.has(family)) grouped.set(family, []);
    grouped.get(family).push(point);
  });
  const lines = [];
  grouped.forEach((familyPoints, family) => {
    const ordered = [...familyPoints].sort((a, b) => familyOrder(a.model) - familyOrder(b.model));
    for (let index = 1; index < ordered.length; index += 1) {
      lines.push({ family, index, from: ordered[index - 1], to: ordered[index], color: familyVisual(ordered[index].model, models).color });
    }
  });
  return (
    <svg className="family-trails" aria-hidden="true">
      <g mask={`url(#${maskId})`}>
        {lines.map((line) => <line x1={`${line.from.x}%`} y1={`${line.from.y}%`} x2={`${line.to.x}%`} y2={`${line.to.y}%`} style={{ stroke: line.color }} key={`${line.family}-${line.index}`} />)}
      </g>
    </svg>
  );
}

function mapAxes(models, metricName, scope) {
  const metric = getMetric(metricName, scope);
  const ready = models.map((model) => metricValue(model, metric.key)).filter((value) => value !== null);
  const scale = metricAxisScale(ready, metric);
  const priceMax = chartScaleMax(models);
  return {
    y: scale.ticks,
    breakPosition: scale.breakPosition,
    x: [1, .75, .5, .25, 0].map((ratio, index) => ({
      label: formatUsd(priceMax * ratio, { minimumFractionDigits: 2, maximumFractionDigits: 3 }),
      position: index * 25,
    })),
    yLabel: metric.axis,
    xLabel: '30-MINUTE PRICE · LOWER IS BETTER →',
    efficiency: 'most efficient ↗',
  };
}

function PendingModels({ models, metricName, scope }) {
  const interaction = useChartInteraction(`${metricName}:${scope}`);
  const cardId = useId();
  return (
    <span className="pending-model-list">
      {models.map((model) => {
        const visual = familyVisual(model, models);
        return (
          <button
            className="pending-model-chip" style={{ '--family-color': visual.color }} type="button"
            aria-label={`${model.label}, result pending`} aria-describedby={interaction.active?.model.id === model.id ? cardId : undefined}
            onMouseEnter={(event) => interaction.activate(model, event.currentTarget)}
            onMouseLeave={(event) => interaction.leave(event.currentTarget)}
            onFocus={(event) => interaction.activate(model, event.currentTarget, 'focus')}
            onBlur={(event) => interaction.leave(event.currentTarget, 'focus')}
            key={model.id}
          >{model.label}</button>
        );
      })}
      {interaction.active && <ChartModelCard model={interaction.active.model} anchor={interaction.active.anchor} models={models} metricName={metricName} scope={scope} id={cardId} cardEvents={interaction.cardEvents} pending />}
    </span>
  );
}

function LanguagePairChart({ models, activeModelId, interaction, cardId, scope }) {
  const pairs = languageTrackData(models);
  const labels = useLanguageLabels(pairs);
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="language-pair-view">
      <div className="language-pair-chart" role="group" aria-label={`${scope === 'all' ? 'English and Swahili-English' : benchmarkScope(scope).label} accuracy for ${pairs.length} models`}>
        <div className="language-pair-key" aria-hidden="true">
          {scope !== 'english' && <span><i className="is-swahili" />Swahili-English</span>}
          {scope !== 'sw-en' && <span><i className="is-english" />English</span>}
        </div>
        <div className="language-pair-rows" style={{ '--pair-count': Math.max(pairs.length, 1) }}>
          {pairs.map((pair, rowIndex) => {
            const visual = familyVisual(pair.model, models);
            const paired = pair.english !== null && pair.swahili !== null;
            const connectorStart = paired ? Math.min(pair.english, pair.swahili) : null;
            const connectorWidth = paired ? Math.abs(pair.english - pair.swahili) : null;
            const active = pair.model.id === activeModelId;
            const activate = (event) => interaction.activate(pair.model, event.currentTarget);
            const focus = (event) => interaction.activate(pair.model, event.currentTarget, 'focus');
            return (
              <div className={`language-pair-row ${active ? 'is-active' : ''}`} style={{ '--family-color': visual.color, '--row-index': rowIndex }} key={pair.model.id}>
                <span className="language-pair-model">
                  <strong>{pair.model.label}</strong>
                  <small>{pair.model.provider}</small>
                </span>
                <span className="language-pair-track">
                  <i className="language-pair-baseline" aria-hidden="true" />
                  {paired && <i className="language-pair-connector" style={{ left: `${connectorStart}%`, width: `${connectorWidth}%` }} aria-hidden="true" />}
                  {scope === 'all' && !paired && <span className="language-pair-missing">{pair.swahili === null ? 'SW-EN not scored' : 'English not scored'}</span>}
                  {pair.swahili !== null && <button
                    className={`language-pair-point is-swahili ${active ? 'is-active' : ''}`} 
                    style={{ left: `${pair.swahili}%` }}
                    type="button"
                    aria-label={`${pair.model.label}: Swahili-English accuracy ${pair.swahili.toFixed(1)} percent`}
                    aria-describedby={active ? cardId : undefined}
                    onMouseEnter={activate}
                    onMouseLeave={(event) => interaction.leave(event.currentTarget)}
                    onFocus={focus}
                    onBlur={(event) => interaction.leave(event.currentTarget, 'focus')}
                  >
                    <span ref={(node) => labels.register(`${pair.model.id}:sw`, node)} style={labels.style(`${pair.model.id}:sw`)}>{pair.swahili.toFixed(1)} <b>SW-EN</b></span>
                  </button>}
                  {pair.english !== null && <button
                    className={`language-pair-point is-english ${active ? 'is-active' : ''}`}
                    style={{ left: `${pair.english}%` }}
                    type="button"
                    aria-label={`${pair.model.label}: English accuracy ${pair.english.toFixed(1)} percent`}
                    aria-describedby={active ? cardId : undefined}
                    onMouseEnter={activate}
                    onMouseLeave={(event) => interaction.leave(event.currentTarget)}
                    onFocus={focus}
                    onBlur={(event) => interaction.leave(event.currentTarget, 'focus')}
                  >
                    <span ref={(node) => labels.register(`${pair.model.id}:en`, node)} style={labels.style(`${pair.model.id}:en`)}>{pair.english.toFixed(1)} <b>EN</b></span>
                  </button>}
                </span>
              </div>
            );
          })}
        </div>
        <div className="language-pair-axis" aria-hidden="true">
          {ticks.map((tick) => <span style={{ left: `${tick}%` }} key={tick}>{tick}</span>)}
        </div>
        <div className="language-pair-axis-label">ACCURACY · HIGHER IS BETTER →</div>
        {!pairs.length && (
          <div className="score-pending">
            <strong>No full-track language result</strong>
            <span>A point requires a complete scored track. Eligibility probes are not scored.</span>
            <PendingModels models={models} metricName="languages" scope={scope} />
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreMap({ models, metricName, activeModelId, interaction, cardId, scope }) {
  const metric = getMetric(metricName, scope);
  const points = pointData(models, metricName);
  const axes = mapAxes(models, metricName, scope);
  const pointArea = useRef(null);
  const maskId = `chart-label-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { register, placements } = useChartLabels(pointArea, points, metricName);

  return (
    <div className="score-map-view">
      <div className="score-chart-frame">
        <div className="score-y-label">{axes.yLabel}</div>
        <div className="score-y-axis" aria-hidden="true">{axes.y.map((tick) => <span style={{ top: `${tick.position}%` }} key={`${tick.label}-${tick.position}`}>{tick.label}</span>)}</div>
        <div className="score-plot" role="group" aria-label={points.length ? `${metric.title} for ${points.length} models. Hover or focus a model for exact values.` : `${metric.title} pending for ${models.length} models.`}>
          <span className="score-horizontal-grid" aria-hidden="true">{axes.y.map((tick) => <i style={{ top: `${tick.position}%` }} key={`${tick.label}-${tick.position}`} />)}</span>
          <span className="score-vertical-grid" aria-hidden="true">{axes.x.map((tick) => <i style={{ left: `${tick.position}%` }} key={`${tick.label}-${tick.position}`} />)}</span>
          {axes.breakPosition !== null && <span className="score-axis-break" style={{ top: `${axes.breakPosition}%` }} aria-hidden="true"><i /><i /></span>}
          <span className="efficiency-note">{axes.efficiency}</span>
          <div className="score-points" ref={pointArea}>
            <FamilyTrails points={points} models={models} maskId={maskId} />
            <svg className="chart-label-leaders" aria-hidden="true">
              <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <rect width="100%" height="100%" fill="white" />
                  {[...placements.values()].filter((label) => label.visible).map((label) => <rect x={label.x - 2} y={label.y - 2} width={label.width + 4} height={label.height + 4} fill="black" key={label.id} />)}
                </mask>
              </defs>
              <g mask={`url(#${maskId})`}>
                {[...placements.values()].filter((label) => label.visible).map((label) => {
                  const model = models.find((candidate) => candidate.id === label.id);
                  return <line x1={label.anchor.x} y1={label.anchor.y} x2={label.target.x} y2={label.target.y} style={{ stroke: familyVisual(model, models).color }} key={label.id} />;
                })}
              </g>
            </svg>
            {points.map((datum, pointIndex) => {
              const visual = familyVisual(datum.model, models);
              const valueText = metric.format(datum.value);
              const labelValue = metric.format(datum.value);
              const placement = placements.get(datum.model.id);
              return (
                <button
                  className={`score-point ${datum.model.policy === 'probe' ? 'is-probe' : ''} ${datum.model.id === activeModelId ? 'is-active' : ''}`}
                  style={{ '--family-color': visual.color, '--point-index': pointIndex, left: `${datum.x.toFixed(2)}%`, top: `${datum.y.toFixed(2)}%` }}
                  type="button"
                  aria-label={`${datum.model.label}: ${valueText}`}
                  aria-describedby={datum.model.id === activeModelId ? cardId : undefined}
                  onMouseEnter={(event) => interaction.activate(datum.model, event.target.closest('.score-point-label') || event.currentTarget)}
                  onMouseLeave={(event) => interaction.leave(event.currentTarget)}
                  onFocus={(event) => interaction.activate(datum.model, event.currentTarget, 'focus')}
                  onBlur={(event) => interaction.leave(event.currentTarget, 'focus')}
                  key={datum.model.id}
                >
                  <span
                    className="score-point-label"
                    ref={(node) => register(datum.model.id, node)}
                    style={{ left: placement?.visible ? placement.x - placement.anchor.x + 9 : 0, top: placement?.visible ? placement.y - placement.anchor.y + 9 : 0, visibility: placement?.visible ? 'visible' : 'hidden' }}
                  ><strong>{datum.model.label}</strong><small>{labelValue}</small></span>
                </button>
              );
            })}
          </div>
          {!points.length && (
            <div className="score-pending">
              <strong>{scope === 'all' ? 'No eligible combined result' : `No eligible ${benchmarkScope(scope).label} result`}</strong>
              <span>{scope === 'all' ? `${metric.title} requires an eligible result on both tracks.` : 'A complete scored track is required. Eligibility probes are excluded.'}</span>
              <PendingModels models={models} metricName={metricName} scope={scope} />
            </div>
          )}
        </div>
        <div className="score-x-axis" aria-hidden="true">{axes.x.map((tick) => <span style={{ left: `${tick.position}%` }} key={`${tick.label}-${tick.position}`}>{tick.label}</span>)}</div>
        <div className="score-x-label">{axes.xLabel}</div>
      </div>
    </div>
  );
}

export function BenchmarkChart({ data, metricName, expanded, onExpandedChange, scope = 'all' }) {
  const models = modelsInDisplayOrder(data.models);
  const metric = getMetric(metricName, scope);
  const scoredCount = metricName === 'languages' ? languageTrackData(models).length : pointData(models, metricName).length;
  const pairedCount = metricName === 'languages' ? languagePairData(models).length : 0;
  const interaction = useChartInteraction(`${metricName}:${scope}`);
  const cardId = useId();
  const activeModel = interaction.active ? models.find((model) => model.id === interaction.active.model.id) : null;

  return (
    <figure className={`score-chart ${expanded ? 'is-expanded' : ''}`} aria-labelledby="score-chart-title">
      <figcaption>
        <div className="score-chart-copy"><strong id="score-chart-title">{metric.title}</strong><span>{metric.description}</span></div>
        <span className="score-chart-actions">
          <span className="chart-count">{metricName === 'languages' && scope === 'all' ? `${pairedCount} paired · ${scoredCount - pairedCount} single-track` : `${scoredCount}/${models.length} scored`}</span>
          <button className="chart-expand-button" type="button" aria-pressed={expanded} title={expanded ? 'Return to compact chart' : 'Expand chart'} onClick={() => onExpandedChange(!expanded)}>
            <span className="chart-expand-icon" aria-hidden="true">
              <Maximize2 className="expand-symbol" />
              <Minimize2 className="collapse-symbol" />
            </span>
            <span className="sr-only">{expanded ? 'Return to compact chart' : 'Expand chart'}</span>
          </button>
        </span>
      </figcaption>
      <div className="chart-view-transition" key={`${metricName}:${scope}`}>
        {metricName === 'languages' ? (
          <LanguagePairChart models={models} activeModelId={activeModel?.id} interaction={interaction} cardId={cardId} scope={scope} />
        ) : (
          <ScoreMap models={models} metricName={metricName} activeModelId={activeModel?.id} interaction={interaction} cardId={cardId} scope={scope} />
        )}
      </div>
      {activeModel && <ChartModelCard model={activeModel} models={models} metricName={metricName} scope={scope} anchor={interaction.active.anchor} id={cardId} cardEvents={interaction.cardEvents} />}
    </figure>
  );
}
