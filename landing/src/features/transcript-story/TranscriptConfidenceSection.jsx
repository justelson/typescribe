import { FileCheck2, HardDrive } from 'lucide-react';
import { Reveal } from '../../components/ui/Reveal.jsx';

export function TranscriptConfidenceSection() {
  return (
    <section className="transcript-story transcript-confidence" aria-labelledby="transcript-confidence-title">
      <div className="transcript-story-shell">
        <Reveal className="transcript-story-heading">
          <h2 id="transcript-confidence-title">You decide what makes<br /><span>the final copy.</span></h2>
          <p>Listen again, make the correction, keep the context. TypeScribe leaves those decisions with you.</p>
        </Reveal>
        <div className="transcript-confidence-layout">
          <Reveal className="transcript-confidence-note">
            <FileCheck2 size={23} aria-hidden="true" />
            <h3>Your judgement, in the record.</h3>
            <p>Check speakers and wording against the audio. Mark the passages that matter, then choose what to send.</p>
          </Reveal>
          <div className="transcript-confidence-stamp" aria-hidden="true"><span>I</span><i /><span>P1</span><i /><span>P2</span><strong>one conversation</strong></div>
          <Reveal className="transcript-confidence-note">
            <HardDrive size={23} aria-hidden="true" />
            <h3>Your work stays on your desk.</h3>
            <p>Edits, markers, layout, and playback position save locally. Selected media goes to Deepgram only when you run transcription.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
