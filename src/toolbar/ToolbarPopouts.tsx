import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Camera,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crop,
  Download,
  Eraser,
  FolderOpen,
  Ghost,
  Globe,
  Grid3X3,
  ImagePlus,
  Italic,
  LocateFixed,
  Mic,
  Minus,
  Monitor,
  Moon,
  MousePointer,
  Move,
  NotebookText,
  Pause,
  Play,
  Plus,
  Presentation,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Upload,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import {
  BoardMode,
  HighlighterStyle,
  PenStyle,
  SavedSession,
  ShapeToolType,
  TextAlign,
  ToolType,
} from '../types/annotation';
import {
  RecordingQuality,
  RecordingResolution,
  ResolvedThemeMode,
  ThemeMode,
  UserSettings,
} from '../types/settings';
import { HistoryScope } from '../canvas/history';
import { TIMER_PRESETS_MS } from '../canvas/timer';
import {
  RecordingArtifact,
  RecordingFormatOption,
  RecordingStatus,
  formatByteSize,
  formatRecordingDuration,
  getResolutionCapabilities,
} from '../recorder/screenRecorder';
import {
  AudioInputDeviceInfo,
  MicAudioMeterData,
  MicAudioMonitor,
  enumerateAudioInputDevices,
  subscribeAudioDeviceChanges,
} from '../recorder/audioEngine';
import { PRESET_COLORS, normalizeHex } from '../utils/color';
import { SHAPE_TOOLS } from '../tools/toolDefinitions';
import { ColorBrushPopover } from './ColorBrushPopover';
import { ShapeIcon } from './ShapeIcon';

export type PopoutId =
  | 'cursor'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'brush'
  | 'shapes'
  | 'text'
  | 'color'
  | 'undo'
  | 'timer'
  | 'screenshot'
  | 'recorder'
  | 'board'
  | 'settings';

export interface PopoutPosition {
  top: number;
  left?: number;
  right?: number;
  openSide: 'left' | 'right';
  anchorOffsetY: number;
}

interface ToolbarPopoutsProps {
  activePopout: PopoutId | null;
  popoutPosition: PopoutPosition;
  activeTool: ToolType;
  boardMode: BoardMode;
  boardPageIndex: number;
  boardPageCount: number;
  hasBoardBackground: boolean;
  settings: UserSettings;
  resolvedTheme: ResolvedThemeMode;
  activeBrush: { color: string; thickness: number; opacity: number };
  hasSelectedObject: boolean;
  ghostMode: boolean;
  presentationMode: boolean;
  activeTimerCountdownMs: number | null;
  recordingStatus: RecordingStatus;
  recordingElapsedMs: number;
  latestRecording: RecordingArtifact | null;
  recordingSupported: boolean;
  supportedRecordingFormats: RecordingFormatOption[];
  canUndoStroke: boolean;
  canRedoStroke: boolean;
  canUndoShape: boolean;
  canRedoShape: boolean;
  annotationCount: number;
  savedSessions: SavedSession[];
  onMouseEnterPopout: () => void;
  onMouseLeavePopout: () => void;
  onClose: () => void;
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
  onClearScreen: () => void;
  onUndo: (scope?: HistoryScope) => void;
  onRedo: (scope?: HistoryScope) => void;
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
  onOpenFullSettings: () => void;
}

const FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'DM Sans',
  'JetBrains Mono',
  'Georgia',
  'Arial',
];

