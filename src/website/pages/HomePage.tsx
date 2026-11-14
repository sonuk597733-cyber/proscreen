import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { BentoFeatures } from '../components/BentoFeatures';
import { PlatformComparison } from '../components/PlatformComparison';
import { WorkflowShowcase } from '../components/WorkflowShowcase';
import { FAQS } from '../constants';
import { useRouter } from '../router';
import { Download, ChevronRight, HelpCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <HeroSection />

      {/* Feature Bento Grid */}
      <BentoFeatures />

      {/* Platform Comparison */}
      <PlatformComparison />

      {/* Workflow Showcase */}
      <WorkflowShowcase />

      {/* FAQ Quick Section */}
      <section className="py-20 lg:py-28 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Questions & Answers</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Got questions about Pointer mode, Windows installation, or the Chrome extension?
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.slice(0, 5).map((faq) => (
              <details
                key={faq.id}
                className="group rounded-2xl bg-slate-900/60 border border-slate-800 p-5 open:bg-slate-900/90 open:border-blue-500/40 transition-all duration-200"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                  <span>{faq.question}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 group-hover:text-white transition-transform" />
                </summary>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed pl-1 border-t border-slate-800/80 pt-3">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => navigate('faq')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>View all questions in the Knowledge Base</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-8 sm:p-14 overflow-hidden shadow-2xl shadow-blue-500/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            <div className="relative z-10 space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/20 text-white">
                <Sparkles className="w-3.5 h-3.5" />
                Free Production Software
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Your Screen is Waiting. Start Annotating Today.
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Download ProScreen for Windows or load the Chrome Extension. No accounts, no credit cards, zero telemetry.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('download')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-100"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows</span>
              </button>
              <button
                onClick={() => navigate('playground')}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-900/60 hover:bg-blue-900/80 border border-white/20 text-white font-semibold text-sm transition-all"
              >
                <span>Try In Browser</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
