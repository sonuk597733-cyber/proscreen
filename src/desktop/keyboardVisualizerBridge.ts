import {
  KeyboardShortcutEvent,
  KeyboardVisualizerStatus,
  parseKeyboardShortcutEvent,
} from './keyboardVisualizer';

export const KEYBOARD_SHORTCUT_EVENT_CHANNEL = 'desktop:keyboard-shortcut';
export const KEYBOARD_VISUALIZER_DISABLED_CHANNEL = 'desktop:keyboard-visualizer-disabled';

export interface KeyboardVisualizerIpcRenderer {
  invoke(channel: string): Promise<unknown>;
  on(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
}

export function createKeyboardVisualizerBridge(ipcRenderer: KeyboardVisualizerIpcRenderer) {
  return {
    startKeyboardVisualizer: () =>
      ipcRenderer.invoke('desktop:start-keyboard-visualizer') as Promise<KeyboardVisualizerStatus>,
    stopKeyboardVisualizer: () =>
      ipcRenderer.invoke('desktop:stop-keyboard-visualizer') as Promise<KeyboardVisualizerStatus>,
    onKeyboardShortcut: (callback: (event: KeyboardShortcutEvent) => void) => {
      const listener = (_event: unknown, value?: unknown) => {
        const shortcut = parseKeyboardShortcutEvent(value);
        if (shortcut) callback(shortcut);
      };
      ipcRenderer.on(KEYBOARD_SHORTCUT_EVENT_CHANNEL, listener);
      return () => ipcRenderer.removeListener(KEYBOARD_SHORTCUT_EVENT_CHANNEL, listener);
    },
    onKeyboardVisualizerDisabled: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(KEYBOARD_VISUALIZER_DISABLED_CHANNEL, listener);
      return () => ipcRenderer.removeListener(KEYBOARD_VISUALIZER_DISABLED_CHANNEL, listener);
    },
  };
}
