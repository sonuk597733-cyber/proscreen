import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PEN_CURSOR,
  HIGHLIGHTER_CURSOR,
  ERASER_CURSOR,
  ARROW_CURSOR,
  SHAPE_CROSSHAIR_CURSOR,
  TEXT_CURSOR,
  SELECT_CURSOR,
  LASER_CURSOR,
  AREA_CROP_CURSOR,
  getHighContrastCursor,
} from './cursors';

const ALL_CURSORS = [
  { name: 'PEN_CURSOR', cursor: PEN_CURSOR, expectedHotspot: [2, 22] },
  { name: 'HIGHLIGHTER_CURSOR', cursor: HIGHLIGHTER_CURSOR, expectedHotspot: [3, 20] },
  { name: 'ERASER_CURSOR', cursor: ERASER_CURSOR, expectedHotspot: [4, 20] },
  { name: 'ARROW_CURSOR', cursor: ARROW_CURSOR, expectedHotspot: [2, 2] },
  { name: 'SHAPE_CROSSHAIR_CURSOR', cursor: SHAPE_CROSSHAIR_CURSOR, expectedHotspot: [12, 12] },
  { name: 'TEXT_CURSOR', cursor: TEXT_CURSOR, expectedHotspot: [8, 12] },
  { name: 'SELECT_CURSOR', cursor: SELECT_CURSOR, expectedHotspot: [12, 12] },
  { name: 'LASER_CURSOR', cursor: LASER_CURSOR, expectedHotspot: [8, 8] },
  { name: 'AREA_CROP_CURSOR', cursor: AREA_CROP_CURSOR, expectedHotspot: [12, 12] },
];

test('CURSOR-1: Every cursor is a valid CSS data URI SVG with appropriate fallback', () => {
  for (const { name, cursor } of ALL_CURSORS) {
    assert.ok(cursor.startsWith('url("data:image/svg+xml,'), `${name} must start with url("data:image/svg+xml,`);
    assert.ok(cursor.includes('%3C/svg%3E') || cursor.includes('</svg>'), `${name} must contain closing svg tag`);
    assert.ok(cursor.match(/\d+\s+\d+,\s*(crosshair|move|text|default)/), `${name} must have valid hotspot and fallback`);
  }
});

test('CURSOR-2: Dual-tone high-contrast styling contains both white fill and dark outline', () => {
  for (const { name, cursor } of ALL_CURSORS) {
    const hasWhite = cursor.includes('%23FFFFFF') || cursor.includes('%23ffffff') || cursor.includes('#FFFFFF') || cursor.includes('#ffffff');
    const hasDarkOutline = cursor.includes('%230F172A') || cursor.includes('%23000000') || cursor.includes('#0F172A') || cursor.includes('#000000');
    assert.ok(hasWhite, `${name} must include high-contrast white fill/stroke for dark backgrounds`);
    assert.ok(hasDarkOutline, `${name} must include dark outline (#0F172A or #000000) for light backgrounds`);
  }
});

test('CURSOR-3: Hotspot coordinates are exact and within bounds', () => {
  for (const { name, cursor, expectedHotspot } of ALL_CURSORS) {
    const match = cursor.match(/\)\s+(\d+)\s+(\d+),/);
    assert.ok(match, `${name} must have parsable hotspot coordinates`);
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    assert.equal(x, expectedHotspot[0], `${name} hotspot X mismatch`);
    assert.equal(y, expectedHotspot[1], `${name} hotspot Y mismatch`);
    assert.ok(x >= 0 && x <= 24, `${name} hotspot X must be between 0 and 24`);
    assert.ok(y >= 0 && y <= 24, `${name} hotspot Y must be between 0 and 24`);
  }
});

test('CURSOR-4: getHighContrastCursor maps all drawing & annotation tools cleanly', () => {
  // Pass-through / Pointer mode
  assert.equal(getHighContrastCursor('pen', true), 'default');
  assert.equal(getHighContrastCursor('pointer', false), 'default');
  assert.equal(getHighContrastCursor('cursor', false), 'default');

  // Drawing Tools
  assert.equal(getHighContrastCursor('pen', false), PEN_CURSOR);
  assert.equal(getHighContrastCursor('highlighter', false), HIGHLIGHTER_CURSOR);
  assert.equal(getHighContrastCursor('eraser', false), ERASER_CURSOR);
  assert.equal(getHighContrastCursor('arrow', false), ARROW_CURSOR);
  assert.equal(getHighContrastCursor('double-arrow', false), ARROW_CURSOR);
  assert.equal(getHighContrastCursor('text', false), TEXT_CURSOR);
  assert.equal(getHighContrastCursor('select', false), SELECT_CURSOR);
  assert.equal(getHighContrastCursor('laser', false), LASER_CURSOR);
  assert.equal(getHighContrastCursor('capture-area', false), AREA_CROP_CURSOR);
  assert.equal(getHighContrastCursor('crop', false), AREA_CROP_CURSOR);

  // Shape Tools all map to high-contrast precision crosshair
  const shapeTools = ['line', 'rect', 'circle', 'ellipse', 'filled-rect', 'freehand-shape'];
  for (const tool of shapeTools) {
    assert.equal(getHighContrastCursor(tool, false), SHAPE_CROSSHAIR_CURSOR, `Tool ${tool} must use SHAPE_CROSSHAIR_CURSOR`);
  }
});
