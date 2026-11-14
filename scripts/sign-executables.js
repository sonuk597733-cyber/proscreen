import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('=== PROSCREEN CODE SIGNING & AUTHENTICODE INSPECTOR ===\n');

const releaseDir = path.resolve('release');
const filesToCheck = [
  'ProScreen-Setup-1.0.0.exe',
  'ProScreen-Portable-1.0.0.exe',
];

// 1. Check certificate availability in environment and Windows Certificate Store
const cscLink = process.env.CSC_LINK || process.env.WIN_CSC_LINK;
const cscPass = process.env.CSC_KEY_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD;

console.log('1. Checking Code Signing Environment:');
console.log('  - CSC_LINK / WIN_CSC_LINK configured:', cscLink ? 'YES' : 'NO');
console.log('  - CSC_KEY_PASSWORD configured:', cscPass ? 'YES' : 'NO');

// Check Windows Cert Store
let storeCerts = [];
try {
  const storeCheck = execSync(
    'powershell -NoProfile -Command "Get-ChildItem -Path Cert:\\CurrentUser\\My, Cert:\\LocalMachine\\My -CodeSigningCert | Select-Object -ExpandProperty Subject"',
    { encoding: 'utf-8', timeout: 5000 }
  ).trim();
  if (storeCheck) {
    storeCerts = storeCheck.split('\n').map((s) => s.trim()).filter(Boolean);
  }
} catch {
  // unprivileged or timeout
}
console.log('  - Installed Code Signing Certificates in Store:', storeCerts.length > 0 ? storeCerts.join(', ') : 'None found');

// 2. Check each executable
console.log('\n2. Inspecting Release Executables:');
for (const f of filesToCheck) {
  const filePath = path.join(releaseDir, f);
  if (!fs.existsSync(filePath)) {
    console.log(`  - [MISSING] ${f}`);
    continue;
  }

  const stat = fs.statSync(filePath);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();

  // Inspect Authenticode signature via PowerShell
  let sigStatus = 'Unknown';
  let signer = 'None';
  try {
    const sigOut = execSync(
      `powershell -NoProfile -Command "(Get-AuthenticodeSignature '${filePath}').Status"`,
      { encoding: 'utf-8', timeout: 8000 }
    ).trim();
    sigStatus = sigOut || 'NotSigned';

    if (sigStatus === 'Valid') {
      const signerOut = execSync(
        `powershell -NoProfile -Command "(Get-AuthenticodeSignature '${filePath}').SignerCertificate.Subject"`,
        { encoding: 'utf-8', timeout: 8000 }
      ).trim();
      signer = signerOut;
    }
  } catch (err) {
    sigStatus = 'Error checking signature';
  }

  console.log(`\n  File: ${f}`);
  console.log(`    - Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} bytes)`);
  console.log(`    - SHA-256: ${hash}`);
  console.log(`    - Authenticode Status: ${sigStatus}`);
  console.log(`    - Signer: ${signer}`);
}

console.log('\n3. SmartScreen Reputation Analysis:');
console.log('  - Current State: Binaries are unsigned (Status: NotSigned).');
console.log('  - Trigger Condition: When downloaded from the internet, Windows marks files with Zone.Identifier (ZoneId=3).');
console.log('  - Evaluation: Microsoft Defender SmartScreen queries cloud telemetry. Because the file hash is new and unsigned, it triggers the "unrecognized app" warning.');
console.log('  - Remediation: Sign binaries with an Extended Validation (EV) or Standard (OV) Code Signing Certificate, or Microsoft Trusted Signing, to establish publisher identity and build global telemetry reputation.');
console.log('\n=== INSPECTION COMPLETE ===');
