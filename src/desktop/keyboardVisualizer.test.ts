import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getKeyboardVisualizerButtonModel,
  KeyboardVisualizerController,
  KeyboardVisualizerNativeAddon,
  parseKeyboardShortcutEvent,
  TimedShortcutNotificationBuffer,
} from './keyboardVisualizer';
import {
  createKeyboardVisualizerBridge,
  KEYBOARD_SHORTCUT_EVENT_CHANNEL,
  KEYBOARD_VISUALIZER_DISABLED_CHANNEL,
} from './keyboardVisualizerBridge';
import {
  KEYBOARD_VISUALIZER_START_CHANNEL,
  KEYBOARD_VISUALIZER_STOP_CHANNEL,
  registerKeyboardVisualizerIpc,
} from './keyboardVisualizerIpc';
import { resolveKeyboardVisualizerModulePath } from './keyboardVisualizerRuntime';
import { KeyboardShortcutCards } from './KeyboardVisualizerOverlay';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeIpcRenderer {
  calls: string[] = [];
  listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  async invoke(channel: string): Promise<unknown> {
    this.calls.push(channel);
    return { enabled: channel === 'desktop:start-keyboard-visualizer', supported: true };
  }

  on(channel: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(channel) || new Set();
    listeners.add(listener);
    this.listeners.set(channel, listeners);
  }

  removeListener(channel: string, listener: (...args: unknown[]) => void): void {
    this.listeners.get(channel)?.delete(listener);
  }

  emit(channel: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(channel) || []) listener(...args);
  }
}

class FakeIpcMain {
  handlers = new Map<string, (event: { sender: { id: number } }) => unknown>();

  handle(channel: string, handler: (event: { sender: { id: number } }) => unknown): void {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }
}

function createFakeNativeAddon() {
  let emit: ((event: unknown) => void) | null = null;
  let startCount = 0;
  let stopCount = 0;
  const addon: KeyboardVisualizerNativeAddon = {
    start: async (callback) => {
      startCount += 1;
      emit = callback;
    },
    stop: async () => {
      stopCount += 1;
    },
  };
  return {
    addon,
    emit: (event: unknown) => emit?.(event),
    get startCount() { return startCount; },
    get stopCount() { return stopCount; },
  };
}

test('KEYBOARD-01: preload bridge invokes start/stop and validates shortcut payloads', async () => {
  const ipc = new FakeIpcRenderer();
  const bridge = createKeyboardVisualizerBridge(ipc);
  assert.deepEqual(await bridge.startKeyboardVisualizer(), { enabled: true, supported: true });
  assert.deepEqual(await bridge.stopKeyboardVisualizer(), { enabled: false, supported: true });
  assert.deepEqual(ipc.calls, ['desktop:start-keyboard-visualizer', 'desktop:stop-keyboard-visualizer']);

  const events: string[] = [];
  const unsubscribe = bridge.onKeyboardShortcut((event) => events.push(event.label));
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, { type: 'shortcut', label: 'Ctrl+Shift+S' });
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, { type: 'shortcut', label: 'ordinary text' });
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, { type: 'key', label: 'Ctrl+A' });
  assert.deepEqual(events, ['Ctrl+Shift+S']);
  unsubscribe();
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, { type: 'shortcut', label: 'Ctrl+A' });
  assert.deepEqual(events, ['Ctrl+Shift+S']);

  let disabledCount = 0;
  const unsubscribeDisabled = bridge.onKeyboardVisualizerDisabled(() => disabledCount++);
  ipc.emit(KEYBOARD_VISUALIZER_DISABLED_CHANNEL, {});
  unsubscribeDisabled();
  ipc.emit(KEYBOARD_VISUALIZER_DISABLED_CHANNEL, {});
  assert.equal(disabledCount, 1);
});

