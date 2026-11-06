import { ArrowUpRight, BookOpen, CodeXml, Download, MessageSquare } from 'lucide-react';
import { useRef } from 'react';
import { useFooterBackground } from '../../hooks/useFooterBackground.js';
import { SiteLink } from '../ui/SiteLink.jsx';
import { installableAssets, snapshotReleases } from '../../features/releases/releaseData.js';
import '../../styles/footer.css';

const repository = 'https://github.com/justelson/typescribe';
const windowsInstaller = installableAssets(snapshotReleases[0]).find((asset) => asset.platform.key === 'windows');
const navigation = [
  { label: 'Model benchmarks', href: '/benchmark/' },
  { label: 'Releases', href: '/downloads/' },
  { label: 'Repository', href: repository },
  { label: 'Architecture', href: `${repository}/blob/main/docs/ARCHITECTURE.md` },
  { label: 'MIT license', href: `${repository}/blob/main/LICENSE` },
];
const utilities = [
  { label: 'View the GitHub repository', href: repository, Icon: CodeXml },
  { label: 'Read the architecture', href: `${repository}/blob/main/docs/ARCHITECTURE.md`, Icon: BookOpen },
  { label: 'Report an issue', href: `${repository}/issues`, Icon: MessageSquare },
];

export function SiteFooter({
  statement = 'For the person who has to listen closely, clean the record, and send the version everyone else relies on.',
  metaLeft = 'TypeScribe 0.1.0 · Windows desktop',
  metaRight = 'New transcription uses Deepgram when requested.',
  downloadHref = windowsInstaller?.url || '/downloads/',
}) {
  const footerRef = useRef(null);
  const background = useFooterBackground(footerRef);

  return (
    <footer className="site-footer" id="site-footer" aria-label="TypeScribe footer" ref={footerRef} style={{ '--footer-join-background': background }}>
      <div className="site-footer-illustration" aria-hidden="true">
        <img src="/assets/typescribe-footer-edge.svg" width="1600" height="400" alt="" loading="lazy" decoding="async" />
      </div>
      <div className="site-footer-body">
        <div className="site-footer-middle">
          <nav className="site-footer-navigation" aria-label="Footer navigation">
            <h2>Navigation</h2>
            <ul>
              {navigation.map(({ label, href }) => <li key={label}><SiteLink href={href}>{label}</SiteLink></li>)}
            </ul>
          </nav>
          <div className="site-footer-message">
            <h2>Your transcript desk.</h2>
            <p>{statement}</p>
            <SiteLink className="site-footer-download" href={downloadHref}>
              <Download size={18} aria-hidden="true" />Download for Windows<ArrowUpRight size={17} aria-hidden="true" />
            </SiteLink>
          </div>
          <div className="site-footer-details">
            <div className="site-footer-utilities">
              {utilities.map(({ label, href, Icon }) => (
                <a href={href} aria-label={label} title={label} key={label}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></a>
              ))}
            </div>
            <p className="site-footer-copyright">© {new Date().getFullYear()} TypeScribe</p>
            <p className="site-footer-meta">{metaLeft}</p>
            <a className="site-footer-license" href={`${repository}/blob/main/LICENSE`}>Open source. MIT licensed.<ArrowUpRight size={14} aria-hidden="true" /></a>
            <p className="site-footer-boundary">{metaRight}</p>
          </div>
        </div>
        <SiteLink className="site-footer-wordmark" href="/" aria-label="TypeScribe home"><span className="site-footer-wordmark-ink" aria-hidden="true">TypeScribe</span></SiteLink>
      </div>
    </footer>
  );
}
