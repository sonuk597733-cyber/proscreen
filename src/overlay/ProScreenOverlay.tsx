import React, { useState } from 'react';
import { Pause, Play, Square, X } from 'lucide-react';
import { BoardBackdrop } from '../whiteboard/BoardBackdrop';
import { AnnotationCanvas } from '../canvas/AnnotationCanvas';
import { TextInputOverlay } from '../toolbar/TextInputOverlay';
import { FloatingToolbar } from '../toolbar/FloatingToolbar';
import { FloatingEyeRestoreButton } from '../components/FloatingEyeRestoreButton';
import { PopoutId } from '../toolbar/ToolbarPopouts';
import { AreaSelector } from '../components/AreaSelector';
import { ScreenshotModal } from '../screenshot/ScreenshotModal';
import { SettingsDashboard } from '../settings/SettingsDashboard';
import { useProScreenEngine } from '../hooks/useProScreenEngine';
import { formatRecordingDuration } from '../recorder/screenRecorder';
import { RecordingPreviewModal } from '../recorder/RecordingPreviewModal';

interface ProScreenOverlayProps {
  engine: ReturnType<typeof useProScreenEngine>;
}

export const ProScreenOverlay: React.FC<ProScreenOverlayProps> = ({ engine }) => {
  const [activePopout, setActivePopout] = useState<PopoutId | null>(null);
  const isDark = engine.resolvedTheme === 'dark';

  // Eye OFF / ON: Epic Pen Style.
  // Eye OFF hides toolbar and temporarily hides annotation layers without deleting any data or history.
  // Eye ON restores toolbar and previous annotations exactly.
  return (
    <div
      data-testid="proscreen-overlay-root"
      data-toolbar-visible={engine.toolbarVisible}
      data-annotations-visible={engine.annotationsVisible}
      data-active-tool={engine.activeTool}
      data-interaction-mode={engine.interactionMode}
      className="font-sans pointer-events-none"
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
        onCanvasInteract={() => setActivePopout(null)}
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

      {engine.toolbarVisible && (
        <FloatingToolbar
        activeTool={engine.activeTool}
        boardMode={engine.boardMode}
        boardPageIndex={engine.activePageIndex}
        boardPageCount={engine.boardPages.length}
        hasBoardBackground={Boolean(engine.currentBackgroundImage)}
        settings={engine.settings}
        resolvedTheme={engine.resolvedTheme}
        toolbarVisible={engine.toolbarVisible}
        ghostMode={engine.ghostMode}
        presentationMode={engine.presentationMode}
        isCapturing={engine.isCapturing}
        activeTimerCountdownMs={engine.activeTimerCountdownMs}
        recordingStatus={engine.recordingStatus}
        recordingElapsedMs={engine.recordingElapsedMs}
        latestRecording={engine.latestRecording}
        recordingSupported={engine.recordingSupported}
        supportedRecordingFormats={engine.supportedRecordingFormats}
        canUndoAll={engine.canUndoAll}
        canRedoAll={engine.canRedoAll}
        canUndoStroke={engine.canUndoStroke}
        canRedoStroke={engine.canRedoStroke}
        canUndoShape={engine.canUndoShape}
        canRedoShape={engine.canRedoShape}
        annotationCount={engine.history.items.length}
        hasSelectedObject={Boolean(engine.selectedItemId || engine.selectedTextId)}
        activeBrush={engine.activeBrush}
        savedSessions={engine.savedSessions}
        activePopout={activePopout}
        onSetActivePopout={setActivePopout}
        onSelectTool={(t) => engine.setActiveTool(t)}
        onSwitchBoard={engine.switchBoardMode}
        onPrevBoardPage={() => engine.selectBoardPage(engine.activePageIndex - 1)}
        onNextBoardPage={() => engine.selectBoardPage(engine.activePageIndex + 1)}
        onAddBoardPage={engine.addBoardPage}
        onClearBoard={() => engine.clearScreen(false)}
        onSaveBoard={() =>
          void engine.saveCurrentSession(`Board Page ${engine.activePageIndex + 1}`)
        }
        onExportBoardPng={() => void engine.quickExportPng()}
        onImportBoardBackground={(dataUrl) => engine.setBoardBackgroundImage(dataUrl)}
        onClearBoardBackground={() => engine.setBoardBackgroundImage(undefined)}
        onUpdateSettings={engine.updateSettings}
        onChangeColor={engine.setActiveColor}
        onChangeThickness={engine.setActiveThickness}
        onChangeOpacity={engine.setActiveOpacity}
        onToggleFavorite={engine.toggleFavorite}
        onDeleteSelected={engine.deleteSelectedObject}
        onUndo={engine.undo}
        onRedo={engine.redo}
        onClearScreen={() => engine.clearScreen(false)}
        onToggleGhostMode={engine.toggleGhostMode}
        onTogglePresentationMode={engine.togglePresentationMode}
        onToggleTimerEnabled={engine.toggleTimerEnabled}
        onSetTimerDurationMs={engine.setTimerDurationMs}
        onToggleTimerPaused={engine.toggleTimerPaused}
        onResetTimer={engine.resetTimer}
        onCancelTimer={engine.cancelTimer}
        onCaptureFull={() => void engine.triggerCapture(null)}
        onCaptureArea={() => engine.setSelectingArea(true)}
        onCopyScreenshot={() => void engine.quickCopyScreenshot()}
        onSavePng={() => void engine.quickExportPng()}
        onSelectRecordingArea={() => engine.setSelectingRecordingArea(true)}
        onStartRecording={() => void engine.startRecording()}
        onPauseRecording={() => void engine.pauseRecording()}
        onResumeRecording={() => void engine.resumeRecording()}
        onStopRecording={() => void engine.stopRecording()}
        onCancelRecording={() => void engine.cancelRecording()}
        onDownloadLatestRecording={engine.downloadLatestRecording}
        onPreviewLatestRecording={() => engine.setRecordingPreviewOpen(true)}
        onClearTemporaryRecording={engine.clearTemporaryRecording}
        onSaveSession={(name) => void engine.saveCurrentSession(name)}
        onRestoreSession={engine.restoreSession}
        onDeleteSession={(id) => void engine.removeSavedSession(id)}
        onExportAnnotations={engine.exportAnnotationsJson}
        onImportAnnotations={engine.importAnnotationsJson}
        onOpenSettings={() => engine.setSettingsOpen(true)}
        interactionMode={engine.interactionMode}
        onCloseEye={engine.closeEye}
        onOpenEye={engine.openEye}
        onToggleEye={engine.toggleEye}
        onRestoreToolbar={engine.openEye}
      />
      )}

      {engine.restoreButtonVisible && (
        <FloatingEyeRestoreButton
          position={engine.settings.restoreButtonPosition}
          onPositionChange={(pos) =>
            engine.updateSettings((p) => ({ ...p, restoreButtonPosition: pos }))
          }
          onRestore={engine.openEye}
          edgeSnapping={engine.settings.edgeSnapping}
        />
      )}

      {engine.recordingStatus !== 'idle' && !engine.isCapturing && (
        <div
          data-testid="recording-status-bar"
          role="region"
          aria-label="Screen recording controls"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[2147483643] flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-medium ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
              : 'bg-white/95 border-slate-300/80 text-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5 pr-1">
            <span
              className={`w-2 h-2 rounded-full ${
                engine.recordingStatus === 'recording'
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="font-mono tabular-nums font-semibold">
              {formatRecordingDuration(engine.recordingElapsedMs)}
            </span>
            <span className="text-[11px] opacity-75">
              {engine.recordingStatus === 'paused'
                ? 'Paused'
                : engine.recordingStatus === 'stopping'
                ? 'Saving...'
                : 'REC'}
            </span>
          </span>

          {engine.recordingStatus === 'recording' && (
            <button
              type="button"
              data-testid="recording-bar-pause"
              onClick={() => void engine.pauseRecording()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 cursor-pointer"
              title="Pause Recording"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {engine.recordingStatus === 'paused' && (
            <button
              type="button"
              data-testid="recording-bar-resume"
              onClick={() => void engine.resumeRecording()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
              title="Resume Recording"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          <button
            type="button"
            data-testid="recording-bar-stop"
            disabled={engine.recordingStatus === 'stopping'}
            onClick={() => void engine.stopRecording()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
            title="Stop & Save Recording"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>{engine.recordingStatus === 'stopping' ? 'Saving...' : 'Stop'}</span>
          </button>

          <button
            type="button"
            data-testid="recording-bar-cancel"
            disabled={engine.recordingStatus === 'stopping'}
            onClick={() => void engine.cancelRecording()}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-500/15 disabled:opacity-40 cursor-pointer"
            title="Cancel & Discard Recording"
            aria-label="Cancel Recording"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {engine.clearConfirmOpen && (
        <div
          data-testid="clear-confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm clear annotations"
          className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
        >
          <div
            className={`w-full max-w-sm rounded-xl border p-5 shadow-2xl space-y-4 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div>
              <h3 className="text-sm font-semibold">Clear all screen annotations?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This will remove {engine.history.items.length} annotation item(s) from the active
                page. You can still restore them with Undo (Ctrl+Z).
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={engine.cancelClearScreen}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={engine.confirmClearScreen}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <AreaSelector
        active={engine.selectingArea}
        onSelect={(rect) => void engine.triggerCapture(rect)}
        onCancel={() => engine.setSelectingArea(false)}
      />

      <AreaSelector
        active={engine.selectingRecordingArea}
        title="Select Screen Area to Record"
        confirmLabel="Record Area"
        initialRect={engine.settings.recording.areaRect}
        onSelect={(rect) => void engine.confirmRecordingArea(rect)}
        onCancel={engine.cancelRecordingArea}
      />

      <ScreenshotModal
        result={engine.screenshotResult}
        theme={engine.resolvedTheme}
        accentColor={engine.settings.accentColor}
        askWhereToSave={engine.settings.exportPrefs.askWhereToSave}
        onClear={() => engine.setScreenshotResult(null)}
      />

      <RecordingPreviewModal
        artifact={engine.latestRecording}
        open={engine.recordingPreviewOpen}
        theme={engine.resolvedTheme}
        accentColor={engine.settings.accentColor}
        onDownload={engine.downloadLatestRecording}
        onDiscard={engine.clearTemporaryRecording}
        onClose={() => engine.setRecordingPreviewOpen(false)}
      />

      <SettingsDashboard
        open={engine.settingsOpen}
        settings={engine.settings}
        resolvedTheme={engine.resolvedTheme}
        latestRecording={engine.latestRecording}
        supportedRecordingFormats={engine.supportedRecordingFormats}
        onUpdateSettings={engine.updateSettings}
        onExportSettings={engine.exportSettingsJson}
        onImportSettings={engine.importSettingsJson}
        onResetSettings={() => void engine.resetAllSettings()}
        onClearSavedAnnotations={() => void engine.clearCurrentTabStorage()}
        onClearTemporaryRecording={engine.clearTemporaryRecording}
        onClose={() => engine.setSettingsOpen(false)}
      />

      {engine.banner && !engine.isCapturing && (
        <div
          data-testid="proscreen-status-banner"
          role="status"
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[2147483646] px-4 py-2 rounded-lg border text-xs font-medium shadow-xl backdrop-blur-md ${
            engine.banner.tone === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-100'
              : engine.banner.tone === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100'
              : 'bg-slate-900/95 border-slate-700 text-slate-100'
          }`}
        >
          {engine.banner.message}
        </div>
      )}
    </div>
  );
};
