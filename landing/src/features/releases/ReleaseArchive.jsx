import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, installableAssets } from './releaseData.js';
import { PlatformIcon, platforms } from '../../components/ui/PlatformIcon.jsx';
import { useDetectedPlatform } from '../../hooks/useDetectedPlatform.js';

const PAGE_SIZE = 8;

function PlatformLabels({ release }) {
  const available = [...new Map(installableAssets(release).map((asset) => [asset.platform.key, asset.platform])).values()];
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((platform) => (
        <span className="inline-flex items-center gap-1.5 text-[.64rem] font-bold" key={platform.key}>
          <PlatformIcon platform={platform} className="h-[18px] w-[18px]" />{platform.label}
        </span>
      ))}
    </div>
  );
}

export function ReleaseArchive({ releases }) {
  const [platformFilter, setPlatformFilter] = useState('all');
  const [page, setPage] = useState(1);
  const detectedPlatform = useDetectedPlatform();

  const filtered = useMemo(() => releases.filter((release) => {
    const installers = installableAssets(release);
    return installers.some((asset) => platformFilter === 'all' || asset.platform.key === platformFilter);
  }), [platformFilter, releases]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageReleases = filtered.slice(start, start + PAGE_SIZE);
  const filterLabel = platformFilter === 'all' ? 'releases' : `${platformFilter === 'macos' ? 'macOS' : `${platformFilter[0].toUpperCase()}${platformFilter.slice(1)}`} releases`;

  const chooseFilter = (key) => {
    setPlatformFilter(key);
    setPage(1);
  };

  return (
    <section className="pt-12 pb-28 max-[760px]:pt-9 max-[760px]:pb-20" id="release-table" aria-labelledby="release-index-title">
      <div className="mx-auto w-[calc(100%-48px)] max-w-[1120px] max-[760px]:w-[calc(100%-16px)]">
        <div className="mb-[18px] flex items-center justify-between gap-7 max-[640px]:items-start max-[640px]:flex-col max-[640px]:gap-2">
          <h2 id="release-index-title" className="m-0 font-sans text-[clamp(1.45rem,2.1vw,1.8rem)] font-medium leading-tight tracking-[-.03em]">All releases</h2>
          <p className="m-0 font-mono text-[.54rem] text-[var(--page-muted)]">{filtered.length ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} {filterLabel}</p>
        </div>

        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter releases by operating system">
          <button className={`site-slide-button min-h-11 border px-3 font-mono text-[.54rem] font-semibold ${platformFilter === 'all' ? 'border-yellow bg-yellow text-ink' : 'border-[var(--page-line)] bg-transparent text-[var(--page-muted)]'}`} type="button" aria-pressed={platformFilter === 'all'} onClick={() => chooseFilter('all')}>All</button>
          {platforms.map((platform) => (
            <button className={`site-slide-button group inline-flex min-h-11 items-center gap-2 border px-3 font-mono text-[.54rem] font-semibold ${platformFilter === platform.key ? 'border-yellow bg-yellow text-ink' : 'border-[var(--page-line)] bg-transparent text-[var(--page-muted)]'}`} type="button" aria-pressed={platformFilter === platform.key} onClick={() => chooseFilter(platform.key)} key={platform.key}>
              <PlatformIcon platform={platform} className={`${platformFilter === platform.key ? 'brightness-0' : ''} group-hover:brightness-0`} />{platform.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto border border-[var(--page-line)] bg-[var(--surface)]" tabIndex={0} aria-label="Scrollable release installer table">
          <table className="w-full min-w-[820px] table-fixed border-collapse">
            <thead className="bg-[var(--surface-raised)] font-mono text-[.5rem] font-bold uppercase tracking-[.05em] text-[var(--page-muted)]">
              <tr><th className="w-[185px] border-b border-[var(--page-line)] px-4 py-[18px] text-left">Release</th><th className="w-[125px] border-b border-[var(--page-line)] px-4 py-[18px] text-left">Published</th><th className="border-b border-[var(--page-line)] px-4 py-[18px] text-left">Platforms</th><th className="w-[105px] border-b border-[var(--page-line)] px-4 py-[18px] text-left">Installers</th><th className="w-[190px] border-b border-[var(--page-line)] px-4 py-[18px]"><span className="sr-only">Download installer</span></th></tr>
            </thead>
            <tbody>
              {!pageReleases.length && <tr><td className="h-28 text-center font-mono text-[.6rem] text-[var(--page-muted)]" colSpan={5}>No releases include an installer for this operating system.</td></tr>}
              {pageReleases.map((release) => {
                const installers = installableAssets(release).filter((asset) => platformFilter === 'all' || asset.platform.key === platformFilter);
                const preferredInstaller = installers.find((asset) => asset.platform.key === detectedPlatform.key) ?? installers[0];
                const isLatest = releases[0]?.tag === release.tag;
                return (
                  <tr className={`border-b border-[var(--page-line)] transition-colors hover:bg-yellow/5 ${isLatest ? 'shadow-[inset_3px_0_0_#f6c943]' : ''}`} key={release.tag}>
                    <td className="px-4 py-[18px]">
                      <div className="flex items-center gap-2"><strong className="font-mono text-[.7rem]">{release.tag}</strong>{isLatest && <small className="bg-yellow px-1.5 py-1 font-mono text-[.42rem] font-bold uppercase text-ink">Latest</small>}{release.prerelease && <small className="bg-pink px-1.5 py-1 font-mono text-[.42rem] font-bold uppercase text-ink">Pre-release</small>}</div>
                      <a className="mt-2 inline-block font-mono text-[.52rem] font-semibold text-[var(--page-muted)] no-underline hover:text-yellow" href={release.url}>Release notes ↗</a>
                    </td>
                    <td className="px-4 py-[18px] font-mono text-[.55rem] text-[var(--page-muted)]">{formatDate(release.publishedAt)}</td>
                    <td className="px-4 py-[18px]"><PlatformLabels release={release} /></td>
                    <td className="px-4 py-[18px] font-mono text-[.55rem] text-[var(--page-muted)]">{installers.length} {installers.length === 1 ? 'installer' : 'installers'}</td>
                    <td className="px-4 py-[18px]">
                      {preferredInstaller && (
                        <a className="site-slide-button button-yellow inline-flex min-h-11 min-w-[158px] items-center justify-center gap-2 whitespace-nowrap bg-yellow px-3 font-mono text-[.54rem] font-extrabold text-ink no-underline" href={preferredInstaller.url} aria-label={`Download ${release.tag} for ${preferredInstaller.platform.label}`}>
                          <Download size={15} /> Download for {preferredInstaller.platform.label}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && <nav className="mt-[18px] grid grid-cols-[120px_minmax(0,1fr)_120px] items-center max-[500px]:grid-cols-[94px_minmax(0,1fr)_94px]" aria-label="Release table pages">
          <button className="site-slide-button inline-flex min-h-11 items-center justify-center gap-1 border border-[var(--page-line)] bg-[var(--surface)] font-mono text-[.54rem] disabled:cursor-not-allowed disabled:opacity-35" type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} />Previous</button>
          <span className="text-center font-mono text-[.54rem] text-[var(--page-muted)]">Page {safePage} of {pageCount}</span>
          <button className="site-slide-button inline-flex min-h-11 items-center justify-center gap-1 border border-[var(--page-line)] bg-[var(--surface)] font-mono text-[.54rem] disabled:cursor-not-allowed disabled:opacity-35" type="button" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next<ChevronRight size={15} /></button>
        </nav>}
      </div>
    </section>
  );
}
