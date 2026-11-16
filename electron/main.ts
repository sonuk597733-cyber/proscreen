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

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  try {
    const p = path.join(app.getPath('userData'), 'proscreen-desktop.log');
    fs.appendFileSync(p, `[${new Date().toISOString()}] Secondary instance prevented from starting.\n`);
  } catch {}
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  setEyeState(true);
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    if (toolbarWindow.isMinimized()) toolbarWindow.restore();
    toolbarWindow.show();
    toolbarWindow.setAlwaysOnTop(true);
    toolbarWindow.focus();
  }
});

process.on('uncaughtException', (err) => {
  try {
    const p = path.join(app.getPath('userData'), 'proscreen-desktop.log');
    fs.appendFileSync(p, `[${new Date().toISOString()}] Uncaught exception: ${err?.stack || err}\n`);
  } catch {}
});

let overlayWindow: BrowserWindow | null = null;
let toolbarWindow: BrowserWindow | null = null;
let popoutWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let authoritativeDesktopAnnotations: unknown[] = [];
let popoutTransitionId = 0;
let currentPopoutId: string | null = null;
let targetRecordingDisplayId: string | null = null;
let targetRecordingMode: string | null = null;

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
  try {
    const p = path.join(app.getPath('userData'), 'proscreen-desktop.log');
    const line = `[${new Date().toISOString()}] [${event}] ${JSON.stringify(meta)}\n`;
    fs.appendFile(p, line, () => {});
    console.log(`[${event}]`, JSON.stringify(meta));
  } catch {}
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
    logDesktopEvent('RENDERER_CONSOLE', {
      name,
      id: win.id,
      level,
      message,
      line,
      sourceId,
    });
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

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/desktop-overlay.html`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/desktop-overlay.html'));
  }

  win.on('show', () => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(true, 'screen-saver');
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
    show: true,
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
      win.setAlwaysOnTop(true, 'screen-saver');
      win.moveTop();
    }
  });

  win.on('show', () => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(true, 'screen-saver');
      win.moveTop();
    }
  });

  win.on('restore', () => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(true, 'screen-saver');
      win.moveTop();
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

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/desktop-toolbar.html`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/desktop-toolbar.html'));
  }

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
    // If focus transferred to the toolbar window, do NOT close the popout from blur!
    // The user clicked on the toolbar window to switch dropdowns or click a tool.
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

  try {
    win.setContentProtection(true);
  } catch {}

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/desktop-toolbar.html?mode=dropdown`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/desktop-toolbar.html'), {
      query: { mode: 'dropdown' },
    });
  }

  win.on('closed', () => {
    popoutWindow = null;
  });

  instrumentWindow(win, 'popout');

  return win;
}

function openPopoutWindow(data: { popoutId: string; anchorOffsetY?: number; transitionId?: number }) {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return;
  popoutTransitionId++;
  const thisTransition = popoutTransitionId;
  currentPopoutId = data.popoutId;

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

  popoutWindow.webContents.send('desktop:popout-data', {
    popoutId: data.popoutId,
    openSide: openLeft ? 'left' : 'right',
    anchorOffsetY: data.anchorOffsetY ?? 20,
    transitionId: thisTransition,
  });

  popoutWindow.show();
  popoutWindow.setAlwaysOnTop(true, 'screen-saver');
  popoutWindow.moveTop();
}

function closePopoutWindow(transitionId?: number) {
  if (transitionId !== undefined && transitionId !== popoutTransitionId) {
    return; // Stale close request from older dropdown; ignore!
  }
  currentPopoutId = null;
  const thisTransition = ++popoutTransitionId;

  if (popoutWindow && !popoutWindow.isDestroyed() && popoutWindow.isVisible()) {
    popoutWindow.hide();
    popoutWindow.webContents.send('desktop:popout-data', { popoutId: null, transitionId: thisTransition });
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
      win.setAlwaysOnTop(true, 'screen-saver');
      win.moveTop();
    }
  });

  win.on('show', () => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(true, 'screen-saver');
      win.moveTop();
    }
  });

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/desktop-toolbar.html?mode=recording-bar`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/desktop-toolbar.html'), {
      query: { mode: 'recording-bar' },
    });
  }

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
  recordingControlWindow.setAlwaysOnTop(true, 'screen-saver');
  recordingControlWindow.moveTop();
}

function hideRecordingControlWindow() {
  if (recordingControlWindow && !recordingControlWindow.isDestroyed() && recordingControlWindow.isVisible()) {
    recordingControlWindow.hide();
  }
}

/**
 * Creates or reveals the Settings window.
 */
function openSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  const preloadPath = path.join(__dirname, 'preload.cjs');
  const win = new BrowserWindow({
    width: 680,
    height: 620,
    title: 'ProScreen Settings',
    center: true,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    win.setContentProtection(true);
  } catch {}

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/options.html`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/options.html'));
  }

  win.on('closed', () => {
    settingsWindow = null;
  });

  instrumentWindow(win, 'settings');

  settingsWindow = win;
  return win;
}

/**
 * Updates click-through state on the overlay window according to interaction mode.
 */
function applyInteractionMode(mode: 'pointer' | 'drawing') {
  logDesktopEvent('APPLY_INTERACTION_MODE', { mode, hasOverlay: Boolean(overlayWindow) });
  sharedState.interactionMode = mode;
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (mode === 'pointer') {
    // Pure Win32 click-through (WS_EX_TRANSPARENT without WH_MOUSE_LL hook)
    overlayWindow.setIgnoreMouseEvents(true);
    try {
      globalShortcut.unregister('Escape');
    } catch {}
    // In Pointer mode, if there are NO annotations, hide overlay completely so Windows desktop is 100% untouched
    if (sharedState.historyCount === 0 && !sharedState.isRecording) {
      if (overlayWindow.isVisible()) overlayWindow.hide();
    } else {
      if (!overlayWindow.isVisible()) overlayWindow.showInactive();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      overlayWindow.setIgnoreMouseEvents(true);
    }
  } else {
    // Drawing mode: Canvas captures clicks without stealing OS activation
    if (!overlayWindow.isVisible()) overlayWindow.showInactive();
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    try {
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch {}
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

    // CRITICAL: Ensure toolbar is always above the overlay so tools can be switched anytime
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      try {
        toolbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } catch {}
      toolbarWindow.moveTop();
    }
  }

  broadcastState();
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

    // Hide overlay window completely so no visible annotations remain and 100% desktop pass-through
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(true);
      overlayWindow.hide();
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
    const iconData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAExJREFUOE9jZKAQMFKon2H4f+p/hkERhxkYGBj+E5Mnk2GkGkCWgYYGkBu0pBkgYQDZgQYGI0Gg/z+yZgYGhn84DCBa/BElT4kNAABx8BwRE/B4twAAAABJRU5ErkJggg==',
      'base64'
    );
    const trayIconPath = path.join(app.getPath('userData'), 'proscreen-tray-icon.png');
    fs.mkdirSync(path.dirname(trayIconPath), { recursive: true });
    fs.writeFileSync(trayIconPath, iconData);

    const icon = nativeImage.createFromPath(trayIconPath);
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
      label: isVisible ? 'Hide ProScreen (Eye OFF)' : 'Show ProScreen (Eye ON)',
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
        openSettingsWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Exit ProScreen',
      click: () => {
        app.quit();
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
        app.quit();
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
  ipcMain.handle('desktop:get-window-type', (event) => {
    if (overlayWindow && event.sender.id === overlayWindow.webContents.id) return 'overlay';
    if (toolbarWindow && event.sender.id === toolbarWindow.webContents.id) return 'toolbar';
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
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (sharedState.interactionMode === 'drawing') {
        if (!overlayWindow.isVisible()) overlayWindow.showInactive();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        try {
          overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        } catch {}
        overlayWindow.setIgnoreMouseEvents(false);
      } else if (!sharedState.annotationsVisible || !sharedState.toolbarVisible) {
        if (overlayWindow.isVisible()) overlayWindow.hide();
      } else if (sharedState.historyCount === 0 && !sharedState.isRecording) {
        if (overlayWindow.isVisible()) overlayWindow.hide();
      } else {
        if (!overlayWindow.isVisible()) overlayWindow.showInactive();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        try {
          overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        } catch {}
        overlayWindow.setIgnoreMouseEvents(true);
      }
    }
    broadcastState();
  });

  ipcMain.on('desktop:set-interaction-mode', (_event, mode: 'pointer' | 'drawing') => {
    logDesktopEvent('SET_INTERACTION_MODE', { mode });
    applyInteractionMode(mode);
  });

  ipcMain.on('desktop:set-overlay-ignore-mouse', (_event, ignore: boolean) => {
    logDesktopEvent('SET_OVERLAY_IGNORE_MOUSE', { ignore });
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(ignore);
      if (!ignore) {
        if (!overlayWindow.isVisible()) overlayWindow.showInactive();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        try {
          overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        } catch {}
        if (toolbarWindow && !toolbarWindow.isDestroyed()) {
          toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
          toolbarWindow.moveTop();
        }
      }
    }
  });

  ipcMain.on('desktop:move-toolbar-top', () => {
    logDesktopEvent('MOVE_TOOLBAR_TOP');
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      toolbarWindow.moveTop();
    }
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
          toolbarWindow.moveTop();
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

  ipcMain.on('desktop:open-settings', () => openSettingsWindow());

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
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        if (sharedState.interactionMode === 'pointer') {
          overlayWindow.setIgnoreMouseEvents(true);
        }
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
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        try {
          overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        } catch {}
      }
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
        toolbarWindow.moveTop();
      }
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
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        try {
          overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        } catch {}
        overlayWindow.setIgnoreMouseEvents(false);
      }
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
        toolbarWindow.moveTop();
      }
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
          await fs.promises.copyFile(data.sourcePath, targetPath);
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
      const mediaUrl = `proscreen-media://local/${selectedPath.replace(/\\/g, '/')}`;

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
    return ok;
  });

  ipcMain.on('desktop:quit-app', () => {
    if (isShutdownCompleted) {
      app.quit();
      return;
    }
    void gracefulShutdown(1500).finally(() => {
      app.quit();
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

// Hardware-accelerated desktop video capture & smooth 60 FPS recording switches
try {
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  app.commandLine.appendSwitch('enable-features', 'MediaFoundationVideoEncoder');
  app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
} catch {}

app.whenReady().then(() => {
  updateCachedDisplays();
  try {
    const p = path.join(app.getPath('userData'), 'proscreen-desktop.log');
    fs.appendFile(p, `[${new Date().toISOString()}] App ready. Creating windows...\n`, () => {});
  } catch {}

  // Register custom streaming protocol for video recording playback and seeking
  try {
    protocol.handle('proscreen-media', (request) => {
      try {
        const url = new URL(request.url);
        let localPath = decodeURIComponent(url.pathname);
        if (process.platform === 'win32' && localPath.startsWith('/')) {
          localPath = localPath.slice(1);
        }
        if (!fs.existsSync(localPath)) {
          return new Response('File not found', { status: 404 });
        }
        const stat = fs.statSync(localPath);
        const fileSize = stat.size;
        const rangeHeader = request.headers.get('range');
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === '.mp4' ? 'video/mp4' : 'video/webm';

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = end - start + 1;
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
    console.error('[PROTOCOL] Failed to register proscreen-media:', err);
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

        // 1. Explicit target display or source ID specified
        if (targetRecordingDisplayId) {
          const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
          chosenSource = sources.find(
            (s) => s.id === targetRecordingDisplayId || s.display_id === targetRecordingDisplayId
          );
        }

        // 2. Window mode: pick active user application window (not ProScreen's own utility windows)
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

        // 3. Tab mode: pick browser window or active application window
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

        // 4. Default / Screen / Area: primary display (INSTANT 0ms response from cache if available)
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

  let isolationMode = process.env.ISOLATION_MODE || '4';
  const modeFilePath = path.join(__dirname, '../isolation_mode.txt');
  if (fs.existsSync(modeFilePath)) {
    try { isolationMode = fs.readFileSync(modeFilePath, 'utf8').trim(); } catch {}
  }
  logDesktopEvent('STARTUP_ISOLATION_MODE', { isolationMode });

  if (isolationMode === '3' || isolationMode === '4') {
    overlayWindow = createOverlayWindow();
  }
  if (isolationMode === '2' || isolationMode === '4') {
    toolbarWindow = createToolbarWindow();
  }
  createSystemTray();
  registerGlobalShortcuts();


  try {
    const p = path.join(app.getPath('userData'), 'proscreen-desktop.log');
    fs.appendFile(
      p,
      `[${new Date().toISOString()}] Windows created. Overlay: ${overlayWindow ? 'OK' : 'NULL'}, Toolbar: ${toolbarWindow ? 'OK' : 'NULL'}\n`,
      () => {}
    );
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      overlayWindow = createOverlayWindow();
      toolbarWindow = createToolbarWindow();
    }
  });

  app.on('browser-window-blur', () => {
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      toolbarWindow.moveTop();
    }
  });
});

let isBeforeQuitStarted = false;

app.on('before-quit', (event) => {
  if (isShutdownCompleted) {
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
    return;
  }

  // Intercept the quit event once to perform bounded graceful shutdown
  event.preventDefault();

  if (isBeforeQuitStarted) {
    return;
  }
  isBeforeQuitStarted = true;

  void gracefulShutdown(1500).finally(() => {
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
    app.quit();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
