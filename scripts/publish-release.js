import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';

console.log('=== PROSCREEN GITHUB RELEASE PUBLISHER ===\n');

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || process.env.VITE_GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_REPO) {
  console.error('ERROR: GITHUB_REPOSITORY environment variable is required (e.g. "username/proscreen").');
  console.log('Usage:');
  console.log('  set GITHUB_REPOSITORY=username/proscreen');
  console.log('  set GITHUB_TOKEN=your_token');
  console.log('  node scripts/publish-release.js');
  process.exit(1);
}

const setupPath = path.resolve('release/ProScreen-Setup-1.0.0.exe');
const portablePath = path.resolve('release/ProScreen-Portable-1.0.0.exe');

if (!fs.existsSync(setupPath) || !fs.existsSync(portablePath)) {
  console.error('ERROR: Windows release binaries not found in release/ directory.');
  process.exit(1);
}

const setupSize = fs.statSync(setupPath).size;
const portableSize = fs.statSync(portablePath).size;
const setupHash = crypto.createHash('sha256').update(fs.readFileSync(setupPath)).digest('hex').toUpperCase();
const portableHash = crypto.createHash('sha256').update(fs.readFileSync(portablePath)).digest('hex').toUpperCase();

console.log(`Repository: ${GITHUB_REPO}`);
console.log(`Release Tag: v1.0.0`);
console.log(`Setup File: ${setupPath} (${(setupSize / (1024 * 1024)).toFixed(1)} MB)`);
console.log(`Setup SHA-256: ${setupHash}`);
console.log(`Portable File: ${portablePath} (${(portableSize / (1024 * 1024)).toFixed(1)} MB)`);
console.log(`Portable SHA-256: ${portableHash}`);

console.log('\nReady to publish release v1.0.0 via GitHub Actions or GitHub API.');
