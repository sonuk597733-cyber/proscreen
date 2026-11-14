import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Camera,
  Circle,
  Eraser,
  Eye,
  EyeOff,
  GripHorizontal,
  Highlighter,
  Minus,
  MousePointer,
  Move,
  PenTool,
  Presentation,
  Redo2,
  Settings,
  Sparkles,
  Spline,
  Square,
  SquareDot,
  Timer,
  Trash2,
  Type,
  Undo2,
  Video,
} from 'lucide-react';
import { BoardMode, SavedSession, ShapeToolType, ToolType } from '../types/annotation';
import { ResolvedThemeMode, UserSettings } from '../types/settings';
import { HistoryScope } from '../canvas/history';
import { formatCountdownMs } from '../canvas/timer';
import {
  RecordingArtifact,
  RecordingFormatOption,
  RecordingStatus,
} from '../recorder/screenRecorder';
import { isShapeTool } from '../tools/toolDefinitions';
import { hexToRgb } from '../utils/color';
import { PopoutId, PopoutPosition, ToolbarPopouts } from './ToolbarPopouts';

interface FloatingToolbarProps {
  activeTool: ToolType;
  boardMode: BoardMode;
  boardPageIndex: number;
  boardPageCount: number;
  hasBoardBackground: boolean;
  settings: UserSettings;
  resolvedTheme: ResolvedThemeMode;
  toolbarVisible: boolean;
  ghostMode: boolean;
  presentationMode: boolean;
  isCapturing: boolean;
  activeTimerCountdownMs: number | null;
  recordingStatus: RecordingStatus;
  recordingElapsedMs: number;
  latestRecording: RecordingArtifact | null;
  recordingSupported: boolean;
  supportedRecordingFormats: RecordingFormatOption[];
  canUndoAll: boolean;
  canRedoAll: boolean;
  canUndoStroke: boolean;
  canRedoStroke: boolean;
  canUndoShape: boolean;
  canRedoShape: boolean;
  annotationCount: number;
  hasSelectedObject: boolean;
  activeBrush: { color: string; thickness: number; opacity: number };
  savedSessions: SavedSession[];
  activePopout: PopoutId | null;
  onSetActivePopout: (popout: PopoutId | null) => void;
  onSelectTool: (tool: ToolType) => void;
  onSwitchBoard: (mode: BoardMode) => void;
  onPrevBoardPage: () => void;
  onNextBoardPage: () => void;
  onAddBoardPage: () => void;
  onClearBoard: () => void;
  onSaveBoard: () => void;
  onExportBoardPng: () => void;
  onImportBoardBackground: (dataUrl: string) => void;
  onClearBoardBackground: () => void;
  onUpdateSettings: (updater: (prev: UserSettings) => UserSettings) => void;
  onChangeColor: (hex: string) => void;
  onChangeThickness: (val: number) => void;
  onChangeOpacity: (val: number) => void;
  onToggleFavorite: (hex: string) => void;
  onDeleteSelected: () => void;
  onUndo: (scope?: HistoryScope) => void;
  onRedo: (scope?: HistoryScope) => void;
  onClearScreen: () => void;
  onToggleGhostMode: () => void;
  onTogglePresentationMode: () => void;
  onToggleTimerEnabled: () => void;
  onSetTimerDurationMs: (ms: number) => void;
  onToggleTimerPaused: () => void;
  onResetTimer: () => void;
  onCancelTimer: () => void;
  onCaptureFull: () => void;
  onCaptureArea: () => void;
  onCopyScreenshot: () => void;
  onSavePng: () => void;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onDownloadLatestRecording: () => void;
  onPreviewLatestRecording: () => void;
  onClearTemporaryRecording: () => void;
  onSaveSession: (name?: string) => void;
  onRestoreSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
  onExportAnnotations: () => void;
  onImportAnnotations: (json: string) => void;
  onOpenSettings: () => void;
  onRestoreToolbar: () => void;
  interactionMode?: 'pointer' | 'drawing';
  onCloseEye?: () => void;
  onOpenEye?: () => void;
  onToggleEye?: () => void;
}

interface TooltipInfo {
  label: string;
  shortcut?: string;
  top: number;
  left?: number;
  right?: number;
}

const ESTIMATED_POPOUT_HEIGHT: Record<PopoutId, number> = {
  cursor: 175,
  pen: 255,
  highlighter: 230,
  eraser: 165,
  brush: 165,
  shapes: 112,
  text: 165,
  color: 580,
  undo: 105,
  timer: 235,
  screenshot: 86,
  recorder: 260,
  board: 390,
  settings: 245,
};

const ESTIMATED_POPOUT_WIDTH: Record<PopoutId, number> = {
  cursor: 244,
  pen: 248,
  highlighter: 240,
  eraser: 234,
  brush: 228,
  shapes: 292,
  text: 252,
  color: 328,
  undo: 228,
  timer: 260,
  screenshot: 288,
  recorder: 270,
  board: 276,
  settings: 248,
};

