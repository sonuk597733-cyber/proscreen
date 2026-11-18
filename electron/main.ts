import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  net,
  protocol,
  screen,
  session,
  shell,
  Tray,
} from 'electron';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  DesktopCaptureSource,
  DesktopDisplayInfo,
  DesktopSharedState,
  VirtualScreenBounds,
} from '../src/desktop/desktopTypes';
import { calculateVirtualBounds, clampToolbarToDisplays } from '../src/desktop/multiMonitor';
import { UserSettings } from '../src/types/settings';
import { createDefaultSettings } from '../src/storage/validation';
import {
  pickFirstExistingPath,
  resolveBundledIconCandidates,
  resolveDesktopHtmlTarget,
} from '../src/desktop/electronPaths';
import { fromProScreenMediaUrl, toProScreenMediaUrl } from '../src/desktop/mediaUrl';
import {
  computePrimaryWindowBounds,
  ensureDirectoryAndAppendLog,
  evaluateStartupWindowHealth,
  evaluateStudioStartupDecision,
  formatDesktopLogEntry,
  resolveProductionChromiumSwitches,
  shouldLaunchFloatingToolbar,
  shouldLaunchOverlayWindow,
} from '../src/desktop/startupLifecycle';
import {
  computeFloatingZOrderStack,
  PopoutTransitionCoordinator,
} from '../src/desktop/interactionLifecycle';
import {
  KeyboardVisualizerController,
  KeyboardVisualizerNativeAddon,
} from '../src/desktop/keyboardVisualizer';
import {
  KEYBOARD_SHORTCUT_EVENT_CHANNEL,
  KEYBOARD_VISUALIZER_DISABLED_CHANNEL,
} from '../src/desktop/keyboardVisualizerBridge';
import { registerKeyboardVisualizerIpc } from '../src/desktop/keyboardVisualizerIpc';
import { resolveKeyboardVisualizerModulePath } from '../src/desktop/keyboardVisualizerRuntime';

const requireNative = createRequire(path.join(__dirname, 'main.cjs'));

function loadKeyboardVisualizerNativeAddon(): KeyboardVisualizerNativeAddon {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('The system-wide keyboard visualizer requires Windows x64.');
  }
  const modulePath = resolveKeyboardVisualizerModulePath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    mainDirectory: __dirname,
  });
  if (!fs.existsSync(modulePath)) {
    throw new Error('The Windows keyboard visualizer native module is not installed.');
  }
  const nativeAddon = requireNative(modulePath) as Partial<KeyboardVisualizerNativeAddon>;
  if (typeof nativeAddon.start !== 'function' || typeof nativeAddon.stop !== 'function') {
    throw new Error('The Windows keyboard visualizer native module is invalid.');
  }
  return nativeAddon as KeyboardVisualizerNativeAddon;
}

function getDesktopLogPath(): string {
  try {
    return path.join(app.getPath('userData'), 'proscreen-desktop.log');
  } catch {
    return path.join(process.cwd(), 'proscreen-desktop.log');
  }
}

function appendDesktopLogSync(event: string, meta: Record<string, unknown> = {}): void {
  const line = formatDesktopLogEntry(event, meta);
  ensureDirectoryAndAppendLog(getDesktopLogPath(), line);
  try {
    console.log(`[${event}]`, JSON.stringify(meta));
  } catch {}
}

function requestAppQuit(reason: string, meta: Record<string, unknown> = {}): void {
  appendDesktopLogSync('INTENTIONAL_QUIT_REQUESTED', { reason, ...meta });
  app.quit();
}

function handleFatalStartupError(source: string, err: unknown): void {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  appendDesktopLogSync('FATAL_STARTUP_ERROR', { source, error: message });
  try {
    console.error(`[PROSCREEN FATAL:${source}]`, message);
  } catch {}
  try {
    dialog.showErrorBox(
      'ProScreen Startup Error',
      `ProScreen encountered a startup error and could not open.\n\nDetails: ${err instanceof Error ? err.message : String(err)}\n\nDiagnostic log: ${getDesktopLogPath()}`
    );
  } catch {}
  process.exit(1);
}

// Register custom media streaming protocol for smooth playback and seeking
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'proscreen-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

if (process.platform === 'win32') {
  try {
    app.setAppUserModelId('com.proscreen.annotationstudio');
  } catch {}
}

appendDesktopLogSync('APP_LAUNCH', {
  pid: process.pid,
  version: app.getVersion(),
  isPackaged: app.isPackaged,
  execPath: process.execPath,
  platform: process.platform,
  arch: process.arch,
  userDataDir: (() => {
    try {
      return app.getPath('userData');
    } catch {
      return 'unavailable';
    }
  })(),
  argv: process.argv.slice(0, 6),
});

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  appendDesktopLogSync('SINGLE_INSTANCE_LOCK_DENIED_SECONDARY_EXIT', {
    pid: process.pid,
    argv: process.argv.slice(0, 6),
  });
  app.quit();
  process.exit(0);
}
appendDesktopLogSync('SINGLE_INSTANCE_LOCK_ACQUIRED', { pid: process.pid });

app.on('second-instance', (_event, argv) => {
  appendDesktopLogSync('SECOND_INSTANCE_ACTIVATED', { argv: argv.slice(0, 6) });
  const activate = () => {
    try {
      if (!overlayWindow || overlayWindow.isDestroyed()) {
        overlayWindow = createOverlayWindow();
      }
    } catch (err) {
      appendDesktopLogSync('SECOND_INSTANCE_OVERLAY_RECOVER_ERROR', { error: String(err) });
    }
    try {
      if (!toolbarWindow || toolbarWindow.isDestroyed()) {
        toolbarWindow = createToolbarWindow();
      }
      setEyeState(true);
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        if (toolbarWindow.isMinimized()) toolbarWindow.restore();
        toolbarWindow.showInactive();
        toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } catch (err) {
      appendDesktopLogSync('SECOND_INSTANCE_TOOLBAR_RECOVER_ERROR', { error: String(err) });
    }
    try {
      openSettingsWindow('second-instance');
    } catch (err) {
      appendDesktopLogSync('SECOND_INSTANCE_MAIN_WINDOW_ERROR', { error: String(err) });
    }
  };

  if (app.isReady()) {
    activate();
  } else {
    void app.whenReady().then(activate);
  }
});

let isAppStartupCompleted = false;

process.on('uncaughtException', (err) => {
  const stack = err?.stack || String(err);
  appendDesktopLogSync('UNCAUGHT_EXCEPTION', {
    error: stack,
    startupCompleted: isAppStartupCompleted,
  });
  if (!isAppStartupCompleted) {
    handleFatalStartupError('uncaughtException', err);
  }
});

process.on('unhandledRejection', (reason) => {
  const detail = reason instanceof Error ? reason.stack || reason.message : String(reason);
  appendDesktopLogSync('UNHANDLED_REJECTION', {
    error: detail,
    startupCompleted: isAppStartupCompleted,
  });
  if (!isAppStartupCompleted) {
    handleFatalStartupError('unhandledRejection', reason);
  }
});

let overlayWindow: BrowserWindow | null = null;
let toolbarWindow: BrowserWindow | null = null;
let popoutWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let authoritativeDesktopAnnotations: unknown[] = [];
const popoutCoordinator = new PopoutTransitionCoordinator();
let pendingPopoutPayload: {
  popoutId: string | null;
  openSide: 'left' | 'right';
  anchorOffsetY?: number;
  transitionId: number;
} | null = null;
let targetRecordingDisplayId: string | null = null;
let targetRecordingMode: string | null = null;
let ipcHandlersRegistered = false;
let keyboardVisualizerEnabled = false;
let unregisterKeyboardVisualizerIpc: (() => void) | null = null;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

// Default initial state: POINTER MODE (Requirement 1 & Phase 5)
let sharedState: DesktopSharedState = {
  activeTool: 'pointer',
  interactionMode: 'pointer',
  toolbarVisible: true,
  restoreButtonVisible: false,
  annotationsVisible: true,
  toolbarPosition: { x: 16, y: 76 },
  restoreButtonPosition: { x: 16, y: 76 },
  boardMode: 'webpage',
  resolvedTheme: 'dark',
  ghostMode: false,
  presentationMode: false,
  historyCount: 0,
  canUndo: false,
  canRedo: false,
  activeColor: '#EF4444',
  activeThickness: 4,
  activeOpacity: 1,
  selectedItemId: null,
  activePageIndex: 0,
  boardPageCount: 1,
  isRecording: false,
  recordingStatus: 'idle',
  recordingElapsedMs: 0,
  latestRecording: null,
};

const keyboardVisualizerController = new KeyboardVisualizerController({
  platform: process.platform,
  loadAddon: loadKeyboardVisualizerNativeAddon,
  onShortcut: (event) => {
    if (!keyboardVisualizerEnabled || !overlayWindow || overlayWindow.isDestroyed()) return;
    if (!overlayWindow.isVisible()) {
      overlayWindow.showInactive();
      overlayWindow.setIgnoreMouseEvents(sharedState.interactionMode !== 'drawing');
      applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
    }
    overlayWindow.webContents.send(KEYBOARD_SHORTCUT_EVENT_CHANNEL, event);
  },
  onEnabledChange: (enabled) => {
    keyboardVisualizerEnabled = enabled;
    if (!enabled && overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send(KEYBOARD_VISUALIZER_DISABLED_CHANNEL);
    }
    updateOverlayVisibility();
  },
});

let activeSettings: UserSettings | null = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;
let activeWritePromise: Promise<boolean> | null = null;
let hasPendingWrite = false;

// Monotonic versioning to prevent race conditions & stale snapshot overwrites
let currentSettingsVersion = 0;
let committedSettingsVersion = 0;

// Shutdown lifecycle state flags
let isShuttingDown = false;
let isShutdownCompleted = false;
let shutdownPromise: Promise<boolean> | null = null;

// Programmatic bounds adjustment flag (prevents popout expansions from overwriting user drag position)
let isProgrammaticBoundsChange = false;
let programmaticBoundsTimer: NodeJS.Timeout | null = null;

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), 'proscreen-desktop-settings.json');
}

/**
 * Loads settings from disk synchronously once upon first invocation, caching in memory.
 * Subsequent calls return the in-memory settings without hitting disk.
 */
