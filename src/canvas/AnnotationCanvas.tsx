import React, { useEffect, useRef } from 'react';
import { AnnotationItem, BoardMode, LaserPoint, Point } from '../types/annotation';
import { UserSettings } from '../types/settings';
import { renderAnnotationLayer } from '../canvas/renderer';
import { isShapeTool } from '../tools/toolDefinitions';

const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' fill='%23ffffff'/%3E%3C/svg%3E") 2 22, crosshair`;

const HIGHLIGHTER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 11-6 6v3h3l6-6' fill='%23fef08a'/%3E%3Cpath d='m22 7-4.5-4.5a2.12 2.12 0 0 0-3 0l-2.5 2.5 7.5 7.5 2.5-2.5a2.12 2.12 0 0 0 0-3Z' fill='%23ffffff'/%3E%3C/svg%3E") 3 20, crosshair`;

const ARROW_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 19 19 5M19 5H9M19 5v10' fill='none'/%3E%3C/svg%3E") 12 12, crosshair`;

interface AnnotationCanvasProps {
  activeTool: string;
  boardMode: BoardMode;
  items: AnnotationItem[];
  settings: UserSettings;
  selectedItemId: string | null;
  draftItemRef: React.MutableRefObject<AnnotationItem | null>;
  laserTrailRef: React.MutableRefObject<LaserPoint[]>;
  pointerPosRef: React.MutableRefObject<Point>;
  toolbarVisible?: boolean;
  annotationsVisible?: boolean;
  interactionMode?: 'pointer' | 'drawing';
  onCanvasInteract?: () => void;
  onBegin: (pt: Point, pressure?: number) => void;
  onMove: (pt: Point, pressure?: number, shiftKey?: boolean) => void;
  onEnd: () => void;
  onTextClick: (pt: Point) => void;
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
  interactionMode = 'pointer',
  onCanvasInteract,
  onBegin,
  onMove,
  onEnd,
  onTextClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);
  const rafRef = useRef<number | null>(null);

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
      selectedItemId: annotationsVisible ? selectedItemId : null,
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

    // Draw subtle eraser ring when hovering with eraser
    if (activeTool === 'eraser' && pointerPosRef.current.x >= 0) {
      ctx.save();
      ctx.strokeStyle = boardMode === 'blackboard' ? 'rgba(248,250,252,0.7)' : 'rgba(15,23,42,0.6)';
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

  // Re-render whenever items, visibility, board mode, selection, or spotlight settings change
  useEffect(() => {
    kickLoop();
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [items, boardMode, settings, activeTool, selectedItemId, spotlightActive, cursorHighlightActive]);

  // Handle viewport resize, browser zoom, and document scroll cleanly
  useEffect(() => {
    const onResizeOrScroll = () => kickLoop();
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', onResizeOrScroll);
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll);
      window.visualViewport?.removeEventListener('resize', onResizeOrScroll);
    };
  }, []);

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
    if (isCursorPassThrough) return 'default';
    if (activeTool === 'select') return 'move';
    if (activeTool === 'text') return 'text';
    if (activeTool === 'eraser') return 'none';
    if (activeTool === 'laser') return 'none';
    if (activeTool === 'pen') return PEN_CURSOR;
    if (activeTool === 'highlighter') return HIGHLIGHTER_CURSOR;
    if (activeTool === 'arrow' || activeTool === 'double-arrow') return ARROW_CURSOR;
    if (isShapeTool(activeTool as never)) return 'crosshair';
    return PEN_CURSOR;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onCanvasInteract?.();
    if (isCursorPassThrough || e.button !== 0) return;
    e.preventDefault();
    const pt: Point = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pt;

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
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
    onEnd();
    kickLoop();
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
