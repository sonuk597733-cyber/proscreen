import React from 'react';
import { ChevronLeft, ChevronRight, Download, Plus, Trash2 } from 'lucide-react';
import { BoardMode } from '../types/annotation';

interface BoardBackdropProps {
  mode: BoardMode;
  showGrid: boolean;
  pageIndex: number;
  pageCount: number;
  backgroundImageDataUrl?: string;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onClearBoard: () => void;
  onExportBoardPng: () => void;
  onReturnToWebpage: () => void;
}

const BOARD_LABELS: Record<Exclude<BoardMode, 'webpage'>, string> = {
  whiteboard: 'Whiteboard',
  blackboard: 'Blackboard',
  'grid-paper': 'Grid Paper',
  'ruled-notebook': 'Ruled Notebook',
};

export const BoardBackdrop: React.FC<BoardBackdropProps> = ({
  mode,
  showGrid,
  pageIndex,
  pageCount,
  backgroundImageDataUrl,
  onPrevPage,
  onNextPage,
  onAddPage,
  onClearBoard,
  onExportBoardPng,
  onReturnToWebpage,
}) => {
  if (mode === 'webpage') return null;

  const isDarkBoard = mode === 'blackboard';

  let surfaceClass = 'bg-slate-50';
  let backgroundStyle: React.CSSProperties = {};

  if (mode === 'blackboard') {
    surfaceClass = 'bg-[#0B1120]';
    if (showGrid) {
      backgroundStyle = {
        backgroundImage:
          'linear-gradient(to right, rgba(148,163,184,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.09) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      };
    }
  } else if (mode === 'whiteboard') {
    surfaceClass = 'bg-slate-50';
    if (showGrid) {
      backgroundStyle = {
        backgroundImage:
          'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      };
    }
  } else if (mode === 'grid-paper') {
    surfaceClass = 'bg-[#F8FAFC]';
    backgroundStyle = {
      backgroundImage:
        'linear-gradient(to right, rgba(59,130,246,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.14) 1px, transparent 1px), linear-gradient(to right, rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.06) 1px, transparent 1px)',
      backgroundSize: '96px 96px, 96px 96px, 24px 24px, 24px 24px',
    };
  } else if (mode === 'ruled-notebook') {
    surfaceClass = 'bg-[#FFFDF6]';
    backgroundStyle = {
      backgroundImage:
        'linear-gradient(to right, transparent 68px, rgba(239,68,68,0.28) 68px, rgba(239,68,68,0.28) 70px, transparent 70px), linear-gradient(to bottom, transparent 31px, rgba(59,130,246,0.18) 31px)',
      backgroundSize: '100% 100%, 100% 32px',
    };
  }

  return (
    <>
      <div
        data-testid="board-backdrop"
        data-board-mode={mode}
        className={`fixed inset-0 z-[2147483600] transition-colors duration-200 ${surfaceClass}`}
        style={backgroundStyle}
      >
        {backgroundImageDataUrl && (
          <img
            src={backgroundImageDataUrl}
            alt="Board custom background"
            className="fixed inset-0 w-full h-full object-contain pointer-events-none opacity-95"
          />
        )}
      </div>

      <div
        data-testid="board-deck-controls"
        className={`fixed top-3 right-3 z-[2147483630] flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shadow-lg backdrop-blur-md ${
          isDarkBoard
            ? 'bg-slate-900/90 border-slate-700 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-800'
        }`}
      >
        <span className="text-[11px] font-semibold px-1.5 opacity-80">
          {BOARD_LABELS[mode]}
        </span>
        <span className="h-3.5 w-px bg-slate-500/25" />

        <button
          type="button"
          aria-label="Previous board page"
          disabled={pageIndex <= 0}
          onClick={onPrevPage}
          className="p-1 rounded-md hover:bg-slate-500/15 disabled:opacity-35 cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono tabular-nums px-1" data-testid="board-page-indicator">
          {pageIndex + 1} / {pageCount}
        </span>

        <button
          type="button"
          aria-label="Next board page"
          disabled={pageIndex >= pageCount - 1}
          onClick={onNextPage}
          className="p-1 rounded-md hover:bg-slate-500/15 disabled:opacity-35 cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Add board page"
          onClick={onAddPage}
          className="p-1 rounded-md hover:bg-slate-500/15 cursor-pointer"
          title="New Page"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <span className="h-3.5 w-px bg-slate-500/25" />

        <button
          type="button"
          aria-label="Clear board"
          onClick={onClearBoard}
          className="p-1 rounded-md text-rose-500 hover:bg-rose-500/15 cursor-pointer"
          title="Clear Board Page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Export board PNG"
          onClick={onExportBoardPng}
          className="p-1 rounded-md text-blue-500 hover:bg-blue-500/15 cursor-pointer"
          title="Export Board as PNG"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onReturnToWebpage}
          className={`ml-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
            isDarkBoard
              ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
          }`}
        >
          Return to Webpage
        </button>
      </div>
    </>
  );
};
