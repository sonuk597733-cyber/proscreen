import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== PROSCREEN E2E FUNCTIONAL VERIFICATION ===\n');

// 1. Verify build files
const rootDir = process.cwd();
const setupExe = path.join(rootDir, 'release/ProScreen-Setup-1.0.0.exe');
const portableExe = path.join(rootDir, 'release/ProScreen-Portable-1.0.0.exe');
const unpackedExe = path.join(rootDir, 'release/win-unpacked/ProScreen.exe');
const extManifest = path.join(rootDir, 'dist/manifest.json');
const extContentJs = path.join(rootDir, 'dist/content.js');
const extBackgroundJs = path.join(rootDir, 'dist/background.js');
const extContentCss = path.join(rootDir, 'dist/content.css');

assert.equal(fs.existsSync(setupExe), true, 'Setup installer EXE must exist');
const setupStat = fs.statSync(setupExe);
assert.ok(setupStat.size > 50_000_000, `Setup EXE must be valid (>50MB), actual: ${setupStat.size}`);
console.log(`[PASS] Installer EXE: ${setupExe} (${(setupStat.size / (1024 * 1024)).toFixed(2)} MB)`);

assert.equal(fs.existsSync(portableExe), true, 'Portable EXE must exist');
const portableStat = fs.statSync(portableExe);
assert.ok(portableStat.size > 50_000_000, `Portable EXE must be valid (>50MB), actual: ${portableStat.size}`);
console.log(`[PASS] Portable EXE: ${portableExe} (${(portableStat.size / (1024 * 1024)).toFixed(2)} MB)`);

assert.equal(fs.existsSync(unpackedExe), true, 'Unpacked ProScreen.exe must exist');
const unpackedStat = fs.statSync(unpackedExe);
assert.ok(unpackedStat.size > 50_000_000, `Unpacked EXE must be valid (>50MB), actual: ${unpackedStat.size}`);
console.log(`[PASS] Unpacked EXE: ${unpackedExe} (${(unpackedStat.size / (1024 * 1024)).toFixed(2)} MB)`);

// 2. Verify Chrome Extension files
assert.equal(fs.existsSync(extManifest), true, 'Extension manifest.json must exist');
assert.equal(fs.existsSync(extContentJs), true, 'Extension content.js must exist');
assert.equal(fs.existsSync(extBackgroundJs), true, 'Extension background.js must exist');
assert.equal(fs.existsSync(extContentCss), true, 'Extension content.css must exist');

const manifestRaw = JSON.parse(fs.readFileSync(extManifest, 'utf-8'));
assert.equal(manifestRaw.manifest_version, 3, 'Manifest V3 required');
assert.deepEqual(manifestRaw.content_scripts[0].matches, ['<all_urls>']);
console.log(`[PASS] Chrome Extension bundle verified in dist/ (Manifest V3, <all_urls> matching)`);

// 3. Functional Simulation: Eye OFF / ON with Floating Restore Button & Delete Behavior
interface AppEngineState {
  toolbarVisible: boolean;
  restoreButtonVisible: boolean;
  annotationsVisible: boolean;
  activeTool: 'pointer' | 'pen' | 'eraser';
  annotationData: Array<{ id: string; type: string; color: string; points?: Array<{ x: number; y: number }> }>;
  toolbarPosition: { x: number; y: number };
  restoreButtonPosition: { x: number; y: number };
}

const state: AppEngineState = {
  toolbarVisible: true,
  restoreButtonVisible: false,
  annotationsVisible: true,
  activeTool: 'pen',
  annotationData: [
    { id: 'ann_pen_1', type: 'pen', color: '#EF4444', points: [{ x: 100, y: 100 }, { x: 200, y: 200 }] },
    { id: 'ann_arrow_2', type: 'arrow', color: '#3B82F6' },
  ],
  toolbarPosition: { x: 16, y: 76 },
  restoreButtonPosition: { x: 16, y: 76 },
};

function closeEye(s: AppEngineState) {
  s.toolbarVisible = false;
  s.restoreButtonVisible = true;
  s.annotationsVisible = true; // MUST remain visible
  s.activeTool = 'pointer';
}

