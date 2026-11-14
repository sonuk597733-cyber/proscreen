import React from 'react';
import { useRouter } from '../router';
import { IMPLEMENTED_FEATURES } from '../constants';
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
  MousePointer,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built For Real Productivity</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Designed for Flow.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Engineered for Speed.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Every tool in ProScreen is crafted to feel instantaneous, non-intrusive, and mathematically precise.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 (Large 2-col span): Pointer Pass-Through & Epic Pen Eye */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-8 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <MousePointer className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                      Core Interaction Model
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Zero-Latency Pointer Pass-Through
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-semibold">
                  Default: Pointer (Alt+V)
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Unlike primitive screen recorders that hijack your cursor with an invisible blocking overlay, ProScreen defaults to Pointer mode. Mouse clicks, double clicks, text selections, and wheel scrolling pass directly through to Excel, PowerPoint, VS Code, and Chrome without a microsecond of lag.
              </p>

              {/* Code visual & key spec */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
                <div className="text-slate-400">// Native Windows Event Forwarding</div>
                <div className="text-emerald-400">
                  win.setIgnoreMouseEvents(true, {'{'} forward: true {'}'});
                </div>
                <div className="text-sky-300">
                  → Click-through to background window active (Zero overlay interception)
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                100% Native Pass-Through
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                Alt+V Instant Hotkey
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                Never Hijacks System Clicks
              </span>
            </div>
          </div>

          {/* Card 2: Floating Eye Restore Button (Epic Pen Style) */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                  <Eye className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[11px] font-mono font-semibold">
                  Epic Pen Style
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Floating Eye Restore Button</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Click the Eye button or press Alt+Shift+P to collapse the toolbar. All annotations remain visible while only one sleek, draggable Eye button stays on screen. Outside the small button, zero mouse clicks are intercepted.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Draggable to any screen corner</span>
              <span className="font-mono text-sky-400">Alt+Shift+P</span>
            </div>
          </div>

          {/* Card 3: Pen & Chisel Highlighter */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Highlighter className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold">
                  Alt+P / Alt+H
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Pen & Chisel Highlighter</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Bezier path smoothing delivers buttery smooth ink strokes at 60+ FPS. Chisel highlighter blends semi-transparently over IDE code and slides without obscuring text.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-xs text-slate-400 ml-auto font-mono">32 Presets + RGB</span>
            </div>
          </div>

          {/* Card 4: Text & Geometric Shapes */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Type className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-mono font-semibold">
                  Alt+T / Alt+R
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Text & Geometric Shapes</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Click anywhere to type editable text notes. Draw rectangles, rounded rectangles with custom radius, and hold Shift for 1:1 constrained circles and ellipses.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Auto-wrapping text boxes</span>
              <span className="font-mono text-purple-400">Shift = 1:1 Aspect</span>
            </div>
          </div>

          {/* Card 5: Directional Arrows & Lines */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold">
                  Alt+A
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Arrow & Directional Lines</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Point out specific UI elements, code branches, or chart anomalies with sharp single or double-headed arrows. Features 45-degree angle snapping for diagramming.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Double-headed vectors</span>
              <span className="font-mono text-emerald-400">45° Snapping</span>
            </div>
          </div>

          {/* Card 6: Whiteboard & Blackboard */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Presentation className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-semibold">
                  Alt+W / Alt+B
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Whiteboard & Blackboard</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Turn your screen into an immaculate presentation canvas. Switch between Whiteboard, Blackboard, Dot Grid, and Ruled Paper. Add multi-page sheets and export notes as PNG.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Multi-page notebook sheets</span>
              <span className="font-mono text-indigo-400">High-Res PNG</span>
            </div>
          </div>

          {/* Card 7: Screen Capture & Recording */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] font-mono font-semibold">
                  Alt+Shift+S / R
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Capture & Video Recording</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Capture drag-selected screenshot areas straight to clipboard (Ctrl+V ready). Record video via MediaRecorder with a floating status HUD timer and pause/resume.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Instant clipboard copy</span>
              <span className="font-mono text-rose-400">MediaRecorder HUD</span>
            </div>
          </div>

          {/* Card 8 (Large 2-col span): Multi-Monitor & Global Shortcuts */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-8 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                      Hardware Integration
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Multi-Monitor Virtual Coordinates & Global Hotkeys
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold">
                  Negative Coordinates Handled
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Annotate across dual, triple, or ultra-wide multi-monitor setups. ProScreen computes unified virtual desktop bounds, seamlessly supports secondary monitors with negative X/Y coordinates, and auto-clamps toolbars to visible viewports if an external monitor is unplugged.
              </p>

              {/* Shortcut badges preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-xs font-mono font-bold text-white">Alt+Shift+P</div>
                  <div className="text-[10px] text-slate-400">Toggle Toolbar / Eye</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-xs font-mono font-bold text-white">Alt+V</div>
                  <div className="text-[10px] text-slate-400">Pointer Mode</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-xs font-mono font-bold text-white">Alt+Shift+S</div>
                  <div className="text-[10px] text-slate-400">Take Screenshot</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-xs font-mono font-bold text-white">Alt+Shift+X</div>
                  <div className="text-[10px] text-slate-400">Clear Screen</div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                onClick={() => navigate('features')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors group/btn"
              >
                <span>Read detailed feature architecture</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
