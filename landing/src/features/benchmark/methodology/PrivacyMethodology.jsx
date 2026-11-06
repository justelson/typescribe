import { DocCallout, DocSection, MethodTable } from './MethodologyPrimitives.jsx';

export function PrivacyMethodology() {
  return (
    <>
      <DocSection id="boundary" title="Public and private boundary" intro="The public benchmark is an aggregate result surface, not a corpus or provider-response archive.">
        <MethodTable label="TypeScribe Bench publication boundary" headings={['Published', 'Kept private']}>
          <tr><td>Aggregate WER, quality, gate, language, score, price, interval, and rank fields</td><td>Private conversation audio and transcript text</td></tr>
          <tr><td>Model labels, provider names, requested API model, and eligibility state</td><td>Provider raw responses and canonical hypotheses</td></tr>
          <tr><td>Earnings-21 citations, recording identifiers, window purposes, and methods</td><td>Reference text, speaker names, accepted alternatives, and scoring annotations</td></tr>
          <tr><td>Formula definitions, thresholds, run counts, and aggregate cost estimates</td><td>Credentials, environment files, local paths, logs, and private run metadata</td></tr>
        </MethodTable>
      </DocSection>

      <DocSection id="protections" title="Operational protections">
        <ul className="method-check-list">
          <li>The public JSON schema rejects unknown fields before the landing build completes.</li>
          <li>The landing build rejects local filesystem paths and unapproved public JSON files.</li>
          <li>References and private annotations remain outside provider requests and public exports.</li>
          <li>Saved successful captures are reused for recalculation; no provider call is needed to rebuild the current results.</li>
          <li>Remote asynchronous jobs are deleted where supported and cleanup outcomes are retained locally.</li>
        </ul>
      </DocSection>

      <DocSection id="limits" title="Limitations to retain">
        <ul className="method-limit-list">
          <li><strong>Corpus size.</strong><span>Two 30-minute tracks provide focused comparative evidence, not universal language or domain coverage.</span></li>
          <li><strong>Private-track representativeness.</strong><span>One natural clinical conversation cannot represent every speaker, accent, setting, or code-switching pattern.</span></li>
          <li><strong>English audit waiver.</strong><span>Technical alignment was verified, but the final human listening audit was waived rather than completed.</span></li>
          <li><strong>Point-in-time APIs.</strong><span>Provider models, default routing, language support, and prices can change after capture.</span></li>
          <li><strong>List-price estimates.</strong><span>Displayed cost is a comparable 30-minute estimate, not an invoice and not part of the quality score.</span></li>
          <li><strong>No latency rank.</strong><span>Runtime evidence is recorded locally but the public quality leaderboard does not rank speed.</span></li>
        </ul>
        <DocCallout title="Re-run before procurement" tone="warning">
          <p>Use these results to narrow a model shortlist. Recheck current model availability, pricing, support, and your own representative audio before making a production commitment.</p>
        </DocCallout>
      </DocSection>

      <DocSection id="sources" title="Primary public sources">
        <ul className="method-source-list">
          <li><a href="https://github.com/revdotcom/speech-datasets/tree/main/earnings21">Earnings-21 dataset and references</a></li>
          <li><a href="https://arxiv.org/abs/2104.11348">Earnings-21 paper</a></li>
          <li><a href="https://deepgram.com/pricing">Deepgram pricing</a></li>
          <li><a href="https://elevenlabs.io/pricing/api?price.section=speech_to_text">ElevenLabs API pricing</a></li>
          <li><a href="https://www.speechmatics.com/pricing">Speechmatics pricing</a></li>
          <li><a href="https://www.assemblyai.com/pricing">AssemblyAI pricing</a></li>
          <li><a href="https://console.groq.com/docs/speech-to-text">Groq speech-to-text documentation</a></li>
          <li><a href="https://docs.fish.audio/features/speech-to-text">Fish Audio ASR models and request parameters</a></li>
          <li><a href="https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits">Fish Audio ASR pricing</a></li>
        </ul>
      </DocSection>
    </>
  );
}
