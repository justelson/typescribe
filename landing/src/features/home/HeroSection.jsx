import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../../components/ui/ButtonLink.jsx';
import { PlatformIcon } from '../../components/ui/PlatformIcon.jsx';
import { installableAssets, snapshotReleases } from '../releases/releaseData.js';

const windows = { key: 'windows', label: 'Windows' };
const windowsInstaller = installableAssets(snapshotReleases[0]).find((asset) => asset.platform.key === 'windows');
import { ParallaxImage } from '../../components/ui/ParallaxImage.jsx';

export function HeroSection() {
  return (
    <section className="catalog-hero page-grid-surface" id="top">
      <div className="hero-horizon hero-horizon-desk" aria-hidden="true"><span /></div>
      <div className="hero-divider hero-divider-left" aria-hidden="true" />
      <div className="hero-divider hero-divider-right" aria-hidden="true" />
      <ParallaxImage className="hero-object hero-object-headphones" src="/assets/tool-headphones.webp" alt="" speed={0.12} aria-hidden="true" />
      <ParallaxImage className="hero-object hero-object-folders" src="/assets/tool-folders.webp" alt="" speed={-0.09} aria-hidden="true" />
      <div className="site-shell hero-shell">
        <h1 className="hero-title">
          <span className="hero-title-top"><span className="hero-the"><i>t</i><i>H</i><i>E</i></span><span className="hero-free">free</span></span>
          <span className="hero-transcript" aria-label="TRANSCRIPT"><i aria-hidden="true">T</i><i aria-hidden="true">R</i><i aria-hidden="true">A</i><i aria-hidden="true">N</i><i aria-hidden="true">S</i><i aria-hidden="true">C</i><i aria-hidden="true">R</i><i aria-hidden="true">i</i><i aria-hidden="true">P</i><i aria-hidden="true">T</i></span>
          <span className="hero-desk" aria-label="desk"><i aria-hidden="true">d</i><i aria-hidden="true">E</i><i aria-hidden="true">S</i><i aria-hidden="true">K</i><em aria-hidden="true">.</em></span>
        </h1>
        <div className="hero-actions">
          <ButtonLink tone="cream" href={windowsInstaller?.url || '/downloads/'}><PlatformIcon platform={windows} className="h-4 w-4 brightness-0" />Download for Windows</ButtonLink>
        </div>
        <p className="hero-boundary">Editing and the bundled demo need no API key.</p>
      </div>
      <p className="hero-scroll-note" aria-hidden="true"><span>Scroll</span><ArrowRight className="lucide-icon rotate-90" /></p>
    </section>
  );
}