test('KEYBOARD-02: IPC handlers allow only the trusted toolbar sender and clean up', async () => {
  const ipc = new FakeIpcMain();
  const native = createFakeNativeAddon();
  const controller = new KeyboardVisualizerController({
    platform: 'win32',
    loadAddon: () => native.addon,
    onShortcut: () => {},
    onEnabledChange: () => {},
  });
  const unregister = registerKeyboardVisualizerIpc(ipc, controller, () => 42);
  const start = ipc.handlers.get(KEYBOARD_VISUALIZER_START_CHANNEL)!;
  const stop = ipc.handlers.get(KEYBOARD_VISUALIZER_STOP_CHANNEL)!;

  await assert.rejects(Promise.resolve(start({ sender: { id: 7 } })), /restricted to the ProScreen toolbar/);
  assert.equal(native.startCount, 0);
  assert.deepEqual(await start({ sender: { id: 42 } }), { enabled: true, supported: true });
  assert.deepEqual(await stop({ sender: { id: 42 } }), { enabled: false, supported: true });
  unregister();
  assert.equal(ipc.handlers.size, 0);
  assert.equal(native.stopCount, 1);
});

test('KEYBOARD-03: shortcut events forward only while enabled and native start/stop run once', async () => {
  const native = createFakeNativeAddon();
  const received: string[] = [];
  const enabledChanges: boolean[] = [];
  const controller = new KeyboardVisualizerController({
    platform: 'win32',
    loadAddon: () => native.addon,
    onShortcut: (event) => received.push(event.label),
    onEnabledChange: (enabled) => enabledChanges.push(enabled),
  });

  assert.deepEqual(await controller.start(), { enabled: true, supported: true });
  native.emit({ type: 'shortcut', label: 'Ctrl+C' });
  native.emit({ type: 'shortcut', label: 'typed text' });
  native.emit({ type: 'error', label: 'Ctrl+X' });
  assert.deepEqual(received, ['Ctrl+C']);
  assert.deepEqual(await controller.start(), { enabled: true, supported: true });
  assert.equal(native.startCount, 1);

  assert.deepEqual(await controller.stop(), { enabled: false, supported: true });
  native.emit({ type: 'shortcut', label: 'Ctrl+V' });
  assert.deepEqual(received, ['Ctrl+C']);
  assert.deepEqual(enabledChanges, [true, false]);
  assert.equal(native.stopCount, 1);
});

test('KEYBOARD-04: toolbar model exposes ON/OFF state, busy state and privacy disclosure', () => {
  const off = getKeyboardVisualizerButtonModel({ enabled: false, supported: true });
  const on = getKeyboardVisualizerButtonModel({ enabled: true, supported: true });
  const unavailable = getKeyboardVisualizerButtonModel({ enabled: false, supported: false });
  const busy = getKeyboardVisualizerButtonModel({ enabled: false, supported: true, busy: true });

  assert.equal(off.pressed, false);
  assert.equal(off.disabled, false);
  assert.equal(on.pressed, true);
  assert.equal(on.disabled, false);
  assert.equal(unavailable.disabled, true);
  assert.equal(busy.disabled, true);
  assert.match(on.description, /system-wide/);
  assert.match(on.description, /Ordinary typing is ignored/);
});

test('KEYBOARD-05: overlay renders recent shortcut cards without capturing pointer input', () => {
  const html = renderToStaticMarkup(
    React.createElement(KeyboardShortcutCards, {
      notifications: [
        { id: 2, label: 'Ctrl+Shift+S' },
        { id: 1, label: 'Alt+Tab' },
      ],
    })
  );
  assert.match(html, /keyboard-visualizer-overlay/);
  assert.match(html, /keyboard-shortcut-notification/);
  assert.match(html, /Ctrl\+Shift\+S/);
  assert.match(html, /pointer-events-none/);
});

