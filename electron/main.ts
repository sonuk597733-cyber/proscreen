import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} from 'electron';
import fs from 'fs';
import path from 'path';
import {
  DesktopCaptureSource,
  DesktopDisplayInfo,
  DesktopSharedState,
  VirtualScreenBounds,
} from '../src/desktop/desktopTypes';
import { calculateVirtualBounds, clampToolbarToDisplays } from '../src/desktop/multiMonitor';
import { UserSettings } from '../src/types/settings';
import { createDefaultSettings } from '../src/storage/validation';

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let overlayWindow: BrowserWindow | null = null;
let toolbarWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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
};

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), 'proscreen-desktop-settings.json');
}

function loadSavedSettings(): UserSettings {
  try {
    const p = getSettingsFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read desktop settings:', err);
  }
  return createDefaultSettings();
}

function saveSettingsToDisk(settings: UserSettings): boolean {
  try {
    const p = getSettingsFilePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save desktop settings:', err);
    return false;
  }
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
    show: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Initial pass-through in POINTER mode
  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/desktop-overlay.html`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/desktop-overlay.html'));
  }

  win.on('closed', () => {
    overlayWindow = null;
  });

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
  const toolbarWidth = 380;
  const toolbarHeight = 780;

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
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver', 2);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Toolbar is ALWAYS interactive and never ignores mouse events
  win.setIgnoreMouseEvents(false);

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/desktop-toolbar.html`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/desktop-toolbar.html'));
  }

  win.on('closed', () => {
    toolbarWindow = null;
  });

  return win;
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

  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/options.html`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/options.html'));
  }

  win.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow = win;
  return win;
}

/**
 * Updates click-through state on the overlay window according to interaction mode.
 */
function applyInteractionMode(mode: 'pointer' | 'drawing') {
  sharedState.interactionMode = mode;
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (mode === 'pointer') {
    // Native click-through enabled: Excel, VS Code, Explorer receive clicks
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setFocusable(false);
  } else {
    // Drawing mode: Canvas captures clicks without forward
    overlayWindow.setFocusable(true);
    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.focus();
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
  updateTrayMenu();
}

/**
 * Eye OFF: hides complete floating toolbar, keeps annotation overlay visible,
 * and displays ONLY the small floating Eye restore button.
 * Does not delete any existing work, history, or undo/redo data.
 * Eye ON: restores toolbar, previous annotations, and tool settings in POINTER mode.
 */
function setEyeState(visible: boolean) {
  sharedState.toolbarVisible = visible;
  sharedState.restoreButtonVisible = !visible;
  sharedState.annotationsVisible = true; // Annotations ALWAYS remain visible!

  if (visible) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const tbPos = sharedState.toolbarPosition;
      toolbarWindow.setBounds({
        x: Math.round(tbPos.x),
        y: Math.round(tbPos.y),
        width: 380,
        height: 780,
      });
      toolbarWindow.show();
      toolbarWindow.setIgnoreMouseEvents(false);
    }
    // Eye ON restores Pointer mode
    sharedState.activeTool = 'pointer';
    applyInteractionMode('pointer');
    forwardActionToOverlay('open-eye');
    forwardActionToOverlay('select-tool', 'pointer');
  } else {
    // Eye OFF keeps annotations visible on overlay with native pass-through
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    // Toolbar window shrinks to 44x44 floating Eye restore button
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      const resPos = sharedState.restoreButtonPosition;
      toolbarWindow.setBounds({
        x: Math.round(resPos.x),
        y: Math.round(resPos.y),
        width: 44,
        height: 44,
      });
      toolbarWindow.show();
      toolbarWindow.setIgnoreMouseEvents(false);
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
    return 'settings';
  });

  ipcMain.handle('desktop:get-state', () => sharedState);

  ipcMain.on('desktop:sync-state', (_event, partial: Partial<DesktopSharedState>) => {
    sharedState = { ...sharedState, ...partial };
    broadcastState();
  });

  ipcMain.on('desktop:set-interaction-mode', (_event, mode: 'pointer' | 'drawing') => {
    applyInteractionMode(mode);
  });

  ipcMain.on('desktop:set-overlay-ignore-mouse', (_event, ignore: boolean) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (ignore) {
        overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        overlayWindow.setFocusable(false);
      } else {
        overlayWindow.setIgnoreMouseEvents(false);
        overlayWindow.setFocusable(true);
        overlayWindow.focus();
      }
    }
  });

  ipcMain.on('desktop:move-toolbar', (_event, pos: { x: number; y: number }) => {
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setPosition(Math.round(pos.x), Math.round(pos.y));
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
    settings.toolbarPosition = { x: Math.round(pos.x), y: Math.round(pos.y) };
    saveSettingsToDisk(settings);
    sharedState.toolbarPosition = settings.toolbarPosition;
  });

  ipcMain.on('desktop:save-restore-position', (_event, pos: { x: number; y: number }) => {
    const settings = loadSavedSettings();
    settings.restoreButtonPosition = { x: Math.round(pos.x), y: Math.round(pos.y) };
    saveSettingsToDisk(settings);
    sharedState.restoreButtonPosition = settings.restoreButtonPosition;
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
    forwardActionToOverlay(data.action, data.payload);
  });

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
      const win = BrowserWindow.getFocusedWindow() || toolbarWindow || overlayWindow;
      const { filePath, canceled } = await dialog.showSaveDialog(win || undefined as unknown as BrowserWindow, {
        defaultPath: data.defaultFilename,
        filters: [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'WebM Video', extensions: ['webm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

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

  ipcMain.handle('desktop:load-settings', () => loadSavedSettings());
  ipcMain.handle('desktop:save-settings', (_event, settings: UserSettings) => {
    const ok = saveSettingsToDisk(settings);
    if (settings.startWithWindows !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: Boolean(settings.startWithWindows),
      });
    }
    return ok;
  });

  ipcMain.on('desktop:quit-app', () => app.quit());
}

// Recalculate virtual bounds on display configuration changes
function setupDisplayListeners() {
  const onDisplaysChanged = () => {
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
      const clamped = clampToolbarToDisplays(curX, curY, 380, 780, getDisplaysInfo());
      toolbarWindow.setPosition(clamped.x, clamped.y);
      toolbarWindow.webContents.send('desktop:displays-changed', vb);
    }
  };

  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);
  screen.on('display-metrics-changed', onDisplaysChanged);
}

app.whenReady().then(() => {
  setupIpcHandlers();
  setupDisplayListeners();

  overlayWindow = createOverlayWindow();
  toolbarWindow = createToolbarWindow();
  createSystemTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      overlayWindow = createOverlayWindow();
      toolbarWindow = createToolbarWindow();
    }
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
