import {
  AnnotationItem,
  BoardMode,
  LaserPoint,
  Point,
  ShapeAnnotation,
  StrokeAnnotation,
  TextAnnotation,
} from '../types/annotation';
import { hexToRgbaString } from '../utils/color';
import {
  computeArrowHead,
  computeFadeAlpha,
  getAnnotationBoundingBox,
  itemBoxToViewportBox,
} from './geometry';

export interface RenderOptions {
  nowMs: number;
  boardMode: BoardMode;
  annotationsVisible: boolean;
  scroll?: { x: number; y: number };
  activeDraftItem?: AnnotationItem | null;
  selectedItemId?: string | null;
  laserTrail?: LaserPoint[];
  laserColor?: string;
  laserSize?: number;
  laserTrailEnabled?: boolean;
  laserActive?: boolean;
  pointerPos?: Point;
  cursorSpotlight?: {
    enabled: boolean;
    x: number;
    y: number;
    radius: number;
    dimOpacity: number;
  };
  cursorHighlight?: {
    enabled: boolean;
    x: number;
    y: number;
    color: string;
  };
  /** When rendering for screenshot export, also draw text items onto the 2D canvas */
  includeTextOnCanvas?: boolean;
}

function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeAnnotation,
  alphaScale: number,
  boardMode: BoardMode
): void {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.save();
  const effectiveAlpha = Math.max(0, Math.min(1, stroke.opacity * alphaScale));

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = boardMode === 'blackboard' ? 'screen' : 'multiply';
    ctx.lineCap = stroke.highlighterStyle === 'chisel' ? 'square' : 'round';
    ctx.lineJoin = stroke.highlighterStyle === 'chisel' ? 'miter' : 'round';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = stroke.penStyle === 'calligraphy' ? 'butt' : 'round';
    ctx.lineJoin = 'round';
    if (stroke.penStyle === 'dashed') {
      ctx.setLineDash([stroke.thickness * 2.2, stroke.thickness * 1.6]);
    }
  }

  ctx.strokeStyle = hexToRgbaString(stroke.color, effectiveAlpha);
  ctx.fillStyle = hexToRgbaString(stroke.color, effectiveAlpha);

  if (pts.length === 1) {
    const r = Math.max(1, (stroke.thickness * (pts[0].pressure ?? 0.7)) / 2);
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Calligraphy nib effect: modulate segment width by stroke tangent angle
  if (stroke.tool === 'pen' && stroke.penStyle === 'calligraphy') {
    const nibAngle = -Math.PI / 4;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segAngle = Math.atan2(b.y - a.y, b.x - a.x);
      const nibFactor = 0.35 + 0.85 * Math.abs(Math.sin(segAngle - nibAngle));
      const pressure = ((a.pressure ?? 0.5) + (b.pressure ?? 0.5)) / 2;
      ctx.lineWidth = Math.max(1.2, stroke.thickness * nibFactor * (0.7 + pressure * 0.6));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Check if points contain meaningful pressure variation (stylus / touch digitizer)
  const hasPressureVariation =
    stroke.tool === 'pen' &&
    stroke.penStyle !== 'dashed' &&
    pts.some((p) => typeof p.pressure === 'number' && Math.abs(p.pressure - 0.5) > 0.08);

  if (!hasPressureVariation) {
    ctx.lineWidth = stroke.thickness;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  } else {
    // Variable-width segments modulated smoothly by pointer pressure
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const pressure = ((a.pressure ?? 0.5) + (b.pressure ?? 0.5)) / 2;
      ctx.lineWidth = Math.max(1, stroke.thickness * (0.45 + pressure * 0.95));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeAnnotation,
  alphaScale: number
): void {
  ctx.save();
  const strokeAlpha = Math.max(0, Math.min(1, shape.opacity * alphaScale));
  ctx.strokeStyle = hexToRgbaString(shape.color, strokeAlpha);
  ctx.lineWidth = shape.thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { start, end } = shape;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  if (shape.shapeType === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (shape.shapeType === 'arrow' || shape.shapeType === 'double-arrow') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const headLen = shape.arrowHeadSize ?? Math.max(12, shape.thickness * 3.8);
    ctx.fillStyle = hexToRgbaString(shape.color, strokeAlpha);

    const endHead = computeArrowHead(start, end, headLen);
    if (endHead) {
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(endHead.left.x, endHead.left.y);
      ctx.lineTo(endHead.right.x, endHead.right.y);
      ctx.closePath();
      ctx.fill();
    }

    if (shape.shapeType === 'double-arrow') {
      const startHead = computeArrowHead(end, start, headLen);
      if (startHead) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(startHead.left.x, startHead.left.y);
        ctx.lineTo(startHead.right.x, startHead.right.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (shape.shapeType === 'freehand-shape' && shape.points && shape.points.length >= 2) {
    const pts = shape.points;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.closePath();
    if (shape.fillOpacity && shape.fillOpacity > 0 && shape.fillColor) {
      ctx.fillStyle = hexToRgbaString(shape.fillColor, shape.fillOpacity * alphaScale);
      ctx.fill();
    }
    ctx.stroke();
  } else if (shape.shapeType === 'rect' || shape.shapeType === 'filled-rect') {
    if (shape.shapeType === 'filled-rect' || (shape.fillOpacity && shape.fillOpacity > 0)) {
      const fillHex = shape.fillColor || shape.color;
      const fillAlpha = Math.max(
        0,
        Math.min(1, (shape.fillOpacity ?? (shape.shapeType === 'filled-rect' ? 0.25 : 0)) * alphaScale)
      );
      if (fillAlpha > 0) {
        ctx.fillStyle = hexToRgbaString(fillHex, fillAlpha);
        ctx.fillRect(x, y, w, h);
      }
    }
    ctx.strokeRect(x, y, w, h);
  } else if (shape.shapeType === 'circle' || shape.shapeType === 'ellipse') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = Math.max(1, w / 2);
    const ry = shape.shapeType === 'circle' ? rx : Math.max(1, h / 2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (shape.fillOpacity && shape.fillOpacity > 0 && shape.fillColor) {
      ctx.fillStyle = hexToRgbaString(shape.fillColor, shape.fillOpacity * alphaScale);
      ctx.fill();
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function drawTextAnnotationOnCanvas(
  ctx: CanvasRenderingContext2D,
  item: TextAnnotation,
  alphaScale: number
): void {
  if (!item.text.trim()) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alphaScale));
  const weight = item.bold ? '700' : '500';
  const style = item.italic ? 'italic' : 'normal';
  ctx.font = `${style} ${weight} ${item.fontSize}px "${item.fontFamily}", sans-serif`;
  ctx.textBaseline = 'top';

  const lines = item.text.split('\n');
  const lineHeight = item.fontSize * 1.3;
  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const padX = 10;
  const padY = 6;

  if (item.backgroundColor && item.backgroundColor !== 'transparent') {
    ctx.fillStyle = item.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      item.x - padX,
      item.y - padY,
      maxWidth + padX * 2,
      lines.length * lineHeight + padY * 2,
      8
    );
    ctx.fill();
  }

  const align = item.align ?? 'left';
  ctx.textAlign = align;
  ctx.fillStyle = item.color;
  lines.forEach((line, idx) => {
    const anchorX =
      align === 'center' ? item.x + maxWidth / 2 : align === 'right' ? item.x + maxWidth : item.x;
    ctx.fillText(line, anchorX, item.y + idx * lineHeight);
  });
  ctx.restore();
}

function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  item: AnnotationItem,
  scroll: { x: number; y: number }
): void {
  const rawBox = getAnnotationBoundingBox(item);
  const box = itemBoxToViewportBox(rawBox, item.coordSpace, scroll);
  const pad = 6;
  const x = box.minX - pad;
  const y = box.minY - pad;
  const w = Math.max(12, box.width + pad * 2);
  const h = Math.max(12, box.height + pad * 2);

  ctx.save();
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  const handles = [
    { cx: x, cy: y },
    { cx: x + w, cy: y },
    { cx: x, cy: y + h },
    { cx: x + w, cy: y + h },
  ];
  for (const hPos of handles) {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(hPos.cx - 4, hPos.cy - 4, 8, 8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawLaserTrail(
  ctx: CanvasRenderingContext2D,
  trail: LaserPoint[],
  nowMs: number,
  color: string,
  size: number,
  trailEnabled: boolean
): void {
  const maxAgeMs = 850;
  const active = trail.filter((pt) => nowMs - pt.timestamp < maxAgeMs);
  if (active.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (trailEnabled) {
    for (let i = 0; i < active.length - 1; i++) {
      const a = active[i];
      const b = active[i + 1];
      const age = nowMs - b.timestamp;
      const ratio = Math.max(0, 1 - age / maxAgeMs);
      ctx.strokeStyle = hexToRgbaString(color, ratio * 0.85);
      ctx.lineWidth = Math.max(2, size * 0.45 * ratio);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Bright core dot at latest pointer position
  const head = active[active.length - 1];
  const headAge = nowMs - head.timestamp;
  const headRatio = Math.max(0, 1 - headAge / maxAgeMs);
  if (headRatio > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 1.4;
    ctx.fillStyle = hexToRgbaString(color, headRatio);
    ctx.beginPath();
    ctx.arc(head.x, head.y, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${headRatio * 0.9})`;
    ctx.beginPath();
    ctx.arc(head.x, head.y, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCursorSpotlight(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
  dimOpacity: number
): void {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, radius * 0.65, x, y, radius * 1.35);
  gradient.addColorStop(0, 'rgba(2, 6, 23, 0)');
  gradient.addColorStop(0.75, `rgba(2, 6, 23, ${dimOpacity * 0.55})`);
  gradient.addColorStop(1, `rgba(2, 6, 23, ${dimOpacity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCursorHighlightRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
): void {
  if (x < 0 || y < 0) return;
  ctx.save();
  ctx.fillStyle = hexToRgbaString(color, 0.18);
  ctx.strokeStyle = hexToRgbaString(color, 0.78);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function renderAnnotationLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  items: AnnotationItem[],
  options: RenderOptions
): void {
  ctx.clearRect(0, 0, width, height);
  const scroll = options.scroll ?? { x: 0, y: 0 };

  if (options.annotationsVisible) {
    const allItems = options.activeDraftItem ? [...items, options.activeDraftItem] : items;
    for (const item of allItems) {
      const alpha = computeFadeAlpha(item, options.nowMs);
      if (alpha <= 0.01) continue;

      const isDocSpace = item.coordSpace === 'document';
      if (isDocSpace && (scroll.x !== 0 || scroll.y !== 0)) {
        ctx.save();
        ctx.translate(-scroll.x, -scroll.y);
      }

      if (item.category === 'stroke') {
        drawSmoothStroke(ctx, item, alpha, options.boardMode);
      } else if (item.category === 'shape') {
        drawShape(ctx, item, alpha);
      } else if (item.category === 'text' && options.includeTextOnCanvas) {
        drawTextAnnotationOnCanvas(ctx, item, alpha);
      }

      if (isDocSpace && (scroll.x !== 0 || scroll.y !== 0)) {
        ctx.restore();
      }
    }

    if (options.selectedItemId && !options.includeTextOnCanvas) {
      const selected = items.find((it) => it.id === options.selectedItemId);
      if (selected) {
        drawSelectionOverlay(ctx, selected, scroll);
      }
    }
  }

  if (options.laserTrail && options.laserTrail.length > 0) {
    drawLaserTrail(
      ctx,
      options.laserTrail,
      options.nowMs,
      options.laserColor ?? '#EF4444',
      options.laserSize ?? 14,
      options.laserTrailEnabled !== false
    );
  }

  // Draw glowing stationary laser dot when laser tool is active inside viewport
  if (
    options.laserActive &&
    options.pointerPos &&
    options.pointerPos.x >= 0 &&
    options.pointerPos.y >= 0
  ) {
    const lColor = options.laserColor ?? '#EF4444';
    const lSize = options.laserSize ?? 14;
    ctx.save();
    ctx.shadowColor = lColor;
    ctx.shadowBlur = lSize * 1.5;
    ctx.fillStyle = hexToRgbaString(lColor, 0.92);
    ctx.beginPath();
    ctx.arc(options.pointerPos.x, options.pointerPos.y, lSize * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(options.pointerPos.x, options.pointerPos.y, lSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (options.cursorHighlight?.enabled) {
    drawCursorHighlightRing(
      ctx,
      options.cursorHighlight.x,
      options.cursorHighlight.y,
      options.cursorHighlight.color
    );
  }

  if (options.cursorSpotlight?.enabled) {
    drawCursorSpotlight(
      ctx,
      width,
      height,
      options.cursorSpotlight.x,
      options.cursorSpotlight.y,
      options.cursorSpotlight.radius,
      options.cursorSpotlight.dimOpacity
    );
  }
}

export function buildPreviewSvgDataUrl(point: Point[], color: string, thickness: number): string {
  const path = point
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 44"><path d="${path}" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  )}`;
}
