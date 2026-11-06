import { ArrowRight, ChevronDown, Headphones } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { ButtonLink } from '../../components/ui/ButtonLink.jsx';
import { SiteLink } from '../../components/ui/SiteLink.jsx';
import { PlatformIcon } from '../../components/ui/PlatformIcon.jsx';
import { installableAssets, snapshotReleases } from '../releases/releaseData.js';
import { benchmarkStats } from './benchmarkStats.js';
import '../../styles/methodology-brief.css';

const windows = { key: 'windows', label: 'Windows' };
const windowsInstaller = installableAssets(snapshotReleases[0]).find((asset) => asset.platform.key === 'windows');

const faqItems = [
  ['Are the results complete?', 'All ranked rows completed both frozen tracks. Unranked rows show available full English results; Swahili-English eligibility probes do not enter scoring.'],
  ['How are models graded?', 'The benchmark reports WER, five pass gates, composite quality, and the equal-weight TypeScribe score with paired confidence intervals.'],
  ['What stays private?', 'Audio, transcript text, provider responses, local paths, credentials, annotations, and participant details never enter the public page or JSON.'],
];

const methodologySteps = [
  ['01', 'Freeze', 'Two separate 30-minute corpora, fixed references, and verified file hashes.'],
  ['02', 'Capture', 'Fresh API runs with model identity, coverage, settings, and cleanup recorded.'],
  ['03', 'Normalize', 'The same deterministic text and number rules applied to every hypothesis and reference.'],
  ['04', 'Score', 'WER, five quality gates, challenge evidence, terminology, numbers, and reliable blocks.'],
  ['05', 'Combine', 'Equal track weighting plus 10,000 paired bootstrap resamples for intervals and ties.'],
];

export function MethodologyBrief({ data }) {
  const stats = benchmarkStats(data);
  return (
    <section className="methodology-brief" id="methodology" aria-labelledby="methodology-brief-title">
      <div className="methodology-brief-inner">
        <div className="methodology-brief-layout">
          <Reveal as="header" className="methodology-brief-heading">
            <h2 id="methodology-brief-title">How the benchmark was run</h2>
            <p>A fixed capture and scoring pipeline designed to keep provider comparisons repeatable and private.</p>
            <dl className="methodology-brief-facts" aria-label="Benchmark run facts">
              <div><dt>Tracks</dt><dd>2 × 30 <small>min</small></dd></div>
              <div><dt>Configurations</dt><dd>{stats.tested ?? '—'} <small>tested</small></dd></div>
              <div><dt>Combined ranking</dt><dd>{stats.ranked ?? '—'} <small>eligible</small></dd></div>
              <div><dt>Uncertainty</dt><dd>10,000 <small>resamples</small></dd></div>
            </dl>
            <SiteLink className="methodology-brief-link" href="/benchmark/methodology/">
              Read the full methodology <ArrowRight size={18} aria-hidden="true" />
            </SiteLink>
          </Reveal>
          <ol className="methodology-brief-steps" aria-label="Benchmark pipeline">
            {methodologySteps.map(([number, title, copy], index) => (
              <Reveal as="li" delay={index * 35} className="methodology-brief-step" key={number}>
                <span className="methodology-brief-number" aria-hidden="true">{number}</span>
                <div className="methodology-brief-step-copy">
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal as="aside" className="methodology-brief-audit" aria-label="English reference audit note">
          <div className="methodology-brief-audit-label"><Headphones size={19} aria-hidden="true" /><strong>Reference audit</strong></div>
          <p>The English reference sequence was technically verified. Its final human listening audit was explicitly waived for this run.</p>
        </Reveal>
      </div>
    </section>
  );
}

export function BenchmarkFaq() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="benchmark-faq" aria-labelledby="faq-title">
      <div className="mx-auto w-[calc(100%-48px)] max-w-[900px] max-[760px]:w-[calc(100%-16px)]">
        <Reveal className="faq-heading"><h2 id="faq-title">Benchmark notes</h2></Reveal>
        <Reveal className="faq-list">
          {faqItems.map(([question, answer], index) => (
            <details open={openIndex === index} key={question}>
              <summary onClick={(event) => { event.preventDefault(); setOpenIndex((current) => current === index ? null : index); }}><span>{question}</span><ChevronDown className="lucide-icon faq-chevron" aria-hidden="true" /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function ProductReturn() {
  return (
    <section className="product-return">
      <div className="mx-auto w-[calc(100%-48px)] max-w-[1120px] max-[760px]:w-[calc(100%-16px)] product-return-grid">
        <h2>Timing stays under the document.</h2>
        <p>Edit timed Rows, shape Cara paragraphs, follow playback, mark moments, and export from one Windows desk.</p>
        <div><ButtonLink tone="red" href={windowsInstaller?.url || '/downloads/'}><PlatformIcon platform={windows} className="h-4 w-4 brightness-0 invert" />Download for Windows</ButtonLink><ButtonLink tone="outline" href="/">Explore TypeScribe</ButtonLink></div>
      </div>
    </section>
  );
}
