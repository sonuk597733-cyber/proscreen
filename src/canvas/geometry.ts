import {
  AnnotationItem,
  Point,
  ShapeAnnotation,
  StrokeAnnotation,
  TextAnnotation,
} from '../types/annotation';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export function distanceBetweenPoints(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Distance from point p to finite line segment ab */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distanceBetweenPoints(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return distanceBetweenPoints(p, proj);
}

/** Midpoint quadratic smoothing to eliminate jagged cursor samples while keeping path fidelity */
export function simplifyAndSmoothPoints(points: Point[], minDistance = 1.5): Point[] {
  if (points.length <= 2) return points;
  const filtered: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = filtered[filtered.length - 1];
    if (distanceBetweenPoints(prev, points[i]) >= minDistance) {
      filtered.push(points[i]);
    }
  }
  filtered.push(points[points.length - 1]);
  return filtered;
}

export function snapAnglePoint(start: Point, current: Point, stepDeg = 15): Point {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return current;
  const angle = Math.atan2(dy, dx);
  const stepRad = (stepDeg * Math.PI) / 180;
  const snapped = Math.round(angle / stepRad) * stepRad;
  return {
    x: start.x + Math.cos(snapped) * dist,
    y: start.y + Math.sin(snapped) * dist,
  };
}

export function normalizeCircleEnd(start: Point, current: Point): Point {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + (dx >= 0 ? size : -size),
    y: start.y + (dy >= 0 ? size : -size),
  };
}

export function computeArrowHead(
  start: Point,
  end: Point,
  headLength: number,
  headAngleRad = Math.PI / 6
): { left: Point; right: Point } | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 2) return null;
  const angle = Math.atan2(dy, dx);
  const clampedLength = Math.min(headLength, len * 0.65);
  return {
    left: {
      x: end.x - clampedLength * Math.cos(angle - headAngleRad),
      y: end.y - clampedLength * Math.sin(angle - headAngleRad),
    },
    right: {
      x: end.x - clampedLength * Math.cos(angle + headAngleRad),
      y: end.y - clampedLength * Math.sin(angle + headAngleRad),
    },
  };
}

export function getTextBoundingBox(item: TextAnnotation): BoundingBox {
  const lines = item.text.split('\n');
  const maxChars = Math.max(1, ...lines.map((l) => l.length));
  const approxCharWidth = item.fontSize * 0.6;
  const width = Math.max(40, maxChars * approxCharWidth + 16);
  const height = Math.max(item.fontSize * 1.4, lines.length * item.fontSize * 1.35 + 12);
  return {
    minX: item.x,
    minY: item.y,
    maxX: item.x + width,
    maxY: item.y + height,
    width,
    height,
  };
}

