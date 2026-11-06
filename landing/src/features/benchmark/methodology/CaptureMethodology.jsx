import { DefinitionRows, DocCallout, DocSection, NumberedMethod } from './MethodologyPrimitives.jsx';

const captureSteps = [
  { title: 'Preflight', copy: 'Verify frozen input hashes, provider credentials, language policy, model settings, expected cost, and the approved budget before making a call.' },
  { title: 'Submit', copy: 'Send only the frozen audio and provider settings. References, vocabulary lists, accepted text, and scoring annotations remain local.' },
  { title: 'Persist raw output', copy: 'Write the provider response before converting it into the shared canonical transcript format.' },
  { title: 'Verify identity and coverage', copy: 'Record the requested and resolved model, processed files, timing, hashes, runtime, and required coverage.' },
  { title: 'Clean up and resume safely', copy: 'Delete remote jobs where supported, record cleanup status, and reuse atomic successful captures instead of paying for duplicate calls.' },
];

export function CaptureMethodology() {
  return (
    <>
      <DocSection id="fresh" title="Fresh, bounded provider capture" intro="The published run used new API captures rather than imported legacy transcripts.">
        <NumberedMethod items={captureSteps} />
      </DocSection>

      <DocSection id="record" title="What each capture records">
        <DefinitionRows rows={[
          ['Input identity', 'Track, chunk, duration, file byte count, codec, and SHA-256 hash.'],
          ['Request identity', 'Provider, requested model, language settings, diarization and formatting settings, and submission timestamp.'],
          ['Response identity', 'Resolved model where available, raw-response hash, canonical transcript hash, runtime, and output validity.'],
          ['Cost evidence', 'Point-in-time list-price estimate for the processed duration; price does not affect quality scores.'],
          ['Cleanup evidence', 'Remote deletion result for asynchronous provider jobs and transcripts where deletion is supported.'],
        ]} />
      </DocSection>

      <DocSection id="orchestration" title="Capture batches" intro="The original matrix and the later Fish addition had separate approvals. Existing provider captures were reused for scoring, not sent again.">
        <h3>Original matrix</h3>
        <div className="method-fact-band is-compact">
          <div><strong>42</strong><span>full chunk captures</span></div>
          <div><strong>2</strong><span>eligibility probes</span></div>
          <div><strong>0</strong><span>capture errors</span></div>
          <div><strong>$1.4307</strong><span>approved estimate</span></div>
        </div>
        <ul className="method-check-list">
          <li>A detached runner completed both tracks under one aggregate budget calculation.</li>
          <li>Paid work required explicit approval and a hard ceiling; the emergency ceiling was $5.00.</li>
          <li>Each successful model/chunk transcript was written atomically before the next action.</li>
          <li>After an orchestration scoring failure, the run resumed from saved captures without repeating provider calls.</li>
          <li>Speechmatics and AssemblyAI remote artifacts were deleted after local capture and the cleanup outcome was recorded.</li>
        </ul>
        <h3>Fish Audio addition</h3>
        <div className="method-fact-band is-compact">
          <div><strong>6</strong><span>full English chunks</span></div>
          <div><strong>2</strong><span>Swahili-English probes</span></div>
          <div><strong>$0.3724</strong><span>rounded-duration estimate</span></div>
          <div><strong>$0.80</strong><span>approved estimate cap</span></div>
        </div>
        <p>Each Fish model processed the same three frozen English files and its own 60-second mixed-language probe. Neither passed Swahili eligibility, so no full Swahili-English Fish request was sent. The current matrix contains 48 full chunk captures and four eligibility probes.</p>
        <p>One private ledger reserved each Fish request before submission, rounded duration upward to whole seconds, blocked duplicate paid requests, and would stop further calls after a provider error. All eight Fish ASR requests succeeded without a retry.</p>
        <DocCallout title="Estimate, not invoice">
          <p>The original $1.4307 preflight estimate and the Fish $0.3724 rounded-duration estimate describe separate batches. Neither is a verified invoice. The displayed 30-minute prices compare model rates; the public JSON's matrix and probe cost totals describe the Swahili-English policy, not the total expenditure on both tracks.</p>
        </DocCallout>
      </DocSection>

      <DocSection id="probes" title="Eligibility probes">
        <p>Deepgram Nova-3 and AssemblyAI Universal-3.5 Pro did not advertise Swahili support for the requested model. Each was limited to a separate 60-second behavior probe. Fish Audio's two models were also probed separately because Swahili support was unverified, and neither qualified for the full mixed-language track. Probe output did not enter published scoring and could not trigger a 30-minute run accidentally.</p>
        <p>The Fish eligibility check compared returned text and language evidence with the unchanged accepted reference. It was not a new human audio-listening audit.</p>
      </DocSection>
    </>
  );
}
