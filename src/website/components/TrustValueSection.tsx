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
    icon: <Lock className="w-5 h-5 text-blue-600" />,
    title: '100% Local-First & Zero Telemetry',
    description:
      'ProScreen contains zero analytics tracking, zero error reporting beacons, and no cloud dependencies. Your screen content, drawings, and audio recordings remain strictly on your local machine.',
    tag: 'Total Privacy',
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-600" />,
    title: 'Direct3D Hardware Pass-Through',
    description:
      'Built with native DirectX Direct3D 11 pass-through drawing. Mouse clicks, selections, and typing forward directly to underlying apps without an invisible blocking overlay.',
    tag: 'Zero Latency',
  },
  {
    icon: <Cpu className="w-5 h-5 text-emerald-600" />,
    title: 'GPU Accelerated 60 FPS Engine',
    description:
      'Windows DXGI Desktop Duplication and MediaFoundation hardware video encoding bypass CPU bottlenecks, ensuring continuous 60 FPS motion without stutter or dropped frames.',
    tag: 'Fluid Motion',
  },
  {
    icon: <Layers className="w-5 h-5 text-indigo-600" />,
    title: '4 Dedicated Recording Modes',
    description:
      'Tailor each recording to your exact needs: full-screen desktop capture, isolated application windows, browser tabs, or pixel-accurate custom cropped areas.',
    tag: 'Flexibility',
  },
  {
    icon: <HardDrive className="w-5 h-5 text-sky-600" />,
    title: 'Native Disk Saving & Injected Duration',
    description:
      'Recordings are written directly to disk with injected EBML duration metadata, ensuring instant range seeking and scrub responsiveness in any desktop video player.',
    tag: 'Reliable Storage',
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-rose-600" />,
    title: 'Clean Native Standalone Software',
    description:
      'Available in both a clean NSIS Windows installer and a zero-install portable executable. Leaves zero registry residue and requires no background daemon services.',
    tag: 'Clean Footprint',
  },
];

export const TrustValueSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              HONEST ARCHITECTURE
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Designed for trust. Built without compromise.
          </h2>

          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Professional software should be fast, transparent, and respectful of your computer resources and personal privacy.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {TRUST_POINTS.map((pt, idx) => (
            <div
              key={idx}
              className="p-7 rounded-2xl bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200/80 transition-colors flex flex-col justify-between space-y-5 shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shadow-2xs">
                    {pt.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-200/70 text-neutral-700">
                    {pt.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                  {pt.title}
                </h3>

                <p className="text-sm text-neutral-600 leading-relaxed">
                  {pt.description}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-200/60 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified in production engine</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
