import { ReleaseAsset } from './types';

export interface ReleaseBundle {
  installer: ReleaseAsset;
  portable: ReleaseAsset;
  extensionZip: ReleaseAsset;
}

export interface GitHubReleaseAssetPayload {
  name?: string;
  size?: number;
  browser_download_url?: string;
}

export interface GitHubReleasePayload {
  tag_name?: string;
  published_at?: string;
  body?: string;
  assets?: GitHubReleaseAssetPayload[];
}

export function buildGitHubReleaseUrl(githubRepo: string, version: string, fileName: string): string {
  const cleanRepo = githubRepo.replace(/^\/+|\/+$/g, '');
  const cleanVersion = version.replace(/^v/i, '');
  return `https://github.com/${cleanRepo}/releases/download/v${cleanVersion}/${fileName}`;
}

export function isOfficialGithubReleaseUrl(url: string, githubRepo: string): boolean {
  try {
    const parsed = new URL(url);
    const cleanRepo = githubRepo.replace(/^\/+|\/+$/g, '');
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      parsed.pathname.startsWith(`/${cleanRepo}/releases/download/`) &&
      (parsed.pathname.endsWith('.exe') || parsed.pathname.endsWith('.zip'))
    );
  } catch {
    return false;
  }
}

export function resolveAssetDownloadUrl(
  asset: Pick<ReleaseAsset, 'fileName' | 'downloadUrl'>,
  options?: { forceLocalDownloads?: boolean }
): string {
  if (options?.forceLocalDownloads) {
    return `./downloads/${asset.fileName}`;
  }
  return asset.downloadUrl;
}

export function buildPowerShellHashCommand(fileName: string): string {
  return `Get-FileHash -Path "$HOME\\Downloads\\${fileName}" -Algorithm SHA256`;
}

export function formatInstallerSummary(asset: ReleaseAsset): string {
  return `${asset.fileName} • v${asset.version} • ${asset.sizeFormatted} • ${asset.targetOS}`;
}

export function formatAssetBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function extractSha256MapFromReleaseBody(body: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!body || typeof body !== 'string') return result;

  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const fileMatch = line.match(/ProScreen-[A-Za-z0-9._-]+\.(?:exe|zip)/);
    const hashMatch = line.match(/\b([A-Fa-f0-9]{64})\b/);
    if (fileMatch && hashMatch) {
      result[fileMatch[0]] = hashMatch[1].toUpperCase();
    }
  }
  return result;
}

function formatReleaseMonthYear(isoDate: string | undefined, fallback: string): string {
  if (!isoDate) return fallback;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function parseGitHubReleasePayload(
  payload: unknown,
  fallback: ReleaseBundle,
  githubRepo: string
): ReleaseBundle {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const release = payload as GitHubReleasePayload;
  const rawTag = typeof release.tag_name === 'string' ? release.tag_name.trim() : '';
  const version = rawTag ? rawTag.replace(/^v/i, '') : fallback.installer.version;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const shaMap = extractSha256MapFromReleaseBody(release.body);
  const releaseDate = formatReleaseMonthYear(release.published_at, fallback.installer.releaseDate);

  const findMatchedAsset = (
    pattern: RegExp,
    base: ReleaseAsset
  ): ReleaseAsset => {
    const match = assets.find(
      (a) =>
        typeof a?.name === 'string' &&
        pattern.test(a.name) &&
        typeof a.browser_download_url === 'string' &&
        isOfficialGithubReleaseUrl(a.browser_download_url, githubRepo) &&
        typeof a.size === 'number' &&
        a.size > 0
    );

    if (!match || !match.name || !match.browser_download_url || typeof match.size !== 'number') {
      return base;
    }

    const parsedSha = shaMap[match.name];
    return {
      ...base,
      fileName: match.name,
      version,
      sizeBytes: match.size,
      sizeFormatted: formatAssetBytes(match.size),
      downloadUrl: match.browser_download_url,
      sha256: parsedSha || (match.name === base.fileName ? base.sha256 : 'See Release Checksum'),
      releaseDate,
    };
  };

  return {
    installer: findMatchedAsset(/^ProScreen-Setup-.*\.exe$/i, fallback.installer),
    portable: findMatchedAsset(/^ProScreen-Portable-.*\.exe$/i, fallback.portable),
    extensionZip: findMatchedAsset(/^ProScreen-Chrome-Extension-.*\.zip$/i, fallback.extensionZip),
  };
}
