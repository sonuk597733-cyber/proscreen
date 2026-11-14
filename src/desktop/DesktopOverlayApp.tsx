import React, { useEffect, useRef } from 'react';
import { BoardBackdrop } from '../whiteboard/BoardBackdrop';
import { AnnotationCanvas } from '../canvas/AnnotationCanvas';
import { TextInputOverlay } from '../toolbar/TextInputOverlay';
import { useProScreenEngine } from '../hooks/useProScreenEngine';
import { isDrawingTool, ToolType } from '../types/annotation';
import { ScreenshotModal } from '../screenshot/ScreenshotModal';
import { RecordingPreviewModal } from '../recorder/RecordingPreviewModal';
import { AreaSelector } from '../components/AreaSelector';

export const DesktopOverlayApp: React.FC = () => {
  const engine = useProScreenEngine('desktop:global');
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;
  const lastInteractionModeRef = useRef<'pointer' | 'drawing'>('pointer');

  // Multi-monitor virtual bounds sync
  useEffect(() => {
    if (!desktop) return;
    const unsub = desktop.onDisplaysChanged((bounds) => {
      console.log('Displays changed:', bounds);
    });
    return unsub;
  }, [desktop]);

  // Synchronize interaction mode with Electron click-through pass-through
  useEffect(() => {
    if (!desktop) return;

    const isDrawingOrCapturing =
      engine.toolbarVisible &&
      ((engine.activeTool !== 'pointer' && engine.activeTool !== 'cursor') ||
        engine.selectingArea ||
        Boolean(engine.screenshotResult) ||
        engine.recordingPreviewOpen);

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
    engine.selectingArea,
    engine.screenshotResult,
    engine.recordingPreviewOpen,
  ]);

  // Broadcast state changes to the Floating Toolbar window & System Tray
  useEffect(() => {
    if (!desktop) return;
    desktop.syncState({
      activeTool: engine.activeTool,
      interactionMode: engine.interactionMode,
      toolbarVisible: engine.toolbarVisible,
      restoreButtonVisible: engine.restoreButtonVisible,
      annotationsVisible: engine.annotationsVisible,
      toolbarPosition: engine.settings.toolbarPosition,
      restoreButtonPosition: engine.settings.restoreButtonPosition,
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
    });
  }, [
    desktop,
    engine.activeTool,
    engine.interactionMode,
    engine.toolbarVisible,
    engine.restoreButtonVisible,
    engine.annotationsVisible,
    engine.settings.toolbarPosition,
    engine.settings.restoreButtonPosition,
    engine.boardMode,
    engine.resolvedTheme,
    engine.ghostMode,
    engine.presentationMode,
    engine.history.items.length,
    engine.canUndoAll,
    engine.canRedoAll,
    engine.activeBrush,
    engine.selectedItemId,
    engine.activePageIndex,
    engine.boardPages.length,
    engine.recordingStatus,
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
        case 'copy-screenshot':
          void engine.quickCopyScreenshot();
          break;
        case 'save-png':
          void engine.quickExportPng();
          break;
        case 'toggle-recording':
          void engine.toggleScreenRecording();
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
    engine.toolbarVisible &&
    ((engine.activeTool !== 'pointer' && engine.activeTool !== 'cursor') ||
      engine.selectingArea ||
      Boolean(engine.screenshotResult) ||
      engine.recordingPreviewOpen);

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
        onCanvasInteract={() => {}}
        onBegin={engine.beginStrokeOrShape}
        onMove={engine.moveStrokeOrShape}
        onEnd={engine.endStrokeOrShape}
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
          onClose={() => engine.setRecordingPreviewOpen(false)}
          onDiscard={() => engine.setRecordingPreviewOpen(false)}
          onDownload={() => {
            if (desktop && engine.latestRecording?.blobUrl) {
              void desktop.saveCaptureFile(
                engine.latestRecording.blobUrl,
                engine.latestRecording.filename
              );
            }
          }}
        />
      )}
    </div>
  );
};
