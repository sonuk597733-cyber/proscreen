import fs from 'fs';
import path from 'path';

export type DesktopHtmlPage = 'overlay' | 'toolbar' | 'options';

const PAGE_FILENAMES: Record<DesktopHtmlPage, string> = {
  overlay: 'desktop-overlay.html',
  toolbar: 'desktop-toolbar.html',
  options: 'options.html',
};

export function resolveDesktopHtmlTarget(
  mainDir: string,
  page: DesktopHtmlPage,
  devServerUrl?: string
): { type: 'url'; url: string } | { type: 'file'; filePath: string } {
  const filename = PAGE_FILENAMES[page];
  if (devServerUrl) {
    const cleanBase = devServerUrl.replace(/\/+$/, '');
    return { type: 'url', url: `${cleanBase}/${filename}` };
  }
  return {
    type: 'file',
    filePath: path.join(mainDir, '../dist', filename),
  };
}

export function resolveBundledIconCandidates(
  mainDir: string,
  preferredFilenames: string[] = ['icon.ico', 'icon256.png', 'icon128.png', 'icon32.png']
): string[] {
  const searchDirs = [
    path.join(mainDir, '../dist/icons'),
    path.join(mainDir, '../public/icons'),
  ];
  const candidates: string[] = [];
  for (const dir of searchDirs) {
    for (const file of preferredFilenames) {
      candidates.push(path.join(dir, file));
    }
  }
  return candidates;
}

export function pickFirstExistingPath(
  candidates: string[],
  existsFn: (p: string) => boolean = fs.existsSync
): string | null {
  for (const candidate of candidates) {
    try {
      if (existsFn(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore permission/stat failures on individual candidates
    }
  }
  return null;
}
