import React from 'react';
import {
  ShieldCheck,
  Zap,
  HardDrive,
  Cpu,
  Lock,
  Layers,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface TrustPoint {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
}

const TRUST_POINTS: TrustPoint[] = [
  {
    icon: <Lock className="w-5 h-5 text-emerald-400" />,
    title: '100% Local-First & Zero Telemetry',
    description:
      'ProScreen contains zero analytics tracking, zero error reporting beacons, and no cloud dependencies. Your screen content, drawings, and audio recordings remain strictly on your local machine.',
    tag: 'Total Privacy',
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    title: 'Direct3D Hardware Pass-Through',
    description:
      'Built with native DirectX Direct3D 11 pass-through drawing. Mouse clicks, selections, and typing forward directly to underlying apps without an invisible blocking overlay.',
    tag: 'Zero Latency',
  },
  {
    icon: <Cpu className="w-5 h-5 text-blue-400" />,
    title: 'GPU Accelerated 60 FPS Engine',
    description:
      'Windows DXGI Desktop Duplication and MediaFoundation hardware video encoding bypass CPU bottlenecks, ensuring continuous 60 FPS motion without stutter or dropped frames.',
    tag: 'Fluid Motion',
  },
  {
    icon: <Layers className="w-5 h-5 text-purple-400" />,
    title: '4 Dedicated Recording Modes',
    description:
      'Tailor each recording to your exact needs: full-screen desktop capture, isolated application windows, browser tabs, or pixel-accurate custom cropped areas.',
    tag: 'Flexibility',
  },
  {
    icon: <HardDrive className="w-5 h-5 text-sky-400" />,
    title: 'Native Disk Saving & Injected Duration',
    description:
      'Recordings are written directly to disk with injected EBML duration metadata, ensuring instant range seeking and scrub responsiveness in any desktop video player.',
    tag: 'Reliable Storage',
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-rose-400" />,
    title: 'Clean Native Standalone Software',
    description:
      'Available in both a clean NSIS Windows installer and a zero-install portable executable. Leaves zero registry residue and requires no background daemon services.',
    tag: 'Clean Footprint',
  },
];

export const TrustValueSection: React.FC = () => {
  return (
    <section className="py-20 bg-[#070b17] border-y border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Honest Product Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Designed for Trust.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              Built Without Compromise.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            We believe professional software should be fast, transparent, and respectful of your computer resources and personal privacy.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TRUST_POINTS.map((pt, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:scale-105 transition-transform">
                    {pt.icon}
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {pt.tag}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                  {pt.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {pt.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-900 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified in production engine</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
