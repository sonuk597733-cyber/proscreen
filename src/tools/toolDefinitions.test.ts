import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPE_TOOLS, isShapeTool } from './toolDefinitions';
import { isDrawingTool, ToolType } from '../types/annotation';

test('SHAPES-1: Shape dropdown exposes exactly the eight supported signature shapes in order', () => {
  const expected: ToolType[] = ['line', 'arrow', 'rect', 'circle', 'triangle', 'diamond', 'star', 'heart'];
  assert.deepEqual(SHAPE_TOOLS.map(({ id }) => id), expected);
  assert.equal(SHAPE_TOOLS.length, 8);
  for (const shape of expected) {
    assert.equal(isShapeTool(shape), true, `${shape} must be a supported shape tool`);
    assert.equal(isDrawingTool(shape), true, `${shape} must enter drawing mode`);
  }
});

test('SHAPES-2: User-facing labels describe the requested shape choices', () => {
  assert.deepEqual(SHAPE_TOOLS.map(({ label }) => label), [
    'Line',
    'Arrow',
    'Rectangle / Square',
    'Circle',
    'Triangle',
    'Diamond',
    'Star',
    'Heart',
  ]);
});
