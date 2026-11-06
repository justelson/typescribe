import { formatUsd } from '../benchmarkData.js';
import { benchmarkStats } from '../benchmarkStats.js';
import { metricValue } from '../chartModel.js';
import { DefinitionRows, DocCallout, DocSection, MethodTable } from './MethodologyPrimitives.jsx';

function matrixRows(data) {
  if (!data) return [];
  return [...data.models].sort((left, right) => left.provider.localeCompare(right.provider) || left.label.localeCompare(right.label));
}

export function ModelsMethodology({ data, phase }) {
  const models = matrixRows(data);
  const stats = benchmarkStats(data);
  const intro = data
    ? `${stats.tested} API configurations were tested. ${stats.english} completed the full English track; ${stats.ranked} completed both eligible tracks and enter the combined ranking.`
    : 'The validated public data records each configuration, completed track, and combined-ranking eligibility.';
  return (
    <>
      <DocSection id="matrix" title="Published model matrix" intro={intro}>
        {phase === 'ready' ? (
          <MethodTable label="Published TypeScribe Bench model matrix" headings={['Model', 'Provider', 'Swahili-English', 'English', 'Combined', 'Price / 30 min']}>
            {models.map((model) => (
              <tr key={model.id}>
                <th scope="row">{model.label}<small>{model.apiModel}</small></th>
                <td>{model.provider}</td>
                <td>{model.policy === 'probe' ? '60-second probe' : 'Full 30 min'}</td>
                <td>{metricValue(model, 'englishAccuracy') !== null ? 'Full 30 min' : 'Not scored'}</td>
                <td>{model.score?.rank ? `Rank #${model.score.rank}` : 'Not ranked'}</td>
                <td>{formatUsd(model.cost30MinutesUsd)}</td>
              </tr>
            ))}
          </MethodTable>
        ) : <p className="method-loading-line">Loading the validated public model matrix…</p>}
      </DocSection>

      <DocSection id="eligibility" title="Track eligibility rules">
        <DefinitionRows rows={[
          ['Model identity', 'The returned or resolved model must match the requested configuration when the provider exposes resolved identity.'],
          ['Complete files', 'Every frozen file required by the track must produce valid durable output.'],
          ['Coverage', 'Full rows must process the complete 30-minute track.'],
          ['Language policy', 'The requested model must satisfy the frozen support policy for that track.'],
          ['Combined result', 'A model must be eligible on both tracks before it receives a combined score or rank.'],
        ]} />
      </DocSection>

      <DocSection id="probes" title="Why some rows are not ranked">
        <p>Deepgram Nova-3 and AssemblyAI Universal-3.5 Pro supported the English matrix but did not advertise Swahili support for the requested model. Their Swahili-English requests were restricted to 60-second behavior probes. Neither probe entered scoring.</p>
        <p>Fish Audio transcribe-1 and transcribe-1-pro each completed the full English track. Neither passed the separate 60-second Swahili-English eligibility check: transcribe-1 returned Malay rather than coherent Swahili, while Pro returned no scorable spoken text. Both keep their full English metrics and remain outside the combined ranking. These observations describe this probe, not every possible Swahili recording.</p>
        <DocCallout title="Fallbacks do not inherit the requested name">
          <p>AssemblyAI can route unsupported requests to another model. The capture was considered ineligible unless the resolved model identity remained exactly Universal-3.5 Pro.</p>
        </DocCallout>
      </DocSection>

      <DocSection id="settings" title="Frozen configuration, not provider defaults">
        <ul className="method-check-list">
          <li>Each model has explicit language, formatting, diarization, timestamp, disfluency, and temperature settings where the API supports them.</li>
          <li>Provider-specific reference prompts, key-term prompts, and accepted vocabulary were disabled.</li>
          <li>Pricing was checked against provider documentation before capture and is displayed separately from quality. Both Fish models were listed at $0.36 per audio hour.</li>
          <li>The Fish addition used the same frozen corpora, references, settings, and scoring rules. Existing provider captures were reused, not rerun.</li>
          <li>A future model or settings change requires a new benchmark version rather than silently replacing a row.</li>
        </ul>
      </DocSection>
    </>
  );
}
