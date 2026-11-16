import React, { useEffect, useState } from 'react';
import { formatRecordingDuration } from '../recorder/screenRecorder';
import { DesktopSharedState } from './desktopTypes';
import { Pause, Play, Square, GripVertical } from 'lucide-react';

export const DesktopRecordingBarApp: React.FC = () => {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;
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
    recordingStatus: 'recording',
    recordingElapsedMs: 0,
    latestRecording: null,
  });

  useEffect(() => {
    if (!desktop) return;
    void desktop.getState().then((s) => {
      if (s) setState((prev) => ({ ...prev, ...s }));
    });
    const unsub = desktop.onStateChange((s) => {
      setState((prev) => ({ ...prev, ...s }));
    });
    return unsub;
  }, [desktop]);

  const isPaused = state.recordingStatus === 'paused';
  const elapsedFormatted = formatRecordingDuration(state.recordingElapsedMs || 0);

  const handlePauseResume = () => {
    if (isPaused) {
      desktop?.dispatchAction('resume-recording');
    } else {
      desktop?.dispatchAction('pause-recording');
    }
  };

  const handleStop = () => {
    desktop?.dispatchAction('stop-recording');
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-1 select-none overflow-hidden font-sans">
      <div
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-slate-100 ring-1 ring-white/10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Drag handle */}
        <div
          className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5"
          title="Drag to reposition"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
          ) : (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
          <span className="font-mono text-sm font-bold tracking-wider tabular-nums min-w-[46px] text-slate-100">
            {elapsedFormatted}
          </span>
          {isPaused && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/40">
              PAUSED
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

        {/* Action Controls (no-drag) */}
        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={handlePauseResume}
            title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            className="p-1.5 rounded-full text-slate-200 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {/* Stop Button */}
          <button
            type="button"
            onClick={handleStop}
            title="Stop & Save Recording"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-medium text-xs shadow-md transition-colors focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
