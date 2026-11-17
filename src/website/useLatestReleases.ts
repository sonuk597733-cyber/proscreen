import { useEffect, useState } from 'react';
import { GITHUB_REPO, OFFICIAL_RELEASES } from './constants';
import { parseGitHubReleasePayload, ReleaseBundle } from './releaseHelpers';

let cachedBundle: ReleaseBundle | null = null;
let inflightRequest: Promise<ReleaseBundle> | null = null;

async function fetchLatestReleaseBundle(): Promise<ReleaseBundle> {
  if (cachedBundle) return cachedBundle;
  if (inflightRequest) return inflightRequest;

  const fallback: ReleaseBundle = OFFICIAL_RELEASES;
  inflightRequest = fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then(async (res) => {
      if (!res.ok) return fallback;
      const data: unknown = await res.json();
      const parsed = parseGitHubReleasePayload(data, fallback, GITHUB_REPO);
      cachedBundle = parsed;
      return parsed;
    })
    .catch(() => fallback)
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

export function useLatestReleases(): {
  releases: ReleaseBundle;
  isLiveSynced: boolean;
} {
  const [releases, setReleases] = useState<ReleaseBundle>(() => cachedBundle ?? OFFICIAL_RELEASES);
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(() => cachedBundle !== null);

  useEffect(() => {
    let active = true;
    void fetchLatestReleaseBundle().then((bundle) => {
      if (!active) return;
      setReleases(bundle);
      setIsLiveSynced(cachedBundle !== null);
    });
    return () => {
      active = false;
    };
  }, []);

  return { releases, isLiveSynced };
}
