import { DefinitionRows, DocCallout, DocSection, Formula, NumberedMethod } from './MethodologyPrimitives.jsx';

export function RankingMethodology() {
  return (
    <>
      <DocSection id="combine" title="Equal track weighting" intro="The larger English reference cannot outweigh the code-switching track merely because it contains more words.">
        <Formula label="Combined TypeScribe score">0.5 × Swahili-English score + 0.5 × English score</Formula>
        <p>The same equal weighting is used for the combined public metric families. All languages is the default combined view. Selecting English or Swahili-English uses that track's complete scores, confidence intervals and published ranks. English ranking does not require an eligible Swahili-English result.</p>
      </DocSection>

      <DocSection id="bootstrap" title="Paired uncertainty">
        <NumberedMethod items={[
          { title: 'Resample accepted blocks', copy: 'Draw 10,000 bootstrap samples using accepted reference blocks as the unit.' },
          { title: 'Keep comparisons paired', copy: 'For a model pair, resample the same block indices so the difference reflects shared audio difficulty.' },
          { title: 'Build the interval', copy: 'Report the central 95% interval for each combined score and each adjacent score difference.' },
          { title: 'Assign shared ranks', copy: 'If the paired interval for the adjacent difference includes zero, the models share a published rank.' },
        ]} />
        <DocCallout title="Why ranks skip numbers">
          <p>Shared ranks preserve the statistical tie. The combined order contains ranks 1, 2, 2, 4, 5, and 5. Individual tracks have their own tie groups; several models can share rank 1 even when their point estimates differ.</p>
        </DocCallout>
      </DocSection>

      <DocSection id="eligibility" title="Eligibility before ranking">
        <DefinitionRows rows={[
          ['Requested identity', 'The provider must resolve to the requested model where model identity is exposed.'],
          ['Complete processing', 'Every required frozen file must produce durable valid output.'],
          ['Coverage', 'The result must meet the full-track duration requirement.'],
          ['Language policy', 'The model must satisfy the frozen language-support policy for that track.'],
          ['Probe boundary', 'A 60-second behavior probe never becomes a full-track result.'],
        ]} />
      </DocSection>

      <DocSection id="excluded" title="Evidence shown but excluded from quality rank">
        <ul className="method-check-list">
          <li>Thirty-minute list price is a separate efficiency dimension.</li>
          <li>Runtime and provider latency do not change WER, quality, gate, or TypeScribe ranks.</li>
          <li>Provider popularity and product integrations are not scoring inputs.</li>
          <li>Full English scores can receive an English rank, but cannot create a combined rank without an eligible Swahili-English result.</li>
        </ul>
      </DocSection>
    </>
  );
}
