import React, { useRef, useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface FloatingEyeRestoreButtonProps {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onRestore: () => void;
  edgeSnapping?: boolean;
  isDesktopToolbarWindow?: boolean;
  onDesktopMove?: (x: number, y: number) => void;
  onSaveDesktopPosition?: (x: number, y: number) => void;
}

export const FloatingEyeRestoreButton: React.FC<FloatingEyeRestoreButtonProps> = ({
  position,
  onPositionChange,
  onRestore,
  edgeSnapping = true,
  isDesktopToolbarWindow = false,
  onDesktopMove,
  onSaveDesktopPosition,
}) => {
  const safePosition = position || { x: 16, y: 76 };
  const [isHovered, setIsHovered] = useState(false);
  const activeDragRef = useRef<{ cleanup: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (activeDragRef.current) {
        activeDragRef.current.cleanup();
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (activeDragRef.current) {
      activeDragRef.current.cleanup();
    }

    const startScreenX = Number.isFinite(e.screenX) && e.screenX !== 0 ? e.screenX : e.clientX;
    const startScreenY = Number.isFinite(e.screenY) && e.screenY !== 0 ? e.screenY : e.clientY;
    const startWinX =
      isDesktopToolbarWindow && typeof window !== 'undefined' && Number.isFinite(window.screenX)
        ? window.screenX
        : safePosition.x;
    const startWinY =
      isDesktopToolbarWindow && typeof window !== 'undefined' && Number.isFinite(window.screenY)
        ? window.screenY
        : safePosition.y;

    let moved = false;
    let latestX = startWinX;
    let latestY = startWinY;
    let moveRafId: number | null = null;

    const cleanup = () => {
      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
        moveRafId = null;
      }
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', cleanup, true);
      window.removeEventListener('pointercancel', cleanup, true);
      window.removeEventListener('mouseup', cleanup, true);
      window.removeEventListener('blur', cleanup, true);
      activeDragRef.current = null;

      if (moved) {
        let finalX = latestX;
        let finalY = latestY;

        if (edgeSnapping && !isDesktopToolbarWindow) {
          const vw = window.innerWidth;
          const size = 40;
          if (finalX <= 28) {
            finalX = 12;
          } else if (finalX + size >= vw - 28) {
            finalX = Math.max(12, vw - size - 12);
          }
        }

        onPositionChange({ x: finalX, y: finalY });
        if (isDesktopToolbarWindow && onSaveDesktopPosition) {
          onSaveDesktopPosition(finalX, finalY);
        }
      } else {
        if (isDesktopToolbarWindow && onSaveDesktopPosition) {
          onSaveDesktopPosition(startWinX, startWinY);
        }
        // Normal click without movement -> restore toolbar
        onRestore();
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.buttons !== undefined && (ev.buttons & 1) === 0) {
        cleanup();
        return;
      }

      const curScreenX = Number.isFinite(ev.screenX) && ev.screenX !== 0 ? ev.screenX : ev.clientX;
      const curScreenY = Number.isFinite(ev.screenY) && ev.screenY !== 0 ? ev.screenY : ev.clientY;
      const dx = curScreenX - startScreenX;
      const dy = curScreenY - startScreenY;

      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;

      latestX = Math.round(startWinX + dx);
      latestY = Math.round(startWinY + dy);

      if (isDesktopToolbarWindow && onDesktopMove) {
        if (moveRafId === null) {
          moveRafId = requestAnimationFrame(() => {
            moveRafId = null;
            if (activeDragRef.current) {
              onDesktopMove(latestX, latestY);
            }
          });
        }
      } else {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const size = 40;
        const clampedX = Math.max(8, Math.min(vw - size - 8, latestX));
        const clampedY = Math.max(8, Math.min(vh - size - 8, latestY));
        onPositionChange({ x: clampedX, y: clampedY });
      }
    };

    activeDragRef.current = { cleanup };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', cleanup, true);
    window.addEventListener('pointercancel', cleanup, true);
    window.addEventListener('mouseup', cleanup, true);
    window.addEventListener('blur', cleanup, true);
  };

  const style: React.CSSProperties = isDesktopToolbarWindow
    ? {
        position: 'relative',
        width: '40px',
        height: '40px',
        pointerEvents: 'auto',
      }
    : {
        position: 'fixed',
        left: `${safePosition.x}px`,
        top: `${safePosition.y}px`,
        zIndex: 2147483645,
        pointerEvents: 'auto',
      };

  return (
    <div style={style} className="select-none font-sans">
      <button
        type="button"
        data-testid="floating-eye-restore-button"
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Restore ProScreen Toolbar (Eye ON)"
        title="Restore Toolbar (Click or Drag anywhere)"
        style={{ touchAction: 'none' }}
        className="group relative w-10 h-10 rounded-full bg-[#0F172A]/95 hover:bg-[#1E293B] active:bg-[#0B1120] text-blue-400 hover:text-white border-2 border-blue-500/80 hover:border-blue-400 shadow-[0_4px_20px_rgba(37,99,235,0.35)] flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150 transform hover:scale-105"
      >
        <Eye className="w-5 h-5 transition-transform group-hover:scale-110 text-blue-400 group-hover:text-blue-200" strokeWidth={2.2} />

        {/* Small live pulsing dot indicator */}
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 shadow-sm animate-pulse"
          aria-hidden="true"
        />

        {/* Hover Tooltip */}
        {isHovered && !isDesktopToolbarWindow && (
          <div
            role="tooltip"
            className="absolute left-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-[#0F172A] border border-slate-700/80 text-[11px] font-medium text-slate-200 shadow-lg whitespace-nowrap pointer-events-none"
          >
            Restore Toolbar (Eye ON)
          </div>
        )}
      </button>
    </div>
  );
};
