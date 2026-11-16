import React, { useState } from 'react';
import { useRouter } from '../router';
import { FAQS } from '../constants';
import { HelpCircle, ChevronDown, ArrowRight, LifeBuoy, Sparkles } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const { navigate } = useRouter();
  const [openIds, setOpenIds] = useState<string[]>(['what-is-proscreen', 'free-six-month-offer']);

  const toggleFaq = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const displayedFaqs = FAQS.slice(0, 9);

  return (
    <section id="faq" className="py-20 lg:py-28 bg-neutral-50 scroll-mt-18 border-b border-neutral-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              ANSWERS & CLARIFICATIONS
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Frequently asked questions
          </h2>

          <p className="text-lg text-neutral-600 leading-relaxed max-w-xl mx-auto">
            Everything you need to know about ProScreen features, the 6-month free offer, recording formats, and privacy.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {displayedFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`rounded-2xl transition-all duration-200 border bg-white ${
                  isOpen
                    ? 'border-blue-600/70 shadow-md ring-1 ring-blue-600/20'
                    : 'border-neutral-200/80 hover:border-neutral-300 shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-neutral-900 hover:text-blue-600 transition-colors">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 pt-1 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-neutral-600">
          <span>Still have questions about ProScreen?</span>
          <button
            onClick={() => navigate('support')}
            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Visit Support & Documentation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
