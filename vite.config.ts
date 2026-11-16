import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function proscreenExtensionPlugin(): Plugin {
  return {
    name: 'proscreen-extension-builder',
    async closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const assetsDir = path.join(distDir, 'assets');

      if (fs.existsSync(assetsDir)) {
        const cssFile = fs
          .readdirSync(assetsDir)
          .find((f) => f.startsWith('contentStyle') && f.endsWith('.css'));
        if (cssFile) {
          fs.copyFileSync(path.join(assetsDir, cssFile), path.join(distDir, 'content.css'));
        }
      }

      await esbuild.build({
        entryPoints: [path.resolve(__dirname, 'src/background/index.ts')],
        bundle: true,
        format: 'esm',
        target: 'chrome120',
        outfile: path.join(distDir, 'background.js'),
        minify: true,
      });

      let inlineCss = '';
      const contentCssPath = path.join(distDir, 'content.css');
      if (fs.existsSync(contentCssPath)) {
        inlineCss = fs.readFileSync(contentCssPath, 'utf-8');
      }

      await esbuild.build({
        entryPoints: [path.resolve(__dirname, 'src/content/index.tsx')],
        bundle: true,
        format: 'iife',
        target: 'chrome120',
        outfile: path.join(distDir, 'content.js'),
        define: {
          'process.env.NODE_ENV': '"production"',
          '__PROSCREEN_INLINE_CSS__': JSON.stringify(inlineCss),
        },
        minify: true,
      });

      // Build Electron Main and Preload bundles for Desktop Target
      const distElectronDir = path.resolve(__dirname, 'dist-electron');
      if (!fs.existsSync(distElectronDir)) {
        fs.mkdirSync(distElectronDir, { recursive: true });
      }

      await esbuild.build({
        entryPoints: [path.resolve(__dirname, 'electron/main.ts')],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node20',
        external: ['electron'],
        outfile: path.join(distElectronDir, 'main.cjs'),
      });

      await esbuild.build({
        entryPoints: [path.resolve(__dirname, 'electron/preload.ts')],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node20',
        external: ['electron'],
        outfile: path.join(distElectronDir, 'preload.cjs'),
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const isWebsiteBuild = process.env.BUILD_TARGET === 'website';
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';
  const basePath = isGitHubPages ? '/proscreen/' : (process.env.VITE_BASE_PATH || './');

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...(isBuild && !isWebsiteBuild ? [proscreenExtensionPlugin()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      minify: false,
      sourcemap: true,
      outDir: isWebsiteBuild ? 'dist-website' : 'dist',
      emptyOutDir: true,
      rollupOptions: (isWebsiteBuild
        ? {
            input: {
              main: path.resolve(__dirname, 'index.html'),
            },
          }
        : {
            input: {
              main: path.resolve(__dirname, 'index.html'),
              popup: path.resolve(__dirname, 'popup.html'),
              options: path.resolve(__dirname, 'options.html'),
              offscreen: path.resolve(__dirname, 'offscreen.html'),
              contentStyle: path.resolve(__dirname, 'src/content/content.css'),
              desktopOverlay: path.resolve(__dirname, 'desktop-overlay.html'),
              desktopToolbar: path.resolve(__dirname, 'desktop-toolbar.html'),
            },
            output: {
              assetFileNames: (assetInfo: any) => {
                if (assetInfo.names?.includes('content.css') || assetInfo.name === 'content.css') {
                  return 'content.css';
                }
                return 'assets/[name]-[hash][extname]';
              },
            },
          }) as any,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
