import { AnnotationItem } from '../types/annotation';
import { TimerSettings } from '../types/settings';

export const TIMER_PRESETS_MS: { label: string; ms: number }[] = [
  { label: '5s', ms: 5_000 },
  { label: '10s', ms: 10_000 },
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '1m', ms: 60_000 },
  { label: '2m', ms: 120_000 },
  { label: '5m', ms: 300_000 },
];

export const MIN_TIMER_DURATION_MS = 1_000;
export const MAX_TIMER_DURATION_MS = 3_600_000;

export function clampTimerDurationMs(ms: number): number {
  if (!Number.isFinite(ms)) return 15_000;
  return Math.max(MIN_TIMER_DURATION_MS, Math.min(MAX_TIMER_DURATION_MS, Math.round(ms)));
}

export function createDefaultTimerSettings(): TimerSettings {
  return {
    enabled: false,
    durationMs: 15_000,
    paused: false,
    showInRecording: false,
  };
}

/**
 * Stamps timer fields onto a newly created annotation ONLY when Timer is enabled.
 * Existing annotations remain completely unaffected when Timer is toggled or adjusted.
 */
export function stampAnnotationWithTimer<T extends AnnotationItem>(
  item: T,
  timer: TimerSettings,
  nowMs: number
): T {
  if (!timer.enabled) {
    return {
      ...item,
      expiresAt: null,
      pausedRemainingMs: null,
      timerDurationMs: null,
    };
  }
  const duration = clampTimerDurationMs(timer.durationMs);
  if (timer.paused) {
    return {
      ...item,
      expiresAt: null,
      pausedRemainingMs: duration,
      timerDurationMs: duration,
    };
  }
  return {
    ...item,
    expiresAt: nowMs + duration,
    pausedRemainingMs: null,
    timerDurationMs: duration,
  };
}

export function pauseAnnotationTimers(items: AnnotationItem[], nowMs: number): AnnotationItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (typeof item.expiresAt !== 'number') return item;
    changed = true;
    const remaining = Math.max(100, item.expiresAt - nowMs);
    return {
      ...item,
      expiresAt: null,
      pausedRemainingMs: remaining,
    };
  });
  return changed ? next : items;
}

export function resumeAnnotationTimers(items: AnnotationItem[], nowMs: number): AnnotationItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (typeof item.pausedRemainingMs !== 'number') return item;
    changed = true;
    return {
      ...item,
      expiresAt: nowMs + Math.max(100, item.pausedRemainingMs),
      pausedRemainingMs: null,
    };
  });
  return changed ? next : items;
}

/**
 * Resets countdown for currently scheduled/paused annotations using the active duration.
 * Does NOT affect permanent annotations created while Timer was OFF.
 */
export function resetAnnotationTimers(
  items: AnnotationItem[],
  durationMs: number,
  paused: boolean,
  nowMs: number
): AnnotationItem[] {
  const safeDuration = clampTimerDurationMs(durationMs);
  let changed = false;
  const next = items.map((item) => {
    const isTimed =
      typeof item.expiresAt === 'number' ||
      typeof item.pausedRemainingMs === 'number' ||
      typeof item.timerDurationMs === 'number';
    if (!isTimed) return item;
    changed = true;
    return {
      ...item,
      timerDurationMs: safeDuration,
      expiresAt: paused ? null : nowMs + safeDuration,
      pausedRemainingMs: paused ? safeDuration : null,
    };
  });
  return changed ? next : items;
}

/**
 * Cancels pending timer expirations across all items so they stay on screen permanently.
 */
export function cancelAnnotationTimers(items: AnnotationItem[]): AnnotationItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (
      item.expiresAt == null &&
      item.pausedRemainingMs == null &&
      item.timerDurationMs == null
    ) {
      return item;
    }
    changed = true;
    return {
      ...item,
      expiresAt: null,
      pausedRemainingMs: null,
      timerDurationMs: null,
    };
  });
  return changed ? next : items;
}

export function isAnnotationExpired(item: AnnotationItem, nowMs: number): boolean {
  if (typeof item.expiresAt === 'number' && nowMs >= item.expiresAt) {
    return true;
  }
  if (typeof item.fadeDurationMs === 'number' && item.fadeDurationMs > 0) {
    return nowMs - item.createdAt >= item.fadeDurationMs;
  }
  return false;
}

/**
 * Returns the shortest positive remaining ms across active timed annotations, or null if none.
 */
export function getActiveTimerCountdownMs(
  items: AnnotationItem[],
  timer: TimerSettings,
  nowMs: number
): number | null {
  let minRemaining: number | null = null;
  for (const item of items) {
    if (timer.paused && typeof item.pausedRemainingMs === 'number') {
      minRemaining =
        minRemaining === null ? item.pausedRemainingMs : Math.min(minRemaining, item.pausedRemainingMs);
    } else if (typeof item.expiresAt === 'number') {
      const rem = Math.max(0, item.expiresAt - nowMs);
      minRemaining = minRemaining === null ? rem : Math.min(minRemaining, rem);
    }
  }
  return minRemaining;
}

export function formatCountdownMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
