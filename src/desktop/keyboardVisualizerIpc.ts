import { KeyboardVisualizerController } from './keyboardVisualizer';

export const KEYBOARD_VISUALIZER_START_CHANNEL = 'desktop:start-keyboard-visualizer';
export const KEYBOARD_VISUALIZER_STOP_CHANNEL = 'desktop:stop-keyboard-visualizer';

export interface KeyboardVisualizerIpcEvent {
  sender: { id: number };
}

export interface KeyboardVisualizerIpcMain {
  handle(
    channel: string,
    handler: (event: KeyboardVisualizerIpcEvent) => unknown | Promise<unknown>
  ): void;
  removeHandler(channel: string): void;
}

export function registerKeyboardVisualizerIpc(
  ipcMain: KeyboardVisualizerIpcMain,
  controller: KeyboardVisualizerController,
  getToolbarWebContentsId: () => number | null
): () => void {
  const assertToolbarSender = (event: KeyboardVisualizerIpcEvent) => {
    const trustedId = getToolbarWebContentsId();
    if (trustedId === null || event.sender.id !== trustedId) {
      throw new Error('Keyboard visualizer controls are restricted to the ProScreen toolbar.');
    }
  };

  ipcMain.handle(KEYBOARD_VISUALIZER_START_CHANNEL, async (event) => {
    assertToolbarSender(event);
    return controller.start();
  });
  ipcMain.handle(KEYBOARD_VISUALIZER_STOP_CHANNEL, async (event) => {
    assertToolbarSender(event);
    return controller.stop();
  });

  return () => {
    ipcMain.removeHandler(KEYBOARD_VISUALIZER_START_CHANNEL);
    ipcMain.removeHandler(KEYBOARD_VISUALIZER_STOP_CHANNEL);
    void controller.stop();
  };
}
