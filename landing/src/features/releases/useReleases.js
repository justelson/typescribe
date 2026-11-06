import { useEffect, useState } from 'react';
import { loadReleases, snapshotReleases } from './releaseData.js';

export function useReleases() {
  const [state, setState] = useState({ releases: snapshotReleases, source: 'syncing' });

  useEffect(() => {
    let active = true;
    loadReleases().then((result) => {
      if (active) setState({ releases: result.releases, source: result.source });
    });
    return () => { active = false; };
  }, []);

  return state;
}
