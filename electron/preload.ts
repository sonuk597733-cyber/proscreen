import { contextBridge, ipcRenderer } from 'electron';
import {
  DesktopCaptureSource,
  DesktopSharedState,
  DesktopWindowType,
  ProScreenDesktopAPI,
  VirtualScreenBounds,
} from '../src/desktop/desktopTypes';
import { UserSettings } from '../src/types/settings';

const desktopAPI: ProScreenDesktopAPI = {
  isDesktop: true,
  platform: process.platform as 'win32' | 'darwin' | 'linux',

  getWindowType: () => ipcRenderer.invoke('desktop:get-window-type'),

  getState: () => ipcRenderer.invoke('desktop:get-state'),
  syncState: (state: Partial<DesktopSharedState>) => {
    ipcRenderer.send('desktop:sync-state', state);
  },
  onStateChange: (callback: (state: DesktopSharedState) => void) => {
    const handler = (_event: unknown, state: DesktopSharedState) => callback(state);
    ipcRenderer.on('desktop:state-changed', handler);
    return () => {
      ipcRenderer.removeListener('desktop:state-changed', handler);
    };
  },

  setInteractionMode: (mode: 'pointer' | 'drawing') => {
    ipcRenderer.send('desktop:set-interaction-mode', mode);
  },
  setOverlayIgnoreMouse: (ignore: boolean) => {
    ipcRenderer.send('desktop:set-overlay-ignore-mouse', ignore);
  },

  moveToolbar: (x: number, y: number) => {
    ipcRenderer.send('desktop:move-toolbar', { x, y });
  },
  getToolbarPosition: () => ipcRenderer.invoke('desktop:get-toolbar-position'),
  saveToolbarPosition: (x: number, y: number) => {
    ipcRenderer.send('desktop:save-toolbar-position', { x, y });
  },
  saveRestoreButtonPosition: (x: number, y: number) => {
    ipcRenderer.send('desktop:save-restore-position', { x, y });
  },

  toggleEye: () => {
    ipcRenderer.send('desktop:toggle-eye');
  },
  setEye: (visible: boolean) => {
    ipcRenderer.send('desktop:set-eye', visible);
  },

  openSettingsWindow: () => {
    ipcRenderer.send('desktop:open-settings');
  },
  closeWindow: () => {
    ipcRenderer.send('desktop:close-window');
  },
  minimizeWindow: () => {
    ipcRenderer.send('desktop:minimize-window');
  },

  dispatchAction: (action: string, payload?: unknown) => {
    ipcRenderer.send('desktop:dispatch-action', { action, payload });
  },
  onAction: (callback: (action: string, payload?: unknown) => void) => {
    const handler = (
      _event: unknown,
      data: { action: string; payload?: unknown }
    ) => {
      callback(data.action, data.payload);
    };
    ipcRenderer.on('desktop:action-dispatched', handler);
    return () => {
      ipcRenderer.removeListener('desktop:action-dispatched', handler);
    };
  },

  getVirtualBounds: () => ipcRenderer.invoke('desktop:get-virtual-bounds'),
  onDisplaysChanged: (callback: (bounds: VirtualScreenBounds) => void) => {
    const handler = (_event: unknown, bounds: VirtualScreenBounds) => callback(bounds);
    ipcRenderer.on('desktop:displays-changed', handler);
    return () => {
      ipcRenderer.removeListener('desktop:displays-changed', handler);
    };
  },

  captureScreenThumbnail: () => ipcRenderer.invoke('desktop:capture-thumbnail'),
  getMediaSources: (types: ('screen' | 'window')[]) =>
    ipcRenderer.invoke('desktop:get-media-sources', types),
  saveCaptureFile: (dataUrl: string, defaultFilename: string) =>
    ipcRenderer.invoke('desktop:save-capture-file', { dataUrl, defaultFilename }),

  loadDesktopSettings: () => ipcRenderer.invoke('desktop:load-settings'),
  saveDesktopSettings: (settings: UserSettings) =>
    ipcRenderer.invoke('desktop:save-settings', settings),

  quitApp: () => {
    ipcRenderer.send('desktop:quit-app');
  },
};

contextBridge.exposeInMainWorld('proscreenDesktop', desktopAPI);
