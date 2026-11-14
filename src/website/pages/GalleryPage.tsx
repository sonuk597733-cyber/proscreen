import React, { useState } from 'react';
import { useRouter } from '../router';
import {
  Monitor,
  Eye,
  Presentation,
  Camera,
  Video,
  Palette,
  Maximize2,
  Sparkles,
  ArrowRight,
  Download,
} from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  badge: string;
  mockupType: 'desktop-overlay' | 'eye-restore' | 'whiteboard' | 'blackboard' | 'area-screenshot' | 'recording-hud';
}

export const GalleryPage: React.FC = () => {
  const { navigate } = useRouter();
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<string>('desktop-overlay');

  const galleryItems: GalleryItem[] = [
    {
      id: 'desktop-overlay',
      title: 'Native Windows Desktop Overlay',
      category: 'Windows Desktop',
      tagline: 'Direct3D hardware-accelerated drawing over any active application.',
      description:
        'The primary interface of ProScreen running on Windows. The floating toolbar stays pinned to your screen while mouse clicks pass directly through to VS Code, Excel, or PowerPoint.',
      badge: '60 FPS Direct3D',
      mockupType: 'desktop-overlay',
    },
    {
      id: 'eye-restore',
      title: 'Eye OFF Mode & Floating Restore Button',
      category: 'Minimal View',
      tagline: 'Epic Pen style collapse: toolbar hides while annotations stay visible.',
      description:
        'When the Eye is turned OFF, the entire toolbar collapses into a single small, sleek floating Eye restore button that can be positioned anywhere. All existing drawings remain visible.',
      badge: 'Epic Pen Style',
      mockupType: 'eye-restore',
    },
    {
      id: 'whiteboard',
      title: 'Interactive Whiteboard Canvas',
      category: 'Presentation Studio',
      tagline: 'Instant white presentation canvas with dot grid and multi-page notes.',
      description:
        'One-click switch to a distraction-free white backdrop. Ideal for mathematics derivations, system diagrams, and online tutoring.',
      badge: 'Multi-Page Sheets',
      mockupType: 'whiteboard',
    },
    {
      id: 'blackboard',
      title: 'Midnight Blackboard Mode',
      category: 'Presentation Studio',
      tagline: 'Deep dark blackboard surface with vibrant neon ink contrast.',
      description:
        'High-contrast blackboard optimized for dark-room presentations, live coding streams, and engineering architectural reviews.',
      badge: 'High-Contrast Neon',
      mockupType: 'blackboard',
    },
    {
      id: 'area-screenshot',
      title: 'Area Screenshot & Instant Clipboard',
      category: 'Capture Tool',
      tagline: 'Pixel-accurate rectangular region selector with automatic PNG copy.',
      description:
        'Drag over any part of your screen. ProScreen captures both the underlying app and your annotations, copying the PNG to your clipboard ready for Ctrl+V.',
      badge: 'Ctrl+V Ready',
      mockupType: 'area-screenshot',
    },
    {
      id: 'recording-hud',
      title: 'Screen Recording Status HUD',
      category: 'Recording Engine',
      tagline: 'Floating duration timer with pause, resume, and lossless WebM export.',
      description:
        'A sleek floating recording HUD showing elapsed recording time and live bitrate status without intruding on your presentation.',
      badge: 'MediaRecorder HUD',
      mockupType: 'recording-hud',
    },
  ];

  const current = galleryItems.find((g) => g.id === selectedGalleryItem) || galleryItems[0];

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Monitor className="w-3.5 h-3.5" />
            <span>High-Definition Interface Showcase</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            Product{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Gallery
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Inspect the high-precision UI components, presentation backdrops, and minimal floating controls of ProScreen.
          </p>
        </div>

        {/* Gallery Navigation Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {galleryItems.map((item) => {
            const isSelected = item.id === selectedGalleryItem;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedGalleryItem(item.id)}
                className={`p-3.5 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-blue-600/20 border-2 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                  {item.category}
                </div>
                <div className="text-xs font-bold leading-snug">{item.title}</div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950/80 text-slate-400 w-fit">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Showcase Stage */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                {current.category}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {current.title}
              </h2>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                {current.description}
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-semibold self-start sm:self-center">
              {current.badge}
            </span>
          </div>

          {/* Visual Simulation Frame */}
          <div className="relative w-full h-[420px] sm:h-[480px] rounded-2xl bg-[#080C1B] border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center p-6 select-none">
            {/* 1. Desktop Overlay Mockup */}
            {current.mockupType === 'desktop-overlay' && (
              <div className="w-full h-full relative rounded-xl bg-slate-900/90 border border-slate-700/80 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      Visual Studio Code — proscreenCore.ts
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">Pass-Through Active</span>
                </div>

                {/* Floating Toolbar Simulated Widget */}
                <div className="absolute top-16 left-8 p-2 rounded-2xl bg-[#090E1D]/95 border border-blue-500/40 shadow-2xl space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    P
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 text-xs font-bold">
                    H
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    A
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-purple-400 text-xs font-bold">
                    T
                  </div>
                  <div className="w-full h-[1px] bg-slate-800" />
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400 text-xs font-bold">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>

                {/* Simulated Annotations over code */}
                <div className="space-y-3 font-mono text-xs text-slate-400 my-auto pl-24">
                  <div className="text-blue-300">
                    // High-Frequency Vector Smoothing Pipeline
                  </div>
                  <div className="relative inline-block">
                    <span className="text-purple-300">const</span> smoothPoints = calculateBezierSpline(rawCoordinates);
                    <div className="absolute -inset-1 border-2 border-emerald-400 rounded-lg pointer-events-none" />
                  </div>
                  <div className="text-amber-300">
                    → Vector arrowhead angles snapped to 45°
                  </div>
                </div>

                <div className="text-right text-xs font-mono text-slate-400">
                  Native Windows Electron Direct3D Canvas
                </div>
              </div>
            )}

            {/* 2. Eye OFF Restore Button Mockup */}
            {current.mockupType === 'eye-restore' && (
              <div className="w-full h-full relative rounded-xl bg-slate-900/90 border border-slate-700/80 p-6 flex flex-col justify-between">
                <div className="text-xs font-mono text-slate-400">
                  Desktop Mode (Eye OFF Mode Active — Alt+Shift+P)
                </div>

                {/* Drawings still remain visible */}
                <div className="my-auto text-center space-y-4">
                  <div className="inline-block p-4 rounded-2xl border-2 border-dashed border-sky-400/80 bg-sky-950/30 text-sky-200 font-mono text-sm">
                    ★ All drawings remain completely visible on screen
                  </div>
                </div>

                {/* Sleek Floating Restore Button */}
                <div className="absolute top-1/3 left-1/4 p-2 bg-[#090E1D] border-2 border-blue-500 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center gap-2 animate-bounce">
                  <span className="p-2 rounded-full bg-blue-600 text-white">
                    <Eye className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-white pr-3">
                    Click to Restore ProScreen
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Zero mouse clicks intercepted outside the small button area
                </div>
              </div>
            )}

            {/* 3. Whiteboard Mockup */}
            {current.mockupType === 'whiteboard' && (
              <div className="w-full h-full relative rounded-xl bg-white p-6 flex flex-col justify-between text-slate-800 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-xs font-mono font-bold text-blue-600">
                    Whiteboard Presentation Canvas — Sheet 1 of 3
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-mono font-bold">
                    PNG Export Ready
                  </span>
                </div>

                <div className="my-auto space-y-2 text-center">
                  <div className="text-2xl font-bold font-mono text-blue-900">
                    λ₁ = (A - λI)v = 0
                  </div>
                  <div className="text-sm text-slate-500">
                    Clean, non-distracting white surface with subtle dot grid matrix
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400 text-right">
                  Toggle back to live desktop instantly with Alt+W
                </div>
              </div>
            )}

            {/* 4. Blackboard Mockup */}
            {current.mockupType === 'blackboard' && (
              <div className="w-full h-full relative rounded-xl bg-[#13161C] p-6 flex flex-col justify-between text-slate-200 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Midnight Blackboard Mode — Engineering Chalkboard
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-xs font-mono font-bold">
                    High Contrast
                  </span>
                </div>

                <div className="my-auto space-y-3 pl-8">
                  <div className="text-lg font-mono text-cyan-300">
                    f(x) = ∫₀^∞ e^(-x²) dx = √π / 2
                  </div>
                  <div className="text-sm font-mono text-amber-300">
                    → Neon chisel highlighter blends cleanly over black surface
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400 text-right">
                  Alt+B Instant Shortcut
                </div>
              </div>
            )}

            {/* 5. Area Screenshot Mockup */}
            {current.mockupType === 'area-screenshot' && (
              <div className="w-full h-full relative rounded-xl bg-slate-900 p-6 flex flex-col justify-between">
                <div className="text-xs font-mono text-slate-400">
                  Area Selector (Alt+Shift+S)
                </div>

                {/* Selection Box */}
                <div className="my-auto mx-auto w-3/4 h-48 border-2 border-dashed border-blue-400 bg-blue-500/10 rounded-lg relative flex items-center justify-center">
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-mono">
                    840 × 420 px
                  </div>
                  <span className="text-xs font-bold text-white bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
                    Release to copy PNG to clipboard
                  </span>
                </div>

                <div className="text-xs font-mono text-emerald-400 text-right">
                  Clipboard Ready (Ctrl+V)
                </div>
              </div>
            )}

            {/* 6. Recording HUD Mockup */}
            {current.mockupType === 'recording-hud' && (
              <div className="w-full h-full relative rounded-xl bg-slate-900 p-6 flex flex-col justify-between">
                <div className="text-xs font-mono text-slate-400">
                  MediaRecorder Video Capture (Alt+Shift+R)
                </div>

                {/* Floating HUD status bar */}
                <div className="my-auto mx-auto p-3.5 rounded-2xl bg-slate-950 border-2 border-rose-500/80 shadow-2xl flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-mono text-sm font-bold text-white">REC 00:14:28</span>
                  <div className="h-4 w-[1px] bg-slate-800" />
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                    1080p @ 60 FPS
                  </span>
                  <button className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-200 font-semibold hover:bg-slate-700">
                    Pause
                  </button>
                  <button className="px-2.5 py-1 rounded bg-rose-600 text-xs text-white font-bold hover:bg-rose-500">
                    Stop & Save
                  </button>
                </div>

                <div className="text-xs font-mono text-slate-400 text-right">
                  High-Bitrate WebM Video Pipeline
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <span className="text-xs text-slate-400">
              Want to test the actual live drawing engine right in your browser?
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('playground')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Interactive Studio</span>
              </button>
              <button
                onClick={() => navigate('download')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Windows App</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
