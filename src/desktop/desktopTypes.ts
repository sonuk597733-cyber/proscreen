import { AnnotationItem, BoardMode, ToolType } from '../types/annotation';
import { ResolvedThemeMode, UserSettings } from '../types/settings';

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

  // Window Controls
  moveToolbar: (x: number, y: number) => void;
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
  onDisplaysChanged: (callback: (bounds: VirtualScreenBounds) => void) => () => void;
  captureScreenThumbnail: () => Promise<string | null>;
  getMediaSources: (types: ('screen' | 'window')[]) => Promise<DesktopCaptureSource[]>;
  saveCaptureFile: (dataUrl: string, defaultFilename: string) => Promise<{ ok: boolean; path?: string; error?: string }>;

  // Persistent Settings
  loadDesktopSettings: () => Promise<UserSettings | null>;
  saveDesktopSettings: (settings: UserSettings) => Promise<boolean>;

  // App Lifecycle
  quitApp: () => void;
}

declare global {
  interface Window {
    proscreenDesktop?: ProScreenDesktopAPI;
  }
}
