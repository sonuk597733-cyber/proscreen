import React from 'react';
import { useRouter } from '../router';
import { PageRoute } from '../types';
import { OFFICIAL_RELEASES } from '../constants';
import { ShieldCheck, CheckCircle2, Download, Monitor } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <footer className="w-full bg-neutral-50 border-t border-neutral-200 text-neutral-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-sm">
                <svg
                  className="w-4 h-4 text-white"
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
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                ProScreen
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
                PRO
              </span>
            </div>

            <p className="text-sm text-neutral-600 max-w-sm leading-relaxed">
              Capture your screen. Make every moment clear. Professional desktop screen recording and on-screen annotation studio for Windows.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700 font-medium shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                100% Local-First Privacy
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700 font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Zero Telemetry
              </span>
            </div>
          </div>

          {/* Col 1: Product Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => navigate('home', 'features')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Features & Capabilities
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'how-it-works')}
                  className="hover:text-blue-600 transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'use-cases')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Use Cases
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'pricing')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Pricing (6 Mo Free)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('home', 'download')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Download Releases
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Platforms & Distribution */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Platforms</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={OFFICIAL_RELEASES.installer.downloadUrl}
                  download={OFFICIAL_RELEASES.installer.fileName}
                  className="flex items-center gap-1.5 hover:text-blue-600 transition-colors text-neutral-800 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Windows Installer (.exe)</span>
                </a>
              </li>
              <li>
                <a
                  href={OFFICIAL_RELEASES.portable.downloadUrl}
                  download={OFFICIAL_RELEASES.portable.fileName}
                  className="hover:text-blue-600 transition-colors"
                >
                  Windows Portable
                </a>
              </li>
              <li>
                <span className="text-neutral-400">macOS (Coming Soon)</span>
              </li>
              <li>
                <span className="text-neutral-400">Linux (Coming Soon)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => navigate('home', 'faq')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('support')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Support & Help
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('privacy')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('terms')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 mt-12 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            © 2026 ProScreen Team. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Direct3D 11 Pass-Through Architecture</span>
            <span>•</span>
            <span>Zero Watermarks</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
