import React, { useEffect, useRef, useState } from 'react';
import { Pause, Timer } from 'lucide-react';
import { KeyboardVisualizerPosition } from '../types/settings';
import {
  getKeyboardShortcutEventFromDomEvent,
  KeyboardShortcutEvent,
  ShortcutNotification,
  TimedShortcutNotificationBuffer,
} from './keyboardVisualizer';

const POSITION_CLASSES: Record<KeyboardVisualizerPosition, string> = {
  'bottom-left': 'left-4 sm:left-6 bottom-[max(1rem,env(safe-area-inset-bottom))]',
  'bottom-center': 'left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))]',
  'bottom-right': 'right-4 sm:right-6 bottom-[max(1rem,env(safe-area-inset-bottom))]',
};

interface DisplayShortcutNotification extends ShortcutNotification {
  entering?: boolean;
  exiting?: boolean;
}

export function KeyboardShortcutCards({
  notifications,
  position = 'bottom-center',
  animate = true,
}: {
  notifications: ShortcutNotification[];
  position?: KeyboardVisualizerPosition;
  animate?: boolean;
}) {
  const [displayed, setDisplayed] = useState<DisplayShortcutNotification[]>(() =>
    notifications.map((notification) => ({ ...notification, entering: true }))
  );
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const incomingIds = new Set(notifications.map((notification) => notification.id));
    setDisplayed((current) => {
      const retained = current.filter((item) => !incomingIds.has(item.id) && !item.exiting);
      const incoming = notifications.map((item) => ({ ...item, entering: !current.some((old) => old.id === item.id) }));
      const leaving = retained.map((item) => ({ ...item, entering: false, exiting: true }));
      return [...incoming, ...leaving].slice(0, 5);
    });

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (displayed.some((item) => item.exiting) || notifications.length < displayed.length) {
      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null;
        setDisplayed((current) => current.filter((item) => !item.exiting));
      }, 180);
    }
  }, [notifications]);

  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  }, []);

  return (
    <section
      data-testid="keyboard-visualizer-overlay"
      aria-label="Recent shortcuts detected only in ProScreen"
      aria-live="polite"
      className={`fixed ${POSITION_CLASSES[position]} z-[2147483647] flex max-h-[55vh] max-w-[calc(100vw-2rem)] flex-col items-center gap-2 overflow-hidden pointer-events-none`}
    >
      {displayed.map((notification) => (
        <div
          key={notification.id}
          data-testid="keyboard-shortcut-notification"
          className={`w-fit max-w-full rounded-[14px] border border-white/80 bg-[#f2f1ee] p-[7px] shadow-[0_8px_24px_rgba(0,0,0,.23),0_0_16px_rgba(167,139,250,.12)] ${
            animate && notification.entering ? 'proscreen-shortcut-enter' : ''
          } ${animate && notification.exiting ? 'proscreen-shortcut-exit' : ''}`}
        >
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
            {notification.label.split('+').map((key, keyIndex) => (
              <React.Fragment key={`${notification.id}-${keyIndex}`}>
                {keyIndex > 0 && (
                  <span aria-hidden="true" className="px-px text-[13px] font-semibold text-[#72737b]">+</span>
                )}
                <kbd
                  className={`relative inline-flex h-9 min-w-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-[#393b42] border-b-[3px] border-b-[#101115] bg-gradient-to-b from-[#33363e] to-[#202228] px-2.5 font-mono text-[12px] font-bold tracking-wide text-[#f8f8f9] shadow-[0_2px_3px_rgba(13,15,19,.28)] ${
                    animate && notification.entering ? 'proscreen-keycap-enter' : ''
                  }`}
                  style={animate && notification.entering ? { animationDelay: `${keyIndex * 32}ms` } : undefined}
                >
                  {key}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[1px] left-1 right-1 h-px rounded-full bg-gradient-to-r from-emerald-300 via-violet-400 to-rose-300 opacity-90 blur-[0.4px]"
                  />
                </kbd>
              </React.Fragment>
            ))}
          </div>
        </div>
        ))}
    </section>
  );
}

export function KeyboardVisualizerOverlay({
  enabled = false,
  position = 'bottom-center',
  animate = true,
  showInRecording = true,
  recording = false,
}: {
  enabled?: boolean;
  position?: KeyboardVisualizerPosition;
  animate?: boolean;
  showInRecording?: boolean;
  recording?: boolean;
}) {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;
  const [notifications, setNotifications] = useState<ShortcutNotification[]>([]);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!desktop) return undefined;
    // Keep one stable IPC subscription for the life of the overlay. This avoids missed
    // first shortcuts during ON transitions and prevents listener churn across settings updates.
    const buffer = new TimedShortcutNotificationBuffer(setNotifications);
    const unsubscribeShortcut = desktop.onKeyboardShortcut((event: KeyboardShortcutEvent) => {
      if (enabledRef.current) buffer.add(event);
    });
    const unsubscribeDisabled = desktop.onKeyboardVisualizerDisabled(() => buffer.clear());
    return () => {
      unsubscribeShortcut();
      unsubscribeDisabled();
      buffer.dispose();
    };
  }, [desktop]);

  useEffect(() => {
    if (desktop) return undefined;
    const buffer = new TimedShortcutNotificationBuffer(setNotifications);
    if (!enabled) {
      buffer.clear();
      return () => buffer.dispose();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = getKeyboardShortcutEventFromDomEvent(event);
      if (shortcut) buffer.add(shortcut);
    };
    window.addEventListener('keydown', onKeyDown, { capture: true, passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      buffer.dispose();
    };
  }, [desktop, enabled]);

  if (!enabled || (recording && !showInRecording)) return null;
  return <KeyboardShortcutCards notifications={notifications} position={position} animate={animate} />;
}

/** A quiet visual progress indicator, shown only in a recording when explicitly enabled. */
export function TimerHud({
  enabled,
  paused,
  durationMs,
  countdownMs,
  showInRecording,
  recording,
}: {
  enabled: boolean;
  paused: boolean;
  durationMs: number;
  countdownMs: number | null;
  showInRecording: boolean;
  recording: boolean;
}) {
  if (!recording || !showInRecording || !enabled || countdownMs === null) return null;
  const progress = Math.max(0, Math.min(1, countdownMs / Math.max(1, durationMs)));
  const ringColor = paused ? 'rgba(251,191,36,.88)' : 'rgba(110,231,183,.9)';
  return (
    <div
      data-testid="timer-hud"
      role="status"
      aria-label={paused ? 'Annotation timer paused' : 'Annotation timer active'}
      title={paused ? 'Timer paused' : 'Timer active'}
      className="fixed right-4 top-4 z-[2147483645] flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,.35)] pointer-events-none relative"
      style={{ backgroundColor: 'rgb(17 19 24 / 95%)' }}
    >
      <span
        className="absolute inset-[-2px] rounded-full"
        style={{
          background: `conic-gradient(${ringColor} ${progress * 360}deg, rgba(255,255,255,.10) ${progress * 360}deg)`,
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
        }}
      />
      {paused ? <Pause className="relative h-3.5 w-3.5 text-amber-200" aria-hidden="true" /> : <Timer className="relative h-3.5 w-3.5 text-emerald-200" aria-hidden="true" />}
    </div>
  );
}
