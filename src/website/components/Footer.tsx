import React from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Heart,
  ExternalLink,
  Download,
  Chrome,
  Monitor,
  Sparkles,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <footer className="w-full bg-[#04060d] border-t border-slate-800/80 text-slate-400 relative overflow-hidden">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-[1.5px] shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-[#070b18] rounded-[10px] flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                    <path d="m7 8 3 3-3 3" />
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">ProScreen</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                v1.0.0 Stable
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              Your Screen. Your Canvas. Professional screen annotation studio for Windows Desktop and Google Chrome. Built for presenters, engineers, educators, and creators.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Zero Telemetry • 100% Local
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                57/57 Unit Tests Verified
              </span>
            </div>
          </div>

          {/* Col 1: Products */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Software</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => navigate('download')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Windows Installer</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('download')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Monitor className="w-3.5 h-3.5 text-sky-400" />
                  <span>Windows Portable</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('chrome-extension')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Chrome className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chrome Extension</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('playground')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Interactive Studio</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Exploration & Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Features</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('features')} className="hover:text-blue-400 transition-colors">
                  All 11 Implemented Tools
                </button>
              </li>
              <li>
                <button onClick={() => navigate('features')} className="hover:text-blue-400 transition-colors">
                  Floating Eye Restore Button
                </button>
              </li>
              <li>
                <button onClick={() => navigate('features')} className="hover:text-blue-400 transition-colors">
                  Whiteboard & Blackboard
                </button>
              </li>
              <li>
                <button onClick={() => navigate('features')} className="hover:text-blue-400 transition-colors">
                  Screen Recording & Snapshots
                </button>
              </li>
              <li>
                <button onClick={() => navigate('gallery')} className="hover:text-blue-400 transition-colors">
                  Product Gallery
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Resources & Trust</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('changelog')} className="hover:text-blue-400 transition-colors">
                  Changelog (v1.0.0)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('faq')} className="hover:text-blue-400 transition-colors">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button onClick={() => navigate('support')} className="hover:text-blue-400 transition-colors">
                  Support & Troubleshooting
                </button>
              </li>
              <li>
                <button onClick={() => navigate('privacy')} className="hover:text-blue-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-blue-400 transition-colors">
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© 2026 ProScreen Team. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-slate-400">Crafted for Windows 10/11 & Chromium</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('privacy')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => navigate('terms')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => navigate('support')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Diagnostics
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
