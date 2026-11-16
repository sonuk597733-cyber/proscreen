import React from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Download,
  Chrome,
  Monitor,
  Sparkles,
  ArrowRight,
  LifeBuoy,
  Lock,
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-blue-500/20">
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
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                v1.0.0 Pro
              </span>
            </div>

            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              Capture. Create. Explain. Professional 60 FPS desktop screen recording and Direct3D pass-through annotation studio for Windows.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Zero Telemetry • 100% Local
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                DXGI 60 FPS Verified
              </span>
            </div>
          </div>

          {/* Col 1: Product Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => navigate('home', 'features')}
                  className="hover:text-blue-400 transition-colors"
                >
                  Features & Tools
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'how-it-works')}
                  className="hover:text-blue-400 transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'use-cases')}
                  className="hover:text-blue-400 transition-colors"
                >
                  Use Cases
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'pricing')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <span>Pricing</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                    6 Mo Free
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('download', 'download')}
                  className="hover:text-blue-400 transition-colors"
                >
                  Download Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'faq')}
                  className="hover:text-blue-400 transition-colors"
                >
                  FAQ & Answers
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Platforms & Releases */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platforms</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => navigate('download')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Windows Installer (.exe)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('download')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Monitor className="w-3.5 h-3.5 text-sky-400" />
                  <span>Windows Portable (.exe)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('chrome-extension')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Chrome className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chrome Extension (MV3)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('download', 'download')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 text-slate-500"
                >
                  <span>macOS (Coming Soon)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('download', 'download')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 text-slate-500"
                >
                  <span>Linux (Coming Soon)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Trust */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Support & Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => navigate('changelog')}
                  className="hover:text-blue-400 transition-colors"
                >
                  Changelog (v1.0.0)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('support')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Support Center</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('privacy')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Privacy Policy (100% Local)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('terms')}
                  className="hover:text-blue-400 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('playground')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 text-indigo-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Studio Sandbox</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>© 2026 ProScreen Team. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span>Crafted for Windows 10/11 & Google Chrome</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('privacy')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Privacy Policy
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
              Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
