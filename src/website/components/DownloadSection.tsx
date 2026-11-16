import React, { useState } from 'react';
import { OFFICIAL_RELEASES } from '../constants';
import { ReleaseAsset } from '../types';
import {
  Monitor,
  Download,
  CheckCircle2,
  FileCheck,
  Check,
  Copy,
  Clock,
  Sparkles,
  ShieldCheck,
  Info,
  Apple,
  Terminal,
} from 'lucide-react';

export const DownloadSection: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const { installer, portable } = OFFICIAL_RELEASES;

  const copyChecksum = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedSha(id);
    setTimeout(() => setCopiedSha(null), 2500);
  };

  return (
    <section id="download" className="py-20 lg:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Download className="w-3.5 h-3.5" />
            <span>Official Releases</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Get ProScreen for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Your Platform
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Download the official high-performance desktop application. Fast, lightweight, and production-tested.
          </p>

          {/* Platform Tab Selector */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <button
                onClick={() => setSelectedPlatform('windows')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  selectedPlatform === 'windows'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Windows (Available Now)</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('mac')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  selectedPlatform === 'mac'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.92-1 .04-2.17.65-2.82 1.42-.58.67-1.08 1.77-.94 2.81 1.12.09 2.19-.54 2.82-1.31z" />
                </svg>
                <span>macOS (Coming Soon)</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('linux')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  selectedPlatform === 'linux'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Linux (Coming Soon)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Content */}
        {selectedPlatform === 'windows' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Card 1: Windows Installer */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border-2 border-blue-500/40 p-8 shadow-2xl relative flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Recommended for Daily Use
                  </span>
                  <span className="text-xs font-mono text-slate-400">v{installer.version} Stable</span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-white">
                    Windows Installer (.exe)
                  </h3>
                  <p className="text-xs font-mono text-blue-400 mt-1">
                    {installer.fileName}
                  </p>
                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                    Standard Windows setup with desktop shortcut, Start Menu integration, and clean uninstaller via Windows Settings.
                  </p>
                </div>

                {/* Highlights */}
                <div className="space-y-2 pt-1 text-xs text-slate-200">
                  {installer.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">FILE SIZE</div>
                    <div className="text-white font-bold text-sm">{installer.sizeFormatted}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">OS REQUIREMENT</div>
                    <div className="text-white font-bold text-sm">Windows 10 / 11 64-bit</div>
                  </div>
                </div>

                {/* SHA256 Block */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                      SHA-256 Checksum
                    </span>
                    <button
                      onClick={() => copyChecksum(installer.sha256, 'installer')}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedSha === 'installer' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900/90 p-2 rounded border border-slate-800 select-all">
                    {installer.sha256}
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-2">
                <a
                  href={`/downloads/${installer.fileName}`}
                  download={installer.fileName}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.01]"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Windows Installer ({installer.sizeFormatted})</span>
                </a>
              </div>
            </div>

            {/* Card 2: Windows Portable */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border border-slate-800 p-8 shadow-2xl relative flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Zero Installation Required
                  </span>
                  <span className="text-xs font-mono text-slate-400">v{portable.version} Stable</span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-white">
                    Windows Portable (.exe)
                  </h3>
                  <p className="text-xs font-mono text-sky-400 mt-1">
                    {portable.fileName}
                  </p>
                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                    Single self-contained executable. Run directly from any folder or USB drive with zero administrative rights or registry changes.
                  </p>
                </div>

                {/* Highlights */}
                <div className="space-y-2 pt-1 text-xs text-slate-200">
                  {portable.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">FILE SIZE</div>
                    <div className="text-white font-bold text-sm">{portable.sizeFormatted}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">ARCHITECTURE</div>
                    <div className="text-white font-bold text-sm">{portable.architecture}</div>
                  </div>
                </div>

                {/* SHA256 Block */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                      SHA-256 Checksum
                    </span>
                    <button
                      onClick={() => copyChecksum(portable.sha256, 'portable')}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      {copiedSha === 'portable' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900/90 p-2 rounded border border-slate-800 select-all">
                    {portable.sha256}
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-2">
                <a
                  href={`/downloads/${portable.fileName}`}
                  download={portable.fileName}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all hover:scale-[1.01]"
                >
                  <Download className="w-5 h-5 text-sky-400" />
                  <span>Download Portable (.exe) ({portable.sizeFormatted})</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* macOS Coming Soon Card */}
        {selectedPlatform === 'mac' && (
          <div className="max-w-2xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border border-slate-800 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-200">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.92-1 .04-2.17.65-2.82 1.42-.58.67-1.08 1.77-.94 2.81 1.12.09 2.19-.54 2.82-1.31z" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                In Active Development
              </span>
              <h3 className="text-3xl font-extrabold text-white">
                ProScreen for macOS
              </h3>
              <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
                A native macOS edition supporting both Apple Silicon (M1/M2/M3/M4) and Intel architectures (.dmg format) is currently being developed.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-left max-w-md mx-auto space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>macOS Release Roadmap:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Native ScreenCaptureKit hardware video pipeline</li>
                <li>Universal binary for M-Series and Intel chips</li>
                <li>Metal-backed transparent overlay drawing</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-500 font-semibold cursor-not-allowed border border-slate-700/50"
              >
                macOS Build Coming Soon
              </button>
            </div>
          </div>
        )}

        {/* Linux Coming Soon Card */}
        {selectedPlatform === 'linux' && (
          <div className="max-w-2xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border border-slate-800 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-200">
              <Terminal className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                In Active Development
              </span>
              <h3 className="text-3xl font-extrabold text-white">
                ProScreen for Linux
              </h3>
              <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
                AppImage and Debian package (.deb) distributions supporting Wayland and X11 display servers are planned.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-left max-w-md mx-auto space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Linux Release Roadmap:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Standalone AppImage format for all distributions</li>
                <li>PipeWire screen capture integration for Wayland & X11</li>
                <li>Debian / Ubuntu (.deb) installation package</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-500 font-semibold cursor-not-allowed border border-slate-700/50"
              >
                Linux Build Coming Soon
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
