import { AnnotationItem, BoardMode, ToolType } from '../types/annotation';
import { ResolvedThemeMode, UserSettings } from '../types/settings';
import type { RecordingArtifact, RecordingStatus } from '../recorder/screenRecorder';
import type { KeyboardShortcutEvent, KeyboardVisualizerStatus } from './keyboardVisualizer';

export type DesktopWindowType = 'overlay' | 'toolbar' | 'settings';

export interface DesktopDisplayInfo {
  id: number;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
  isPrimary: boolean;
}

export interface VirtualScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  displays: DesktopDisplayInfo[];
}

export interface DesktopSharedState {
  activeTool: ToolType;
  interactionMode: 'pointer' | 'drawing';
  toolbarVisible: boolean;
  restoreButtonVisible: boolean;
  annotationsVisible: boolean;
  toolbarPosition: { x: number; y: number };
  restoreButtonPosition: { x: number; y: number };
  boardMode: BoardMode;
  resolvedTheme: ResolvedThemeMode;
  ghostMode: boolean;
  presentationMode: boolean;
  historyCount: number;
  canUndo: boolean;
  canRedo: boolean;
  activeColor: string;
  activeThickness: number;
  activeOpacity: number;
  selectedItemId: string | null;
  activePageIndex: number;
  boardPageCount: number;
  isRecording: boolean;
  recordingStatus: RecordingStatus;
  recordingElapsedMs: number;
  latestRecording: RecordingArtifact | null;
}

export interface DesktopCaptureSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  displayId?: string;
}

export interface ProScreenDesktopAPI {
  isDesktop: boolean;
  platform: 'win32' | 'darwin' | 'linux';
  getWindowType: () => Promise<DesktopWindowType>;
  
  // State Sync
  getState: () => Promise<DesktopSharedState>;
  syncState: (state: Partial<DesktopSharedState>) => void;
  onStateChange: (callback: (state: DesktopSharedState) => void) => () => void;

  // Mode & Mouse Pass-Through
  setInteractionMode: (mode: 'pointer' | 'drawing') => void;
  setOverlayIgnoreMouse: (ignore: boolean) => void;
  setToolbarIgnoreMouse: (ignore: boolean, forward?: boolean) => void;

  // Window Controls
  moveToolbar: (x: number, y: number) => void;
  moveToolbarTop: () => void;
  setToolbarBounds: (bounds: { x?: number; y?: number; width?: number; height?: number }) => void;
  getToolbarPosition: () => Promise<{ x: number; y: number }>;
  saveToolbarPosition: (x: number, y: number) => void;
  saveRestoreButtonPosition: (x: number, y: number) => void;
  toggleEye: () => void;
  setEye: (visible: boolean) => void;
  openSettingsWindow: () => void;
  closeWindow: () => void;
  minimizeWindow: () => void;

  // Engine Actions (Forwarded from Toolbar to Overlay)
  dispatchAction: (action: string, payload?: unknown) => void;
  onAction: (callback: (action: string, payload?: unknown) => void) => () => void;

  // Screen & Capture
  getVirtualBounds: () => Promise<VirtualScreenBounds>;
  getDisplaysInfo?: () => Promise<DesktopDisplayInfo[]>;
  setRecordingTargetDisplay?: (displayId: string | null) => void;
  setRecordingTargetMode?: (mode: string) => void;
  setRecordingTargetSource?: (sourceId: string | null) => void;
  onDisplaysChanged: (callback: (bounds: VirtualScreenBounds) => void) => () => void;
  captureScreenThumbnail: () => Promise<string | null>;
  getMediaSources: (types: ('screen' | 'window')[]) => Promise<DesktopCaptureSource[]>;
  saveCaptureFile: (dataUrl: string, defaultFilename: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  saveRecordingBuffer?: (
    buffer: Uint8Array | undefined,
    defaultFilename: string,
    askWhereToSave?: boolean,
    sourcePath?: string
  ) => Promise<{ ok: boolean; path?: string; error?: string }>;
  showItemInFolder?: (filePath: string) => Promise<boolean>;
  openPath?: (filePath: string) => Promise<string>;
  openRecordingFileDialog?: () => Promise<{ ok: boolean; artifact?: unknown; canceled?: boolean; error?: string }>;

  // Persistent Settings
  loadDesktopSettings: () => Promise<UserSettings | null>;
  saveDesktopSettings: (settings: UserSettings) => Promise<boolean>;
  onSettingsChanged?: (callback: (settings: UserSettings) => void) => () => void;

  // Annotation Persistence & Eye ON Restoration
  saveDesktopAnnotations?: (items: AnnotationItem[]) => void;
  getDesktopAnnotations?: () => Promise<AnnotationItem[]>;
  onRestoreAnnotations?: (callback: (items: AnnotationItem[]) => void) => () => void;

  // Popout Window Controls (Stationary Toolbar Architecture)
  openPopout?: (data: { popoutId: string; anchorOffsetY?: number; transitionId?: number }) => void;
  closePopout?: (data?: { transitionId?: number }) => void;
  onPopoutData?: (callback: (data: { popoutId: string | null; openSide: 'left' | 'right'; anchorOffsetY?: number; transitionId?: number }) => void) => () => void;
  onPopoutClosed?: (callback: (info?: { transitionId?: number }) => void) => () => void;

  // Windows-only system-wide shortcut visualization
  startKeyboardVisualizer: () => Promise<KeyboardVisualizerStatus>;
  stopKeyboardVisualizer: () => Promise<KeyboardVisualizerStatus>;
  onKeyboardShortcut: (callback: (event: KeyboardShortcutEvent) => void) => () => void;
  onKeyboardVisualizerDisabled: (callback: () => void) => () => void;

  // App Lifecycle
  quitApp: () => void;
}

declare global {
  interface Window {
    proscreenDesktop?: ProScreenDesktopAPI;
  }
}
