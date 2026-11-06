import { useState } from 'react';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { PaperWorld } from './PaperWorld.jsx';
import { PreviewTabs } from './PreviewTabs.jsx';
import { TranscriptSample } from './TranscriptSample.jsx';
import { workViews } from './storyContent.js';

export function TranscriptWorkSection() {
  const [view, setView] = useState('rows');
  return (
    <section className="transcript-story transcript-work" aria-labelledby="transcript-work-title">
      <PaperWorld className="transcript-work-world" />
      <div className="transcript-story-shell">
        <Reveal className="transcript-story-heading">
          <h2 id="transcript-work-title">The same transcript,<br /><span>at every step.</span></h2>
          <p>Stay close to the source while you clean the words and prepare the version someone else needs.</p>
        </Reveal>
        <div className="transcript-work-layout">
          <Reveal className="transcript-work-guide">
            <PreviewTabs id="work-view" label="Explore the transcript workflow" items={workViews} value={view} onChange={setView} vertical numbered className="transcript-work-tabs" />
            <p className="transcript-work-boundary">Editing and the bundled demo need no API key. New transcription uses Deepgram when you request it.</p>
          </Reveal>
          <Reveal className="transcript-work-paper"><TranscriptSample view={view} /></Reveal>
        </div>
      </div>
    </section>
  );
}
