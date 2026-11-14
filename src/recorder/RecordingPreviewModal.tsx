import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Download, Trash2, Video, X } from 'lucide-react';
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
  onDownload: () => Promise<void> | void;
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
  const [videoMeta, setVideoMeta] = useState<{
    width: number;
    height: number;
    durationSec: number;
  } | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    setVideoMeta(null);
    setPlaybackError(null);
  }, [artifact?.id]);

  if (!open || !artifact) return null;

  const isDark = theme === 'dark';
  const hasPlayableUrl = Boolean(artifact.blobUrl);

  return (
    <div
      data-testid="recording-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Video Recording Playback Preview"
      className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-6"
    >
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-500/20">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">{artifact.filename}</h2>
            <p className="text-xs font-mono tabular-nums text-slate-400">
              {formatRecordingDuration(artifact.durationMs)} · {formatByteSize(artifact.sizeBytes)}
              {videoMeta?.width || artifact.videoWidth
                ? ` · ${videoMeta?.width || artifact.videoWidth}×${
                    videoMeta?.height || artifact.videoHeight
                  }`
                : ''}
              {artifact.hasAudio ? ' · Audio included' : ' · Video only'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recording preview"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/15 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {hasPlayableUrl && !playbackError ? (
            <div
              className={`rounded-lg border overflow-hidden flex items-center justify-center ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-950 border-slate-200'
              }`}
            >
              <video
                data-testid="recording-preview-video"
                src={artifact.blobUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setPlaybackError(null);
                  setVideoMeta({
                    width: v.videoWidth,
                    height: v.videoHeight,
                    durationSec: Number.isFinite(v.duration) ? v.duration : artifact.durationMs / 1000,
                  });
                }}
                onError={() => {
                  setPlaybackError(
                    'In-page video decoding failed for this file. Try downloading and opening it in Chrome.'
                  );
                }}
                className="w-full max-h-[56vh] bg-black"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-semibold">
                  {playbackError ? 'Playback Error' : 'Large Recording Buffered in Extension'}
                </div>
                <p className="mt-1 opacity-90">
                  {playbackError ||
                    'Recordings larger than 35 MB remain buffered inside extension memory for fast saving. Click Download Video below.'}
                </p>
              </div>
            </div>
          )}

          {videoMeta && videoMeta.width > 0 && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                Verified playable video stream ({videoMeta.width}×{videoMeta.height}, {artifact.mimeType})
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-500/20">
          <button
            type="button"
            onClick={() => {
              onDiscard();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard Recording</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
            <button
              type="button"
              data-testid="recording-modal-download-btn"
              onClick={() => void onDownload()}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
