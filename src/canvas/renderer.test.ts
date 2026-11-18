import assert from 'node:assert/strict';
import test from 'node:test';
import { ShapeAnnotation } from '../types/annotation';
import { mergeActiveDraftItem } from './renderer';

const shape = (id: string, x: number): ShapeAnnotation => ({
  id,
  category: 'shape',
  shapeType: 'heart',
  start: { x, y: 10 },
  end: { x: x + 80, y: 90 },
  color: '#EF4444',
  thickness: 4,
  opacity: 1,
  fillOpacity: 0,
  createdAt: 1000,
});

test('RENDER-1: transformed draft replaces the stored shape during movement and resize', () => {
  const original = shape('heart-1', 10);
  const other = shape('heart-2', 200);
  const movedOrResized = { ...original, start: { x: 40, y: 35 }, end: { x: 160, y: 155 } };

  const rendered = mergeActiveDraftItem([original, other], movedOrResized);

  assert.equal(rendered.length, 2, 'the untransformed original is not rendered as a ghost');
  assert.deepEqual(rendered, [movedOrResized, other]);
});

test('RENDER-2: a new drawing draft is appended until it is committed', () => {
  const original = shape('heart-1', 10);
  const newDraft = shape('heart-draft', 120);

  assert.deepEqual(mergeActiveDraftItem([original], newDraft), [original, newDraft]);
  assert.deepEqual(mergeActiveDraftItem([original], null), [original]);
});
