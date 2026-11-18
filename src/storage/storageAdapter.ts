import { AnnotationItem, BoardMode, SavedSession } from '../types/annotation';
import { UserSettings } from '../types/settings';
import { hasChromeStorage } from '../utils/env';
import {
  createDefaultSettings,
  mergeAndValidateSettings,
  sanitizeSavedSessions,
} from './validation';

export const SETTINGS_KEY = 'proscreen_settings_v1';
const SESSIONS_KEY = 'proscreen_saved_sessions_v1';
const TAB_STATE_PREFIX = 'proscreen_tab_state_v1:';

export interface TabAnnotationSnapshot {
  tabKey: string;
  boardMode: BoardMode;
  items: AnnotationItem[];
  toolbarVisible?: boolean;
  updatedAt: number;
}

async function storageGet<T>(key: string): Promise<T | null> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve((result[key] as T) ?? null);
      });
    });
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function storageSet(key: string, value: unknown): Promise<void> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota exceeded silently
    }
  }
}

async function storageRemove(key: string): Promise<void> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve());
    });
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

export async function loadSettings(): Promise<UserSettings> {
  if (typeof window !== 'undefined' && window.proscreenDesktop?.loadDesktopSettings) {
    try {
      const desktopLoaded = await window.proscreenDesktop.loadDesktopSettings();
      if (desktopLoaded) return mergeAndValidateSettings(desktopLoaded);
    } catch {}
  }
  const raw = await storageGet<unknown>(SETTINGS_KEY);
  return mergeAndValidateSettings(raw);
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  if (typeof window !== 'undefined' && window.proscreenDesktop?.saveDesktopSettings) {
    try {
      await window.proscreenDesktop.saveDesktopSettings(settings);
    } catch {}
  }
  await storageSet(SETTINGS_KEY, settings);
}

export async function resetSettingsToDefaults(): Promise<UserSettings> {
  const defaults = createDefaultSettings();
  await storageSet(SETTINGS_KEY, defaults);
  return defaults;
}

export async function loadTabAnnotationState(tabKey: string): Promise<TabAnnotationSnapshot | null> {
  const raw = await storageGet<TabAnnotationSnapshot>(`${TAB_STATE_PREFIX}${tabKey}`);
  if (!raw || !Array.isArray(raw.items)) return null;
  return raw;
}

export async function saveTabAnnotationState(snapshot: TabAnnotationSnapshot): Promise<void> {
  await storageSet(`${TAB_STATE_PREFIX}${snapshot.tabKey}`, snapshot);
}

export async function clearTabAnnotationState(tabKey: string): Promise<void> {
  await storageRemove(`${TAB_STATE_PREFIX}${tabKey}`);
}

export async function loadSavedSessions(): Promise<SavedSession[]> {
  const raw = await storageGet<unknown>(SESSIONS_KEY);
  return sanitizeSavedSessions(raw);
}

export async function saveSessionSnapshot(session: SavedSession): Promise<SavedSession[]> {
  const existing = await loadSavedSessions();
  const next = [session, ...existing.filter((s) => s.id !== session.id)].slice(0, 30);
  await storageSet(SESSIONS_KEY, next);
  return next;
}

export async function deleteSavedSession(sessionId: string): Promise<SavedSession[]> {
  const existing = await loadSavedSessions();
  const next = existing.filter((s) => s.id !== sessionId);
  await storageSet(SESSIONS_KEY, next);
  return next;
}

export async function clearAllSavedSessions(): Promise<void> {
  await storageRemove(SESSIONS_KEY);
}
