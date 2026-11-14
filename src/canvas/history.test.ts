import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAnnotationItem,
  canRedo,
  canUndo,
  clearAllAnnotations,
  createHistoryState,
  pruneExpiredItems,
  redoHistory,
  removeAnnotationItems,
  undoHistory,
} from './history';
import { ShapeAnnotation, StrokeAnnotation } from '../types/annotation';

const sampleStroke = (id: string, fadeDurationMs?: number): StrokeAnnotation => ({
  id,
  category: 'stroke',
  tool: 'pen',
  points: [
    { x: 0, y: 0 },
    { x: 20, y: 20 },
  ],
  color: '#2563EB',
  thickness: 4,
  opacity: 1,
  createdAt: 1000,
  fadeDurationMs: fadeDurationMs ?? null,
});

const sampleShape = (id: string): ShapeAnnotation => ({
  id,
  category: 'shape',
  shapeType: 'rect',
  start: { x: 10, y: 10 },
  end: { x: 50, y: 50 },
  color: '#EF4444',
  thickness: 3,
  opacity: 1,
  createdAt: 2000,
});

test('chronological undo and redo work without losing unrelated items', () => {
  let state = createHistoryState();
  state = addAnnotationItem(state, sampleStroke('s1'));
  state = addAnnotationItem(state, sampleShape('sh1'));
  assert.equal(state.items.length, 2);

  state = undoHistory(state, 'all');
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].id, 's1');
  assert.equal(canRedo(state, 'all'), true);

  state = redoHistory(state, 'all');
  assert.equal(state.items.length, 2);
});

test('separate stroke and shape undo/redo scopes operate independently', () => {
  let state = createHistoryState();
  state = addAnnotationItem(state, sampleStroke('s1'));
  state = addAnnotationItem(state, sampleShape('sh1'));
  state = addAnnotationItem(state, sampleStroke('s2'));

  // Undo only the last shape, leaving strokes s1 and s2 intact
  state = undoHistory(state, 'shape');
  assert.deepEqual(
    state.items.map((i) => i.id),
    ['s1', 's2']
  );
  assert.equal(canUndo(state, 'shape'), false);
  assert.equal(canUndo(state, 'stroke'), true);

  // Redo shape brings sh1 back
  state = redoHistory(state, 'shape');
  assert.equal(state.items.length, 3);
  assert.ok(state.items.some((i) => i.id === 'sh1'));
});

test('clearAllAnnotations is undoable and removeAnnotationItems restores deleted items on undo', () => {
  let state = createHistoryState();
  state = addAnnotationItem(state, sampleStroke('s1'));
  state = addAnnotationItem(state, sampleShape('sh1'));
  state = removeAnnotationItems(state, ['s1']);
  assert.equal(state.items.length, 1);

  state = undoHistory(state, 'all');
  assert.equal(state.items.length, 2);

  state = clearAllAnnotations(state);
  assert.equal(state.items.length, 0);
  state = undoHistory(state, 'all');
  assert.equal(state.items.length, 2);
});

test('pruneExpiredItems removes expired fading ink items cleanly', () => {
  let state = createHistoryState();
  state = addAnnotationItem(state, sampleStroke('fade1', 1500));
  state = addAnnotationItem(state, sampleStroke('perm1'));
  state = pruneExpiredItems(state, 3000);
  assert.deepEqual(
    state.items.map((i) => i.id),
    ['perm1']
  );
});
