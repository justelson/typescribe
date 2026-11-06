import { SiteShell } from '../components/layout/SiteLayout.jsx';
import { LatestRelease } from '../features/releases/LatestRelease.jsx';
import { ReleaseArchive } from '../features/releases/ReleaseArchive.jsx';
import { useReleases } from '../features/releases/useReleases.js';
import { installableAssets } from '../features/releases/releaseData.js';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata.js';
import { useSiteFooter } from '../hooks/useSiteFooter.js';

export function ReleasesPage() {
  const { releases, source } = useReleases();
  const latest = releases[0];
  const latestWindowsInstaller = latest && installableAssets(latest).find((asset) => asset.platform.key === 'windows');
  useSiteFooter({
    metaLeft: latest ? `${latest.tag} latest release` : 'TypeScribe releases',
    downloadHref: latestWindowsInstaller?.url || '/downloads/',
  });
  useDocumentMetadata('TypeScribe Releases', 'Browse TypeScribe releases and download installers by operating system.');

  return (
    <main id="releases">
        <section className="pt-[54px] max-[760px]:pt-11">
          <SiteShell>
            <h1 className="m-0 max-w-[780px] font-display text-[clamp(3.2rem,6vw,5.2rem)] font-[760] leading-[.92] tracking-[-.07em]">Download TypeScribe</h1>
            <p className="mt-[18px] max-w-[700px] text-base text-[var(--page-muted)]">Choose the latest installer for your operating system. Older versions remain available in the release archive below.</p>
            {latest && <LatestRelease release={latest} />}
            <p className="sr-only" aria-live="polite">{source === 'github' ? 'Live release data loaded.' : source === 'syncing' ? 'Release snapshot ready while live data loads.' : 'Bundled release snapshot shown.'}</p>
          </SiteShell>
        </section>
        <ReleaseArchive releases={releases} />
    </main>
  );
}
