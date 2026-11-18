import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import crypto from 'crypto';

console.log('=== PACKAGING CHROME EXTENSION DISTRIBUTABLE ZIP ===\n');

const distDir = path.resolve('dist');
const releaseDir = path.resolve('release');

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'manifest.json'))) {
  console.error('ERROR: dist/manifest.json not found. Run "npm run build" first.');
  process.exit(1);
}

// 1. Validate manifest.json
const manifestRaw = fs.readFileSync(path.join(distDir, 'manifest.json'), 'utf-8');
const manifest = JSON.parse(manifestRaw);
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
const sourceManifest = JSON.parse(fs.readFileSync(path.resolve('public/manifest.json'), 'utf-8'));

for (const [source, version] of [
  ['package.json', packageJson.version],
  ['public/manifest.json', sourceManifest.version],
  ['dist/manifest.json', manifest.version],
]) {
  if (version !== packageJson.version) {
    throw new Error(
      `Version mismatch: ${source} has ${version}, but package.json has ${packageJson.version}. Rebuild or synchronize the release versions before packaging.`
    );
  }
}

console.log(`- Extension Name: ${manifest.name}`);
console.log(`- Version: ${manifest.version}`);
console.log(`- Manifest Version: ${manifest.manifest_version}`);

if (manifest.manifest_version !== 3) {
  throw new Error('Manifest version must be 3.');
}

// 2. Prepare clean staging directory for extension
const stageDir = path.resolve('dist-extension-package');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// Copy only extension files
const filesToCopy = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'options.html',
  'offscreen.html',
];

filesToCopy.forEach((f) => {
  const src = path.join(distDir, f);
  if (!fs.existsSync(src)) {
    throw new Error(`Required extension file ${src} is missing!`);
  }
  fs.copyFileSync(src, path.join(stageDir, f));
});

// Copy icons and assets
const copyDirRecursive = (src, dest) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((entry) => {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  });
};

copyDirRecursive(path.join(distDir, 'icons'), path.join(stageDir, 'icons'));
copyDirRecursive(path.join(distDir, 'assets'), path.join(stageDir, 'assets'));

// 3. Create ZIP using Windows' built-in bsdtar. This avoids relying on the
// optional Microsoft.PowerShell.Archive module being loadable in CI/local shells.
const zipName = `ProScreen-Chrome-Extension-${manifest.version}.zip`;
const zipPath = path.join(releaseDir, zipName);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`- Compressing to ${zipPath}...`);
execFileSync(
  'tar.exe',
  ['-a', '-c', '-f', zipPath, '-C', stageDir, ...fs.readdirSync(stageDir)],
  { stdio: 'inherit' }
);

// Clean staging dir
fs.rmSync(stageDir, { recursive: true, force: true });

// Verify zip
const zipSize = fs.statSync(zipPath).size;
const zipHash = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex').toUpperCase();

console.log(`✔ Chrome Extension ZIP Created Successfully!`);
console.log(`- File: ${zipName}`);
console.log(`- Path: ${zipPath}`);
console.log(`- Size: ${(zipSize / 1024).toFixed(1)} KB (${zipSize} bytes)`);
console.log(`- SHA-256: ${zipHash}`);
