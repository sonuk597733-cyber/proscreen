export const KEYBOARD_VISUALIZER_AUTO_HIDE_MS = 2_000;
export const KEYBOARD_VISUALIZER_MAX_NOTIFICATIONS = 5;

export interface KeyboardShortcutEvent {
  type: 'shortcut';
  label: string;
  scope: 'application-window' | 'proscreen-tab';
}

export interface KeyboardVisualizerStatus {
  enabled: boolean;
  supported: boolean;
  scope: 'application-window';
  error?: string;
}

export interface KeyboardVisualizerInput {
  type: string;
  key: string;
  control: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  isAutoRepeat?: boolean;
}

export interface ShortcutNotification {
  id: number;
  label: string;
}

export function parseKeyboardShortcutEvent(value: unknown): KeyboardShortcutEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as { type?: unknown; label?: unknown; scope?: unknown };
  if (
    event.type !== 'shortcut' ||
    (event.scope !== 'application-window' && event.scope !== 'proscreen-tab') ||
    typeof event.label !== 'string'
  ) return null;
  const label = event.label.trim();
  if (!label || label.length > 64 || !/^[A-Za-z0-9 ]+(?:\+[A-Za-z0-9 ]+){1,5}$/.test(label)) {
    return null;
  }
  return { type: 'shortcut', label, scope: event.scope };
}

export function getKeyboardShortcutEventFromInput(
  input: KeyboardVisualizerInput,
  scope: KeyboardShortcutEvent['scope'] = 'application-window'
): KeyboardShortcutEvent | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat) return null;
  if (!input.control && !input.alt && !input.meta && !input.shift) return null;

  const keyNames: Record<string, string> = {
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    Backspace: 'Backspace',
    Delete: 'Del',
    Escape: 'Esc',
    PageDown: 'PageDown',
    PageUp: 'PageUp',
    ' ': 'Space',
  };
  const key = keyNames[input.key] || input.key;
  if (!/^(?:[A-Za-z0-9]|F(?:[1-9]|1\d|2[0-4])|Enter|Tab|Space|Backspace|Del|Esc|Home|End|Insert|PageUp|PageDown|Up|Down|Left|Right)$/.test(key)) {
    return null;
  }

  const modifiers = [
    input.control ? 'Ctrl' : '',
    input.alt ? 'Alt' : '',
    input.shift ? 'Shift' : '',
    input.meta ? 'Meta' : '',
  ].filter(Boolean);
  return {
    type: 'shortcut',
    label: [...modifiers, /^[a-z]$/i.test(key) ? key.toUpperCase() : key].join('+'),
    scope,
  };
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  const editable = target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
  return Boolean(editable);
}

export function getKeyboardShortcutEventFromDomEvent(
  event: Pick<KeyboardEvent, 'type' | 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'repeat' | 'target'>
): KeyboardShortcutEvent | null {
  if (isEditableKeyboardTarget(event.target)) return null;
  return getKeyboardShortcutEventFromInput({
    type: event.type === 'keydown' ? 'keyDown' : event.type,
    key: event.key,
    control: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    isAutoRepeat: event.repeat,
  }, 'proscreen-tab');
}

export function getKeyboardVisualizerButtonModel(input: {
  enabled: boolean;
  supported: boolean;
  busy?: boolean;
  error?: string | null;
}): { pressed: boolean; disabled: boolean; label: string; description: string } {
  const label = input.enabled
    ? 'Turn keyboard visualizer off (ProScreen only)'
    : 'Turn keyboard visualizer on (ProScreen only)';
  const privacyDisclosure = input.enabled
    ? 'Only detects modified shortcuts while a ProScreen app window or supported ProScreen tab is active. Other apps are not observed. Text fields and ordinary typing are ignored; shortcut history is not saved.'
    : 'When enabled, only detects modified shortcuts while a ProScreen app window or supported ProScreen tab is active. Other apps are not observed. Text fields and ordinary typing are ignored; shortcut history is not saved.';
  const description = input.error
    ? `${privacyDisclosure} ${input.error}`
    : !input.supported
      ? 'Keyboard shortcut visualization is available in ProScreen desktop and supported extension tabs.'
      : privacyDisclosure;
  return {
    pressed: input.enabled,
    disabled: !input.supported || Boolean(input.busy),
    label,
    description,
  };
}

export class KeyboardVisualizerController {
  private enabled = false;

  constructor(
    private readonly options: {
      onShortcut: (event: KeyboardShortcutEvent) => void;
      onEnabledChange: (enabled: boolean) => void;
    }
  ) {}

  get isEnabled(): boolean {
    return this.enabled;
  }

  start(): Promise<KeyboardVisualizerStatus> {
    if (!this.enabled) {
      this.enabled = true;
      try {
        this.options.onEnabledChange(true);
      } catch {}
    }
    return Promise.resolve({ enabled: true, supported: true, scope: 'application-window' });
  }

  stop(): Promise<KeyboardVisualizerStatus> {
    if (this.enabled) {
      this.enabled = false;
      try {
        this.options.onEnabledChange(false);
      } catch {}
    }
    return Promise.resolve({ enabled: false, supported: true, scope: 'application-window' });
  }

  observeInput(input: KeyboardVisualizerInput): void {
    if (!this.enabled) return;
    const shortcut = getKeyboardShortcutEventFromInput(input);
    if (!shortcut) return;
    try {
      this.options.onShortcut(shortcut);
    } catch {}
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
