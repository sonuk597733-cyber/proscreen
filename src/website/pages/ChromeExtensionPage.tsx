import React, { useState } from 'react';
import { OFFICIAL_RELEASES } from '../constants';
import { useRouter } from '../router';
import {
  Chrome,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  Download,
  AlertTriangle,
  Archive,
  FileCheck,
} from 'lucide-react';

export const ChromeExtensionPage: React.FC = () => {
  const { navigate } = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const { extensionZip } = OFFICIAL_RELEASES;

  const copyPath = () => {
    navigator.clipboard.writeText('chrome://extensions/');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyChecksum = () => {
    navigator.clipboard.writeText(extensionZip.sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const supportedBrowsers = [
    { name: 'Google Chrome', version: 'v116+', badge: 'Full Support' },
    { name: 'Microsoft Edge', version: 'v116+', badge: 'Full Support' },
    { name: 'Brave Browser', version: 'v1.57+', badge: 'Full Support' },
    { name: 'Arc for Windows', version: 'v1.0+', badge: 'Full Support' },
    { name: 'Opera / Opera GX', version: 'v102+', badge: 'Full Support' },
    { name: 'Vivaldi', version: 'v6.2+', badge: 'Full Support' },
  ];

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300">
            <Chrome className="w-3.5 h-3.5" />
            <span>Manifest V3 Screen Annotation Extension</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            ProScreen for{' '}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
              Google Chrome
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Draw, highlight, and annotate directly over any website without installing native desktop software. Powered by modern Manifest V3 and isolated Shadow DOM.
          </p>
        </div>

        {/* Store Status Card */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#14120C] to-slate-950 border border-amber-500/30 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Chrome Web Store Listing: Under Review</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Add to Google Chrome (Coming Soon)
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                The ProScreen extension has been submitted to the Google Chrome Web Store review queue. The direct one-click store install button will activate immediately once publication review is finalized.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                {/* Coming Soon Button as per prompt requirements */}
                <button
                  disabled
                  className="px-6 py-3.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm border border-slate-700 cursor-not-allowed flex items-center gap-2.5 opacity-90 shadow-inner"
                  title="Coming Soon: Under Chrome Web Store Review"
                >
                  <Chrome className="w-4 h-4 text-amber-400" />
                  <span>Add to Chrome — Coming Soon</span>
                </button>

                {/* Direct ZIP download button */}
                <a
                  href={extensionZip.downloadUrl}
                  download={extensionZip.fileName}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-bold text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-100 flex items-center gap-2.5"
                >
                  <Archive className="w-4 h-4" />
                  <span>Download Extension ZIP ({extensionZip.sizeFormatted})</span>
                </a>

                <a
                  href="#unpacked-guide"
                  className="px-5 py-3.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <span>Load Unpacked Guide</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Store Security Audit Notice */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <div className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Store Compliance Checklist</span>
              </div>
              <ul className="space-y-2 text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Manifest V3 Architecture</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Strict CSP Compliance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Analytics / Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Per-Tab State Isolation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step-by-Step "Load Unpacked" Developer Build Guide */}
        <div id="unpacked-guide" className="space-y-8 pt-8 border-t border-slate-800">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Immediate Access
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Install via Chrome Developer Mode in 30 Seconds
            </h3>
            <p className="text-slate-300 text-sm">
              You do not need to wait for the Web Store review. The production extension bundle is ready in this workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h4 className="text-base font-bold text-white">Open Extensions Manager</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Open a new tab in Google Chrome or Microsoft Edge and navigate to the extensions configuration page:
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300">
                <span>chrome://extensions/</span>
                <button
                  onClick={copyPath}
                  className="text-slate-400 hover:text-white"
                  title="Copy URL"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h4 className="text-base font-bold text-white">Enable Developer Mode</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toggle the switch in the top-right corner of the page labelled <strong className="text-white">Developer mode</strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
                Reveals the &quot;Load unpacked&quot; button in the top left toolbar.
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h4 className="text-base font-bold text-white">Select Extension Directory</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click <strong className="text-white">Load unpacked</strong> and select either your extracted ZIP folder or the local build directory:
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono break-all">
                C:\Users\dell\Desktop\proscreen\dist
              </div>
            </div>
          </div>
        </div>

        {/* Supported Browsers Matrix */}
        <div className="space-y-6 pt-8 border-t border-slate-800">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Supported Chromium Browsers
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              ProScreen runs on any browser running Chromium engine 116 or higher.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {supportedBrowsers.map((b, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5"
              >
                <div className="text-sm font-bold text-white">{b.name}</div>
                <div className="text-[11px] font-mono text-slate-400">{b.version}</div>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold">
                  {b.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Known Limitations Notice */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Browser Security Limitations (Chrome Internal Pages)</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            By Google security design, all Chrome extensions are prohibited from running content scripts on internal browser pages (<code className="text-amber-300">chrome://*</code>) and the official Chrome Web Store. To draw over internal browser settings or native OS windows, use the <button onClick={() => navigate('download')} className="text-blue-400 underline font-semibold">ProScreen Windows Desktop App</button>.
          </p>
        </div>
      </div>
    </div>
  );
};
