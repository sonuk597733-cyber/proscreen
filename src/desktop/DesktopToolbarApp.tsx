import React, { useEffect, useState } from 'react';
import { FloatingToolbar } from '../toolbar/FloatingToolbar';
import { FloatingEyeRestoreButton } from '../components/FloatingEyeRestoreButton';
import { FirstLaunchOnboardingModal } from '../components/FirstLaunchOnboardingModal';
import { PopoutId } from '../toolbar/ToolbarPopouts';
import { DesktopSharedState } from './desktopTypes';
import { createDefaultSettings } from '../storage/validation';
import { UserSettings } from '../types/settings';
import { ToolType } from '../types/annotation';
import { getSupportedRecordingFormats } from '../recorder/screenRecorder';

export const DesktopToolbarApp: React.FC = () => {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;

  const [activePopout, setActivePopout] = useState<PopoutId | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => createDefaultSettings());
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
  });

  // Load persistent desktop settings on mount
  useEffect(() => {
    if (!desktop) return;
    void desktop.loadDesktopSettings().then((loaded) => {
      if (loaded) {
        setSettings(loaded);
        if (loaded.hasSeenOnboarding === false) {
          setShowOnboarding(true);
        }
      } else {
        setShowOnboarding(true);
      }
    });
  }, [desktop]);

  const handleCloseOnboarding = (dontShowAgain: boolean) => {
    setShowOnboarding(false);
    if (dontShowAgain) {
      setSettings((prev) => {
        const next = { ...prev, hasSeenOnboarding: true };
        desktop?.saveDesktopSettings(next);
        return next;
      });
    }
  };

  // Synchronize live state from Main process / Overlay
  useEffect(() => {
    if (!desktop) return;
    const unsub = desktop.onStateChange((next) => {
      setState(next);
    });
    void desktop.getState().then(setState);
    return unsub;
  }, [desktop]);

  const handleUpdateSettings = (updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      if (
        next.toolbarPosition.x !== prev.toolbarPosition.x ||
        next.toolbarPosition.y !== prev.toolbarPosition.y
      ) {
        desktop?.moveToolbar(next.toolbarPosition.x, next.toolbarPosition.y);
        desktop?.saveToolbarPosition(next.toolbarPosition.x, next.toolbarPosition.y);
      }
      desktop?.saveDesktopSettings(next);
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
          position={settings.restoreButtonPosition}
          onPositionChange={(pos) => {
            setSettings((prev) => {
              const next = { ...prev, restoreButtonPosition: pos };
              desktop?.saveDesktopSettings(next);
              return next;
            });
            desktop?.saveRestoreButtonPosition(pos.x, pos.y);
          }}
          onDesktopMove={(x, y) => {
            desktop?.moveToolbar(x, y);
          }}
          onRestore={() => desktop?.setEye(true)}
          edgeSnapping={settings.edgeSnapping}
          isDesktopToolbarWindow={true}
        />
      </div>
    );
  }

  if (!state.toolbarVisible) {
    return null;
  }

  return (
    <div
      id="desktop-toolbar-root"
      className="p-1 select-none font-sans"
      style={{
        backgroundColor: 'transparent',
      }}
    >
      <FloatingToolbar
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
        recordingStatus={state.isRecording ? 'recording' : 'idle'}
        recordingElapsedMs={0}
        latestRecording={null}
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
        onSetActivePopout={setActivePopout}
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
        onStartRecording={() => desktop?.dispatchAction('toggle-recording')}
        onPauseRecording={() => {}}
        onResumeRecording={() => {}}
        onStopRecording={() => desktop?.dispatchAction('toggle-recording')}
        onCancelRecording={() => {}}
        onDownloadLatestRecording={() => {}}
        onPreviewLatestRecording={() => {}}
        onClearTemporaryRecording={() => {}}
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
        onRestoreToolbar={() => desktop?.setEye(true)}
      />

      <FirstLaunchOnboardingModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
      />
    </div>
  );
};
