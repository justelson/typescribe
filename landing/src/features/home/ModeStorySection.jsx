import { useEffect, useRef, useState } from 'react';
import { Reveal } from '../../components/ui/Reveal.jsx';

const modes = {
  rows: {
    label: 'Rows view',
    image: '/assets/typescribe-rows.webp',
    alt: 'The TypeScribe Rows view with timed transcript lines, player controls, speakers, markers, and exports.',
    title: 'Rows keep the recording exact.',
    copy: 'Check timecodes, repair speaker assignments, follow playback, and fix one line at a time.',
    key: 'Ctrl 1',
  },
  cara: {
    label: 'Cara document',
    image: '/assets/typescribe-cara.webp',
    alt: 'The TypeScribe Cara view with readable speaker paragraphs while the player, markers, and exports remain available.',
    title: 'Cara turns those rows into a document.',
    copy: 'Edit speaker-labelled paragraphs without giving up the hidden timing used by playback, markers, and exports.',
    key: 'Ctrl 2',
  },
};

export function ModeStorySection() {
  const rootRef = useRef(null);
  const buttonRefs = useRef([]);
  const [activeMode, setActiveMode] = useState('rows');
  const [progress, setProgress] = useState(0.12);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = null;
    const update = () => {
      if (!window.matchMedia('(max-width: 760px)').matches) {
        const rect = root.getBoundingClientRect();
        const travel = Math.max(1, root.offsetHeight - window.innerHeight);
        const nextProgress = Math.max(0, Math.min(1, -rect.top / travel));
        setProgress(nextProgress);
        setActiveMode(nextProgress >= .5 ? 'cara' : 'rows');
      }
      frame = null;
    };
    const requestUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const chooseMode = (mode) => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(max-width: 760px)').matches) {
      setActiveMode(mode);
      setProgress(mode === 'cara' ? .82 : .12);
      return;
    }
    const travel = Math.max(1, root.offsetHeight - window.innerHeight);
    window.scrollTo({ top: root.offsetTop + travel * (mode === 'cara' ? .72 : .12), behavior: 'smooth' });
  };

  const handleKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const nextIndex = (index + (forward ? 1 : -1) + 2) % 2;
    const nextMode = nextIndex === 0 ? 'rows' : 'cara';
    buttonRefs.current[nextIndex]?.focus();
    chooseMode(nextMode);
  };

  return (
    <section className="mode-story" id="editor" ref={rootRef} style={{ '--mode-progress': `${Math.max(7, Math.min(94, progress * 100)).toFixed(1)}%` }}>
      <div className="mode-sticky">
        <div className="site-shell mode-stage">
          <Reveal direction="left" className="mode-window" id="mode-viewport">
            <div className="window-bar"><span>TypeScribe demo interview</span><strong>{modes[activeMode].label}</strong></div>
            <div className="mode-images">
              {Object.entries(modes).map(([key, mode]) => <img className={`mode-image mode-image-${key} ${activeMode === key ? 'is-active' : ''}`} src={mode.image} alt={mode.alt} aria-hidden={activeMode !== key} key={key} />)}
            </div>
            <div className="mode-scrubber" aria-hidden="true"><span /></div>
          </Reveal>

          <Reveal direction="right" className="mode-copy">
            <h2>Rows for timing. Cara for reading.</h2>
            <div className="mode-tabs" role="tablist" aria-label="Editor view preview">
              {['rows', 'cara'].map((mode, index) => (
                <button ref={(node) => { buttonRefs.current[index] = node; }} type="button" role="tab" aria-selected={activeMode === mode} aria-controls="mode-viewport" tabIndex={activeMode === mode ? 0 : -1} onClick={() => chooseMode(mode)} onKeyDown={(event) => handleKeyDown(event, index)} key={mode}>{index === 0 ? '01 · Rows' : '02 · Cara'}</button>
              ))}
            </div>
            {Object.entries(modes).map(([key, mode]) => (
              <article className={`mode-step ${activeMode === key ? 'is-active' : ''}`} hidden={activeMode !== key} key={key}>
                <h3>{mode.title}</h3><p>{mode.copy}</p><kbd>{mode.key}</kbd>
              </article>
            ))}
            <p className="mode-scroll-note">Scroll through the handoff ↓</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
