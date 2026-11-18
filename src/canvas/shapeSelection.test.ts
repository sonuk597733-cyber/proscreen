import test from 'node:test';
import assert from 'node:assert/strict';
import { isShapeDoubleClick } from './shapeSelection';

test('shape selection recognizes a second click on the same shape within tolerance', () => {
  assert.equal(
    isShapeDoubleClick('shape-1', { x: 11, y: 10 }, 1, {
      shapeId: 'shape-1',
      point: { x: 10, y: 10 },
      time: 1000,
    }, 1300),
    true
  );
});

test('shape selection ignores a different shape, a distant click, or an expired click', () => {
  const previous = { shapeId: 'shape-1', point: { x: 10, y: 10 }, time: 1000 };
  assert.equal(isShapeDoubleClick('shape-2', { x: 10, y: 10 }, 1, previous, 1200), false);
  assert.equal(isShapeDoubleClick('shape-1', { x: 30, y: 10 }, 1, previous, 1200), false);
  assert.equal(isShapeDoubleClick('shape-1', { x: 10, y: 10 }, 1, previous, 1501), false);
});

test('shape selection respects the browser click count even when event timing differs', () => {
  assert.equal(isShapeDoubleClick('shape-1', { x: 0, y: 0 }, 2, null, 10), true);
});