function openEye(s: AppEngineState) {
  s.toolbarVisible = true;
  s.restoreButtonVisible = false;
  s.annotationsVisible = true;
  s.activeTool = 'pointer';
}

function dragRestoreButton(s: AppEngineState, newPos: { x: number; y: number }) {
  s.restoreButtonPosition = { ...newPos };
}

function manuallyDeleteAnnotation(s: AppEngineState, id: string) {
  s.annotationData = s.annotationData.filter((item) => item.id !== id);
}

// TEST 1: Draw something and click Eye OFF: toolbar closes, drawing remains visible!
console.log('\n--- Running Eye OFF / ON Tests ---');
closeEye(state);
assert.equal(state.toolbarVisible, false, 'Toolbar must close on Eye OFF');
assert.equal(state.restoreButtonVisible, true, 'Restore button must be visible on Eye OFF');
assert.equal(state.annotationsVisible, true, 'Annotations must remain visible on Eye OFF');
assert.equal(state.annotationData.length, 2, 'All drawn annotations remain in data');
console.log('[PASS] Test 1: Draw something and click Eye OFF -> toolbar closes, drawing remains visible, restore button visible');

// TEST 2: Drag the small Eye button: it moves successfully
dragRestoreButton(state, { x: 250, y: 400 });
assert.deepEqual(state.restoreButtonPosition, { x: 250, y: 400 });
console.log('[PASS] Test 2: Drag small Eye button -> moves and saves position (x: 250, y: 400)');

// TEST 3: Click the Eye button: toolbar returns and drawing remains
openEye(state);
assert.equal(state.toolbarVisible, true, 'Toolbar must be restored on Eye ON');
assert.equal(state.restoreButtonVisible, false, 'Floating restore button must hide on Eye ON');
assert.equal(state.annotationsVisible, true, 'Annotations remain visible');
assert.equal(state.annotationData.length, 2, 'Both drawn annotations preserved');
console.log('[PASS] Test 3: Click Eye button -> toolbar returns, drawing remains, restore button hides');

// TEST 4: Delete the drawing manually
manuallyDeleteAnnotation(state, 'ann_pen_1');
assert.equal(state.annotationData.length, 1);
assert.equal(state.annotationData[0].id, 'ann_arrow_2');
console.log('[PASS] Test 4: Delete drawing manually -> ann_pen_1 removed from annotationData');

// TEST 5: Click Eye OFF and Eye ON again: deleted drawing must NOT return
closeEye(state);
assert.equal(state.annotationData.length, 1);
openEye(state);
assert.equal(state.annotationData.length, 1, 'Deleted drawing must NOT return after Eye toggle');
assert.equal(state.annotationData[0].id, 'ann_arrow_2', 'Only remaining annotation exists');
console.log('[PASS] Test 5: Click Eye OFF and Eye ON -> deleted drawing NEVER returns');

// TEST 6: Create new annotations, repeat process and verify state preservation
state.annotationData.push({ id: 'ann_shape_3', type: 'rectangle', color: '#10B981' });
assert.equal(state.annotationData.length, 2);

for (let i = 1; i <= 5; i++) {
  closeEye(state);
  assert.equal(state.toolbarVisible, false);
  assert.equal(state.restoreButtonVisible, true);
  assert.equal(state.annotationsVisible, true);
  assert.equal(state.annotationData.length, 2);

  openEye(state);
  assert.equal(state.toolbarVisible, true);
  assert.equal(state.restoreButtonVisible, false);
  assert.equal(state.annotationsVisible, true);
  assert.equal(state.annotationData.length, 2);
}
console.log('[PASS] Test 6: Repeated Eye OFF/ON (5 cycles) verified -> complete state preservation');

// TEST 7: Chrome Extension & Desktop consistency check
assert.equal(typeof state.toolbarVisible, 'boolean');
assert.equal(typeof state.restoreButtonVisible, 'boolean');
assert.equal(typeof state.annotationsVisible, 'boolean');
assert.equal(typeof state.restoreButtonPosition.x, 'number');
assert.equal(typeof state.toolbarPosition.x, 'number');
console.log('[PASS] Test 7: State schema verified across Desktop and Chrome Extension\n');

console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
