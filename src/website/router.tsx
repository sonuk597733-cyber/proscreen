import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { PageRoute } from './types';

interface RouterContextType {
  currentRoute: PageRoute;
  navigate: (route: PageRoute, anchorId?: string) => void;
  openSearch: () => void;
  isSearchOpen: boolean;
  closeSearch: () => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

const VALID_ROUTES: PageRoute[] = [
  'home',
  'features',
  'download',
  'chrome-extension',
  'gallery',
  'changelog',
  'faq',
  'support',
  'privacy',
  'terms',
  'playground',
];

const ROUTE_TITLES: Record<PageRoute, string> = {
  home: 'ProScreen — Your Screen. Your Canvas. Professional Screen Annotation Studio',
  features: 'Features & Architecture — ProScreen Screen Annotation Studio',
  download: 'Download ProScreen for Windows — Official Installer & Portable Release',
  'chrome-extension': 'ProScreen for Google Chrome — Manifest V3 Screen Annotation Extension',
  gallery: 'Product Gallery & Interface Showcase — ProScreen',
  changelog: 'Changelog & Release Notes — ProScreen v1.0.0',
  faq: 'Frequently Asked Questions & Knowledge Base — ProScreen',
  support: 'Support & Troubleshooting Center — ProScreen',
  privacy: 'Privacy Policy — 100% Local-First & Zero Telemetry — ProScreen',
  terms: 'Terms of Service & Software License — ProScreen',
  playground: 'Interactive Studio Playground — Test ProScreen In Your Browser',
};

function parseInitialRoute(): PageRoute {
  // Check hash first (e.g. #/features or #download)
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (hash && (VALID_ROUTES as string[]).includes(hash)) {
    return hash as PageRoute;
  }

  // Check pathname (e.g. /features, /download)
  const path = window.location.pathname.replace(/^\//, '').split('/')[0];
  if (path && (VALID_ROUTES as string[]).includes(path)) {
    return path as PageRoute;
  }

  return 'home';
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(parseInitialRoute);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navigate = (route: PageRoute, anchorId?: string) => {
    setCurrentRoute(route);
    // Update hash for universal static hosting compatibility without 404s
    if (route === 'home') {
      if (anchorId) {
        window.location.hash = `#${anchorId}`;
      } else if (window.location.hash) {
        history.pushState(null, '', window.location.pathname);
      }
    } else {
      window.location.hash = `#/${route}`;
    }

    if (anchorId) {
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (rawHash && ['features', 'how-it-works', 'use-cases', 'pricing', 'download', 'faq'].includes(rawHash)) {
      setTimeout(() => {
        const el = document.getElementById(rawHash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseInitialRoute();
      setCurrentRoute(nextRoute);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  useEffect(() => {
    document.title = ROUTE_TITLES[currentRoute] || 'ProScreen — Screen Annotation Studio';
  }, [currentRoute]);

  const value = useMemo(
    () => ({
      currentRoute,
      navigate,
      openSearch: () => setIsSearchOpen(true),
      closeSearch: () => setIsSearchOpen(false),
      isSearchOpen,
    }),
    [currentRoute, isSearchOpen]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export const useRouter = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
};
