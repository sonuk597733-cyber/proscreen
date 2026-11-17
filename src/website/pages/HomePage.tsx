import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { ProductDemonstration } from '../components/ProductDemonstration';
import { BentoFeatures } from '../components/BentoFeatures';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { UseCasesSection } from '../components/UseCasesSection';
import { TrustValueSection } from '../components/TrustValueSection';
import { PricingSection } from '../components/PricingSection';
import { DownloadSection } from '../components/DownloadSection';
import { FAQSection } from '../components/FAQSection';
import { useRouter } from '../router';
import { OFFICIAL_RELEASES } from '../constants';
import { Download, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full bg-white text-neutral-900">
      {/* 1. Hero Section (Most Important Section) */}
      <HeroSection />

      {/* 2. Product Showcase (Authentic Screenshots) */}
      <ProductDemonstration />

      {/* 3. Features (Alternating Image & Text Storytelling) */}
      <BentoFeatures />

      {/* 4. How It Works (Simple 4-Step Process) */}
      <HowItWorksSection />

      {/* 5. Use Cases (Students, Teachers, Developers, Creators, Trainers, Professionals) */}
      <UseCasesSection />

      {/* 6. Honest Product Architecture & Trust Value */}
      <TrustValueSection />

      {/* 7. Pricing Section (First 6 Months Free, then $1/mo) */}
      <PricingSection />

      {/* 8. Download Center (Windows, macOS, Linux) */}
      <DownloadSection />

      {/* 9. FAQ Section (Top Verified Questions) */}
      <FAQSection />

      {/* 10. Bottom Conversion CTA Banner */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-blue-600 p-8 sm:p-14 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white">
                <Sparkles className="w-3.5 h-3.5" />
                First 6 Months Free
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Capture your screen. Make every moment clear.
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Download ProScreen for Windows today. No credit card required, zero watermarks, and 100% local-first privacy.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
              <button
                onClick={() => navigate('home', 'download')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-blue-900 font-bold text-sm shadow-md hover:bg-neutral-100 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows ({OFFICIAL_RELEASES.installer.sizeFormatted})</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
