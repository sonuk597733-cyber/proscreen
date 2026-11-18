import React, { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { KeyboardShortcutEvent, ShortcutNotification, TimedShortcutNotificationBuffer } from './keyboardVisualizer';

export function KeyboardShortcutCards({ notifications }: { notifications: ShortcutNotification[] }) {
  if (notifications.length === 0) return null;
  return (
    <section
      data-testid="keyboard-visualizer-overlay"
      aria-label="Recent keyboard shortcuts"
      aria-live="polite"
      className="fixed right-6 top-6 z-[2147483647] flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-2 pointer-events-none"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          data-testid="keyboard-shortcut-notification"
          className="flex items-center gap-3 rounded-lg border border-white/15 bg-slate-950/90 px-4 py-3 text-white shadow-xl backdrop-blur-md"
        >
          <Keyboard aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-300" />
          <kbd className="font-mono text-sm font-semibold tracking-wide">{notification.label}</kbd>
        </div>
      ))}
    </section>
  );
}

export function KeyboardVisualizerOverlay() {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;
  const [notifications, setNotifications] = useState<ShortcutNotification[]>([]);

  useEffect(() => {
    const buffer = new TimedShortcutNotificationBuffer(setNotifications);
    if (!desktop) {
      return () => buffer.dispose();
    }

    const unsubscribeShortcut = desktop.onKeyboardShortcut((event: KeyboardShortcutEvent) => {
      buffer.add(event);
    });
    const unsubscribeDisabled = desktop.onKeyboardVisualizerDisabled(() => buffer.clear());
    return () => {
      unsubscribeShortcut();
      unsubscribeDisabled();
      buffer.dispose();
    };
  }, [desktop]);

  return <KeyboardShortcutCards notifications={notifications} />;
}
