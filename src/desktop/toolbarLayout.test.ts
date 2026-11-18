import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESKTOP_TOOLBAR_MAX_HEIGHT,
  DESKTOP_TOOLBAR_MIN_HEIGHT,
  DESKTOP_TOOLBAR_WIDTH,
  getDesktopToolbarHeight,
} from './toolbarLayout';

test('TOOLBAR-1: Expanded toolbar uses the larger readable height on standard desktop displays', () => {
  assert.equal(DESKTOP_TOOLBAR_WIDTH, 44);
  assert.equal(getDesktopToolbarHeight(1040), DESKTOP_TOOLBAR_MAX_HEIGHT);
  assert.equal(getDesktopToolbarHeight(728), DESKTOP_TOOLBAR_MAX_HEIGHT);
});

test('TOOLBAR-2: Expanded toolbar adapts to shorter work areas without going off-screen', () => {
  assert.equal(getDesktopToolbarHeight(600), 592);
  assert.equal(getDesktopToolbarHeight(40), DESKTOP_TOOLBAR_MIN_HEIGHT);
  assert.equal(getDesktopToolbarHeight(Number.NaN), DESKTOP_TOOLBAR_MAX_HEIGHT);
});

test('TOOLBAR-3: Standard 1920×1080, 1600×900, and 1366×768 displays retain the full primary-control height', () => {
  const layouts = [
    { width: 1920, height: 1080, workAreaHeight: 1040 },
    { width: 1600, height: 900, workAreaHeight: 860 },
    { width: 1366, height: 768, workAreaHeight: 728 },
  ];

  for (const layout of layouts) {
    const toolbarHeight = getDesktopToolbarHeight(layout.workAreaHeight);
    assert.equal(toolbarHeight, DESKTOP_TOOLBAR_MAX_HEIGHT, `${layout.width}×${layout.height}`);
    assert.ok(toolbarHeight <= layout.workAreaHeight - 8, `${layout.width}×${layout.height} stays within work area`);
  }
});
