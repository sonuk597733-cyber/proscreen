import React, { useState } from 'react';
import { IMPLEMENTED_FEATURES, KEYBOARD_SHORTCUTS } from '../constants';
import { useRouter } from '../router';
import {
  PenTool,
  Highlighter,
  ArrowUpRight,
  Type,
  Square,
  Eraser,
  RotateCcw,
  Eye,
  Presentation,
  Camera,
  Video,
  Keyboard,
  Monitor,
  Check,
  Search,
  Download,
  Sparkles,
  MousePointer,
  Cpu,
  Layers,
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [shortcutFilter, setShortcutFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredShortcuts = KEYBOARD_SHORTCUTS.filter(
    (s) =>
      s.key.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      s.action.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      s.scope.toLowerCase().includes(shortcutFilter.toLowerCase())
  );

  const categories = [
    { id: 'all', label: 'All 11 Features' },
    { id: 'tools', label: 'Drawing & Callouts' },
    { id: 'core', label: 'Core Engine & History' },
    { id: 'workspace', label: 'Whiteboard Modes' },
    { id: 'capture', label: 'Capture & Video' },
    { id: 'system', label: 'System & Hardware' },
  ];

  const filteredFeatures =
    activeCategory === 'all'
      ? IMPLEMENTED_FEATURES
      : IMPLEMENTED_FEATURES.filter((f) => f.category === activeCategory);

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Architecture & Capabilities</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            Every Feature Built For{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              High Performance
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            ProScreen does not advertise concept features. Below is the verified breakdown of all 11 implemented tools, architectural capabilities, and system specifications.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeCategory === c.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Detailed Features List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredFeatures.map((feat) => (
            <div
              key={feat.id}
              id={feat.id}
              className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 hover:border-blue-500/40 hover:bg-slate-900/80 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{feat.title}</h3>
                      <span className="text-xs font-mono text-slate-400">
                        Category: {feat.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {feat.shortcut && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-blue-300 text-xs font-mono font-semibold border border-slate-700">
                      {feat.shortcut}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {feat.fullDesc}
                </p>

                {/* Technical Specifications checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    Technical Specifications:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {feat.specs.map((sp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60"
                      >
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{sp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {feat.badge && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{feat.badge}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Shortcuts Deep Dive Section */}
        <div id="shortcuts" className="pt-12 border-t border-slate-800">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Ergonomic Keyboard Controls</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Global & Studio Shortcuts
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              ProScreen hotkeys operate globally across your entire Windows operating system so you never have to break eye contact with your audience.
            </p>

            {/* Shortcut search */}
            <div className="relative max-w-md mx-auto pt-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter shortcuts (e.g. 'Pointer', 'Eye', 'Capture')..."
                value={shortcutFilter}
                onChange={(e) => setShortcutFilter(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-12 bg-slate-900/90 border-b border-slate-800 p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-3">Shortcut Key</div>
              <div className="col-span-5 sm:col-span-6">Triggered Action</div>
              <div className="col-span-3 sm:col-span-3 text-right">Scope</div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {filteredShortcuts.map((s, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 p-4 text-xs sm:text-sm items-center hover:bg-slate-900/40 transition-colors"
                >
                  <div className="col-span-4 sm:col-span-3 font-mono font-bold text-blue-400">
                    <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white shadow-sm">
                      {s.key}
                    </kbd>
                  </div>
                  <div className="col-span-5 sm:col-span-6 font-medium text-slate-200">
                    {s.action}
                  </div>
                  <div className="col-span-3 sm:col-span-3 text-right font-mono text-[11px] text-slate-400">
                    {s.scope}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Download CTA */}
        <div className="text-center pt-8">
          <button
            onClick={() => navigate('download')}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-100"
          >
            <Download className="w-5 h-5" />
            <span>Download ProScreen for Windows (v1.0.0)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
