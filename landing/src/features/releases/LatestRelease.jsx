import { ArrowUpRight, Download } from 'lucide-react';
import { formatDate, installableAssets, primaryAsset } from './releaseData.js';
import { PlatformIcon, platforms } from '../../components/ui/PlatformIcon.jsx';

const versionColors = ['text-pink', 'text-yellow', 'text-cyan', 'text-red'];
const versionTransforms = ['-rotate-3 -translate-y-px', 'rotate-2 translate-y-px', '-rotate-1', 'rotate-3 -translate-y-px'];

function summarize(body) {
  const lines = String(body || '')
    .split('\n')
    .map((line) => line.replace(/^[-#*`>\s]+/, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim())
    .filter((line) => line && !/^(highlights|install|notes)$/i.test(line));
  return lines.find((line) => line.length > 32)?.slice(0, 190) || 'The latest TypeScribe desktop release and its installers.';
}

function VersionTag({ value }) {
  return (
    <span className="ml-[.08em] inline-flex gap-px whitespace-nowrap font-black">
      {[...value].map((character, index) => (
        <span className={`inline-block ${versionColors[index % versionColors.length]} ${versionTransforms[index % versionTransforms.length]}`} key={`${character}-${index}`}>{character}</span>
      ))}
    </span>
  );
}

export function LatestRelease({ release }) {
  const installers = installableAssets(release);
  const primary = primaryAsset(release);
  const productName = release.name.replace(release.tag, '').trim() || 'TypeScribe';

  return (
    <article className="relative mt-8 border border-[var(--page-line)] bg-[var(--surface)]" aria-labelledby="latest-release-title">
      <div className="absolute right-5 top-[17px] z-10 flex items-center gap-4 max-[760px]:static max-[760px]:justify-end max-[760px]:px-5 max-[760px]:pt-4">
        <time className="font-mono text-[.48rem] uppercase text-[var(--page-muted)]">{formatDate(release.publishedAt)}</time>
        <a className="inline-flex items-center gap-1.5 font-mono text-[.54rem] font-semibold text-[var(--page-muted)] no-underline hover:text-yellow" href={release.url}>
          Release notes <ArrowUpRight size={13} />
        </a>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-10 px-[34px] pb-[30px] pt-[54px] max-[760px]:grid-cols-1 max-[760px]:gap-7 max-[760px]:px-5 max-[760px]:pb-6 max-[760px]:pt-[18px]">
        <div>
          <h2 id="latest-release-title" className="m-0 max-w-[650px] font-display text-[clamp(1.65rem,2.6vw,2.35rem)] font-[650] leading-none tracking-[-.055em] text-[var(--page-copy)]">
            {productName}<VersionTag value={release.tag} />
          </h2>
          <p className="mt-4 max-w-[620px] text-[.76rem] leading-6 text-[var(--page-muted)]">{summarize(release.body)}</p>
        </div>
        <div className="min-w-[220px] max-[760px]:min-w-0">
          {primary ? (
            <a className="site-slide-button button-red inline-flex min-h-12 w-full items-center justify-center gap-2.5 bg-red px-5 text-sm font-extrabold text-cream no-underline shadow-[4px_4px_0_#f6c943] hover:-translate-y-0.5" href={primary.url}>
              <PlatformIcon platform={primary.platform} className="brightness-0 invert" /> Download for {primary.platform.label}
            </a>
          ) : (
            <span className="inline-flex min-h-12 w-full items-center justify-center bg-red/40 px-5 text-sm font-bold text-cream/60">No installer published</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-[var(--page-line)] max-[760px]:grid-cols-1">
        {platforms.map((platform, index) => {
          const asset = installers.find((candidate) => candidate.platform.key === platform.key);
          return (
            <div className={`flex min-h-[74px] items-center gap-3 px-5 py-3.5 ${index < 2 ? 'border-r border-[var(--page-line)] max-[760px]:border-b max-[760px]:border-r-0' : ''} ${asset ? '' : 'opacity-45'}`} key={platform.key}>
              <PlatformIcon platform={platform} className="h-6 w-6" />
              <span>
                <strong className="block text-xs">{platform.label}</strong>
                <small className="mt-1 block font-mono text-[.5rem] text-[var(--page-muted)]">{asset ? 'Available' : 'Not included'}</small>
              </span>
              {asset && (
                <a className="site-slide-button ml-auto inline-flex h-11 w-11 items-center justify-center border border-transparent text-yellow no-underline hover:-translate-y-0.5" href={asset.url} aria-label={`Download ${asset.name} for ${platform.label}`}>
                  <Download size={18} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
