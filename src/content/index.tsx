import React, { useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ProScreenOverlay } from '../overlay/ProScreenOverlay';
import { useProScreenEngine } from '../hooks/useProScreenEngine';
import { getTabSessionKey } from '../utils/env';

declare const __PROSCREEN_INLINE_CSS__: string | undefined;

const HOST_ID = 'proscreen-extension-host';

interface ContentShellProps {
  initialTabKey: string;
}

const ContentShell: React.FC<ContentShellProps> = ({ initialTabKey }) => {
  const engine = useProScreenEngine(initialTabKey);

  useEffect(() => {
    let hasNumericTabId = false;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (res) => {
          if (!chrome.runtime.lastError && typeof res?.tabId === 'number') {
            hasNumericTabId = true;
            engine.setTabKey(getTabSessionKey(window.location.href, res.tabId));
          }
        });
      }
    } catch {
      // Extension context invalidated during reload
    }

    const onUrlChange = () => {
      if (!hasNumericTabId) {
        engine.setTabKey(getTabSessionKey(window.location.href));
      }
    };

    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
    window.addEventListener('proscreen:url-change', onUrlChange);
    return () => {
      window.removeEventListener('popstate', onUrlChange);
      window.removeEventListener('hashchange', onUrlChange);
      window.removeEventListener('proscreen:url-change', onUrlChange);
    };
  }, [engine.setTabKey]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const listener = (
      msg: { type?: string; action?: string; payload?: unknown },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (resp: unknown) => void
    ) => {
      if (msg?.type === 'PROSCREEN_PING') {
        sendResponse({ alive: true });
        return;
      }
      if (msg?.type === 'PROSCREEN_COMMAND') {
        const cmd = (msg as { command?: string }).command;
        if (cmd === 'toggle-toolbar') {
          engine.toggleEye();
        } else if (cmd === 'toggle-ghost-mode') {
          engine.toggleGhostMode();
        } else if (cmd === 'capture-screenshot') {
          void engine.triggerCapture(null);
        } else if (cmd === 'clear-annotations') {
          engine.clearScreen();
        } else if (typeof cmd === 'string') {
          engine.runShortcutAction(cmd);
        }
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === 'PROSCREEN_ACTION') {
        if (msg.action === 'show' || msg.action === 'open-eye') {
          engine.openEye();
          engine.updateSettings((p) => ({ ...p, toolbarCollapsed: false }));
        } else if (msg.action === 'toggle') {
          engine.toggleEye();
        } else if (msg.action === 'close-eye') {
          engine.closeEye();
        } else if (msg.action === 'whiteboard') {
          engine.switchBoardMode('whiteboard');
        } else if (msg.action === 'blackboard') {
          engine.switchBoardMode('blackboard');
        } else if (msg.action === 'creator') {
          engine.toggleCreatorMode();
        } else if (msg.action === 'ghost') {
          engine.toggleGhostMode();
        } else if (msg.action === 'screenshot') {
          void engine.triggerCapture(null);
        } else if (msg.action === 'clear') {
          engine.clearScreen();
        } else if (msg.action === 'external-recording-started') {
          const p = (msg.payload || {}) as { mode?: 'tab' | 'window' | 'screen'; mimeType?: string };
          engine.attachExternalRecording(p.mode || 'tab', p.mimeType || 'video/webm');
        }
        sendResponse({ ok: true });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [engine]);

  // Global in-page shortcut listener (Alt+Shift+P, Alt+V, Alt+Shift+S, Alt+Shift+X, Alt+Shift+R)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Alt+Shift+P: Show/Hide ProScreen (Epic Pen style Eye)
      if (e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        engine.toggleEye();
        return;
      }

      // Alt+V: Pointer Mode
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        e.stopPropagation();
        if (!engine.toolbarVisible) {
          engine.openEye();
        }
        engine.setActiveTool('pointer');
        return;
      }

      // Alt+Shift+S: Screenshot
      if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        void engine.triggerCapture(null);
        return;
      }

      // Alt+Shift+X: Clear screen annotations
      if (e.altKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        engine.clearScreen();
        return;
      }

      // Alt+Shift+R: Toggle screen recording
      if (e.altKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        e.stopPropagation();
        void engine.toggleScreenRecording();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [engine]);

  return <ProScreenOverlay engine={engine} />;
};

// Intercept SPA client-side history navigation (YouTube, GitHub, Wikipedia, etc.)
try {
  const notifySpaNavigation = () => {
    window.dispatchEvent(new CustomEvent('proscreen:url-change'));
  };

  const origPushState = history.pushState;
  history.pushState = function (...args) {
    const res = origPushState.apply(this, args);
    notifySpaNavigation();
    return res;
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const res = origReplaceState.apply(this, args);
    notifySpaNavigation();
    return res;
  };
} catch {
  // Ignore in restricted environments
}

function mountContentOverlay() {
  if (document.getElementById(HOST_ID)) return;

  const targetParent = document.documentElement || document.body;
  if (!targetParent) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountContentOverlay, { once: true });
    } else {
      window.requestAnimationFrame(mountContentOverlay);
    }
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.width = '100vw';
  host.style.height = '100vh';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';
  targetParent.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // 1. Direct inline styles (100% immune to host page CSP style-src restrictions on Google, YouTube, GitHub, etc.)
  if (typeof __PROSCREEN_INLINE_CSS__ === 'string' && __PROSCREEN_INLINE_CSS__.length > 0) {
    const inlineStyle = document.createElement('style');
    inlineStyle.id = 'proscreen-inline-style';
    inlineStyle.textContent = __PROSCREEN_INLINE_CSS__;
    shadow.appendChild(inlineStyle);

    try {
      if ('adoptedStyleSheets' in shadow && typeof CSSStyleSheet !== 'undefined') {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(__PROSCREEN_INLINE_CSS__);
        shadow.adoptedStyleSheets = [sheet];
      }
    } catch {
      // Fallback already appended as inlineStyle
    }
  }

  // 2. Also attach link element as companion/fallback
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content.css');
    shadow.appendChild(styleLink);
  }

  const mountNode = document.createElement('div');
  mountNode.style.width = '100%';
  mountNode.style.height = '100%';
  mountNode.style.pointerEvents = 'none';
  shadow.appendChild(mountNode);

  const root: Root = createRoot(mountNode);
  const initialTabKey = getTabSessionKey(window.location.href);
  root.render(<ContentShell initialTabKey={initialTabKey} />);
}

// Safe initial mount
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountContentOverlay, { once: true });
} else {
  mountContentOverlay();
}

// Watch for DOM changes where SPA frameworks replace documentElement or body children
try {
  const domObserver = new MutationObserver(() => {
    if (!document.getElementById(HOST_ID)) {
      mountContentOverlay();
    }
  });
  if (document.documentElement) {
    domObserver.observe(document.documentElement, { childList: true });
  }
} catch {
  // Ignore in sandboxed contexts
}