function loadSavedSettings(): UserSettings {
  if (activeSettings) {
    return activeSettings;
  }
  let loaded: UserSettings | null = null;
  try {
    const p = getSettingsFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      loaded = { ...createDefaultSettings(), ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('[SETTINGS] Failed to read desktop settings:', err);
  }
  activeSettings = loaded || createDefaultSettings();
  return activeSettings;
}

/**
 * Performs atomic asynchronous disk persistence using a temporary file and rename.
 * Gated by snapshot version: if a newer version was committed in the meantime,
 * or if shutdown completed, the temporary file is unlinked and discarded.
 */
async function performDiskWrite(snapshot: UserSettings, version: number): Promise<boolean> {
  const p = getSettingsFilePath();
  const dir = path.dirname(p);
  const data = JSON.stringify(snapshot, null, 2);
  const tempPath = `${p}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(tempPath, data, 'utf-8');

    // CRITICAL RACE CHECK:
    // If a newer version has already been committed (e.g. via newer write or shutdown flush),
    // or if shutdown completed, discard this older temporary file immediately.
    if (version < committedSettingsVersion || isShutdownCompleted) {
      console.warn(`[SETTINGS] Discarding stale write (v${version} < committed v${committedSettingsVersion})`);
      try {
        await fs.promises.unlink(tempPath);
      } catch {}
      return false;
    }

    await fs.promises.rename(tempPath, p);
    committedSettingsVersion = Math.max(committedSettingsVersion, version);
    return true;
  } catch (err) {
    console.error('[SETTINGS] Asynchronous disk write failed:', err);
    try {
      await fs.promises.unlink(tempPath);
    } catch {}
    return false;
  }
}

/**
 * Serialized async write coordinator: guarantees latest snapshot is written
 * and overlapping writes never overwrite newer settings with older ones.
 */
async function triggerAsyncWrite(): Promise<void> {
  if (isShuttingDown || isShutdownCompleted) {
    return;
  }
  if (activeWritePromise) {
    hasPendingWrite = true;
    return;
  }
  if (!activeSettings) return;

  const version = currentSettingsVersion;
  const snapshot = { ...activeSettings };
  hasPendingWrite = false;

  activeWritePromise = performDiskWrite(snapshot, version)
    .finally(() => {
      activeWritePromise = null;
      if (hasPendingWrite && !isShuttingDown && !isShutdownCompleted) {
        void triggerAsyncWrite();
      }
    });
}

/**
 * Schedules debounced asynchronous settings persistence.
 * Completely non-blocking on the Node.js event loop and Win32 message pump.
 */
function scheduleAsyncSave(delayMs = 250) {
  if (isShuttingDown || isShutdownCompleted) {
    return;
  }
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    void triggerAsyncWrite();
  }, delayMs);
}

/**
 * Graceful asynchronous shutdown sequence:
 * 1. Closes gate to reject new incoming saves.
 * 2. Cancels pending debounce timer.
 * 3. Awaits active in-flight async write with bounded timeout (1500ms max).
 * 4. Persists the final latest in-memory settings snapshot if uncommitted.
 * 5. Marks shutdown completed to prevent duplicate or recursive shutdown handling.
 */
async function gracefulShutdown(timeoutMs = 1500): Promise<boolean> {
  if (isShutdownCompleted) {
    return true;
  }
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    isShuttingDown = true;

    // 1. Cancel pending debounce timer
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }

    // 2. Wait for any active async write to settle
    if (activeWritePromise) {
      try {
        await Promise.race([
          activeWritePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Shutdown timeout waiting for async write')), timeoutMs)
          ),
        ]);
      } catch (err) {
        console.warn('[SHUTDOWN] Active async write wait ended:', err);
      }
    }

    // 3. Check if latest settings in memory still need to be persisted
    let success = true;
    if (activeSettings && currentSettingsVersion > committedSettingsVersion) {
      const finalVersion = currentSettingsVersion;
      try {
        const p = getSettingsFilePath();
        const dir = path.dirname(p);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, JSON.stringify(activeSettings, null, 2), 'utf-8');
        committedSettingsVersion = Math.max(committedSettingsVersion, finalVersion);
        success = true;
      } catch (err) {
        console.error('[SHUTDOWN] Failed to write final settings to disk:', err);
        success = false;
      }
    }

    isShutdownCompleted = true;
    return success;
  })();

  return shutdownPromise;
}

/**
 * Fail-safe synchronous emergency shutdown flush:
 * Used exclusively for emergency quit shortcuts (e.g. Alt+Shift+Q) where immediate termination
 * is required without waiting for promises.
 * Invalidates any in-flight write version so an older async write can NEVER overwrite the disk.
 */
function emergencyShutdownFlush(): boolean {
  if (isShutdownCompleted) {
    return true;
  }
  isShuttingDown = true;
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  // Invalidate any in-flight async writes so their rename is guaranteed to be rejected & unlinked
  committedSettingsVersion = Number.MAX_SAFE_INTEGER;

  let success = false;
  if (activeSettings) {
    try {
      const p = getSettingsFilePath();
      const dir = path.dirname(p);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(activeSettings, null, 2), 'utf-8');
      success = true;
    } catch (err) {
      console.error('[EMERGENCY SHUTDOWN] Synchronous shutdown flush failed:', err);
      success = false;
    }
  } else {
    success = true;
  }

  isShutdownCompleted = true;
  return success;
}

/**
 * Direct save compatibility helper for settings dashboard.
 */
function saveSettingsToDisk(settings: UserSettings): boolean {
  if (isShuttingDown || isShutdownCompleted) {
    return false;
  }
  activeSettings = { ...settings };
  currentSettingsVersion++;
  scheduleAsyncSave(50);
  return true;
}

function logDesktopEvent(event: string, meta: Record<string, unknown> = {}) {
  appendDesktopLogSync(event, meta);
}

function loadWindowContent(
  win: BrowserWindow,
  name: string,
  target: { type: 'url'; url: string } | { type: 'file'; filePath: string },
  options?: {
    query?: Record<string, string>;
    critical?: boolean;
    onFailure?: (stage: string, error: string) => void;
  }
) {
  if (target.type === 'url') {
    const querySuffix = options?.query
      ? `?${new URLSearchParams(options.query).toString()}`
      : '';
    const fullUrl = `${target.url}${querySuffix}`;
    win.loadURL(fullUrl).catch((err) => {
      const errorMsg = String(err);
      appendDesktopLogSync('WINDOW_LOAD_URL_FAILED', { name, url: fullUrl, error: errorMsg });
      options?.onFailure?.('load-url', errorMsg);
      if (options?.critical) {
        dialog.showErrorBox(
          'ProScreen Renderer Error',
          `Failed to load ProScreen interface (${fullUrl}).\n\n${errorMsg}`
        );
      }
    });
    return;
  }

  if (!fs.existsSync(target.filePath)) {
    const missingErr = `Bundled HTML entry not found: ${target.filePath}`;
    appendDesktopLogSync('WINDOW_HTML_MISSING', { name, filePath: target.filePath });
    options?.onFailure?.('html-missing', missingErr);
    if (options?.critical) {
      dialog.showErrorBox(
        'ProScreen Packaging Error',
        `Required desktop interface file is missing from the installation:\n${target.filePath}\n\nPlease reinstall ProScreen.`
      );
    }
    throw new Error(missingErr);
  }

  win.loadFile(target.filePath, options?.query ? { query: options.query } : undefined).catch((err) => {
    const errorMsg = String(err);
    appendDesktopLogSync('WINDOW_LOAD_FILE_FAILED', {
      name,
      filePath: target.filePath,
      error: errorMsg,
    });
    options?.onFailure?.('load-file', errorMsg);
    if (options?.critical) {
      dialog.showErrorBox(
        'ProScreen Renderer Error',
        `Failed to load bundled interface (${target.filePath}).\n\n${errorMsg}`
      );
    }
  });
}

function instrumentWindow(win: BrowserWindow, name: string) {
  let hwnd = 0;
  try {
    const buf = win.getNativeWindowHandle();
    hwnd = process.arch === 'x64' ? Number(buf.readBigInt64LE(0)) : buf.readInt32LE(0);
  } catch {}

  const getWinMeta = () => ({
    name,
    id: win.id,
    hwnd: `0x${hwnd.toString(16)}`,
    bounds: win.getBounds(),
    visible: win.isVisible(),
    focused: win.isFocused(),
    minimized: win.isMinimized(),
    alwaysOnTop: win.isAlwaysOnTop(),
    destroyed: win.isDestroyed(),
  });

  logDesktopEvent('WINDOW_CREATED', getWinMeta());

  win.on('ready-to-show', () => logDesktopEvent('WINDOW_READY_TO_SHOW', getWinMeta()));
  win.on('show', () => logDesktopEvent('WINDOW_SHOWN', getWinMeta()));
  win.on('hide', () => logDesktopEvent('WINDOW_HIDDEN', getWinMeta()));
  win.on('focus', () => logDesktopEvent('WINDOW_FOCUSED', getWinMeta()));
  win.on('blur', () => logDesktopEvent('WINDOW_BLURRED', getWinMeta()));
  win.on('minimize', () => logDesktopEvent('WINDOW_MINIMIZED', getWinMeta()));
  win.on('restore', () => logDesktopEvent('WINDOW_RESTORED', getWinMeta()));
  win.on('unresponsive', () => logDesktopEvent('WINDOW_UNRESPONSIVE', getWinMeta()));
  win.on('responsive', () => logDesktopEvent('WINDOW_RESPONSIVE', getWinMeta()));
  win.on('close', () => logDesktopEvent('WINDOW_CLOSING', getWinMeta()));
  win.on('closed', () => logDesktopEvent('WINDOW_CLOSED', { name, id: win.id, hwnd: `0x${hwnd.toString(16)}` }));

  win.webContents.on('did-start-loading', () => {
    logDesktopEvent('RENDERER_START_LOADING', { name, id: win.id });
  });

  win.webContents.on('did-finish-load', () => {
    logDesktopEvent('RENDERER_DID_FINISH_LOAD', {
      name,
      id: win.id,
      url: win.webContents.getURL(),
      title: win.webContents.getTitle(),
    });
  });

  win.webContents.on('did-fail-load', (_ev, errorCode, errorDesc, validatedURL) => {
    logDesktopEvent('RENDERER_DID_FAIL_LOAD', {
      name,
      id: win.id,
      errorCode,
      errorDesc,
      validatedURL,
    });
  });

  win.webContents.on('render-process-gone', (_ev, details) => {
    logDesktopEvent('RENDERER_PROCESS_GONE', {
      name,
      id: win.id,
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  win.webContents.on('console-message', (_ev, level, message, line, sourceId) => {
    if (level >= 2) {
      logDesktopEvent('RENDERER_CONSOLE', {
        name,
        id: win.id,
        level,
        message,
        line,
        sourceId,
      });
    }
  });
}

let cachedDisplays: DesktopDisplayInfo[] = [];

function updateCachedDisplays() {
  try {
    cachedDisplays = getDisplaysInfo();
  } catch {}
}

function getDisplaysInfo(): DesktopDisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: { ...d.bounds },
    workArea: { ...d.workArea },
    scaleFactor: d.scaleFactor,
    isPrimary: d.id === primaryId,
  }));
}

function getVirtualBounds(): VirtualScreenBounds {
  return calculateVirtualBounds(getDisplaysInfo());
}

/**
 * Creates the fullscreen transparent annotation overlay across the virtual desktop.
 */
function createOverlayWindow(): BrowserWindow {
  const vb = getVirtualBounds();
  const preloadPath = path.join(__dirname, 'preload.cjs');

  const win = new BrowserWindow({
    x: vb.x,
    y: vb.y,
    width: vb.width,
    height: vb.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}

  // Initial pass-through in POINTER mode with pure Win32 WS_EX_TRANSPARENT (no low-level mouse hook)
  win.setIgnoreMouseEvents(true);

  const overlayTarget = resolveDesktopHtmlTarget(__dirname, 'overlay', isDev ? devServerUrl : undefined);
  loadWindowContent(win, 'overlay', overlayTarget);

  win.on('show', () => {
    if (!win.isDestroyed()) {
      applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
    }
  });

  win.on('focus', () => {
    if (!win.isDestroyed()) {
      closePopoutWindow();
      applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
    }
  });

  win.on('closed', () => {
    overlayWindow = null;
  });

  instrumentWindow(win, 'overlay');

  return win;
}

/**
 * Creates the compact, frameless, always-on-top floating toolbar window.
 */
function createToolbarWindow(): BrowserWindow {
  const savedSettings = loadSavedSettings();
  sharedState.toolbarPosition = savedSettings.toolbarPosition;
  sharedState.restoreButtonPosition = savedSettings.restoreButtonPosition || { x: 16, y: 76 };
  const displays = getDisplaysInfo();
  const toolbarWidth = 44;
  const toolbarHeight = 520;

  const clamped = clampToolbarToDisplays(
    savedSettings.toolbarPosition.x,
    savedSettings.toolbarPosition.y,
    toolbarWidth,
    toolbarHeight,
    displays
  );

  const preloadPath = path.join(__dirname, 'preload.cjs');

  const win = new BrowserWindow({
    x: clamped.x,
    y: clamped.y,
    width: toolbarWidth,
    height: toolbarHeight,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}
  try {
    win.setContentProtection(true);
  } catch {}

  // Toolbar window is physically sized to the 36px toolbar buttons (42px) and directly interactive
  win.setIgnoreMouseEvents(false);

  win.on('blur', () => {
    if (!win.isDestroyed()) {
      applyDesktopWindowZOrder();
    }
  });

  win.on('show', () => {
    if (!win.isDestroyed()) {
      applyDesktopWindowZOrder();
    }
  });

  win.on('restore', () => {
    if (!win.isDestroyed()) {
      applyDesktopWindowZOrder();
    }
  });

  let moveBroadcastTimer: NodeJS.Timeout | null = null;

  win.on('moved', () => {
    if (!win.isDestroyed() && !isShuttingDown && !isShutdownCompleted) {
      const bounds = win.getBounds();
      // CRITICAL GUARD 1: If window width > 50, the window is expanded for a popout flyout!
      // This is NEVER a user drag of the 44px toolbar. Ignore completely to prevent position corruption!
      if (bounds.width > 50) {
        logDesktopEvent('TOOLBAR_MOVED_IGNORED_POPOUT_ACTIVE', { bounds });
        return;
      }
      // CRITICAL GUARD 2: Programmatic bounds change lock (during resize / move transitions)
      if (isProgrammaticBoundsChange) {
        logDesktopEvent('TOOLBAR_MOVED_IGNORED_PROGRAMMATIC', { bounds });
        return;
      }
      const [x, y] = [bounds.x, bounds.y];
      logDesktopEvent('TOOLBAR_MOVED_NATIVE_DRAG', { x, y });
      const settings = loadSavedSettings();
      if (sharedState.toolbarVisible) {
        sharedState.toolbarPosition = { x, y };
        sharedState.restoreButtonPosition = { x, y };
        settings.toolbarPosition = { x, y };
        settings.restoreButtonPosition = { x, y };
      } else {
        sharedState.restoreButtonPosition = { x, y };
        sharedState.toolbarPosition = { x, y };
        settings.restoreButtonPosition = { x, y };
        settings.toolbarPosition = { x, y };
      }
      currentSettingsVersion++;
      // Non-blocking debounced disk persistence (zero synchronous disk I/O)
      scheduleAsyncSave(250);

      // Debounce renderer state broadcast so continuous motion does not thrash React re-renders
      if (moveBroadcastTimer) {
        clearTimeout(moveBroadcastTimer);
      }
      moveBroadcastTimer = setTimeout(() => {
        moveBroadcastTimer = null;
        if (!win.isDestroyed()) {
          broadcastState();
        }
      }, 150);
    }
  });

  try {
    win.setContentProtection(true);
  } catch {}

  const toolbarTarget = resolveDesktopHtmlTarget(__dirname, 'toolbar', isDev ? devServerUrl : undefined);
  loadWindowContent(win, 'toolbar', toolbarTarget);

  win.on('closed', () => {
    if (moveBroadcastTimer) {
      clearTimeout(moveBroadcastTimer);
      moveBroadcastTimer = null;
    }
    if (programmaticBoundsTimer) {
      clearTimeout(programmaticBoundsTimer);
      programmaticBoundsTimer = null;
    }
    isProgrammaticBoundsChange = false;
    toolbarWindow = null;
  });

  instrumentWindow(win, 'toolbar');

  if (sharedState.toolbarVisible !== false) {
    win.showInactive();
  }

  return win;
}

/**
 * Creates the dedicated transparent popout/dropdown utility window.
 * Keeps the main toolbar window 100% stationary without any geometry resize.
 */
function createPopoutWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const win = new BrowserWindow({
    width: 320,
    height: 540,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}
  try {
    win.setContentProtection(true);
  } catch {}

  win.setIgnoreMouseEvents(false);

  win.on('blur', () => {
    // If focus transferred to the toolbar window or remained in popoutWindow, keep popout open.
    setImmediate(() => {
      if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isFocused()) {
        return;
      }
      if (popoutWindow && !popoutWindow.isDestroyed() && popoutWindow.isFocused()) {
        return;
      }
      closePopoutWindow();
    });
  });

  win.webContents.on('did-finish-load', () => {
    if (
      !win.isDestroyed() &&
      pendingPopoutPayload &&
      pendingPopoutPayload.popoutId !== null &&
      pendingPopoutPayload.transitionId === popoutCoordinator.currentSessionId
    ) {
      win.webContents.send('desktop:popout-data', pendingPopoutPayload);
    }
  });

  const popoutTarget = resolveDesktopHtmlTarget(__dirname, 'toolbar', isDev ? devServerUrl : undefined);
  loadWindowContent(win, 'popout', popoutTarget, { query: { mode: 'dropdown' } });

  win.on('closed', () => {
    popoutWindow = null;
    popoutCoordinator.reset();
    pendingPopoutPayload = null;
  });

  instrumentWindow(win, 'popout');

  return win;
}

function applyDesktopWindowZOrder(options?: { ensureOverlayTopmost?: boolean }) {
  const stack = computeFloatingZOrderStack({
    overlayVisible: Boolean(
      options?.ensureOverlayTopmost &&
        overlayWindow &&
        !overlayWindow.isDestroyed() &&
        overlayWindow.isVisible()
    ),
    recordingBarVisible: Boolean(
      recordingControlWindow &&
        !recordingControlWindow.isDestroyed() &&
        recordingControlWindow.isVisible()
    ),
    toolbarVisible: Boolean(
      toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()
    ),
    popoutVisible: Boolean(
      popoutWindow && !popoutWindow.isDestroyed() && popoutWindow.isVisible()
    ),
  });

  for (const role of stack) {
    const win =
      role === 'overlay'
        ? overlayWindow
        : role === 'recordingBar'
        ? recordingControlWindow
        : role === 'toolbar'
        ? toolbarWindow
        : popoutWindow;
    if (!win || win.isDestroyed()) continue;
    win.setAlwaysOnTop(true, 'screen-saver');
    try {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch {}
    if (role !== 'overlay') {
      win.moveTop();
    }
  }
}

function openPopoutWindow(data: { popoutId: string; anchorOffsetY?: number; transitionId?: number }) {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return;
  const opened = popoutCoordinator.open(data.popoutId, data.transitionId);
  if (!opened.accepted) {
    return;
  }
  const thisTransition = opened.transitionId;

  const [tbX, tbY] = toolbarWindow.getPosition();
  const display = screen.getDisplayNearestPoint({ x: tbX, y: tbY });
  const workArea = display.workArea;

  const popoutWidth = 320;
  const popoutHeight = 540;
  const spaceRight = (workArea.x + workArea.width) - (tbX + 44);
  const openLeft = spaceRight < popoutWidth && (tbX - workArea.x) >= popoutWidth;
  const popoutX = openLeft ? (tbX - popoutWidth) : (tbX + 44);
  const maxWinY = Math.max(workArea.y + 4, workArea.y + workArea.height - popoutHeight - 4);
  const popoutY = Math.max(workArea.y + 4, Math.min(tbY, maxWinY));

  if (!popoutWindow || popoutWindow.isDestroyed()) {
    popoutWindow = createPopoutWindow();
  }

  popoutWindow.setBounds({
    x: Math.round(popoutX),
    y: Math.round(popoutY),
    width: popoutWidth,
    height: popoutHeight,
  });

  const payload = {
    popoutId: data.popoutId,
    openSide: openLeft ? ('left' as const) : ('right' as const),
    anchorOffsetY: data.anchorOffsetY ?? 20,
    transitionId: thisTransition,
  };
  pendingPopoutPayload = payload;
  if (!popoutWindow.webContents.isLoading()) {
    popoutWindow.webContents.send('desktop:popout-data', payload);
  }

  popoutWindow.show();
  applyDesktopWindowZOrder();
}

function closePopoutWindow(transitionId?: number) {
  const closed = popoutCoordinator.close(transitionId);
  if (!closed.shouldClose) {
    return;
  }
  const thisTransition = closed.transitionId;
  pendingPopoutPayload = null;

  if (popoutWindow && !popoutWindow.isDestroyed()) {
    if (popoutWindow.isVisible()) {
      popoutWindow.hide();
    }
    popoutWindow.webContents.send('desktop:popout-data', {
      popoutId: null,
      openSide: 'right',
      transitionId: thisTransition,
    });
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('desktop:popout-closed', { transitionId: thisTransition });
  }
}

/**
 * Creates the compact bottom floating recording control window.
 * Excluded from screen capture via WDA_EXCLUDEFROMCAPTURE (setContentProtection).
 */
let recordingControlWindow: BrowserWindow | null = null;

function createRecordingControlWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const win = new BrowserWindow({
    width: 290,
    height: 52,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}

  try {
    win.setContentProtection(true);
  } catch {}

  win.setIgnoreMouseEvents(false);

  win.on('blur', () => {
    if (!win.isDestroyed()) {
      applyDesktopWindowZOrder();
    }
  });

  win.on('show', () => {
    if (!win.isDestroyed()) {
      applyDesktopWindowZOrder();
    }
  });

  const recordingBarTarget = resolveDesktopHtmlTarget(__dirname, 'toolbar', isDev ? devServerUrl : undefined);
  loadWindowContent(win, 'recording-bar', recordingBarTarget, { query: { mode: 'recording-bar' } });

  win.on('closed', () => {
    recordingControlWindow = null;
  });

  instrumentWindow(win, 'recording-bar');
  return win;
}

function showRecordingControlWindow() {
  if (!recordingControlWindow || recordingControlWindow.isDestroyed()) {
    recordingControlWindow = createRecordingControlWindow();
  }
  const primary = screen.getPrimaryDisplay();
  const width = 290;
  const height = 52;
  const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
  const y = Math.round(primary.bounds.y + primary.bounds.height - 84);

  recordingControlWindow.setBounds({ x, y, width, height });
  if (!recordingControlWindow.isVisible()) {
    recordingControlWindow.showInactive();
  }
  applyDesktopWindowZOrder();
}

function hideRecordingControlWindow() {
  if (recordingControlWindow && !recordingControlWindow.isDestroyed() && recordingControlWindow.isVisible()) {
    recordingControlWindow.hide();
  }
}

type StudioLaunchTrigger =
  | 'startup'
  | 'tray'
  | 'toolbar'
  | 'second-instance'
  | 'activate'
  | 'ipc';

function getStudioWindowMeta(win: BrowserWindow): Record<string, unknown> {
  let hwnd = 0;
  try {
    const buf = win.getNativeWindowHandle();
    hwnd = process.arch === 'x64' ? Number(buf.readBigInt64LE(0)) : buf.readInt32LE(0);
  } catch {}
  try {
    return {
      id: win.id,
      hwnd: `0x${hwnd.toString(16)}`,
      bounds: win.isDestroyed() ? null : win.getBounds(),
      visible: win.isDestroyed() ? false : win.isVisible(),
      focused: win.isDestroyed() ? false : win.isFocused(),
      minimized: win.isDestroyed() ? false : win.isMinimized(),
      destroyed: win.isDestroyed(),
      url: win.isDestroyed() ? '' : win.webContents.getURL(),
      title: win.isDestroyed() ? '' : win.getTitle(),
    };
  } catch (err) {
    return { destroyed: win.isDestroyed(), metaError: String(err) };
  }
}

/**
 * Creates or reveals the primary ProScreen Studio & Settings desktop window.
 */
function openSettingsWindow(trigger: StudioLaunchTrigger = 'ipc'): BrowserWindow {
  const existingAvailable = Boolean(settingsWindow && !settingsWindow.isDestroyed());
  appendDesktopLogSync('STUDIO_STARTUP_REQUESTED', {
    trigger,
    reused: existingAvailable,
    isDev,
    isPackaged: app.isPackaged,
    argv: process.argv.slice(0, 6),
  });

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.show();
    settingsWindow.moveTop();
    settingsWindow.focus();
    appendDesktopLogSync('STUDIO_WINDOW_SHOWN', {
      trigger,
      reused: true,
      ...getStudioWindowMeta(settingsWindow),
    });
    return settingsWindow;
  }

  const preloadPath = path.join(__dirname, 'preload.cjs');
  const windowIconPath = pickFirstExistingPath(
    resolveBundledIconCandidates(__dirname, ['icon.ico', 'icon256.png', 'icon128.png', 'icon32.png'])
  );
  const initialBounds = computePrimaryWindowBounds(getDisplaysInfo(), 980, 680);

  let win: BrowserWindow;
  try {
    win = new BrowserWindow({
      x: initialBounds.x,
      y: initialBounds.y,
      width: initialBounds.width,
      height: initialBounds.height,
      minWidth: 760,
      minHeight: 540,
      title: 'ProScreen Studio',
      icon: windowIconPath || undefined,
      backgroundColor: '#070B14',
      transparent: false,
      frame: true,
      skipTaskbar: false,
      resizable: true,
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
  } catch (err) {
    appendDesktopLogSync('STUDIO_STARTUP_FAILED', {
      trigger,
      stage: 'create-browser-window',
      error: err instanceof Error ? err.stack || err.message : String(err),
      initialBounds,
    });
    throw err;
  }

  settingsWindow = win;
  instrumentWindow(win, 'settings');
  appendDesktopLogSync('STUDIO_WINDOW_CREATED', {
    trigger,
    ...getStudioWindowMeta(win),
  });

  let shown = false;
  let loadFailed = false;
  let showFallbackTimer: NodeJS.Timeout | null = null;

  const clearFallbackTimer = () => {
    if (showFallbackTimer) {
      clearTimeout(showFallbackTimer);
      showFallbackTimer = null;
    }
  };

  const ensureVisible = (reason: string) => {
    if (shown || loadFailed || win.isDestroyed()) return;
    shown = true;
    clearFallbackTimer();
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.moveTop();
    win.focus();
    appendDesktopLogSync('STUDIO_WINDOW_SHOWN', {
      trigger,
      reason,
      ...getStudioWindowMeta(win),
    });
  };

  win.once('ready-to-show', () => ensureVisible('ready-to-show'));
  showFallbackTimer = setTimeout(() => ensureVisible('fallback-timer'), 1200);

  win.webContents.once('did-finish-load', () => {
    if (win.isDestroyed()) return;
    appendDesktopLogSync('STUDIO_RENDERER_LOADED', {
      trigger,
      ...getStudioWindowMeta(win),
    });
    void win.webContents
      .executeJavaScript("Boolean(document.getElementById('options-root'))", true)
      .then((hasRoot) => {
        if (!hasRoot) {
          appendDesktopLogSync('STUDIO_STARTUP_FAILED', {
            trigger,
            stage: 'renderer-mount-check',
            error: 'Studio HTML loaded without #options-root container',
            ...getStudioWindowMeta(win),
          });
        }
      })
      .catch(() => {});
  });

  win.webContents.on('did-fail-load', (_ev, errorCode, errorDesc, validatedURL, isMainFrame) => {
    if (isMainFrame !== false && errorCode !== -3) {
      loadFailed = true;
      clearFallbackTimer();
    }
    appendDesktopLogSync('STUDIO_STARTUP_FAILED', {
      trigger,
      stage: 'did-fail-load',
      isMainFrame: isMainFrame !== false,
      error: `${errorDesc} (${errorCode})`,
      errorCode,
      errorDesc,
      validatedURL,
      ...getStudioWindowMeta(win),
    });
  });

  win.webContents.on('render-process-gone', (_ev, details) => {
    loadFailed = true;
    clearFallbackTimer();
    appendDesktopLogSync('STUDIO_STARTUP_FAILED', {
      trigger,
      stage: 'render-process-gone',
      error: `Renderer exited: ${details.reason} (code ${details.exitCode})`,
      reason: details.reason,
      exitCode: details.exitCode,
      ...getStudioWindowMeta(win),
    });
  });

  win.on('closed', () => {
    clearFallbackTimer();
    if (settingsWindow === win) {
      settingsWindow = null;
    }
  });

  const optionsTarget = resolveDesktopHtmlTarget(__dirname, 'options', isDev ? devServerUrl : undefined);
  appendDesktopLogSync('STUDIO_RENDERER_LOADING', {
    trigger,
    id: win.id,
    targetType: optionsTarget.type,
    target: optionsTarget.type === 'url' ? optionsTarget.url : optionsTarget.filePath,
    fileExists: optionsTarget.type === 'file' ? fs.existsSync(optionsTarget.filePath) : undefined,
    ...getStudioWindowMeta(win),
  });

  try {
    loadWindowContent(win, 'settings', optionsTarget, {
      critical: true,
      onFailure: (stage, error) => {
        loadFailed = true;
        clearFallbackTimer();
        appendDesktopLogSync('STUDIO_STARTUP_FAILED', {
          trigger,
          stage,
          error,
          ...getStudioWindowMeta(win),
        });
      },
    });
  } catch (err) {
    loadFailed = true;
    clearFallbackTimer();
    if (settingsWindow === win) {
      settingsWindow = null;
    }
    if (!win.isDestroyed()) {
      win.destroy();
    }
    throw err;
  }

  return win;
}

/**
 * Updates click-through state on the overlay window according to interaction mode.
 */
function applyInteractionMode(mode: 'pointer' | 'drawing') {
  logDesktopEvent('APPLY_INTERACTION_MODE', { mode, hasOverlay: Boolean(overlayWindow) });
  sharedState.interactionMode = mode;
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    broadcastState();
    return;
  }

  if (mode === 'pointer') {
    // Pure Win32 click-through (WS_EX_TRANSPARENT without WH_MOUSE_LL hook)
    overlayWindow.setIgnoreMouseEvents(true);
    try {
      globalShortcut.unregister('Escape');
    } catch {}
    // In Pointer mode, if there are NO annotations, hide overlay completely so Windows desktop is 100% untouched
    if (sharedState.historyCount === 0 && !sharedState.isRecording && !keyboardVisualizerEnabled) {
      if (overlayWindow.isVisible()) overlayWindow.hide();
    } else {
      if (!overlayWindow.isVisible()) overlayWindow.showInactive();
      overlayWindow.setIgnoreMouseEvents(true);
      applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
    }
  } else {
    // Drawing mode: Canvas captures clicks while toolbar/popout stay strictly above overlay
    if (!overlayWindow.isVisible()) overlayWindow.showInactive();
    overlayWindow.setIgnoreMouseEvents(false);
    try {
      if (!globalShortcut.isRegistered('Escape')) {
        globalShortcut.register('Escape', () => {
          sharedState.activeTool = 'pointer';
          applyInteractionMode('pointer');
          forwardActionToOverlay('select-tool', 'pointer');
        });
      }
    } catch {}

    applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
  }

  broadcastState();
}

function updateOverlayVisibility() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const wasVisible = overlayWindow.isVisible();

  if (keyboardVisualizerEnabled) {
    if (!wasVisible) overlayWindow.showInactive();
    overlayWindow.setIgnoreMouseEvents(sharedState.interactionMode !== 'drawing');
    if (!wasVisible) applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
    return;
  }

  if (sharedState.interactionMode === 'drawing') {
    if (!wasVisible) overlayWindow.showInactive();
    overlayWindow.setIgnoreMouseEvents(false);
    applyDesktopWindowZOrder({ ensureOverlayTopmost: !wasVisible });
  } else if (!sharedState.annotationsVisible || !sharedState.toolbarVisible) {
    if (wasVisible) overlayWindow.hide();
  } else if (sharedState.historyCount === 0 && !sharedState.isRecording) {
    if (wasVisible) overlayWindow.hide();
  } else {
    if (!wasVisible) overlayWindow.showInactive();
    overlayWindow.setIgnoreMouseEvents(true);
    if (!wasVisible) applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
  }
}

function broadcastState() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('desktop:state-changed', sharedState);
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('desktop:state-changed', sharedState);
  }
  if (popoutWindow && !popoutWindow.isDestroyed()) {
    popoutWindow.webContents.send('desktop:state-changed', sharedState);
  }
  if (recordingControlWindow && !recordingControlWindow.isDestroyed()) {
    recordingControlWindow.webContents.send('desktop:state-changed', sharedState);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('desktop:state-changed', sharedState);
  }
  updateTrayMenu();
}

/**
 * Eye OFF: hides complete floating toolbar, keeps annotation overlay visible,
 * and displays ONLY the small floating Eye restore button.
 * Does not delete any existing work, history, or undo/redo data.
 * Eye ON: restores toolbar, previous annotations, and tool settings in POINTER mode.
 */
function setEyeState(visible: boolean) {
  logDesktopEvent('SET_EYE_STATE', { visible });

  if (visible) {
    // Capture current Eye restore button screen position BEFORE resizing or modifying bounds
    let openX = sharedState.restoreButtonPosition?.x ?? sharedState.toolbarPosition?.x ?? 16;
    let openY = sharedState.restoreButtonPosition?.y ?? sharedState.toolbarPosition?.y ?? 76;
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const [curX, curY] = toolbarWindow.getPosition();
      openX = curX;
      openY = curY;
    }

    sharedState.toolbarPosition = { x: openX, y: openY };
    sharedState.restoreButtonPosition = { x: openX, y: openY };
    sharedState.toolbarVisible = true;
    sharedState.restoreButtonVisible = false;
    sharedState.annotationsVisible = true; // RESTORE annotation layer

    const settings = loadSavedSettings();
    settings.toolbarPosition = { x: openX, y: openY };
    settings.restoreButtonPosition = { x: openX, y: openY };
    currentSettingsVersion++;
    scheduleAsyncSave(250);

    // Show overlay window and restore previous annotations
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.showInactive();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      try {
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } catch {}
      overlayWindow.setIgnoreMouseEvents(true);
      overlayWindow.webContents.send('desktop:restore-annotations', authoritativeDesktopAnnotations);
    }

    // Expand toolbarWindow to 44x520 at (openX, openY) clamped for height
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const clamped = clampToolbarToDisplays(
        openX,
        openY,
        44,
        520,
        getDisplaysInfo()
      );
      isProgrammaticBoundsChange = true;
      toolbarWindow.setBounds({
        x: Math.round(clamped.x),
        y: Math.round(clamped.y),
        width: 44,
        height: 520,
      });
      toolbarWindow.show();
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      toolbarWindow.moveTop();
      toolbarWindow.setIgnoreMouseEvents(false);
      if (programmaticBoundsTimer) clearTimeout(programmaticBoundsTimer);
      programmaticBoundsTimer = setTimeout(() => {
        isProgrammaticBoundsChange = false;
        programmaticBoundsTimer = null;
      }, 350);
    }

    // Eye ON restores Pointer mode
    sharedState.activeTool = 'pointer';
    applyInteractionMode('pointer');
    forwardActionToOverlay('open-eye');
    forwardActionToOverlay('select-tool', 'pointer');
  } else {
    // Close any active popout
    closePopoutWindow();

    // Capture the toolbar's current physical screen coordinates BEFORE resizing or hiding!
    let closeX = sharedState.toolbarPosition?.x ?? 16;
    let closeY = sharedState.toolbarPosition?.y ?? 76;
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const [curX, curY] = toolbarWindow.getPosition();
      closeX = curX;
      closeY = curY;
    }

    // Lock the Eye restore button to the EXACT position where the toolbar closed!
    sharedState.toolbarPosition = { x: closeX, y: closeY };
    sharedState.restoreButtonPosition = { x: closeX, y: closeY };
    sharedState.toolbarVisible = false;
    sharedState.restoreButtonVisible = true;
    sharedState.annotationsVisible = false; // HIDE annotations! Data preserved, but invisible on screen!

    const settings = loadSavedSettings();
    settings.toolbarPosition = { x: closeX, y: closeY };
    settings.restoreButtonPosition = { x: closeX, y: closeY };
    currentSettingsVersion++;
    scheduleAsyncSave(250);

    // Keep the pass-through overlay alive only when shortcut notifications are still enabled.
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(true);
      if (keyboardVisualizerEnabled) {
        overlayWindow.showInactive();
        applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
      } else {
        overlayWindow.hide();
      }
    }

    // Shrink toolbarWindow to 44x44 at the EXACT screen coordinate (closeX, closeY)
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const clamped = clampToolbarToDisplays(
        closeX,
        closeY,
        44,
        44,
        getDisplaysInfo()
      );
      isProgrammaticBoundsChange = true;
      toolbarWindow.setBounds({
        x: Math.round(clamped.x),
        y: Math.round(clamped.y),
        width: 44,
        height: 44,
      });
      toolbarWindow.show();
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      toolbarWindow.moveTop();
      toolbarWindow.setIgnoreMouseEvents(false);
      if (programmaticBoundsTimer) clearTimeout(programmaticBoundsTimer);
      programmaticBoundsTimer = setTimeout(() => {
        isProgrammaticBoundsChange = false;
        programmaticBoundsTimer = null;
      }, 350);
    }

    sharedState.activeTool = 'pointer';
    sharedState.interactionMode = 'pointer';
    forwardActionToOverlay('close-eye');
    forwardActionToOverlay('select-tool', 'pointer');
  }

  broadcastState();
}

function toggleEyeState() {
  setEyeState(!sharedState.toolbarVisible);
}

/**
 * Creates the Windows system tray icon and menu.
 */
function createSystemTray() {
  try {
    const bundledTrayPath = pickFirstExistingPath(
      resolveBundledIconCandidates(__dirname, ['icon32.png', 'icon16.png', 'icon48.png', 'icon256.png'])
    );
    let icon: Electron.NativeImage;
    if (bundledTrayPath) {
      icon = nativeImage.createFromPath(bundledTrayPath);
    } else {
      const iconData = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAExJREFUOE9jZKAQMFKon2H4f+p/hkERhxkYGBj+E5Mnk2GkGkCWgYYGkBu0pBkgYQDZgQYGI0Gg/z+yZgYGhn84DCBa/BElT4kNAABx8BwRE/B4twAAAABJRU5ErkJggg==',
        'base64'
      );
      const trayIconPath = path.join(app.getPath('userData'), 'proscreen-tray-icon.png');
      fs.mkdirSync(path.dirname(trayIconPath), { recursive: true });
      fs.writeFileSync(trayIconPath, iconData);
      icon = nativeImage.createFromPath(trayIconPath);
    }

    tray = new Tray(icon);
    tray.setToolTip('ProScreen — Desktop Annotation Studio');
    tray.on('double-click', () => {
      toggleEyeState();
    });
    updateTrayMenu();
  } catch (err) {
    console.warn('Tray icon creation warning:', err);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const isVisible = sharedState.toolbarVisible;
  const isPointer = sharedState.activeTool === 'pointer';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open ProScreen Studio',
      click: () => {
        openSettingsWindow('tray');
      },
    },
    {
      label: isVisible ? 'Hide Floating Toolbar (Eye OFF)' : 'Show Floating Toolbar (Eye ON)',
      accelerator: 'Alt+Shift+P',
      click: () => toggleEyeState(),
    },
    { type: 'separator' },
    {
      label: 'Pointer Mode (Pass-Through)',
      type: 'radio',
      checked: isVisible && isPointer,
      accelerator: 'Alt+V',
      click: () => {
        if (!sharedState.toolbarVisible) setEyeState(true);
        sharedState.activeTool = 'pointer';
        applyInteractionMode('pointer');
        forwardActionToOverlay('select-tool', 'pointer');
      },
    },
    {
      label: 'Pen Tool (Drawing)',
      type: 'radio',
      checked: isVisible && sharedState.activeTool === 'pen',
      click: () => {
        if (!sharedState.toolbarVisible) setEyeState(true);
        sharedState.activeTool = 'pen';
        applyInteractionMode('drawing');
        forwardActionToOverlay('select-tool', 'pen');
      },
    },
    {
      label: 'Whiteboard Mode',
      click: () => {
        if (!sharedState.toolbarVisible) setEyeState(true);
        sharedState.boardMode = 'whiteboard';
        applyInteractionMode('drawing');
        forwardActionToOverlay('switch-board', 'whiteboard');
      },
    },
    {
      label: 'Clear Screen Annotations',
      accelerator: 'Alt+Shift+X',
      click: () => {
        forwardActionToOverlay('clear-screen');
      },
    },
    { type: 'separator' },
    {
      label: 'Capture Screenshot',
      accelerator: 'Alt+Shift+S',
      click: () => {
        forwardActionToOverlay('capture-screenshot');
      },
    },
    {
      label: sharedState.isRecording ? 'Stop Recording' : 'Start Recording',
      accelerator: 'Alt+Shift+R',
      click: () => {
        forwardActionToOverlay('toggle-recording');
      },
    },
    {
      label: 'Settings...',
      click: () => {
        openSettingsWindow('tray');
      },
    },
    { type: 'separator' },
    {
      label: 'Exit ProScreen',
      click: () => {
        requestAppQuit('tray-exit');
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function forwardActionToOverlay(action: string, payload?: unknown) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('desktop:action-dispatched', { action, payload });
  }
}

/**
 * Registers global keyboard shortcuts safely.
 */
function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  // Alt+Shift+P: Toggle ProScreen Eye
  try {
    globalShortcut.register('Alt+Shift+P', () => {
      toggleEyeState();
    });
  } catch (err) {
    console.warn('Could not register Alt+Shift+P shortcut:', err);
  }

  // Alt+V: Return to Pointer mode immediately
  try {
    globalShortcut.register('Alt+V', () => {
      sharedState.activeTool = 'pointer';
      applyInteractionMode('pointer');
      forwardActionToOverlay('select-tool', 'pointer');
    });
  } catch (err) {
    console.warn('Could not register Alt+V shortcut:', err);
  }

  // Emergency Quit: Alt+Shift+Q, Ctrl+Shift+Q, Ctrl+Alt+Q
  const quitKeys = ['Alt+Shift+Q', 'Ctrl+Shift+Q', 'Ctrl+Alt+Q'];
  for (const key of quitKeys) {
    try {
      const ok = globalShortcut.register(key, () => {
        logDesktopEvent('EMERGENCY_QUIT_TRIGGERED', { key });
        emergencyShutdownFlush();
        try { if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy(); } catch {}
        try { if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.destroy(); } catch {}
        try { if (popoutWindow && !popoutWindow.isDestroyed()) popoutWindow.destroy(); } catch {}
        try { if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.destroy(); } catch {}
        try { if (tray && !tray.isDestroyed()) tray.destroy(); } catch {}
        try { globalShortcut.unregisterAll(); } catch {}
        requestAppQuit('emergency-shortcut', { key });
        process.exit(0);
      });
      if (!ok) {
        console.warn(`[SHORTCUT] Emergency shortcut ${key} could not be registered (key conflict or restricted)`);
      }
    } catch (err) {
      console.warn(`Could not register ${key} shortcut:`, err);
    }
  }

  // Alt+Shift+S: Capture Screenshot
  try {
    globalShortcut.register('Alt+Shift+S', () => {
      forwardActionToOverlay('capture-screenshot');
    });
  } catch (err) {
    console.warn('Could not register Alt+Shift+S shortcut:', err);
  }

  // Alt+Shift+X: Clear Screen
  try {
    globalShortcut.register('Alt+Shift+X', () => {
      forwardActionToOverlay('clear-screen');
    });
  } catch (err) {
    console.warn('Could not register Alt+Shift+X shortcut:', err);
  }

  // Alt+Shift+R: Toggle Recording
  try {
    globalShortcut.register('Alt+Shift+R', () => {
      forwardActionToOverlay('toggle-recording');
    });
  } catch (err) {
    console.warn('Could not register Alt+Shift+R shortcut:', err);
  }
}

/**
 * Sets up IPC communications between Main, Overlay, and Toolbar.
 */
function setupIpcHandlers() {
  if (ipcHandlersRegistered) {
    return;
  }
  ipcHandlersRegistered = true;

  unregisterKeyboardVisualizerIpc = registerKeyboardVisualizerIpc(ipcMain, keyboardVisualizerController, () => {
    return toolbarWindow && !toolbarWindow.isDestroyed()
      ? toolbarWindow.webContents.id
      : null;
  });

  ipcMain.handle('desktop:get-window-type', (event) => {
    if (overlayWindow && event.sender.id === overlayWindow.webContents.id) return 'overlay';
    if (toolbarWindow && event.sender.id === toolbarWindow.webContents.id) return 'toolbar';
    if (popoutWindow && event.sender.id === popoutWindow.webContents.id) return 'dropdown';
    if (recordingControlWindow && event.sender.id === recordingControlWindow.webContents.id) return 'recording-bar';
    return 'settings';
  });

  ipcMain.handle('desktop:get-state', () => sharedState);

  ipcMain.on('desktop:sync-state', (_event, partial: Partial<DesktopSharedState>) => {
    logDesktopEvent('SYNC_STATE', partial);
    sharedState = { ...sharedState, ...partial };
    if (typeof partial.recordingStatus === 'string') {
      if (partial.recordingStatus === 'recording' || partial.recordingStatus === 'paused') {
        showRecordingControlWindow();
      } else if (partial.recordingStatus === 'idle') {
        hideRecordingControlWindow();
      }
    }
    updateOverlayVisibility();
    broadcastState();
  });

  ipcMain.on('desktop:set-interaction-mode', (_event, mode: 'pointer' | 'drawing') => {
    logDesktopEvent('SET_INTERACTION_MODE', { mode });
    applyInteractionMode(mode);
  });

  ipcMain.on('desktop:set-overlay-ignore-mouse', (_event, ignore: boolean) => {
    logDesktopEvent('SET_OVERLAY_IGNORE_MOUSE', { ignore });
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const wasVisible = overlayWindow.isVisible();
      overlayWindow.setIgnoreMouseEvents(ignore);
      if (!ignore) {
        if (!wasVisible) overlayWindow.showInactive();
        applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
      }
    }
  });

  ipcMain.on('desktop:move-toolbar-top', () => {
    logDesktopEvent('MOVE_TOOLBAR_TOP');
    closePopoutWindow();
    applyDesktopWindowZOrder();
  });

  ipcMain.on('desktop:set-toolbar-ignore-mouse', (_event, data) => {
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const ignore = typeof data === 'boolean' ? data : (data?.ignore ?? false);
      logDesktopEvent('SET_TOOLBAR_IGNORE_MOUSE', { ignore });
      toolbarWindow.setIgnoreMouseEvents(ignore);
    }
  });

  ipcMain.on(
    'desktop:open-popout',
    (_event, data: { popoutId: string; anchorOffsetY?: number; transitionId?: number }) => {
      logDesktopEvent('OPEN_POPOUT', data);
      openPopoutWindow(data);
    }
  );

  ipcMain.on('desktop:close-popout', (_event, data?: { transitionId?: number }) => {
    logDesktopEvent('CLOSE_POPOUT', data);
    closePopoutWindow(data?.transitionId);
  });

  ipcMain.on(
    'desktop:set-toolbar-bounds',
    (_event, bounds: { x?: number; y?: number; width?: number; height?: number }) => {
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        const cur = toolbarWindow.getBounds();
        const nextX = bounds.x !== undefined ? Math.round(bounds.x) : cur.x;
        const nextY = bounds.y !== undefined ? Math.round(bounds.y) : cur.y;
        const nextW = bounds.width !== undefined ? Math.round(bounds.width) : cur.width;
        const nextH = bounds.height !== undefined ? Math.round(bounds.height) : cur.height;
        const dx = Math.abs(cur.x - nextX);
        const dy = Math.abs(cur.y - nextY);
        const dw = Math.abs(cur.width - nextW);
        const dh = Math.abs(cur.height - nextH);
        if (dx > 1 || dy > 1 || dw > 1 || dh > 1) {
          logDesktopEvent('SET_TOOLBAR_BOUNDS_START', {
            cur,
            next: { x: nextX, y: nextY, width: nextW, height: nextH },
            isExpanding: nextW > 50 && cur.width <= 50,
            isRestoring: nextW <= 50 && cur.width > 50,
          });
          isProgrammaticBoundsChange = true;
          if (programmaticBoundsTimer) {
            clearTimeout(programmaticBoundsTimer);
          }
          toolbarWindow.setBounds({
            x: nextX,
            y: nextY,
            width: nextW,
            height: nextH,
          });
          applyDesktopWindowZOrder();
          programmaticBoundsTimer = setTimeout(() => {
            isProgrammaticBoundsChange = false;
            programmaticBoundsTimer = null;
            logDesktopEvent('SET_TOOLBAR_BOUNDS_END', { bounds: toolbarWindow?.getBounds() });
          }, 350);
        }
      }
    }
  );

  ipcMain.on('desktop:move-toolbar', (_event, pos: { x: number; y: number }) => {
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      if (cachedDisplays.length === 0) {
        cachedDisplays = getDisplaysInfo();
      }
      const cur = toolbarWindow.getBounds();
      const clamped = clampToolbarToDisplays(pos.x, pos.y, cur.width, cur.height, cachedDisplays, {
        allowFullVerticalRange: true,
      });
      const nextX = Math.round(clamped.x);
      const nextY = Math.round(clamped.y);
      if (cur.x !== nextX || cur.y !== nextY) {
        toolbarWindow.setPosition(nextX, nextY);
        if (sharedState.toolbarVisible) {
          sharedState.toolbarPosition = { x: nextX, y: nextY };
        } else {
          sharedState.restoreButtonPosition = { x: nextX, y: nextY };
        }
      }
    }
  });

  ipcMain.handle('desktop:get-toolbar-position', () => {
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const [x, y] = toolbarWindow.getPosition();
      return { x, y };
    }
    const settings = loadSavedSettings();
    return settings.toolbarPosition;
  });

  ipcMain.on('desktop:save-toolbar-position', (_event, pos: { x: number; y: number }) => {
    const settings = loadSavedSettings();
    const clamped = { x: Math.round(pos.x), y: Math.round(pos.y) };
    settings.toolbarPosition = clamped;
    settings.restoreButtonPosition = clamped;
    saveSettingsToDisk(settings);
    sharedState.toolbarPosition = clamped;
    sharedState.restoreButtonPosition = clamped;
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      toolbarWindow.moveTop();
    }
    broadcastState();
  });

  ipcMain.on('desktop:save-restore-position', (_event, pos: { x: number; y: number }) => {
    const settings = loadSavedSettings();
    const clamped = { x: Math.round(pos.x), y: Math.round(pos.y) };
    settings.restoreButtonPosition = clamped;
    settings.toolbarPosition = clamped;
    saveSettingsToDisk(settings);
    sharedState.restoreButtonPosition = clamped;
    sharedState.toolbarPosition = clamped;
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      toolbarWindow.moveTop();
    }
    broadcastState();
  });

  ipcMain.on('desktop:toggle-eye', () => toggleEyeState());
  ipcMain.on('desktop:set-eye', (_event, visible: boolean) => setEyeState(visible));

  ipcMain.on('desktop:open-settings', () => openSettingsWindow('toolbar'));

  ipcMain.on('desktop:close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win !== overlayWindow && win !== toolbarWindow) {
      win.close();
    }
  });

  ipcMain.on('desktop:minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('desktop:dispatch-action', (_event, data: { action: string; payload?: unknown }) => {
    if (data.action === 'clear-screen' || data.action === 'clear-board') {
      authoritativeDesktopAnnotations = [];
    }
    if (data.action === 'start-recording') {
      logDesktopEvent('START_RECORDING_ACTION');
      sharedState.isRecording = true;
      sharedState.recordingStatus = 'recording';
      showRecordingControlWindow();
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (!overlayWindow.isVisible()) overlayWindow.showInactive();
        if (sharedState.interactionMode === 'pointer') {
          overlayWindow.setIgnoreMouseEvents(true);
        }
        applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
      }
    }
    if (data.action === 'stop-recording' || data.action === 'cancel-recording') {
      logDesktopEvent('STOP_RECORDING_ACTION');
      sharedState.isRecording = false;
      sharedState.recordingStatus = 'stopping';
      hideRecordingControlWindow();
    }
    if (data.action === 'preview-recording') {
      logDesktopEvent('PREVIEW_RECORDING_ACTION');
      if (data.payload) {
        sharedState.latestRecording = data.payload as any;
      }
      sharedState.interactionMode = 'drawing';
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setIgnoreMouseEvents(false);
        overlayWindow.show();
        overlayWindow.focus();
      }
      applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
      broadcastState();
    }
    if (data.action === 'close-preview' || data.action === 'clear-recording') {
      logDesktopEvent('CLOSE_PREVIEW_ACTION');
      if (data.action === 'clear-recording') {
        sharedState.latestRecording = null;
      }
      if (sharedState.activeTool === 'pointer' || sharedState.activeTool === 'cursor') {
        sharedState.interactionMode = 'pointer';
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.setIgnoreMouseEvents(true);
          if (sharedState.historyCount === 0 && !sharedState.isRecording) {
            overlayWindow.hide();
          }
        }
      }
      broadcastState();
    }
    if (data.action === 'select-recording-area' || data.action === 'capture-area') {
      logDesktopEvent('ACTIVATE_AREA_SELECTION_MODE', { action: data.action });
      sharedState.interactionMode = 'drawing';
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (!overlayWindow.isVisible()) overlayWindow.showInactive();
        overlayWindow.setIgnoreMouseEvents(false);
      }
      applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
    }
    if (data.action === 'cancel-recording-area') {
      logDesktopEvent('CANCEL_AREA_SELECTION_MODE');
      if (sharedState.activeTool === 'pointer' || sharedState.activeTool === 'cursor') {
        sharedState.interactionMode = 'pointer';
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.setIgnoreMouseEvents(true);
          if (sharedState.historyCount === 0 && !sharedState.isRecording) {
            overlayWindow.hide();
          }
        }
      }
    }
    forwardActionToOverlay(data.action, data.payload);
  });

  ipcMain.on('desktop:save-annotations', (_event, items: unknown[]) => {
    authoritativeDesktopAnnotations = Array.isArray(items) ? items : [];
  });

  ipcMain.handle('desktop:get-annotations', () => authoritativeDesktopAnnotations);

  ipcMain.handle('desktop:get-virtual-bounds', () => getVirtualBounds());

  // Screen capture & media sources via desktopCapturer
  ipcMain.handle('desktop:capture-thumbnail', async () => {
    const primary = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(1920, primary.bounds.width),
        height: Math.min(1080, primary.bounds.height),
      },
    });
    return sources[0]?.thumbnail.toDataURL() || null;
  });

  ipcMain.handle('desktop:get-media-sources', async (_event, types: ('screen' | 'window')[]) => {
    const sources = await desktopCapturer.getSources({
      types: types.length > 0 ? types : ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnailDataUrl: s.thumbnail.toDataURL(),
      displayId: s.display_id,
    })) as DesktopCaptureSource[];
  });

  ipcMain.handle(
    'desktop:save-capture-file',
    async (_event, data: { dataUrl: string; defaultFilename: string }) => {
      const parentWin =
        (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()
          ? overlayWindow
          : (toolbarWindow && !toolbarWindow.isDestroyed() ? toolbarWindow : null));
      const saveDialogOptions = {
        defaultPath: data.defaultFilename,
        filters: [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'WebM Video', extensions: ['webm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      };
      const { filePath, canceled } = parentWin
        ? await dialog.showSaveDialog(parentWin, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions);

      if (canceled || !filePath) return { ok: false };

      try {
        const matches = data.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(data.dataUrl);
        fs.writeFileSync(filePath, buffer);
        return { ok: true, path: filePath };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
  );

  ipcMain.handle(
    'desktop:save-recording-file',
    async (
      _event,
      data: {
        buffer?: ArrayBuffer | Uint8Array;
        defaultFilename: string;
        askWhereToSave?: boolean;
        sourcePath?: string;
      }
    ) => {
      const isMp4 = data.defaultFilename.toLowerCase().endsWith('.mp4');
      const filters = isMp4
        ? [{ name: 'MP4 Video', extensions: ['mp4'] }, { name: 'All Files', extensions: ['*'] }]
        : [{ name: 'WebM Video', extensions: ['webm'] }, { name: 'All Files', extensions: ['*'] }];

      let targetPath: string | null = null;

      if (data.askWhereToSave) {
        const parentWin =
          (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()
            ? overlayWindow
            : (toolbarWindow && !toolbarWindow.isDestroyed() ? toolbarWindow : null));
        const saveDialogOptions = {
          defaultPath: data.defaultFilename,
          filters,
        };
        const { filePath, canceled } = parentWin
          ? await dialog.showSaveDialog(parentWin, saveDialogOptions)
          : await dialog.showSaveDialog(saveDialogOptions);

        if (canceled || !filePath) return { ok: false, canceled: true };
        targetPath = filePath;
      } else {
        const baseDir =
          app.getPath('videos') || app.getPath('downloads') || app.getPath('userData');
        targetPath = path.join(baseDir, data.defaultFilename);
      }

      try {
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          await fs.promises.mkdir(parentDir, { recursive: true });
        }

        // Fast path: if source file on disk already exists, copy directly (0ms, 0 RAM overhead)
        if (data.sourcePath && fs.existsSync(data.sourcePath)) {
          const sameDestination = path.resolve(data.sourcePath) === path.resolve(targetPath);
          if (!sameDestination) {
            await fs.promises.copyFile(data.sourcePath, targetPath);
          }
          const stat = await fs.promises.stat(targetPath);
          if (stat.size > 0) {
            logDesktopEvent('RECORDING_SAVED_TO_DISK', { path: targetPath, size: stat.size });
            return { ok: true, path: targetPath, size: stat.size };
          }
        }

        if (!data.buffer) {
          return { ok: false, error: 'No video buffer or source file provided.' };
        }

        let buf: Buffer;
        if (Buffer.isBuffer(data.buffer)) {
          buf = data.buffer;
        } else if (data.buffer instanceof Uint8Array) {
          buf = Buffer.from(data.buffer.buffer, data.buffer.byteOffset, data.buffer.byteLength);
        } else if (data.buffer && typeof data.buffer === 'object' && Array.isArray((data.buffer as any).data)) {
          buf = Buffer.from((data.buffer as any).data);
        } else {
          buf = Buffer.from(data.buffer as any);
        }
        await fs.promises.writeFile(targetPath, buf);
        const stat = await fs.promises.stat(targetPath);
        if (stat.size === 0) {
          logDesktopEvent('RECORDING_SAVE_ERROR', { error: 'Saved file on disk is empty (0 bytes).' });
          return { ok: false, error: 'Saved recording file on disk was empty (0 bytes).' };
        }
        logDesktopEvent('RECORDING_SAVED_TO_DISK', { path: targetPath, size: stat.size });
        return { ok: true, path: targetPath, size: stat.size };
      } catch (err) {
        logDesktopEvent('RECORDING_SAVE_ERROR', { error: String(err) });
        return { ok: false, error: String(err) };
      }
    }
  );

  ipcMain.handle('desktop:show-item-in-folder', async (_event, filePath: string) => {
    if (typeof filePath === 'string') {
      const normalized = path.normalize(filePath);
      if (fs.existsSync(normalized)) {
        shell.showItemInFolder(normalized);
        return true;
      }
    }
    return false;
  });

  ipcMain.handle('desktop:open-path', async (_event, filePath: string) => {
    if (typeof filePath === 'string') {
      const normalized = path.normalize(filePath);
      if (fs.existsSync(normalized)) {
        return await shell.openPath(normalized);
      }
    }
    return 'File does not exist';
  });

  ipcMain.handle('desktop:get-displays-info', () => getDisplaysInfo());
  ipcMain.handle('desktop:open-recording-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Open Saved Video Recording',
      filters: [
        { name: 'Video Files (*.webm, *.mp4)', extensions: ['webm', 'mp4'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { ok: false, canceled: true };
    }

    const selectedPath = filePaths[0];
    try {
      const stat = await fs.promises.stat(selectedPath);
      const filename = path.basename(selectedPath);
      const isMp4 = filename.toLowerCase().endsWith('.mp4');
      const mimeType = isMp4 ? 'video/mp4' : 'video/webm';
      const mediaUrl = toProScreenMediaUrl(selectedPath);

      const artifact = {
        id: `rec_${Date.now()}`,
        filename,
        savedPath: selectedPath,
        blobUrl: mediaUrl,
        sizeBytes: stat.size,
        mimeType,
        durationMs: 0,
        createdAt: stat.mtimeMs,
        mode: 'screen',
        quality: 'high',
        hasAudio: true,
      };

      sharedState.latestRecording = artifact as any;
      sharedState.interactionMode = 'drawing';
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (!overlayWindow.isVisible()) overlayWindow.showInactive();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        try {
          overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        } catch {}
        overlayWindow.setIgnoreMouseEvents(false);
      }
      broadcastState();
      forwardActionToOverlay('preview-recording', artifact);
      return { ok: true, artifact };
    } catch (err) {
      logDesktopEvent('OPEN_RECORDING_ERROR', { error: String(err) });
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.on('desktop:set-recording-target-display', (_event, displayId: string | null) => {
    targetRecordingDisplayId = displayId;
  });
  ipcMain.on('desktop:set-recording-target-source', (_event, sourceId: string | null) => {
    targetRecordingDisplayId = sourceId;
  });
  ipcMain.on('desktop:set-recording-target-mode', (_event, mode: string | null) => {
    targetRecordingMode = mode;
  });

  ipcMain.handle('desktop:load-settings', () => loadSavedSettings());
  ipcMain.handle('desktop:save-settings', async (_event, settings: UserSettings) => {
    if (isShuttingDown || isShutdownCompleted) return false;
    activeSettings = { ...settings };
    currentSettingsVersion++;
    const version = currentSettingsVersion;
    if (settings.toolbarPosition) {
      sharedState.toolbarPosition = settings.toolbarPosition;
    }
    if (settings.restoreButtonPosition) {
      sharedState.restoreButtonPosition = settings.restoreButtonPosition;
    }
    const ok = await performDiskWrite(settings, version);
    if (settings.startWithWindows !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: Boolean(settings.startWithWindows),
        args: ['--background'],
      });
    }
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('desktop:settings-changed', activeSettings);
    }
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.webContents.send('desktop:settings-changed', activeSettings);
    }
    if (popoutWindow && !popoutWindow.isDestroyed()) {
      popoutWindow.webContents.send('desktop:settings-changed', activeSettings);
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('desktop:settings-changed', activeSettings);
    }
    return ok;
  });

  ipcMain.on('desktop:quit-app', () => {
    if (isShutdownCompleted) {
      requestAppQuit('ipc-quit-app-immediate');
      return;
    }
    void gracefulShutdown(1500).finally(() => {
      requestAppQuit('ipc-quit-app-graceful');
    });
  });
}

// Recalculate virtual bounds on display configuration changes
function setupDisplayListeners() {
  const onDisplaysChanged = () => {
    updateCachedDisplays();
    const vb = getVirtualBounds();
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setBounds({
        x: vb.x,
        y: vb.y,
        width: vb.width,
        height: vb.height,
      });
      overlayWindow.webContents.send('desktop:displays-changed', vb);
    }

    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const [curX, curY] = toolbarWindow.getPosition();
      const curBounds = toolbarWindow.getBounds();
      const clamped = clampToolbarToDisplays(curX, curY, curBounds.width, curBounds.height, cachedDisplays);
      toolbarWindow.setPosition(clamped.x, clamped.y);
      toolbarWindow.webContents.send('desktop:displays-changed', vb);
    }
  };

  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);
  screen.on('display-metrics-changed', onDisplaysChanged);
}

// Safe Chromium switches for reliable Windows DWM compositing & background capture
for (const sw of resolveProductionChromiumSwitches()) {
  try {
    if (sw.value !== undefined) {
      app.commandLine.appendSwitch(sw.name, sw.value);
    } else {
      app.commandLine.appendSwitch(sw.name);
    }
  } catch {}
}

async function startDesktopApp() {
  updateCachedDisplays();
  appendDesktopLogSync('APP_READY', {
    displayCount: cachedDisplays.length,
    isDev,
    mainDir: __dirname,
  });

  // Register custom streaming protocol for video recording playback and seeking
  try {
    protocol.handle('proscreen-media', (request) => {
      try {
        const localPath = fromProScreenMediaUrl(request.url, process.platform);
        if (!localPath || !fs.existsSync(localPath)) {
          return new Response('File not found', { status: 404 });
        }
        const stat = fs.statSync(localPath);
        const fileSize = stat.size;
        const rangeHeader = request.headers.get('range');
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === '.mp4' ? 'video/mp4' : 'video/webm';

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const rawStart = parseInt(parts[0], 10);
          const rawEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const start = Number.isFinite(rawStart) ? Math.max(0, Math.min(rawStart, Math.max(0, fileSize - 1))) : 0;
          const end = Number.isFinite(rawEnd) ? Math.max(start, Math.min(rawEnd, Math.max(0, fileSize - 1))) : Math.max(0, fileSize - 1);
          const chunkSize = Math.max(0, end - start + 1);
          const nodeStream = fs.createReadStream(localPath, { start, end });
          const readable = new ReadableStream({
            start(controller) {
              nodeStream.on('data', (chunk) => controller.enqueue(chunk));
              nodeStream.on('end', () => controller.close());
              nodeStream.on('error', (err) => controller.error(err));
            },
            cancel() {
              nodeStream.destroy();
            },
          });
          return new Response(readable, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': mimeType,
            },
          });
        } else {
          const nodeStream = fs.createReadStream(localPath);
          const readable = new ReadableStream({
            start(controller) {
              nodeStream.on('data', (chunk) => controller.enqueue(chunk));
              nodeStream.on('end', () => controller.close());
              nodeStream.on('error', (err) => controller.error(err));
            },
            cancel() {
              nodeStream.destroy();
            },
          });
          return new Response(readable, {
            status: 200,
            headers: {
              'Content-Length': String(fileSize),
              'Accept-Ranges': 'bytes',
              'Content-Type': mimeType,
            },
          });
        }
      } catch (err) {
        return new Response('Error loading media: ' + String(err), { status: 500 });
      }
    });
  } catch (err) {
    appendDesktopLogSync('PROTOCOL_REGISTER_ERROR', { error: String(err) });
  }

  // Pre-fetch primary screen source for instant (0ms) getDisplayMedia response
  let cachedPrimaryScreenSource: Electron.DesktopCapturerSource | null = null;
  const refreshScreenSource = async () => {
    try {
      const primary = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 },
      });
      const found =
        sources.find((s) => s.display_id === String(primary.id)) ||
        sources.find((s) => s.id === 'screen:0:0') ||
        sources.find((s) => s.id.startsWith('screen:')) ||
        sources[0];
      if (found) {
        cachedPrimaryScreenSource = found;
      }
    } catch {}
  };
  void refreshScreenSource();
  setInterval(() => void refreshScreenSource(), 15000);

  setupIpcHandlers();
  setupDisplayListeners();

  // Desktop Screen & Tab Audio Capture Handler
  try {
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        let chosenSource: Electron.DesktopCapturerSource | undefined;

        if (targetRecordingDisplayId) {
          const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
          chosenSource = sources.find(
            (s) => s.id === targetRecordingDisplayId || s.display_id === targetRecordingDisplayId
          );
        }

        if (!chosenSource && targetRecordingMode === 'window') {
          const sources = await desktopCapturer.getSources({ types: ['window'] });
          chosenSource = sources.find(
            (s) =>
              s.id.startsWith('window:') &&
              !s.name.includes('ProScreen') &&
              !s.name.includes('Desktop Toolbar') &&
              !s.name.includes('Desktop Overlay') &&
              s.name.trim().length > 0
          );
        }

        if (!chosenSource && targetRecordingMode === 'tab') {
          const sources = await desktopCapturer.getSources({ types: ['window'] });
          chosenSource =
            sources.find(
              (s) =>
                s.id.startsWith('window:') &&
                (s.name.includes('Chrome') ||
                  s.name.includes('Edge') ||
                  s.name.includes('Brave') ||
                  s.name.includes('Firefox'))
            ) ||
            sources.find(
              (s) =>
                s.id.startsWith('window:') &&
                !s.name.includes('ProScreen') &&
                s.name.trim().length > 0
            );
        }

        if (!chosenSource) {
          if (cachedPrimaryScreenSource) {
            chosenSource = cachedPrimaryScreenSource;
          } else {
            const sources = await desktopCapturer.getSources({ types: ['screen'] });
            const primary = screen.getPrimaryDisplay();
            chosenSource =
              sources.find((s) => s.display_id === String(primary.id)) ||
              sources.find((s) => s.id === 'screen:0:0') ||
              sources.find((s) => s.id.startsWith('screen:')) ||
              sources[0];
            if (chosenSource) cachedPrimaryScreenSource = chosenSource;
          }
        }

        const response: { video: Electron.DesktopCapturerSource; audio?: 'loopback' } = {
          video: chosenSource!,
        };
        if (request.audioRequested) {
          response.audio = 'loopback';
        }
        callback(response);
      } catch (err) {
        logDesktopEvent('DISPLAY_MEDIA_HANDLER_ERROR', { error: String(err) });
        callback({ video: undefined as unknown as Electron.DesktopCapturerSource });
      }
    });
  } catch (err) {
    logDesktopEvent('DISPLAY_MEDIA_HANDLER_ERROR', { error: String(err) });
  }

  let rawIsolationMode = process.env.ISOLATION_MODE || '';
  const modeFilePath = path.join(__dirname, '../isolation_mode.txt');
  if (fs.existsSync(modeFilePath)) {
    try {
      rawIsolationMode = fs.readFileSync(modeFilePath, 'utf8').trim();
    } catch {}
  }

  const studioDecision = evaluateStudioStartupDecision(process.argv, rawIsolationMode);
  const isolationMode = studioDecision.normalizedIsolationMode;

  appendDesktopLogSync('STARTUP_ISOLATION_MODE', {
    isolationMode,
    rawIsolationMode: rawIsolationMode || null,
    shouldLaunchStudio: studioDecision.shouldLaunch,
    studioDecisionReason: studioDecision.reason,
  });

  if (studioDecision.shouldLaunch) {
    try {
      settingsWindow = openSettingsWindow('startup');
    } catch (err) {
      appendDesktopLogSync('STUDIO_STARTUP_FAILED', {
        trigger: 'startup',
        stage: 'open-settings-window',
        error: err instanceof Error ? err.stack || err.message : String(err),
      });
      appendDesktopLogSync('MAIN_WINDOW_CREATE_ERROR', { error: String(err) });
    }
  } else {
    appendDesktopLogSync('STUDIO_STARTUP_REQUESTED', {
      trigger: 'startup',
      skipped: true,
      reason: studioDecision.reason,
      isolationMode,
      argv: process.argv.slice(0, 6),
    });
  }

  if (shouldLaunchOverlayWindow(isolationMode)) {
    try {
      overlayWindow = createOverlayWindow();
    } catch (err) {
      appendDesktopLogSync('OVERLAY_WINDOW_CREATE_ERROR', { error: String(err) });
    }
  }
  if (shouldLaunchFloatingToolbar(isolationMode)) {
    try {
      toolbarWindow = createToolbarWindow();
      // Pre-warm hidden popout window so the first hover/click opens immediately with loaded React UI
      if (!popoutWindow || popoutWindow.isDestroyed()) {
        popoutWindow = createPopoutWindow();
      }
    } catch (err) {
      appendDesktopLogSync('TOOLBAR_WINDOW_CREATE_ERROR', { error: String(err) });
    }
  }

  const health = evaluateStartupWindowHealth({
    mainWindowCreated: Boolean(settingsWindow && !settingsWindow.isDestroyed()),
    toolbarWindowCreated: Boolean(toolbarWindow && !toolbarWindow.isDestroyed()),
    overlayWindowCreated: Boolean(overlayWindow && !overlayWindow.isDestroyed()),
  });

  if (!health.healthy) {
    throw new Error(health.reason || 'Startup window creation failed');
  }

  createSystemTray();
  registerGlobalShortcuts();
  isAppStartupCompleted = true;

  appendDesktopLogSync('STARTUP_WINDOWS_READY', {
    mainWindow: Boolean(settingsWindow && !settingsWindow.isDestroyed()),
    overlay: Boolean(overlayWindow && !overlayWindow.isDestroyed()),
    toolbar: Boolean(toolbarWindow && !toolbarWindow.isDestroyed()),
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      settingsWindow = openSettingsWindow('activate');
      overlayWindow = createOverlayWindow();
      toolbarWindow = createToolbarWindow();
    }
  });

  app.on('browser-window-blur', () => {
    applyDesktopWindowZOrder({ ensureOverlayTopmost: true });
  });
}

void app.whenReady().then(startDesktopApp).catch((err) => {
  handleFatalStartupError('whenReady', err);
});

let isBeforeQuitStarted = false;

function destroyAllDesktopWindows() {
  if (popoutWindow && !popoutWindow.isDestroyed()) {
    popoutWindow.destroy();
    popoutWindow = null;
  }
  if (recordingControlWindow && !recordingControlWindow.isDestroyed()) {
    recordingControlWindow.destroy();
    recordingControlWindow = null;
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
    overlayWindow = null;
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.destroy();
    toolbarWindow = null;
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
    settingsWindow = null;
  }
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
}

app.on('before-quit', (event) => {
  appendDesktopLogSync('APP_BEFORE_QUIT', { isShutdownCompleted, isBeforeQuitStarted });
  if (isShutdownCompleted) {
    destroyAllDesktopWindows();
    return;
  }

  // Intercept the quit event once to perform bounded graceful shutdown
  event.preventDefault();

  if (isBeforeQuitStarted) {
    return;
  }
  isBeforeQuitStarted = true;
  unregisterKeyboardVisualizerIpc?.();
  unregisterKeyboardVisualizerIpc = null;

  void Promise.all([gracefulShutdown(1500), keyboardVisualizerController.stop()]).finally(() => {
    destroyAllDesktopWindows();
    requestAppQuit('before-quit-graceful-complete');
  });
});

app.on('will-quit', () => {
  appendDesktopLogSync('APP_WILL_QUIT');
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  appendDesktopLogSync('WINDOW_ALL_CLOSED', { platform: process.platform });
  if (process.platform !== 'darwin') {
    requestAppQuit('window-all-closed');
  }
});
