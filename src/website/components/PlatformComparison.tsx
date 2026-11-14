import React from 'react';
import { useRouter } from '../router';
import { PLATFORM_MATRIX } from '../constants';
import { Check, X, Monitor, Chrome, ArrowRight, ShieldCheck, Download } from 'lucide-react';

export const PlatformComparison: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section className="py-20 bg-[#070b17] border-y border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Monitor className="w-3.5 h-3.5" />
            <span>Dual Runtime Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Windows Desktop & Chrome Extension
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Choose the best runtime for your setup. Both share the same high-precision Bezier rendering engine, keyboard shortcuts, and zero-telemetry architecture.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden shadow-2xl">
          {/* Header Row */}
          <div className="grid grid-cols-12 bg-slate-900/90 border-b border-slate-800 p-4 sm:p-6 text-sm font-semibold">
            <div className="col-span-6 sm:col-span-5 text-slate-300">Capability / Feature</div>
            <div className="col-span-3 sm:col-span-3 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2 text-blue-400">
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Windows Desktop</span>
              <span className="sm:hidden">Desktop</span>
            </div>
            <div className="col-span-3 sm:col-span-4 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2 text-amber-400">
              <Chrome className="w-4 h-4" />
              <span className="hidden sm:inline">Chrome Extension</span>
              <span className="sm:hidden">Chrome</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800/60">
            {PLATFORM_MATRIX.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 p-4 sm:p-5 text-xs sm:text-sm items-center hover:bg-slate-900/40 transition-colors"
              >
                <div className="col-span-6 sm:col-span-5 pr-2">
                  <div className="font-medium text-white">{row.feature}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{row.note}</div>
                </div>

                {/* Windows Desktop */}
                <div className="col-span-3 sm:col-span-3 flex items-center justify-center sm:justify-start">
                  {typeof row.desktop === 'boolean' ? (
                    row.desktop ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Supported</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">No</span>
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-xs font-mono">{row.desktop}</span>
                  )}
                </div>

                {/* Chrome Extension */}
                <div className="col-span-3 sm:col-span-4 flex items-center justify-center sm:justify-start">
                  {typeof row.extension === 'boolean' ? (
                    row.extension ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Supported</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Web tabs only</span>
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-xs font-mono">{row.extension}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Card Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 p-6 bg-slate-900/60 border-t border-slate-800 gap-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="font-semibold text-white text-sm">Windows Desktop Edition</div>
                <div className="text-xs text-slate-400">For whole-system annotation over all desktop apps</div>
              </div>
              <button
                onClick={() => navigate('download')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Windows</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="font-semibold text-white text-sm">Chrome Extension Edition</div>
                <div className="text-xs text-slate-400">For in-browser annotation inside Chromium</div>
              </div>
              <button
                onClick={() => navigate('chrome-extension')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Chrome className="w-3.5 h-3.5" />
                <span>Extension Guide</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
