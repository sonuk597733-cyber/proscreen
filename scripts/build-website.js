import { build } from 'vite';

process.env.BUILD_TARGET = 'website';
process.env.GITHUB_PAGES = 'true';

console.log('[PROSCREEN] Building production website bundle for GitHub Pages (base: /proscreen/)...');

build()
  .then(() => {
    console.log('[PROSCREEN] Website build complete: output in dist-website/');
  })
  .catch((err) => {
    console.error('[PROSCREEN] Website build failed:', err);
    process.exit(1);
  });
