import React, { useState } from 'react';
import { OFFICIAL_RELEASES, SYSTEM_REQUIREMENTS } from '../constants';
import { useRouter } from '../router';
import {
  Download,
  Check,
  Copy,
  ShieldCheck,
  HardDrive,
  Cpu,
  Monitor,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Chrome,
  Archive,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const { navigate } = useRouter();
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const copyChecksum = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedSha(id);
    setTimeout(() => setCopiedSha(null), 2500);
  };

  const { installer, portable, extensionZip } = OFFICIAL_RELEASES;

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Download className="w-3.5 h-3.5" />
            <span>Official Download & Release Center</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            Download ProScreen{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              v1.0.0
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Free, fast, and production-ready. Available for Windows 10/11 Desktop and all modern Chromium browsers. No license keys, ads, or account registration required.
          </p>
        </div>

        {/* 3-Column Release Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 1. Windows Installer Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border-2 border-blue-500/40 p-8 shadow-2xl relative flex flex-col justify-between space-y-8">
            <div className="space-y-6">
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
                <p className="text-xs font-mono text-blue-400 mt-1 break-all">
                  {installer.fileName}
                </p>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  {installer.description}
                </p>
              </div>

              {/* Specs & Highlights */}
              <div className="space-y-2.5 pt-2">
                {installer.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">FILE SIZE</div>
                  <div className="text-white font-bold text-sm">{installer.sizeFormatted}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">ARCHITECTURE</div>
                  <div className="text-white font-bold text-sm">{installer.architecture}</div>
                </div>
              </div>

              {/* SHA256 Checksum block */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                    Verified SHA-256 Checksum
                  </span>
                  <button
                    onClick={() => copyChecksum(installer.sha256, 'installer')}
                    className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedSha === 'installer' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SHA</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900/90 p-2 rounded border border-slate-800 select-all">
                  {installer.sha256}
                </div>
              </div>
            </div>

            {/* Direct Download Button */}
            <div className="pt-4">
              <a
                href={installer.downloadUrl}
                download={installer.fileName}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-100"
              >
                <Download className="w-5 h-5" />
                <span>Download Installer ({installer.sizeFormatted})</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-mono">
                Direct file download • Zero third-party mirrors
              </p>
            </div>
          </div>

          {/* 2. Windows Portable Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border border-slate-800 p-8 shadow-2xl relative flex flex-col justify-between space-y-8">
            <div className="space-y-6">
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
                <p className="text-xs font-mono text-sky-400 mt-1 break-all">
                  {portable.fileName}
                </p>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  {portable.description}
                </p>
              </div>

              {/* Specs & Highlights */}
              <div className="space-y-2.5 pt-2">
                {portable.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">FILE SIZE</div>
                  <div className="text-white font-bold text-sm">{portable.sizeFormatted}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">ADMIN PRIVILEGES</div>
                  <div className="text-white font-bold text-sm">Not Required</div>
                </div>
              </div>

              {/* SHA256 Checksum block */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                    Verified SHA-256 Checksum
                  </span>
                  <button
                    onClick={() => copyChecksum(portable.sha256, 'portable')}
                    className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedSha === 'portable' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SHA</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900/90 p-2 rounded border border-slate-800 select-all">
                  {portable.sha256}
                </div>
              </div>
            </div>

            {/* Direct Download Button */}
            <div className="pt-4">
              <a
                href={portable.downloadUrl}
                download={portable.fileName}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-xl transition-all hover:scale-[1.02] active:scale-100"
              >
                <Download className="w-5 h-5 text-sky-400" />
                <span>Download Portable ({portable.sizeFormatted})</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-mono">
                Direct file download • Runs from any folder or USB
              </p>
            </div>
          </div>

          {/* 3. Chrome Extension Package Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#13120E] to-slate-950 border border-amber-500/30 p-8 shadow-2xl relative flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Universal Chromium Package
                </span>
                <span className="text-xs font-mono text-slate-400">v{extensionZip.version} MV3</span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-white">
                  Chrome Extension (.zip)
                </h3>
                <p className="text-xs font-mono text-amber-400 mt-1 break-all">
                  {extensionZip.fileName}
                </p>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  {extensionZip.description}
                </p>
              </div>

              {/* Specs & Highlights */}
              <div className="space-y-2.5 pt-2">
                {extensionZip.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">PACKAGE SIZE</div>
                  <div className="text-white font-bold text-sm">{extensionZip.sizeFormatted}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">COMPATIBILITY</div>
                  <div className="text-white font-bold text-sm">Chrome, Edge, Brave</div>
                </div>
              </div>

              {/* SHA256 Checksum block */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    Verified SHA-256 Checksum
                  </span>
                  <button
                    onClick={() => copyChecksum(extensionZip.sha256, 'extension')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedSha === 'extension' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SHA</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900/90 p-2 rounded border border-slate-800 select-all">
                  {extensionZip.sha256}
                </div>
              </div>
            </div>

            {/* Direct Download Button */}
            <div className="pt-4">
              <a
                href={extensionZip.downloadUrl}
                download={extensionZip.fileName}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-100"
              >
                <Archive className="w-5 h-5" />
                <span>Download Extension ZIP ({extensionZip.sizeFormatted})</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-mono">
                Direct ZIP package • Load unpacked in Developer mode
              </p>
            </div>
          </div>
        </div>

        {/* System Requirements Grid */}
        <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-8 sm:p-12 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Windows System Requirements
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Optimized for low CPU and GPU consumption
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-xs font-mono text-slate-400">OPERATING SYSTEM</span>
              <div className="text-sm font-semibold text-white">{SYSTEM_REQUIREMENTS.os}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-xs font-mono text-slate-400">PROCESSOR (CPU)</span>
              <div className="text-sm font-semibold text-white">{SYSTEM_REQUIREMENTS.cpu}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-xs font-mono text-slate-400">MEMORY (RAM)</span>
              <div className="text-sm font-semibold text-white">{SYSTEM_REQUIREMENTS.ram}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-xs font-mono text-slate-400">STORAGE</span>
              <div className="text-sm font-semibold text-white">{SYSTEM_REQUIREMENTS.storage}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-xs font-mono text-slate-400">GRAPHICS ENGINE</span>
              <div className="text-sm font-semibold text-white">{SYSTEM_REQUIREMENTS.gpu}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-xs font-mono text-slate-400">DISPLAY RESOLUTION</span>
              <div className="text-sm font-semibold text-white">{SYSTEM_REQUIREMENTS.display}</div>
            </div>
          </div>
        </div>

        {/* Installation Instructions & Verification Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step-by-step Installer */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <span>Installer Setup Guide</span>
            </h4>
            <ol className="space-y-3 text-xs sm:text-sm text-slate-300 list-decimal pl-5 leading-relaxed">
              <li>
                Click <strong className="text-white">Download Installer</strong> to save{' '}
                <code className="text-blue-300 bg-slate-950 px-1 rounded">ProScreen-Setup-1.0.0.exe</code>.
              </li>
              <li>Double-click the downloaded executable to start the setup wizard.</li>
              <li>Choose your destination folder (or accept standard AppData default).</li>
              <li>Click <strong>Install</strong>. Desktop shortcut and Start Menu items will be created.</li>
              <li>Launch ProScreen. Press <kbd className="bg-slate-800 px-1 rounded text-white font-mono">Alt+Shift+P</kbd> anytime to toggle toolbar.</li>
            </ol>
          </div>

          {/* Step-by-step Portable */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-sky-400" />
              <span>Portable Quick Start</span>
            </h4>
            <ol className="space-y-3 text-xs sm:text-sm text-slate-300 list-decimal pl-5 leading-relaxed">
              <li>
                Click <strong className="text-white">Download Portable</strong> to save{' '}
                <code className="text-sky-300 bg-slate-950 px-1 rounded">ProScreen-Portable-1.0.0.exe</code>.
              </li>
              <li>Copy or move the executable to any preferred folder (e.g. Desktop or USB drive).</li>
              <li>Double-click to run immediately. No administrative prompt or registry writes.</li>
              <li>All user tool settings are saved locally alongside the executable.</li>
              <li>To remove, simply delete the single .exe file.</li>
            </ol>
          </div>

          {/* Step-by-step Extension */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Chrome className="w-5 h-5 text-amber-400" />
              <span>Chrome Extension Guide</span>
            </h4>
            <ol className="space-y-3 text-xs sm:text-sm text-slate-300 list-decimal pl-5 leading-relaxed">
              <li>
                Click <strong className="text-white">Download Extension ZIP</strong> to save{' '}
                <code className="text-amber-300 bg-slate-950 px-1 rounded">ProScreen-Chrome-Extension-1.0.0.zip</code>.
              </li>
              <li>Extract the ZIP file into any folder on your computer.</li>
              <li>Open <code className="text-amber-300 bg-slate-950 px-1 rounded">chrome://extensions</code> in Chrome or Edge.</li>
              <li>Enable <strong>Developer mode</strong> in the top-right corner.</li>
              <li>Click <strong>Load unpacked</strong> and select the extracted folder.</li>
            </ol>
          </div>
        </div>

        {/* PowerShell Checksum Verification Snippet */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Verify Integrity in Windows PowerShell:</span>
            </span>
            <span className="text-[11px] text-slate-400">SHA-256</span>
          </div>
          <div className="p-3 bg-slate-900/90 rounded-lg text-slate-300 overflow-x-auto select-all border border-slate-800">
            Get-FileHash -Path &quot;$HOME\Downloads\ProScreen-Setup-1.0.0.exe&quot; -Algorithm SHA256
          </div>
        </div>

        {/* Windows Defender SmartScreen & First Launch Transparency */}
        <div className="rounded-3xl bg-slate-900/50 border border-blue-500/20 p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Windows Defender SmartScreen Transparency
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Why does Windows show <span className="text-white font-semibold">&quot;Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting&quot;</span>?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-300">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span>The Cause: New Software Reputation</span>
              </h4>
              <p className="leading-relaxed text-slate-300">
                Microsoft Defender SmartScreen uses cloud telemetry reputation algorithms. Whenever independent, newly released open-source software is published, SmartScreen flags it until thousands of global downloads have been recorded in Microsoft telemetry. This is standard Windows behavior for independent desktop software.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verification-First Security Checklist</span>
              </h4>
              <ol className="list-decimal pl-4 space-y-2 text-slate-300">
                <li>
                  <strong className="text-white">Verify SHA-256 Hash First:</strong> Before executing, run the PowerShell command above to ensure your downloaded file matches our official published checksum byte-for-byte. If the hash does not match, do not run the file.
                </li>
                <li>
                  <strong className="text-white">Confirm Publisher & File Name:</strong> On the blue SmartScreen dialog, click <strong className="text-white">&quot;More info&quot;</strong> and verify the file name corresponds to <code className="text-blue-300">ProScreen-Setup-1.0.0.exe</code> or <code className="text-sky-300">ProScreen-Portable-1.0.0.exe</code>.
                </li>
                <li>
                  <strong className="text-white">Independent Antivirus Scan:</strong> You can right-click the file to scan with Microsoft Defender or upload to VirusTotal for independent multi-engine verification.
                </li>
                <li>
                  <strong className="text-white">Run Once Verified:</strong> Only after confirming cryptographic integrity and clean scan results, click <strong className="text-white">&quot;Run anyway&quot;</strong> to start ProScreen.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
