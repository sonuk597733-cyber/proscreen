import React from 'react';
import { useRouter } from '../router';
import { PRICING_OFFER } from '../constants';
import {
  Check,
  Sparkles,
  Download,
  ShieldCheck,
  Calendar,
  CreditCard,
  Zap,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const PricingSection: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section id="pricing" className="py-20 lg:py-28 relative scroll-mt-20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-blue-500/10 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Introductory Offer</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Simple, Transparent{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Pro Pricing
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Get complete access to the full ProScreen desktop recording & annotation engine free for 6 months. No credit card required.
          </p>
        </div>

        {/* Pricing Card Stage */}
        <div className="max-w-4xl mx-auto">
          {/* Main Card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-[#0C1226] to-slate-950 border-2 border-blue-500/50 p-8 sm:p-12 shadow-2xl shadow-blue-900/20 overflow-hidden">
            {/* Top Badge Banner */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-sky-500 text-white text-xs font-bold font-mono px-6 py-1.5 rounded-bl-2xl shadow-md uppercase tracking-wider">
              {PRICING_OFFER.introductoryLabel}
            </div>

            <div className="space-y-8">
              {/* Plan Header & Cost Highlight */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
                      {PRICING_OFFER.planName}
                    </h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active Promotion
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-300">
                    {PRICING_OFFER.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/90 text-right md:text-right shrink-0">
                  <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                    Current Trial Price
                  </div>
                  <div className="flex items-baseline justify-end gap-1 mt-1">
                    <span className="text-4xl sm:text-5xl font-black text-white">$0</span>
                    <span className="text-sm font-semibold text-slate-400">/ first 6 months</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Then <span className="text-white font-bold">$1/month</span> afterward
                  </div>
                </div>
              </div>

              {/* Visual Timeline Transition */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Subscription Timeline & Transition</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Step 1: First 6 Months */}
                  <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-300">
                        {PRICING_OFFER.timeline[0].period}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-200">
                        {PRICING_OFFER.timeline[0].badge}
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      {PRICING_OFFER.timeline[0].price}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {PRICING_OFFER.timeline[0].description}
                    </p>
                  </div>

                  {/* Step 2: After Month 6 */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-200">
                        {PRICING_OFFER.timeline[1].period}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300">
                        {PRICING_OFFER.timeline[1].badge}
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      {PRICING_OFFER.timeline[1].price}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {PRICING_OFFER.timeline[1].description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Features Included Checklist */}
              <div className="space-y-4 pt-2">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Everything Included in ProScreen Pro:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                  {PRICING_OFFER.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-slate-200">
                      <div className="p-1 rounded bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action CTA & Legal Clarifications */}
              <div className="pt-6 border-t border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    onClick={() => navigate('download', 'download')}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download ProScreen Free (6 Months)</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No credit card required to download today</span>
                  </div>
                </div>

                {/* Explicit Subscription & Billing Disclosure */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-3 leading-relaxed">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300">Subscription Terms Disclosure: </span>
                    {PRICING_OFFER.disclaimer} The $1/month price is a monthly fee following your six-month promotional trial (not a one-time charge). You will never be charged without explicit confirmation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
