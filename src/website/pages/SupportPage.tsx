import React, { useState, useEffect } from 'react';
import { useRouter } from '../router';
import {
  LifeBuoy,
  Cpu,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Send,
  Check,
  ShieldCheck,
  Terminal,
  HelpCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { DiagnosticResult } from '../types';

export const SupportPage: React.FC = () => {
  const { navigate } = useRouter();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    category: 'general',
    message: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Run real browser diagnostics
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown Chromium';
    if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Google Chrome';
    else if (userAgent.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (userAgent.includes('Safari/')) browser = 'Safari';

    let os = 'Windows OS';
    if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10 / Windows 11 (64-bit)';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';

    // Test WebGL
    let webGlSupported = false;
    try {
      const canvas = document.createElement('canvas');
      webGlSupported = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      webGlSupported = false;
    }

    // Test MediaRecorder
    const mediaRecorderSupported = typeof window.MediaRecorder !== 'undefined';

    setDiagnostics({
      browser,
      os,
      screenResolution: `${window.screen.width} × ${window.screen.height} px`,
      devicePixelRatio: window.devicePixelRatio || 1,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      webGlSupported,
      mediaRecorderSupported,
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.email || !formState.message) return;
    setFormSubmitted(true);
    setTimeout(() => {
      setFormState({ name: '', email: '', category: 'general', message: '' });
    }, 500);
  };

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Diagnostics & Troubleshooting Center</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Support &{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              System Diagnostics
            </span>
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Run automated hardware and browser checks, troubleshoot common Windows display settings, or submit feedback directly to the engineering team.
          </p>
        </div>

        {/* Live System Diagnostics Checker Card */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Live Client Diagnostics</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Real-time detection of your current runtime environment
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5 self-start sm:self-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Diagnostics Active
            </span>
          </div>

          {diagnostics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">DETECTED CLIENT</span>
                <div className="text-sm font-bold text-white">{diagnostics.browser}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">OPERATING SYSTEM</span>
                <div className="text-sm font-bold text-white">{diagnostics.os}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">SCREEN RESOLUTION</span>
                <div className="text-sm font-bold text-white">{diagnostics.screenResolution}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">DEVICE PIXEL RATIO</span>
                <div className="text-sm font-bold text-white">{diagnostics.devicePixelRatio}x (DPI scale)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">HARDWARE GRAPHICS (WEBGL)</span>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{diagnostics.webGlSupported ? 'Supported (Direct3D)' : 'Disabled'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">MEDIARECORDER VIDEO CAPTURE</span>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{diagnostics.mediaRecorderSupported ? 'Ready for Screen Recording' : 'Unavailable'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              Running hardware diagnostics...
            </div>
          )}
        </div>

        {/* Troubleshooting Decision Tree */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Common Troubleshooting Guides
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Instant solutions for Windows Administrator privileges, multi-monitor shifts, and browser permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guide 1 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Elevated Apps (UIPI)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If ProScreen does not accept drawing over Task Manager or Administrator Command Prompts, right-click the ProScreen shortcut and select <strong>Run as administrator</strong>.
              </p>
            </div>

            {/* Guide 2 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Monitor className="w-4 h-4" />
                <span>Multi-Monitor Re-Clamping</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If an external monitor is disconnected, ProScreen automatically detects Windows <code className="text-sky-300">display-metrics-changed</code> and auto-clamps the toolbar inside the primary visible display.
              </p>
            </div>

            {/* Guide 3 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Chrome Extension Reload</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If you update the extension bundle, visit <code className="text-amber-300">chrome://extensions</code> and click the circular <strong>Reload</strong> icon to apply updates instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Feedback Form */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Send Direct Message to ProScreen Team</h2>
            <p className="text-sm text-slate-300">
              Have a bug report, feature request, or corporate deployment question? Drop us a note below.
            </p>
          </div>

          {formSubmitted ? (
            <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Message Received!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Thank you for your feedback. Our core engineering team reviews all incoming inquiries.
              </p>
              <button
                onClick={() => setFormSubmitted(false)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white border border-slate-800"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">YOUR NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400">TOPIC CATEGORY</label>
                <select
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="general">General Question</option>
                  <option value="windows-bug">Windows Desktop Bug Report</option>
                  <option value="extension-bug">Chrome Extension Issue</option>
                  <option value="feature-request">Feature Request / Enhancement</option>
                  <option value="enterprise">Enterprise / School Distribution</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400">MESSAGE</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your issue or suggestions in detail..."
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
