import React from 'react';
import { useRouter } from '../router';
import { FileText, CheckCircle2, Shield } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <FileText className="w-3.5 h-3.5" />
            <span>Software Licensing Agreement</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Terms & Conditions
          </h1>

          <p className="text-xs font-mono text-slate-400">
            Last Updated: November 14, 2026 • ProScreen v1.0.0
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, copying, or otherwise using ProScreen (&quot;Software&quot;, encompassing the Windows Desktop Application and Chrome Extension), you agree to be bound by these Terms and Conditions. If you do not agree with any portion of these terms, do not install or use the Software.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. License Grant</h2>
            <p>
              ProScreen grants you a personal, non-exclusive, non-transferable, royalty-free license to download, install, and execute the Software on any compatible hardware (Windows 10/11 or Chromium-based browsers) for personal, educational, non-profit, or commercial business purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. Permitted and Prohibited Uses</h2>
            <p>You are encouraged to:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs text-slate-300">
              <li>Use ProScreen to record lectures, live stream, teach, review software code, and capture screenshots.</li>
              <li>Deploy ProScreen across school computer labs, university classrooms, and company workstations.</li>
              <li>Include screenshots and recordings created using ProScreen in public or commercial presentations.</li>
            </ul>
            <p className="pt-2">You agree that you will not:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs text-slate-300">
              <li>Modify, reverse engineer, decompile, or disassemble the Software binaries to distribute malicious variants.</li>
              <li>Remove or alter any proprietary notices, trademarks, or version identifiers.</li>
              <li>Redistribute the installer under paid subscription models or bundle it with unwanted adware.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Disclaimer of Warranty</h2>
            <p>
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF OR INABILITY TO USE THE SOFTWARE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Limitation of Liability</h2>
            <p>
              Under no circumstances shall the ProScreen team be liable for any indirect, incidental, consequential, special, or exemplary damages arising out of your access to or use of the Software.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white">6. Inquiries</h2>
            <p>
              For enterprise licensing questions or educational deployment certifications, please contact our team via the <button onClick={() => navigate('support')} className="text-blue-400 underline">Support Center</button>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
