import React from 'react';
import { useRouter } from '../router';
import {
  Monitor,
  AppWindow,
  Globe,
  Crop,
  Volume2,
  Sliders,
  PlayCircle,
  Film,
  Download,
  PenTool,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Timer,
  Layers,
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section id="features" className="py-20 lg:py-28 bg-white scroll-mt-18 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              VERIFIED ARCHITECTURE
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Built for people who explain things every day
          </h2>

          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            ProScreen pairs high-frame-rate screen recording with real-time on-screen annotation, giving presenters and educators the exact tools needed for smooth presentations.
          </p>
        </div>

        {/* Alternating Feature Rows */}
        <div className="space-y-24">
          {/* Row 1: Screen & Window Recording (Text Left, Image Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Monitor className="w-4 h-4" />
                <span>Modes 1 & 2 • Full Screen & Window Isolation</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Smooth 60 FPS screen and window capture
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Capture your entire desktop or isolate a single application window with zero cursor flicker and zero dropped frames. Direct3D hardware acceleration guarantees smooth scrolling and fluid video.
              </p>
              <ul className="space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Hardware-accelerated 60 FPS capture with DXGI zero-copy pipeline</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Target specific application windows without recording background clutter</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Automatic resolution detection with support for 1080p, 1440p, and 4K</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src="./assets/screenshots/r1-recorder-popout.png"
                  alt="ProScreen 4 Capture Modes"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Tab & Area Selection (Image Left, Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-neutral-200/90 bg-neutral-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src="./assets/screenshots/r1-screenshot-modal.png"
                  alt="ProScreen Area and Snapshot Selection"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Crop className="w-4 h-4" />
                <span>Modes 3 & 4 • Tab Isolation & Area Cropping</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Record custom screen regions and browser tabs
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Draw a rectangle over any section of your screen to record only what matters, or isolate a browser tab cleanly with pure HTML canvas sub-pixel cropping.
              </p>
              <ul className="space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Interactive draggable crosshair selection with real-time dimension readout</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Clean browser tab isolation without URL bars or personal bookmarks</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Instant high-resolution snapshot exports with one click</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 3: Dual-Track Audio Recording (Text Left, Image Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Volume2 className="w-4 h-4" />
                <span>Audio Engine • Studio Mixer</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Crystal-clear dual-track studio audio
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Simultaneously record system audio (YouTube, Zoom, meetings, games) and microphone voice narration with hardware gain control and real-time peak limiting to prevent clipping.
              </p>
              <ul className="space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>System audio loopback capture with perfect lip-sync synchronization</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Microphone gain staging with built-in voice compressor and limiter</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>4 flexible audio configurations: Both, Mic Only, System Only, or Mute</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src="./assets/screenshots/r2-settings-dashboard.png"
                  alt="ProScreen Settings and Audio Engine"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Floating Studio Toolbar & Annotation Tools (Image Left, Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-neutral-200/90 bg-neutral-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src="./assets/screenshots/r1-expanded-toolbar.png"
                  alt="ProScreen Floating Toolbar and Color Picker"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <PenTool className="w-4 h-4" />
                <span>Annotation Studio • Direct3D Pass-Through</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Movable floating toolbar & live drawing tools
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Draw directly over any live Windows app, presentation slide, or browser tab. The floating dock can be moved anywhere, docked to the screen edges, or collapsed into a discreet Floating Eye button.
              </p>
              <ul className="space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>High-contrast pens, chisel highlighters, arrows, rectangles, and text labels</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Sub-millisecond input response with anti-aliased Bézier curve smoothing</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Dual-tone high-contrast cursors for perfect visibility on light and dark backgrounds</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 5: In-App Video Player & Recording Preview (Text Left, Image Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <PlayCircle className="w-4 h-4" />
                <span>Instant Review • Integrated Player</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Built-in video player with scrub timeline
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Review your recording instantly without opening third-party video players. Scrub through the interactive timeline, adjust playback speed from 0.5x to 2x, replay key segments, or jump -5s / +5s.
              </p>
              <ul className="space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Full control suite: Play/Pause, Seek, -5s, +5s, Replay, and Fullscreen</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Multi-speed playback: 0.5x, 1x, 1.25x, 1.5x, and 2x speed steps</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Native "Open in Player" and "Open Folder" desktop shortcut actions</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src="./assets/screenshots/r1-recording-preview.png"
                  alt="ProScreen Recording Preview and Video Player"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Row 6: Fading Ink Countdown Timer & Native Export (Image Left, Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-neutral-200/90 bg-neutral-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src="./assets/screenshots/r1-timer-popout.png"
                  alt="ProScreen Fading Ink Timer Popout"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Timer className="w-4 h-4" />
                <span>Presentation Flow • Fading Ink & Export</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Self-expiring ink timer & instant seeking export
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Keep presentation screens clean with fading ink that automatically vanishes after your chosen duration. When finished, save instantly with injected EBML duration tags for zero-delay seeking in any player.
              </p>
              <ul className="space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Adjustable countdown durations with smooth alpha fade-out transitions</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Injected container metadata guarantees instant timeline scrubbing in VLC and browsers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>100% offline file finalization directly to your local Videos folder</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
