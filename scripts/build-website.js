import { build } from 'vite';
import fs from 'fs';
import path from 'path';

process.env.BUILD_TARGET = 'website';
process.env.GITHUB_PAGES = 'true';

console.log('[PROSCREEN] Building production website bundle for GitHub Pages (base: /proscreen/)...');

build()
  .then(() => {
    // Exclude large desktop binaries from dist-website so it is under 3MB and compliant with GitHub Pages
    const distDownloads = path.resolve('dist-website/downloads');
    if (fs.existsSync(distDownloads)) {
      fs.rmSync(distDownloads, { recursive: true, force: true });
    }
    console.log('[PROSCREEN] Website build complete: clean output in dist-website/');
  })
  .catch((err) => {
    console.error('[PROSCREEN] Website build failed:', err);
    process.exit(1);
  });
