import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { BentoFeatures } from '../components/BentoFeatures';
import { ProductDemonstration } from '../components/ProductDemonstration';
import { UseCasesSection } from '../components/UseCasesSection';
import { PlatformComparison } from '../components/PlatformComparison';
import { TrustValueSection } from '../components/TrustValueSection';
import { PricingSection } from '../components/PricingSection';
import { DownloadSection } from '../components/DownloadSection';
import { FAQSection } from '../components/FAQSection';
import { useRouter } from '../router';
import { Download, Sparkles, ShieldCheck, ArrowRight, Monitor } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Bento Feature Showcase (10 Core Capabilities) */}
      <BentoFeatures />

      {/* 3. Product Demonstration (Real App Screenshots & Components) */}
      <ProductDemonstration />

      {/* 4. Use Cases (Students, Teachers, Developers, Creators, Trainers, Professionals) */}
      <UseCasesSection />

      {/* 5. Dual Runtime Architecture Comparison */}
      <PlatformComparison />

      {/* 6. Trust & Product Value (Local-First, Privacy, Direct3D) */}
      <TrustValueSection />

      {/* 7. Pricing Section (First 6 Months Free, $1/mo Afterward) */}
      <PricingSection />

      {/* 8. Download Center (Windows, macOS, Linux) */}
      <DownloadSection />

      {/* 9. FAQ Section (Polished Accordion with 9 Verified Answers) */}
      <FAQSection />

      {/* 10. Bottom Cinematic CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-8 sm:p-14 overflow-hidden shadow-2xl shadow-blue-500/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
            {/* Background grid pattern */}
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
                First 6 Months Free
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Your Screen is Waiting. Capture and Explain Today.
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Download ProScreen for Windows or load the Chrome Extension. No credit card required, zero watermarks, 100% local privacy.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('download', 'download')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-100"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows (132 MB)</span>
              </button>
              <button
                onClick={() => navigate('playground')}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-900/60 hover:bg-blue-900/80 border border-white/20 text-white font-semibold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span>Try In Browser</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
