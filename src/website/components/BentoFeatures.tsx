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
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Timer,
  Eye,
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section id="features" className="py-20 lg:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Recording & Annotation Engine</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Engineered for Flow.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Built for Performance.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Every layer of ProScreen—from Direct3D hardware drawing to DXGI 60 FPS video capture and dual-channel audio mixing—is built for instant responsiveness and zero stutter.
          </p>
        </div>

        {/* Bento Grid: 10 Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Screen Recording (Wide 2-col) */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-8 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                      Mode 1 • Hardware Accelerated
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Full Screen 60 FPS Recording
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-semibold">
                  DXGI Zero-Copy
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Capture your entire desktop display at fluid 60 frames per second. Powered by Windows DXGI Desktop Duplication and MediaFoundation GPU video encoding, ProScreen bypasses CPU frame readbacks to eliminate stutter, dropped frames, and system lag.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">FRAME RATE</div>
                  <div className="text-white font-bold text-sm">Solid 60 FPS</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">MAX RESOLUTION</div>
                  <div className="text-white font-bold text-sm">4K Ultra HD</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">CAPTURE PIPELINE</div>
                  <div className="text-emerald-400 font-bold text-sm">Direct3D 11</div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                Multi-Monitor Coordinate Safe
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                DPI Scaling Aware
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                Alt+Shift+R Shortcut
              </span>
            </div>
          </div>

          {/* 2. Window Recording */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                  <AppWindow className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[11px] font-mono font-semibold">
                  Mode 2
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Target Window Recording</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Isolate and record a specific application window—such as VS Code, PowerPoint, Excel, or Chrome. Background desktop clutter, taskbars, and notifications are automatically excluded from the video stream.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Automatic window tracking</span>
              <span className="font-mono text-sky-400">Zero Background Leak</span>
            </div>
          </div>

          {/* 3. Tab Recording */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold">
                  Mode 3
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Browser Tab Recording</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Record active browser tabs directly with high-fidelity internal web audio capture. Ideal for recording web app walkthroughs, YouTube analyses, and SaaS customer demos with crystal clarity.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Internal Web Audio Sync</span>
              <span className="font-mono text-amber-400">Chrome MV3 Ready</span>
            </div>
          </div>

          {/* 4. Area Recording */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Crop className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold">
                  Mode 4
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Custom Area Recording</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Drag to frame any rectangular section of your screen. An interactive crop selector displays live pixel width and height, capturing only the exact bounding box you specify.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Interactive Crop Handles</span>
              <span className="font-mono text-emerald-400">Pixel-Exact Coordinates</span>
            </div>
          </div>

          {/* 5. Dual-Track Studio Audio */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Volume2 className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-semibold">
                  Studio Audio
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Dual-Track Audio Mixing</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Simultaneously records system loopback audio and voice microphone. Features 48 kHz stereo sampling, microphone gain staging, high-pass rumble filter, and a transparent brickwall peak limiter to stop clipping.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>48 kHz Broadcast Quality</span>
              <span className="font-mono text-indigo-400">Peak Limiter Active</span>
            </div>
          </div>

          {/* 6. Floating Studio Toolbar & Eye Restore */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-mono font-semibold">
                  Desktop UX
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Floating Toolbar & Eye Restore</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Movable, multi-monitor-safe desktop toolbar that snaps to screen edges. Click the Eye button (or Alt+Shift+P) to collapse the entire toolbar into an unobtrusive floating restore button while keeping your annotations live.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Draggable Eye Restore</span>
              <span className="font-mono text-purple-400">Alt+Shift+P</span>
            </div>
          </div>

          {/* 7. Live Recording Controls */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] font-mono font-semibold">
                  Live HUD
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Recording Controls & Timer</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Sleek bottom pill HUD displays real-time recording elapsed timer, pause, resume, cancel, and stop buttons. Excluded from the final video capture using content protection flags.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Pause / Resume without drop</span>
              <span className="font-mono text-rose-400">Zero In-Video Artifacts</span>
            </div>
          </div>

          {/* 8. Video Preview & In-App Playback Player */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[11px] font-mono font-semibold">
                  Instant Player
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Video Preview & Playback</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Immediately inspect your recorded clip in the native preview modal. Features smooth timeline scrubbing via HTTP 206 partial streaming, speed control (0.5x, 1x, 1.25x, 1.5x, 2x), -5s/+5s jumps, and volume toggles.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Range Request Fast Seek</span>
              <span className="font-mono text-cyan-400">0.5x–2.0x Speeds</span>
            </div>
          </div>

          {/* 9. Save & Export */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[11px] font-mono font-semibold">
                  Export
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Native Save & WebM / MP4</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Direct buffer-first disk writing with injected EBML duration tags so videos seek instantly in Windows Media Player and VLC. Supports automatic background saving and native Windows "Save As" file picker.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>EBML Duration Injection</span>
              <span className="font-mono text-teal-400">WebM & MP4</span>
            </div>
          </div>

          {/* 10. Annotation Tools (Wide 3-col span) */}
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-8 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                      Annotation Studio
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Precision On-Screen Drawing & Markup
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-semibold">
                  Alt+P / Alt+H / Alt+A
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Draw freehand ink with smooth Bezier interpolation, highlight text with semi-transparent chisel highlighters, place directional arrows with 45° angle snapping, and insert editable text notes. Includes a fading ink countdown timer that automatically erases markup after a set duration.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-blue-400 font-bold">Pen & Bezier</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">1px – 48px width</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-amber-400 font-bold">Chisel Highlighter</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Semi-transparent</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-emerald-400 font-bold">Vector Arrows</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">45° angle snapping</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-purple-400 font-bold">Geometric Shapes</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Rectangles & Circles</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-sky-400 font-bold">Fading Ink Timer</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Auto-erases notes</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-rose-400 font-bold">White/Blackboard</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Alt+W / Alt+B</div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 mt-6">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero latency mouse click-through in Pointer mode (Alt+V)</span>
              </div>
              <button
                onClick={() => navigate('home', 'how-it-works')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>See How It Works</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
