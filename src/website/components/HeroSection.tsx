import React, { useRef, useState } from 'react';
import { useRouter } from '../router';
import {
  Download,
  Monitor,
  Gift,
  ShieldCheck,
  Play,
  PenTool,
  Crop,
  Timer,
  Minus,
  Square,
  X,
} from 'lucide-react';

type ShotKey = 'preview' | 'toolbar' | 'modes' | 'timer';

type Shot = {
  key: ShotKey;
  icon: React.ReactNode;
  title: string;
  src: string;
  caption: string;
};

const SHOTS: Shot[] = [
  {
    key: 'preview',
    icon: <Play className="w-4 h-4" />,
    title: 'Recording studio and player',
    src: './assets/screenshots/r1-recording-preview.png',
    caption: 'A full video player with seeking, replay and instant WebM or MP4 export.',
  },
  {
    key: 'toolbar',
    icon: <PenTool className="w-4 h-4" />,
    title: 'Floating studio toolbar',
    src: './assets/screenshots/r1-expanded-toolbar.png',
    caption: 'A draggable, collapsible dock with high-contrast pens, shapes and color pickers.',
  },
  {
    key: 'modes',
    icon: <Crop className="w-4 h-4" />,
    title: '4 native capture modes',
    src: './assets/screenshots/r1-recorder-popout.png',
    caption: 'Record the screen, a window, a tab or an area, with dual-track audio.',
  },
  {
    key: 'timer',
    icon: <Timer className="w-4 h-4" />,
    title: 'Fading ink timer',
    src: './assets/screenshots/r1-timer-popout.png',
    caption: 'A live countdown for self-expiring annotations that keep your audience focused.',
  },
];

const FACTS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Monitor className="w-4 h-4 text-sky-600" />, text: 'Windows 11 and 10 (64-bit)' },
  { icon: <Gift className="w-4 h-4 text-emerald-600" />, text: 'First 6 months free' },
  { icon: <ShieldCheck className="w-4 h-4 text-slate-500" />, text: 'No credit card needed' },
];

export const HeroSection: React.FC = () => {
  const { navigate } = useRouter();
  const [active, setActive] = useState<ShotKey>('preview');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeShot = SHOTS.find((s) => s.key === active) ?? SHOTS[0];

  /* Arrow keys, Home and End move between tabs */
  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % SHOTS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
      next = (index - 1 + SHOTS.length) % SHOTS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SHOTS.length - 1;
    else return;

    e.preventDefault();
    const target = SHOTS[next];
    setActive(target.key);
    tabRefs.current[target.key]?.focus();
  };

  return (
    <section className="bg-white pt-14 pb-20 md:pt-20 md:pb-28 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline on the left, actions on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          <div className="lg:col-span-7">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
              Capture your screen.
              <br className="hidden sm:block" /> Make every moment clear.
            </h1>
            <p className="mt-6 max-w-xl text-lg sm:text-xl text-slate-600 leading-relaxed">
              Record, explain and share your screen with a simple desktop app built for everyday
              work.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('home', 'download')}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-sky-500 px-7 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                <Download className="w-5 h-5" />
                <span>Download for Windows</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('home', 'features')}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-base font-semibold text-slate-800 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                Explore features
              </button>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              {FACTS.map((fact) => (
                <li key={fact.text} className="flex items-center gap-2">
                  {fact.icon}
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Product showcase */}
        <div className="relative mt-14 lg:mt-16 overflow-hidden rounded-3xl bg-slate-950 p-4 sm:p-6 lg:p-8 shadow-2xl shadow-slate-900/20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/3 w-[28rem] h-80 rounded-full bg-sky-500/20 blur-3xl"
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
            {/* Tabs */}
            <div className="lg:col-span-4">
              <div
                role="tablist"
                aria-label="ProScreen features"
                className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 snap-x"
              >
                {SHOTS.map((shot, index) => {
                  const isActive = shot.key === active;
                  return (
                    <button
                      key={shot.key}
                      ref={(el) => {
                        tabRefs.current[shot.key] = el;
                      }}
                      id={`hero-tab-${shot.key}`}
                      role="tab"
                      type="button"
                      aria-selected={isActive}
                      aria-controls="hero-panel"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActive(shot.key)}
                      onKeyDown={(e) => onTabKeyDown(e, index)}
                      className={`snap-start shrink-0 lg:shrink text-left rounded-2xl px-4 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        isActive
                          ? 'bg-white/10 ring-1 ring-white/15 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-3 whitespace-nowrap lg:whitespace-normal">
                        <span
                          className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isActive ? 'bg-sky-500 text-slate-950' : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          {shot.icon}
                        </span>
                        <span className="font-semibold">{shot.title}</span>
                      </span>
                      {isActive && (
                        <span className="hidden lg:block mt-2 pl-11 text-sm leading-relaxed text-slate-300 font-normal">
                          {shot.caption}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Windows-style app frame */}
            <div className="lg:col-span-8">
              <div
                role="tabpanel"
                id="hero-panel"
                aria-labelledby={`hero-tab-${active}`}
                className="overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10 shadow-2xl shadow-black/40"
              >
                {/* Title bar */}
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 pl-3">
                  <div className="flex items-center gap-2.5 min-w-0 py-2">
                    <span className="flex w-5 h-5 shrink-0 items-center justify-center rounded bg-sky-500 text-slate-950">
                      <Monitor className="w-3 h-3" />
                    </span>
                    <span className="truncate text-xs font-medium text-slate-300">
                      ProScreen Studio
                      <span className="text-slate-500"> / {activeShot.title}</span>
                    </span>
                  </div>
                  <div aria-hidden="true" className="flex shrink-0 text-slate-400">
                    <span className="flex w-11 h-9 items-center justify-center">
                      <Minus className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex w-11 h-9 items-center justify-center">
                      <Square className="w-3 h-3" />
                    </span>
                    <span className="flex w-11 h-9 items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Screenshots are stacked and cross-fade, so switching never flashes */}
                <div className="bg-slate-800/60 p-3 sm:p-5">
                  <div className="relative aspect-[16/10] w-full">
                    {SHOTS.map((shot) => (
                      <img
                        key={shot.key}
                        src={shot.src}
                        alt={shot.key === active ? shot.title : ''}
                        aria-hidden={shot.key !== active}
                        loading={shot.key === 'preview' ? 'eager' : 'lazy'}
                        className={`absolute inset-0 h-full w-full rounded-lg object-contain transition-opacity duration-300 ${
                          shot.key === active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Caption for small screens, where the tab list has no room for it */}
              <p className="lg:hidden mt-4 text-sm leading-relaxed text-slate-300">
                {activeShot.caption}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};