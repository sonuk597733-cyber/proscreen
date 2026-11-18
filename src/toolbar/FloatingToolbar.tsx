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
  Keyboard,
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
import { getKeyboardVisualizerButtonModel } from '../desktop/keyboardVisualizer';
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
  onSetActivePopout: (popout: PopoutId | null, anchorOffsetY?: number) => void;
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
  onSelectRecordingArea?: () => void;
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
  keyboardVisualizerEnabled?: boolean;
  keyboardVisualizerSupported?: boolean;
  keyboardVisualizerBusy?: boolean;
  keyboardVisualizerError?: string | null;
  onToggleKeyboardVisualizer?: () => void;
  isDesktopToolbarWindow?: boolean;
  desktopOpenSide?: 'left' | 'right';
  onDesktopMove?: (x: number, y: number) => void;
  onSaveDesktopPosition?: (x: number, y: number) => void;
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
  onSelectRecordingArea,
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
  keyboardVisualizerEnabled = false,
  keyboardVisualizerSupported = false,
  keyboardVisualizerBusy = false,
  keyboardVisualizerError,
  onToggleKeyboardVisualizer,
  isDesktopToolbarWindow = false,
  desktopOpenSide,
  onDesktopMove,
  onSaveDesktopPosition,
}) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    startClientX: number;
    startClientY: number;
    startScreenX: number;
    startScreenY: number;
    startPosX: number;
    startPosY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    latestX: number;
    latestY: number;
    moved: boolean;
  } | null>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const isClickPinnedRef = useRef<boolean>(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [popoutPosition, setPopoutPosition] = useState<PopoutPosition>({
    top: 76,
    left: 56,
    openSide: 'right',
    anchorOffsetY: 16,
  });

  const activeDragRef = useRef<{ cleanup: () => void } | null>(null);

  // Clamp toolbar position cleanly when viewport resizes (Web Extension only)
  useEffect(() => {
    if (isDesktopToolbarWindow) return;
    const clampIntoViewport = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = panelRef.current?.offsetWidth ?? 34;
      const height = panelRef.current?.offsetHeight ?? (settings.toolbarCollapsed ? 56 : 420);
      onUpdateSettings((prev) => {
        const curX = prev.toolbarPosition?.x ?? 16;
        const curY = prev.toolbarPosition?.y ?? 76;
        const clampedX = Math.max(8, Math.min(vw - width - 8, curX));
        const clampedY = Math.max(
          8,
          Math.min(vh - Math.min(height, vh - 16) - 8, curY)
        );
        if (clampedX === curX && clampedY === curY) {
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
  }, [onUpdateSettings, settings.toolbarCollapsed, isDesktopToolbarWindow]);

  // Close popout when clicking outside toolbar & popout (Web Extension mode only; Desktop mode handled by DesktopToolbarApp)
  useEffect(() => {
    if (!activePopout || isDesktopToolbarWindow) return;
    const onGlobalPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && toolbarRef.current?.contains(target)) return;
      isClickPinnedRef.current = false;
      onSetActivePopout(null);
    };
    window.addEventListener('pointerdown', onGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', onGlobalPointerDown);
  }, [activePopout, onSetActivePopout, isDesktopToolbarWindow]);

  useEffect(() => {
    const clearHoverState = () => {
      if (hoverOpenTimerRef.current) {
        window.clearTimeout(hoverOpenTimerRef.current);
        hoverOpenTimerRef.current = null;
      }
      if (hoverCloseTimerRef.current) {
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      setTooltip(null);
    };
    window.addEventListener('blur', clearHoverState);
    document.addEventListener('mouseleave', clearHoverState);
    return () => {
      window.removeEventListener('blur', clearHoverState);
      document.removeEventListener('mouseleave', clearHoverState);
      if (activeDragRef.current) activeDragRef.current.cleanup();
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

  const computePopoutCoords = (
    id: PopoutId,
    triggerEl: HTMLElement | null,
    forceOpenSide?: 'left' | 'right'
  ): PopoutPosition => {
    const toolbarRect = panelRef.current?.getBoundingClientRect();
    const triggerRect = triggerEl?.getBoundingClientRect();
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const tbLeft = toolbarRect?.left ?? (isDesktopToolbarWindow ? 4 : (settings?.toolbarPosition?.x ?? 16));
    const tbRight = toolbarRect?.right ?? tbLeft + 34;

    const estHeight = ESTIMATED_POPOUT_HEIGHT[id] ?? 220;
    const estWidth = ESTIMATED_POPOUT_WIDTH[id] ?? 250;

    let openLeft = false;
    if (isDesktopToolbarWindow) {
      vh = Math.max(vh, 520);
      vw = Math.max(vw, 384);
      openLeft = (forceOpenSide ?? desktopOpenSide) === 'left';
    } else {
      openLeft = tbLeft > vw * 0.56;
    }

    const triggerTop = triggerRect?.top ?? toolbarRect?.top ?? (isDesktopToolbarWindow ? 4 : (settings?.toolbarPosition?.y ?? 76));
    const triggerMidY = triggerRect
      ? triggerRect.top + triggerRect.height / 2
      : triggerTop + 12;
    const desiredTop = triggerTop - 4;
    const clampedTop = Math.max(8, Math.min(vh - Math.min(estHeight, vh - 16) - 8, desiredTop));
    const anchorOffsetY = Math.max(12, Math.min(estHeight - 12, Math.round(triggerMidY - clampedTop)));

    if (openLeft && isDesktopToolbarWindow) {
      return {
        top: clampedTop,
        right: 44,
        openSide: 'left',
        anchorOffsetY,
      };
    }
    if (openLeft && !isDesktopToolbarWindow) {
      return {
        top: clampedTop,
        right: Math.max(8, vw - tbLeft - 6),
        openSide: 'left',
        anchorOffsetY,
      };
    }
    return {
      top: clampedTop,
      left: isDesktopToolbarWindow ? 44 : Math.max(8, Math.min(vw - estWidth - 8, tbRight - 6)),
      openSide: 'right',
      anchorOffsetY,
    };
  };

  const showTooltipFor = (el: HTMLElement | null, label: string, shortcut?: string) => {
    if (!settings.showTooltips || dragSessionRef.current || !el) return;
    const toolbarRect = panelRef.current?.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const tbLeft = toolbarRect?.left ?? (isDesktopToolbarWindow ? 4 : (settings?.toolbarPosition?.x ?? 16));
    const tbRight = toolbarRect?.right ?? tbLeft + 34;
    const openLeft = !isDesktopToolbarWindow && tbLeft > vw * 0.56;
    setTooltip({
      label,
      shortcut,
      top: Math.round(rect.top + rect.height / 2 - 11),
      ...(openLeft
        ? { right: Math.max(8, vw - tbLeft + 6) }
        : { left: isDesktopToolbarWindow ? 42 : Math.max(8, tbRight + 6) }),
    });
  };

  const cancelHoverOpenTimer = () => {
    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  };

  const hideTooltip = () => {
    cancelHoverOpenTimer();
    setTooltip(null);
  };

  const openPopoutFor = (id: PopoutId, el: HTMLElement | null, isClick = true) => {
    cancelHoverOpenTimer();
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    if (isClick) {
      isClickPinnedRef.current = true;
    }
    setTooltip(null);
    const coords = computePopoutCoords(id, el, desktopOpenSide);
    setPopoutPosition(coords);
    onSetActivePopout(id, coords.anchorOffsetY);
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
    cancelHoverOpenTimer();
    if (!id) {
      showTooltipFor(el, label, shortcut);
      return;
    }
    if (!activePopout || activePopout !== id) {
      showTooltipFor(el, label, shortcut);
    }
    // If a popout is ALREADY open in desktop mode, hovering another tool should NOT abruptly switch popout
    // unless the user clicks it. This prevents accidental dropdown popping while moving mouse over the toolbar.
    if (isDesktopToolbarWindow && activePopout) {
      return;
    }
    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
    }
    hoverOpenTimerRef.current = window.setTimeout(() => {
      if (dragSessionRef.current) return;
      openPopoutFor(id, el, false);
    }, 350);
  };

  const scheduleHoverClose = () => {
    hideTooltip();
    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    // In desktop window mode, popouts stay open until dismissed by click outside,
    // Escape, or explicit toggle. Auto-closing on hover leave causes an infinite 320ms
    // open/close flicker loop because moving the window on Windows triggers spurious mouseleave events.
    if (isDesktopToolbarWindow) {
      return;
    }
    // If popout was opened by a deliberate tool click, keep it open until click outside or Escape
    if (isClickPinnedRef.current) {
      return;
    }
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
    }
    hoverCloseTimerRef.current = window.setTimeout(() => {
      isClickPinnedRef.current = false;
      onSetActivePopout(null);
    }, 320);
  };

  const cancelHoverClose = () => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  const handleDragPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // In Desktop Electron window, native -webkit-app-region: drag handles window movement directly in Windows DWM!
    if (isDesktopToolbarWindow) {
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Cancel existing active drag if any
    if (activeDragRef.current) {
      activeDragRef.current.cleanup();
    }

    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    hideTooltip();
    onSetActivePopout(null);

    const startWinX = settings?.toolbarPosition?.x ?? 16;
    const startWinY = settings?.toolbarPosition?.y ?? 76;
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    let moved = false;
    let latestX = startWinX;
    let latestY = startWinY;

    const cleanup = () => {
      window.removeEventListener('pointermove', onWindowPointerMove, true);
      window.removeEventListener('pointerup', cleanup, true);
      window.removeEventListener('pointercancel', cleanup, true);
      window.removeEventListener('mouseup', cleanup, true);
      window.removeEventListener('blur', cleanup, true);
      activeDragRef.current = null;
      dragSessionRef.current = null;

      if (moved) {
        let finalX = latestX;
        let finalY = latestY;
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
          toolbarPosition: { x: finalX, y: finalY },
        }));
      }
    };

    const onWindowPointerMove = (ev: PointerEvent) => {
      if (ev.buttons !== undefined && (ev.buttons & 1) === 0) {
        cleanup();
        return;
      }

      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;

      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = panelRef.current?.offsetWidth ?? 34;
      const height = panelRef.current?.offsetHeight ?? 56;
      latestX = Math.round(Math.max(8, Math.min(vw - width - 8, startWinX + dx)));
      latestY = Math.round(
        Math.max(8, Math.min(vh - Math.min(height, vh - 16) - 8, startWinY + dy))
      );

      onUpdateSettings((prev) => ({
        ...prev,
        toolbarPosition: { x: latestX, y: latestY },
      }));
    };

    activeDragRef.current = { cleanup };

    window.addEventListener('pointermove', onWindowPointerMove, true);
    window.addEventListener('pointerup', cleanup, true);
    window.addEventListener('pointercancel', cleanup, true);
    window.addEventListener('mouseup', cleanup, true);
    window.addEventListener('blur', cleanup, true);
  };

  const handleToolbarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && activePopout) {
      e.preventDefault();
      e.stopPropagation();
      isClickPinnedRef.current = false;
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
  const rawTbX = settings?.toolbarPosition?.x ?? 16;
  const rawTbY = settings?.toolbarPosition?.y ?? 76;
  const clampedToolbarX =
    typeof window !== 'undefined'
      ? Math.max(8, Math.min(window.innerWidth - 42, rawTbX))
      : rawTbX;
  const clampedToolbarY =
    typeof window !== 'undefined'
      ? Math.max(
          8,
          Math.min(
            Math.max(8, window.innerHeight - estimatedHeight - 8),
            rawTbY
          )
        )
      : rawTbY;

  const effectiveOpenSide = desktopOpenSide ?? popoutPosition.openSide;

  const shortcutFor = (action: string) =>
    settings.shortcuts.find((s) => s.action === action)?.keys;

  const activeStyle = (active: boolean): React.CSSProperties =>
    ({
      ...(active ? { backgroundColor: accent } : {}),
      cursor: 'pointer',
      WebkitAppRegion: 'no-drag',
    }) as React.CSSProperties;

  const buttonBaseStyle: React.CSSProperties = {
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  const cursorActive =
    activeTool === 'pointer' || activeTool === 'cursor' || activeTool === 'select' || activeTool === 'laser';

  // Scaled brush dot diameter matching Epic Pen's visual dot indicator (5px..12px)
  const brushDotPx = Math.max(5, Math.min(12, Math.round(4 + (activeBrush.thickness / 36) * 8)));

  return (
    <div
      ref={toolbarRef}
      onKeyDown={handleToolbarKeyDown}
      className={`select-none ${isDesktopToolbarWindow ? 'relative w-full h-full' : ''}`}
    >
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
        style={
          isDesktopToolbarWindow
            ? {
                position: 'absolute',
                left: 4,
                top: 4,
                maxHeight: 'calc(100vh - 8px)',
                pointerEvents: 'auto',
              }
            : {
                position: 'fixed',
                left: clampedToolbarX,
                top: clampedToolbarY,
                zIndex: 2147483635,
                maxHeight: 'calc(100vh - 16px)',
                pointerEvents: 'auto',
              }
        }
        className={`w-[34px] flex flex-col items-center px-[3px] py-[4px] rounded-[4px] border ${isDesktopToolbarWindow ? '' : 'backdrop-blur-xl transition-colors duration-150'} overflow-y-auto pointer-events-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${surfaceClasses}`}
      >
        {/* 1. Drag Handle (Dark Circular Cap inspired by Epic Pen handle) */}
        <button
          type="button"
          data-testid="toolbar-drag-handle"
          onPointerDown={isDesktopToolbarWindow ? undefined : handleDragPointerDown}
          onMouseEnter={(e) => scheduleHoverOpen(null, e.currentTarget, 'Drag Toolbar')}
          onMouseLeave={hideTooltip}
          aria-label="Drag toolbar"
          style={
            isDesktopToolbarWindow
              ? ({ touchAction: 'none', WebkitAppRegion: 'drag', cursor: 'grab' } as React.CSSProperties)
              : ({ touchAction: 'none', WebkitAppRegion: 'no-drag', cursor: 'grab' } as React.CSSProperties)
          }
          className="w-[24px] h-[24px] rounded-full bg-[#151821] text-white border border-slate-700/75 shadow-sm inline-flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 hover:bg-[#222736] transition-colors"
        >
          <GripHorizontal className="w-[12px] h-[12px] pointer-events-none" strokeWidth={1.8} />
        </button>

        {/* 2. Eye Toggle (Open Eye -> Close Eye) */}
        <button
          type="button"
          data-testid="toolbar-eye-toggle"
          data-eye-state="open"
          onPointerDown={(e) => e.stopPropagation()}
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

        {onToggleKeyboardVisualizer && (() => {
          const buttonModel = getKeyboardVisualizerButtonModel({
            enabled: keyboardVisualizerEnabled,
            supported: keyboardVisualizerSupported,
            busy: keyboardVisualizerBusy,
            error: keyboardVisualizerError,
          });
          return (
            <button
              type="button"
              data-testid="toolbar-keyboard-visualizer-btn"
              aria-label="Keyboard shortcut visualizer, ProScreen windows only"
              aria-pressed={buttonModel.pressed}
              aria-description={buttonModel.description}
              title={buttonModel.description}
              disabled={buttonModel.disabled}
              style={activeStyle(buttonModel.pressed)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) => scheduleHoverOpen(null, e.currentTarget, buttonModel.label)}
              onMouseLeave={hideTooltip}
              onClick={(e) => {
                e.stopPropagation();
                hideTooltip();
                onSetActivePopout(null);
                onToggleKeyboardVisualizer();
              }}
              className={`${toolBtnClass(buttonModel.pressed)} mt-[2px] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <Keyboard className={iconDim} strokeWidth={iconStroke} />
              {buttonModel.pressed && (
                <span
                  aria-hidden="true"
                  className="absolute top-[1px] right-[1px] w-1.5 h-1.5 rounded-full bg-emerald-400"
                />
              )}
            </button>
          );
        })()}

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
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('cursor', e.currentTarget, 'Pointer (Default Cursor)', shortcutFor('cursor'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'cursor') {
                  onSetActivePopout(null);
                } else {
                  onSelectTool('pointer');
                  openPopoutFor('cursor', e.currentTarget);
                }
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
              onPointerDown={(e) => e.stopPropagation()}
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
              onClick={(e) => {
                if (activePopout === 'timer') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('timer', e.currentTarget);
                }
              }}
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
              data-testid="toolbar-pen-btn"
              aria-label="Pen"
              aria-pressed={activeTool === 'pen'}
              aria-expanded={activePopout === 'pen'}
              style={activeStyle(activeTool === 'pen')}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('pen', e.currentTarget, 'Pen Tool', shortcutFor('pen'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'pen') {
                  onSetActivePopout(null);
                } else {
                  onSelectTool('pen');
                  openPopoutFor('pen', e.currentTarget);
                }
              }}
              className={toolBtnClass(activeTool === 'pen')}
            >
              <PenTool className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'pen'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 6. Highlighter */}
            <button
              type="button"
              data-testid="toolbar-highlighter-btn"
              aria-label="Highlighter"
              aria-pressed={activeTool === 'highlighter'}
              aria-expanded={activePopout === 'highlighter'}
              style={activeStyle(activeTool === 'highlighter')}
              onPointerDown={(e) => e.stopPropagation()}
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
                if (activePopout === 'highlighter') {
                  onSetActivePopout(null);
                } else {
                  onSelectTool('highlighter');
                  openPopoutFor('highlighter', e.currentTarget);
                }
              }}
              className={toolBtnClass(activeTool === 'highlighter')}
            >
              <Highlighter className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'highlighter'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 7. Arrow & Shapes */}
            <button
              type="button"
              data-testid="toolbar-shapes-btn"
              aria-label="Arrow and Shapes"
              aria-expanded={activePopout === 'shapes'}
              aria-pressed={shapeMenuActive}
              style={activeStyle(shapeMenuActive)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('shapes', e.currentTarget, 'Arrow & Shapes', shortcutFor('arrow'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'shapes') {
                  onSetActivePopout(null);
                } else {
                  if (!shapeMenuActive) {
                    onSelectTool('arrow');
                  }
                  openPopoutFor('shapes', e.currentTarget);
                }
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
              data-testid="toolbar-text-btn"
              aria-label="Text"
              aria-pressed={activeTool === 'text'}
              aria-expanded={activePopout === 'text'}
              style={activeStyle(activeTool === 'text')}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('text', e.currentTarget, 'Text Tool', shortcutFor('text'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'text') {
                  onSetActivePopout(null);
                } else {
                  onSelectTool('text');
                  openPopoutFor('text', e.currentTarget);
                }
              }}
              className={toolBtnClass(activeTool === 'text')}
            >
              <Type className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activeTool === 'text'} activeTextDark={accentIsLight} isDark={isDark} />
            </button>

            {/* 9. Eraser */}
            <button
              type="button"
              data-testid="toolbar-eraser-btn"
              aria-label="Eraser"
              aria-pressed={activeTool === 'eraser'}
              aria-expanded={activePopout === 'eraser'}
              style={activeStyle(activeTool === 'eraser')}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('eraser', e.currentTarget, 'Eraser & Clear', shortcutFor('eraser'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'eraser') {
                  onSetActivePopout(null);
                } else {
                  onSelectTool('eraser');
                  openPopoutFor('eraser', e.currentTarget);
                }
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
              style={buttonBaseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'brush',
                  e.currentTarget,
                  `Brush Size (${activeBrush.thickness}px)`
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'brush') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('brush', e.currentTarget);
                }
              }}
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
              data-testid="toolbar-undo-btn"
              aria-label="Undo"
              disabled={!canUndoAll}
              style={{ ...buttonBaseStyle, cursor: canUndoAll ? 'pointer' : 'not-allowed' }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('undo', e.currentTarget, 'Undo', shortcutFor('undo'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={() => {
                hideTooltip();
                onUndo('all');
              }}
              className={iconBtnClass(false, !canUndoAll)}
            >
              <Undo2 className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch isDark={isDark} />
            </button>

            {/* 12. Redo */}
            <button
              type="button"
              data-testid="toolbar-redo-btn"
              aria-label="Redo"
              disabled={!canRedoAll}
              style={{ ...buttonBaseStyle, cursor: canRedoAll ? 'pointer' : 'not-allowed' }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen(null, e.currentTarget, 'Redo', shortcutFor('redo'))
              }
              onMouseLeave={hideTooltip}
              onClick={() => {
                hideTooltip();
                onRedo('all');
              }}
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
              style={{ ...buttonBaseStyle, cursor: annotationCount > 0 ? 'pointer' : 'not-allowed' }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen(null, e.currentTarget, 'Clear All', shortcutFor('clear'))
              }
              onMouseLeave={hideTooltip}
              onClick={() => {
                hideTooltip();
                onClearScreen();
              }}
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
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('board', e.currentTarget, 'Whiteboard & Sessions', shortcutFor('whiteboard'))
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'board') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('board', e.currentTarget);
                }
              }}
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
              style={buttonBaseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'screenshot',
                  e.currentTarget,
                  'Screenshot',
                  shortcutFor('screenshot')
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'screenshot') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('screenshot', e.currentTarget);
                }
              }}
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
              style={buttonBaseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen(
                  'recorder',
                  e.currentTarget,
                  isRecording ? 'Recording Active' : 'Video Recorder'
                )
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'recorder') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('recorder', e.currentTarget);
                }
              }}
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
              style={buttonBaseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('settings', e.currentTarget, 'Preferences & Settings')
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'settings') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('settings', e.currentTarget);
                }
              }}
              className={iconBtnClass(activePopout === 'settings')}
            >
              <Settings className={iconDim} strokeWidth={iconStroke} />
              <SubmenuCornerNotch active={activePopout === 'settings'} isDark={isDark} />
            </button>

            <div className={dividerClass} />

            {/* 18. Signature Epic Pen Bottom Color Selector (2x2 CMYK mini grid + active swatch) */}
            <button
              type="button"
              data-testid="toolbar-color-btn"
              aria-label="Color"
              aria-expanded={activePopout === 'color'}
              style={buttonBaseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) =>
                scheduleHoverOpen('color', e.currentTarget, `Color (${activeBrush.color})`)
              }
              onMouseLeave={scheduleHoverClose}
              onClick={(e) => {
                if (activePopout === 'color') {
                  onSetActivePopout(null);
                } else {
                  openPopoutFor('color', e.currentTarget);
                }
              }}
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

      {/* Contextual Epic-Style Hover Flyouts (In desktop mode, rendered by dedicated dropdownWindow) */}
      {!isCompactState && !isDesktopToolbarWindow && (
        <ToolbarPopouts
          activePopout={activePopout}
          popoutPosition={
            isDesktopToolbarWindow
              ? (desktopOpenSide === 'left'
                  ? { ...popoutPosition, left: undefined, right: 44, openSide: 'left' }
                  : { ...popoutPosition, left: 44, right: undefined, openSide: 'right' })
              : popoutPosition
          }
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
          onSelectRecordingArea={onSelectRecordingArea}
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
