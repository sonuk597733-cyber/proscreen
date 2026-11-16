import React, { useState } from 'react';
import { useRouter } from '../router';
import { FAQS } from '../constants';
import { HelpCircle, ChevronDown, ArrowRight, LifeBuoy } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const { navigate } = useRouter();
  const [openIds, setOpenIds] = useState<string[]>(['what-is-proscreen', 'free-six-month-offer']);

  const toggleFaq = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter to show the top 9 verified questions
  const displayedFaqs = FAQS.slice(0, 9);

  return (
    <section id="faq" className="py-20 lg:py-28 relative scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Answers & Clarifications</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
            Everything you need to know about ProScreen features, the 6-month free offer, recording formats, and platform support.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {displayedFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`rounded-2xl transition-all duration-200 border ${
                  isOpen
                    ? 'bg-slate-900/95 border-blue-500/40 shadow-lg shadow-blue-950/20'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-white hover:text-blue-200 transition-colors">
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg bg-slate-800 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-blue-400 bg-blue-500/10' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/80">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs sm:text-sm text-slate-400">
          <span>Still have questions about your configuration?</span>
          <button
            onClick={() => navigate('support')}
            className="inline-flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Visit the ProScreen Support Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
