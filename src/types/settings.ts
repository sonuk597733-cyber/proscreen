import {
  BoardMode,
  HighlighterStyle,
  PenStyle,
  ShapeToolType,
  TextAlign,
  ToolType,
} from './annotation';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedThemeMode = 'dark' | 'light';
export type ToolbarOrientation = 'vertical' | 'horizontal';
export type ToolbarSize = 'compact' | 'standard';

export type RecordingMode = 'tab' | 'window' | 'screen' | 'area';
export type RecordingQuality = 'high' | 'ultra' | 'ultra-pro' | 'standard';
export type RecordingResolution = '4k' | '8k' | '16k' | 'source' | '1440p' | '1080p' | '720p';

export interface RecordingAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId?: string;
  displayBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TimerSettings {
  enabled: boolean;
  durationMs: number;
  paused: boolean;
  showInRecording: boolean;
}

export type KeyboardVisualizerPosition = 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface KeyboardVisualizerSettings {
  enabled: boolean;
  position: KeyboardVisualizerPosition;
  animate: boolean;
  showInRecording: boolean;
}

export interface RecordingSettings {
  mode: RecordingMode;
  quality: RecordingQuality;
  resolution: RecordingResolution;
  frameRate: 30 | 60 | 120;
  mimeType: string;
  micAudio: boolean;
  tabAudio: boolean;
  micDeviceId?: string;
  micGain?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  areaRect?: RecordingAreaRect | null;
  videoBitrate?: number | 'auto';
  codec?: string;
}

export interface ExportPreferences {
  askWhereToSave: boolean;
}

export interface ToolBrushConfig {
  color: string;
  thickness: number;
  opacity: number;
  penStyle?: PenStyle;
  highlighterStyle?: HighlighterStyle;
}

export interface ShapeSettings {
  defaultShape: ShapeToolType;
  color: string;
  fillColor: string;
  fillOpacity: number;
  thickness: number;
  opacity: number;
  arrowHeadSize: number;
}

export interface TextSettings {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  color: string;
  backgroundColor: string;
}

export interface CreatorSettings {
  creatorModeEnabled: boolean;
  ghostModeShortcutHint: boolean;
  cursorSpotlightEnabled: boolean;
  cursorHighlightEnabled: boolean;
  spotlightRadius: number;
  spotlightDimOpacity: number;
  fadingInkEnabled: boolean;
  fadingInkDurationMs: number;
  recordingFriendlyToolbar: boolean;
  annotationsVisible: boolean;
}

export interface ShortcutBinding {
  id: string;
  action: string;
  label: string;
  keys: string;
  chromeCommand?: string;
  category: 'tools' | 'actions' | 'modes';
}

export interface ToolbarPosition {
  x: number;
  y: number;
}

export interface UserSettings {
  schemaVersion: 1;
  theme: ThemeMode;
  accentColor: string;
  toolbarOrientation: ToolbarOrientation;
  toolbarSize: ToolbarSize;
  toolbarPinned: boolean;
  toolbarCollapsed: boolean;
  toolbarMinimized: boolean;
  showTooltips: boolean;
  edgeSnapping: boolean;
  toolbarPosition: ToolbarPosition;
  restoreButtonPosition: ToolbarPosition;
  defaultTool: ToolType;
  defaultBoardMode: BoardMode;
  whiteboardGrid: boolean;
  confirmBeforeClear: boolean;
  pen: ToolBrushConfig;
  highlighter: ToolBrushConfig;
  eraserSize: number;
  laserColor: string;
  laserSize: number;
  laserTrailEnabled: boolean;
  shape: ShapeSettings;
  text: TextSettings;
  creator: CreatorSettings;
  timer: TimerSettings;
  keyboardVisualizer: KeyboardVisualizerSettings;
  recording: RecordingSettings;
  exportPrefs: ExportPreferences;
  recentColors: string[];
  favoriteColors: string[];
  shortcuts: ShortcutBinding[];
  hasSeenOnboarding?: boolean;
  startWithWindows?: boolean;
  multiMonitorMode?: 'all' | 'primary';
}
