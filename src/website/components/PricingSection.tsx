import React from 'react';
import { useRouter } from '../router';
import { Check, Download, ShieldCheck } from 'lucide-react';

type Feature = {
  title: string;
  detail: string;
};

const FEATURES: Feature[] = [
  {
    title: '60 FPS recording',
    detail: 'Hardware-accelerated capture with DXGI and Direct3D.',
  },
  {
    title: 'Capture anything',
    detail: 'Full desktop, a single window, a browser tab or a custom area.',
  },
  {
    title: 'Two audio tracks',
    detail: 'System sound and your microphone, recorded together.',
  },
  {
    title: 'Floating studio toolbar',
    detail: 'Draw with high-contrast, dual-tone pens while you record.',
  },
  {
    title: 'Built-in player',
    detail: 'Scrub the timeline and play back at 0.5x to 2x speed.',
  },
  {
    title: 'Fading ink timer',
    detail: 'A countdown that fades away, so live presentations stay clean.',
  },
  {
    title: 'WebM and MP4 export',
    detail: 'Instant export with duration metadata, so every video seeks properly.',
  },
  {
    title: '100% local',
    detail: 'No telemetry, no watermarks and no accounts.',
  },
];

const FREE_MONTHS = 6;
const PREVIEW_PAID_MONTHS = 3;
const PAID_SEGMENT_STYLES = ['bg-white/25', 'bg-white/15', 'bg-white/10'];

/* A bar of monthly segments: six solid ones for the free period, then fading ones for what follows. */
const MonthsBar: React.FC = () => (
  <div
    role="img"
    aria-label={`The first ${FREE_MONTHS} months are free. From month ${FREE_MONTHS + 1} onward it costs 1 dollar a month.`}
    className="flex gap-1.5"
  >
    {Array.from({ length: FREE_MONTHS + PREVIEW_PAID_MONTHS }).map((_, i) => {
      const isFree = i < FREE_MONTHS;
      return (
        <span
          key={i}
          className={`h-3.5 flex-1 rounded-full ${
            isFree
              ? 'bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
              : PAID_SEGMENT_STYLES[i - FREE_MONTHS]
          }`}
        />
      );
    })}
  </div>
);

export const PricingSection: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section
      id="pricing"
      className="py-20 lg:py-28 bg-white scroll-mt-18 border-b border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="max-w-2xl mb-12 lg:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Simple, honest pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Use the complete ProScreen recording and annotation engine free for your first six
            months. After that, it is one dollar a month.
          </p>
        </div>

        {/* One card, two halves: price on the left, what you get on the right */}
        <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-xl shadow-slate-900/5 grid grid-cols-1 lg:grid-cols-5">
          {/* Price panel */}
          <div className="lg:col-span-2 relative overflow-hidden bg-slate-950 text-white p-7 sm:p-9 flex flex-col">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-28 -left-20 w-80 h-80 rounded-full bg-sky-500/20 blur-3xl"
            />

            <div className="relative flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold">ProScreen Pro</h3>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                6 months free
              </span>
            </div>

            <p className="relative mt-3 text-sm text-slate-400 leading-relaxed">
              Recording, annotation and studio audio, for desktop and the web.
            </p>

            {/* Price */}
            <div className="relative mt-8">
              <div className="flex items-end gap-3">
                <span className="text-7xl sm:text-8xl font-extrabold leading-none tracking-tight">
                  $0
                </span>
                <span className="pb-2 text-base text-slate-300 leading-snug">
                  for your first
                  <br />
                  6 months
                </span>
              </div>
              <p className="mt-4 text-base text-slate-200">
                Then <span className="font-bold text-sky-300">$1 a month</span>. Cancel anytime.
              </p>
            </div>

            {/* Timeline */}
            <div className="relative mt-8 space-y-4">
              <MonthsBar />

              <dl className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full bg-sky-400" />
                    <div>
                      <dt className="font-semibold text-white">Months 1 to 6</dt>
                      <dd className="text-slate-400">Download now, no credit card needed.</dd>
                    </div>
                  </div>
                  <span className="font-semibold text-sky-300">$0</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full bg-white/25" />
                    <div>
                      <dt className="font-semibold text-white">Month 7 onward</dt>
                      <dd className="text-slate-400">Cancel with one click.</dd>
                    </div>
                  </div>
                  <span className="font-semibold text-slate-200 whitespace-nowrap">
                    $1 / month
                  </span>
                </div>
              </dl>
            </div>

            {/* CTA */}
            <div className="relative mt-auto pt-10 space-y-4">
              <button
                type="button"
                onClick={() => navigate('home', 'download')}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-sky-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <Download className="w-5 h-5" />
                <span>Download free for 6 months</span>
              </button>

              <p className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  No credit card, no surprise charges. Get the Windows installer or the portable
                  build directly.
                </span>
              </p>
            </div>
          </div>

          {/* Features panel */}
          <div className="lg:col-span-3 p-7 sm:p-9">
            <h3 className="text-xl font-bold text-slate-900">What you get</h3>
            <p className="mt-1 text-sm text-slate-500">
              Everything in ProScreen Pro, from the first day.
            </p>

            <ul className="mt-6 divide-y divide-slate-100">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{feature.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                      {feature.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};