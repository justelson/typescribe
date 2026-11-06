import { MousePointer2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ButtonLink } from '../../components/ui/ButtonLink.jsx';
import { PlatformIcon } from '../../components/ui/PlatformIcon.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { installableAssets, snapshotReleases } from '../releases/releaseData.js';
import { roles } from './content.js';

const windows = { key: 'windows', label: 'Windows' };
const windowsInstaller = installableAssets(snapshotReleases[0]).find((asset) => asset.platform.key === 'windows');

const journeySteps = [
  {
    number: '01',
    short: 'open',
    label: 'Open the recording',
    title: 'Bring the source onto your desk.',
    copy: 'Start with local audio or video. TypeScribe builds the project around the recording, so the source stays close to every correction.',
    meta: 'LOCAL MEDIA · PROJECT READY',
    visual: 'intake',
  },
  {
    number: '02',
    short: 'rows',
    label: 'Repair in Rows',
    title: 'Clean each moment against the sound.',
    copy: 'Follow playback, check speakers and timecodes, split a segment, mark a quote, and repair the wording one row at a time.',
    meta: 'TIMED ROWS · PLAYBACK SYNC',
    visual: 'rows',
  },
  {
    number: '03',
    short: 'cara',
    label: 'Shape the handoff',
    title: 'Turn the same record into readable copy.',
    copy: 'Move into Cara for speaker-labelled paragraphs, then choose the range and format the next person actually needs.',
    meta: 'CARA DOCUMENT · CONTROLLED EXPORT',
    visual: 'cara',
  },
];

function IntakeVisual() {
  return (
    <div className="journey-intake" aria-hidden="true">
      <div className="journey-waveform"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <img src="/assets/tool-recorder.webp" alt="" />
      <div className="journey-file-ticket">
        <span>new recording</span>
        <strong>meeting-audio.wav</strong>
        <small>ready on this device</small>
      </div>
      <div className="journey-ready-stamp">source<br />attached</div>
    </div>
  );
}

function JourneyVisual({ activeStep }) {
  return (
    <div className="journey-window" aria-live="off">
      <div className="journey-window-bar">
        <span className="journey-window-dots" aria-hidden="true"><i /><i /><i /></span>
        <strong>TypeScribe · transcript desk</strong>
        <span>{journeySteps[activeStep].short}</span>
      </div>
      <div className="journey-visuals">
        <div className={`journey-visual journey-visual-intake ${activeStep === 0 ? 'is-active' : ''}`}><IntakeVisual /></div>
        <div className={`journey-visual ${activeStep === 1 ? 'is-active' : ''}`}>
          <img src="/assets/typescribe-rows.webp" alt="TypeScribe Rows view with timed transcript lines, speakers, playback, and markers." />
          <span className="journey-image-note journey-image-note-rows">repair against playback</span>
        </div>
        <div className={`journey-visual ${activeStep === 2 ? 'is-active' : ''}`}>
          <img src="/assets/typescribe-cara.webp" alt="TypeScribe Cara view with readable speaker-labelled paragraphs." />
          <span className="journey-image-note journey-image-note-cara">same record · cleaner handoff</span>
        </div>
      </div>
      <div className="journey-progress" aria-hidden="true"><span style={{ width: `${((activeStep + 1) / journeySteps.length) * 100}%` }} /></div>
    </div>
  );
}

