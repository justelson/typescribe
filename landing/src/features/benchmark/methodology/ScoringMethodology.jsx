import { DefinitionRows, DocCallout, DocSection, Formula, MethodTable } from './MethodologyPrimitives.jsx';

export function ScoringMethodology() {
  return (
    <>
      <DocSection id="normalization" title="Deterministic normalization" intro="Reference and provider text pass through the same rules before any metric is calculated.">
        <ul className="method-check-list">
          <li>Lowercase text and normalize Unicode and whitespace.</li>
          <li>Ignore punctuation differences.</li>
          <li>Accept only locally approved written and spoken number equivalents.</li>
          <li>Preserve fillers, repetitions, names, grammar, and actual word choices.</li>
          <li>Keep proper-name and spelling alternatives in private local annotations.</li>
        </ul>
        <DocCallout title="No reference prompting">
          <p>Providers never receive the accepted transcript, names, key terms, challenge windows, vocabulary lists, or normalization alternatives.</p>
        </DocCallout>
      </DocSection>

      <DocSection id="wer" title="Word error rate">
        <Formula label="Headline metric">WER = (substitutions + deletions + insertions) ÷ reference words</Formula>
        <DefinitionRows rows={[
          ['Direction', 'Lower WER is better. Word accuracy is displayed as clamp(100 − WER, 0, 100).'],
          ['Coverage', 'Every accepted reference block contributes to the headline result.'],
          ['Missed speech', 'Counts as deletions.'],
          ['Hallucinated speech', 'Counts as insertions.'],
          ['Sensitivity view', 'Low-confidence reference blocks can be excluded in a separate analysis without changing the headline corpus.'],
        ]} />
      </DocSection>

      <DocSection id="gates" title="Five quality gates" intro="Hard eligibility decides whether a model can be ranked. These five quality checks determine the gate score.">
        <MethodTable label="TypeScribe quality gate thresholds" headings={['Gate', 'Passing threshold']}>
          <tr><th scope="row">Overall WER</th><td>20% or lower</td></tr>
          <tr><th scope="row">Challenge score</th><td>75 or higher</td></tr>
          <tr><th scope="row">Names and terminology F1</th><td>80 or higher</td></tr>
          <tr><th scope="row">Number F1</th><td>85 or higher</td></tr>
          <tr><th scope="row">Reliable blocks</th><td>90% or higher</td></tr>
        </MethodTable>
        <Formula label="Gate score">gates passed ÷ 5 × 100</Formula>
        <p>A reliable block has WER at or below 50%. Challenge evidence is track-specific: three-word windows around accepted language switches for Swahili-English, and the complete preselected difficult/degraded window for English.</p>
      </DocSection>

      <DocSection id="quality" title="Composite quality">
        <DefinitionRows rows={[
          ['A', 'Word accuracy: clamp(100 − WER, 0, 100).'],
          ['C', 'Track-specific challenge score.'],
          ['T', 'Names and important terminology F1.'],
          ['N', 'Number F1.'],
          ['R', 'Percentage of accepted blocks with WER at or below 50%.'],
        ]} />
        <Formula label="Quality score">0.55A + 0.15C + 0.12T + 0.08N + 0.10R</Formula>
        <Formula label="TypeScribe score">Quality × (0.80 + 0.20 × Gate score ÷ 100)</Formula>
        <p>Passing every quality gate preserves the quality score. Failed gates apply a controlled penalty. A hard eligibility failure remains unranked rather than becoming a low score.</p>
      </DocSection>
    </>
  );
}
