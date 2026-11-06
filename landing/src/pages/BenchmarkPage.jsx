import { useMemo, useState } from 'react';
import { Reveal } from '../components/ui/Reveal.jsx';
import { BenchmarkChart } from '../features/benchmark/BenchmarkChart.jsx';
import { BENCHMARK_SCOPES, benchmarkScope, benchmarkView, hasTrackResults } from '../features/benchmark/benchmarkScope.js';
import { BenchmarkRankingTable } from '../features/benchmark/BenchmarkRankingTable.jsx';
import { BenchmarkFaq, MethodologyBrief, ProductReturn } from '../features/benchmark/BenchmarkSections.jsx';
import { ProviderSources } from '../features/benchmark/ProviderSources.jsx';
import { useBenchmarkData } from '../features/benchmark/useBenchmarkData.js';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata.js';
import '../styles/benchmark.css';

const metrics = [
  ['typescribe', 'TypeScribe score'],
  ['wer', 'WER'],
  ['gates', 'Pass gates'],
  ['quality', 'Quality'],
  ['languages', 'Languages'],
];

function BoardState({ phase, retry }) {
  if (phase === 'loading') return <div className="board-state board-loading" aria-live="polite"><span className="loading-pulse" aria-hidden="true" /><p>Loading the public benchmark plan…</p></div>;
  if (phase === 'error') return <div className="board-state board-error" role="alert"><div><strong>Benchmark plan unavailable.</strong><p>The public JSON could not be loaded or did not match the expected schema.</p></div><button className="button button-outline site-slide-button" type="button" onClick={retry}>Retry</button></div>;
  if (phase === 'empty') return <div className="board-state board-empty"><div><strong>No models are available.</strong><p>The public benchmark plan loaded without model rows.</p></div></div>;
  return null;
}

export function BenchmarkPage() {
  const { phase, data, retry } = useBenchmarkData();
  const [metric, setMetric] = useState('typescribe');
  const [chartExpanded, setChartExpanded] = useState(false);
  const [language, setLanguage] = useState('all');
  const scope = hasTrackResults(data, language) ? language : 'all';
  const view = useMemo(() => benchmarkView(data, scope), [data, scope]);
  const trackSummary = scope === 'all' ? 'two 30-minute tracks' : `${benchmarkScope(scope).label} · 30-minute track`;
  useDocumentMetadata('TypeScribe Bench', 'TypeScribe Bench compares speech-to-text APIs on English and Swahili-English audio using privacy-safe aggregate results.');

  const statusTitle = data?.status === 'published' ? 'Results published' : 'Results pending';
  const statusCopy = data?.status === 'published' ? `Updated ${data.updated}.` : data ? `Updated ${data.updated}.` : 'Scores are loading.';

  return (
    <main id="main-content">
        <section className="benchmark-hero page-grid-surface" id="top">
          <div className="mx-auto benchmark-hero-inner">
            <div className="benchmark-hero-top">
              <Reveal className="benchmark-lockup">
                <img src="/assets/tool-recorder.webp" alt="" aria-hidden="true" />
                <div><h1>TypeScribe Bench</h1><p>TypeScribe research</p></div>
              </Reveal>
              <Reveal as="dl" direction="right" className="benchmark-facts" aria-label="Benchmark facts">
                <div><dt>Frozen audio</dt><dd>{data ? '2 × 30 min' : '—'}</dd></div>
                <div><dt>Languages</dt><dd>{data ? data.corpus.languages.length : '—'}</dd></div>
                <div><dt>Models</dt><dd>{data ? data.models.length : '—'}</dd></div>
              </Reveal>
            </div>
            <div className="benchmark-hero-bottom">
              <p className="benchmark-deck">A privacy-safe comparison of current speech-to-text APIs across English and natural Swahili-English code-switching.</p>
              <div className="benchmark-status" role="status" aria-live="polite">
                <span className="status-dot" aria-hidden="true" />
                <strong>{phase === 'loading' ? 'Loading public plan' : phase === 'error' ? 'Plan unavailable' : statusTitle}</strong>
                <span>{phase === 'error' ? 'Open the leaderboard to retry the public data.' : statusCopy}</span>
                <a href="#leaderboard">View leaderboard ↓</a>
              </div>
            </div>
          </div>
        </section>

        <section className="leaderboard-section page-grid-surface" id="leaderboard" aria-labelledby="leaderboard-title">
          <div className="mx-auto w-[calc(100%-48px)] max-w-[1380px] max-[760px]:w-[calc(100%-16px)]">
            <div className={`leaderboard-workspace ${chartExpanded ? 'is-expanded' : ''}`}>
              <Reveal className="leaderboard-heading">
                <h2 id="leaderboard-title">Leaderboard</h2>
                <p>{view ? `${view.models.length} models · ${trackSummary} · updated ${data.updated}` : 'Loading model and corpus metadata…'}</p>
              </Reveal>

              <Reveal className="metric-toolbar">
                <div className="metric-tabs" role="group" aria-label="Benchmark metric">
                  {metrics.map(([id, label]) => <button className="site-slide-button" type="button" aria-pressed={metric === id} disabled={phase !== 'ready'} onClick={() => setMetric(id)} key={id}>{label}</button>)}
                </div>
                <div className="benchmark-language-tabs" role="group" aria-label="Benchmark language">
                  {BENCHMARK_SCOPES.map(({ id, label }) => (
                    <button className="site-slide-button" type="button" aria-pressed={scope === id} disabled={phase !== 'ready' || !hasTrackResults(data, id)} onClick={() => setLanguage(id)} key={id}>{label}</button>
                  ))}
                </div>
              </Reveal>

              {phase !== 'ready' && <BoardState phase={phase} retry={retry} />}
              {phase === 'ready' && data && (
                <div className="leaderboard-board">
                  <BenchmarkChart data={view} scope={scope} metricName={metric} expanded={chartExpanded} onExpandedChange={setChartExpanded} />
                  <BenchmarkRankingTable models={view.models} scope={scope} />
                </div>
              )}
            </div>
          </div>
        </section>

        <MethodologyBrief data={data} />
        <ProviderSources />
        <BenchmarkFaq />
        <ProductReturn />
    </main>
  );
}
