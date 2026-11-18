import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clientToItemPoint,
  computeArrowHead,
  computeFadeAlpha,
  distanceToSegment,
  getAnnotationBoundingBox,
  getShapeOutlinePoints,
  getResizeHandleAtPoint,
  hitTestAnnotation,
  hitTestAnnotationAtClientPoint,
  itemToViewportPoint,
  normalizeCircleEnd,
  resizeBoundingBoxFromHandle,
  scaleAnnotationItem,
  snapAnglePoint,
  translateAnnotationItem,
} from './geometry';
import { ShapeAnnotation, StrokeAnnotation, TextAnnotation } from '../types/annotation';

test('distanceToSegment computes perpendicular distance accurately', () => {
  const dist = distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert.equal(dist, 3);
});

test('hitTestAnnotation detects strokes, shapes, double-arrows, freehand-shapes, and text accurately', () => {
  const stroke: StrokeAnnotation = {
    id: 's1',
    category: 'stroke',
    tool: 'pen',
    points: [
      { x: 10, y: 10 },
      { x: 100, y: 10 },
    ],
    color: '#2563EB',
    thickness: 4,
    opacity: 1,
    createdAt: 1000,
  };
  assert.equal(hitTestAnnotation(stroke, { x: 50, y: 14 }, 6), true);
  assert.equal(hitTestAnnotation(stroke, { x: 50, y: 40 }, 6), false);

  const rect: ShapeAnnotation = {
    id: 'sh1',
    category: 'shape',
    shapeType: 'rect',
    start: { x: 20, y: 20 },
    end: { x: 120, y: 80 },
    color: '#EF4444',
    thickness: 3,
    opacity: 1,
    createdAt: 1000,
  };
  assert.equal(hitTestAnnotation(rect, { x: 20, y: 50 }, 6), true);
  assert.equal(hitTestAnnotation(rect, { x: 70, y: 50 }, 4), true);

  const doubleArrow: ShapeAnnotation = {
    id: 'da1',
    category: 'shape',
    shapeType: 'double-arrow',
    start: { x: 10, y: 50 },
    end: { x: 110, y: 50 },
    color: '#EF4444',
    thickness: 3,
    opacity: 1,
    createdAt: 1000,
  };
  assert.equal(hitTestAnnotation(doubleArrow, { x: 60, y: 52 }, 6), true);
  assert.equal(hitTestAnnotation(doubleArrow, { x: 60, y: 80 }, 6), false);

  const freehandShape: ShapeAnnotation = {
    id: 'fs1',
    category: 'shape',
    shapeType: 'freehand-shape',
    start: { x: 10, y: 10 },
    end: { x: 90, y: 90 },
    points: [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
    ],
    color: '#10B981',
    thickness: 3,
    opacity: 1,
    createdAt: 1000,
  };
  assert.equal(hitTestAnnotation(freehandShape, { x: 50, y: 10 }, 6), true);

  const text: TextAnnotation = {
    id: 't1',
    category: 'text',
    x: 40,
    y: 40,
    text: 'Hello ProScreen',
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 20,
    bold: false,
    italic: false,
    color: '#0F172A',
    backgroundColor: 'transparent',
    createdAt: 1000,
  };
  assert.equal(hitTestAnnotation(text, { x: 60, y: 50 }, 4), true);
  assert.equal(hitTestAnnotation(text, { x: 300, y: 300 }, 4), false);
});

test('computeArrowHead returns symmetrical wings', () => {
  const head = computeArrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 16);
  assert.ok(head !== null);
  assert.ok(head.left.x < 100 && head.right.x < 100);
  assert.equal(Math.round(head.left.y + head.right.y), 0);
});

test('normalizeCircleEnd keeps 1:1 aspect ratio and snapAnglePoint snaps to 45 deg', () => {
  const end = normalizeCircleEnd({ x: 10, y: 10 }, { x: 60, y: 30 });
  assert.deepEqual(end, { x: 60, y: 60 });

  const snapped = snapAnglePoint({ x: 0, y: 0 }, { x: 100, y: 4 }, 15);
  assert.equal(Math.round(snapped.y), 0);
});

test('computeFadeAlpha decays from 1 to 0 after fadeDurationMs', () => {
  const item: StrokeAnnotation = {
    id: 'f1',
    category: 'stroke',
    tool: 'pen',
    points: [{ x: 0, y: 0 }],
    color: '#EF4444',
    thickness: 4,
    opacity: 1,
    createdAt: 1000,
    fadeDurationMs: 2000,
  };
  assert.equal(computeFadeAlpha(item, 1500), 1);
  assert.ok(computeFadeAlpha(item, 2500) < 1 && computeFadeAlpha(item, 2500) > 0);
  assert.equal(computeFadeAlpha(item, 3000), 0);
});

test('scroll coordinate mapping and hit testing work for document vs viewport spaces', () => {
  const scroll = { x: 0, y: 400 };
  const docPt = clientToItemPoint({ x: 150, y: 200 }, 'document', scroll);
  assert.deepEqual(docPt, { x: 150, y: 600 });

  const backToView = itemToViewportPoint(docPt, 'document', scroll);
  assert.deepEqual(backToView, { x: 150, y: 200 });

  const vpPt = clientToItemPoint({ x: 150, y: 200 }, 'viewport', scroll);
  assert.deepEqual(vpPt, { x: 150, y: 200 });

  const docStroke: StrokeAnnotation = {
    id: 'doc1',
    category: 'stroke',
    coordSpace: 'document',
    tool: 'pen',
    points: [
      { x: 100, y: 600 },
      { x: 250, y: 600 },
    ],
    color: '#2563EB',
    thickness: 4,
    opacity: 1,
    createdAt: 1000,
  };
  // At scrollY=400, document y=600 renders at viewport clientY=200
  assert.equal(hitTestAnnotationAtClientPoint(docStroke, { x: 175, y: 200 }, 8, scroll), true);
  assert.equal(hitTestAnnotationAtClientPoint(docStroke, { x: 175, y: 600 }, 8, scroll), false);
});

