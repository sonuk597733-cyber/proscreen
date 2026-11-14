import React, { useState } from 'react';
import { Copy, Download, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { ResolvedThemeMode } from '../types/settings';
import { CaptureResult, copyPngToClipboard, downloadPngDataUrl } from '../screenshot/capture';

interface ScreenshotModalProps {
  result: CaptureResult | null;
  theme: ResolvedThemeMode;
  accentColor?: string;
  askWhereToSave?: boolean;
  onClear: () => void;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  result,
  theme,
  accentColor = '#2563EB',
  askWhereToSave = false,
  onClear,
}) => {
  const [feedback, setFeedback] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );

  if (!result) return null;

  const isDark = theme === 'dark';

  const handleDownload = async () => {
    if (!result.dataUrl) return;
    const filename = `proscreen-capture-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19)}.png`;
    const res = await downloadPngDataUrl(result.dataUrl, filename, askWhereToSave);
    if (res.ok) {
      setFeedback({ text: `Saved ${res.filename ?? filename}.`, tone: 'success' });
    } else {
      setFeedback({ text: res.error || 'Failed to save PNG file.', tone: 'error' });
    }
  };

  const handleCopy = async () => {
    if (!result.dataUrl) return;
    const res = await copyPngToClipboard(result.dataUrl);
    if (res.ok) {
      setFeedback({ text: 'Image copied to clipboard.', tone: 'success' });
    } else {
      setFeedback({ text: res.error || 'Clipboard copy failed.', tone: 'error' });
    }
  };

  return (
    <div
      data-testid="screenshot-preview-modal"
      role="dialog"
      aria-label="Screenshot Preview"
      className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6"
    >
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-500/20">
          <div>
            <h2 className="text-base font-semibold">Screenshot Capture Preview</h2>
            {result.width && result.height && (
              <p className="text-xs font-mono tabular-nums text-slate-400">
                {result.width} × {result.height} px · PNG
                {result.byteLength ? ` · ${(result.byteLength / 1024).toFixed(1)} KB` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Close screenshot preview"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/15 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {!result.ok || !result.dataUrl ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3 text-sm text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Screenshot capture could not complete</div>
                <p className="mt-1 text-xs opacity-90">{result.error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={`rounded-lg border overflow-hidden max-h-[58vh] flex items-center justify-center ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <img
                  src={result.dataUrl}
                  alt="Annotated screenshot capture"
                  className="max-w-full max-h-[56vh] object-contain"
                />
              </div>

              {result.note && (
                <p className="text-xs text-slate-400">{result.note}</p>
              )}

              {feedback && (
                <div
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                    feedback.tone === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {feedback.tone === 'success' ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-500/20">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Preview</span>
          </button>

          {result.ok && result.dataUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 transition-colors whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy to Clipboard</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                style={{ backgroundColor: accentColor }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
