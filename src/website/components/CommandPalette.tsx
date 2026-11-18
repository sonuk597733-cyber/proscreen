import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import { IMPLEMENTED_FEATURES, FAQS, KEYBOARD_SHORTCUTS, RELEASE_VERSION } from '../constants';
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
    { id: 'p-down', title: 'Download for Windows', subtitle: `Installer & Portable executables (v${RELEASE_VERSION})`, route: 'download' as PageRoute, icon: Download, cat: 'Downloads' },
    { id: 'p-ext', title: 'Chrome Extension', subtitle: 'Manifest V3 unpacked installation & specs', route: 'chrome-extension' as PageRoute, icon: Chrome, cat: 'Pages' },
    { id: 'p-gal', title: 'Product Gallery', subtitle: 'High-definition interface views & mockups', route: 'gallery' as PageRoute, icon: Monitor, cat: 'Pages' },
    { id: 'p-play', title: 'Interactive Studio Playground', subtitle: 'Live in-browser annotation testbed', route: 'playground' as PageRoute, icon: Sparkles, cat: 'Interactive' },
    { id: 'p-chg', title: `Changelog v${RELEASE_VERSION}`, subtitle: 'Release history and architecture updates', route: 'changelog' as PageRoute, icon: FileText, cat: 'Docs' },
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6 bg-neutral-900/40 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden text-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 gap-3">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
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
            className="w-full bg-transparent text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none"
          />
          <button
            onClick={closeSearch}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
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
                      ? 'bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-neutral-900 flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
                          {item.cat}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-blue-600 translate-x-0.5' : 'text-neutral-400'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-200">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-200">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-200">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
