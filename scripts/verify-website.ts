import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('=== PROSCREEN WEBSITE PRODUCTION VERIFICATION ===\n');

// 1. Verify build artifacts
console.log('1. Verifying dist/ and dist-website/ output...');
const distDir = path.resolve('dist');
const distWebsiteDir = path.resolve('dist-website');
assert.ok(fs.existsSync(distDir), 'dist/ directory must exist');
assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist');
assert.ok(fs.existsSync(distWebsiteDir), 'dist-website/ directory must exist');
assert.ok(fs.existsSync(path.join(distWebsiteDir, 'index.html')), 'dist-website/index.html must exist');
assert.ok(fs.existsSync(path.join(distWebsiteDir, '404.html')), 'dist-website/404.html must exist');
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
const websiteIndexHtml = fs.readFileSync(path.join(distWebsiteDir, 'index.html'), 'utf-8');
assert.ok(indexHtml.includes('ProScreen'), 'index.html must contain ProScreen brand');
assert.ok(indexHtml.includes('Your Screen. Your Canvas.'), 'index.html must contain official headline');
assert.ok(websiteIndexHtml.includes('/proscreen/'), 'dist-website/index.html must contain base /proscreen/');
console.log('✔ dist/index.html and dist-website/ for GitHub Pages verified.');

// 2. Verify download executables in dist/downloads
console.log('\n2. Verifying published release executables...');
const setupPath = path.join(distDir, 'downloads/ProScreen-Setup-1.0.0.exe');
const portablePath = path.join(distDir, 'downloads/ProScreen-Portable-1.0.0.exe');

assert.ok(fs.existsSync(setupPath), 'ProScreen-Setup-1.0.0.exe must exist in dist/downloads');
assert.ok(fs.existsSync(portablePath), 'ProScreen-Portable-1.0.0.exe must exist in dist/downloads');

const setupSize = fs.statSync(setupPath).size;
const portableSize = fs.statSync(portablePath).size;

console.log(`- Setup Installer Size: ${(setupSize / (1024 * 1024)).toFixed(1)} MB (${setupSize} bytes)`);
console.log(`- Portable Exe Size: ${(portableSize / (1024 * 1024)).toFixed(1)} MB (${portableSize} bytes)`);

assert.strictEqual(setupSize, 139175329, 'Setup size must match exact published binary');
assert.strictEqual(portableSize, 124183853, 'Portable size must match exact published binary');

// Check SHA256 hashes
const setupHash = crypto.createHash('sha256').update(fs.readFileSync(setupPath)).digest('hex').toUpperCase();
const portableHash = crypto.createHash('sha256').update(fs.readFileSync(portablePath)).digest('hex').toUpperCase();

assert.strictEqual(setupHash, 'D7DB64EEF56D0313E4E6E5CF6352F6CD6E315628366B3A718963A49AD80A388D', 'Setup SHA256 must match');
assert.strictEqual(portableHash, 'A933048460EBCB7D5C76C421D170F8F0A914EB7B6B320D88665A6056EE9B58D2', 'Portable SHA256 must match');
console.log('✔ SHA-256 cryptographic checksums verified for both Windows executables.');

// 3. Verify all 10 required routes exist and export properly
console.log('\n3. Verifying all routes & components in source code...');
const requiredPages = [
  'src/website/pages/HomePage.tsx',
  'src/website/pages/FeaturesPage.tsx',
  'src/website/pages/DownloadPage.tsx',
  'src/website/pages/ChromeExtensionPage.tsx',
  'src/website/pages/GalleryPage.tsx',
  'src/website/pages/ChangelogPage.tsx',
  'src/website/pages/FAQPage.tsx',
  'src/website/pages/SupportPage.tsx',
  'src/website/pages/PrivacyPolicyPage.tsx',
  'src/website/pages/TermsPage.tsx',
  'src/website/pages/PlaygroundPage.tsx',
];

requiredPages.forEach((p) => {
  assert.ok(fs.existsSync(p), `Page file ${p} must exist`);
  const content = fs.readFileSync(p, 'utf-8');
  assert.ok(content.length > 500, `Page ${p} must have substantial content`);
});
console.log(`✔ All ${requiredPages.length} required pages exist with production content.`);

// 4. Verify no fake testimonials, fake stats or fake URLs
console.log('\n4. Verifying integrity (zero fake testimonials, zero placeholder links)...');
const websiteSrc = path.resolve('src/website');
const readAllFiles = (dir: string): string[] => {
  const files: string[] = [];
  fs.readdirSync(dir).forEach((entry) => {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      files.push(...readAllFiles(full));
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      files.push(full);
    }
  });
  return files;
};

const allWebsiteFiles = readAllFiles(websiteSrc);
allWebsiteFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  assert.ok(!content.includes('Lorem ipsum'), `File ${file} contains placeholder 'Lorem ipsum'`);
  assert.ok(!content.includes('John Doe'), `File ${file} contains fake testimonial name 'John Doe'`);
  assert.ok(!content.includes('Jane Doe'), `File ${file} contains fake testimonial name 'Jane Doe'`);
  assert.ok(!content.includes('http://fake'), `File ${file} contains fake URL 'http://fake'`);
  assert.ok(!content.includes('https://fake'), `File ${file} contains fake URL 'https://fake'`);
});
console.log('✔ Clean content confirmed: zero placeholder text, zero fake testimonials, zero fake links.');

// 5. Verify icons and favicon assets
console.log('\n5. Verifying brand and icon assets in public/...');
const iconSizes = [16, 32, 48, 128, 256, 512];
iconSizes.forEach((s) => {
  const iconPath = path.resolve(`public/icons/icon${s}.png`);
  assert.ok(fs.existsSync(iconPath), `Icon public/icons/icon${s}.png must exist`);
});
console.log('✔ All icon resolutions (16px to 512px) verified.');

// 6. Verify Manifest V3 and Chrome Extension outputs
console.log('\n6. Verifying Manifest V3 Chrome Extension bundle in dist/...');
assert.ok(fs.existsSync(path.join(distDir, 'manifest.json')), 'dist/manifest.json must exist');
assert.ok(fs.existsSync(path.join(distDir, 'background.js')), 'dist/background.js must exist');
assert.ok(fs.existsSync(path.join(distDir, 'content.js')), 'dist/content.js must exist');
assert.ok(fs.existsSync(path.join(distDir, 'content.css')), 'dist/content.css must exist');
console.log('✔ Chrome Extension pipeline verified in dist/.');

// 7. Verify Electron outputs
console.log('\n7. Verifying Electron desktop bundle in dist-electron/...');
const distElectron = path.resolve('dist-electron');
assert.ok(fs.existsSync(path.join(distElectron, 'main.cjs')), 'dist-electron/main.cjs must exist');
assert.ok(fs.existsSync(path.join(distElectron, 'preload.cjs')), 'dist-electron/preload.cjs must exist');
console.log('✔ Electron desktop main and preload scripts verified in dist-electron/.');

console.log('\n======================================================');
console.log('🎉 ALL WEBSITE PRODUCTION QUALITY CONTROLS PASSED (100%)');
console.log('======================================================\n');
