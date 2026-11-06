import { DefinitionRows, DocCallout, DocSection, NumberedMethod } from './MethodologyPrimitives.jsx';
import { benchmarkStats } from '../benchmarkStats.js';

const pipeline = [
  { title: 'Freeze the evidence', copy: 'Prepare two isolated 30-minute tracks, complete their references, record file hashes, and prevent later corpus drift.' },
  { title: 'Resolve eligibility', copy: 'Confirm language policy and requested model identity before a result can enter a full-track comparison.' },
  { title: 'Capture fresh output', copy: 'Send the same frozen audio to each eligible API configuration and retain durable request, response, timing, and cleanup records.' },
  { title: 'Normalize once', copy: 'Apply the same deterministic token, punctuation, Unicode, whitespace, and approved number-equivalence rules to references and hypotheses.' },
  { title: 'Score each track', copy: 'Calculate WER, challenge performance, terminology, numbers, reliable blocks, quality gates, and the TypeScribe score.' },
  { title: 'Combine and rank', copy: 'Give English and Swahili-English equal weight, bootstrap accepted blocks in pairs, and share ranks when uncertainty supports a tie.' },
];

export function OverviewMethodology({ data }) {
  const stats = benchmarkStats(data);
  return (
    <>
      <DocSection id="question" title="What the benchmark asks" intro="TypeScribe Bench compares current speech-to-text API configurations on two different transcription conditions without letting either corpus dominate the combined result.">
        <DefinitionRows rows={[
          ['Primary comparison', 'Transcript quality across English-only and natural Swahili-English code-switching speech.'],
          ['Unit under test', 'A named provider model with frozen request settings, language policy, and a verified resolved identity where the API exposes one.'],
          ['Published result', 'Aggregate metrics, confidence intervals, ranks, language accuracy, and 30-minute list-price estimates.'],
          ['Ranking boundary', 'Only models that complete both tracks under the eligibility rules receive a combined rank.'],
        ]} />
      </DocSection>

      <DocSection id="pipeline" title="End-to-end pipeline" intro="Every ranked row passes through the same six stages.">
        <NumberedMethod items={pipeline} />
      </DocSection>

      <DocSection id="facts" title="Run at a glance">
        <div className="method-fact-band">
          <div><strong>2 × 30 min</strong><span>isolated tracks</span></div>
          <div><strong>{stats.tested ?? '—'}</strong><span>tested configurations</span></div>
          <div><strong>{stats.ranked ?? '—'}</strong><span>combined eligible rows</span></div>
          <div><strong>10,000</strong><span>paired resamples</span></div>
        </div>
        <DocCallout title="Interpret the result narrowly">
          <p>The leaderboard describes these frozen corpora, provider versions, settings, and prices at the time of capture. It is evidence for model selection, not a universal claim about every language, domain, or recording condition.</p>
        </DocCallout>
      </DocSection>
    </>
  );
}
