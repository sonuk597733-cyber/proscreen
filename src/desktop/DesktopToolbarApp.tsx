import React, { useEffect, useRef, useState } from 'react';
import { FloatingToolbar } from '../toolbar/FloatingToolbar';
import { FloatingEyeRestoreButton } from '../components/FloatingEyeRestoreButton';
import { PopoutId } from '../toolbar/ToolbarPopouts';
import { DesktopSharedState } from './desktopTypes';
import { createDefaultSettings } from '../storage/validation';
import { UserSettings } from '../types/settings';
import { ToolType } from '../types/annotation';
import { getSupportedRecordingFormats } from '../recorder/screenRecorder';
import { mergeAndValidateSettings } from '../storage/validation';
import {
  classifyForwardedShortcut,
  shouldToolbarApplyPopoutClosed,
} from './interactionLifecycle';

export const DesktopToolbarApp: React.FC = () => {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;

  const [activePopout, setActivePopout] = useState<PopoutId | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaults = createDefaultSettings();
    if (typeof window !== 'undefined' && window.proscreenDesktop) {
      defaults.recording.mode = 'screen';
    }
    return defaults;
  });
  const [state, setState] = useState<DesktopSharedState>({
    activeTool: 'pointer',
    interactionMode: 'pointer',
    toolbarVisible: true,
    restoreButtonVisible: false,
    annotationsVisible: true,
    toolbarPosition: { x: 16, y: 76 },
    restoreButtonPosition: { x: 16, y: 76 },
    boardMode: 'webpage',
    resolvedTheme: 'dark',
    ghostMode: false,
    presentationMode: false,
    historyCount: 0,
    canUndo: false,
    canRedo: false,
    activeColor: '#EF4444',
    activeThickness: 4,
    activeOpacity: 1,
    selectedItemId: null,
    activePageIndex: 0,
    boardPageCount: 1,
    isRecording: false,
    recordingStatus: 'idle',
    recordingElapsedMs: 0,
    latestRecording: null,
  });

  const isDraggingRef = useRef(false);
  const [keyboardVisualizerEnabled, setKeyboardVisualizerEnabled] = useState(false);
  const [keyboardVisualizerBusy, setKeyboardVisualizerBusy] = useState(false);
  const [keyboardVisualizerError, setKeyboardVisualizerError] = useState<string | null>(null);

  const toggleKeyboardVisualizer = async () => {
    if (!desktop || keyboardVisualizerBusy) return;
    setKeyboardVisualizerBusy(true);
    setKeyboardVisualizerError(null);
    try {
      const status = keyboardVisualizerEnabled
        ? await desktop.stopKeyboardVisualizer()
        : await desktop.startKeyboardVisualizer();
      setKeyboardVisualizerEnabled(status.enabled);
      setKeyboardVisualizerError(status.error || null);
    } catch (error) {
      setKeyboardVisualizerError(error instanceof Error ? error.message : String(error));
      setKeyboardVisualizerEnabled(false);
    } finally {
      setKeyboardVisualizerBusy(false);
    }
  };

  // Controlled diagnostic mode: bounded ring buffer (max 100 events) for mouse/drag tracing without memory leaks
  useEffect(() => {
    const ringBuffer: Array<{ time: number; event: string; detail?: unknown }> = [];
    const pushDiag = (event: string, detail?: unknown) => {
      ringBuffer.push({ time: Date.now(), event, detail });
      if (ringBuffer.length > 100) ringBuffer.shift();
    };
    (window as unknown as { __PROSCREEN_DIAGNOSTICS__: typeof ringBuffer }).__PROSCREEN_DIAGNOSTICS__ = ringBuffer;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      pushDiag('pointerdown', {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
        target: target?.getAttribute('data-testid') || target?.tagName,
      });
    };
    const onPointerUp = (e: PointerEvent) => {
      pushDiag('pointerup', { x: Math.round(e.clientX), y: Math.round(e.clientY) });
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };
  }, []);

  // Load persistent desktop settings on mount & listen for cross-window updates
  useEffect(() => {
    if (!desktop) return;
    void desktop.loadDesktopSettings().then((loaded) => {
      if (loaded) {
        setSettings((prev) => {
          const merged = mergeAndValidateSettings({ ...prev, ...loaded });
          if (merged.recording && merged.recording.mode === 'tab') {
            merged.recording.mode = 'screen';
          }
          return merged;
        });
      }
    });
    if (desktop.onSettingsChanged) {
      return desktop.onSettingsChanged((updated) => {
        if (!updated) return;
        setSettings((prev) => {
          const merged = mergeAndValidateSettings({ ...prev, ...updated });
          if (merged.recording && merged.recording.mode === 'tab') {
            merged.recording.mode = 'screen';
          }
          return merged;
        });
      });
    }
    return undefined;
  }, [desktop]);

  // Synchronize live state from Main process / Overlay
  useEffect(() => {
    if (!desktop) return;
    const unsub = desktop.onStateChange((next) => {
      setState((prev) => {
        let changed = false;
        for (const k in next) {
          const key = k as keyof typeof next;
          if (prev[key] !== next[key]) {
            changed = true;
            break;
          }
        }
        return changed ? { ...prev, ...next } : prev;
      });
      if (next.toolbarPosition) {
        setSettings((prev) => {
          if (
            prev.toolbarPosition?.x === next.toolbarPosition.x &&
            prev.toolbarPosition?.y === next.toolbarPosition.y
          ) {
            return prev;
          }
          return { ...prev, toolbarPosition: next.toolbarPosition };
        });
      }
      if (next.restoreButtonPosition) {
        setSettings((prev) => {
          if (
            prev.restoreButtonPosition?.x === next.restoreButtonPosition.x &&
            prev.restoreButtonPosition?.y === next.restoreButtonPosition.y
          ) {
            return prev;
          }
          return { ...prev, restoreButtonPosition: next.restoreButtonPosition };
        });
      }
    });
    void desktop.getState().then((s) => {
      setState((prev) => {
        let changed = false;
        for (const k in s) {
          const key = k as keyof typeof s;
          if (prev[key] !== s[key]) {
            changed = true;
            break;
          }
        }
        return changed ? { ...prev, ...s } : prev;
      });
      if (s.toolbarPosition) {
        setSettings((prev) => {
          if (
            prev.toolbarPosition?.x === s.toolbarPosition.x &&
            prev.toolbarPosition?.y === s.toolbarPosition.y
          ) {
            return prev;
          }
          return { ...prev, toolbarPosition: s.toolbarPosition };
        });
      }
      if (s.restoreButtonPosition) {
        setSettings((prev) => {
          if (
            prev.restoreButtonPosition?.x === s.restoreButtonPosition.x &&
            prev.restoreButtonPosition?.y === s.restoreButtonPosition.y
          ) {
            return prev;
          }
          return { ...prev, restoreButtonPosition: s.restoreButtonPosition };
        });
      }
    });
    return unsub;
  }, [desktop]);

  // Dynamically resize toolbar window & manage mouse pass-through:
  // - Eye OFF / Restore button: 44x44, accepts clicks
  // - Normal vertical toolbar: 44x520 (fits all 18 tools), accepts clicks
  // - Hidden / unmounted: setToolbarIgnoreMouse(true) so no invisible mouse trap can ever exist
  // NOTE: When a dropdown/popout opens, the toolbar window is NEVER resized or moved.
  // The dropdown opens in a dedicated transparent utility window, keeping the toolbar 100% stationary!
  useEffect(() => {
    if (!desktop || isDraggingRef.current) return;

    if (!state.toolbarVisible && state.restoreButtonVisible) {
      desktop.setToolbarBounds({ width: 44, height: 44 });
      desktop.setToolbarIgnoreMouse(false);
    } else if (state.toolbarVisible) {
      desktop.setToolbarBounds({ width: 44, height: 520 });
      desktop.setToolbarIgnoreMouse(false);
    } else {
      // Safety guard: if neither toolbar nor restore button is visible, pass clicks through 100%
      desktop.setToolbarIgnoreMouse(true);
    }
  }, [desktop, state.toolbarVisible, state.restoreButtonVisible]);

  // Synchronize popout open/close sessions cleanly with main process so hover/tooltip
  // state always resets reliably across blur, Esc, and repeated hover/click cycles.
  const nextTransitionSeqRef = useRef(0);
  const openSessionIdRef = useRef(0);

  const dismissActivePopout = () => {
    const closingSessionId = openSessionIdRef.current;
    openSessionIdRef.current = 0;
    setActivePopout(null);
    desktop?.closePopout?.(closingSessionId > 0 ? { transitionId: closingSessionId } : undefined);
  };

  useEffect(() => {
    if (!desktop?.onPopoutClosed) return;
    const unsub = desktop.onPopoutClosed((info) => {
      if (shouldToolbarApplyPopoutClosed(openSessionIdRef.current, info)) {
        openSessionIdRef.current = 0;
        setActivePopout(null);
      }
    });
    return unsub;
  }, [desktop]);

  // Forward Delete / Backspace / Undo / Redo when toolbar window holds OS focus
  useEffect(() => {
    if (!desktop) return;
    const handleForwardedShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
      );
      const forwarded = classifyForwardedShortcut({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        isEditableTarget,
      });
      if (forwarded) {
        e.preventDefault();
        desktop.dispatchAction(forwarded.action, forwarded.payload);
      }
    };
    window.addEventListener('keydown', handleForwardedShortcuts);
    return () => window.removeEventListener('keydown', handleForwardedShortcuts);
  }, [desktop]);

  // Auto-dismiss active popout when user clicks outside the toolbar or presses Escape inside toolbar window
  useEffect(() => {
    if (!activePopout) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        !target.closest('[data-testid="proscreen-toolbar"]')
      ) {
        dismissActivePopout();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismissActivePopout();
      }
    };

    window.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activePopout, desktop]);

  const handleUpdateSettings = (updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      desktop?.saveDesktopSettings(next);
      desktop?.dispatchAction('update-settings', next);
      return next;
    });
  };

  const handleSelectTool = (tool: ToolType) => {
    setState((s) => ({ ...s, activeTool: tool }));
    desktop?.dispatchAction('select-tool', tool);
    if (tool === 'pointer' || tool === 'cursor') {
      desktop?.setInteractionMode('pointer');
    } else {
      desktop?.setInteractionMode('drawing');
    }
  };

  // Eye OFF: Hide full toolbar and display ONLY the floating Eye restore button
  if (!state.toolbarVisible && state.restoreButtonVisible) {
    return (
      <div
        id="desktop-restore-button-root"
        className="select-none font-sans"
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'transparent',
          pointerEvents: 'auto',
        }}
      >
        <FloatingEyeRestoreButton
          position={settings.restoreButtonPosition || { x: 16, y: 76 }}
          onPositionChange={(pos) => {
            setSettings((prev) => {
              const next = { ...prev, restoreButtonPosition: pos, toolbarPosition: pos };
              desktop?.saveDesktopSettings(next);
              return next;
            });
            desktop?.saveRestoreButtonPosition(pos.x, pos.y);
          }}
          onDesktopMove={(x, y) => {
            isDraggingRef.current = true;
            desktop?.moveToolbar(x, y);
          }}
          onSaveDesktopPosition={(x, y) => {
            isDraggingRef.current = false;
            setSettings((prev) => {
              const next = { ...prev, restoreButtonPosition: { x, y }, toolbarPosition: { x, y } };
              desktop?.saveDesktopSettings(next);
              return next;
            });
            desktop?.saveRestoreButtonPosition(x, y);
          }}
          onRestore={() => {
            isDraggingRef.current = false;
            desktop?.setEye(true);
          }}
          edgeSnapping={settings.edgeSnapping}
          isDesktopToolbarWindow={true}
        />
      </div>
    );
  }

  if (!state.toolbarVisible) {
    return null;
  }

  const tbX = settings.toolbarPosition?.x ?? 16;
  const screenWidth = typeof window !== 'undefined' && window.screen?.availWidth ? window.screen.availWidth : 1920;
  const isNearRight = (screenWidth - (tbX + 44) < 340) && tbX >= 340;

  return (
    <div
      id="desktop-toolbar-root"
      className="select-none font-sans w-full h-full relative"
      style={{
        backgroundColor: activePopout ? 'rgba(0, 0, 0, 0.001)' : 'transparent',
        pointerEvents: 'auto',
      }}
    >
      <FloatingToolbar
        desktopOpenSide={isNearRight ? 'left' : 'right'}
        activeTool={state.activeTool}
        boardMode={state.boardMode}
        boardPageIndex={state.activePageIndex}
        boardPageCount={state.boardPageCount}
        hasBoardBackground={false}
        settings={settings}
        resolvedTheme={state.resolvedTheme}
        toolbarVisible={state.toolbarVisible}
        ghostMode={state.ghostMode}
        presentationMode={state.presentationMode}
        isCapturing={false}
        activeTimerCountdownMs={null}
        recordingStatus={state.recordingStatus || (state.isRecording ? 'recording' : 'idle')}
        recordingElapsedMs={state.recordingElapsedMs || 0}
        latestRecording={state.latestRecording || null}
        recordingSupported={true}
        supportedRecordingFormats={getSupportedRecordingFormats()}
        canUndoAll={state.canUndo}
        canRedoAll={state.canRedo}
        canUndoStroke={state.canUndo}
        canRedoStroke={state.canRedo}
        canUndoShape={state.canUndo}
        canRedoShape={state.canRedo}
        annotationCount={state.historyCount}
        hasSelectedObject={Boolean(state.selectedItemId)}
        activeBrush={{
          color: state.activeColor,
          thickness: state.activeThickness,
          opacity: state.activeOpacity,
        }}
        savedSessions={[]}
        activePopout={activePopout}
        isDesktopToolbarWindow={true}
        onDesktopMove={(x, y) => {
          isDraggingRef.current = true;
          dismissActivePopout();
          desktop?.moveToolbar(x, y);
        }}
        onSaveDesktopPosition={(x, y) => {
          isDraggingRef.current = false;
          setSettings((prev) => {
            const next = { ...prev, toolbarPosition: { x, y }, restoreButtonPosition: { x, y } };
            desktop?.saveDesktopSettings(next);
            return next;
          });
          desktop?.saveToolbarPosition(x, y);
        }}
        onSetActivePopout={(id, anchorOffsetY) => {
          if (id) {
            nextTransitionSeqRef.current += 1;
            const sessionId = nextTransitionSeqRef.current;
            openSessionIdRef.current = sessionId;
            setActivePopout(id);
            desktop?.openPopout?.({
              popoutId: id,
              anchorOffsetY: anchorOffsetY ?? 20,
              transitionId: sessionId,
            });
          } else {
            dismissActivePopout();
          }
        }}
        onSelectTool={handleSelectTool}
        onSwitchBoard={(mode) => desktop?.dispatchAction('switch-board', mode)}
        onPrevBoardPage={() => desktop?.dispatchAction('prev-board-page')}
        onNextBoardPage={() => desktop?.dispatchAction('next-board-page')}
        onAddBoardPage={() => desktop?.dispatchAction('add-board-page')}
        onClearBoard={() => desktop?.dispatchAction('clear-board')}
        onSaveBoard={() => desktop?.dispatchAction('save-board')}
        onExportBoardPng={() => desktop?.dispatchAction('export-board-png')}
        onImportBoardBackground={(dataUrl) =>
          desktop?.dispatchAction('import-board-background', dataUrl)
        }
        onClearBoardBackground={() => desktop?.dispatchAction('clear-board-background')}
        onUpdateSettings={handleUpdateSettings}
        onChangeColor={(hex) => desktop?.dispatchAction('change-color', hex)}
        onChangeThickness={(thickness) => desktop?.dispatchAction('change-thickness', thickness)}
        onChangeOpacity={(opacity) => desktop?.dispatchAction('change-opacity', opacity)}
        onToggleFavorite={(hex) => desktop?.dispatchAction('toggle-favorite', hex)}
        onDeleteSelected={() => desktop?.dispatchAction('delete-selected')}
        onUndo={(scope) => desktop?.dispatchAction('undo', scope)}
        onRedo={(scope) => desktop?.dispatchAction('redo', scope)}
        onClearScreen={() => desktop?.dispatchAction('clear-screen')}
        onToggleGhostMode={() => desktop?.dispatchAction('toggle-ghost-mode')}
        onTogglePresentationMode={() => desktop?.dispatchAction('toggle-presentation-mode')}
        onToggleTimerEnabled={() => {}}
        onSetTimerDurationMs={() => {}}
        onToggleTimerPaused={() => {}}
        onResetTimer={() => {}}
        onCancelTimer={() => {}}
        onCaptureFull={() => desktop?.dispatchAction('capture-screenshot')}
        onCaptureArea={() => {
          desktop?.dispatchAction('capture-area');
          desktop?.setInteractionMode('drawing');
        }}
        onCopyScreenshot={() => desktop?.dispatchAction('copy-screenshot')}
        onSavePng={() => desktop?.dispatchAction('save-png')}
        onSelectRecordingArea={() => {
          desktop?.dispatchAction('select-recording-area');
          desktop?.setInteractionMode('drawing');
        }}
        onStartRecording={() => desktop?.dispatchAction('start-recording', settings.recording)}
        onPauseRecording={() => desktop?.dispatchAction('pause-recording')}
        onResumeRecording={() => desktop?.dispatchAction('resume-recording')}
        onStopRecording={() => desktop?.dispatchAction('stop-recording')}
        onCancelRecording={() => desktop?.dispatchAction('cancel-recording')}
        onDownloadLatestRecording={() => desktop?.dispatchAction('download-recording', state.latestRecording)}
        onPreviewLatestRecording={() => desktop?.dispatchAction('preview-recording', state.latestRecording)}
        onClearTemporaryRecording={() => desktop?.dispatchAction('clear-recording')}
        onSaveSession={(name) => desktop?.dispatchAction('save-session', name)}
        onRestoreSession={() => {}}
        onDeleteSession={() => {}}
        onExportAnnotations={() => {}}
        onImportAnnotations={() => false}
        onOpenSettings={() => desktop?.openSettingsWindow()}
        interactionMode={state.interactionMode}
        onCloseEye={() => desktop?.setEye(false)}
        onOpenEye={() => desktop?.setEye(true)}
        onToggleEye={() => desktop?.toggleEye()}
        keyboardVisualizerEnabled={keyboardVisualizerEnabled}
        keyboardVisualizerSupported={Boolean(desktop)}
        keyboardVisualizerBusy={keyboardVisualizerBusy}
        keyboardVisualizerError={keyboardVisualizerError}
        onToggleKeyboardVisualizer={toggleKeyboardVisualizer}
        onRestoreToolbar={() => desktop?.setEye(true)}
      />
    </div>
  );
};