export function getAnnotationBoundingBox(item: AnnotationItem): BoundingBox {
  if (item.category === 'text') {
    return getTextBoundingBox(item);
  }
  if (item.category === 'shape') {
    if (item.shapeType === 'freehand-shape' && item.points && item.points.length > 0) {
      let minX = item.points[0].x;
      let maxX = item.points[0].x;
      let minY = item.points[0].y;
      let maxY = item.points[0].y;
      for (const pt of item.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    const minX = Math.min(item.start.x, item.end.x);
    const maxX = Math.max(item.start.x, item.end.x);
    const minY = Math.min(item.start.y, item.end.y);
    const maxY = Math.max(item.start.y, item.end.y);
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  const pts = item.points;
  if (pts.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = pts[0].x;
  let maxX = pts[0].x;
  let minY = pts[0].y;
  let maxY = pts[0].y;
  for (const pt of pts) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function hitTestStroke(stroke: StrokeAnnotation, point: Point, radius: number): boolean {
  const tolerance = radius + stroke.thickness / 2;
  const pts = stroke.points;
  if (pts.length === 0) return false;
  if (pts.length === 1) {
    return distanceBetweenPoints(pts[0], point) <= tolerance;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (distanceToSegment(point, pts[i], pts[i + 1]) <= tolerance) {
      return true;
    }
  }
  return false;
}

export function hitTestShape(shape: ShapeAnnotation, point: Point, radius: number): boolean {
  const tol = radius + shape.thickness / 2;
  if (shape.shapeType === 'line' || shape.shapeType === 'arrow' || shape.shapeType === 'double-arrow') {
    return distanceToSegment(point, shape.start, shape.end) <= tol;
  }
  if (shape.shapeType === 'freehand-shape' && shape.points && shape.points.length > 0) {
    const pts = shape.points;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (distanceToSegment(point, a, b) <= tol) {
        return true;
      }
    }
    return false;
  }
  const minX = Math.min(shape.start.x, shape.end.x);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxY = Math.max(shape.start.y, shape.end.y);

  if (shape.shapeType === 'filled-rect') {
    return (
      point.x >= minX - tol &&
      point.x <= maxX + tol &&
      point.y >= minY - tol &&
      point.y <= maxY + tol
    );
  }

  if (shape.shapeType === 'rect') {
    const top = distanceToSegment(point, { x: minX, y: minY }, { x: maxX, y: minY });
    const right = distanceToSegment(point, { x: maxX, y: minY }, { x: maxX, y: maxY });
    const bottom = distanceToSegment(point, { x: maxX, y: maxY }, { x: minX, y: maxY });
    const left = distanceToSegment(point, { x: minX, y: maxY }, { x: minX, y: minY });
    return Math.min(top, right, bottom, left) <= tol;
  }

  // Circle or Ellipse perimeter check
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max(2, (maxX - minX) / 2);
  const ry = Math.max(2, (maxY - minY) / 2);
  const norm = Math.hypot((point.x - cx) / rx, (point.y - cy) / ry);
  const approxPixelDist = Math.abs(norm - 1) * Math.min(rx, ry);
  return approxPixelDist <= tol;
}

export function hitTestText(textItem: TextAnnotation, point: Point, radius: number): boolean {
  const box = getTextBoundingBox(textItem);
  return (
    point.x >= box.minX - radius &&
    point.x <= box.maxX + radius &&
    point.y >= box.minY - radius &&
    point.y <= box.maxY + radius
  );
}

export interface ScrollOffset {
  x: number;
  y: number;
}

export function clientToItemPoint(
  clientPt: Point,
  coordSpace: 'document' | 'viewport',
  scroll: ScrollOffset
): Point {
  if (coordSpace === 'document') {
    return {
      ...clientPt,
      x: clientPt.x + scroll.x,
      y: clientPt.y + scroll.y,
    };
  }
  return clientPt;
}

export function itemToViewportPoint(
  itemPt: Point,
  coordSpace: 'document' | 'viewport' | undefined,
  scroll: ScrollOffset
): Point {
  if (coordSpace === 'document') {
    return {
      ...itemPt,
      x: itemPt.x - scroll.x,
      y: itemPt.y - scroll.y,
    };
  }
  return itemPt;
}

export function itemBoxToViewportBox(
  box: BoundingBox,
  coordSpace: 'document' | 'viewport' | undefined,
  scroll: ScrollOffset
): BoundingBox {
  const dx = coordSpace === 'document' ? -scroll.x : 0;
  const dy = coordSpace === 'document' ? -scroll.y : 0;
  return {
    minX: box.minX + dx,
    minY: box.minY + dy,
    maxX: box.maxX + dx,
    maxY: box.maxY + dy,
    width: box.width,
    height: box.height,
  };
}

export function hitTestAnnotation(item: AnnotationItem, point: Point, eraserRadius: number): boolean {
  if (item.category === 'stroke') return hitTestStroke(item, point, eraserRadius);
  if (item.category === 'shape') return hitTestShape(item, point, eraserRadius);
  return hitTestText(item, point, eraserRadius);
}

export function hitTestAnnotationAtClientPoint(
  item: AnnotationItem,
  clientPoint: Point,
  eraserRadius: number,
  scroll: ScrollOffset
): boolean {
  const space = item.coordSpace ?? 'viewport';
  const targetPoint = clientToItemPoint(clientPoint, space, scroll);
  return hitTestAnnotation(item, targetPoint, eraserRadius);
}

export function hitTestTopAnnotationAtClientPoint(
  items: AnnotationItem[],
  clientPoint: Point,
  radius: number,
  scroll: ScrollOffset
): AnnotationItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    if (hitTestAnnotationAtClientPoint(items[i], clientPoint, radius, scroll)) {
      return items[i];
    }
  }
  return null;
}

export function getResizeHandleAtPoint(
  box: BoundingBox,
  point: Point,
  radius = 10
): ResizeHandle | null {
  const pad = 6;
  const corners: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: 'nw', x: box.minX - pad, y: box.minY - pad },
    { handle: 'ne', x: box.maxX + pad, y: box.minY - pad },
    { handle: 'sw', x: box.minX - pad, y: box.maxY + pad },
    { handle: 'se', x: box.maxX + pad, y: box.maxY + pad },
  ];
  for (const corner of corners) {
    if (distanceBetweenPoints(point, { x: corner.x, y: corner.y }) <= radius) {
      return corner.handle;
    }
  }
  return null;
}

