import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import {
  computePrimaryWindowBounds,
  ensureDirectoryAndAppendLog,
  evaluateStartupWindowHealth,
  evaluateStudioStartupDecision,
  formatDesktopLogEntry,
  normalizeIsolationMode,
  resolveProductionChromiumSwitches,
  shouldLaunchFloatingToolbar,
  shouldLaunchMainStudioWindow,
  shouldLaunchOverlayWindow,
} from './startupLifecycle';
import type { DesktopDisplayInfo } from './desktopTypes';

test('formatDesktopLogEntry formats ISO timestamp, event, and JSON metadata cleanly', () => {
  const fixedDate = new Date('2026-11-16T12:00:00.000Z');
  const line = formatDesktopLogEntry('APP_LAUNCH', { pid: 4242, isPackaged: true }, fixedDate);
  assert.equal(
    line,
    '[2026-11-16T12:00:00.000Z] [APP_LAUNCH] {"pid":4242,"isPackaged":true}\n'
  );
});

test('ensureDirectoryAndAppendLog creates missing userData directory before appending', () => {
  const calls: string[] = [];
  const targetPath = path.join('/tmp', 'fresh-appdata', 'ProScreen', 'proscreen-desktop.log');

  const ok = ensureDirectoryAndAppendLog(targetPath, 'hello log\n', {
    mkdirSync: (dirPath, options) => {
      calls.push(`mkdir:${dirPath}:${Boolean(options?.recursive)}`);
    },
    appendFileSync: (filePath, data) => {
      calls.push(`append:${filePath}:${data}`);
    },
  });

  assert.equal(ok, true);
  assert.deepEqual(calls, [
    `mkdir:${path.dirname(targetPath)}:true`,
    `append:${targetPath}:hello log\n`,
  ]);
});

test('ensureDirectoryAndAppendLog returns false gracefully if filesystem write fails', () => {
  const ok = ensureDirectoryAndAppendLog('/readonly/proscreen-desktop.log', 'line\n', {
    mkdirSync: () => {
      throw new Error('EACCES');
    },
    appendFileSync: () => {},
  });
  assert.equal(ok, false);
});

test('shouldLaunchMainStudioWindow opens visible primary window on normal double-click launch', () => {
  assert.equal(shouldLaunchMainStudioWindow(['C:\\Programs\\ProScreen\\ProScreen.exe']), true);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe', '--some-chromium-flag']), true);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe', '--background']), false);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe', '--tray-only']), false);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe'], '0'), false);
});

test('normalizeIsolationMode and evaluateStudioStartupDecision recover safely from empty or unexpected values', () => {
  assert.equal(normalizeIsolationMode(undefined), '4');
  assert.equal(normalizeIsolationMode(''), '4');
  assert.equal(normalizeIsolationMode('  \n'), '4');
  assert.equal(normalizeIsolationMode('invalid'), '4');
  assert.equal(normalizeIsolationMode('1'), '1');

  const normal = evaluateStudioStartupDecision(['ProScreen.exe'], '');
  assert.deepEqual(normal, {
    shouldLaunch: true,
    normalizedIsolationMode: '4',
    reason: 'normal_launch',
  });
  assert.equal(shouldLaunchOverlayWindow(normal.normalizedIsolationMode), true);
  assert.equal(shouldLaunchFloatingToolbar(normal.normalizedIsolationMode), true);

  const background = evaluateStudioStartupDecision(['ProScreen.exe', '--background'], '4');
  assert.deepEqual(background, {
    shouldLaunch: false,
    normalizedIsolationMode: '4',
    reason: 'flag_background',
  });
});

test('computePrimaryWindowBounds centers window safely on primary display workArea', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 1,
      label: 'Primary',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1032 },
      scaleFactor: 1,
      isPrimary: true,
    },
    {
      id: 2,
      label: 'Left Secondary',
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: -1920, y: 0, width: 1920, height: 1032 },
      scaleFactor: 1,
      isPrimary: false,
    },
  ];

  const rect = computePrimaryWindowBounds(displays, 980, 680);
  assert.equal(rect.width, 980);
  assert.equal(rect.height, 680);
  assert.equal(rect.x, 470);
  assert.equal(rect.y, 176);
});

test('computePrimaryWindowBounds shrinks safely to fit compact or 125%-scaled screens', () => {
  const smallDisplay: DesktopDisplayInfo[] = [
    {
      id: 1,
      label: 'Compact Laptop',
      bounds: { x: 0, y: 0, width: 1024, height: 600 },
      workArea: { x: 0, y: 0, width: 1024, height: 560 },
      scaleFactor: 1.25,
      isPrimary: true,
    },
  ];

  const rect = computePrimaryWindowBounds(smallDisplay, 980, 680);
  assert.equal(rect.width, 980);
  assert.equal(rect.height, 520);
  assert.ok(rect.x >= 0);
  assert.ok(rect.y >= 0);
});

test('resolveProductionChromiumSwitches excludes unstable hardware overlay / zero-copy flags', () => {
  const switches = resolveProductionChromiumSwitches();
  const names = switches.map((s) => s.name);

  assert.equal(names.includes('enable-hardware-overlays'), false);
  assert.equal(names.includes('enable-zero-copy'), false);
  assert.equal(names.includes('enable-gpu-memory-buffer-video-frames'), false);
  assert.equal(names.includes('ignore-gpu-blocklist'), false);

  assert.equal(names.includes('disable-features'), true);
  assert.equal(names.includes('disable-background-timer-throttling'), true);
  assert.equal(names.includes('disable-renderer-backgrounding'), true);
});

test('evaluateStartupWindowHealth detects silent zero-window startup failure', () => {
  assert.equal(
    evaluateStartupWindowHealth({
      mainWindowCreated: false,
      toolbarWindowCreated: false,
      overlayWindowCreated: false,
    }).healthy,
    false
  );

  assert.equal(
    evaluateStartupWindowHealth({
      mainWindowCreated: true,
      toolbarWindowCreated: false,
      overlayWindowCreated: false,
    }).healthy,
    true
  );

  assert.equal(
    evaluateStartupWindowHealth({
      mainWindowCreated: false,
      toolbarWindowCreated: true,
      overlayWindowCreated: true,
    }).healthy,
    true
  );
});
