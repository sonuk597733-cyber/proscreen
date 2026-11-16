import React, { useState } from 'react';
import { useRouter } from '../router';
import { InteractiveToolPreview } from './InteractiveToolPreview';
import {
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Monitor,
  Chrome,
  Sparkles,
  Zap,
  MousePointer,
  Video,
  PenTool,
  Sliders,
  Layers,
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { navigate } = useRouter();
  const [heroTab, setHeroTab] = useState<'interactive' | 'preview' | 'toolbar' | 'modes'>('preview');

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background Radial Electric Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-cyan-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Release Pill Badge */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => navigate('changelog')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 transition-all duration-200 group shadow-lg shadow-blue-500/10"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="font-semibold text-white">ProScreen v1.0.0 Pro</span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-300 font-mono font-semibold">First 6 Months Free</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
              Read Release Notes <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </div>

        {/* Main Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Capture.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Create.
            </span>{' '}
            Explain.
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-slate-200 font-medium leading-relaxed max-w-3xl mx-auto">
            Everything you need to record your screen, capture ideas and create professional walkthroughs.
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Native hardware-accelerated 60 FPS recording with DXGI zero-copy, dual-track studio audio, and Direct3D pass-through drawing over any Windows desktop application or Google Chrome.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('download', 'download')}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-5 h-5" />
              <span>Download for Windows</span>
              <span className="text-xs font-mono opacity-80 pl-1">(v1.0.0 • 132 MB)</span>
            </button>

            <button
              onClick={() => navigate('home', 'features')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all duration-200"
            >
              <span>Explore Features</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Platform & Trust Badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-medium">Windows 11 & 10 (Available)</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400/80 inline-block" />
              <span className="text-slate-400">macOS & Linux (Coming Soon)</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <Chrome className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">Chrome Extension Ready</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <MousePointer className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Zero Mouse Blocking</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300">100% Local • Zero Telemetry</span>
            </div>
          </div>
        </div>

        {/* Live Product Showcase Stage */}
        <div className="mt-12 sm:mt-16 relative">
          {/* Showcase Tabs */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl">
              <button
                onClick={() => setHeroTab('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  heroTab === 'preview'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Recording Studio</span>
              </button>
              <button
                onClick={() => setHeroTab('toolbar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  heroTab === 'toolbar'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Floating Toolbar</span>
              </button>
              <button
                onClick={() => setHeroTab('modes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  heroTab === 'modes'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>4 Capture Modes</span>
              </button>
              <button
                onClick={() => setHeroTab('interactive')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  heroTab === 'interactive'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Live Canvas</span>
              </button>
            </div>
          </div>

          {/* Product Frame with Ambient Glow */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden p-2 sm:p-4">
            {/* Window Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-3 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-slate-300 font-medium hidden sm:inline">ProScreen Desktop v1.0.0 — Direct3D Pass-Through Studio</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 text-[11px]">
                  DXGI 60 FPS
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] hidden sm:inline">
                  Studio Audio Limiter Active
                </span>
              </div>
            </div>

            {/* Tab Views */}
            {heroTab === 'interactive' && (
              <div>
                <InteractiveToolPreview />
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-blue-950/60 border border-blue-800/60 text-blue-300 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Interactive Live Demo — Try selecting tools, drawing strokes, or testing the Eye button!
                  </span>
                </div>
              </div>
            )}

            {heroTab === 'preview' && (
              <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 flex flex-col items-center">
                <img
                  src="/assets/screenshots/r1-recording-preview.png"
                  alt="ProScreen Recording Preview Modal with Video Player, Seek Scrubbing & Controls"
                  className="w-full max-h-[600px] object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.005]"
                  loading="eager"
                />
                <div className="p-4 bg-slate-950/90 border-t border-slate-800 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-white">Recording Preview Modal:</span>
                    <span>Frame-accurate timeline scrubber, 0.5x–2x speed, replay, and instant Save As.</span>
                  </div>
                  <button
                    onClick={() => navigate('download', 'download')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shrink-0"
                  >
                    Try Desktop Free
                  </button>
                </div>
              </div>
            )}

            {heroTab === 'toolbar' && (
              <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 flex flex-col items-center">
                <img
                  src="/assets/screenshots/r1-expanded-toolbar.png"
                  alt="ProScreen Floating Studio Toolbar with Colors, Brushes & Annotations"
                  className="w-full max-h-[600px] object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.005]"
                  loading="lazy"
                />
                <div className="p-4 bg-slate-950/90 border-t border-slate-800 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Floating Desktop Toolbar:</span>
                    <span>Movable, dockable studio toolbar with instant Eye OFF collapse to unobtrusive restore button.</span>
                  </div>
                  <button
                    onClick={() => navigate('home', 'features')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors shrink-0"
                  >
                    View Toolbar Specs
                  </button>
                </div>
              </div>
            )}

            {heroTab === 'modes' && (
              <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 flex flex-col items-center">
                <img
                  src="/assets/screenshots/r1-recorder-popout.png"
                  alt="ProScreen 4 Capture Modes: Screen, Window, Tab, and Area Selection"
                  className="w-full max-h-[600px] object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.005]"
                  loading="lazy"
                />
                <div className="p-4 bg-slate-950/90 border-t border-slate-800 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">4 Dedicated Recording Modes:</span>
                    <span>Screen, Application Window, Browser Tab, and Custom Resizable Area with dual-track audio.</span>
                  </div>
                  <button
                    onClick={() => navigate('download', 'download')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shrink-0"
                  >
                    Download v1.0.0 Free
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