test('translate, scale, and corner resize handles work accurately on annotations', () => {
  const rect: ShapeAnnotation = {
    id: 'r1',
    category: 'shape',
    shapeType: 'rect',
    start: { x: 10, y: 20 },
    end: { x: 110, y: 70 },
    color: '#2563EB',
    thickness: 3,
    opacity: 1,
    createdAt: 1000,
  };

  const moved = translateAnnotationItem(rect, 30, 15) as ShapeAnnotation;
  assert.deepEqual(moved.start, { x: 40, y: 35 });
  assert.deepEqual(moved.end, { x: 140, y: 85 });

  const fromBox = getAnnotationBoundingBox(rect);
  assert.equal(getResizeHandleAtPoint(fromBox, { x: 116, y: 76 }, 10), 'se');

  const scaled = scaleAnnotationItem(rect, fromBox, {
    minX: 10,
    minY: 20,
    maxX: 210,
    maxY: 120,
    width: 200,
    height: 100,
  }) as ShapeAnnotation;
  assert.deepEqual(scaled.start, { x: 10, y: 20 });
  assert.deepEqual(scaled.end, { x: 210, y: 120 });
});

test('SHAPES-3: Triangle, diamond, star, and heart outlines are selectable at their perimeter', () => {
  const box = { minX: 10, minY: 20, maxX: 110, maxY: 120, width: 100, height: 100 };
  const shapeTypes = ['triangle', 'diamond', 'star', 'heart'] as const;
  for (const shapeType of shapeTypes) {
    const outline = getShapeOutlinePoints(shapeType, box);
    assert.ok(outline && outline.length >= 3, `${shapeType} has a render/hit-test outline`);
    const shape: ShapeAnnotation = {
      id: `shape-${shapeType}`,
      category: 'shape',
      shapeType,
      start: { x: box.minX, y: box.minY },
      end: { x: box.maxX, y: box.maxY },
      color: '#2563EB',
      thickness: 3,
      opacity: 1,
      createdAt: 1000,
    };
    assert.equal(hitTestAnnotation(shape, outline![0], 1), true, `${shapeType} perimeter is selectable`);
  }
});

test('SHAPES-5: Double-click and move hit testing accepts the interior of all closed shape tools', () => {
  const shapeTypes = ['rect', 'circle', 'triangle', 'diamond', 'star', 'heart'] as const;
  for (const shapeType of shapeTypes) {
    const shape: ShapeAnnotation = {
      id: `inside-${shapeType}`,
      category: 'shape',
      shapeType,
      start: { x: 10, y: 20 },
      end: { x: 110, y: 120 },
      color: '#2563EB',
      thickness: 4,
      opacity: 1,
      fillOpacity: 0,
      createdAt: 1000,
    };
    assert.equal(
      hitTestAnnotation(shape, { x: 60, y: 70 }, 0),
      true,
      `${shapeType} interior remains a selection and move target without visual fill`
    );
  }
});

test('SHAPES-6: Line and arrow remain hittable along their drawn segments', () => {
  for (const shapeType of ['line', 'arrow'] as const) {
    const shape: ShapeAnnotation = {
      id: `segment-${shapeType}`,
      category: 'shape',
      shapeType,
      start: { x: 10, y: 20 },
      end: { x: 110, y: 120 },
      color: '#2563EB',
      thickness: 4,
      opacity: 1,
      createdAt: 1000,
    };
    assert.equal(
      hitTestAnnotation(shape, { x: 60, y: 70 }, 4),
      true,
      `${shapeType} can be selected from its segment`
    );
  }
});

test('SHAPES-4: Selection exposes eight resize handles and preserves custom-shape proportions', () => {
  const box = { minX: 10, minY: 20, maxX: 110, maxY: 70, width: 100, height: 50 };
  const handles = [
    ['nw', { x: 4, y: 14 }],
    ['n', { x: 60, y: 14 }],
    ['ne', { x: 116, y: 14 }],
    ['e', { x: 116, y: 45 }],
    ['se', { x: 116, y: 76 }],
    ['s', { x: 60, y: 76 }],
    ['sw', { x: 4, y: 76 }],
    ['w', { x: 4, y: 45 }],
  ] as const;
  for (const [expected, point] of handles) {
    assert.equal(getResizeHandleAtPoint(box, point, 3), expected);
  }

  const square = { minX: 10, minY: 20, maxX: 110, maxY: 120, width: 100, height: 100 };
  const resized = resizeBoundingBoxFromHandle(square, 'se', { x: 166, y: 176 }, true);
  assert.equal(resized.width, resized.height);
  assert.equal(resized.minX, square.minX);
  assert.equal(resized.minY, square.minY);

  const sideResized = resizeBoundingBoxFromHandle(square, 'e', { x: 146, y: 70 }, true);
  assert.equal(sideResized.width, sideResized.height);
  assert.equal((sideResized.minY + sideResized.maxY) / 2, 70);
});
