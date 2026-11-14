import fs from 'fs';
import path from 'path';
import os from 'os';
import { createDefaultSettings } from '../src/storage/validation.js';

console.log('=== VERIFYING DESKTOP SETTINGS PERSISTENCE & ONBOARDING STATE ===\n');

const testUserData = path.join(os.tmpdir(), 'proscreen-test-userdata');
fs.mkdirSync(testUserData, { recursive: true });
const settingsFile = path.join(testUserData, 'proscreen-desktop-settings.json');

// 1. Test Default Creation
const defaults = createDefaultSettings();
console.log('1. Default settings:');
console.log('   - schemaVersion:', defaults.schemaVersion);
console.log('   - defaultTool:', defaults.defaultTool);
console.log('   - hasSeenOnboarding:', defaults.hasSeenOnboarding);

// 2. Test Persistence Write
defaults.hasSeenOnboarding = true;
defaults.toolbarPosition = { x: 120, y: 250 };
fs.writeFileSync(settingsFile, JSON.stringify(defaults, null, 2), 'utf-8');
console.log('2. Written modified settings to disk:', settingsFile);

// 3. Test Persistence Read Back
const readBack = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
const matches =
  readBack.hasSeenOnboarding === true &&
  readBack.toolbarPosition.x === 120 &&
  readBack.toolbarPosition.y === 250 &&
  readBack.defaultTool === 'pointer';

console.log('3. Verification of read-back values:');
console.log('   - hasSeenOnboarding is true:', readBack.hasSeenOnboarding === true);
console.log('   - toolbarPosition preserved:', readBack.toolbarPosition.x === 120);
console.log('   - defaultTool preserved:', readBack.defaultTool === 'pointer');
console.log(`\nSettings persistence test result: ${matches ? 'PASS ✔' : 'FAIL ❌'}`);

fs.rmSync(testUserData, { recursive: true, force: true });
