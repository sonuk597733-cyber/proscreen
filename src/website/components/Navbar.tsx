import React, { useState, useEffect } from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import {
  Download,
  Menu,
  X,
  Search,
  Sparkles,
  Monitor,
  Chrome,
  Layers,
  HelpCircle,
  History,
  LifeBuoy,
  Play,
  ArrowRight,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentRoute, navigate, openSearch } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: { label: string; route?: PageRoute; anchorId?: string; badge?: string }[] = [
    { label: 'Features', route: 'home', anchorId: 'features' },
    { label: 'How It Works', route: 'home', anchorId: 'how-it-works' },
    { label: 'Use Cases', route: 'home', anchorId: 'use-cases' },
    { label: 'Pricing', route: 'home', anchorId: 'pricing', badge: '6 Mo Free' },
    { label: 'Download', route: 'download', anchorId: 'download', badge: 'v1.0.0' },
    { label: 'FAQ', route: 'home', anchorId: 'faq' },
  ];

  const handleNav = (route?: PageRoute, anchorId?: string) => {
    if (route) {
      navigate(route, anchorId);
    } else if (anchorId) {
      navigate('home', anchorId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#060913]/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl shadow-blue-950/20'
            : 'bg-[#060913]/60 backdrop-blur-md border-b border-white/[0.04]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#070b18] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <path d="m7 8 3 3-3 3" />
                  <line x1="13" y1="14" x2="17" y2="14" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  ProScreen
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/25">
                  v1.0.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 tracking-wide font-medium hidden md:block">
                Screen Annotation Studio
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const active = currentRoute === link.route && !link.anchorId;
              return (
                <button
                  key={link.label}
                  onClick={() => handleNav(link.route, link.anchorId)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 relative flex items-center gap-1.5 ${
                    active
                      ? 'text-white bg-blue-500/15 border border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono font-semibold">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action CTAs & Search */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Quick Search */}
            <button
              onClick={openSearch}
              title="Search documentation and features (Ctrl+K)"
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors font-mono"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                ⌘K
              </kbd>
            </button>

            {/* Try Live Studio Demo */}
            <button
              onClick={() => handleNav('playground')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                currentRoute === 'playground'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400'
                  : 'text-slate-200 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Interactive Studio</span>
            </button>

            {/* Download Button */}
            <button
              onClick={() => handleNav('download', 'download')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Free</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={openSearch}
              className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden bg-black/80 backdrop-blur-md pt-20 animate-fadeIn">
          <div className="bg-[#0A0F1D] border-b border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((link) => {
                const active = currentRoute === link.route && !link.anchorId;
                return (
                  <button
                    key={link.label}
                    onClick={() => handleNav(link.route, link.anchorId)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600/20 text-white border border-blue-500/40 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <button
                onClick={() => handleNav('playground')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-950/60 border border-indigo-700/50 text-indigo-200"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Try Live Studio in Browser</span>
              </button>

              <button
                onClick={() => handleNav('download')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-xl shadow-blue-500/25"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows (v1.0.0)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
