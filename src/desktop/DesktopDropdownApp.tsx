import React, { useEffect, useRef, useState } from 'react';
import { ToolbarPopouts, PopoutId } from '../toolbar/ToolbarPopouts';
import { DesktopSharedState } from './desktopTypes';
import { UserSettings } from '../types/settings';
import { createDefaultSettings, mergeAndValidateSettings } from '../storage/validation';
import { getSupportedRecordingFormats } from '../recorder/screenRecorder';
import { classifyForwardedShortcut } from './interactionLifecycle';

export const DesktopDropdownApp: React.FC = () => {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;

  const [popoutData, setPopoutData] = useState<{
    popoutId: PopoutId | null;
    openSide: 'left' | 'right';
    anchorOffsetY: number;
  }>({
    popoutId: null,
    openSide: 'right',
    anchorOffsetY: 20,
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaults = createDefaultSettings();
    if (typeof window !== 'undefined' && window.proscreenDesktop) {
      defaults.recording.mode = 'screen';
    }
    return defaults;
  });
  const latestTransitionRef = useRef(0);
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
    activeTimerCountdownMs: null,
    isRecording: false,
    recordingStatus: 'idle',
    recordingElapsedMs: 0,
    latestRecording: null,
  });

  useEffect(() => {
    if (!desktop) return;
    void desktop.loadDesktopSettings().then((s) => {
      if (s) {
        setSettings((prev) => {
          const merged = { ...prev, ...s };
          if (merged.recording && merged.recording.mode === 'tab') {
            merged.recording.mode = 'screen';
          }
          return merged;
        });
      }
    });
    void desktop.getState().then((s) => {
      if (s) setState((prev) => ({ ...prev, ...s }));
    });
    const unsubState = desktop.onStateChange((s) => {
      setState((prev) => ({ ...prev, ...s }));
    });
    const unsubSettings = desktop.onSettingsChanged?.((s) => {
      if (!s) return;
      setSettings((prev) => {
        const merged = mergeAndValidateSettings({ ...prev, ...s });
        if (merged.recording && merged.recording.mode === 'tab') {
          merged.recording.mode = 'screen';
        }
        return merged;
      });
    });
    const unsubPopout = desktop.onPopoutData?.((data) => {
      if (typeof data.transitionId === 'number') {
        if (data.transitionId < latestTransitionRef.current) {
          return;
        }
        latestTransitionRef.current = data.transitionId;
      }
      setPopoutData({
        popoutId: data.popoutId as PopoutId | null,
        openSide: data.openSide,
        anchorOffsetY: data.anchorOffsetY ?? 20,
      });
    });
    return () => {
      unsubState();
      unsubSettings?.();
      unsubPopout?.();
    };
  }, [desktop]);

  // Global Escape + forwarded editing shortcuts while popout holds OS focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        desktop?.closePopout?.();
        return;
      }
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
        desktop?.dispatchAction(forwarded.action, forwarded.payload);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [desktop]);

  if (!popoutData.popoutId) {
    return null;
  }

  const handleClose = () => {
    desktop?.closePopout?.();
  };

  const handleUpdateSettings = (updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      desktop?.saveDesktopSettings(next);
      desktop?.dispatchAction('update-settings', next);
      return next;
    });
  };

  return (
    <div
      key={popoutData.popoutId}
      id="desktop-dropdown-root"
      className="w-full h-full relative font-sans select-none overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        backgroundColor: 'transparent',
        animation: 'proscreenDropdownFade 130ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <style>{`
        @keyframes proscreenDropdownFade {
          0% {
            opacity: 0;
            transform: scale(0.97) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
      <ToolbarPopouts
        activePopout={popoutData.popoutId}
        popoutPosition={{
          top: 6,
          left: popoutData.openSide === 'right' ? 6 : undefined,
          right: popoutData.openSide === 'left' ? 6 : undefined,
          openSide: popoutData.openSide,
          anchorOffsetY: popoutData.anchorOffsetY,
        }}
        activeTool={state.activeTool}
        boardMode={state.boardMode}
        boardPageIndex={state.activePageIndex}
        boardPageCount={state.boardPageCount}
        hasBoardBackground={false}
        settings={settings}
        resolvedTheme={state.resolvedTheme}
        activeBrush={{
          color: state.activeColor,
          thickness: state.activeThickness,
          opacity: state.activeOpacity,
        }}
        hasSelectedObject={Boolean(state.selectedItemId)}
        ghostMode={state.ghostMode}
        presentationMode={state.presentationMode}
        activeTimerCountdownMs={state.activeTimerCountdownMs}
        recordingStatus={state.recordingStatus || (state.isRecording ? 'recording' : 'idle')}
        recordingElapsedMs={state.recordingElapsedMs || 0}
        latestRecording={state.latestRecording || null}
        recordingSupported={true}
        supportedRecordingFormats={getSupportedRecordingFormats()}
        canUndoStroke={state.canUndo}
        canRedoStroke={state.canRedo}
        canUndoShape={state.canUndo}
        canRedoShape={state.canRedo}
        annotationCount={state.historyCount}
        savedSessions={[]}
        onMouseEnterPopout={() => {}}
        onMouseLeavePopout={() => {}}
        onClose={handleClose}
        onSelectTool={(tool) => {
          desktop?.dispatchAction('select-tool', tool);
          if (tool === 'pointer' || tool === 'cursor') {
            desktop?.setInteractionMode('pointer');
          } else {
            desktop?.setInteractionMode('drawing');
          }
          handleClose();
        }}
        onSwitchBoard={(mode) => desktop?.dispatchAction('switch-board', mode)}
        onPrevBoardPage={() => desktop?.dispatchAction('prev-board-page')}
        onNextBoardPage={() => desktop?.dispatchAction('next-board-page')}
        onAddBoardPage={() => desktop?.dispatchAction('add-board-page')}
        onClearBoard={() => desktop?.dispatchAction('clear-board')}
        onSaveBoard={() => desktop?.dispatchAction('save-board')}
        onExportBoardPng={() => desktop?.dispatchAction('export-board-png')}
        onImportBoardBackground={(dataUrl) => desktop?.dispatchAction('import-board-background', dataUrl)}
        onClearBoardBackground={() => desktop?.dispatchAction('clear-board-background')}
        onUpdateSettings={handleUpdateSettings}
        onChangeColor={(hex) => desktop?.dispatchAction('change-color', hex)}
        onChangeThickness={(thickness) => desktop?.dispatchAction('change-thickness', thickness)}
        onChangeOpacity={(opacity) => desktop?.dispatchAction('change-opacity', opacity)}
        onToggleFavorite={(hex) => desktop?.dispatchAction('toggle-favorite', hex)}
        onDeleteSelected={() => desktop?.dispatchAction('delete-selected')}
        onClearScreen={() => desktop?.dispatchAction('clear-screen')}
        onUndo={(scope) => desktop?.dispatchAction('undo', scope)}
        onRedo={(scope) => desktop?.dispatchAction('redo', scope)}
        onToggleGhostMode={() => desktop?.dispatchAction('toggle-ghost-mode')}
        onTogglePresentationMode={() => desktop?.dispatchAction('toggle-presentation-mode')}
        onToggleTimerEnabled={() => desktop?.dispatchAction('toggle-timer-enabled')}
        onSetTimerDurationMs={(ms) => desktop?.dispatchAction('set-timer-duration', ms)}
        onToggleTimerPaused={() => desktop?.dispatchAction('toggle-timer-paused')}
        onResetTimer={() => desktop?.dispatchAction('reset-timer')}
        onCancelTimer={() => desktop?.dispatchAction('cancel-timer')}
        onCaptureFull={() => {
          desktop?.dispatchAction('capture-screenshot');
          handleClose();
        }}
        onCaptureArea={() => {
          desktop?.dispatchAction('capture-area');
          desktop?.setInteractionMode('drawing');
          handleClose();
        }}
        onCopyScreenshot={() => desktop?.dispatchAction('copy-screenshot')}
        onSavePng={() => desktop?.dispatchAction('save-png')}
        onSelectRecordingArea={() => {
          desktop?.dispatchAction('select-recording-area');
          desktop?.setInteractionMode('drawing');
          handleClose();
        }}
        onStartRecording={() => {
          desktop?.dispatchAction('start-recording', settings.recording);
          handleClose();
        }}
        onPauseRecording={() => desktop?.dispatchAction('pause-recording')}
        onResumeRecording={() => desktop?.dispatchAction('resume-recording')}
        onStopRecording={() => desktop?.dispatchAction('stop-recording')}
        onCancelRecording={() => {
          desktop?.dispatchAction('cancel-recording');
          handleClose();
        }}
        onDownloadLatestRecording={() => desktop?.dispatchAction('download-recording')}
        onPreviewLatestRecording={() => {
          desktop?.dispatchAction('preview-recording');
          handleClose();
        }}
        onClearTemporaryRecording={() => desktop?.dispatchAction('clear-recording')}
        onSaveSession={() => {}}
        onRestoreSession={() => {}}
        onDeleteSession={() => {}}
        onExportAnnotations={() => {}}
        onImportAnnotations={() => {}}
        onOpenFullSettings={() => {
          desktop?.openSettingsWindow();
          handleClose();
        }}
      />
    </div>
  );
};
