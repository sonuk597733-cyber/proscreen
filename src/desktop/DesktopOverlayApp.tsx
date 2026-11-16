import React, { useEffect, useRef, useState } from 'react';
import { BoardBackdrop } from '../whiteboard/BoardBackdrop';
import { AnnotationCanvas } from '../canvas/AnnotationCanvas';
import { TextInputOverlay } from '../toolbar/TextInputOverlay';
import { useProScreenEngine } from '../hooks/useProScreenEngine';
import { isDrawingTool, ToolType } from '../types/annotation';
import { ScreenshotModal } from '../screenshot/ScreenshotModal';
import { RecordingPreviewModal } from '../recorder/RecordingPreviewModal';
import { AreaSelector } from '../components/AreaSelector';
import { UserSettings } from '../types/settings';
import { mergeAndValidateSettings } from '../storage/validation';

export const DesktopOverlayApp: React.FC = () => {
  const engine = useProScreenEngine('desktop:global');
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;
  const lastInteractionModeRef = useRef<'pointer' | 'drawing'>('pointer');
  const [liveToolbarPos, setLiveToolbarPos] = useState<{ x: number; y: number }>({ x: 16, y: 76 });
  const [liveToolbarVisible, setLiveToolbarVisible] = useState<boolean>(true);

  // Multi-monitor virtual bounds sync & live toolbar position tracking
  useEffect(() => {
    if (!desktop) return;
    const unsub = desktop.onDisplaysChanged((bounds) => {
      console.log('Displays changed:', bounds);
    });
    const unsubState = desktop.onStateChange((next) => {
      if (next.toolbarPosition) {
        setLiveToolbarPos(next.toolbarPosition);
      }
      if (typeof next.toolbarVisible === 'boolean') {
        setLiveToolbarVisible(next.toolbarVisible);
      }
    });
    void desktop.getState().then((s) => {
      if (s.toolbarPosition) setLiveToolbarPos(s.toolbarPosition);
      if (typeof s.toolbarVisible === 'boolean') setLiveToolbarVisible(s.toolbarVisible);
    });
    return () => {
      unsub();
      unsubState();
    };
  }, [desktop]);

  // Authoritative cross-window annotation hydration and restoration on Eye ON
  const isHydratedRef = useRef(false);
  useEffect(() => {
    if (!desktop?.getDesktopAnnotations) {
      isHydratedRef.current = true;
      return;
    }
    void desktop.getDesktopAnnotations().then((items) => {
      if (Array.isArray(items) && items.length > 0 && engine.history.items.length === 0) {
        engine.restoreAnnotations(items);
      }
      isHydratedRef.current = true;
    });
  }, [desktop, engine]);

  // Synchronize settings from main process across windows
  useEffect(() => {
    if (!desktop) return;
    void desktop.loadDesktopSettings().then((s) => {
      if (s) {
        engine.setSettings(mergeAndValidateSettings(s));
      }
    });
    if (desktop.onSettingsChanged) {
      const unsub = desktop.onSettingsChanged((s) => {
        if (s) {
          engine.setSettings(mergeAndValidateSettings(s));
        }
      });
      return unsub;
    }
  }, [desktop, engine]);

  useEffect(() => {
    if (!desktop?.onRestoreAnnotations) return;
    const unsub = desktop.onRestoreAnnotations((items) => {
      if (Array.isArray(items) && items.length > 0) {
        engine.restoreAnnotations(items);
      }
    });
    return unsub;
  }, [desktop, engine]);

  useEffect(() => {
    if (!desktop?.saveDesktopAnnotations || !isHydratedRef.current) return;
    desktop.saveDesktopAnnotations(engine.history.items);
  }, [desktop, engine.history.items]);

  // Synchronize interaction mode with Electron click-through pass-through
  useEffect(() => {
    if (!desktop) return;

    const hasActiveModal =
      engine.recordingPreviewOpen ||
      Boolean(engine.screenshotResult) ||
      engine.selectingArea ||
      engine.selectingRecordingArea;

    const isDrawingOrCapturing =
      hasActiveModal ||
      (engine.toolbarVisible &&
        engine.annotationsVisible &&
        engine.activeTool !== 'pointer' &&
        engine.activeTool !== 'cursor');

    const currentMode = isDrawingOrCapturing ? 'drawing' : 'pointer';

    if (currentMode !== lastInteractionModeRef.current) {
      lastInteractionModeRef.current = currentMode;
      desktop.setInteractionMode(currentMode);
      desktop.setOverlayIgnoreMouse(currentMode === 'pointer');
    }
  }, [
    desktop,
    engine.activeTool,
    engine.toolbarVisible,
    engine.annotationsVisible,
    engine.selectingArea,
    engine.selectingRecordingArea,
    engine.screenshotResult,
    engine.recordingPreviewOpen,
  ]);

  const lastSyncedStateRef = useRef<string>('');

  // Broadcast state changes to the Floating Toolbar window & System Tray only when values actually change
  useEffect(() => {
    if (!desktop) return;
    const payload = {
      activeTool: engine.activeTool,
      interactionMode: engine.interactionMode,
      toolbarVisible: engine.toolbarVisible,
      restoreButtonVisible: engine.restoreButtonVisible,
      annotationsVisible: engine.annotationsVisible,
      boardMode: engine.boardMode,
      resolvedTheme: engine.resolvedTheme,
      ghostMode: engine.ghostMode,
      presentationMode: engine.presentationMode,
      historyCount: engine.history.items.length,
      canUndo: engine.canUndoAll,
      canRedo: engine.canRedoAll,
      activeColor: engine.activeBrush.color,
      activeThickness: engine.activeBrush.thickness,
      activeOpacity: engine.activeBrush.opacity,
      selectedItemId: engine.selectedItemId,
      activePageIndex: engine.activePageIndex,
      boardPageCount: engine.boardPages.length,
      isRecording: engine.recordingStatus !== 'idle',
      recordingStatus: engine.recordingStatus,
      recordingElapsedMs: engine.recordingElapsedMs,
      latestRecording: engine.latestRecording,
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSyncedStateRef.current) {
      return; // Skip redundant IPC message and render cycle
    }
    lastSyncedStateRef.current = serialized;
    desktop.syncState(payload);
  }, [
    desktop,
    engine.activeTool,
    engine.interactionMode,
    engine.toolbarVisible,
    engine.restoreButtonVisible,
    engine.annotationsVisible,
    engine.boardMode,
    engine.resolvedTheme,
    engine.ghostMode,
    engine.presentationMode,
    engine.history.items.length,
    engine.canUndoAll,
    engine.canRedoAll,
    engine.activeBrush.color,
    engine.activeBrush.thickness,
    engine.activeBrush.opacity,
    engine.selectedItemId,
    engine.activePageIndex,
    engine.boardPages.length,
    engine.recordingStatus,
    engine.recordingElapsedMs,
    engine.latestRecording,
  ]);

  // Listen to incoming commands dispatched from the Floating Toolbar or Global Shortcuts
  useEffect(() => {
    if (!desktop) return;

    const unsub = desktop.onAction((action, payload) => {
      switch (action) {
        case 'select-tool':
          engine.setActiveTool(payload as ToolType);
          break;
        case 'switch-board':
          engine.switchBoardMode(payload as 'webpage' | 'whiteboard' | 'blackboard');
          break;
        case 'prev-board-page':
          engine.selectBoardPage(engine.activePageIndex - 1);
          break;
        case 'next-board-page':
          engine.selectBoardPage(engine.activePageIndex + 1);
          break;
        case 'add-board-page':
          engine.addBoardPage();
          break;
        case 'clear-board':
          engine.clearScreen(false);
          break;
        case 'export-board-png':
          void engine.quickExportPng();
          break;
        case 'import-board-background':
          engine.setBoardBackgroundImage(payload as string);
          break;
        case 'clear-board-background':
          engine.setBoardBackgroundImage(undefined);
          break;
        case 'change-color':
          engine.setActiveColor(payload as string);
          break;
        case 'change-thickness':
          engine.setActiveThickness(payload as number);
          break;
        case 'change-opacity':
          engine.setActiveOpacity(payload as number);
          break;
        case 'toggle-favorite':
          engine.toggleFavorite(payload as string);
          break;
        case 'delete-selected':
          engine.deleteSelectedObject();
          break;
        case 'undo':
          engine.undo();
          break;
        case 'redo':
          engine.redo();
          break;
        case 'clear-screen':
          engine.clearScreen(true);
          break;
        case 'toggle-ghost-mode':
          engine.toggleGhostMode();
          break;
        case 'toggle-presentation-mode':
          engine.togglePresentationMode();
          break;
        case 'capture-screenshot':
          void engine.triggerCapture(null);
          break;
        case 'capture-area':
          engine.setSelectingArea(true);
          break;
        case 'select-recording-area':
          engine.setSelectingRecordingArea(true);
          desktop.setInteractionMode('drawing');
          desktop.setOverlayIgnoreMouse(false);
          break;
        case 'copy-screenshot':
          void engine.quickCopyScreenshot();
          break;
        case 'save-png':
          void engine.quickExportPng();
          break;
        case 'update-settings':
          if (payload) {
            engine.updateSettings((prev) => mergeAndValidateSettings({ ...prev, ...(payload as object) }));
          }
          break;
        case 'toggle-recording':
          void engine.toggleScreenRecording();
          break;
        case 'start-recording':
          void engine.startRecording(payload as any);
          break;
        case 'pause-recording':
          engine.pauseRecording();
          break;
        case 'resume-recording':
          engine.resumeRecording();
          break;
        case 'stop-recording':
          engine.stopRecording();
          break;
        case 'cancel-recording':
          engine.cancelRecording();
          break;
        case 'cancel-recording-area':
          engine.cancelRecordingArea();
          break;
        case 'preview-recording':
          if (payload) {
            engine.setLatestRecording(payload as any);
          }
          engine.setRecordingPreviewOpen(true);
          desktop.setInteractionMode('drawing');
          desktop.setOverlayIgnoreMouse(false);
          break;
        case 'download-recording':
          void engine.downloadLatestRecording();
          break;
        case 'clear-recording':
          engine.clearTemporaryRecording();
          break;
        case 'save-session':
          void engine.saveCurrentSession(payload as string | undefined);
          break;
        case 'open-eye':
          engine.openEye();
          break;
        case 'close-eye':
          engine.closeEye();
          break;
        case 'toggle-eye':
          engine.toggleEye();
          break;
      }
    });

    return unsub;
  }, [desktop, engine]);

  // Eye OFF: The floating toolbar window is hidden, but the canvas overlay remains visible
  // so existing annotations and drawings remain on screen in pass-through mode without intercepting clicks.
  const isDark = engine.resolvedTheme === 'dark';
  const isInteractive =
    engine.recordingPreviewOpen ||
    Boolean(engine.screenshotResult) ||
    engine.selectingArea ||
    engine.selectingRecordingArea ||
    (engine.toolbarVisible &&
      engine.annotationsVisible &&
      engine.activeTool !== 'pointer' &&
      engine.activeTool !== 'cursor');

  return (
    <div
      id="desktop-overlay-container"
      data-active-tool={engine.activeTool}
      data-interaction-mode={engine.interactionMode}
      data-toolbar-visible={engine.toolbarVisible ? 'true' : 'false'}
      data-selecting-area={engine.selectingArea ? 'true' : 'false'}
      className="fixed inset-0 w-screen h-screen overflow-hidden select-none font-sans"
      style={{
        pointerEvents: isInteractive ? 'auto' : 'none',
        backgroundColor: 'transparent',
      }}
    >
      <BoardBackdrop
        mode={engine.boardMode}
        showGrid={engine.settings.whiteboardGrid}
        pageIndex={engine.activePageIndex}
        pageCount={engine.boardPages.length}
        backgroundImageDataUrl={engine.currentBackgroundImage}
        onPrevPage={() => engine.selectBoardPage(engine.activePageIndex - 1)}
        onNextPage={() => engine.selectBoardPage(engine.activePageIndex + 1)}
        onAddPage={engine.addBoardPage}
        onClearBoard={() => engine.clearScreen(false)}
        onExportBoardPng={() => void engine.quickExportPng()}
        onReturnToWebpage={() => engine.switchBoardMode('webpage')}
      />

      <AnnotationCanvas
        activeTool={engine.activeTool}
        toolbarVisible={engine.toolbarVisible}
        annotationsVisible={engine.annotationsVisible}
        interactionMode={engine.interactionMode}
        boardMode={engine.boardMode}
        items={engine.history.items}
        settings={engine.settings}
        selectedItemId={engine.selectedItemId}
        draftItemRef={engine.draftItemRef}
        laserTrailRef={engine.laserTrailRef}
        pointerPosRef={engine.pointerPosRef}
        onCanvasInteract={() => {
          desktop?.moveToolbarTop();
        }}
        onBegin={engine.beginStrokeOrShape}
        onMove={engine.moveStrokeOrShape}
        onEnd={() => {
          engine.endStrokeOrShape();
          desktop?.moveToolbarTop();
        }}
        onTextClick={engine.createTextAt}
      />

      <TextInputOverlay
        items={engine.textItems}
        visible={engine.annotationsVisible && engine.settings.creator.annotationsVisible}
        editingId={engine.editingTextId}
        selectedId={engine.selectedTextId}
        activeTool={engine.activeTool}
        onSelect={(id) => {
          engine.setSelectedTextId(id);
          engine.setSelectedItemId(id);
        }}
        onStartEdit={engine.setEditingTextId}
        onFinishEdit={() => engine.setEditingTextId(null)}
        onUpdate={engine.updateTextItem}
        onDelete={engine.deleteItemById}
      />

      <AreaSelector
        active={engine.selectingArea}
        onSelect={(crop) => {
          engine.setSelectingArea(false);
          void engine.triggerCapture(crop);
        }}
        onCancel={() => engine.setSelectingArea(false)}
      />

      <AreaSelector
        active={engine.selectingRecordingArea}
        title="Select Screen Area to Record"
        confirmLabel="Record Area"
        initialRect={engine.settings.recording.areaRect}
        onSelect={(crop) => {
          void engine.confirmRecordingArea(crop);
        }}
        onCancel={() => {
          engine.cancelRecordingArea();
          desktop?.dispatchAction('cancel-recording-area');
        }}
      />

      {engine.screenshotResult && (
        <ScreenshotModal
          result={engine.screenshotResult}
          theme={engine.resolvedTheme}
          onClear={() => engine.setScreenshotResult(null)}
        />
      )}

      {engine.recordingPreviewOpen && engine.latestRecording && (
        <RecordingPreviewModal
          artifact={engine.latestRecording}
          open={engine.recordingPreviewOpen}
          theme={engine.resolvedTheme}
          onClose={() => {
            engine.setRecordingPreviewOpen(false);
            desktop?.dispatchAction('close-preview');
            desktop?.setInteractionMode('pointer');
            desktop?.setOverlayIgnoreMouse(true);
          }}
          onDiscard={() => {
            engine.clearTemporaryRecording();
            desktop?.dispatchAction('clear-recording');
            desktop?.dispatchAction('close-preview');
            desktop?.setInteractionMode('pointer');
            desktop?.setOverlayIgnoreMouse(true);
          }}
          onDownload={(saveAs) => void engine.downloadLatestRecording(saveAs ?? true)}
        />
      )}
    </div>
  );
};
