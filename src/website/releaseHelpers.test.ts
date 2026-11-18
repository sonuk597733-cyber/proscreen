import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GITHUB_REPO,
  OFFICIAL_RELEASES,
  RELEASE_MANIFEST_URL,
  RELEASE_VERSION,
} from './constants';
import {
  buildGitHubReleaseUrl,
  buildPowerShellHashCommand,
  extractSha256MapFromReleaseBody,
  formatAssetBytes,
  formatInstallerSummary,
  isOfficialGithubReleaseUrl,
  parseGitHubReleasePayload,
  resolveAssetDownloadUrl,
} from './releaseHelpers';

test('OFFICIAL_RELEASES URLs point exclusively to valid GitHub Releases assets', () => {
  assert.equal(
    isOfficialGithubReleaseUrl(OFFICIAL_RELEASES.installer.downloadUrl, GITHUB_REPO),
    true
  );
  assert.equal(
    isOfficialGithubReleaseUrl(OFFICIAL_RELEASES.portable.downloadUrl, GITHUB_REPO),
    true
  );
  assert.equal(
    isOfficialGithubReleaseUrl(OFFICIAL_RELEASES.extensionZip.downloadUrl, GITHUB_REPO),
    true
  );
  assert.equal(isOfficialGithubReleaseUrl('./downloads/ProScreen-Setup-1.0.0.exe', GITHUB_REPO), false);
});

test('OFFICIAL_RELEASES metadata keeps consistent version and filenames', () => {
  assert.equal(RELEASE_VERSION, '1.0.3');
  assert.equal(RELEASE_MANIFEST_URL, 'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.3/release-manifest.json');
  assert.equal(OFFICIAL_RELEASES.installer.version, RELEASE_VERSION);
  assert.equal(OFFICIAL_RELEASES.portable.version, RELEASE_VERSION);
  assert.equal(OFFICIAL_RELEASES.extensionZip.version, RELEASE_VERSION);
  assert.equal(OFFICIAL_RELEASES.installer.fileName, 'ProScreen-Setup-1.0.3.exe');
  assert.equal(OFFICIAL_RELEASES.portable.fileName, 'ProScreen-Portable-1.0.3.exe');
  assert.equal(OFFICIAL_RELEASES.extensionZip.fileName, 'ProScreen-Chrome-Extension-1.0.3.zip');
  assert.equal(OFFICIAL_RELEASES.installer.sizeBytes, 140350424);
  assert.equal(OFFICIAL_RELEASES.portable.sizeBytes, 125325365);
  assert.equal(OFFICIAL_RELEASES.extensionZip.sizeBytes, 2207341);
  assert.match(OFFICIAL_RELEASES.installer.sha256, /^[A-F0-9]{64}$/);
  assert.match(OFFICIAL_RELEASES.portable.sha256, /^[A-F0-9]{64}$/);
  assert.match(OFFICIAL_RELEASES.extensionZip.sha256, /^[A-F0-9]{64}$/);
});

test('buildGitHubReleaseUrl and resolveAssetDownloadUrl never default to broken local URLs', () => {
  const url = buildGitHubReleaseUrl('sonuk597733-cyber/proscreen', 'v1.0.3', 'ProScreen-Setup-1.0.3.exe');
  assert.equal(
    url,
    'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.3/ProScreen-Setup-1.0.3.exe'
  );
  assert.equal(resolveAssetDownloadUrl(OFFICIAL_RELEASES.installer), url);
  assert.equal(
    resolveAssetDownloadUrl(OFFICIAL_RELEASES.installer, { forceLocalDownloads: true }),
    './downloads/ProScreen-Setup-1.0.3.exe'
  );
});

test('buildPowerShellHashCommand and formatInstallerSummary output exact user-facing strings', () => {
  assert.equal(
    buildPowerShellHashCommand('ProScreen-Setup-1.0.3.exe'),
    'Get-FileHash -Path "$HOME\\Downloads\\ProScreen-Setup-1.0.3.exe" -Algorithm SHA256'
  );
  assert.equal(
    formatInstallerSummary(OFFICIAL_RELEASES.installer),
    'ProScreen-Setup-1.0.3.exe • v1.0.3 • 133.8 MB • Windows 10 / Windows 11 (64-bit)'
  );
});

test('formatAssetBytes and extractSha256MapFromReleaseBody parse real sizes and checksums', () => {
  assert.equal(formatAssetBytes(139175329), '132.7 MB');
  assert.equal(formatAssetBytes(798637), '779.9 KB');
  assert.equal(formatAssetBytes(0), '0 B');

  const sampleBody = [
    '| `ProScreen-Setup-1.0.2.exe` | Windows NSIS Setup Installer | 134.2 MB | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |',
    '| `ProScreen-Portable-1.0.2.exe` | Windows Standalone Portable App | 120.1 MB | `BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB` |',
  ].join('\n');

  const shaMap = extractSha256MapFromReleaseBody(sampleBody);
  assert.equal(
    shaMap['ProScreen-Setup-1.0.2.exe'],
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  );
  assert.equal(
    shaMap['ProScreen-Portable-1.0.2.exe'],
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
  );
});

test('parseGitHubReleasePayload hydrates newer live GitHub release metadata and rejects invalid URLs', () => {
  const payload = {
    tag_name: 'v1.0.2',
    published_at: '2026-12-01T10:00:00Z',
    body: '| `ProScreen-Setup-1.0.2.exe` | Windows NSIS | 134.2 MB | `1111111111111111111111111111111111111111111111111111111111111111` |',
    assets: [
      {
        name: 'ProScreen-Setup-1.0.2.exe',
        size: 140718899,
        browser_download_url:
          'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.2/ProScreen-Setup-1.0.2.exe',
      },
      {
        name: 'ProScreen-Portable-1.0.2.exe',
        size: 125933978,
        browser_download_url: 'https://evil.example.com/ProScreen-Portable-1.0.2.exe',
      },
    ],
  };

  const hydrated = parseGitHubReleasePayload(payload, OFFICIAL_RELEASES, GITHUB_REPO);
  assert.equal(hydrated.installer.version, '1.0.2');
  assert.equal(hydrated.installer.fileName, 'ProScreen-Setup-1.0.2.exe');
  assert.equal(hydrated.installer.sizeFormatted, '134.2 MB');
  assert.equal(
    hydrated.installer.downloadUrl,
    'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.2/ProScreen-Setup-1.0.2.exe'
  );
  assert.equal(
    hydrated.installer.sha256,
    '1111111111111111111111111111111111111111111111111111111111111111'
  );
  assert.equal(hydrated.installer.releaseDate, 'December 2026');

  // Untrusted host must safely fall back to verified OFFICIAL_RELEASES portable asset
  assert.equal(hydrated.portable.downloadUrl, OFFICIAL_RELEASES.portable.downloadUrl);
  assert.equal(parseGitHubReleasePayload(null, OFFICIAL_RELEASES, GITHUB_REPO), OFFICIAL_RELEASES);
});
