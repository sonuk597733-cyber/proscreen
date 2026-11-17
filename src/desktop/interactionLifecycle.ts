export type FloatingWindowRole = 'overlay' | 'recordingBar' | 'toolbar' | 'popout';

export interface PopoutOpenResult {
  accepted: boolean;
  popoutId: string | null;
  transitionId: number;
}

export interface PopoutCloseResult {
  shouldClose: boolean;
  transitionId: number;
}

/**
 * Coordinates popout open/close lifecycle across Main and Toolbar windows using a single
 * monotonic session transitionId. Crucially, closing a session does NOT bump the transitionId
 * out from under Toolbar — the closed notification echoes the closing session's exact ID so
 * activePopout always resets reliably and hover/tooltip state never gets stuck.
 */
export class PopoutTransitionCoordinator {
  private activeSessionId: number | null = null;
  private activePopoutId: string | null = null;
  private latestTransitionId = 0;

  get currentPopoutId(): string | null {
    return this.activePopoutId;
  }

  get currentSessionId(): number | null {
    return this.activeSessionId;
  }

  get lastTransitionId(): number {
    return this.latestTransitionId;
  }

  open(popoutId: string, requestedTransitionId?: number): PopoutOpenResult {
    let nextId: number;
    if (typeof requestedTransitionId === 'number' && Number.isFinite(requestedTransitionId)) {
      if (requestedTransitionId < this.latestTransitionId) {
        return {
          accepted: false,
          popoutId: this.activePopoutId,
          transitionId: this.latestTransitionId,
        };
      }
      nextId = requestedTransitionId;
      this.latestTransitionId = requestedTransitionId;
    } else {
      this.latestTransitionId += 1;
      nextId = this.latestTransitionId;
    }

    this.activeSessionId = nextId;
    this.activePopoutId = popoutId;
    return {
      accepted: true,
      popoutId,
      transitionId: nextId,
    };
  }

  close(expectedTransitionId?: number): PopoutCloseResult {
    if (this.activeSessionId === null) {
      return {
        shouldClose: false,
        transitionId: this.latestTransitionId,
      };
    }

    if (
      typeof expectedTransitionId === 'number' &&
      expectedTransitionId !== this.activeSessionId
    ) {
      return {
        shouldClose: false,
        transitionId: this.activeSessionId,
      };
    }

    const closingSessionId = this.activeSessionId;
    this.activeSessionId = null;
    this.activePopoutId = null;
    return {
      shouldClose: true,
      transitionId: closingSessionId,
    };
  }

  reset(): void {
    this.activeSessionId = null;
    this.activePopoutId = null;
  }
}

/**
 * Toolbar renderer filter for `desktop:popout-closed` events.
 * Allows clearing when session ID matches or exceeds the open session, while discarding stale
 * close events from an older transition.
 */
export function shouldToolbarApplyPopoutClosed(
  currentOpenSessionId: number,
  closedInfo?: { transitionId?: number }
): boolean {
  if (currentOpenSessionId <= 0) {
    return true;
  }
  if (!closedInfo || typeof closedInfo.transitionId !== 'number') {
    return true;
  }
  return closedInfo.transitionId >= currentOpenSessionId;
}

export interface FloatingWindowVisibility {
  overlayVisible: boolean;
  recordingBarVisible: boolean;
  toolbarVisible: boolean;
  popoutVisible: boolean;
}

/**
 * Computes the strict ascending Win32 topmost Z-order sequence.
 * Fullscreen overlay MUST always sit strictly underneath floating controls
 * (`recordingBar` -> `toolbar` -> `popout`).
 */
export function computeFloatingZOrderStack(
  visibility: FloatingWindowVisibility
): FloatingWindowRole[] {
  const stack: FloatingWindowRole[] = [];
  if (visibility.overlayVisible) {
    stack.push('overlay');
  }
  if (visibility.recordingBarVisible) {
    stack.push('recordingBar');
  }
  if (visibility.toolbarVisible) {
    stack.push('toolbar');
  }
  if (visibility.popoutVisible) {
    stack.push('popout');
  }
  return stack;
}

/**
 * Single authoritative check determining whether the fullscreen overlay window
 * should capture mouse events vs remain transparent click-through.
 */
export function shouldOverlayReceiveMouse(state: {
  interactionMode: 'pointer' | 'drawing';
  toolbarVisible: boolean;
  annotationsVisible: boolean;
  activeTool: string;
  hasBlockingOverlayModal?: boolean;
}): boolean {
  if (state.hasBlockingOverlayModal) {
    return true;
  }
  if (!state.toolbarVisible || !state.annotationsVisible) {
    return false;
  }
  if (state.interactionMode !== 'drawing') {
    return false;
  }
  return state.activeTool !== 'pointer' && state.activeTool !== 'cursor';
}

/**
 * Classifies editing shortcuts (`Delete`, `Backspace`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`)
 * triggered while Toolbar or Popout windows have OS focus so they execute on the canvas.
 */
export function classifyForwardedShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  isEditableTarget?: boolean;
}): { action: string; payload?: unknown } | null {
  if (event.isEditableTarget) {
    return null;
  }

  const key = event.key;
  const mod = Boolean(event.ctrlKey || event.metaKey);

  if ((key === 'Delete' || key === 'Backspace') && !mod && !event.altKey) {
    return { action: 'delete-selected' };
  }

  if (mod && !event.altKey) {
    const upper = key.toUpperCase();
    if (upper === 'Z' && event.shiftKey) {
      return { action: 'redo', payload: 'all' };
    }
    if (upper === 'Y' && !event.shiftKey) {
      return { action: 'redo', payload: 'all' };
    }
    if (upper === 'Z' && !event.shiftKey) {
      return { action: 'undo', payload: 'all' };
    }
  }

  return null;
}
