import React, { useState } from 'react';
import { useRouter } from '../router';
import {
  Video,
  Sliders,
  PlayCircle,
  Eye,
  Settings,
  Clock,
  Sparkles,
  CheckCircle2,
  Download,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

interface ShowcaseItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  imageSrc: string;
  badge: string;
  highlights: string[];
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'recording-preview',
    title: 'Video Preview & Playback Modal',
    shortDesc: 'Instant in-app inspection of your recorded video with frame-accurate timeline scrubbing.',
    fullDesc:
      'The moment you complete a recording, the Recording Preview Modal opens instantly without leaving your workflow. Powered by HTTP 206 byte-range streaming, the custom player supports instant timeline scrubbing, 0.5x to 2x speed adjustment, -5s/+5s jumps, replay, and volume controls.',
    imageSrc: '/assets/screenshots/r1-recording-preview.png',
    badge: 'Zero Buffering Delay',
    highlights: [
      'Interactive range scrubber for 0ms seek response',
      '0.5x, 1x, 1.25x, 1.5x, and 2x playback speed toggles',
      'One-click "Save As" native Windows file picker dialog',
      'Instant "Done" or "Discard" cleanup with resource revocation',
    ],
  },
  {
    id: 'recording-popout',
    title: '4-Mode Capture Selection Popout',
    shortDesc: 'Pick between Screen, Window, Tab, or Custom Area with dual-track audio.',
    fullDesc:
      'The recording mode popout attaches cleanly to your floating toolbar. Choose between full-screen monitor capture, isolated application window tracking, browser tab recording, or custom rectangular area framing. Toggle system audio and microphone inputs with one click.',
    imageSrc: '/assets/screenshots/r1-recorder-popout.png',
    badge: 'Hardware Zero-Copy',
    highlights: [
      'Screen, Window, Tab, and Area capture modes',
      '60 FPS / 30 FPS / 120 FPS high-performance options',
      'Dual-track audio: System loopback + Voice microphone',
      'Auto-clamping popout that never overflows screen edges',
    ],
  },
  {
    id: 'floating-toolbar',
    title: 'Floating Desktop Studio Toolbar',
    shortDesc: 'Sleek, movable desktop toolbar that docks to any screen edge.',
    fullDesc:
      'Position the floating studio toolbar anywhere on your primary or secondary monitors. Access freehand pens, highlighters, arrows, text, rectangle and circle shapes, undo/redo, and color brush palettes with instant hotkeys.',
    imageSrc: '/assets/screenshots/r1-expanded-toolbar.png',
    badge: 'Epic Pen Style',
    highlights: [
      'Multi-monitor coordinate safe with negative X/Y support',
      '32 color presets plus custom RGB/HEX color picker',
      'Smooth stroke width slider from 1px to 48px',
      'Collapses to an unobtrusive floating restore Eye with Alt+Shift+P',
    ],
  },
  {
    id: 'fading-timer',
    title: 'Fading Ink Countdown Timer',
    shortDesc: 'Temporary markups that disappear automatically after a set duration.',
    fullDesc:
      'Perfect for live presentations and webinars where you want to highlight a button or paragraph without cluttering your screen with permanent ink. The fading ink timer tracks active annotations and smoothly fades them out after 3, 5, 10, or 20 seconds.',
    imageSrc: '/assets/screenshots/r1-timer-popout.png',
    badge: 'Auto-Clean Canvas',
    highlights: [
      'Preset durations: 3s, 5s, 10s, 20s, or custom countdown',
      'Decays opacity smoothly from 100% to 0% after deadline',
      'Disarms cleanly if cancelled before expiration',
      'Keeps permanent annotations intact while expiring timed ink',
    ],
  },
  {
    id: 'settings-dashboard',
    title: 'Settings & Codec Engine Dashboard',
    shortDesc: 'Fine-tune video quality, audio thresholds, hardware switches, and keybindings.',
    fullDesc:
      'Take complete control over your recording pipeline. Choose between WebM and MP4 codecs, adjust video bitrates from standard to ultra-pro, configure microphone gain staging, customize global shortcuts, and toggle hardware acceleration flags.',
    imageSrc: '/assets/screenshots/r2-settings-dashboard.png',
    badge: 'Power User Ready',
    highlights: [
      'WebM (VP8/VP9) and MP4 (H.264) container selection',
      'Microphone gain slider with live input level meter',
      'Global keyboard shortcuts configuration with conflict detector',
      'DirectX Direct3D 11 hardware acceleration diagnostics',
    ],
  },
];

export const ProductDemonstration: React.FC = () => {
  const [activeId, setActiveId] = useState<string>(SHOWCASE_ITEMS[0].id);
  const { navigate } = useRouter();

  const activeItem = SHOWCASE_ITEMS.find((item) => item.id === activeId) || SHOWCASE_ITEMS[0];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Video className="w-3.5 h-3.5" />
            <span>Product Showcase</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            See the Real App{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              In Action
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Real desktop screenshots from the official ProScreen application on Windows 11. Designed from the ground up to feel fast, native, and unobtrusive.
          </p>
        </div>

        {/* Navigation Selector Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {SHOWCASE_ITEMS.map((item) => {
            const isSelected = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Detail Showcase Card */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Description & Specs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {activeItem.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white pt-1">
                  {activeItem.title}
                </h3>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {activeItem.fullDesc}
              </p>

              {/* Highlights Checklist */}
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Verified In-App Capabilities:
                </div>
                {activeItem.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('download', 'download')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ProScreen Free</span>
                </button>
                <button
                  onClick={() => navigate('home', 'pricing')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>See 6-Month Offer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: High-Res Real Screenshot Presentation */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl bg-slate-950/90 border border-slate-800 p-2 sm:p-3 shadow-2xl overflow-hidden group">
                {/* Mock Window Titlebar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 mb-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="text-slate-300 ml-1.5 text-[11px] truncate max-w-[200px] sm:max-w-none">
                      ProScreen Studio — {activeItem.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Official Windows 11 Capture</span>
                </div>

                <div className="relative flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden">
                  <img
                    src={activeItem.imageSrc}
                    alt={activeItem.title}
                    className="w-full max-h-[460px] object-contain rounded-lg shadow-inner transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
