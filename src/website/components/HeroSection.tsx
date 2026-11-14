import React from 'react';
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
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { navigate } = useRouter();

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
            <span className="font-semibold text-white">ProScreen v1.0.0 Released</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
              Read Release Notes <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </div>

        {/* Main Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Your Screen.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Your Canvas.
            </span>
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
            Everything you need to annotate, explain, capture and present your screen.
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Native Direct3D pass-through drawing over any Windows desktop software and Google Chrome. Zero latency, Epic Pen style floating restore, and 100% local privacy.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('download')}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-5 h-5" />
              <span>Download for Windows</span>
              <span className="text-xs font-mono opacity-80 pl-1">(v1.0.0 • 132 MB)</span>
            </button>

            <button
              onClick={() => navigate('features')}
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
              <span className="text-slate-300">Windows 11 & 10 (64-bit)</span>
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

        {/* Live Interactive Product Mockup Stage */}
        <div className="mt-12 sm:mt-16 relative">
          {/* Subtle glow border backdrop */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/30 via-sky-500/20 to-indigo-600/30 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
          
          <div className="relative">
            <InteractiveToolPreview />
          </div>

          {/* Interactive Hint Pill */}
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-blue-950/60 border border-blue-800/60 text-blue-300 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Interactive Live Demo — Try selecting tools, drawing strokes, or testing the Eye button above!
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
