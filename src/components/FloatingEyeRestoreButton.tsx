import React, { useRef, useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface FloatingEyeRestoreButtonProps {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onRestore: () => void;
  edgeSnapping?: boolean;
  isDesktopToolbarWindow?: boolean;
  onDesktopMove?: (x: number, y: number) => void;
}

export const FloatingEyeRestoreButton: React.FC<FloatingEyeRestoreButtonProps> = ({
  position,
  onPositionChange,
  onRestore,
  edgeSnapping = true,
  isDesktopToolbarWindow = false,
  onDesktopMove,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initPosX: number;
    initPosY: number;
    latestX: number;
    latestY: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: position.x,
      initPosY: position.y,
      latestX: position.x,
      latestY: position.y,
      moved: false,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const sess = dragRef.current;
      if (!sess) return;

      const dx = ev.clientX - sess.startX;
      const dy = ev.clientY - sess.startY;

      if (!sess.moved && Math.hypot(dx, dy) < 4) return;
      sess.moved = true;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = 40;

      let nextX = Math.round(sess.initPosX + dx);
      let nextY = Math.round(sess.initPosY + dy);

      if (!isDesktopToolbarWindow) {
        nextX = Math.max(8, Math.min(vw - size - 8, nextX));
        nextY = Math.max(8, Math.min(vh - size - 8, nextY));
      }

      sess.latestX = nextX;
      sess.latestY = nextY;

      if (isDesktopToolbarWindow && onDesktopMove) {
        onDesktopMove(nextX, nextY);
      } else {
        onPositionChange({ x: nextX, y: nextY });
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);

      const sess = dragRef.current;
      dragRef.current = null;
      if (!sess) return;

      if (sess.moved) {
        let finalX = sess.latestX;
        let finalY = sess.latestY;

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
      } else {
        // Normal click without movement -> restore toolbar
        onRestore();
      }
    };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
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
        left: `${position.x}px`,
        top: `${position.y}px`,
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
