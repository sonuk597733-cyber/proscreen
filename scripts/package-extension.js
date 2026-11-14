import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

// 3. Create ZIP using PowerShell Compress-Archive
const zipName = 'ProScreen-Chrome-Extension-1.0.0.zip';
const zipPath = path.join(releaseDir, zipName);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`- Compressing to ${zipPath}...`);
execSync(
  `powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`,
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
