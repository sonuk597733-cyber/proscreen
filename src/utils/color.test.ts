import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESET_COLORS,
  hexToRgb,
  hexToRgbaString,
  normalizeHex,
  pushRecentColor,
  rgbToHex,
  toggleFavoriteColor,
} from './color';

test('includes at least 24 preset colors with valid hex codes', () => {
  assert.ok(PRESET_COLORS.length >= 24);
  for (const preset of PRESET_COLORS) {
    assert.ok(normalizeHex(preset.hex) !== null, `Invalid hex: ${preset.hex}`);
  }
});

test('HEX and RGB conversion roundtrips accurately', () => {
  assert.equal(normalizeHex('3b82f6'), '#3B82F6');
  assert.equal(normalizeHex('#abc'), '#AABBCC');
  assert.equal(normalizeHex('invalid'), null);
  assert.deepEqual(hexToRgb('#2563EB'), { r: 37, g: 99, b: 235 });
  assert.equal(rgbToHex(37, 99, 235), '#2563EB');
  assert.equal(hexToRgbaString('#EF4444', 0.5), 'rgba(239, 68, 68, 0.5)');
});

test('recent and favorite colors deduplicate and cap properly', () => {
  let recents = ['#111111', '#222222'];
  recents = pushRecentColor(recents, '#222222');
  assert.deepEqual(recents, ['#222222', '#111111']);

  let favs = ['#2563EB'];
  favs = toggleFavoriteColor(favs, '#EF4444');
  assert.deepEqual(favs, ['#EF4444', '#2563EB']);
  favs = toggleFavoriteColor(favs, '#ef4444');
  assert.deepEqual(favs, ['#2563EB']);
});
