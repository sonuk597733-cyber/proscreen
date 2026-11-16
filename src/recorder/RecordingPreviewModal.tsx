import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Download,
  ExternalLink,
  Folder,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ResolvedThemeMode } from '../types/settings';
import {
  RecordingArtifact,
  formatByteSize,
  formatRecordingDuration,
} from './screenRecorder';

interface RecordingPreviewModalProps {
  artifact: RecordingArtifact | null;
  open: boolean;
  theme: ResolvedThemeMode;
  accentColor?: string;
  onDownload: (askWhereToSave?: boolean) => Promise<unknown> | void;
  onDiscard: () => void;
  onClose: () => void;
}

export const RecordingPreviewModal: React.FC<RecordingPreviewModalProps> = ({
  artifact,
  open,
  theme,
  accentColor = '#0EA5E9',
  onDownload,
  onDiscard,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [videoMeta, setVideoMeta] = useState<{
    width: number;
    height: number;
    durationSec: number;
  } | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [attemptedFallback, setAttemptedFallback] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Compute best initial playable source
  const lastLoadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!artifact) {
      setActiveSrc('');
      lastLoadedIdRef.current = null;
      return;
    }

    if (lastLoadedIdRef.current !== artifact.id) {
      lastLoadedIdRef.current = artifact.id;
      setVideoMeta(null);
      setPlaybackError(null);
      setIsPlaying(false);
      setCurrentTimeSec(0);
      setDurationSec(artifact.durationMs > 0 ? artifact.durationMs / 1000 : 0);
      setAttemptedFallback(false);
      setShowDiscardConfirm(false);
      setActionFeedback(null);

      if (artifact.blobUrl) {
        setActiveSrc(artifact.blobUrl);
      } else if (artifact.savedPath) {
        const sanitized = artifact.savedPath.replace(/\\/g, '/');
        setActiveSrc(`proscreen-media://local/${sanitized}`);
      } else {
        setActiveSrc('');
      }
    } else {
      if (!activeSrc) {
        if (artifact.blobUrl) {
          setActiveSrc(artifact.blobUrl);
        } else if (artifact.savedPath) {
          const sanitized = artifact.savedPath.replace(/\\/g, '/');
          setActiveSrc(`proscreen-media://local/${sanitized}`);
        }
      }
    }
  }, [artifact?.id, artifact?.savedPath, artifact?.blobUrl, activeSrc]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!open || !artifact) return null;

  const isDark = theme === 'dark';
  const hasPlayableUrl = Boolean(activeSrc);

  const getEffectiveDuration = () => {
    if (durationSec > 0 && Number.isFinite(durationSec)) return durationSec;
    if (artifact && artifact.durationMs > 0) return artifact.durationMs / 1000;
    return 0;
  };

  // 1. Play / Pause Control
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Playback play() was rejected:', err);
          setIsPlaying(false);
        });
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  // 2. Seek / Timeline Scrubber Control
  const handleSeek = (targetSec: number) => {
    const v = videoRef.current;
    const maxDur = getEffectiveDuration();
    const clamped = Math.max(0, Math.min(maxDur > 0 ? maxDur : 3600, targetSec));
    setCurrentTimeSec(clamped);
    if (v) {
      try {
        v.currentTime = clamped;
      } catch (err) {
        console.warn('Seek error:', err);
      }
    }
  };

  // 3. Replay Control (Restart from 0:00)
  const handleReplay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setCurrentTimeSec(0);
    void v.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  // 4 & 5. -5s / +5s Seek Controls
  const seekRelative = (deltaSec: number) => {
    const v = videoRef.current;
    if (!v) return;
    const current = v.currentTime || currentTimeSec;
    handleSeek(current + deltaSec);
  };

  // 6. Playback Speed Control (0.5x, 1x, 1.25x, 1.5x, 2x)
  const cyclePlaybackRate = () => {
    const rates = [0.5, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackSpeed) + 1) % rates.length;
    const nextSpeed = rates[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  // 7. Volume / Mute Control
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !isMuted;
    v.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (v) {
      v.volume = clamped;
      if (clamped > 0 && v.muted) {
        v.muted = false;
        setIsMuted(false);
      }
    }
  };

  // 8. Fullscreen Control
  const toggleFullscreen = async () => {
    const targetEl = playerContainerRef.current || videoRef.current;
    if (!targetEl) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else if (typeof targetEl.requestFullscreen === 'function') {
        await targetEl.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  // 9. Open in Windows Default Player
  const handleOpenInPlayer = async () => {
    const targetPath = artifact.savedPath;
    if (!targetPath) {
      setActionFeedback({
        type: 'info',
        message: 'File is not yet saved to disk. Click "Save As..." first.',
      });
      return;
    }
    try {
      if (window.proscreenDesktop?.openPath) {
        const res = await window.proscreenDesktop.openPath(targetPath);
        if (res && typeof res === 'string' && res.toLowerCase().includes('error')) {
          setActionFeedback({ type: 'error', message: `Cannot open player: ${res}` });
        } else {
          setActionFeedback({ type: 'success', message: 'Opened in default Windows player.' });
        }
      } else {
        setActionFeedback({ type: 'error', message: 'Desktop integration unavailable.' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Open failed: ${String(err)}` });
    }
  };

  // 10. Open Folder in Windows Explorer
  const handleOpenFolder = async () => {
    const targetPath = artifact.savedPath;
    if (!targetPath) {
      setActionFeedback({
        type: 'info',
        message: 'File is not yet saved to disk. Click "Save As..." first.',
      });
      return;
    }
    try {
      if (window.proscreenDesktop?.showItemInFolder) {
        const ok = await window.proscreenDesktop.showItemInFolder(targetPath);
        if (ok) {
          setActionFeedback({ type: 'success', message: 'Revealed file in Windows Explorer.' });
        } else {
          setActionFeedback({ type: 'error', message: 'Could not locate file on disk.' });
        }
      } else {
        setActionFeedback({ type: 'error', message: 'Desktop integration unavailable.' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Reveal failed: ${String(err)}` });
    }
  };

  // 11. Discard Control (with confirmation)
  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onDiscard();
    onClose();
  };

  // 12. Done Control
  const handleDone = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    onClose();
  };

  // 14. Close / Cut Control
  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    onClose();
  };

  // 13. Save As Control
  const handleSaveAs = async () => {
    setIsSaving(true);
    setActionFeedback(null);
    try {
      await onDownload(true);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Save error: ${String(err)}` });
    } finally {
      setIsSaving(false);
    }
  };

  const formatSeconds = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVideoError = () => {
    if (!attemptedFallback && artifact.savedPath) {
      setAttemptedFallback(true);
      const sanitized = artifact.savedPath.replace(/\\/g, '/');
      setActiveSrc(`proscreen-media://local/${sanitized}`);
      return;
    }
    setPlaybackError(
      'In-page video decoding failed. You can download and open this recording in an external player.'
    );
  };

  const maxDuration = getEffectiveDuration();

  return (
    <div
      data-testid="recording-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Video Recording Playback Preview"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
      className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 pointer-events-auto select-none"
    >
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col pointer-events-auto ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-500/20">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-semibold truncate">{artifact.filename}</h2>
            <p className="text-xs font-mono tabular-nums text-slate-400">
              {formatRecordingDuration(artifact.durationMs)} · {formatByteSize(artifact.sizeBytes)}
              {videoMeta?.width || artifact.videoWidth
                ? ` · ${videoMeta?.width || artifact.videoWidth}×${
                    videoMeta?.height || artifact.videoHeight
                  }`
                : ''}
              {artifact.frameRate ? ` · ${artifact.frameRate} FPS` : ''}
              {artifact.quality ? ` · Preset: ${artifact.quality.toUpperCase()}` : ''}
              {artifact.hasAudio ? ' · Audio included' : ' · Video only'}
            </p>
          </div>
          {/* 14. Close Button (X) */}
          <button
            type="button"
            data-testid="recording-preview-close-btn"
            onClick={handleClose}
            aria-label="Close recording preview"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/15 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Display Container */}
        <div className="p-4 sm:p-5 space-y-3 pointer-events-auto">
          {hasPlayableUrl ? (
            <div
              ref={playerContainerRef}
              className={`relative rounded-xl border overflow-hidden flex flex-col items-center justify-center bg-black ${
                isDark ? 'border-slate-800' : 'border-slate-300'
              }`}
            >
              <video
                ref={videoRef}
                key={activeSrc}
                data-testid="recording-preview-video"
                src={activeSrc}
                playsInline
                preload="auto"
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  setCurrentTimeSec(v.currentTime);
                  if (Number.isFinite(v.duration) && v.duration > 0) {
                    setDurationSec(v.duration);
                  }
                }}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setPlaybackError(null);
                  const effectiveDur =
                    Number.isFinite(v.duration) && v.duration > 0
                      ? v.duration
                      : artifact.durationMs / 1000;
                  setDurationSec(effectiveDur);
                  setVideoMeta({
                    width: v.videoWidth,
                    height: v.videoHeight,
                    durationSec: effectiveDur,
                  });
                }}
                onVolumeChange={(e) => {
                  const v = e.currentTarget;
                  setIsMuted(v.muted);
                  setVolume(v.volume);
                }}
                onError={handleVideoError}
                className="w-full max-h-[48vh] object-contain cursor-pointer"
              />

              {/* Integrated Player Controls Bar */}
              <div className="w-full bg-slate-950/95 border-t border-slate-800/80 px-3 py-2 flex flex-col gap-2 pointer-events-auto">
                {/* 2. Timeline / Seek Scrubber Slider */}
                <div className="flex items-center gap-2">
                  <span
                    data-testid="preview-current-time"
                    className="text-[11px] font-mono tabular-nums text-slate-400 min-w-[34px]"
                  >
                    {formatSeconds(currentTimeSec)}
                  </span>
                  <input
                    type="range"
                    data-testid="recording-preview-seek-slider"
                    aria-label="Seek timeline"
                    min={0}
                    max={maxDuration > 0 ? maxDuration : 1}
                    step={0.05}
                    value={currentTimeSec}
                    onInput={(e) => handleSeek(parseFloat(e.currentTarget.value))}
                    onChange={(e) => handleSeek(parseFloat(e.currentTarget.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <span
                    data-testid="preview-duration"
                    className="text-[11px] font-mono tabular-nums text-slate-400 min-w-[34px] text-right"
                  >
                    {formatSeconds(maxDuration)}
                  </span>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* 1. Play/Pause Button */}
                    <button
                      type="button"
                      data-testid="recording-preview-play-btn"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      title={isPlaying ? 'Pause' : 'Play'}
                      className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 cursor-pointer transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* 3. Replay Button */}
                    <button
                      type="button"
                      data-testid="recording-preview-replay-btn"
                      onClick={handleReplay}
                      title="Replay from Beginning"
                      aria-label="Replay from Beginning"
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* 4. -5s Seek Button */}
                    <button
                      type="button"
                      data-testid="recording-preview-rewind-5s-btn"
                      onClick={() => seekRelative(-5)}
                      title="Rewind 5 seconds"
                      aria-label="Rewind 5 seconds"
                      className="px-1.5 py-1 text-[11px] font-medium rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      -5s
                    </button>

                    {/* 5. +5s Seek Button */}
                    <button
                      type="button"
                      data-testid="recording-preview-forward-5s-btn"
                      onClick={() => seekRelative(5)}
                      title="Forward 5 seconds"
                      aria-label="Forward 5 seconds"
                      className="px-1.5 py-1 text-[11px] font-medium rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      +5s
                    </button>

                    {/* 6. Playback Speed Selector (0.5x, 1x, 1.25x, 1.5x, 2x) */}
                    <button
                      type="button"
                      data-testid="recording-preview-speed-btn"
                      onClick={cyclePlaybackRate}
                      title="Cycle Playback Speed"
                      aria-label={`Playback speed ${playbackSpeed}x`}
                      className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors ml-1"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 7. Volume & Mute Control */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="recording-preview-mute-btn"
                        onClick={toggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <input
                        type="range"
                        data-testid="recording-preview-volume-slider"
                        aria-label="Volume"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onInput={(e) => handleVolumeChange(parseFloat(e.currentTarget.value))}
                        onChange={(e) => handleVolumeChange(parseFloat(e.currentTarget.value))}
                        className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* 8. Fullscreen Control */}
                    <button
                      type="button"
                      data-testid="recording-preview-fullscreen-btn"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-semibold">Recording Ready</div>
                <p className="mt-1 opacity-90">
                  Recording is ready. Click "Save As..." below to choose destination, or open in Windows player.
                </p>
              </div>
            </div>
          )}

          {/* Non-intrusive playback notice banner if error occurred */}
          {playbackError && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 flex items-center gap-2 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{playbackError}</span>
            </div>
          )}

          {/* User Feedback Status Banner */}
          {actionFeedback && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : actionFeedback.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : actionFeedback.type === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
          )}

          {/* 9 & 10. File Info with "Open in Player" and "Open Folder" */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-300 text-xs">
            <span className="truncate">
              {artifact.savedPath ? `Saved: ${artifact.savedPath}` : 'Status: Ready to Save'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 9. Open in Player */}
              <button
                type="button"
                data-testid="recording-preview-open-player-btn"
                onClick={handleOpenInPlayer}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-400/40 hover:bg-blue-500/20 text-blue-200 cursor-pointer text-[11px] font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in Player</span>
              </button>

              {/* 10. Open Folder */}
              <button
                type="button"
                data-testid="recording-preview-open-folder-btn"
                onClick={handleOpenFolder}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-400/40 hover:bg-blue-500/20 text-blue-200 cursor-pointer text-[11px] font-medium transition-colors"
              >
                <Folder className="w-3 h-3" />
                <span>Open Folder</span>
              </button>
            </div>
          </div>

          {/* Inline Discard Confirmation Prompt */}
          {showDiscardConfirm && (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 flex items-center justify-between gap-3 text-xs text-rose-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Permanently discard this recording? This cannot be undone.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-2.5 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="recording-preview-confirm-discard-btn"
                  onClick={handleConfirmDiscard}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-500/20 pointer-events-auto">
          {/* 11. Discard Control */}
          <button
            type="button"
            data-testid="recording-preview-discard-btn"
            onClick={() => setShowDiscardConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>

          <div className="flex items-center gap-2">
            {/* 12. Done Control */}
            <button
              type="button"
              data-testid="recording-preview-done-btn"
              onClick={handleDone}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>

            {/* 13. Save As Control */}
            <button
              type="button"
              data-testid="recording-preview-save-as-btn"
              disabled={isSaving}
              onClick={handleSaveAs}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save As...'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