const ACCENT_PRESETS = ['#0EA5E9', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const PEN_SIZE_PRESETS = [
  { size: 2, dot: 4, label: 'Fine 2px' },
  { size: 5, dot: 7, label: 'Medium 5px' },
  { size: 9, dot: 10, label: 'Bold 9px' },
  { size: 14, dot: 14, label: 'Marker 14px' },
  { size: 22, dot: 18, label: 'Heavy 22px' },
];

const HIGHLIGHTER_SIZE_PRESETS = [
  { size: 12, dot: 7, label: 'Slim 12px' },
  { size: 20, dot: 11, label: 'Regular 20px' },
  { size: 32, dot: 15, label: 'Wide 32px' },
  { size: 48, dot: 19, label: 'Broad 48px' },
];

const HIGHLIGHTER_SWATCHES = ['#FACC15', '#FDE047', '#86EFAC', '#67E8F9', '#F9A8D4', '#C4B5FD'];

export const ToolbarPopouts: React.FC<ToolbarPopoutsProps> = ({
  activePopout,
  popoutPosition,
  activeTool,
  boardMode,
  boardPageIndex,
  boardPageCount,
  hasBoardBackground,
  settings,
  resolvedTheme,
  activeBrush,
  hasSelectedObject,
  ghostMode,
  presentationMode,
  activeTimerCountdownMs,
  recordingStatus,
  recordingElapsedMs,
  latestRecording,
  recordingSupported,
  supportedRecordingFormats,
  canUndoStroke,
  canRedoStroke,
  canUndoShape,
  canRedoShape,
  annotationCount,
  savedSessions,
  onMouseEnterPopout,
  onMouseLeavePopout,
  onClose,
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
  onClearScreen,
  onUndo,
  onRedo,
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
  onOpenFullSettings,
}) => {
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [customMin, setCustomMin] = useState(() =>
    Math.floor(settings.timer.durationMs / 60_000)
  );
  const [customSec, setCustomSec] = useState(() =>
    Math.floor((settings.timer.durationMs % 60_000) / 1000)
  );
  const [micDevices, setMicDevices] = useState<AudioInputDeviceInfo[]>([]);
  const [micMeter, setMicMeter] = useState<MicAudioMeterData | null>(null);
  const importJsonRef = useRef<HTMLInputElement | null>(null);
  const importBgRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activePopout !== 'recorder') {
      setMicMeter(null);
      return;
    }

    void enumerateAudioInputDevices().then(setMicDevices);
    const unsub = subscribeAudioDeviceChanges(() => {
      void enumerateAudioInputDevices().then(setMicDevices);
    });

    return unsub;
  }, [activePopout]);

  useEffect(() => {
    if (activePopout !== 'recorder' || !settings.recording.micAudio) {
      setMicMeter(null);
      return;
    }

    const monitor = new MicAudioMonitor();
    void monitor.startMonitoring(settings.recording.micDeviceId, (data) => {
      setMicMeter(data);
    });

    return () => {
      monitor.stop();
      setMicMeter(null);
    };
  }, [activePopout, settings.recording.micAudio, settings.recording.micDeviceId]);

  if (!activePopout) return null;

  const isDark = resolvedTheme === 'dark';
  const accent = settings.accentColor || '#0EA5E9';
  const surfaceClass = isDark
    ? 'bg-[#1B1D24]/98 text-[#E4E7EF] border-[#2E323E] shadow-[0_14px_34px_-6px_rgba(0,0,0,0.65)]'
    : 'bg-[#FBFBFD]/98 text-[#111827] border-[#CBD2E1] shadow-[0_14px_34px_-6px_rgba(15,23,42,0.18)]';
  const activeSurfaceClass =
    activePopout === 'shapes'
      ? 'bg-[#171B24]/98 text-[#E4E7EF] border-[#313B4C] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.72)]'
      : surfaceClass;
  const mutedBtnClass = isDark
    ? 'hover:bg-[#2A2E39] text-[#CBD2E1] border-[#313644]'
    : 'hover:bg-[#EEF2F7] text-[#374151] border-[#D5DCE8]';
  const inputClass = isDark
    ? 'bg-[#14161C] border-[#313644] text-[#E4E7EF]'
    : 'bg-[#F3F5F9] border-[#CBD2E1] text-[#111827]';
  const dividerBorderClass = isDark ? 'border-[#2D313D]' : 'border-[#E2E7F0]';
  const subBarBg = isDark ? 'bg-[#14161C]' : 'bg-[#EEF1F6]';

  // Seamless hover bridge connecting toolbar icon to flyout so cursor transitions never flicker
  const bridgePaddingClass =
    popoutPosition.openSide === 'right' ? 'pl-2' : 'pr-2';

  const renderShapeIcon = (shape: ShapeToolType) => {
    return <ShapeIcon shape={shape} className="w-4 h-4" strokeWidth={1.8} />;
  };

  const activeShapeDef = SHAPE_TOOLS.find((s) => s.id === activeTool);

  const widthClassMap: Record<Exclude<PopoutId, 'color'>, string> = {
    cursor: 'w-[244px]',
    pen: 'w-[248px]',
    highlighter: 'w-[240px]',
    eraser: 'w-[234px]',
    brush: 'w-[228px]',
    shapes: 'w-[216px]',
    text: 'w-[252px]',
    undo: 'w-[228px]',
    timer: 'w-[260px]',
    screenshot: 'w-[288px]',
    recorder: 'w-[270px]',
    board: 'w-[276px]',
    settings: 'w-[248px]',
  };

  return (
    <div
      data-testid={`popout-${activePopout}`}
      role="dialog"
      aria-label={`${activePopout} options`}
      tabIndex={-1}
      onMouseEnter={onMouseEnterPopout}
      onMouseLeave={onMouseLeavePopout}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: popoutPosition.top,
        left: popoutPosition.left,
        right: popoutPosition.right,
        zIndex: 2147483642,
        pointerEvents: 'auto',
        transition: 'opacity 120ms cubic-bezier(0.16, 1, 0.3, 1), transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`pointer-events-auto ${bridgePaddingClass}`}
    >
      {activePopout === 'color' ? (
        <div className="relative">
          <span
            aria-hidden="true"
            style={{ top: Math.max(12, Math.min(540, popoutPosition.anchorOffsetY - 4)) }}
            className={`absolute w-2 h-2 rotate-45 border ${
              popoutPosition.openSide === 'right'
                ? '-left-1 border-r-0 border-t-0'
                : '-right-1 border-l-0 border-b-0'
            } ${isDark ? 'bg-[#1B1D24] border-[#2E323E]' : 'bg-[#FBFBFD] border-[#CBD2E1]'}`}
          />
          <ColorBrushPopover
            open={true}
            activeTool={activeTool}
            settings={settings}
            resolvedTheme={resolvedTheme}
            onSelectToolTarget={(targetTool) => onSelectTool(targetTool)}
            onChangeColor={onChangeColor}
            onChangeThickness={onChangeThickness}
            onChangeOpacity={onChangeOpacity}
            onToggleFavorite={onToggleFavorite}
            onUpdateShapeFill={(fillColor, fillOpacity) =>
              onUpdateSettings((p) => ({
                ...p,
                shape: { ...p.shape, fillColor, fillOpacity },
              }))
            }
            onClose={onClose}
          />
        </div>
      ) : (
        <div
          className={`relative rounded-lg border p-2.5 max-h-[min(520px,calc(100vh-16px))] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden backdrop-blur-xl space-y-2 text-xs ${activeSurfaceClass} ${widthClassMap[activePopout]}`}
        >
          {/* Directional Epic-style notch pointing back to the hovered icon */}
          <span
            aria-hidden="true"
            style={{ top: popoutPosition.anchorOffsetY - 4 }}
            className={`pointer-events-none absolute w-2 h-2 rotate-45 border ${
              popoutPosition.openSide === 'right'
                ? '-left-1 border-r-0 border-t-0'
                : '-right-1 border-l-0 border-b-0'
            } ${activePopout === 'shapes' ? 'bg-[#171B24] border-[#313B4C]' : isDark ? 'bg-[#1B1D24] border-[#2E323E]' : 'bg-[#FBFBFD] border-[#CBD2E1]'}`}
          />

          {/* BRUSH SIZE: Proportional Circular Dots + Thickness & Opacity Sliders */}
          {activePopout === 'brush' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] px-0.5">
                <span className="font-medium opacity-90">Brush Size</span>
                <span className="font-mono tabular-nums text-[#8E96A8]">
                  {activeBrush.thickness}px
                </span>
              </div>
              <div className={`grid grid-cols-5 gap-1 p-1 rounded-md ${subBarBg}`}>
                {PEN_SIZE_PRESETS.map((preset) => {
                  const active = Math.abs(activeBrush.thickness - preset.size) <= 1;
                  return (
                    <button
                      key={preset.size}
                      type="button"
                      title={preset.label}
                      aria-label={`Brush size ${preset.size}px`}
                      onClick={() => {
                        onChangeThickness(preset.size);
                        onClose();
                      }}
                      style={active ? { backgroundColor: accent } : undefined}
                      className={`h-7 rounded flex items-center justify-center cursor-pointer ${
                        active ? 'text-white shadow-sm' : 'hover:bg-slate-500/15'
                      }`}
                    >
                      <span
                        className="rounded-full"
                        style={{
                          width: preset.dot,
                          height: preset.dot,
                          backgroundColor: active
                            ? '#FFFFFF'
                            : isDark
                            ? '#E4E7EF'
                            : '#111827',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div>
                <input
                  type="range"
                  aria-label="Active brush thickness"
                  min={1}
                  max={activeTool === 'highlighter' ? 64 : activeTool === 'eraser' ? 72 : 36}
                  value={activeBrush.thickness}
                  onChange={(e) => onChangeThickness(Number(e.target.value))}
                  onPointerUp={onClose}
                  onKeyUp={(e) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                      onClose();
                    }
                  }}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
              {activeTool !== 'eraser' && activeTool !== 'laser' && (
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[#8E96A8]">Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(activeBrush.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Active brush opacity"
                    min={15}
                    max={100}
                    value={Math.round(activeBrush.opacity * 100)}
                    onChange={(e) => onChangeOpacity(Number(e.target.value) / 100)}
                    onPointerUp={onClose}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                        onClose();
                      }
                    }}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* 1. CURSOR & STAGE: Compact Horizontal Mode Strip + Quick Stage Toggles */}
          {activePopout === 'cursor' && (
            <div className="space-y-2">
              <div className={`grid grid-cols-3 gap-1 p-0.5 rounded-lg ${subBarBg}`}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool('cursor');
                    onClose();
                  }}
                  style={activeTool === 'cursor' ? { backgroundColor: accent } : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10px] font-medium cursor-pointer transition-colors ${
                    activeTool === 'cursor'
                      ? 'text-white shadow-sm'
                      : 'text-[#8E96A8] hover:text-current'
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Cursor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool('select');
                    onClose();
                  }}
                  style={activeTool === 'select' ? { backgroundColor: accent } : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10px] font-medium cursor-pointer transition-colors ${
                    activeTool === 'select'
                      ? 'text-white shadow-sm'
                      : 'text-[#8E96A8] hover:text-current'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Move</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool('laser');
                    onClose();
                  }}
                  style={activeTool === 'laser' ? { backgroundColor: accent } : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10px] font-medium cursor-pointer transition-colors ${
                    activeTool === 'laser'
                      ? 'text-white shadow-sm'
                      : 'text-[#8E96A8] hover:text-current'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Laser</span>
                </button>
              </div>

              <div className={`pt-2 border-t space-y-1.5 ${dividerBorderClass}`}>
                <label className="flex items-center justify-between text-[11px] cursor-pointer">
                  <span className="inline-flex items-center gap-1.5">
                    <LocateFixed className="w-3.5 h-3.5 text-[#8E96A8]" />
                    <span>Cursor Spotlight</span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Toggle cursor spotlight"
                    checked={settings.creator.cursorSpotlightEnabled}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        creator: { ...p.creator, cursorSpotlightEnabled: e.target.checked },
                      }))
                    }
                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] cursor-pointer">
                  <span>Cursor Highlight Ring</span>
                  <input
                    type="checkbox"
                    aria-label="Toggle cursor highlight ring"
                    checked={settings.creator.cursorHighlightEnabled}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        creator: { ...p.creator, cursorHighlightEnabled: e.target.checked },
                      }))
                    }
                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                  />
                </label>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onToggleGhostMode();
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
                      ghostMode ? 'bg-blue-600 text-white border-blue-500' : mutedBtnClass
                    }`}
                  >
                    <Ghost className="w-3 h-3" />
                    <span>Ghost Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTogglePresentationMode();
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
                      presentationMode ? 'bg-blue-600 text-white border-blue-500' : mutedBtnClass
                    }`}
                  >
                    <Presentation className="w-3 h-3" />
                    <span>Present</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. PEN: Proportional Dot Sizes + Pen Style Strip + Sliders + Quick Colors */}
          {activePopout === 'pen' && (
            <div className="space-y-2">
              {/* Epic Pen Proportional Size Dots Row */}
              <div className={`grid grid-cols-5 gap-1 p-1 rounded-lg ${subBarBg}`}>
                {PEN_SIZE_PRESETS.map((preset) => {
                  const active = Math.abs(settings.pen.thickness - preset.size) <= 1;
                  return (
                    <button
                      key={preset.size}
                      type="button"
                      title={preset.label}
                      aria-label={preset.label}
                      onClick={() => {
                        onSelectTool('pen');
                        onUpdateSettings((p) => ({
                          ...p,
                          pen: { ...p.pen, thickness: preset.size },
                        }));
                        onClose();
                      }}
                      style={active ? { backgroundColor: accent } : undefined}
                      className={`h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                        active ? 'text-white shadow-sm' : 'hover:bg-slate-500/15'
                      }`}
                    >
                      <span
                        className="rounded-full"
                        style={{
                          width: preset.dot,
                          height: preset.dot,
                          backgroundColor: active
                            ? '#FFFFFF'
                            : isDark
                            ? '#E4E7EF'
                            : '#181B22',
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Pen Style */}
              <div className="grid grid-cols-3 gap-1">
                {(['solid', 'calligraphy', 'dashed'] as PenStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      onSelectTool('pen');
                      onUpdateSettings((p) => ({ ...p, pen: { ...p.pen, penStyle: style } }));
                      onClose();
                    }}
                    style={
                      (settings.pen.penStyle ?? 'solid') === style
                        ? { backgroundColor: accent }
                        : undefined
                    }
                    className={`px-2 py-1 rounded-md capitalize border text-[11px] cursor-pointer ${
                      (settings.pen.penStyle ?? 'solid') === style
                        ? 'text-white border-transparent'
                        : mutedBtnClass
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[#8E96A8]">Thickness</span>
                    <span className="font-mono tabular-nums">{settings.pen.thickness}px</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Pen thickness"
                    min={1}
                    max={36}
                    value={settings.pen.thickness}
                    onChange={(e) => {
                      onSelectTool('pen');
                      onUpdateSettings((p) => ({
                        ...p,
                        pen: { ...p.pen, thickness: Number(e.target.value) },
                      }));
                    }}
                    onPointerUp={onClose}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                        onClose();
                      }
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[#8E96A8]">Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(settings.pen.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Pen opacity"
                    min={10}
                    max={100}
                    value={Math.round(settings.pen.opacity * 100)}
                    onChange={(e) => {
                      onSelectTool('pen');
                      onUpdateSettings((p) => ({
                        ...p,
                        pen: { ...p.pen, opacity: Number(e.target.value) / 100 },
                      }));
                    }}
                    onPointerUp={onClose}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                        onClose();
                      }
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className={`pt-1.5 border-t ${dividerBorderClass}`}>
                <div className="flex items-center justify-between text-[11px] text-[#8E96A8] mb-1">
                  <span>Quick Colors</span>
                  <input
                    type="color"
                    aria-label="Pen custom color"
                    value={normalizeHex(settings.pen.color) ?? '#2563EB'}
                    onChange={(e) => {
                      onSelectTool('pen');
                      onChangeColor(e.target.value.toUpperCase());
                    }}
                    onBlur={onClose}
                    className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {PRESET_COLORS.slice(0, 16).map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      aria-label={`Pen color ${c.name}`}
                      onClick={() => {
                        onSelectTool('pen');
                        onChangeColor(c.hex);
                        onClose();
                      }}
                      style={{ backgroundColor: c.hex }}
                      className={`w-full aspect-square rounded-sm border cursor-pointer ${
                        normalizeHex(settings.pen.color) === normalizeHex(c.hex)
                          ? 'ring-2 ring-blue-500 border-white'
                          : 'border-slate-500/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. HIGHLIGHTER: Proportional Size Dots + Tip Strip + Sliders + Swatches */}
          {activePopout === 'highlighter' && (
            <div className="space-y-2">
              <div className={`grid grid-cols-4 gap-1 p-1 rounded-lg ${subBarBg}`}>
                {HIGHLIGHTER_SIZE_PRESETS.map((preset) => {
                  const active = Math.abs(settings.highlighter.thickness - preset.size) <= 3;
                  return (
                    <button
                      key={preset.size}
                      type="button"
                      title={preset.label}
                      aria-label={preset.label}
                      onClick={() => {
                        onSelectTool('highlighter');
                        onUpdateSettings((p) => ({
                          ...p,
                          highlighter: { ...p.highlighter, thickness: preset.size },
                        }));
                        onClose();
                      }}
                      style={active ? { backgroundColor: accent } : undefined}
                      className={`h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                        active ? 'text-white shadow-sm' : 'hover:bg-slate-500/15'
                      }`}
                    >
                      <span
                        className="rounded-full opacity-85"
                        style={{
                          width: preset.dot,
                          height: preset.dot,
                          backgroundColor: active ? '#FFFFFF' : settings.highlighter.color,
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-1">
                {(['soft', 'chisel'] as HighlighterStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      onSelectTool('highlighter');
                      onUpdateSettings((p) => ({
                        ...p,
                        highlighter: { ...p.highlighter, highlighterStyle: style },
                      }));
                      onClose();
                    }}
                    style={
                      (settings.highlighter.highlighterStyle ?? 'soft') === style
                        ? { backgroundColor: accent }
                        : undefined
                    }
                    className={`px-2 py-1 rounded-md capitalize border text-[11px] cursor-pointer ${
                      (settings.highlighter.highlighterStyle ?? 'soft') === style
                        ? 'text-white border-transparent'
                        : mutedBtnClass
                    }`}
                  >
                    {style} tip
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[#8E96A8]">Thickness</span>
                    <span className="font-mono tabular-nums">{settings.highlighter.thickness}px</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Highlighter thickness"
                    min={8}
                    max={64}
                    value={settings.highlighter.thickness}
                    onChange={(e) => {
                      onSelectTool('highlighter');
                      onUpdateSettings((p) => ({
                        ...p,
                        highlighter: { ...p.highlighter, thickness: Number(e.target.value) },
                      }));
                    }}
                    onPointerUp={onClose}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                        onClose();
                      }
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[#8E96A8]">Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(settings.highlighter.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Highlighter opacity"
                    min={15}
                    max={85}
                    value={Math.round(settings.highlighter.opacity * 100)}
                    onChange={(e) => {
                      onSelectTool('highlighter');
                      onUpdateSettings((p) => ({
                        ...p,
                        highlighter: { ...p.highlighter, opacity: Number(e.target.value) / 100 },
                      }));
                    }}
                    onPointerUp={onClose}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                        onClose();
                      }
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                {HIGHLIGHTER_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Highlighter color ${hex}`}
                    onClick={() => {
                      onSelectTool('highlighter');
                      onUpdateSettings((p) => ({
                        ...p,
                        highlighter: { ...p.highlighter, color: hex },
                      }));
                      onClose();
                    }}
                    style={{ backgroundColor: hex }}
                    className={`w-full aspect-square rounded-sm border cursor-pointer ${
                      normalizeHex(settings.highlighter.color) === hex
                        ? 'ring-2 ring-blue-500 border-white'
                        : 'border-slate-500/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 4. ERASER: Visual Dot Sizes + Diameter Slider + Horizontal Clear Row */}
          {activePopout === 'eraser' && (
            <div className="space-y-2">
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg ${subBarBg}`}>
                {[
                  { label: 'Small', size: 10, dot: 7 },
                  { label: 'Medium', size: 24, dot: 12 },
                  { label: 'Large', size: 48, dot: 17 },
                ].map((preset) => {
                  const active = settings.eraserSize === preset.size;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-label={preset.label}
                      onClick={() => {
                        onSelectTool('eraser');
                        onUpdateSettings((p) => ({ ...p, eraserSize: preset.size }));
                        onClose();
                      }}
                      style={active ? { backgroundColor: accent } : undefined}
                      className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium cursor-pointer transition-colors ${
                        active ? 'text-white shadow-sm' : 'text-[#8E96A8] hover:text-current'
                      }`}
                    >
                      <span
                        className="rounded-full border border-current"
                        style={{ width: preset.dot, height: preset.dot }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8E96A8]">Eraser Diameter</span>
                  <span className="font-mono tabular-nums">{settings.eraserSize}px</span>
                </div>
                <input
                  type="range"
                  aria-label="Eraser diameter"
                  min={6}
                  max={72}
                  value={settings.eraserSize}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({ ...p, eraserSize: Number(e.target.value) }))
                  }
                  onPointerUp={onClose}
                  onKeyUp={(e) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                      onClose();
                    }
                  }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className={`grid grid-cols-2 gap-1.5 pt-1 border-t ${dividerBorderClass}`}>
                <button
                  type="button"
                  disabled={!hasSelectedObject}
                  onClick={() => {
                    onDeleteSelected();
                    onClose();
                  }}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-[11px] disabled:opacity-40 cursor-pointer ${mutedBtnClass}`}
                >
                  <Eraser className="w-3 h-3" />
                  <span>Delete Sel</span>
                </button>

                <button
                  type="button"
                  data-testid="popout-clear-all-btn"
                  disabled={annotationCount === 0}
                  onClick={() => {
                    onClose();
                    onClearScreen();
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 text-[11px] disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All ({annotationCount})</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. SHAPES: exactly eight signature shape choices in a balanced 4×2 grid. */}
          {activePopout === 'shapes' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] px-0.5">
                <span className="font-medium opacity-90">
                  {activeShapeDef ? activeShapeDef.label : 'Arrows & Shapes'}
                </span>
                <span className="font-mono tabular-nums text-[#8E96A8]">
                  {settings.shape.thickness}px
                </span>
              </div>

              <div
                role="group"
                aria-label="Choose a shape"
                data-testid="shape-choice-grid"
                className="grid grid-cols-4 grid-rows-2 gap-1 rounded-lg border border-white/[0.07] bg-[#111722] p-1 shadow-inner"
              >
                {SHAPE_TOOLS.map((shape) => {
                  const active = activeTool === shape.id;
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      title={shape.label}
                      aria-label={shape.label}
                      aria-pressed={active}
                      data-shape-choice={shape.id}
                      onClick={() => {
                        onSelectTool(shape.id);
                        onClose();
                      }}
                      style={active ? { backgroundColor: accent } : undefined}
                      className={`h-8 min-w-8 flex items-center justify-center rounded-md border transition-all duration-150 cursor-pointer ${
                        active
                          ? 'text-white border-cyan-300/55 shadow-[0_0_10px_rgba(56,189,248,0.18)]'
                          : 'text-[#B8BFCE] border-transparent hover:text-white hover:bg-[#2A3445] hover:border-cyan-300/25'
                      }`}
                    >
                      {renderShapeIcon(shape.id)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-[#8E96A8] shrink-0">Width</span>
                <input
                  type="range"
                  aria-label="Shape stroke width"
                  min={1}
                  max={20}
                  value={settings.shape.thickness}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      shape: { ...p.shape, thickness: Number(e.target.value) },
                    }))
                  }
                  onPointerUp={onClose}
                  onKeyUp={(e) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                      onClose();
                    }
                  }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 6. TEXT: Compact Typography Strip */}
          {activePopout === 'text' && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_58px] gap-1.5">
                <select
                  aria-label="Default text font family"
                  value={settings.text.fontFamily}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      text: { ...p.text, fontFamily: e.target.value },
                    }))
                  }
                  className={`px-2 py-1 text-[11px] rounded-md border ${inputClass}`}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  aria-label="Default text font size"
                  min={12}
                  max={72}
                  value={settings.text.fontSize}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      text: {
                        ...p.text,
                        fontSize: Math.max(12, Math.min(72, Number(e.target.value) || 22)),
                      },
                    }))
                  }
                  className={`px-2 py-1 text-[11px] font-mono tabular-nums rounded-md border ${inputClass}`}
                />
              </div>

              <div className={`grid grid-cols-5 gap-1 p-0.5 rounded-lg ${subBarBg}`}>
                <button
                  type="button"
                  aria-label="Default bold text"
                  onClick={() =>
                    onUpdateSettings((p) => ({ ...p, text: { ...p.text, bold: !p.text.bold } }))
                  }
                  style={settings.text.bold ? { backgroundColor: accent } : undefined}
                  className={`py-1 rounded-md flex items-center justify-center cursor-pointer ${
                    settings.text.bold ? 'text-white' : 'text-[#8E96A8] hover:text-current'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Default italic text"
                  onClick={() =>
                    onUpdateSettings((p) => ({ ...p, text: { ...p.text, italic: !p.text.italic } }))
                  }
                  style={settings.text.italic ? { backgroundColor: accent } : undefined}
                  className={`py-1 rounded-md flex items-center justify-center cursor-pointer ${
                    settings.text.italic ? 'text-white' : 'text-[#8E96A8] hover:text-current'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                  <button
                    key={align}
                    type="button"
                    aria-label={`Align ${align}`}
                    onClick={() =>
                      onUpdateSettings((p) => ({ ...p, text: { ...p.text, align } }))
                    }
                    style={settings.text.align === align ? { backgroundColor: accent } : undefined}
                    className={`py-1 rounded-md flex items-center justify-center cursor-pointer ${
                      settings.text.align === align
                        ? 'text-white'
                        : 'text-[#8E96A8] hover:text-current'
                    }`}
                  >
                    {align === 'left' ? (
                      <AlignLeft className="w-3.5 h-3.5" />
                    ) : align === 'center' ? (
                      <AlignCenter className="w-3.5 h-3.5" />
                    ) : (
                      <AlignRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8E96A8]">Text Color</span>
                  <input
                    type="color"
                    aria-label="Default text color"
                    value={settings.text.color}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        text: { ...p.text, color: e.target.value.toUpperCase() },
                      }))
                    }
                    className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                  />
                </label>
                <select
                  aria-label="Default text background"
                  value={settings.text.backgroundColor}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      text: { ...p.text, backgroundColor: e.target.value },
                    }))
                  }
                  className={`px-1.5 py-1 text-[11px] rounded-md border ${inputClass}`}
                >
                  <option value="#FFFFFF">White Fill</option>
                  <option value="#0F172A">Dark Fill</option>
                  <option value="#FEF08A">Yellow Note</option>
                  <option value="transparent">No Fill</option>
                </select>
              </div>
            </div>
          )}

          {/* 7. UNDO HISTORY SCOPES: Compact Strip */}
          {activePopout === 'undo' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8E96A8]">Strokes</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!canUndoStroke}
                    onClick={() => onUndo('stroke')}
                    className={`px-2 py-1 rounded-md border text-[11px] disabled:opacity-35 cursor-pointer ${mutedBtnClass}`}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    disabled={!canRedoStroke}
                    onClick={() => onRedo('stroke')}
                    className={`px-2 py-1 rounded-md border text-[11px] disabled:opacity-35 cursor-pointer ${mutedBtnClass}`}
                  >
                    Redo
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8E96A8]">Shapes & Text</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!canUndoShape}
                    onClick={() => onUndo('shape')}
                    className={`px-2 py-1 rounded-md border text-[11px] disabled:opacity-35 cursor-pointer ${mutedBtnClass}`}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    disabled={!canRedoShape}
                    onClick={() => onRedo('shape')}
                    className={`px-2 py-1 rounded-md border text-[11px] disabled:opacity-35 cursor-pointer ${mutedBtnClass}`}
                  >
                    Redo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 8. TIMER: Compact Controls with Presets + Custom + Pause/Reset/Cancel */}
          {activePopout === 'timer' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
                <div>
                  <div className="font-semibold text-[11px] text-slate-100">Ink duration</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {settings.timer.enabled ? 'New ink follows the selected duration.' : 'New ink stays until you clear it.'}
                  </div>
                </div>
                <span
                  role="status"
                  aria-label={settings.timer.enabled ? (settings.timer.paused ? 'Timer paused' : 'Timer active') : 'Timer off'}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold tracking-[.08em] ${
                    settings.timer.enabled
                      ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200'
                      : 'border-white/[0.1] bg-white/[0.035] text-slate-400'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${settings.timer.enabled ? 'bg-emerald-300' : 'bg-slate-500'}`} />
                  {settings.timer.enabled ? (settings.timer.paused ? 'PAUSED' : 'ON') : 'OFF'}
                </span>
                <button
                  type="button"
                  data-testid="timer-toggle-btn"
                  onClick={onToggleTimerEnabled}
                  style={settings.timer.enabled ? { backgroundColor: accent } : undefined}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 font-semibold text-[11px] transition-all duration-150 hover:-translate-y-px active:translate-y-0 cursor-pointer ${
                    settings.timer.enabled ? 'text-white border-transparent shadow-sm' : mutedBtnClass
                  }`}
                >
                  {settings.timer.enabled ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {settings.timer.enabled ? 'Stop' : 'Start'}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {TIMER_PRESETS_MS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    data-testid={`timer-preset-${preset.label}`}
                    onClick={() => {
                      onSetTimerDurationMs(preset.ms);
                      setCustomMin(Math.floor(preset.ms / 60_000));
                      setCustomSec(Math.floor((preset.ms % 60_000) / 1000));
                      onClose();
                    }}
                    style={
                      settings.timer.durationMs === preset.ms
                        ? { backgroundColor: accent }
                        : undefined
                    }
                    className={`py-1 rounded-md border font-mono text-[11px] tabular-nums cursor-pointer ${
                      settings.timer.durationMs === preset.ms
                        ? 'text-white border-transparent'
                        : mutedBtnClass
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <input
                  type="number"
                  aria-label="Timer custom minutes"
                  min={0}
                  max={60}
                  value={customMin}
                  onChange={(e) => setCustomMin(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                  className={`w-12 px-1.5 py-1 rounded-md border font-mono tabular-nums ${inputClass}`}
                />
                <span className="text-[#8E96A8]">m</span>
                <input
                  type="number"
                  aria-label="Timer custom seconds"
                  min={0}
                  max={59}
                  value={customSec}
                  onChange={(e) => setCustomSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  className={`w-12 px-1.5 py-1 rounded-md border font-mono tabular-nums ${inputClass}`}
                />
                <span className="text-[#8E96A8]">s</span>
                <button
                  type="button"
                  onClick={() => {
                    const totalMs = Math.max(1000, (customMin * 60 + customSec) * 1000);
                    onSetTimerDurationMs(totalMs);
                    onClose();
                  }}
                  className={`ml-auto px-2 py-1 rounded-md border text-[11px] font-medium cursor-pointer ${mutedBtnClass}`}
                >
                  Apply
                </button>
              </div>

              <div className={`grid grid-cols-3 gap-1 pt-1.5 border-t ${dividerBorderClass}`}>
                <button
                  type="button"
                  data-testid="timer-pause-btn"
                  onClick={onToggleTimerPaused}
                  disabled={!settings.timer.enabled}
                  className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
                    settings.timer.paused
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                      : mutedBtnClass
                  }`}
                >
                  {settings.timer.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{settings.timer.paused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  type="button"
                  data-testid="timer-reset-btn"
                  onClick={onResetTimer}
                  disabled={!settings.timer.enabled}
                  className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${mutedBtnClass}`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  data-testid="timer-cancel-btn"
                  onClick={onCancelTimer}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-[11px] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* 9. SCREENSHOT: Epic Pen Horizontal 4-Tile Strip */}
          {activePopout === 'screenshot' && (
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                data-testid="screenshot-visible-btn"
                title="Capture Visible Tab"
                onClick={() => {
                  onClose();
                  onCaptureFull();
                }}
                style={{ backgroundColor: accent }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-white hover:opacity-90 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[10px] font-medium whitespace-nowrap">Visible</span>
              </button>
              <button
                type="button"
                data-testid="screenshot-region-btn"
                title="Select Area / Region"
                onClick={() => {
                  onClose();
                  onCaptureArea();
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border cursor-pointer ${mutedBtnClass}`}
              >
                <Crop className="w-4 h-4" />
                <span className="text-[10px] font-medium whitespace-nowrap">Select Area</span>
              </button>
              <button
                type="button"
                data-testid="screenshot-copy-btn"
                title="Copy Annotated Screenshot to Clipboard"
                onClick={() => {
                  onClose();
                  onCopyScreenshot();
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border cursor-pointer ${mutedBtnClass}`}
              >
                <Copy className="w-4 h-4" />
                <span className="text-[10px] font-medium whitespace-nowrap">Copy</span>
              </button>
              <button
                type="button"
                data-testid="screenshot-save-png-btn"
                title="Save Annotated PNG"
                onClick={() => {
                  onClose();
                  onSavePng();
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border cursor-pointer ${mutedBtnClass}`}
              >
                <Download className="w-4 h-4" />
                <span className="text-[10px] font-medium whitespace-nowrap">Save PNG</span>
              </button>
            </div>
          )}

          {/* 10. RECORDER: Studio-Quality Desktop Recorder */}
          {activePopout === 'recorder' && (
            <div className="space-y-2">
              {/* 4 Mode Grid: Tab, Window, Screen, Area */}
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { mode: 'tab', label: 'Tab', icon: <Video className="w-3 h-3" /> },
                    { mode: 'window', label: 'Window', icon: <Square className="w-3 h-3" /> },
                    { mode: 'screen', label: 'Screen', icon: <Monitor className="w-3 h-3" /> },
                    { mode: 'area', label: 'Area', icon: <Crop className="w-3 h-3" /> },
                  ] as const
                ).map((opt) => {
                  const selected = settings.recording.mode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      disabled={recordingStatus !== 'idle'}
                      onClick={() => {
                        onUpdateSettings((p) => ({
                          ...p,
                          recording: { ...p.recording, mode: opt.mode },
                        }));
                        if (opt.mode === 'area') {
                          onClose();
                          onSelectRecordingArea?.();
                        }
                      }}
                      style={selected ? { backgroundColor: accent } : undefined}
                      className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md border text-[11px] cursor-pointer disabled:opacity-50 transition-colors ${
                        selected ? 'text-white border-transparent font-medium shadow-sm' : mutedBtnClass
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {recordingStatus === 'idle' ? (
                <>
                  {/* Selected Region Status (when Area mode is active) */}
                  {settings.recording.mode === 'area' && (
                    <div className="flex items-center justify-between p-2 rounded-md bg-black/10 border border-slate-500/15 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Crop className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[#8E96A8]">Region: </span>
                          <span className="font-mono tabular-nums font-medium">
                            {settings.recording.areaRect
                              ? `${Math.round(settings.recording.areaRect.width)} × ${Math.round(settings.recording.areaRect.height)}`
                              : 'None'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid="recorder-select-area-btn"
                        disabled={recordingStatus !== 'idle'}
                        onClick={() => {
                          onClose();
                          onSelectRecordingArea?.();
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer shrink-0 ${mutedBtnClass}`}
                      >
                        {settings.recording.areaRect ? 'Adjust' : 'Select'}
                      </button>
                    </div>
                  )}

                  {/* Audio Controls */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <label className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded-md border border-slate-500/15 bg-black/5">
                        <span className="inline-flex items-center gap-1.5 text-[#8E96A8]">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>System</span>
                        </span>
                        <input
                          type="checkbox"
                          disabled={recordingStatus !== 'idle'}
                          checked={settings.recording.tabAudio}
                          onChange={(e) =>
                            onUpdateSettings((p) => ({
                              ...p,
                              recording: { ...p.recording, tabAudio: e.target.checked },
                            }))
                          }
                          className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded-md border border-slate-500/15 bg-black/5">
                        <span className="inline-flex items-center gap-1.5 text-[#8E96A8]">
                          <Mic className="w-3.5 h-3.5" />
                          <span>Mic</span>
                        </span>
                        <input
                          type="checkbox"
                          disabled={recordingStatus !== 'idle'}
                          checked={settings.recording.micAudio}
                          onChange={(e) =>
                            onUpdateSettings((p) => ({
                              ...p,
                              recording: { ...p.recording, micAudio: e.target.checked },
                            }))
                          }
                          className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                        />
                      </label>
                    </div>

                    {settings.recording.micAudio && (
                      <div className="space-y-1.5 p-2 rounded-md bg-black/10 border border-slate-500/15 text-[11px]">
                        {micDevices.length > 0 && (
                          <div>
                            <label className="block text-[10px] text-[#8E96A8] mb-0.5">Input Device</label>
                            <select
                              aria-label="Microphone device"
                              disabled={recordingStatus !== 'idle'}
                              value={settings.recording.micDeviceId || ''}
                              onChange={(e) =>
                                onUpdateSettings((p) => ({
                                  ...p,
                                  recording: {
                                    ...p.recording,
                                    micDeviceId: e.target.value || undefined,
                                  },
                                }))
                              }
                              className={`w-full px-1.5 py-1 text-[11px] rounded-md border truncate ${inputClass}`}
                            >
                              <option value="">Default Microphone</option>
                              {micDevices.map((d) => (
                                <option key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between text-[10px] text-[#8E96A8] mb-0.5">
                            <span>Mic Gain</span>
                            <span className="font-mono tabular-nums">
                              {Math.round((settings.recording.micGain ?? 1.0) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            aria-label="Microphone gain"
                            disabled={recordingStatus !== 'idle'}
                            min={0.5}
                            max={2.5}
                            step={0.05}
                            value={settings.recording.micGain ?? 1.0}
                            onChange={(e) =>
                              onUpdateSettings((p) => ({
                                ...p,
                                recording: {
                                  ...p.recording,
                                  micGain: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-blue-500 cursor-pointer h-1.5"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-[#8E96A8] mb-0.5">
                            <span>Input Level</span>
                            <span className="font-mono tabular-nums text-[9px]">
                              {micMeter && !micMeter.isSilent ? `${Math.round(micMeter.db)} dB` : 'Silent'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-700/40 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-75 ${
                                micMeter && (micMeter.isClipping || micMeter.db > -3)
                                  ? 'bg-rose-500'
                                  : micMeter && micMeter.db > -12
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{
                                width: `${Math.max(2, Math.min(100, micMeter ? micMeter.level * 100 : 0))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start Recording Button */}
                  <button
                    type="button"
                    data-testid="recorder-start-btn"
                    disabled={!recordingSupported}
                    onClick={() => {
                      if (settings.recording.mode === 'area' && !settings.recording.areaRect) {
                        onClose();
                        onSelectRecordingArea?.();
                        return;
                      }
                      onClose();
                      onStartRecording();
                    }}
                    style={recordingSupported ? { backgroundColor: accent } : undefined}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white font-semibold shadow hover:opacity-95 disabled:opacity-45 cursor-pointer transition-all text-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {!recordingSupported
                        ? 'Recording Unavailable'
                        : settings.recording.mode === 'area' && !settings.recording.areaRect
                        ? 'Select Area to Record'
                        : 'Start Recording'}
                    </span>
                  </button>

                  {/* Latest Recording Shortcut */}
                  {latestRecording && (
                    <div className={`pt-1.5 border-t space-y-1.5 ${dividerBorderClass}`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate font-medium">{latestRecording.filename}</span>
                        <span className="font-mono tabular-nums text-[#8E96A8] shrink-0 ml-2">
                          {formatByteSize(latestRecording.sizeBytes)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          data-testid="recorder-preview-latest-btn"
                          onClick={() => {
                            onClose();
                            onPreviewLatestRecording();
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                        >
                          <Play className="w-3 h-3" />
                          <span>Play</span>
                        </button>
                        <button
                          type="button"
                          data-testid="recorder-download-latest-btn"
                          onClick={onDownloadLatestRecording}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                        >
                          <Download className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={onClearTemporaryRecording}
                          className="px-2 py-1 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-[11px] cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Open Saved Video File */}
                  <button
                    type="button"
                    data-testid="recorder-open-saved-btn"
                    onClick={() => {
                      onClose();
                      if (typeof window !== 'undefined' && window.proscreenDesktop?.openRecordingFileDialog) {
                        void window.proscreenDesktop.openRecordingFileDialog();
                      }
                    }}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${mutedBtnClass}`}
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Open Saved Video...</span>
                  </button>
                </>
              ) : (
                /* ACTIVE RECORDING STATE */
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-rose-400">
                        {recordingStatus === 'paused'
                          ? 'PAUSED'
                          : recordingStatus === 'stopping'
                          ? 'SAVING...'
                          : 'RECORDING'}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-slate-100">
                      {formatRecordingDuration(recordingElapsedMs)}
                    </span>
                  </div>

                  {/* STOP RECORDING — 1 Click */}
                  <button
                    type="button"
                    data-testid="recorder-stop-btn"
                    disabled={recordingStatus === 'stopping'}
                    onClick={() => {
                      onClose();
                      onStopRecording();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{recordingStatus === 'stopping' ? 'Saving Video...' : 'Stop Recording'}</span>
                  </button>

                  {/* Pause/Resume and Discard */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={recordingStatus === 'stopping'}
                      onClick={recordingStatus === 'paused' ? onResumeRecording : onPauseRecording}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-medium cursor-pointer ${mutedBtnClass}`}
                    >
                      {recordingStatus === 'paused' ? (
                        <>
                          <Play className="w-3 h-3" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={recordingStatus === 'stopping'}
                      onClick={() => {
                        onClose();
                        onCancelRecording();
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-[11px] text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Discard</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 11. WHITEBOARD & SESSIONS: Horizontal Surface Strip + Page Controls */}
          {activePopout === 'board' && (
            <div className="space-y-2">
              <div className={`grid grid-cols-5 gap-1 p-1 rounded-lg ${subBarBg}`}>
                {(
                  [
                    { mode: 'webpage', label: 'Web', icon: <Globe className="w-3.5 h-3.5" /> },
                    { mode: 'whiteboard', label: 'White', icon: <Square className="w-3.5 h-3.5" /> },
                    { mode: 'blackboard', label: 'Black', icon: <Monitor className="w-3.5 h-3.5" /> },
                    { mode: 'grid-paper', label: 'Grid', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
                    { mode: 'ruled-notebook', label: 'Ruled', icon: <NotebookText className="w-3.5 h-3.5" /> },
                  ] as { mode: BoardMode; label: string; icon: React.ReactNode }[]
                ).map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    aria-label={opt.label}
                    onClick={() => {
                      onSwitchBoard(opt.mode);
                      onClose();
                    }}
                    style={boardMode === opt.mode ? { backgroundColor: accent } : undefined}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10px] font-medium cursor-pointer transition-colors ${
                      boardMode === opt.mode
                        ? 'text-white shadow-sm'
                        : 'text-[#8E96A8] hover:text-current'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className={`pt-1.5 border-t space-y-1.5 ${dividerBorderClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8E96A8]">Board Pages</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={boardPageIndex <= 0}
                      onClick={onPrevBoardPage}
                      aria-label="Previous page"
                      className={`p-1 rounded border disabled:opacity-35 cursor-pointer ${mutedBtnClass}`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] tabular-nums px-1">
                      {boardPageIndex + 1}/{boardPageCount}
                    </span>
                    <button
                      type="button"
                      disabled={boardPageIndex >= boardPageCount - 1}
                      onClick={onNextBoardPage}
                      aria-label="Next page"
                      className={`p-1 rounded border disabled:opacity-35 cursor-pointer ${mutedBtnClass}`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onAddBoardPage}
                      aria-label="New board page"
                      style={{ backgroundColor: accent }}
                      className="p-1 rounded text-white hover:opacity-90 cursor-pointer"
                      title="Add Page"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={onClearBoard}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Page</span>
                  </button>
                  <button
                    type="button"
                    onClick={onSaveBoard}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Board</span>
                  </button>
                  <button
                    type="button"
                    onClick={onExportBoardPng}
                    style={{ backgroundColor: accent }}
                    className="flex items-center justify-center gap-1 px-2 py-1 rounded-md text-white text-[11px] hover:opacity-90 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => importBgRef.current?.click()}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                  >
                    <ImagePlus className="w-3 h-3" />
                    <span>Import BG</span>
                  </button>
                  <input
                    ref={importBgRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onImportBoardBackground(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                {hasBoardBackground && (
                  <button
                    type="button"
                    onClick={onClearBoardBackground}
                    className="w-full py-0.5 text-[11px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Remove Background Image
                  </button>
                )}
              </div>

              <div className={`pt-1.5 border-t space-y-1.5 ${dividerBorderClass}`}>
                <div className="flex items-center justify-between text-[11px] text-[#8E96A8]">
                  <span>Sessions & JSON</span>
                  <span className="font-mono tabular-nums">{annotationCount} items</span>
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    aria-label="Session name"
                    placeholder="Session name..."
                    value={sessionNameInput}
                    onChange={(e) => setSessionNameInput(e.target.value)}
                    className={`flex-1 min-w-0 px-2 py-1 text-[11px] rounded-md border ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onSaveSession(sessionNameInput);
                      setSessionNameInput('');
                    }}
                    style={{ backgroundColor: accent }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md text-white hover:opacity-90 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={onExportAnnotations}
                    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                  >
                    <Download className="w-3 h-3" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => importJsonRef.current?.click()}
                    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer ${mutedBtnClass}`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import JSON</span>
                  </button>
                  <input
                    ref={importJsonRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onImportAnnotations(reader.result);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                {savedSessions.length > 0 && (
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {savedSessions.map((sess) => (
                      <div
                        key={sess.id}
                        className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md border ${dividerBorderClass}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onRestoreSession(sess);
                            onClose();
                          }}
                          className="flex-1 text-left truncate hover:text-blue-400 cursor-pointer"
                        >
                          <div className="font-medium truncate">{sess.name}</div>
                          <div className="text-[10px] text-[#8E96A8] font-mono tabular-nums">
                            {sess.items.length} items · {sess.boardMode}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete session ${sess.name}`}
                          onClick={() => onDeleteSession(sess.id)}
                          className="p-1 text-[#8E96A8] hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 12. QUICK PREFERENCES */}
          {activePopout === 'settings' && (
            <div className="space-y-2">
              <div className={`grid grid-cols-3 gap-1 p-0.5 rounded-lg ${subBarBg}`}>
                {(
                  [
                    { id: 'dark', label: 'Dark', icon: <Moon className="w-3 h-3" /> },
                    { id: 'light', label: 'Light', icon: <Sun className="w-3 h-3" /> },
                    { id: 'system', label: 'System', icon: <Monitor className="w-3 h-3" /> },
                  ] as { id: ThemeMode; label: string; icon: React.ReactNode }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateSettings((p) => ({ ...p, theme: t.id }))}
                    style={settings.theme === t.id ? { backgroundColor: accent } : undefined}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[11px] cursor-pointer ${
                      settings.theme === t.id ? 'text-white' : 'text-[#8E96A8] hover:text-current'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#8E96A8]">Accent</span>
                <div className="flex items-center gap-1.5">
                  {ACCENT_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Accent ${hex}`}
                      onClick={() => onUpdateSettings((p) => ({ ...p, accentColor: hex }))}
                      style={{ backgroundColor: hex }}
                      className={`w-4 h-4 rounded-full border cursor-pointer ${
                        normalizeHex(accent) === hex ? 'ring-2 ring-white scale-110' : 'border-slate-500/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1">
                {(['compact', 'standard'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdateSettings((p) => ({ ...p, toolbarSize: sz }))}
                    style={settings.toolbarSize === sz ? { backgroundColor: accent } : undefined}
                    className={`px-2 py-1 rounded-md border capitalize text-[11px] cursor-pointer ${
                      settings.toolbarSize === sz ? 'text-white border-transparent' : mutedBtnClass
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              <label className="flex items-center justify-between text-[11px] cursor-pointer">
                <span>Hover Tooltips</span>
                <input
                  type="checkbox"
                  checked={settings.showTooltips}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({ ...p, showTooltips: e.target.checked }))
                  }
                  className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-[11px] cursor-pointer">
                <span>Edge Snapping</span>
                <input
                  type="checkbox"
                  checked={settings.edgeSnapping}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({ ...p, edgeSnapping: e.target.checked }))
                  }
                  className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullSettings();
                }}
                style={{ backgroundColor: accent }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white hover:opacity-90 text-[11px] font-medium cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>All Settings & Shortcuts</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
