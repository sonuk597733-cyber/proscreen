import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import { Download, Menu, X, Sparkles } from 'lucide-react';

type NavLinkItem = {
  label: string;
  route: PageRoute;
  anchorId?: string;
  badge?: string;
};

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Features', route: 'home', anchorId: 'features' },
  { label: 'How it works', route: 'home', anchorId: 'how-it-works' },
  { label: 'Pricing', route: 'home', anchorId: 'pricing', badge: '6 months free' },
  { label: 'Download', route: 'home', anchorId: 'download' },
  { label: 'FAQ', route: 'home', anchorId: 'faq' },
];

const SECTION_IDS = NAV_LINKS.map((l) => l.anchorId).filter(Boolean) as string[];

/* The header is 72px tall. Sections use scroll-mt-18 (4.5rem = 72px), so keep these in sync. */
const HEADER_OFFSET = 72;

/* ---------- Logo ---------- */
const Logo: React.FC = () => (
  <span className="flex items-center gap-3">
    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950 text-sky-400 shadow-md shadow-slate-900/15 ring-1 ring-slate-900/10 transition-transform duration-200 group-hover:scale-105">
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="m7 8 3 3-3 3" />
        <line x1="13" y1="14" x2="17" y2="14" />
      </svg>
    </span>
    <span className="flex items-center gap-2">
      <span className="text-xl font-extrabold tracking-tight text-slate-900">ProScreen</span>
      <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-xs font-bold text-sky-800">
        Pro
      </span>
    </span>
  </span>
);

/* ---------- Badge ---------- */
const Badge: React.FC<{ text: string }> = ({ text }) => (
  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
    {text}
  </span>
);

/* ---------- Navbar ---------- */
export const Navbar: React.FC = () => {
  const { currentRoute, navigate } = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggleRef = useRef<HTMLButtonElement>(null);

  /* Scroll: shadow, reading progress and the section currently in view */
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      setScrolled(y > 10);
      setProgress(max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0);

      if (currentRoute !== 'home') {
        setActiveId(null);
        return;
      }

      let current: string | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= HEADER_OFFSET + 60 && rect.bottom > HEADER_OFFSET + 60) {
          current = id;
        }
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [currentRoute]);

  /* Mobile menu: lock page scroll while open */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  /* Mobile menu: close with Escape and return focus to the toggle button */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  /* Mobile menu: close automatically when the screen becomes wide */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleNav = useCallback(
    (route: PageRoute, anchorId?: string) => {
      navigate(route, anchorId);
      setMobileMenuOpen(false);
    },
    [navigate]
  );

  const isActive = (link: NavLinkItem) =>
    currentRoute === link.route && !!link.anchorId && link.anchorId === activeId;

  const studioActive = currentRoute === 'playground';

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b bg-white/85 backdrop-blur-md transition-shadow duration-200 ${
          scrolled
            ? 'border-slate-200 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]'
            : 'border-slate-100'
        }`}
      >
        {/* Reading progress */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 h-0.5 bg-sky-500 transition-[width] duration-100 ease-out"
          style={{ width: `${progress}%`, opacity: scrolled ? 1 : 0 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-6">
          {/* Brand */}
          <button
            type="button"
            onClick={() => handleNav('home')}
            aria-label="ProScreen home"
            className="group rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500"
          >
            <Logo />
          </button>

          {/* Desktop links */}
          <nav aria-label="Main" className="hidden lg:flex items-stretch h-full gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link);
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNav(link.route, link.anchorId)}
                  aria-current={active ? 'true' : undefined}
                  className={`relative h-full px-3.5 flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-sky-500 ${
                    active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && <Badge text={link.badge} />}
                  <span
                    aria-hidden="true"
                    className={`absolute left-3.5 right-3.5 bottom-0 h-0.5 rounded-full bg-sky-500 transition-all duration-200 ${
                      active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleNav('playground')}
              aria-current={studioActive ? 'page' : undefined}
              className={`hidden lg:inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                studioActive
                  ? 'bg-sky-50 text-sky-800 ring-sky-200'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Interactive Studio</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('home', 'download')}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/25 transition-colors hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <Download className="w-4 h-4" />
              <span>Download for Windows</span>
            </button>

            {/* Mobile toggle */}
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-700 ring-1 ring-slate-200 bg-white hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        aria-hidden={!mobileMenuOpen}
        className={`lg:hidden fixed inset-x-0 bottom-0 top-[72px] z-40 transition-all duration-200 ${
          mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute inset-0 w-full h-full bg-slate-950/50 backdrop-blur-sm cursor-default"
        />

        {/* Panel */}
        <div
          className={`relative max-h-full overflow-y-auto bg-white border-b border-slate-200 shadow-2xl transition-transform duration-200 ${
            mobileMenuOpen ? 'translate-y-0' : '-translate-y-3'
          }`}
        >
          <nav aria-label="Mobile" className="p-4 sm:p-6">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(link);
                return (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => handleNav(link.route, link.anchorId)}
                      aria-current={active ? 'true' : undefined}
                      className={`relative w-full flex items-center justify-between rounded-xl py-3.5 pl-5 pr-4 text-left text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500 ${
                        active
                          ? 'bg-sky-50 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute left-1.5 top-3 bottom-3 w-1 rounded-full bg-sky-500 transition-opacity ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <span>{link.label}</span>
                      {link.badge && <Badge text={link.badge} />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => handleNav('playground')}
                aria-current={studioActive ? 'page' : undefined}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  studioActive
                    ? 'bg-sky-50 text-sky-800 ring-sky-200'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Try the studio in your browser</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('home', 'download')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/25 transition-colors hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows</span>
              </button>

              <p className="text-center text-xs text-slate-500">
                Version 1.0.0 for Windows 11 and 10 (64-bit)
              </p>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};