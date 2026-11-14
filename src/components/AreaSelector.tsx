import React, { useEffect, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { CropRect } from '../screenshot/capture';

interface AreaSelectorProps {
  active: boolean;
  onSelect: (rect: CropRect) => void;
  onCancel: () => void;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  active,
  onSelect,
  onCancel,
}) => {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);
  const [lockedRect, setLockedRect] = useState<CropRect | null>(null);
  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const currentRef = React.useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setStart(null);
      setCurrent(null);
      setLockedRect(null);
      startRef.current = null;
      currentRef.current = null;
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setLockedRect(null);
        onCancel();
      } else if (e.key === 'Enter' && lockedRect) {
        e.preventDefault();
        e.stopPropagation();
        const confirmed = lockedRect;
        setLockedRect(null);
        onSelect(confirmed);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, lockedRect, onCancel, onSelect]);

  if (!active) return null;

  const liveRect: CropRect | null =
    start && current
      ? {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y),
        }
      : lockedRect;

  const confirmRect = () => {
    if (!lockedRect) return;
    const confirmed = lockedRect;
    setLockedRect(null);
    onSelect(confirmed);
  };

  return (
    <div
      data-testid="area-selector-overlay"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-selector-control="true"]')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const pt = { x: e.clientX, y: e.clientY };
        setLockedRect(null);
        startRef.current = pt;
        currentRef.current = pt;
        setStart(pt);
        setCurrent(pt);
      }}
      onPointerMove={(e) => {
        if (!startRef.current) return;
        const pt = { x: e.clientX, y: e.clientY };
        currentRef.current = pt;
        setCurrent(pt);
      }}
      onPointerUp={(e) => {
        if (!startRef.current) return;
        const s = startRef.current;
        const c = { x: e.clientX, y: e.clientY };
        const finalRect: CropRect = {
          x: Math.min(s.x, c.x),
          y: Math.min(s.y, c.y),
          width: Math.abs(c.x - s.x),
          height: Math.abs(c.y - s.y),
        };
        startRef.current = null;
        currentRef.current = null;
        setStart(null);
        setCurrent(null);
        if (finalRect.width >= 16 && finalRect.height >= 16) {
          setLockedRect(finalRect);
        }
      }}
      style={{ pointerEvents: 'auto', touchAction: 'none' }}
      className="fixed inset-0 z-[2147483644] bg-slate-950/45 cursor-crosshair select-none pointer-events-auto"
    >
      <div
        data-selector-control="true"
        className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-slate-900/95 text-slate-100 text-xs font-medium border border-slate-700 shadow-lg flex items-center gap-3 pointer-events-auto"
      >
        <span>
          {lockedRect
            ? 'Region ready — confirm capture or drag again to adjust'
            : 'Drag across any area to select screenshot region'}
        </span>
        {lockedRect && (
          <button
            type="button"
            data-testid="area-selector-confirm"
            onClick={(e) => {
              e.stopPropagation();
              confirmRect();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm</span>
          </button>
        )}
        <button
          type="button"
          data-testid="area-selector-cancel"
          onClick={(e) => {
            e.stopPropagation();
            setLockedRect(null);
            onCancel();
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel (Esc)</span>
        </button>
      </div>

      {liveRect && (
        <div
          data-testid="area-selector-rect"
          style={{
            left: liveRect.x,
            top: liveRect.y,
            width: liveRect.width,
            height: liveRect.height,
          }}
          className="fixed border-2 border-blue-400 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]"
        >
          <span className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono tabular-nums whitespace-nowrap">
            {Math.round(liveRect.width)} × {Math.round(liveRect.height)} px
          </span>

          {lockedRect && (
            <div
              data-selector-control="true"
              className="absolute -bottom-10 right-0 flex items-center gap-1.5 pointer-events-auto"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLockedRect(null);
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
                <span>Capture Area</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
