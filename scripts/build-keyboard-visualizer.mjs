import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

if (process.platform !== 'win32') {
  console.log('[KEYBOARD VISUALIZER] Skipping native build on non-Windows platform.');
  process.exit(0);
}

const architecture = process.env.PROSCREEN_NATIVE_ARCH || 'x64';
if (architecture !== 'x64') {
  throw new Error(`The Windows keyboard visualizer currently supports x64 only (received ${architecture}).`);
}

const projectRoot = path.resolve(scriptDirectory, '..');
const nativeDirectory = path.join(projectRoot, 'src', 'native', 'keyboard-visualizer');
const nodeGypCli = require.resolve('node-gyp/bin/node-gyp.js', { paths: [projectRoot] });
const electronVersion = require(path.join(projectRoot, 'node_modules', 'electron', 'package.json')).version;

console.log(`[KEYBOARD VISUALIZER] Building Windows x64 addon for Electron ${electronVersion}.`);
execFileSync(
  process.execPath,
  [nodeGypCli, 'rebuild', `--target=${electronVersion}`, '--dist-url=https://electronjs.org/headers', `--arch=${architecture}`],
  { cwd: nativeDirectory, stdio: 'inherit' }
);

const nativeModulePath = path.join(nativeDirectory, 'build', 'Release', 'keyboard_visualizer.node');
if (!fs.existsSync(nativeModulePath)) {
  throw new Error(`Native compilation completed without producing ${nativeModulePath}.`);
}
console.log(`[KEYBOARD VISUALIZER] Native module ready: ${nativeModulePath}`);
