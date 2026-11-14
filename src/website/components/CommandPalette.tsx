import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import { IMPLEMENTED_FEATURES, FAQS, KEYBOARD_SHORTCUTS } from '../constants';
import {
  Search,
  X,
  ArrowRight,
  Download,
  Sparkles,
  Command,
  FileText,
  HelpCircle,
  Keyboard,
  Layers,
  Monitor,
  Chrome,
  Shield,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, closeSearch, navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isSearchOpen) {
          closeSearch();
        } else {
          // Open via router
          const searchBtn = document.querySelector('[title*="Ctrl+K"]') as HTMLButtonElement | null;
          searchBtn?.click();
        }
      } else if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  if (!isSearchOpen) return null;

  // Build searchable items
  const staticItems = [
    { id: 'p-home', title: 'Home', subtitle: 'Overview & cinematic introduction', route: 'home' as PageRoute, icon: Sparkles, cat: 'Pages' },
    { id: 'p-feat', title: 'Features & Architecture', subtitle: 'Detailed breakdown of all 11 implemented tools', route: 'features' as PageRoute, icon: Layers, cat: 'Pages' },
    { id: 'p-down', title: 'Download for Windows', subtitle: 'Installer & Portable executables (v1.0.0)', route: 'download' as PageRoute, icon: Download, cat: 'Downloads' },
    { id: 'p-ext', title: 'Chrome Extension', subtitle: 'Manifest V3 unpacked installation & specs', route: 'chrome-extension' as PageRoute, icon: Chrome, cat: 'Pages' },
    { id: 'p-gal', title: 'Product Gallery', subtitle: 'High-definition interface views & mockups', route: 'gallery' as PageRoute, icon: Monitor, cat: 'Pages' },
    { id: 'p-play', title: 'Interactive Studio Playground', subtitle: 'Live in-browser annotation testbed', route: 'playground' as PageRoute, icon: Sparkles, cat: 'Interactive' },
    { id: 'p-chg', title: 'Changelog v1.0.0', subtitle: 'Release history and architecture updates', route: 'changelog' as PageRoute, icon: FileText, cat: 'Docs' },
    { id: 'p-faq', title: 'Frequently Asked Questions', subtitle: 'Answers for Windows, Extension & UIPI', route: 'faq' as PageRoute, icon: HelpCircle, cat: 'Docs' },
    { id: 'p-sup', title: 'Support & System Diagnostics', subtitle: 'Browser/Hardware capability tester & troubleshooting', route: 'support' as PageRoute, icon: HelpCircle, cat: 'Support' },
    { id: 'p-priv', title: 'Privacy Policy', subtitle: '100% local data & zero telemetry guarantee', route: 'privacy' as PageRoute, icon: Shield, cat: 'Legal' },
  ];

  const featureItems = IMPLEMENTED_FEATURES.map((f) => ({
    id: `feat-${f.id}`,
    title: f.title,
    subtitle: f.shortDesc,
    route: 'features' as PageRoute,
    anchor: f.id,
    icon: Layers,
    cat: 'Tools',
  }));

  const shortcutItems = KEYBOARD_SHORTCUTS.slice(0, 6).map((s) => ({
    id: `key-${s.key}`,
    title: `${s.key}: ${s.action}`,
    subtitle: `Shortcut Scope: ${s.scope}`,
    route: 'features' as PageRoute,
    anchor: 'shortcuts',
    icon: Keyboard,
    cat: 'Shortcuts',
  }));

  const allItems = [...staticItems, ...featureItems, ...shortcutItems];

  const filtered = query.trim()
    ? allItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          i.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          i.cat.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 10);

  const handleSelect = (item: (typeof allItems)[0]) => {
    navigate(item.route, (item as any).anchor);
    closeSearch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-[#090E1D] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search features, downloads, shortcuts, docs... (e.g. 'Installer', 'Eye', 'Whiteboard')"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
              } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                handleSelect(filtered[selectedIndex]);
              }
            }}
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
          />
          <button
            onClick={closeSearch}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No matching pages or features found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all duration-150 ${
                    isSelected
                      ? 'bg-blue-600/20 text-white border border-blue-500/40 shadow-sm'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {item.cat}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
