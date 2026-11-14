import React from 'react';
import { useRouter } from '../router';
import { ShieldCheck, CheckCircle2, Lock, EyeOff, Server, HardDrive } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Telemetry Commitment</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-xs font-mono text-slate-400">
            Effective Date: November 14, 2026 • Version 1.0.0
          </p>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 w-fit">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">100% Local Processing</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All annotation strokes, text notes, screenshots, and screen recordings are rendered and processed solely in your computer RAM and local disk storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zero External Servers</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ProScreen maintains zero cloud backend servers, zero database clusters, and zero telemetry relays. Your data never touches the internet.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">No Tracking or Analytics</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We do not include Google Analytics, Mixpanel, Sentry, or user-tracking pixels. We collect zero usage statistics, keystrokes, or screen contents.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">1. Information We Do Not Collect</h2>
            <p>
              ProScreen was designed from the ground up as privacy-preserving utility software. When you run ProScreen (either as the native Windows Desktop Application or the Chrome Extension), we do <strong>not</strong> collect:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs text-slate-300">
              <li>Your personal identity, email address, name, or phone number.</li>
              <li>Your screen contents, window titles, or keystrokes entered into underlying apps.</li>
              <li>Your browsing history, URLs visited, or DOM tree contents.</li>
              <li>Your IP address, geolocation, or MAC address.</li>
              <li>Video recordings or captured screenshots (these are saved exclusively to your chosen local folder or system clipboard).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Local Storage and Preferences</h2>
            <p>
              ProScreen saves your user interface preferences (such as selected brush color, stroke thickness, toolbar position, and custom hotkeys) locally using standard Windows AppData storage (for Desktop) or Chromium&apos;s isolated <code className="text-blue-300">chrome.storage.local</code> API (for the Extension). This data never leaves your device and is erased if you uninstall the application or clear extension data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. System Permissions Rationale</h2>
            <p>
              ProScreen requests specific Windows and Chromium permissions solely to perform requested annotation operations:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-xs text-slate-300">
              <li>
                <strong className="text-white">Windows Transparent Window Overlay:</strong> Used to display high-frequency drawing strokes over running applications.
              </li>
              <li>
                <strong className="text-white">Global OS Shortcuts:</strong> Used to respond to user key combinations (such as Alt+Shift+P to collapse toolbar) even when another window has focus.
              </li>
              <li>
                <strong className="text-white">Display Media & Screen Recording:</strong> Used only when you explicitly press the Screenshot or Screen Recording buttons to generate a local video or PNG snapshot.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Changes to This Privacy Policy</h2>
            <p>
              If we update ProScreen, we will update this document and reflect the latest version number. Our commitment to 100% local processing and zero telemetry will remain permanent.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white">5. Contact Information</h2>
            <p>
              If you have any questions regarding our privacy architecture, you may inspect our source code or reach us via our <button onClick={() => navigate('support')} className="text-blue-400 underline">Support Center</button>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
