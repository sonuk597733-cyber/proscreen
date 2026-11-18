import React, { useEffect, useRef } from 'react';
import { AnnotationItem, BoardMode, LaserPoint, Point, ToolType } from '../types/annotation';
import { UserSettings } from '../types/settings';
import { renderAnnotationLayer } from '../canvas/renderer';
import { distanceBetweenPoints, hitTestTopAnnotationAtClientPoint } from '../canvas/geometry';
import { isShapeDoubleClick } from '../canvas/shapeSelection';
import { isShapeTool } from '../tools/toolDefinitions';
import { getHighContrastCursor } from './cursors';

interface AnnotationCanvasProps {
  activeTool: ToolType;
  boardMode: BoardMode;
  items: AnnotationItem[];
  settings: UserSettings;
  selectedItemId: string | null;
  draftItemRef: React.MutableRefObject<AnnotationItem | null>;
  laserTrailRef: React.MutableRefObject<LaserPoint[]>;
  pointerPosRef: React.MutableRefObject<Point>;
  toolbarVisible?: boolean;
  annotationsVisible?: boolean;
  isRecording?: boolean;
  interactionMode?: 'pointer' | 'drawing';
  onCanvasInteract?: () => void;
  onBegin: (pt: Point, pressure?: number) => void;
  onMove: (pt: Point, pressure?: number, shiftKey?: boolean) => void;
  onEnd: () => void;
  onTextClick: (pt: Point) => void;
  onSelectShape?: (id: string) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  activeTool,
  boardMode,
  items,
  settings,
  selectedItemId,
  draftItemRef,
  laserTrailRef,
  pointerPosRef,
  toolbarVisible = true,
  annotationsVisible = true,
  isRecording = false,
  interactionMode = 'pointer',
  onCanvasInteract,
  onBegin,
  onMove,
  onEnd,
  onTextClick,
  onSelectShape,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);
  const pointerStartRef = useRef<{ point: Point; shapeId: string; moved: boolean } | null>(null);
  const lastShapeClickRef = useRef<{ shapeId: string; point: Point; time: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  // Critical fix: When POINTER mode is active or Eye is closed, canvas must never intercept pointer events
  const isCursorPassThrough =
    interactionMode === 'pointer' ||
    toolbarVisible === false ||
    annotationsVisible === false ||
    activeTool === 'pointer' ||
    activeTool === 'cursor';
  const spotlightActive = settings.creator.cursorSpotlightEnabled;
  const cursorHighlightActive = settings.creator.cursorHighlightEnabled;

  const drawFrame = useRef<() => void>(() => {});
  drawFrame.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const scroll = { x: window.scrollX || 0, y: window.scrollY || 0 };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const now = Date.now();
    renderAnnotationLayer(ctx, width, height, items, {
      nowMs: now,
      boardMode,
      annotationsVisible: annotationsVisible && settings.creator.annotationsVisible,
      scroll,
      activeDraftItem: annotationsVisible ? draftItemRef.current : null,
      selectedItemId: annotationsVisible && !isRecording ? selectedItemId : null,
      laserTrail: annotationsVisible ? laserTrailRef.current : [],
      laserColor: settings.laserColor,
      laserSize: settings.laserSize,
      laserTrailEnabled: settings.laserTrailEnabled,
      laserActive: annotationsVisible && activeTool === 'laser',
      pointerPos: pointerPosRef.current,
      cursorSpotlight: spotlightActive
        ? {
            enabled: true,
            x: pointerPosRef.current.x,
            y: pointerPosRef.current.y,
            radius: settings.creator.spotlightRadius,
            dimOpacity: settings.creator.spotlightDimOpacity,
          }
        : undefined,
      cursorHighlight: cursorHighlightActive
        ? {
            enabled: true,
            x: pointerPosRef.current.x,
            y: pointerPosRef.current.y,
            color: settings.pen.color,
          }
        : undefined,
      includeTextOnCanvas: false,
    });

    // Draw high-contrast dual-tone eraser ring when hovering with eraser
    if (activeTool === 'eraser' && pointerPosRef.current.x >= 0) {
      ctx.save();
      // Outer dark solid ring
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(
        pointerPosRef.current.x,
        pointerPosRef.current.y,
        settings.eraserSize / 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Inner white dashed ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(
        pointerPosRef.current.x,
        pointerPosRef.current.y,
        settings.eraserSize / 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Keep animating only while fading ink, active drag, or laser decay is happening
    const hasFading = items.some((i) => i.fadeDurationMs && i.fadeDurationMs > 0);
    const hasRecentLaser = laserTrailRef.current.some((pt) => now - pt.timestamp < 900);
    if (isPointerDownRef.current || hasFading || hasRecentLaser) {
      rafRef.current = window.requestAnimationFrame(() => drawFrame.current());
    } else {
      if (laserTrailRef.current.length > 0 && !hasRecentLaser) {
        laserTrailRef.current = [];
      }
      rafRef.current = null;
    }
  };

  const kickLoop = () => {
    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(() => drawFrame.current());
    }
  };

  // Re-render immediately whenever items, visibility, board mode, selection, or spotlight settings change
  useEffect(() => {
    // Synchronously paint canvas to eliminate any suspended RAF latency or blank flicker on restore
    drawFrame.current();
    kickLoop();
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    items,
    boardMode,
    settings,
    activeTool,
    selectedItemId,
    spotlightActive,
    cursorHighlightActive,
    annotationsVisible,
    isRecording,
    toolbarVisible,
  ]);

  // Handle viewport resize, browser zoom, document scroll, window focus, and visibility restoration
  useEffect(() => {
    const onResizeOrScroll = () => {
      drawFrame.current();
      kickLoop();
    };
    const finishIfInterrupted = () => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;
      pointerStartRef.current = null;
      lastShapeClickRef.current = null;
      onEndRef.current();
      kickLoop();
    };
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });
    window.addEventListener('focus', onResizeOrScroll);
    window.addEventListener('blur', finishIfInterrupted);
    document.addEventListener('visibilitychange', onResizeOrScroll);
    window.visualViewport?.addEventListener('resize', onResizeOrScroll);
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll);
      window.removeEventListener('focus', onResizeOrScroll);
      window.removeEventListener('blur', finishIfInterrupted);
      document.removeEventListener('visibilitychange', onResizeOrScroll);
      window.visualViewport?.removeEventListener('resize', onResizeOrScroll);
    };
  }, []);

  // Ensure switching to cursor pass-through or hiding annotations never leaves a stuck pointer capture
  useEffect(() => {
    if (isCursorPassThrough && isPointerDownRef.current) {
      isPointerDownRef.current = false;
      pointerStartRef.current = null;
      lastShapeClickRef.current = null;
      onEndRef.current();
      kickLoop();
    }
  }, [isCursorPassThrough]);

  // Track pointer position even in Cursor Mode when Cursor Spotlight or Cursor Highlight is active
  useEffect(() => {
    if (!spotlightActive && !cursorHighlightActive) return;
    const onWindowMove = (e: PointerEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      kickLoop();
    };
    window.addEventListener('pointermove', onWindowMove, { passive: true });
    return () => window.removeEventListener('pointermove', onWindowMove);
  }, [spotlightActive, cursorHighlightActive, pointerPosRef]);

  const getCursorStyle = () => {
    return getHighContrastCursor(activeTool, isCursorPassThrough);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onCanvasInteract?.();
    if (isCursorPassThrough || e.button !== 0) return;

    e.preventDefault();
    const pt: Point = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pt;

    const canSelectShape = activeTool === 'select' || isShapeTool(activeTool);
    const scroll = { x: window.scrollX || 0, y: window.scrollY || 0 };
    const hit = canSelectShape
      ? hitTestTopAnnotationAtClientPoint(items, pt, 10, scroll)
      : null;
    const hitShape = hit?.category === 'shape' ? hit : null;
    const previousClick = lastShapeClickRef.current;
    const now = Date.now();
    const isDoubleClick = Boolean(
      hitShape && isShapeDoubleClick(hitShape.id, pt, e.detail, previousClick, now)
    );

    if (isDoubleClick && hitShape) {
      lastShapeClickRef.current = null;
      pointerStartRef.current = null;
      e.stopPropagation();
      onSelectShape?.(hitShape.id);
      kickLoop();
      return;
    }

    // A click on an existing shape while a shape tool is active is treated as
    // the first half of a possible double-click. Waiting here prevents that
    // click from starting a tiny overlapping shape before selection can occur.
    if (hitShape && isShapeTool(activeTool)) {
      lastShapeClickRef.current = { shapeId: hitShape.id, point: pt, time: now };
      pointerStartRef.current = null;
      return;
    }

    pointerStartRef.current = hitShape
      ? { point: pt, shapeId: hitShape.id, moved: false }
      : null;
    if (!hitShape) lastShapeClickRef.current = null;

    if (activeTool === 'text') {
      onTextClick(pt);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    onBegin(pt, e.pressure > 0 ? e.pressure : 0.5);
    kickLoop();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt: Point = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pt;
    const pointerStart = pointerStartRef.current;
    if (pointerStart && distanceBetweenPoints(pt, pointerStart.point) > 8) {
      pointerStart.moved = true;
      lastShapeClickRef.current = null;
    }

    if (activeTool === 'laser') {
      onMove(pt, e.pressure, e.shiftKey);
      kickLoop();
      return;
    }

    if (activeTool === 'eraser' && !isPointerDownRef.current) {
      kickLoop();
      return;
    }

    if (!isPointerDownRef.current) {
      if (spotlightActive || cursorHighlightActive) kickLoop();
      return;
    }

    onMove(pt, e.pressure > 0 ? e.pressure : 0.5, e.shiftKey);
    kickLoop();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const pointerStart = pointerStartRef.current;
    const point = { x: e.clientX, y: e.clientY };
    if (
      e.type === 'pointerup' &&
      pointerStart &&
      !pointerStart.moved &&
      distanceBetweenPoints(point, pointerStart.point) <= 8
    ) {
      lastShapeClickRef.current = {
        shapeId: pointerStart.shapeId,
        point,
        time: Date.now(),
      };
    } else {
      lastShapeClickRef.current = null;
    }
    pointerStartRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if pointer capture already released
    }
    onEnd();
    kickLoop();
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCursorPassThrough || e.button !== 0 || !(activeTool === 'select' || isShapeTool(activeTool))) {
      return;
    }
    const hit = hitTestTopAnnotationAtClientPoint(
      items,
      { x: e.clientX, y: e.clientY },
      10,
      { x: window.scrollX || 0, y: window.scrollY || 0 }
    );
    if (hit?.category !== 'shape') return;
    e.preventDefault();
    e.stopPropagation();
    lastShapeClickRef.current = null;
    onSelectShape?.(hit.id);
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="annotation-canvas"
      data-active-tool={activeTool}
      data-interaction-mode={isCursorPassThrough ? 'pointer' : 'drawing'}
      data-toolbar-visible={toolbarVisible !== false}
      data-annotation-count={items.length}
      data-board-mode={boardMode}
      data-selected-id={selectedItemId ?? ''}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        cursor: getCursorStyle(),
        touchAction: isCursorPassThrough ? 'auto' : 'none',
        pointerEvents: isCursorPassThrough ? 'none' : 'auto',
      }}
      className={`fixed inset-0 w-screen h-screen z-[2147483615] ${
        isCursorPassThrough ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    />
  );
};