export function DeskJourneySection() {
  const rootRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (window.matchMedia('(max-width: 820px)').matches) return;
      const rect = root.getBoundingClientRect();
      const travel = Math.max(1, root.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(0.999, -rect.top / travel));
      setActiveStep(Math.min(journeySteps.length - 1, Math.floor(progress * journeySteps.length)));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const chooseStep = (index) => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(max-width: 820px)').matches) {
      setActiveStep(index);
      return;
    }
    const travel = Math.max(1, root.offsetHeight - window.innerHeight);
    window.scrollTo({ top: root.offsetTop + travel * ((index + 0.18) / journeySteps.length), behavior: 'smooth' });
  };

  return (
    <section className="desk-journey" id="editor" ref={rootRef} aria-labelledby="journey-title">
      <div className="desk-journey-sticky">
        <div className="site-shell desk-journey-stage">
          <div className="journey-media">
            <JourneyVisual activeStep={activeStep} />
            <MousePointer2 className="journey-pointer" aria-hidden="true" />
          </div>

          <div className="journey-copy">
            <p className="journey-kicker">how the desk works</p>
            <h2 id="journey-title">From recording to clean copy.</h2>
            <div className="journey-step-copy">
              {journeySteps.map((step, index) => (
                <article className={activeStep === index ? 'is-active' : ''} aria-hidden={activeStep !== index} key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  <small>{step.meta}</small>
                </article>
              ))}
            </div>
            <div className="journey-step-nav" aria-label="Transcript workflow steps">
              {journeySteps.map((step, index) => (
                <button type="button" aria-current={activeStep === index ? 'step' : undefined} onClick={() => chooseStep(index)} key={step.number}>
                  <i aria-hidden="true" /><span>{step.number}</span><strong>{step.label}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="desk-journey-mobile site-shell">
        <p className="journey-kicker">how the desk works</p>
        <h2>From recording to clean copy.</h2>
        {journeySteps.map((step, index) => (
          <article className="journey-mobile-step" key={step.number}>
            <JourneyVisual activeStep={index} />
            <div><span>{step.number}</span><h3>{step.title}</h3><p>{step.copy}</p><small>{step.meta}</small></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DeskManifestoSection() {
  return (
    <section className="desk-manifesto" aria-labelledby="manifesto-title">
      <div className="manifesto-role-strip" aria-label="Built for transcript-heavy work">
        {roles.map(([role]) => <span key={role}>{role}</span>)}
      </div>
      <div className="site-shell desk-manifesto-copy">
        <Reveal>
          <p>one source · one working record</p>
          <h2 id="manifesto-title">The audio stays close while the transcript becomes useful.</h2>
          <span>Precise enough to check. Readable enough to send.</span>
        </Reveal>
      </div>
      <div className="manifesto-cut manifesto-cut-left" aria-hidden="true" />
      <div className="manifesto-cut manifesto-cut-right" aria-hidden="true" />
    </section>
  );
}

export function DeskGallerySection() {
  return (
    <section className="desk-gallery" aria-labelledby="gallery-title">
      <div className="site-shell desk-gallery-heading">
        <Reveal><p>inside the working record</p><h2 id="gallery-title">One desk. Different distances.</h2></Reveal>
        <p>Scroll sideways to inspect the source, the timed edit, and the final reading view.</p>
      </div>
      <div className="desk-gallery-track" tabIndex="0" aria-label="Scrollable TypeScribe product views">
        <figure className="desk-gallery-frame desk-gallery-frame-wide">
          <img src="/assets/typescribe-rows.webp" alt="The TypeScribe Rows editor." loading="lazy" />
          <figcaption><span>01 · rows</span><strong>Every correction stays attached to a moment.</strong></figcaption>
        </figure>
        <figure className="desk-gallery-frame desk-gallery-frame-object">
          <div className="gallery-object-stage" aria-hidden="true">
            <img className="gallery-object-recorder" src="/assets/tool-recorder.webp" alt="" loading="lazy" />
            <img className="gallery-object-headphones" src="/assets/tool-headphones.webp" alt="" loading="lazy" />
            <div className="gallery-object-lines"><i /><i /><i /><i /><i /></div>
          </div>
          <figcaption><span>02 · source</span><strong>Playback remains part of the editing desk.</strong></figcaption>
        </figure>
        <figure className="desk-gallery-frame desk-gallery-frame-wide">
          <img src="/assets/typescribe-cara.webp" alt="The TypeScribe Cara document editor." loading="lazy" />
          <figcaption><span>03 · cara</span><strong>The same transcript settles into a readable document.</strong></figcaption>
        </figure>
      </div>
    </section>
  );
}

export function DeskPromiseSection() {
  return (
    <section className="desk-promise" aria-labelledby="promise-title">
      <div className="desk-promise-burst" aria-hidden="true" />
      <div className="desk-promise-copy">
        <Reveal>
          <p>the transcript desk</p>
          <h2 id="promise-title">Your audio.<br />Your transcript.<br />Your handoff.</h2>
          <span>The recording, the page, and the tools stay together from first listen to final file.</span>
          <ButtonLink tone="red" href={windowsInstaller?.url || '/downloads/'}><PlatformIcon platform={windows} className="h-4 w-4 brightness-0 invert" />Download for Windows</ButtonLink>
        </Reveal>
      </div>
      <img className="desk-promise-characters" src="/assets/transcript-desk-characters.webp" loading="lazy" alt="A playful group of illustrated transcript pages, waveforms, folders, markers, reels, and headphones." />
    </section>
  );
}