test('KEYBOARD-06: notification buffer keeps five items, resets inactivity timer, and clears immediately', async () => {
  let current = [] as Array<{ id: number; label: string }>;
  const buffer = new TimedShortcutNotificationBuffer((notifications) => {
    current = notifications;
  }, 45);
  for (let index = 0; index < 7; index++) {
    buffer.add({ type: 'shortcut', label: `Ctrl+F${index + 1}` });
  }
  assert.equal(current.length, 5);
  assert.equal(current[0].label, 'Ctrl+F7');

  await delay(25);
  buffer.add({ type: 'shortcut', label: 'Alt+Tab' });
  await delay(25);
  assert.equal(current.length, 5);
  await delay(30);
  assert.deepEqual(current, []);

  buffer.add({ type: 'shortcut', label: 'Ctrl+A' });
  buffer.clear();
  assert.deepEqual(current, []);
  buffer.dispose();
});

test('KEYBOARD-07: notification timer cleanup prevents post-unmount callbacks', async () => {
  let callbackCount = 0;
  const buffer = new TimedShortcutNotificationBuffer(() => callbackCount++, 20);
  buffer.add({ type: 'shortcut', label: 'Ctrl+S' });
  const callbacksAtDispose = callbackCount;
  buffer.dispose();
  await delay(35);
  assert.equal(callbackCount, callbacksAtDispose);
  buffer.add({ type: 'shortcut', label: 'Ctrl+A' });
  assert.equal(callbackCount, callbacksAtDispose);
});

test('KEYBOARD-08: unsupported platforms and native errors fail gracefully', async () => {
  const unsupported = new KeyboardVisualizerController({
    platform: 'linux',
    loadAddon: () => { throw new Error('must not load'); },
    onShortcut: () => {},
    onEnabledChange: () => {},
  });
  assert.deepEqual(await unsupported.start(), {
    enabled: false,
    supported: false,
    error: 'System-wide keyboard monitoring is only available on Windows.',
  });

  const missingAddon = new KeyboardVisualizerController({
    platform: 'win32',
    loadAddon: () => { throw new Error('native module missing'); },
    onShortcut: () => {},
    onEnabledChange: () => {},
  });
  const status = await missingAddon.start();
  assert.equal(status.enabled, false);
  assert.equal(status.supported, true);
  assert.equal(status.error, 'native module missing');

  const brokenAddon: KeyboardVisualizerNativeAddon = {
    start: async () => { throw new Error('hook denied'); },
    stop: async () => {},
  };
  const failedStart = new KeyboardVisualizerController({
    platform: 'win32',
    loadAddon: () => brokenAddon,
    onShortcut: () => {},
    onEnabledChange: () => {},
  });
  assert.equal((await failedStart.start()).error, 'hook denied');

  const notifyFailureAddon = createFakeNativeAddon();
  const notifyFailure = new KeyboardVisualizerController({
    platform: 'win32',
    loadAddon: () => notifyFailureAddon.addon,
    onShortcut: () => {},
    onEnabledChange: (enabled) => {
      if (enabled) throw new Error('overlay unavailable');
    },
  });
  assert.equal((await notifyFailure.start()).error, 'overlay unavailable');
  assert.equal(notifyFailureAddon.stopCount, 1);
});

test('KEYBOARD-09: runtime path resolves unpacked ASAR module and development module', () => {
  assert.match(
    resolveKeyboardVisualizerModulePath({
      isPackaged: true,
      resourcesPath: 'C:\\ProScreen\\resources',
      mainDirectory: 'unused',
    }),
    /app\.asar\.unpacked.*keyboard-visualizer.*keyboard_visualizer\.node/
  );
  assert.match(
    resolveKeyboardVisualizerModulePath({
      isPackaged: false,
      resourcesPath: 'unused',
      mainDirectory: 'C:\\proscreen\\dist-electron',
    }),
    /proscreen.*src.*native.*keyboard-visualizer.*keyboard_visualizer\.node/
  );
  assert.deepEqual(parseKeyboardShortcutEvent({ type: 'shortcut', label: 'Ctrl+Alt+Delete' }), {
    type: 'shortcut',
    label: 'Ctrl+Alt+Delete',
  });
  assert.equal(parseKeyboardShortcutEvent({ type: 'shortcut', label: 'plain text' }), null);
});
