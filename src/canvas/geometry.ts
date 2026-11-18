import {
  AnnotationItem,
  Point,
  ShapeToolType,
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

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

function sampleCubicBezier(start: Point, c1: Point, c2: Point, end: Point, steps = 10): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    points.push({
      x: mt ** 3 * start.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * end.x,
      y: mt ** 3 * start.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * end.y,
    });
  }
  return points;
}

/** Return the editable outline points for the custom geometric shapes. */
export function getShapeOutlinePoints(shapeType: ShapeToolType, box: BoundingBox): Point[] | null {
  const { minX: x, minY: y, maxX, maxY } = box;
  const w = maxX - x;
  const h = maxY - y;
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (shapeType === 'triangle') {
    return [{ x: cx, y }, { x: maxX, y: maxY }, { x, y: maxY }];
  }
  if (shapeType === 'diamond') {
    return [{ x: cx, y }, { x: maxX, y: cy }, { x: cx, y: maxY }, { x, y: cy }];
  }
  if (shapeType === 'star') {
    const outer = Math.min(w, h) / 2;
    const inner = outer * 0.43;
    return Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? outer : inner;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
  }
  if (shapeType === 'heart') {
    const notch = { x: cx, y: y + h * 0.27 };
    const left = { x, y: y + h * 0.38 };
    const bottom = { x: cx, y: maxY };
    const right = { x: maxX, y: y + h * 0.38 };
    return [
      notch,
      ...sampleCubicBezier(notch, { x: cx - w * 0.27, y: y - h * 0.08 }, { x, y: y + h * 0.02 }, left),
      ...sampleCubicBezier(left, { x, y: y + h * 0.68 }, { x: cx - w * 0.22, y: y + h * 0.86 }, bottom),
      ...sampleCubicBezier(bottom, { x: cx + w * 0.22, y: y + h * 0.86 }, { x: maxX, y: y + h * 0.68 }, right),
      ...sampleCubicBezier(right, { x: maxX, y: y + h * 0.02 }, { x: cx + w * 0.27, y: y - h * 0.08 }, notch),
    ];
  }
  return null;
}

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
  const bounds = getAnnotationBoundingBox(shape);
  const { minX, maxX, minY, maxY } = bounds;

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
    const onOutline = Math.min(top, right, bottom, left) <= tol;
    const inside = point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    return onOutline || inside;
  }

  const outline = getShapeOutlinePoints(shape.shapeType, bounds);
  if (outline) {
    // Treat the closed outline's interior as a move target even when its visual fill is transparent.
    // Otherwise an unfilled heart/star/etc. can only be moved by grabbing a thin stroke perimeter.
    if (isPointInPolygon(point, outline)) return true;
    return outline.some((a, index) => distanceToSegment(point, a, outline[(index + 1) % outline.length]) <= tol);
  }

  // Circle or Ellipse perimeter check
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max(2, (maxX - minX) / 2);
  const ry = Math.max(2, (maxY - minY) / 2);
  const norm = Math.hypot((point.x - cx) / rx, (point.y - cy) / ry);
  const approxPixelDist = Math.abs(norm - 1) * Math.min(rx, ry);
  return norm <= 1 || approxPixelDist <= tol;
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y;
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
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
  const handles: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: 'nw', x: box.minX - pad, y: box.minY - pad },
    { handle: 'n', x: (box.minX + box.maxX) / 2, y: box.minY - pad },
    { handle: 'ne', x: box.maxX + pad, y: box.minY - pad },
    { handle: 'e', x: box.maxX + pad, y: (box.minY + box.maxY) / 2 },
    { handle: 'sw', x: box.minX - pad, y: box.maxY + pad },
    { handle: 's', x: (box.minX + box.maxX) / 2, y: box.maxY + pad },
    { handle: 'se', x: box.maxX + pad, y: box.maxY + pad },
    { handle: 'w', x: box.minX - pad, y: (box.minY + box.maxY) / 2 },
  ];
  const hit = handles
    .map((handle) => ({ ...handle, distance: distanceBetweenPoints(point, handle) }))
    .filter((handle) => handle.distance <= radius)
    .sort((a, b) => a.distance - b.distance)[0];
  return hit?.handle ?? null;
}

/** Calculate a safe box for an eight-handle resize. The 6px offset matches the visible handles. */
export function resizeBoundingBoxFromHandle(
  box: BoundingBox,
  handle: ResizeHandle,
  point: Point,
  preserveAspectRatio = false
): BoundingBox {
  const minimum = 16;
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');
  const pointerX = point.x + (west ? 6 : east ? -6 : 0);
  const pointerY = point.y + (north ? 6 : south ? -6 : 0);
  const width = Math.max(minimum, box.width);
  const height = Math.max(minimum, box.height);

  if (preserveAspectRatio) {
    const ratio = width / height;
    if ((west || east) && (north || south)) {
      const anchorX = west ? box.maxX : box.minX;
      const anchorY = north ? box.maxY : box.minY;
      const scale = Math.max(
        Math.abs(pointerX - anchorX) / width,
        Math.abs(pointerY - anchorY) / height,
        minimum / width,
        minimum / height
      );
      const nextWidth = width * scale;
      const nextHeight = height * scale;
      const minX = west ? anchorX - nextWidth : anchorX;
      const maxX = west ? anchorX : anchorX + nextWidth;
      const minY = north ? anchorY - nextHeight : anchorY;
      const maxY = north ? anchorY : anchorY + nextHeight;
      return { minX, minY, maxX, maxY, width: nextWidth, height: nextHeight };
    }

    if (west || east) {
      const anchorX = west ? box.maxX : box.minX;
      const nextWidth = Math.max(minimum, Math.abs(pointerX - anchorX));
      const nextHeight = nextWidth / ratio;
      const centerY = (box.minY + box.maxY) / 2;
      const minX = west ? anchorX - nextWidth : anchorX;
      const maxX = west ? anchorX : anchorX + nextWidth;
      const minY = centerY - nextHeight / 2;
      const maxY = centerY + nextHeight / 2;
      return { minX, minY, maxX, maxY, width: nextWidth, height: nextHeight };
    }

    const anchorY = north ? box.maxY : box.minY;
    const nextHeight = Math.max(minimum, Math.abs(pointerY - anchorY));
    const nextWidth = nextHeight * ratio;
    const centerX = (box.minX + box.maxX) / 2;
    const minX = centerX - nextWidth / 2;
    const maxX = centerX + nextWidth / 2;
    const minY = north ? anchorY - nextHeight : anchorY;
    const maxY = north ? anchorY : anchorY + nextHeight;
    return { minX, minY, maxX, maxY, width: nextWidth, height: nextHeight };
  }

  let minX = box.minX;
  let maxX = box.maxX;
  let minY = box.minY;
  let maxY = box.maxY;
  if (west) minX = Math.min(box.maxX - minimum, pointerX);
  else if (east) maxX = Math.max(box.minX + minimum, pointerX);
  if (north) minY = Math.min(box.maxY - minimum, pointerY);
  else if (south) maxY = Math.max(box.minY + minimum, pointerY);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
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
