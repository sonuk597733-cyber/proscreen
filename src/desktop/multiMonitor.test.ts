import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVirtualBounds,
  clampToolbarToDisplays,
  findDisplayForPoint,
  globalToDisplayCoords,
} from './multiMonitor';
import { DesktopDisplayInfo } from './desktopTypes';

test('calculateVirtualBounds: single 1080p monitor', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 1,
      label: 'Primary Display',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1,
      isPrimary: true,
    },
  ];

  const virtual = calculateVirtualBounds(displays);
  assert.equal(virtual.x, 0);
  assert.equal(virtual.y, 0);
  assert.equal(virtual.width, 1920);
  assert.equal(virtual.height, 1080);
});

test('calculateVirtualBounds: dual monitor with left secondary (negative X)', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 2,
      label: 'Left Secondary Display',
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: -1920, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1,
      isPrimary: false,
    },
    {
      id: 1,
      label: 'Primary Display',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1,
      isPrimary: true,
    },
  ];

  const virtual = calculateVirtualBounds(displays);
  assert.equal(virtual.x, -1920, 'Virtual bounds should start at negative X');
  assert.equal(virtual.y, 0);
  assert.equal(virtual.width, 3840, 'Virtual width must span both displays');
  assert.equal(virtual.height, 1080);
});

test('calculateVirtualBounds: mixed resolution and orientation', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 1,
      label: 'Primary 4K',
      bounds: { x: 0, y: 0, width: 3840, height: 2160 },
      workArea: { x: 0, y: 0, width: 3840, height: 2112 },
      scaleFactor: 2,
      isPrimary: true,
    },
    {
      id: 2,
      label: 'Vertical Secondary',
      bounds: { x: 3840, y: -200, width: 1080, height: 1920 },
      workArea: { x: 3840, y: -200, width: 1080, height: 1920 },
      scaleFactor: 1,
      isPrimary: false,
    },
  ];

  const virtual = calculateVirtualBounds(displays);
  assert.equal(virtual.x, 0);
  assert.equal(virtual.y, -200, 'Virtual Y should account for upward offset secondary');
  assert.equal(virtual.width, 4920); // 3840 + 1080
  assert.equal(virtual.height, 2360); // 2160 - (-200)
});

test('findDisplayForPoint identifies correct display for coordinates', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 1,
      label: 'Primary',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1,
      isPrimary: true,
    },
    {
      id: 2,
      label: 'Right Secondary',
      bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: 1920, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1,
      isPrimary: false,
    },
  ];

  const disp1 = findDisplayForPoint(500, 500, displays);
  assert.equal(disp1?.id, 1);

  const disp2 = findDisplayForPoint(2100, 500, displays);
  assert.equal(disp2?.id, 2);
});

test('clampToolbarToDisplays prevents off-screen placement', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 1,
      label: 'Primary',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1,
      isPrimary: true,
    },
  ];

  // Try placing way off screen to the right
  const clamped = clampToolbarToDisplays(3000, 500, 50, 400, displays);
  assert.equal(clamped.x, 1920 - 50);
  assert.equal(clamped.y, 500);

  // Try placing off the bottom
  const clampedBottom = clampToolbarToDisplays(50, 2000, 50, 400, displays);
  assert.equal(clampedBottom.y, 1040 - 400);
});

test('globalToDisplayCoords translates coordinates accurately', () => {
  const display: DesktopDisplayInfo = {
    id: 2,
    label: 'Secondary',
    bounds: { x: 1920, y: 100, width: 1920, height: 1080 },
    workArea: { x: 1920, y: 100, width: 1920, height: 1080 },
    scaleFactor: 1,
    isPrimary: false,
  };

  const local = globalToDisplayCoords(2000, 150, display);
  assert.equal(local.x, 80);
  assert.equal(local.y, 50);
});
