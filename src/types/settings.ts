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

export type RecordingMode = 'tab' | 'window' | 'screen';
export type RecordingQuality = 'standard' | 'high' | 'ultra';
export type RecordingResolution = 'source' | '1080p' | '720p';

export interface TimerSettings {
  enabled: boolean;
  durationMs: number;
  paused: boolean;
}

export interface RecordingSettings {
  mode: RecordingMode;
  quality: RecordingQuality;
  resolution: RecordingResolution;
  frameRate: 30 | 60;
  mimeType: string;
  micAudio: boolean;
  tabAudio: boolean;
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
  recording: RecordingSettings;
  exportPrefs: ExportPreferences;
  recentColors: string[];
  favoriteColors: string[];
  shortcuts: ShortcutBinding[];
  hasSeenOnboarding?: boolean;
  startWithWindows?: boolean;
  multiMonitorMode?: 'all' | 'primary';
}
