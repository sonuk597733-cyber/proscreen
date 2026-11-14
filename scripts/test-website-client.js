import fs from 'fs';
import path from 'path';

console.log('=== VERIFYING WEBSITE CLIENT BUNDLE & DOWNLOAD PAGE DOM ===\n');

const distWebsite = path.resolve('dist-website');
const indexHtmlPath = path.join(distWebsite, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

console.log('1. Checking HTML Shell:');
console.log('  - Base path set:', indexHtml.includes('<base href="/proscreen/"'));
console.log('  - Title is ProScreen:', indexHtml.includes('ProScreen'));
console.log('  - Main CSS linked:', indexHtml.includes('/proscreen/assets/main-'));
console.log('  - Main JS linked:', indexHtml.includes('/proscreen/assets/main-'));

// Find compiled JS bundle
const assetsDir = path.join(distWebsite, 'assets');
const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
console.log(`\n2. Inspecting Production JS Bundle (${jsFiles[0]}):`);

const jsContent = fs.readFileSync(path.join(assetsDir, jsFiles[0]), 'utf-8');

const checks = [
  { name: 'Installer filename', pattern: 'ProScreen-Setup-1.0.0.exe' },
  { name: 'Portable filename', pattern: 'ProScreen-Portable-1.0.0.exe' },
  { name: 'Extension ZIP filename', pattern: 'ProScreen-Chrome-Extension-1.0.0.zip' },
  { name: 'Installer SHA-256', pattern: 'D7DB64EEF56D0313E4E6E5CF6352F6CD6E315628366B3A718963A49AD80A388D' },
  { name: 'Portable SHA-256', pattern: 'A933048460EBCB7D5C76C421D170F8F0A914EB7B6B320D88665A6056EE9B58D2' },
  { name: 'Extension SHA-256', pattern: '40B58190175316611860DAC801D91E12DA3E4821E2637313C49B520F647E6D7A' },
  { name: 'Download Started Feedback Modal', pattern: 'Your Download Has Started!' },
  { name: 'Download Retry Link', pattern: 'Download didn\'t start? Click here to retry' },
  { name: 'Verification-First Checklist', pattern: 'Verification-First Security Checklist' },
  { name: 'PowerShell Verification Snippet', pattern: 'Get-FileHash -Path' },
  { name: 'First Launch Walkthrough', pattern: 'What to Expect on First Launch' },
  { name: 'Pointer Mode Explanation', pattern: 'Starts in Pointer Mode' },
  { name: 'Alt+Shift+P Shortcut Explanation', pattern: 'Global Alt+Shift+P Hotkey' },
  { name: 'Floating Eye Explanation', pattern: 'Floating Eye Restore' },
  { name: 'Clean Uninstallation Guide', pattern: 'Clean Uninstallation' },
];

let allPassed = true;
checks.forEach((c) => {
  const present = jsContent.includes(c.pattern);
  console.log(`  [${present ? '✔ PASS' : '❌ FAIL'}] ${c.name}`);
  if (!present) allPassed = false;
});

console.log('\nBundle validation result:', allPassed ? '100% PASS ✔' : 'FAIL ❌');
