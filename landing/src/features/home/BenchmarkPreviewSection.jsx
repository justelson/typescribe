import benchmarkRaw from '../../../benchmark/benchmark-data.json';
import { formatUsd, validateBenchmarkData } from '../benchmark/benchmarkData.js';
import { ButtonLink } from '../../components/ui/ButtonLink.jsx';
import { ParallaxImage } from '../../components/ui/ParallaxImage.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';

const benchmark = validateBenchmarkData(benchmarkRaw);

export function BenchmarkPreviewSection() {
  const maxCost = Math.max(...benchmark.models.map((model) => model.cost30MinutesUsd), 0.001);
  return (
    <section className="benchmark-callout" id="benchmark-preview">
      <div className="benchmark-rails" aria-hidden="true"><i /><i /><i /><i /></div>
      <ParallaxImage className="benchmark-reels" src="/assets/tool-reels.webp" loading="lazy" alt="" speed={-0.07} aria-hidden="true" />
      <div className="site-shell benchmark-grid">
        <Reveal direction="left" className="benchmark-copy">
          <h2>A benchmark that waits for evidence.</h2>
          <p>Compare speech-to-text APIs on Swahili-English code-switching. Aggregate evidence goes public. The interview stays private.</p>
          <ButtonLink tone="red" href="/benchmark/">Open TypeScribe Bench</ButtonLink>
        </Reveal>
        <Reveal direction="right" className="benchmark-peek" aria-busy="false">
          <div className="peek-status" role="status"><span className="status-dot" aria-hidden="true" /><strong>{benchmark.status === 'pre-grading' ? 'Pre-grading plan' : benchmark.status}</strong><span>{benchmark.updated}</span></div>
          <dl className="peek-facts">
            <div><dt>Audio</dt><dd>{benchmark.corpus.durationMinutes} min</dd></div>
            <div><dt>Languages</dt><dd>{benchmark.corpus.languages.length}</dd></div>
            <div><dt>Models</dt><dd>{benchmark.models.length}</dd></div>
            <div><dt>Scores</dt><dd>Pending</dd></div>
          </dl>
          <div className="peek-ledger">
            {benchmark.models.slice(0, 3).map((model) => (
              <div className={`peek-row ${model.policy === 'probe' ? 'is-probe' : ''}`} key={model.id}>
                <div className="peek-model"><strong>{model.label}</strong><span>{model.provider} · {model.policy === 'probe' ? 'eligibility probe' : 'full corpus'}</span></div>
                <div className="peek-track" aria-hidden="true"><i style={{ '--bar-size': `${Math.max(2, model.cost30MinutesUsd / maxCost * 100).toFixed(2)}%` }} /></div>
                <span className="peek-cost">{formatUsd(model.cost30MinutesUsd)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
