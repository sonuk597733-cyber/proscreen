import { AnnotationCategory, AnnotationItem } from '../types/annotation';
import { isAnnotationExpired } from './timer';

export type HistoryScope = 'all' | 'stroke' | 'shape';

export interface HistoryCommand {
  id: string;
  type: 'add' | 'remove' | 'update' | 'clear';
  category: AnnotationCategory | 'mixed';
  beforeItems: AnnotationItem[];
  afterItems: AnnotationItem[];
  timestamp: number;
}

export interface HistoryState {
  items: AnnotationItem[];
  undoStack: HistoryCommand[];
  redoStack: HistoryCommand[];
}

const MAX_HISTORY_ENTRIES = 150;

export function createHistoryState(initialItems: AnnotationItem[] = []): HistoryState {
  return {
    items: initialItems,
    undoStack: [],
    redoStack: [],
  };
}

export function addAnnotationItem(state: HistoryState, item: AnnotationItem): HistoryState {
  const command: HistoryCommand = {
    id: `cmd_${item.id}_${Date.now()}`,
    type: 'add',
    category: item.category,
    beforeItems: [],
    afterItems: [item],
    timestamp: Date.now(),
  };
  return {
    items: [...state.items, item],
    undoStack: [...state.undoStack, command].slice(-MAX_HISTORY_ENTRIES),
    redoStack: [],
  };
}

export function removeAnnotationItems(
  state: HistoryState,
  idsToRemove: string[]
): HistoryState {
  if (idsToRemove.length === 0) return state;
  const idSet = new Set(idsToRemove);
  const removed = state.items.filter((item) => idSet.has(item.id));
  if (removed.length === 0) return state;

  const categories = new Set(removed.map((r) => r.category));
  const command: HistoryCommand = {
    id: `cmd_rm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'remove',
    category: categories.size === 1 ? removed[0].category : 'mixed',
    beforeItems: removed,
    afterItems: [],
    timestamp: Date.now(),
  };

  return {
    items: state.items.filter((item) => !idSet.has(item.id)),
    undoStack: [...state.undoStack, command].slice(-MAX_HISTORY_ENTRIES),
    redoStack: [],
  };
}

export function updateAnnotationItem(
  state: HistoryState,
  updated: AnnotationItem
): HistoryState {
  const existing = state.items.find((item) => item.id === updated.id);
  if (!existing) return state;
  const command: HistoryCommand = {
    id: `cmd_upd_${updated.id}_${Date.now()}`,
    type: 'update',
    category: updated.category,
    beforeItems: [existing],
    afterItems: [updated],
    timestamp: Date.now(),
  };
  return {
    items: state.items.map((item) => (item.id === updated.id ? updated : item)),
    undoStack: [...state.undoStack, command].slice(-MAX_HISTORY_ENTRIES),
    redoStack: [],
  };
}

export function clearAllAnnotations(state: HistoryState): HistoryState {
  if (state.items.length === 0) return state;
  const categories = new Set(state.items.map((i) => i.category));
  const command: HistoryCommand = {
    id: `cmd_clr_${Date.now()}`,
    type: 'clear',
    category: categories.size === 1 ? state.items[0].category : 'mixed',
    beforeItems: [...state.items],
    afterItems: [],
    timestamp: Date.now(),
  };
  return {
    items: [],
    undoStack: [...state.undoStack, command].slice(-MAX_HISTORY_ENTRIES),
    redoStack: [],
  };
}

/**
 * Remove expired fading-ink or timed-out items silently without adding user-undo pollution.
 */
export function pruneExpiredItems(state: HistoryState, nowMs: number): HistoryState {
  const nextItems = state.items.filter((item) => !isAnnotationExpired(item, nowMs));
  if (nextItems.length === state.items.length) return state;
  return {
    ...state,
    items: nextItems,
  };
}

export function mapItemsWithoutHistory(
  state: HistoryState,
  mapper: (items: AnnotationItem[]) => AnnotationItem[]
): HistoryState {
  const nextItems = mapper(state.items);
  if (nextItems === state.items) return state;
  return {
    ...state,
    items: nextItems,
  };
}

function matchesScope(cmd: HistoryCommand, scope: HistoryScope): boolean {
  if (scope === 'all') return true;
  if (scope === 'stroke') return cmd.category === 'stroke';
  // 'shape' scope includes shapes & vector/text objects distinct from freehand strokes
  return cmd.category === 'shape' || cmd.category === 'text';
}

function applyInverse(items: AnnotationItem[], cmd: HistoryCommand): AnnotationItem[] {
  if (cmd.type === 'add') {
    const removeIds = new Set(cmd.afterItems.map((i) => i.id));
    return items.filter((item) => !removeIds.has(item.id));
  }
  if (cmd.type === 'remove' || cmd.type === 'clear') {
    const existingIds = new Set(items.map((i) => i.id));
    const restored = cmd.beforeItems.filter((i) => !existingIds.has(i.id));
    return [...items, ...restored];
  }
  if (cmd.type === 'update') {
    const beforeMap = new Map(cmd.beforeItems.map((i) => [i.id, i]));
    return items.map((item) => beforeMap.get(item.id) ?? item);
  }
  return items;
}

function applyForward(items: AnnotationItem[], cmd: HistoryCommand): AnnotationItem[] {
  if (cmd.type === 'add') {
    const existingIds = new Set(items.map((i) => i.id));
    const added = cmd.afterItems.filter((i) => !existingIds.has(i.id));
    return [...items, ...added];
  }
  if (cmd.type === 'remove' || cmd.type === 'clear') {
    const removeIds = new Set(cmd.beforeItems.map((i) => i.id));
    return items.filter((item) => !removeIds.has(item.id));
  }
  if (cmd.type === 'update') {
    const afterMap = new Map(cmd.afterItems.map((i) => [i.id, i]));
    return items.map((item) => afterMap.get(item.id) ?? item);
  }
  return items;
}

export function undoHistory(state: HistoryState, scope: HistoryScope = 'all'): HistoryState {
  for (let i = state.undoStack.length - 1; i >= 0; i--) {
    const cmd = state.undoStack[i];
    if (matchesScope(cmd, scope)) {
      const nextUndo = [...state.undoStack.slice(0, i), ...state.undoStack.slice(i + 1)];
      const nextItems = applyInverse(state.items, cmd);
      return {
        items: nextItems,
        undoStack: nextUndo,
        redoStack: [...state.redoStack, cmd].slice(-MAX_HISTORY_ENTRIES),
      };
    }
  }
  return state;
}

export function redoHistory(state: HistoryState, scope: HistoryScope = 'all'): HistoryState {
  for (let i = state.redoStack.length - 1; i >= 0; i--) {
    const cmd = state.redoStack[i];
    if (matchesScope(cmd, scope)) {
      const nextRedo = [...state.redoStack.slice(0, i), ...state.redoStack.slice(i + 1)];
      const nextItems = applyForward(state.items, cmd);
      return {
        items: nextItems,
        undoStack: [...state.undoStack, cmd].slice(-MAX_HISTORY_ENTRIES),
        redoStack: nextRedo,
      };
    }
  }
  return state;
}

export function canUndo(state: HistoryState, scope: HistoryScope = 'all'): boolean {
  return state.undoStack.some((cmd) => matchesScope(cmd, scope));
}

export function canRedo(state: HistoryState, scope: HistoryScope = 'all'): boolean {
  return state.redoStack.some((cmd) => matchesScope(cmd, scope));
}