export function translateAnnotationItem(
  item: AnnotationItem,
  dx: number,
  dy: number
): AnnotationItem {
  if (item.category === 'stroke') {
    return {
      ...item,
      points: item.points.map((pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy })),
    };
  }
  if (item.category === 'shape') {
    return {
      ...item,
      start: { x: item.start.x + dx, y: item.start.y + dy },
      end: { x: item.end.x + dx, y: item.end.y + dy },
      points: item.points?.map((pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy })),
    };
  }
  return {
    ...item,
    x: item.x + dx,
    y: item.y + dy,
  };
}

export function scaleAnnotationItem(
  item: AnnotationItem,
  fromBox: BoundingBox,
  toBox: BoundingBox
): AnnotationItem {
  const safeFromW = Math.max(8, fromBox.width);
  const safeFromH = Math.max(8, fromBox.height);
  const scaleX = Math.max(12, toBox.width) / safeFromW;
  const scaleY = Math.max(12, toBox.height) / safeFromH;

  const mapPt = (pt: Point): Point => ({
    ...pt,
    x: toBox.minX + (pt.x - fromBox.minX) * scaleX,
    y: toBox.minY + (pt.y - fromBox.minY) * scaleY,
  });

  if (item.category === 'stroke') {
    return {
      ...item,
      points: item.points.map(mapPt),
    };
  }
  if (item.category === 'shape') {
    return {
      ...item,
      start: mapPt(item.start),
      end: mapPt(item.end),
      points: item.points?.map(mapPt),
    };
  }
  const avgScale = (scaleX + scaleY) / 2;
  return {
    ...item,
    x: toBox.minX,
    y: toBox.minY,
    fontSize: Math.max(10, Math.min(96, Math.round(item.fontSize * avgScale))),
  };
}

export function computeFadeAlpha(
  item: AnnotationItem,
  nowMs: number
): number {
  if (!item.fadeDurationMs || item.fadeDurationMs <= 0) return 1;
  const elapsed = nowMs - item.createdAt;
  if (elapsed <= 0) return 1;
  if (elapsed >= item.fadeDurationMs) return 0;
  // Hold full opacity for first 45% of fade duration, then ease out smoothly
  const holdMs = item.fadeDurationMs * 0.45;
  if (elapsed <= holdMs) return 1;
  const decayProgress = (elapsed - holdMs) / (item.fadeDurationMs - holdMs);
  return Math.max(0, 1 - decayProgress * decayProgress);
}
