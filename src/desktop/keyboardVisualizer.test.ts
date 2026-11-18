import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getKeyboardShortcutEventFromInput,
  getKeyboardVisualizerButtonModel,
  KeyboardVisualizerController,
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
import { KeyboardShortcutCards } from './KeyboardVisualizerOverlay';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeIpcRenderer {
  calls: string[] = [];
  listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  async invoke(channel: string): Promise<unknown> {
    this.calls.push(channel);
    return {
      enabled: channel === 'desktop:start-keyboard-visualizer',
      supported: true,
      scope: 'application-window',
    };
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

const event = (label: string) => ({ type: 'shortcut' as const, label, scope: 'application-window' as const });
const input = (overrides: Partial<Parameters<typeof getKeyboardShortcutEventFromInput>[0]> = {}) => ({
  type: 'keyDown',
  key: 's',
  control: true,
  alt: false,
  shift: true,
  meta: false,
  ...overrides,
});

test('KEYBOARD-01: preload bridge toggles monitoring and validates application-window events', async () => {
  const ipc = new FakeIpcRenderer();
  const bridge = createKeyboardVisualizerBridge(ipc);
  assert.deepEqual(await bridge.startKeyboardVisualizer(), {
    enabled: true,
    supported: true,
    scope: 'application-window',
  });
  assert.deepEqual(await bridge.stopKeyboardVisualizer(), {
    enabled: false,
    supported: true,
    scope: 'application-window',
  });
  assert.deepEqual(ipc.calls, ['desktop:start-keyboard-visualizer', 'desktop:stop-keyboard-visualizer']);

  const events: string[] = [];
  const unsubscribe = bridge.onKeyboardShortcut((shortcut) => events.push(shortcut.label));
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, event('Ctrl+Shift+S'));
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, { type: 'shortcut', label: 'Ctrl+A' });
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, { ...event('ordinary text'), type: 'key' });
  assert.deepEqual(events, ['Ctrl+Shift+S']);
  unsubscribe();
  ipc.emit(KEYBOARD_SHORTCUT_EVENT_CHANNEL, {}, event('Ctrl+A'));
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
  const controller = new KeyboardVisualizerController({ onShortcut: () => {}, onEnabledChange: () => {} });
  const unregister = registerKeyboardVisualizerIpc(ipc, controller, () => 42);
  const start = ipc.handlers.get(KEYBOARD_VISUALIZER_START_CHANNEL)!;
  const stop = ipc.handlers.get(KEYBOARD_VISUALIZER_STOP_CHANNEL)!;

  await assert.rejects(Promise.resolve(start({ sender: { id: 7 } })), /restricted to the ProScreen toolbar/);
  assert.deepEqual(await start({ sender: { id: 42 } }), {
    enabled: true,
    supported: true,
    scope: 'application-window',
  });
  assert.deepEqual(await stop({ sender: { id: 42 } }), {
    enabled: false,
    supported: true,
    scope: 'application-window',
  });
  unregister();
  assert.equal(ipc.handlers.size, 0);
});

test('KEYBOARD-03: passive input observation is opt-in and emits only modified keydown shortcuts', async () => {
  const received: string[] = [];
  const enabledChanges: boolean[] = [];
  const controller = new KeyboardVisualizerController({
    onShortcut: (shortcut) => received.push(shortcut.label),
    onEnabledChange: (enabled) => enabledChanges.push(enabled),
  });

  controller.observeInput(input());
  assert.deepEqual(received, []);
  assert.deepEqual(await controller.start(), {
    enabled: true,
    supported: true,
    scope: 'application-window',
  });
  controller.observeInput(input());
  controller.observeInput(input({ type: 'keyUp' }));
  controller.observeInput(input({ isAutoRepeat: true }));
  controller.observeInput(input({ key: 'Control' }));
  controller.observeInput(input({ key: '😊' }));
  controller.observeInput(input({ key: 'F5', alt: true, control: false, shift: false }));
  assert.deepEqual(received, ['Ctrl+Shift+S', 'Alt+F5']);

  assert.deepEqual(await controller.stop(), {
    enabled: false,
    supported: true,
    scope: 'application-window',
  });
  controller.observeInput(input({ key: 'v' }));
  assert.deepEqual(received, ['Ctrl+Shift+S', 'Alt+F5']);
  assert.deepEqual(enabledChanges, [true, false]);
});

test('KEYBOARD-04: toolbar model clearly limits detection to focused ProScreen windows', () => {
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
  assert.match(on.description, /while a ProScreen window is focused/);
  assert.match(on.description, /Other apps are not observed/);
  assert.match(on.description, /Ordinary typing is ignored/);
  assert.match(unavailable.description, /ProScreen desktop app only/);
});

test('KEYBOARD-05: overlay cards identify app-window scope and do not capture pointer input', () => {
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
  assert.match(html, /ProScreen window was focused/);
  assert.match(html, /pointer-events-none/);
});

test('KEYBOARD-06: notification buffer keeps five items, resets inactivity timer, and clears immediately', async () => {
  let current = [] as Array<{ id: number; label: string }>;
  const buffer = new TimedShortcutNotificationBuffer((notifications) => {
    current = notifications;
  }, 45);
  for (let index = 0; index < 7; index++) buffer.add(event(`Ctrl+F${index + 1}`));
  assert.equal(current.length, 5);
  assert.equal(current[0].label, 'Ctrl+F7');

  await delay(25);
  buffer.add(event('Alt+Tab'));
  await delay(25);
  assert.equal(current.length, 5);
  await delay(30);
  assert.deepEqual(current, []);

  buffer.add(event('Ctrl+A'));
  buffer.clear();
  assert.deepEqual(current, []);
  buffer.dispose();
});

test('KEYBOARD-07: notification timer cleanup prevents post-unmount callbacks', async () => {
  let callbackCount = 0;
  const buffer = new TimedShortcutNotificationBuffer(() => callbackCount++, 20);
  buffer.add(event('Ctrl+S'));
  const callbacksAtDispose = callbackCount;
  buffer.dispose();
  await delay(35);
  assert.equal(callbackCount, callbacksAtDispose);
  buffer.add(event('Ctrl+A'));
  assert.equal(callbackCount, callbacksAtDispose);
});

test('KEYBOARD-08: shortcuts require an explicit app-window scope and ordinary typing is excluded', () => {
  assert.deepEqual(parseKeyboardShortcutEvent(event('Ctrl+Alt+Delete')), event('Ctrl+Alt+Delete'));
  assert.equal(parseKeyboardShortcutEvent({ type: 'shortcut', label: 'Ctrl+A' }), null);
  assert.equal(parseKeyboardShortcutEvent(event('plain text')), null);
  assert.deepEqual(getKeyboardShortcutEventFromInput(input({ key: 'ArrowUp', meta: true, control: false, shift: false })), {
    type: 'shortcut',
    label: 'Meta+Up',
    scope: 'application-window',
  });
});
