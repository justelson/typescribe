import { useRef, useState } from 'react';
import { ButtonLink } from '../../components/ui/ButtonLink.jsx';
import { PlatformIcon } from '../../components/ui/PlatformIcon.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { installableAssets, snapshotReleases } from '../releases/releaseData.js';

const windows = { key: 'windows', label: 'Windows' };
const windowsInstaller = installableAssets(snapshotReleases[0]).find((asset) => asset.platform.key === 'windows');

const buildCommand = `git clone https://github.com/justelson/typescribe.git
cd typescribe
npm install
copy .env.example .env
npm run desktop`;

export function InstallSection() {
  const [copyLabel, setCopyLabel] = useState('Copy commands');
  const codeRef = useRef(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildCommand);
      setCopyLabel('Copied');
    } catch {
      setCopyLabel('Select commands');
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    window.setTimeout(() => setCopyLabel('Copy commands'), 1800);
  };

  return (
    <section className="install-section" id="build">
      <div className="install-radiance" aria-hidden="true" />
      <Reveal direction="sticker" className="site-shell install-panel" style={{ '--sticker-rotate': '-.5deg' }}>
        <div className="install-copy">
          <h2>Your next transcript starts here.</h2>
          <p>Windows 10 and 11. MIT licensed. Editing and the demo work without an API key.</p>
          <div className="install-actions"><ButtonLink tone="red" href={windowsInstaller?.url || '/downloads/'}><PlatformIcon platform={windows} className="h-4 w-4 brightness-0 invert" />Download for Windows</ButtonLink><ButtonLink tone="outline" href="/downloads/">Release notes</ButtonLink></div>
        </div>
        <div className="build-terminal">
          <div className="terminal-head"><span>Build from source</span><button type="button" onClick={copy}>{copyLabel}</button></div>
          <pre><code ref={codeRef}>{buildCommand}</code></pre>
          <p>Add your Deepgram API key to <code>.env</code> before new transcription.</p>
        </div>
      </Reveal>
    </section>
  );
}
