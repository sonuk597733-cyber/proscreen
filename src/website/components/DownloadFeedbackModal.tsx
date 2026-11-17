import React, { useEffect, useState } from 'react';
import { ReleaseAsset } from '../types';
import { buildPowerShellHashCommand } from '../releaseHelpers';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  RotateCw,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';

export type DownloadModalStatus = 'initiating' | 'started' | 'offline';

interface DownloadFeedbackModalProps {
  asset: ReleaseAsset | null;
  status: DownloadModalStatus;
  onClose: () => void;
  onRetry: (asset: ReleaseAsset) => void;
}

export const DownloadFeedbackModal: React.FC<DownloadFeedbackModalProps> = ({
  asset,
  status,
  onClose,
  onRetry,
}) => {
  const [copiedId, setCopiedId] = useState<'sha' | 'ps' | null>(null);
  const [progressPct, setProgressPct] = useState<number>(35);

  useEffect(() => {
    if (!asset) return;
    if (status === 'initiating') {
      setProgressPct(35);
      const t = window.setTimeout(() => setProgressPct(100), 220);
      return () => window.clearTimeout(t);
    }
    if (status === 'started') {
      setProgressPct(100);
    }
  }, [asset, status]);

  useEffect(() => {
    if (!asset) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [asset, onClose]);

  if (!asset) return null;

  const psCommand = buildPowerShellHashCommand(asset.fileName);

  const copyText = async (value: string, id: 'sha' | 'ps') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      /* ignore clipboard error */
    }
  };

  const isOffline = status === 'offline';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border-2 border-blue-500/40 p-6 sm:p-8 shadow-2xl space-y-5 text-white"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close download modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 pr-8">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
              isOffline
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isOffline ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Check className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 id="download-modal-title" className="text-xl sm:text-2xl font-bold text-white">
              {isOffline ? 'Network Connection Required' : 'Official Download Started!'}
            </h3>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              {isOffline
                ? 'Your browser appears offline. Reconnect to download from GitHub Releases.'
                : 'Check your browser download bar or press Ctrl + J to monitor transfer'}
            </p>
          </div>
        </div>

        {/* Browser handoff progress */}
        {!isOffline && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span>
                {status === 'initiating'
                  ? 'Connecting to GitHub Releases CDN...'
                  : 'Transfer handed off to your browser'}
              </span>
              <span className="text-emerald-400 font-semibold">
                {progressPct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* File info & SHA-256 verification */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-sky-300 font-semibold break-all">
              {asset.fileName}
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              v{asset.version} • {asset.sizeFormatted}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Compatibility: {asset.targetOS} ({asset.architecture})
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Checksum</span>
            </span>
            <button
              type="button"
              onClick={() => copyText(asset.sha256, 'sha')}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              {copiedId === 'sha' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Hash</span>
                </>
              )}
            </button>
          </div>
          <div className="text-[10px] font-mono text-slate-400 break-all select-all bg-slate-900/80 p-2 rounded border border-slate-800">
            {asset.sha256}
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>PowerShell Verify</span>
            </span>
            <button
              type="button"
              onClick={() => copyText(psCommand, 'ps')}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              {copiedId === 'ps' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Install &amp; Launch ProScreen on Windows
          </h4>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono text-[11px] shrink-0 font-bold">
                1
              </span>
              <p>
                Open <code className="text-sky-300">{asset.fileName}</code> from your Downloads folder or browser tray (<kbd className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono text-[10px]">Ctrl+J</kbd>).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono text-[11px] shrink-0 font-bold">
                2
              </span>
              <p>
                If Windows SmartScreen appears, verify the SHA-256 checksum, click <strong className="text-white">&quot;More info&quot;</strong>, then <strong className="text-white">&quot;Run anyway&quot;</strong>.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono text-[11px] shrink-0 font-bold">
                3
              </span>
              <p>
                After setup completes, double-click the <strong className="text-white">ProScreen</strong> Desktop or Start Menu shortcut and press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">Alt+Shift+P</kbd> anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Direct Retry / Close */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
          {isOffline ? (
            <button
              type="button"
              onClick={() => onRetry(asset)}
              className="text-xs text-sky-400 hover:text-sky-300 underline font-mono flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Connection &amp; Download</span>
            </button>
          ) : (
            <a
              href={asset.downloadUrl}
              download={asset.fileName}
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 underline font-mono flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download didn&apos;t start? Click here to retry</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            Got it, Continue
          </button>
        </div>
      </div>
    </div>
  );
};
