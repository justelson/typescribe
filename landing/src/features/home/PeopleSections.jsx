import { ParallaxElement } from '../../components/ui/ParallaxElement.jsx';
import { ParallaxImage } from '../../components/ui/ParallaxImage.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';

export function PeopleIntroSection() {
  return (
    <section className="people-intro">
      <div className="site-shell people-intro-grid">
        <Reveal direction="left" className="people-intro-copy">
          <h2>For the people who send the clean version.</h2>
          <p>Secretaries, executive assistants, researchers, and transcriptionists — listening closely, fixing names, and getting the record out on time.</p>
          <div className="people-role-line" aria-label="Designed for secretaries, executive assistants, researchers, and transcriptionists"><span>Secretaries</span><span>Assistants</span><span>Researchers</span><span>Transcriptionists</span></div>
        </Reveal>
        <Reveal direction="right" className="people-cast">
          <ParallaxImage className="people-character people-character-assistant" src="/assets/character-assistant.webp" alt="An executive assistant holding a project folder." speed={0.075} />
          <ParallaxImage className="people-character people-character-transcriptionist" src="/assets/character-transcriptionist.webp" alt="A transcriptionist reviewing a typed page." speed={-0.055} />
          <ParallaxImage className="people-tool" src="/assets/tool-typewriter.webp" alt="Retro typewriter feeding a transcript page." speed={0.11} />
        </Reveal>
      </div>
    </section>
  );
}

export function UrgentDeskSection() {
  return (
    <section className="inbox-section">
      <div className="site-shell inbox-grid">
        <Reveal direction="left" className="inbox-copy">
          <h2>The clean version is due before lunch.</h2>
          <p>Fix names, separate speakers, mark the quote, and send the right file without losing the recording.</p>
        </Reveal>
        <Reveal direction="right" className="urgent-stack">
          <ParallaxImage className="urgent-recorder" src="/assets/tool-recorder.webp" alt="Retro cassette recorder with a waveform display." speed={0.08} />
          <ParallaxElement as="article" className="urgent-memo" speed={-0.06}>
            <span className="memo-pin" aria-hidden="true" />
            <p>Today’s desk</p>
            <ul><li>check names</li><li>separate speakers</li><li>mark the quote</li><li>send the clean copy</li></ul>
            <strong>Audio still attached.</strong>
          </ParallaxElement>
        </Reveal>
      </div>
      <div className="converging-rails" aria-hidden="true"><i /><i /><i /><i /></div>
    </section>
  );
}
