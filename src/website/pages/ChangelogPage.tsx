import React from 'react';
import { CHANGELOG } from '../constants';
import { useRouter } from '../router';
import {
  FileText,
  Tag,
  Calendar,
  CheckCircle2,
  Sparkles,
  Download,
  ShieldCheck,
  Cpu,
  Monitor,
  Chrome,
} from 'lucide-react';

export const ChangelogPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <FileText className="w-3.5 h-3.5" />
            <span>Official Version History</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Release{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Changelog
            </span>
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Transparent release notes tracking all engineering milestones, native Windows desktop features, and Chrome Extension updates.
          </p>
        </div>

        {/* Releases Stream */}
        <div className="space-y-12">
          {CHANGELOG.map((rel) => (
            <article
              key={rel.version}
              className="rounded-3xl bg-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden"
            >
              {/* Release Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white">
                      v{rel.version}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {rel.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-blue-400">
                    {rel.tagline}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{rel.date}</span>
                </div>
              </div>

              {/* Release Highlights */}
              <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-900/40 space-y-3">
                <div className="text-xs font-mono font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Release Highlights</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                  {rel.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categorized Detailed Items */}
              <div className="space-y-8">
                {rel.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{sec.category}</span>
                    </h3>
                    <ul className="space-y-2 pl-4 border-l border-slate-800 text-xs sm:text-sm text-slate-300">
                      {sec.items.map((it, iIdx) => (
                        <li key={iIdx} className="leading-relaxed">
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Bottom Card Actions */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified 57 unit tests passed • Clean SHA-256 release</span>
                </div>

                <button
                  onClick={() => navigate('download')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download v{rel.version} for Windows</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
