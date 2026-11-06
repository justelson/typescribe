import { DocCallout, DocSection, MethodTable } from './MethodologyPrimitives.jsx';

export function CorpusMethodology() {
  return (
    <>
      <DocSection id="tracks" title="Two isolated tracks" intro="The benchmark keeps each corpus, reference, run directory, and report separate until the final equal-weight combination.">
        <div className="method-track-comparison">
          <article>
            <span>Track 01 · Private</span>
            <h3>Swahili-English code-switching</h3>
            <p>Thirty minutes of natural multi-speaker clinical conversation with spontaneous turns, acronyms, numbers, terminology, and frequent switching between Swahili and English.</p>
            <dl><div><dt>Structure</dt><dd>3 × 10-minute files</dd></div><div><dt>Reference</dt><dd>96 accepted blocks</dd></div><div><dt>Publication</dt><dd>Aggregate metrics only</dd></div></dl>
          </article>
          <article>
            <span>Track 02 · Public source</span>
            <h3>English earnings calls</h3>
            <p>Thirty minutes selected from Earnings-21 to cover accented or degraded speech, technical entities, dense numbers, money, percentages, and speaker changes.</p>
            <dl><div><dt>Structure</dt><dd>3 complete speaker-run windows</dd></div><div><dt>Duration</dt><dd>1,800.09 seconds</dd></div><div><dt>Reference</dt><dd>Human Earnings-21 text</dd></div></dl>
          </article>
        </div>
      </DocSection>

      <DocSection id="english-windows" title="Frozen English windows" intro="Each boundary starts and ends on a complete human-reference speaker run.">
        <MethodTable label="Frozen Earnings-21 windows" headings={['Window', 'Recording', 'Purpose', 'Duration']}>
          <tr><th scope="row">Difficult / accent</th><td>4346818 · Ingersoll Rand</td><td>Low-rate source, accents, degradation, frequent turns</td><td>600.126 s</td></tr>
          <tr><th scope="row">Technical entities</th><td>4382825 · ConocoPhillips</td><td>Company, product, location, and technical terminology</td><td>600.159 s</td></tr>
          <tr><th scope="row">Numbers / speakers</th><td>4386541 · Cumulus Media</td><td>Money, percentages, numbers, and speaker changes</td><td>599.805 s</td></tr>
        </MethodTable>
        <p className="method-source-line">Source: <a href="https://github.com/revdotcom/speech-datasets/tree/main/earnings21">Earnings-21 speech dataset</a> · text and alignment files are CC BY-SA 4.0.</p>
      </DocSection>

      <DocSection id="freeze" title="Freeze and verification rules">
        <ul className="method-check-list">
          <li>All benchmark WAVs are mono, 16 kHz, signed 16-bit PCM, lossless, and hash-recorded.</li>
          <li>The same three frozen files are supplied to every full model on a track.</li>
          <li>English windows preserve complete reference turns and exact NLP-reference / RTTM sequence alignment.</li>
          <li>References, accepted alternatives, names, and challenge annotations are never sent to providers.</li>
          <li>Corpus files cannot be replaced without creating a new benchmark version.</li>
        </ul>
        <DocCallout title="English listening disclosure" tone="warning">
          <p>Technical sequence, timing, and file verification were completed. The final human listening audit was explicitly waived for this run and must not be described as completed.</p>
        </DocCallout>
      </DocSection>

      <DocSection id="rights" title="Publication boundary">
        <p>The private conversation audio and reference remain local. Earnings-21 source identifiers and citations are public, but TypeScribe Bench does not redistribute the source audio, transcript text, speaker names, or annotations. The public site serves only methods, citations, and aggregate results.</p>
      </DocSection>
    </>
  );
}
