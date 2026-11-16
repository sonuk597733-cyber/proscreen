import { contextBridge, ipcRenderer } from 'electron';
import {
  DesktopCaptureSource,
  DesktopSharedState,
  DesktopWindowType,
  ProScreenDesktopAPI,
  VirtualScreenBounds,
} from '../src/desktop/desktopTypes';
import { AnnotationItem } from '../src/types/annotation';
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
  setToolbarIgnoreMouse: (ignore: boolean, forward?: boolean) => {
    ipcRenderer.send('desktop:set-toolbar-ignore-mouse', { ignore, forward });
  },

  moveToolbar: (x: number, y: number) => {
    ipcRenderer.send('desktop:move-toolbar', { x, y });
  },
  moveToolbarTop: () => {
    ipcRenderer.send('desktop:move-toolbar-top');
  },
  setToolbarBounds: (bounds: { x?: number; y?: number; width?: number; height?: number }) => {
    ipcRenderer.send('desktop:set-toolbar-bounds', bounds);
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
  saveRecordingBuffer: (
    buffer: Uint8Array | undefined,
    defaultFilename: string,
    askWhereToSave?: boolean,
    sourcePath?: string
  ) =>
    ipcRenderer.invoke('desktop:save-recording-file', {
      buffer,
      defaultFilename,
      askWhereToSave,
      sourcePath,
    }),
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('desktop:show-item-in-folder', filePath),
  openPath: (filePath: string) =>
    ipcRenderer.invoke('desktop:open-path', filePath),
  openRecordingFileDialog: () =>
    ipcRenderer.invoke('desktop:open-recording-dialog'),

  loadDesktopSettings: () => ipcRenderer.invoke('desktop:load-settings'),
  saveDesktopSettings: (settings: UserSettings) =>
    ipcRenderer.invoke('desktop:save-settings', settings),
  onSettingsChanged: (callback: (settings: UserSettings) => void) => {
    const handler = (_event: unknown, settings: UserSettings) => callback(settings);
    ipcRenderer.on('desktop:settings-changed', handler);
    return () => {
      ipcRenderer.removeListener('desktop:settings-changed', handler);
    };
  },
  getDisplaysInfo: () => ipcRenderer.invoke('desktop:get-displays-info'),
  setRecordingTargetDisplay: (displayId: string | null) => {
    ipcRenderer.send('desktop:set-recording-target-display', displayId);
  },
  setRecordingTargetMode: (mode: string) => {
    ipcRenderer.send('desktop:set-recording-target-mode', mode);
  },
  setRecordingTargetSource: (sourceId: string | null) => {
    ipcRenderer.send('desktop:set-recording-target-source', sourceId);
  },

  saveDesktopAnnotations: (items: AnnotationItem[]) => {
    ipcRenderer.send('desktop:save-annotations', items);
  },
  getDesktopAnnotations: () => ipcRenderer.invoke('desktop:get-annotations'),
  onRestoreAnnotations: (callback: (items: AnnotationItem[]) => void) => {
    const handler = (_event: unknown, items: AnnotationItem[]) => callback(items);
    ipcRenderer.on('desktop:restore-annotations', handler);
    return () => {
      ipcRenderer.removeListener('desktop:restore-annotations', handler);
    };
  },

  openPopout: (data: { popoutId: string; anchorOffsetY?: number; transitionId?: number }) => {
    ipcRenderer.send('desktop:open-popout', data);
  },
  closePopout: (data?: { transitionId?: number }) => {
    ipcRenderer.send('desktop:close-popout', data);
  },
  onPopoutData: (callback: (data: { popoutId: string | null; openSide: 'left' | 'right'; anchorOffsetY?: number; transitionId?: number }) => void) => {
    const handler = (_event: unknown, data: { popoutId: string | null; openSide: 'left' | 'right'; anchorOffsetY?: number; transitionId?: number }) =>
      callback(data);
    ipcRenderer.on('desktop:popout-data', handler);
    return () => {
      ipcRenderer.removeListener('desktop:popout-data', handler);
    };
  },
  onPopoutClosed: (callback: (info?: { transitionId?: number }) => void) => {
    const handler = (_event: unknown, info?: { transitionId?: number }) => callback(info);
    ipcRenderer.on('desktop:popout-closed', handler);
    return () => {
      ipcRenderer.removeListener('desktop:popout-closed', handler);
    };
  },

  quitApp: () => {
    ipcRenderer.send('desktop:quit-app');
  },
};

contextBridge.exposeInMainWorld('proscreenDesktop', desktopAPI);
