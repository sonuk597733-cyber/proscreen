import { ShortcutBinding } from '../types/settings';

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: 'tool-cursor', action: 'cursor', label: 'Return to Cursor Mode', keys: 'Alt+V', category: 'tools' },
  { id: 'tool-pen', action: 'pen', label: 'Pen Tool', keys: 'Alt+P', category: 'tools' },
  { id: 'tool-highlighter', action: 'highlighter', label: 'Highlighter Tool', keys: 'Alt+H', category: 'tools' },
  { id: 'tool-eraser', action: 'eraser', label: 'Eraser Tool', keys: 'Alt+E', category: 'tools' },
  { id: 'tool-arrow', action: 'arrow', label: 'Arrow Tool', keys: 'Alt+A', category: 'tools' },
  { id: 'tool-rect', action: 'rect', label: 'Rectangle Tool', keys: 'Alt+R', category: 'tools' },
  { id: 'tool-text', action: 'text', label: 'Text Tool', keys: 'Alt+T', category: 'tools' },
  { id: 'tool-laser', action: 'laser', label: 'Laser Pointer', keys: 'Alt+L', category: 'tools' },
  { id: 'action-undo', action: 'undo', label: 'Undo', keys: 'Ctrl+Z', category: 'actions' },
  { id: 'action-redo', action: 'redo', label: 'Redo', keys: 'Ctrl+Y', category: 'actions' },
  {
    id: 'action-clear',
    action: 'clear',
    label: 'Clear Screen',
    keys: 'Alt+X',
    chromeCommand: 'clear-annotations',
    category: 'actions',
  },
  {
    id: 'action-screenshot',
    action: 'screenshot',
    label: 'Capture Screenshot',
    keys: 'Alt+S',
    chromeCommand: 'capture-screenshot',
    category: 'actions',
  },
  {
    id: 'mode-toolbar',
    action: 'toggle-toolbar',
    label: 'Hide / Show Toolbar',
    keys: 'Alt+Shift+P',
    chromeCommand: 'toggle-toolbar',
    category: 'modes',
  },
  {
    id: 'mode-ghost',
    action: 'toggle-ghost',
    label: 'Ghost Mode',
    keys: 'Alt+G',
    chromeCommand: 'toggle-ghost-mode',
    category: 'modes',
  },
  { id: 'mode-whiteboard', action: 'whiteboard', label: 'Whiteboard Mode', keys: 'Alt+W', category: 'modes' },
  { id: 'mode-blackboard', action: 'blackboard', label: 'Blackboard Mode', keys: 'Alt+B', category: 'modes' },
];

/** Common Chrome / OS shortcuts to warn users about if they attempt to bind them */
export const RESERVED_BROWSER_SHORTCUTS = new Set([
  'CTRL+T',
  'CTRL+W',
  'CTRL+N',
  'CTRL+SHIFT+T',
  'CTRL+R',
  'CTRL+F',
  'CTRL+L',
  'CTRL+P',
  'CTRL+S',
  'CTRL+C',
  'CTRL+V',
  'CTRL+X',
  'F5',
  'F11',
  'F12',
]);

export function normalizeShortcutString(combo: string): string {
  const parts = combo
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    const upper = part.toUpperCase();
    if (upper === 'CTRL' || upper === 'CONTROL' || upper === 'CMD' || upper === 'META') {
      if (!modifiers.includes('Ctrl')) modifiers.push('Ctrl');
    } else if (upper === 'ALT' || upper === 'OPTION') {
      if (!modifiers.includes('Alt')) modifiers.push('Alt');
    } else if (upper === 'SHIFT') {
      if (!modifiers.includes('Shift')) modifiers.push('Shift');
    } else {
      key = upper.length === 1 ? upper : part[0].toUpperCase() + part.slice(1);
    }
  }

  return [...modifiers, key].filter(Boolean).join('+');
}

export function eventToShortcutString(e: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const ignoredKeys = new Set(['Control', 'Shift', 'Alt', 'Meta', 'Dead', 'Unidentified']);
  if (ignoredKeys.has(e.key)) return null;

  const modifiers: string[] = [];
  if (e.ctrlKey || e.metaKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');

  let normalizedKey = e.key;
  if (normalizedKey === ' ') normalizedKey = 'Space';
  else if (normalizedKey.length === 1) normalizedKey = normalizedKey.toUpperCase();

  return [...modifiers, normalizedKey].join('+');
}

export function matchesShortcutEvent(
  e: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
  },
  bindingKeys: string
): boolean {
  const pressed = eventToShortcutString(e);
  if (!pressed) return false;
  return normalizeShortcutString(pressed) === normalizeShortcutString(bindingKeys);
}

export interface ShortcutConflict {
  bindingId: string;
  keys: string;
  reason: 'duplicate' | 'browser-reserved';
  conflictingLabel?: string;
}

export function detectShortcutConflicts(bindings: ShortcutBinding[]): ShortcutConflict[] {
  const conflicts: ShortcutConflict[] = [];
  const seen = new Map<string, ShortcutBinding>();

  for (const binding of bindings) {
    const norm = normalizeShortcutString(binding.keys).toUpperCase();
    if (!norm) continue;

    if (RESERVED_BROWSER_SHORTCUTS.has(norm)) {
      conflicts.push({
        bindingId: binding.id,
        keys: binding.keys,
        reason: 'browser-reserved',
      });
    }

    const existing = seen.get(norm);
    if (existing) {
      conflicts.push({
        bindingId: binding.id,
        keys: binding.keys,
        reason: 'duplicate',
        conflictingLabel: existing.label,
      });
    } else {
      seen.set(norm, binding);
    }
  }

  return conflicts;
}

export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === 'undefined') return false;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}
