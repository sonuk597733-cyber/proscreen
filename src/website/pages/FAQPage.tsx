import React, { useState } from 'react';
import { FAQS } from '../constants';
import { useRouter } from '../router';
import {
  HelpCircle,
  Search,
  ChevronRight,
  Download,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export const FAQPage: React.FC = () => {
  const { navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'general', label: 'General & Architecture' },
    { id: 'windows', label: 'Windows Desktop' },
    { id: 'extension', label: 'Chrome Extension' },
    { id: 'shortcuts', label: 'Shortcuts & Controls' },
    { id: 'security', label: 'Security & Privacy' },
  ];

  const filteredFaqs = FAQS.filter((f) => {
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesQuery =
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Knowledge Base & Support</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about ProScreen features, Windows pass-through architecture, multi-monitor configuration, and privacy.
          </p>

          {/* Search Box */}
          <div className="relative max-w-md mx-auto pt-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search knowledge base (e.g. 'Pointer', 'UAC', 'Portable')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xl"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                selectedCategory === c.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/60 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No questions found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <details
                key={faq.id}
                open={searchQuery.trim().length > 0}
                className="group rounded-2xl bg-slate-900/60 border border-slate-800 p-6 open:bg-slate-900/90 open:border-blue-500/40 transition-all duration-200"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between text-base sm:text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                  <span className="pr-4">{faq.question}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 group-open:rotate-90 group-hover:text-white transition-transform" />
                </summary>
                <div className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))
          )}
        </div>

        {/* Still Have Questions? */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Still have questions or need technical support?</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Visit our Diagnostics & Troubleshooting Center or check system compatibility.
            </p>
          </div>
          <button
            onClick={() => navigate('support')}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 shadow-lg shadow-blue-500/25 transition-all"
          >
            Visit Support Center
          </button>
        </div>
      </div>
    </div>
  );
};
