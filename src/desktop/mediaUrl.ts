/**
 * Safe encoding & decoding helpers for the custom `proscreen-media://` Electron protocol.
 * Ensures Windows paths with spaces, `#`, `?`, `%`, or Unicode characters round-trip reliably.
 */

export function toProScreenMediaUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const trimmed = normalized.replace(/^\/+/, '');
  const encodedSegments = trimmed
    .split('/')
    .filter((seg, idx) => seg.length > 0 || idx === 0)
    .map((seg, idx) => {
      // Preserve Windows drive letter (e.g. "C:") unencoded so URL pathname stays clean
      if (idx === 0 && /^[A-Za-z]:$/.test(seg)) {
        return seg;
      }
      return encodeURIComponent(seg);
    });
  return `proscreen-media://local/${encodedSegments.join('/')}`;
}

export function fromProScreenMediaUrl(
  mediaUrl: string,
  platform: NodeJS.Platform = process.platform
): string | null {
  try {
    const parsed = new URL(mediaUrl);
    if (parsed.protocol !== 'proscreen-media:') {
      return null;
    }
    const rawSegments = parsed.pathname.split('/').filter((s) => s.length > 0);
    const decoded = rawSegments.map((seg) => decodeURIComponent(seg)).join('/');
    if (!decoded) {
      return null;
    }
    if (platform === 'win32') {
      // Windows drive path e.g. C:/Users/... -> C:\Users\...
      if (/^[A-Za-z]:\//.test(decoded) || /^[A-Za-z]:$/.test(decoded)) {
        return decoded.replace(/\//g, '\\');
      }
      // UNC path if hostname wasn't 'local'
      if (parsed.hostname && parsed.hostname !== 'local') {
        return `\\\\${parsed.hostname}\\${decoded.replace(/\//g, '\\')}`;
      }
      return decoded.replace(/\//g, '\\');
    }
    return `/${decoded}`;
  } catch {
    return null;
  }
}
