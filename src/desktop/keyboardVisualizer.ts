export const KEYBOARD_VISUALIZER_AUTO_HIDE_MS = 2_000;
export const KEYBOARD_VISUALIZER_MAX_NOTIFICATIONS = 5;

export interface KeyboardShortcutEvent {
  type: 'shortcut';
  label: string;
}

export interface KeyboardVisualizerStatus {
  enabled: boolean;
  supported: boolean;
  error?: string;
}

export interface KeyboardVisualizerNativeAddon {
  start(callback: (event: unknown) => void): Promise<void>;
  stop(): Promise<void>;
}

export interface ShortcutNotification {
  id: number;
  label: string;
}

export function parseKeyboardShortcutEvent(value: unknown): KeyboardShortcutEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as { type?: unknown; label?: unknown };
  if (event.type !== 'shortcut' || typeof event.label !== 'string') return null;
  const label = event.label.trim();
  if (!label || label.length > 64 || !/^[A-Za-z0-9 ]+(?:\+[A-Za-z0-9 ]+){1,5}$/.test(label)) {
    return null;
  }
  return { type: 'shortcut', label };
}

export function getKeyboardVisualizerButtonModel(input: {
  enabled: boolean;
  supported: boolean;
  busy?: boolean;
  error?: string | null;
}): { pressed: boolean; disabled: boolean; label: string; description: string } {
  const label = input.enabled ? 'Turn keyboard visualizer off' : 'Turn keyboard visualizer on';
  const privacyDisclosure = input.enabled
    ? 'Supported keyboard shortcuts can be observed system-wide while enabled. Ordinary typing is ignored and keyboard history is not saved.'
    : 'When enabled, supported keyboard shortcuts can be observed system-wide. Ordinary typing is ignored and keyboard history is not saved.';
  const description = input.error
    ? `${privacyDisclosure} ${input.error}`
    : !input.supported
      ? 'Keyboard shortcut visualization is available in the Windows desktop app only.'
      : privacyDisclosure;
  return {
    pressed: input.enabled,
    disabled: !input.supported || Boolean(input.busy),
    label,
    description,
  };
}

export class KeyboardVisualizerController {
  private addon: KeyboardVisualizerNativeAddon | null = null;
  private enabled = false;
  private startOperation: Promise<KeyboardVisualizerStatus> | null = null;
  private stopOperation: Promise<KeyboardVisualizerStatus> | null = null;

  constructor(
    private readonly options: {
      platform: string;
      loadAddon: () => KeyboardVisualizerNativeAddon;
      onShortcut: (event: KeyboardShortcutEvent) => void;
      onEnabledChange: (enabled: boolean) => void;
    }
  ) {}

  get isEnabled(): boolean {
    return this.enabled;
  }

  start(): Promise<KeyboardVisualizerStatus> {
    if (this.options.platform !== 'win32') {
      return Promise.resolve({
        enabled: false,
        supported: false,
        error: 'System-wide keyboard monitoring is only available on Windows.',
      });
    }
    if (this.enabled) return Promise.resolve({ enabled: true, supported: true });
    if (this.stopOperation) {
      return this.stopOperation.then(() => this.start());
    }
    if (this.startOperation) return this.startOperation;

    const operation = this.startNative();
    this.startOperation = operation;
    return operation.finally(() => {
      if (this.startOperation === operation) this.startOperation = null;
    });
  }

  private async startNative(): Promise<KeyboardVisualizerStatus> {
    let addon: KeyboardVisualizerNativeAddon | null = null;
    try {
      addon = this.addon || this.options.loadAddon();
      this.addon = addon;
      await addon.start((value) => {
        if (!this.enabled) return;
        const shortcut = parseKeyboardShortcutEvent(value);
        if (shortcut) {
          try {
            this.options.onShortcut(shortcut);
          } catch {}
        }
      });
      this.enabled = true;
      this.options.onEnabledChange(true);
      return { enabled: true, supported: true };
    } catch (error) {
      if (addon) {
        try {
          await addon.stop();
        } catch {}
      }
      this.addon = null;
      this.enabled = false;
      try {
        this.options.onEnabledChange(false);
      } catch {}
      return {
        enabled: false,
        supported: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  stop(): Promise<KeyboardVisualizerStatus> {
    if (this.stopOperation) return this.stopOperation;
    const pendingStart = this.startOperation;
    if (pendingStart) {
      return pendingStart.then(() => this.stop());
    }

    this.enabled = false;
    try {
      this.options.onEnabledChange(false);
    } catch {}
    const addon = this.addon;
    if (!addon) {
      return Promise.resolve({ enabled: false, supported: this.options.platform === 'win32' });
    }

    const operation = Promise.resolve()
      .then(() => addon.stop())
      .then(() => ({ enabled: false, supported: true } satisfies KeyboardVisualizerStatus))
      .catch((error) => ({
        enabled: false,
        supported: true,
        error: error instanceof Error ? error.message : String(error),
      }))
      .finally(() => {
        if (this.addon === addon) this.addon = null;
        if (this.stopOperation === operation) this.stopOperation = null;
      });
    this.stopOperation = operation;
    return operation;
  }
}

export class TimedShortcutNotificationBuffer {
  private notifications: ShortcutNotification[] = [];
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private nextId = 0;
  private disposed = false;

  constructor(
    private readonly onChange: (notifications: ShortcutNotification[]) => void,
    private readonly autoHideMs = KEYBOARD_VISUALIZER_AUTO_HIDE_MS
  ) {}

  add(event: KeyboardShortcutEvent): void {
    if (this.disposed) return;
    this.notifications = [
      { id: ++this.nextId, label: event.label },
      ...this.notifications,
    ].slice(0, KEYBOARD_VISUALIZER_MAX_NOTIFICATIONS);
    this.publish();
    this.resetTimer();
  }

  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.notifications.length === 0) return;
    this.notifications = [];
    this.publish();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private resetTimer(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.timeout = null;
      this.clear();
    }, this.autoHideMs);
  }

  private publish(): void {
    this.onChange([...this.notifications]);
  }
}
