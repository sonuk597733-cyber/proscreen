import React, { useEffect, useRef, useState } from 'react';
import { Check, Move, RotateCcw, X } from 'lucide-react';
import { CropRect } from '../screenshot/capture';
import { AREA_CROP_CURSOR } from '../canvas/cursors';

export interface AreaSelectorProps {
  active: boolean;
  title?: string;
  confirmLabel?: string;
  initialRect?: CropRect | null;
  onSelect: (rect: CropRect) => void;
  onCancel: () => void;
}

type DragMode =
  | null
  | 'creating'
  | 'moving'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

const MIN_SIZE = 16;

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  active,
  title,
  confirmLabel,
  initialRect,
  onSelect,
  onCancel,
}) => {
  const [lockedRect, setLockedRect] = useState<CropRect | null>(null);
  const [liveRect, setLiveRect] = useState<CropRect | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);

  const startPtRef = useRef<{ x: number; y: number } | null>(null);
  const initialRectRef = useRef<CropRect | null>(null);

  useEffect(() => {
    if (!active) {
      setLockedRect(null);
      setLiveRect(null);
      setDragMode(null);
      startPtRef.current = null;
      initialRectRef.current = null;
      return;
    }

    if (initialRect && initialRect.width >= MIN_SIZE && initialRect.height >= MIN_SIZE) {
      setLockedRect(initialRect);
    }
  }, [active, initialRect]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setLockedRect(null);
        setLiveRect(null);
        onCancel();
      } else if (e.key === 'Enter' && (lockedRect || liveRect)) {
        e.preventDefault();
        e.stopPropagation();
        const chosen = lockedRect || liveRect;
        if (chosen && chosen.width >= MIN_SIZE && chosen.height >= MIN_SIZE) {
          onSelect(chosen);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, lockedRect, liveRect, onCancel, onSelect]);

  const currentRect = liveRect || lockedRect;

  const handlePointerDown = (e: React.PointerEvent, mode: DragMode) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const pt = { x: e.clientX, y: e.clientY };
    startPtRef.current = pt;
    setDragMode(mode);

    if (mode === 'creating') {
      setLockedRect(null);
      setLiveRect({ x: pt.x, y: pt.y, width: 0, height: 0 });
    } else if (lockedRect) {
      initialRectRef.current = { ...lockedRect };
      setLiveRect({ ...lockedRect });
    }
  };

  useEffect(() => {
    if (!dragMode) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!startPtRef.current) return;
      const start = startPtRef.current;
      const current = { x: e.clientX, y: e.clientY };
      const dx = current.x - start.x;
      const dy = current.y - start.y;

      if (dragMode === 'creating') {
        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const width = Math.abs(current.x - start.x);
        const height = Math.abs(current.y - start.y);
        setLiveRect({ x, y, width, height });
        return;
      }

      const base = initialRectRef.current;
      if (!base) return;

      if (dragMode === 'moving') {
        const nextX = Math.round(base.x + dx);
        const nextY = Math.round(base.y + dy);
        setLiveRect({
          x: nextX,
          y: nextY,
          width: base.width,
          height: base.height,
        });
        return;
      }

      // 8-direction resizing
      let { x, y, width, height } = base;

      if (dragMode.includes('w')) {
        const maxW = base.x + base.width;
        const nextX = Math.min(maxW - MIN_SIZE, base.x + dx);
        width = maxW - nextX;
        x = nextX;
      }
      if (dragMode.includes('e')) {
        width = Math.max(MIN_SIZE, base.width + dx);
      }
      if (dragMode.includes('n')) {
        const maxH = base.y + base.height;
        const nextY = Math.min(maxH - MIN_SIZE, base.y + dy);
        height = maxH - nextY;
        y = nextY;
      }
      if (dragMode.includes('s')) {
        height = Math.max(MIN_SIZE, base.height + dy);
      }

      setLiveRect({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    const onPointerUp = () => {
      setLiveRect((latest) => {
        if (latest && latest.width >= MIN_SIZE && latest.height >= MIN_SIZE) {
          setLockedRect(latest);
        }
        return null;
      });
      setDragMode(null);
      startPtRef.current = null;
      initialRectRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };
  }, [dragMode]);

  if (!active) return null;

  const confirmRect = () => {
    const target = lockedRect || liveRect;
    if (target && target.width >= MIN_SIZE && target.height >= MIN_SIZE) {
      setLockedRect(null);
      setLiveRect(null);
      onSelect(target);
    }
  };

  return (
    <div
      data-testid="area-selector-overlay"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-selector-control="true"]')) return;
        handlePointerDown(e, 'creating');
      }}
      style={{ pointerEvents: 'auto', touchAction: 'none', cursor: AREA_CROP_CURSOR }}
      className="fixed inset-0 z-[2147483644] bg-slate-950/45 select-none pointer-events-auto"
    >
      {/* Top Floating Control Bar */}
      <div
        data-selector-control="true"
        className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-slate-900/95 text-slate-100 text-xs font-medium border border-slate-700 shadow-xl flex items-center gap-3 pointer-events-auto"
      >
        <span>
          {title ||
            (currentRect && currentRect.width >= MIN_SIZE
              ? 'Region selected — move, resize, or confirm'
              : 'Drag across any screen region to select area')}
        </span>
        {currentRect && currentRect.width >= MIN_SIZE && (
          <button
            type="button"
            data-testid="area-selector-confirm"
            onClick={(e) => {
              e.stopPropagation();
              confirmRect();
            }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer shadow"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{confirmLabel || 'Confirm'}</span>
          </button>
        )}
        <button
          type="button"
          data-testid="area-selector-cancel"
          onClick={(e) => {
            e.stopPropagation();
            setLockedRect(null);
            setLiveRect(null);
            onCancel();
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel (Esc)</span>
        </button>
      </div>

      {/* Selected Area Box with 8 Resize Handles and Center Move Handle */}
      {currentRect && currentRect.width > 0 && currentRect.height > 0 && (
        <div
          data-testid="area-selector-rect"
          style={{
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.width,
            height: currentRect.height,
          }}
          className="fixed border-2 border-blue-400 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.42)] pointer-events-auto"
        >
          {/* Dimension badge */}
          <span className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono tabular-nums whitespace-nowrap shadow border border-slate-700">
            {Math.round(currentRect.width)} × {Math.round(currentRect.height)} px
          </span>

          {/* Center Move Area */}
          <div
            data-testid="area-selector-move-surface"
            onPointerDown={(e) => handlePointerDown(e, 'moving')}
            className="w-full h-full cursor-move flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] pointer-events-none">
              <Move className="w-3 h-3" />
              <span>Drag to Move</span>
            </div>
          </div>

          {/* 8 Resize Handles */}
          {/* NW Handle */}
          <div
            data-handle="nw"
            onPointerDown={(e) => handlePointerDown(e, 'nw')}
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* N Handle */}
          <div
            data-handle="n"
            onPointerDown={(e) => handlePointerDown(e, 'n')}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* NE Handle */}
          <div
            data-handle="ne"
            onPointerDown={(e) => handlePointerDown(e, 'ne')}
            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* E Handle */}
          <div
            data-handle="e"
            onPointerDown={(e) => handlePointerDown(e, 'e')}
            className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* SE Handle */}
          <div
            data-handle="se"
            onPointerDown={(e) => handlePointerDown(e, 'se')}
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* S Handle */}
          <div
            data-handle="s"
            onPointerDown={(e) => handlePointerDown(e, 's')}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* SW Handle */}
          <div
            data-handle="sw"
            onPointerDown={(e) => handlePointerDown(e, 'sw')}
            className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
          />
          {/* W Handle */}
          <div
            data-handle="w"
            onPointerDown={(e) => handlePointerDown(e, 'w')}
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform"
          />

          {/* Bottom Action Buttons */}
          <div
            data-selector-control="true"
            className="absolute -bottom-10 right-0 flex items-center gap-1.5 pointer-events-auto"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLockedRect(null);
                setLiveRect(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900/95 border border-slate-700 text-slate-200 hover:bg-slate-800 text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Redraw</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLockedRect(null);
                setLiveRect(null);
                onCancel();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900/95 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[11px] cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirmRect();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>{confirmLabel || 'Capture Area'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