const SubmenuCornerNotch: React.FC<{ active?: boolean; activeTextDark?: boolean; isDark: boolean }> = ({
  active = false,
  activeTextDark = false,
  isDark,
}) => (
  <svg
    aria-hidden="true"
    width="5"
    height="5"
    viewBox="0 0 6 6"
    className={`pointer-events-none absolute right-[1px] bottom-[1px] ${
      active
        ? activeTextDark
          ? 'text-[#0F172A]/85'
          : 'text-white/90'
        : isDark
        ? 'text-slate-400/80'
        : 'text-slate-600/80'
    }`}
  >
    <path d="M6 0L6 6L0 6Z" fill="currentColor" />
  </svg>
);

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  activeTool,
  boardMode,
  boardPageIndex,
  boardPageCount,
  hasBoardBackground,
  settings,
  resolvedTheme,
  toolbarVisible,
  ghostMode,
  presentationMode,
  isCapturing,
  activeTimerCountdownMs,
  recordingStatus,
  recordingElapsedMs,
  latestRecording,
  recordingSupported,
  supportedRecordingFormats,
  canUndoAll,
  canRedoAll,
  canUndoStroke,
  canRedoStroke,
  canUndoShape,
  canRedoShape,
  annotationCount,
  hasSelectedObject,
  activeBrush,
  savedSessions,
  activePopout,
  onSetActivePopout,
  onSelectTool,
  onSwitchBoard,
  onPrevBoardPage,
  onNextBoardPage,
  onAddBoardPage,
  onClearBoard,
  onSaveBoard,
  onExportBoardPng,
  onImportBoardBackground,
  onClearBoardBackground,
  onUpdateSettings,
  onChangeColor,
  onChangeThickness,
  onChangeOpacity,
  onToggleFavorite,
  onDeleteSelected,
  onUndo,
  onRedo,
  onClearScreen,
  onToggleGhostMode,
  onTogglePresentationMode,
  onToggleTimerEnabled,
  onSetTimerDurationMs,
  onToggleTimerPaused,
  onResetTimer,
  onCancelTimer,
  onCaptureFull,
  onCaptureArea,
  onCopyScreenshot,
  onSavePng,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onCancelRecording,
  onDownloadLatestRecording,
  onPreviewLatestRecording,
  onClearTemporaryRecording,
  onSaveSession,
  onRestoreSession,
  onDeleteSession,
  onExportAnnotations,
  onImportAnnotations,
  onOpenSettings,
  onRestoreToolbar,
  interactionMode = 'pointer',
  onCloseEye,
  onOpenEye,
  onToggleEye,
}) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    latestX: number;
    latestY: number;
    moved: boolean;
  } | null>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [popoutPosition, setPopoutPosition] = useState<PopoutPosition>({
    top: 76,
    left: 56,
    openSide: 'right',
    anchorOffsetY: 16,
  });

  // Clamp toolbar position cleanly when viewport resizes
  useEffect(() => {
    const clampIntoViewport = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = panelRef.current?.offsetWidth ?? 34;
      const height = panelRef.current?.offsetHeight ?? (settings.toolbarCollapsed ? 56 : 420);
      onUpdateSettings((prev) => {
        const clampedX = Math.max(8, Math.min(vw - width - 8, prev.toolbarPosition.x));
        const clampedY = Math.max(
          8,
          Math.min(vh - Math.min(height, vh - 16) - 8, prev.toolbarPosition.y)
        );
        if (clampedX === prev.toolbarPosition.x && clampedY === prev.toolbarPosition.y) {
          return prev;
        }
        return {
          ...prev,
          toolbarPosition: { x: clampedX, y: clampedY },
        };
      });
    };
    window.addEventListener('resize', clampIntoViewport);
    return () => window.removeEventListener('resize', clampIntoViewport);
  }, [onUpdateSettings, settings.toolbarCollapsed]);

  // Close popout when clicking outside toolbar & popout
  useEffect(() => {
    if (!activePopout) return;
    const onGlobalPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && toolbarRef.current?.contains(target)) return;
      onSetActivePopout(null);
    };
    window.addEventListener('pointerdown', onGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', onGlobalPointerDown);
  }, [activePopout, onSetActivePopout]);

  useEffect(() => {
    return () => {
      if (hoverOpenTimerRef.current) window.clearTimeout(hoverOpenTimerRef.current);
      if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  // Hide chrome during Ghost Mode or active Screenshot capture frame
  if (ghostMode || isCapturing) {
    return null;
  }

  // When Eye is Closed, toolbar is completely hidden (no visible button on page)
  if (!toolbarVisible) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';
  const accent = settings.accentColor || '#0EA5E9';
  const accentRgb = hexToRgb(accent);
  const accentIsLight = accentRgb
    ? (accentRgb.r * 299 + accentRgb.g * 587 + accentRgb.b * 114) / 1000 >= 145
    : false;
  const activeInkClass = accentIsLight ? 'text-[#0F172A]' : 'text-white';

  const isDense = settings.toolbarSize === 'compact';
  const btnDim = isDense ? 'w-[24px] h-[19px]' : 'w-[26px] h-[21px]';
  const iconDim = isDense ? 'w-[13px] h-[13px]' : 'w-[14px] h-[14px]';
  const iconStroke = 1.65;
  const isCompactState = settings.toolbarCollapsed;
  const isRecording = recordingStatus !== 'idle';

  // Crisp Epic Pen vertical column surface (sharp flat corners + subtle border)
  const surfaceClasses = isDark
    ? 'bg-[#1B1D24]/98 text-[#D8DCE6] border-[#2E323E] shadow-[0_10px_28px_-4px_rgba(0,0,0,0.65)]'
    : 'bg-[#F8F9FB]/98 text-[#1E2430] border-[#CFD5E2] shadow-[0_8px_24px_-4px_rgba(15,23,42,0.22)]';

  const toolBtnClass = (active: boolean) =>
    `${btnDim} relative inline-flex items-center justify-center rounded-[3px] transition-colors duration-100 cursor-pointer shrink-0 ${
      active
        ? `${activeInkClass} shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]`
        : isDark
        ? 'text-[#C6CCD8] hover:text-white hover:bg-[#2A2E39]'
        : 'text-[#1E2430] hover:text-[#0B0F19] hover:bg-[#E4E9F2]'
    }`;

  const iconBtnClass = (active = false, disabled = false) =>
    `${btnDim} relative inline-flex items-center justify-center rounded-[3px] transition-colors duration-100 shrink-0 ${
      disabled
        ? 'opacity-30 cursor-not-allowed'
        : active
        ? isDark
          ? 'bg-[#2E3340] text-white cursor-pointer'
          : 'bg-[#E2E8F0] text-[#0B0F19] cursor-pointer'
        : isDark
        ? 'text-[#C6CCD8] hover:text-white hover:bg-[#2A2E39] cursor-pointer'
        : 'text-[#1E2430] hover:text-[#0B0F19] hover:bg-[#E4E9F2] cursor-pointer'
    }`;

  const dividerClass = `w-[22px] h-px my-[1px] shrink-0 ${
    isDark ? 'bg-[#2D313D]' : 'bg-[#DDE2EC]'
  }`;

  const computePopoutCoords = (id: PopoutId, triggerEl: HTMLElement | null): PopoutPosition => {
    const toolbarRect = panelRef.current?.getBoundingClientRect();
    const triggerRect = triggerEl?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tbLeft = toolbarRect?.left ?? settings.toolbarPosition.x;
    const tbRight = toolbarRect?.right ?? tbLeft + 34;
    const openLeft = tbLeft > vw * 0.56;
    const estHeight = ESTIMATED_POPOUT_HEIGHT[id] ?? 220;
    const estWidth = ESTIMATED_POPOUT_WIDTH[id] ?? 250;

    const triggerTop = triggerRect?.top ?? toolbarRect?.top ?? settings.toolbarPosition.y;
    const triggerMidY = triggerRect
      ? triggerRect.top + triggerRect.height / 2
      : triggerTop + 12;
    const desiredTop = triggerTop - 4;
    const clampedTop = Math.max(8, Math.min(vh - Math.min(estHeight, vh - 16) - 8, desiredTop));
    const anchorOffsetY = Math.max(12, Math.min(estHeight - 12, Math.round(triggerMidY - clampedTop)));

    if (openLeft) {
      return {
        top: clampedTop,
        right: Math.max(8, vw - tbLeft - 6),
        openSide: 'left',
        anchorOffsetY,
      };
    }
    return {
      top: clampedTop,
      left: Math.max(8, Math.min(vw - estWidth - 8, tbRight - 6)),
      openSide: 'right',
      anchorOffsetY,
    };
  };

  const showTooltipFor = (el: HTMLElement | null, label: string, shortcut?: string) => {
    if (!settings.showTooltips || dragSessionRef.current || !el) return;
    const toolbarRect = panelRef.current?.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const tbLeft = toolbarRect?.left ?? settings.toolbarPosition.x;
    const tbRight = toolbarRect?.right ?? tbLeft + 34;
    const openLeft = tbLeft > vw * 0.56;
    setTooltip({
      label,
      shortcut,
      top: Math.round(rect.top + rect.height / 2 - 11),
      ...(openLeft
        ? { right: Math.max(8, vw - tbLeft + 6) }
        : { left: Math.max(8, tbRight + 6) }),
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  const openPopoutFor = (id: PopoutId, el: HTMLElement | null) => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setTooltip(null);
    setPopoutPosition(computePopoutCoords(id, el));
    onSetActivePopout(id);
  };

  const scheduleHoverOpen = (
    id: PopoutId | null,
    el: HTMLElement | null,
    label: string,
    shortcut?: string
  ) => {
    if (dragSessionRef.current) return;
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    if (!id) {
      showTooltipFor(el, label, shortcut);
      return;
    }
    if (!activePopout || activePopout !== id) {
      showTooltipFor(el, label, shortcut);
    }
    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
    }
    hoverOpenTimerRef.current = window.setTimeout(() => {
      openPopoutFor(id, el);
    }, 110);
  };

  const scheduleHoverClose = () => {
    hideTooltip();
    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
    }
    hoverCloseTimerRef.current = window.setTimeout(() => {
      onSetActivePopout(null);
    }, 320);
  };

  const cancelHoverClose = () => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  // Drag Handle Pointer Events (works in both Compact & Expanded states)
  const finishDragSession = (clientX?: number, clientY?: number) => {
    const sess = dragSessionRef.current;
    if (!sess) return;
    dragSessionRef.current = null;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const dx = clientX - sess.startClientX;
      const dy = clientY - sess.startClientY;
      if (Math.hypot(dx, dy) >= 3) {
        sess.moved = true;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const width = panelRef.current?.offsetWidth ?? 34;
        const height = panelRef.current?.offsetHeight ?? 56;
        sess.latestX = Math.round(Math.max(8, Math.min(vw - width - 8, sess.startPosX + dx)));
        sess.latestY = Math.round(
          Math.max(8, Math.min(vh - Math.min(height, vh - 16) - 8, sess.startPosY + dy))
        );
      }
    }

    if (sess.moved) {
      let finalX = sess.latestX;
      if (settings.edgeSnapping) {
        const vw = window.innerWidth;
        const width = panelRef.current?.offsetWidth ?? 34;
        if (finalX <= 28) {
          finalX = 12;
        } else if (finalX + width >= vw - 28) {
          finalX = Math.max(12, vw - width - 12);
        }
      }
      onUpdateSettings((p) => ({
        ...p,
        toolbarPosition: { x: finalX, y: sess.latestY },
      }));
    }
  };

  const handleDragPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    hideTooltip();
    onSetActivePopout(null);
    dragSessionRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: settings.toolbarPosition.x,
      startPosY: settings.toolbarPosition.y,
      latestX: settings.toolbarPosition.x,
      latestY: settings.toolbarPosition.y,
      moved: false,
    };

    const onWindowPointerMove = (ev: PointerEvent) => {
      const sess = dragSessionRef.current;
      if (!sess) return;
      const dx = ev.clientX - sess.startClientX;
      const dy = ev.clientY - sess.startClientY;
      if (!sess.moved && Math.hypot(dx, dy) < 3) return;
      sess.moved = true;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = panelRef.current?.offsetWidth ?? 34;
      const height = panelRef.current?.offsetHeight ?? 56;
      const nextX = Math.round(Math.max(8, Math.min(vw - width - 8, sess.startPosX + dx)));
      const nextY = Math.round(
        Math.max(8, Math.min(vh - Math.min(height, vh - 16) - 8, sess.startPosY + dy))
      );
      sess.latestX = nextX;
      sess.latestY = nextY;

      onUpdateSettings((prev) => ({
        ...prev,
        toolbarPosition: { x: nextX, y: nextY },
      }));
    };

    const cleanup = (ev?: PointerEvent) => {
      window.removeEventListener('pointermove', onWindowPointerMove, true);
      window.removeEventListener('pointerup', cleanup, true);
      window.removeEventListener('pointercancel', cleanup, true);
      finishDragSession(ev?.clientX, ev?.clientY);
    };

    window.addEventListener('pointermove', onWindowPointerMove, true);
    window.addEventListener('pointerup', cleanup, true);
    window.addEventListener('pointercancel', cleanup, true);
  };

  const handleToolbarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && activePopout) {
      e.stopPropagation();
      onSetActivePopout(null);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const buttons = Array.from(
        e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      );
      const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (idx >= 0) {
        e.preventDefault();
        const nextIdx =
          e.key === 'ArrowDown'
            ? (idx + 1) % buttons.length
            : (idx - 1 + buttons.length) % buttons.length;
        buttons[nextIdx]?.focus();
      }
    }
  };

  const renderShapeIcon = (shape: ShapeToolType) => {
    if (shape === 'line') return <Minus className={`${iconDim} -rotate-45`} strokeWidth={iconStroke} />;
    if (shape === 'arrow') return <ArrowUpRight className={iconDim} strokeWidth={iconStroke} />;
    if (shape === 'double-arrow') return <ArrowLeftRight className={iconDim} strokeWidth={iconStroke} />;
    if (shape === 'filled-rect') return <SquareDot className={iconDim} strokeWidth={iconStroke} />;
    if (shape === 'circle' || shape === 'ellipse') return <Circle className={iconDim} strokeWidth={iconStroke} />;
    if (shape === 'freehand-shape') return <Spline className={iconDim} strokeWidth={iconStroke} />;
    return <Square className={iconDim} strokeWidth={iconStroke} />;
  };

  const shapeMenuActive = isShapeTool(activeTool);

  const estimatedHeight = isCompactState ? 56 : isDense ? 390 : 426;
  const clampedToolbarX =
    typeof window !== 'undefined'
      ? Math.max(8, Math.min(window.innerWidth - 42, settings.toolbarPosition.x))
      : settings.toolbarPosition.x;
  const clampedToolbarY =
    typeof window !== 'undefined'
      ? Math.max(
          8,
          Math.min(
            Math.max(8, window.innerHeight - estimatedHeight - 8),
            settings.toolbarPosition.y
          )
        )
      : settings.toolbarPosition.y;

  const shortcutFor = (action: string) =>
    settings.shortcuts.find((s) => s.action === action)?.keys;

  const activeStyle = (active: boolean): React.CSSProperties | undefined =>
    active ? { backgroundColor: accent } : undefined;

  const cursorActive =
    activeTool === 'pointer' || activeTool === 'cursor' || activeTool === 'select' || activeTool === 'laser';

  // Scaled brush dot diameter matching Epic Pen's visual dot indicator (5px..12px)
  const brushDotPx = Math.max(5, Math.min(12, Math.round(4 + (activeBrush.thickness / 36) * 8)));

  return (
    <div ref={toolbarRef} onKeyDown={handleToolbarKeyDown} className="select-none">
      {/* Main Single-Column Floating Toolbar (Exact Epic Pen Proportions) */}
      <div
        ref={panelRef}
        data-testid="proscreen-toolbar"
        data-state={isCompactState ? 'compact' : 'expanded'}
        data-orientation="vertical"
        data-theme={resolvedTheme}
        data-toolbar-visible="true"
        data-active-tool={activeTool}
        data-interaction-mode={activeTool === 'pointer' || activeTool === 'cursor' ? 'pointer' : 'drawing'}
        data-presentation-mode={presentationMode ? 'true' : 'false'}
        onMouseEnter={cancelHoverClose}
        style={{
          position: 'fixed',
          left: clampedToolbarX,
          top: clampedToolbarY,
          zIndex: 2147483635,
          maxHeight: 'calc(100vh - 16px)',
          pointerEvents: 'auto',
        }}
        className={`w-[34px] flex flex-col items-center px-[3px] py-[4px] rounded-[4px] border backdrop-blur-xl transition-colors duration-150 overflow-y-auto pointer-events-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${surfaceClasses}`}
      >
        {/* 1. Drag Handle (Dark Circular Cap inspired by Epic Pen handle) */}
        <button
          type="button"
          data-testid="toolbar-drag-handle"
          onPointerDown={handleDragPointerDown}
          onMouseEnter={(e) => scheduleHoverOpen(null, e.currentTarget, 'Drag Toolbar')}
          onMouseLeave={hideTooltip}
          aria-label="Drag toolbar"
          style={{ touchAction: 'none' }}
          className="w-[24px] h-[24px] rounded-full bg-[#151821] text-white border border-slate-700/75 shadow-sm inline-flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 hover:bg-[#222736] transition-colors"
        >
          <GripHorizontal className="w-[12px] h-[12px]" strokeWidth={1.8} />
        </button>

        {/* 2. Eye Toggle (Open Eye -> Close Eye) */}
        <button
          type="button"
          data-testid="toolbar-eye-toggle"
          data-eye-state="open"
          onClick={(e) => {
            e.stopPropagation();
            hideTooltip();
            onSetActivePopout(null);
            if (onCloseEye) {
              onCloseEye();
            } else {
              onRestoreToolbar();
            }
          }}
          onMouseEnter={(e) =>
            scheduleHoverOpen(
              null,
              e.currentTarget,
              'Close Eye (Hide Toolbar)',
              shortcutFor('toggle-toolbar')
            )
          }
          onMouseLeave={hideTooltip}
          aria-label="Close Eye (Hide Toolbar)"
          title="Close Eye / Hide Toolbar (Alt+M)"
          aria-expanded={true}
          style={activeStyle(true)}
          className={`${toolBtnClass(true)} mt-[2px]`}
        >
          <EyeOff className={iconDim} strokeWidth={iconStroke} />
        </button>

        {/* EXPANDED STATE: Single Vertical Column Matching Epic Pen Layout */}
        {!isCompactState && (
          <div className="flex flex-col items-center gap-[1px] mt-[2px]">
            <div className={dividerClass} />

            {/* 3. Pointer / Arrow / Cursor */}
            <button
              type="button"
              data-testid="toolbar-pointer-btn"
              data-tool="pointer"
              aria-label="Pointer"
              aria-pressed={cursorActive}
              aria-expanded={activePopout === 'cursor'}
              style={activeStyle(cursorActive)}
              onMouseEnter={(e) =>
                scheduleHoverOpen('cursor', e.currentTarget, 'Pointer (Default Cursor)', shortcutFor('cursor'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                onSelectTool('pointer');
                openPopoutFor('cursor', e.currentTarget);
              }}
              className={toolBtnClass(cursorActive)}
            >
              {activeTool === 'select' ? (
                <Move className={iconDim} strokeWidth={iconStroke} />
              ) : activeTool === 'laser' ? (
                <Sparkles className={iconDim} strokeWidth={iconStroke} />
              ) : (
                <MousePointer className={iconDim} strokeWidth={iconStroke} />
              )}
              <SubmenuCornerNotch active={cursorActive} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 4. Timer */}
            <button
              type="button"
              data-testid="toolbar-timer-btn"
              aria-label="Annotation Timer"
              aria-pressed={settings.timer.enabled}
              aria-expanded={activePopout === 'timer'}
              style={activeStyle(settings.timer.enabled)}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'timer',
                  e.currentTarget,
                  settings.timer.enabled
                    ? `Timer ON (${formatCountdownMs(settings.timer.durationMs)})`
                    : 'Annotation Timer (OFF)'
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('timer', e.currentTarget)}
              className={toolBtnClass(settings.timer.enabled)}
            >
              <Timer className={iconDim} strokeWidth={iconStroke} />
              {settings.timer.enabled && (
                <span
                  aria-hidden="true"
                  className="absolute top-[1px] right-[1px] w-1.5 h-1.5 rounded-full bg-amber-400"
                />
              )}
              <SubmenuCornerNotch active={settings.timer.enabled} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 5. Pen */}
            <button
              type="button"
              aria-label="Pen"
              aria-pressed={activeTool === 'pen'}
              aria-expanded={activePopout === 'pen'}
              style={activeStyle(activeTool === 'pen')}
              onMouseEnter={(e) =>
                scheduleHoverOpen('pen', e.currentTarget, 'Pen Tool', shortcutFor('pen'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                onSelectTool('pen');
                openPopoutFor('pen', e.currentTarget);
              }}
              className={toolBtnClass(activeTool === 'pen')}
            >
              <PenTool className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'pen'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 6. Highlighter */}
            <button
              type="button"
              aria-label="Highlighter"
              aria-pressed={activeTool === 'highlighter'}
              aria-expanded={activePopout === 'highlighter'}
              style={activeStyle(activeTool === 'highlighter')}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'highlighter',
                  e.currentTarget,
                  'Highlighter',
                  shortcutFor('highlighter')
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                onSelectTool('highlighter');
                openPopoutFor('highlighter', e.currentTarget);
              }}
              className={toolBtnClass(activeTool === 'highlighter')}
            >
              <Highlighter className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'highlighter'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 7. Arrow & Shapes */}
            <button
              type="button"
              aria-label="Arrow and Shapes"
              aria-expanded={activePopout === 'shapes'}
              aria-pressed={shapeMenuActive}
              style={activeStyle(shapeMenuActive)}
              onMouseEnter={(e) =>
                scheduleHoverOpen('shapes', e.currentTarget, 'Arrow & Shapes', shortcutFor('arrow'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (!shapeMenuActive) onSelectTool('arrow');
                openPopoutFor('shapes', e.currentTarget);
              }}
              className={toolBtnClass(shapeMenuActive)}
            >
              {shapeMenuActive ? (
                renderShapeIcon(activeTool)
              ) : (
                <ArrowUpRight className={iconDim} strokeWidth={iconStroke} />
              )}
              <SubmenuCornerNotch active={shapeMenuActive} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 8. Text */}
            <button
              type="button"
              aria-label="Text"
              aria-pressed={activeTool === 'text'}
              aria-expanded={activePopout === 'text'}
              style={activeStyle(activeTool === 'text')}
              onMouseEnter={(e) =>
                scheduleHoverOpen('text', e.currentTarget, 'Text Tool', shortcutFor('text'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                onSelectTool('text');
                openPopoutFor('text', e.currentTarget);
              }}
              className={toolBtnClass(activeTool === 'text')}
            >
              <Type className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'text'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 9. Eraser */}
            <button
              type="button"
              aria-label="Eraser"
              aria-pressed={activeTool === 'eraser'}
              aria-expanded={activePopout === 'eraser'}
              style={activeStyle(activeTool === 'eraser')}
              onMouseEnter={(e) =>
                scheduleHoverOpen('eraser', e.currentTarget, 'Eraser & Clear', shortcutFor('eraser'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                onSelectTool('eraser');
                openPopoutFor('eraser', e.currentTarget);
              }}
              className={toolBtnClass(activeTool === 'eraser')}
            >
              <Eraser className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'eraser'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 10. Brush Size Indicator (Solid scaled dot matching Epic Pen) */}
            <button
              type="button"
              data-testid="toolbar-brush-btn"
              aria-label="Brush Size"
              aria-expanded={activePopout === 'brush'}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'brush',
                  e.currentTarget,
                  `Brush Size (${activeBrush.thickness}px)`
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('brush', e.currentTarget)}
              className={iconBtnClass(activePopout === 'brush')}
            >
              <span
                aria-hidden="true"
                className="rounded-full transition-all"
                style={{
                  width: brushDotPx,
                  height: brushDotPx,
                  backgroundColor: isDark ? '#E4E7EF' : '#111827',
                }}
              />
              <SubmenuCornerNotch active={activePopout === 'brush'} isDark={isDark} />
            </button>

            <div className={dividerClass} />

            {/* 11. Undo */}
            <button
              type="button"
              aria-label="Undo"
              disabled={!canUndoAll}
              onMouseEnter={(e) =>
                scheduleHoverOpen('undo', e.currentTarget, 'Undo', shortcutFor('undo'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={() => onUndo('all')}
              className={iconBtnClass(false, !canUndoAll)}
            >
              <Undo2 className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch isDark={isDark} />
            </button>

            {/* 12. Redo */}
            <button
              type="button"
              aria-label="Redo"
              disabled={!canRedoAll}
              onMouseEnter={(e) =>
                scheduleHoverOpen(null, e.currentTarget, 'Redo', shortcutFor('redo'))
              }
              onMouseLeave={hideTooltip}
              onClick={() => onRedo('all')}
              className={iconBtnClass(false, !canRedoAll)}
            >
              <Redo2 className={iconDim} strokeWidth={iconStroke} />
            </button>

            {/* 13. Clear All */}
            <button
              type="button"
              data-testid="toolbar-clear-btn"
              aria-label="Clear All Annotations"
              disabled={annotationCount === 0}
              onMouseEnter={(e) =>
                scheduleHoverOpen(null, e.currentTarget, 'Clear All', shortcutFor('clear'))
              }
              onMouseLeave={hideTooltip}
              onClick={onClearScreen}
              className={iconBtnClass(false, annotationCount === 0)}
            >
              <Trash2 className={iconDim} strokeWidth={iconStroke} />
            </button>

            <div className={dividerClass} />

            {/* 14. Whiteboard (Easel icon matching Epic Pen) */}
            <button
              type="button"
              data-testid="toolbar-whiteboard-btn"
              aria-label="Whiteboard"
              aria-expanded={activePopout === 'board'}
              aria-pressed={boardMode !== 'webpage'}
              style={activeStyle(boardMode !== 'webpage')}
              onMouseEnter={(e) =>
                scheduleHoverOpen('board', e.currentTarget, 'Whiteboard & Sessions', shortcutFor('whiteboard'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('board', e.currentTarget)}
              className={toolBtnClass(boardMode !== 'webpage')}
            >
              <Presentation className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={boardMode !== 'webpage'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 15. Screenshot */}
            <button
              type="button"
              data-testid="toolbar-screenshot-btn"
              aria-label="Screenshot"
              aria-expanded={activePopout === 'screenshot'}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'screenshot',
                  e.currentTarget,
                  'Screenshot',
                  shortcutFor('screenshot')
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('screenshot', e.currentTarget)}
              className={iconBtnClass(activePopout === 'screenshot')}
            >
              <Camera className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activePopout === 'screenshot'} isDark={isDark} />
            </button>

            {/* 16. Video Recorder */}
            <button
              type="button"
              data-testid="toolbar-recorder-btn"
              aria-label="Video Recorder"
              aria-pressed={isRecording}
              aria-expanded={activePopout === 'recorder'}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'recorder',
                  e.currentTarget,
                  isRecording ? 'Recording Active' : 'Video Recorder'
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('recorder', e.currentTarget)}
              className={`${btnDim} relative inline-flex items-center justify-center rounded-[3px] transition-colors duration-100 cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white shadow-sm'
                  : activePopout === 'recorder'
                  ? isDark
                    ? 'bg-[#2E3340] text-white'
                    : 'bg-[#E2E8F0] text-[#0B0F19]'
                  : isDark
                  ? 'text-[#C6CCD8] hover:text-white hover:bg-[#2A2E39]'
                  : 'text-[#1E2430] hover:text-[#0B0F19] hover:bg-[#E4E9F2]'
              }`}
            >
              <Video className={iconDim} strokeWidth={iconStroke} />
              {isRecording && (
                <span
                  aria-hidden="true"
                  className="absolute top-[1px] right-[1px] w-1.5 h-1.5 rounded-full bg-rose-300"
                />
              )}
              <SubmenuCornerNotch active={isRecording || activePopout === 'recorder'} isDark={isDark} />
            </button>

            {/* 17. Settings */}
            <button
              type="button"
              data-testid="toolbar-settings-btn"
              aria-label="Settings"
              aria-expanded={activePopout === 'settings'}
              onMouseEnter={(e) =>
                scheduleHoverOpen('settings', e.currentTarget, 'Preferences & Settings')
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('settings', e.currentTarget)}
              className={iconBtnClass(activePopout === 'settings')}
            >
              <Settings className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activePopout === 'settings'} isDark={isDark} />
            </button>

            <div className={dividerClass} />

            {/* 18. Signature Epic Pen Bottom Color Selector (2x2 CMYK mini grid + active swatch) */}
            <button
              type="button"
              aria-label="Color"
              aria-expanded={activePopout === 'color'}
              onMouseEnter={(e) =>
                scheduleHoverOpen('color', e.currentTarget, `Color (${activeBrush.color})`)
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => openPopoutFor('color', e.currentTarget)}
              className={`w-[26px] p-[2px] flex flex-col items-stretch gap-[2px] rounded-[3px] border cursor-pointer transition-colors shrink-0 ${
                activePopout === 'color'
                  ? isDark
                    ? 'border-sky-400 bg-[#2A2E39]'
                    : 'border-sky-500 bg-[#E4E9F2]'
                  : isDark
                  ? 'border-[#333846] hover:border-[#4A5164]'
                  : 'border-[#CFD5E2] hover:border-[#94A3B8]'
              }`}
            >
              <div className="grid grid-cols-2 w-full h-[10px] overflow-hidden rounded-[1px]">
                <span className="bg-[#00E5FF]" />
                <span className="bg-[#FFEA00]" />
                <span className="bg-[#FF007F]" />
                <span className="bg-[#0F172A]" />
              </div>
              <span
                className="w-full h-[11px] rounded-[1px] border border-black/15"
                style={{ backgroundColor: activeBrush.color }}
              />
            </button>
          </div>
        )}
      </div>

      {/* Compact Hover Tooltip matching Epic Pen */}
      {settings.showTooltips && tooltip && !activePopout && (
        <div
          data-testid="proscreen-hover-tooltip"
          role="tooltip"
          style={{
            position: 'fixed',
            top: tooltip.top,
            left: tooltip.left,
            right: tooltip.right,
            zIndex: 2147483641,
          }}
          className={`pointer-events-none px-2 py-0.5 rounded-[4px] border text-[11px] font-medium whitespace-nowrap flex items-center gap-1.5 shadow-md backdrop-blur-md ${
            isDark
              ? 'bg-[#1B1D24]/96 border-[#2E323E] text-[#E4E7EF]'
              : 'bg-[#F8F9FB]/96 border-[#CFD5E2] text-[#111827]'
          }`}
        >
          <span>{tooltip.label}</span>
          {tooltip.shortcut && (
            <kbd
              className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                isDark ? 'bg-[#282C37] text-[#B8BFCE]' : 'bg-[#E6EAF2] text-[#475569]'
              }`}
            >
              {tooltip.shortcut}
            </kbd>
          )}
        </div>
      )}

      {/* Contextual Epic-Style Hover Flyouts */}
      {!isCompactState && (
        <ToolbarPopouts
          activePopout={activePopout}
          popoutPosition={popoutPosition}
          activeTool={activeTool}
          boardMode={boardMode}
          boardPageIndex={boardPageIndex}
          boardPageCount={boardPageCount}
          hasBoardBackground={hasBoardBackground}
          settings={settings}
          resolvedTheme={resolvedTheme}
          activeBrush={activeBrush}
          hasSelectedObject={hasSelectedObject}
          ghostMode={ghostMode}
          presentationMode={presentationMode}
          activeTimerCountdownMs={activeTimerCountdownMs}
          recordingStatus={recordingStatus}
          recordingElapsedMs={recordingElapsedMs}
          latestRecording={latestRecording}
          recordingSupported={recordingSupported}
          supportedRecordingFormats={supportedRecordingFormats}
          canUndoStroke={canUndoStroke}
          canRedoStroke={canRedoStroke}
          canUndoShape={canUndoShape}
          canRedoShape={canRedoShape}
          annotationCount={annotationCount}
          savedSessions={savedSessions}
          onMouseEnterPopout={cancelHoverClose}
          onMouseLeavePopout={scheduleHoverClose}
          onClose={() => onSetActivePopout(null)}
          onSelectTool={onSelectTool}
          onSwitchBoard={onSwitchBoard}
          onPrevBoardPage={onPrevBoardPage}
          onNextBoardPage={onNextBoardPage}
          onAddBoardPage={onAddBoardPage}
          onClearBoard={onClearBoard}
          onSaveBoard={onSaveBoard}
          onExportBoardPng={onExportBoardPng}
          onImportBoardBackground={onImportBoardBackground}
          onClearBoardBackground={onClearBoardBackground}
          onUpdateSettings={onUpdateSettings}
          onChangeColor={onChangeColor}
          onChangeThickness={onChangeThickness}
          onChangeOpacity={onChangeOpacity}
          onToggleFavorite={onToggleFavorite}
          onDeleteSelected={onDeleteSelected}
          onClearScreen={onClearScreen}
          onUndo={onUndo}
          onRedo={onRedo}
          onToggleGhostMode={onToggleGhostMode}
          onTogglePresentationMode={onTogglePresentationMode}
          onToggleTimerEnabled={onToggleTimerEnabled}
          onSetTimerDurationMs={onSetTimerDurationMs}
          onToggleTimerPaused={onToggleTimerPaused}
          onResetTimer={onResetTimer}
          onCancelTimer={onCancelTimer}
          onCaptureFull={onCaptureFull}
          onCaptureArea={onCaptureArea}
          onCopyScreenshot={onCopyScreenshot}
          onSavePng={onSavePng}
          onStartRecording={onStartRecording}
          onPauseRecording={onPauseRecording}
          onResumeRecording={onResumeRecording}
          onStopRecording={onStopRecording}
          onCancelRecording={onCancelRecording}
          onDownloadLatestRecording={onDownloadLatestRecording}
          onPreviewLatestRecording={onPreviewLatestRecording}
          onClearTemporaryRecording={onClearTemporaryRecording}
          onSaveSession={onSaveSession}
          onRestoreSession={onRestoreSession}
          onDeleteSession={onDeleteSession}
          onExportAnnotations={onExportAnnotations}
          onImportAnnotations={onImportAnnotations}
          onOpenFullSettings={onOpenSettings}
        />
      )}
    </div>
  );
};
