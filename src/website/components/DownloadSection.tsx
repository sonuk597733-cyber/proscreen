import React, { useState } from 'react';
import { OFFICIAL_RELEASES } from '../constants';
import {
  Monitor,
  Download,
  FileCheck,
  Check,
  Copy,
  Clock,
  ShieldCheck,
  Apple,
  Terminal,
  Cpu,
  MemoryStick,
} from 'lucide-react';

type Upcoming = {
  name: string;
  icon: React.ReactNode;
  blurb: string;
  formats: string[];
  support: string;
};

const UPCOMING: Upcoming[] = [
  {
    name: 'macOS',
    icon: <Apple className="w-5 h-5" />,
    blurb: 'Metal acceleration, ScreenCaptureKit and Apple Silicon support.',
    formats: ['Apple Silicon (.dmg)', 'Intel x64 (.dmg)'],
    support: 'macOS 12 Monterey and newer',
  },
  {
    name: 'Linux',
    icon: <Terminal className="w-5 h-5" />,
    blurb: 'PipeWire screen capture on Wayland and X11, with audio monitoring.',
    formats: ['AppImage (x86_64)', 'Debian package (.deb)'],
    support: 'Ubuntu 22.04+, Debian 12+, Fedora, Arch',
  },
];

const shorten = (hash?: string) =>
  hash ? `${hash.slice(0, 10)}…${hash.slice(-10)}` : 'Not available';

export const DownloadSection: React.FC = () => {
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const { installer, portable } = OFFICIAL_RELEASES;

  const copyChecksum = async (hash: string | undefined, id: string) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedSha(id);
      setTimeout(() => setCopiedSha(null), 2500);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  const ChecksumRow = ({ label, hash, id }: { label: string; hash?: string; id: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label} SHA-256</p>
        <p className="font-mono text-xs text-slate-200 truncate" title={hash}>
          {shorten(hash)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => copyChecksum(hash, id)}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 transition-colors"
      >
        {copiedSha === id ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <section
      id="download"
      className="py-20 lg:py-28 bg-slate-50 scroll-mt-18 border-b border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="max-w-2xl mb-12 lg:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Download ProScreen for Windows
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Install it in a minute, or run the portable build straight from a USB drive.
            macOS and Linux versions are on the way.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
          {/* Windows: the main card */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-3xl bg-slate-950 text-white p-7 sm:p-9 shadow-2xl shadow-slate-900/20 flex flex-col">
            {/* soft glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/20 blur-3xl"
            />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/30 flex items-center justify-center text-sky-300">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Windows</h3>
                  <p className="text-sm text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Available now
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
                Version 1.0.0
              </span>
            </div>

            <p className="relative mt-6 max-w-lg text-slate-300 leading-relaxed">
              A native app for Windows 11 and 10, with Direct3D GPU acceleration and DXGI
              screen capture for smooth, low-overhead recording.
            </p>

            {/* Download buttons */}
            <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href="./downloads/ProScreen-Setup-1.0.0.exe"
                download
                className="group flex items-center justify-between gap-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-4 font-semibold shadow-lg shadow-sky-500/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <span className="flex items-center gap-3">
                  <Download className="w-5 h-5" />
                  <span className="leading-tight">
                    Download installer
                    <span className="block text-xs font-medium text-slate-800/80">
                      Recommended
                    </span>
                  </span>
                </span>
                <span className="font-mono text-xs text-slate-900/80">132.7 MB</span>
              </a>

              <a
                href="./downloads/ProScreen-Portable-1.0.0.exe"
                download
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/15 px-5 py-4 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <span className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-slate-300" />
                  <span className="leading-tight">
                    Download portable
                    <span className="block text-xs font-medium text-slate-400">
                      No install needed
                    </span>
                  </span>
                </span>
                <span className="font-mono text-xs text-slate-400">118.4 MB</span>
              </a>
            </div>

            {/* Verify */}
            <div className="relative mt-8 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verify your download
              </p>
              <ChecksumRow label="Installer" hash={installer?.sha256} id="installer" />
              <ChecksumRow label="Portable" hash={portable?.sha256} id="portable" />
            </div>

            {/* Requirements */}
            <div className="relative mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-500" />
                Windows 11 / 10 (64-bit)
              </span>
              <span className="flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-slate-500" />
                4 GB RAM minimum
              </span>
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-500" />
                DirectX 11 GPU
              </span>
            </div>
          </div>

          {/* macOS + Linux: quiet cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {UPCOMING.map((p) => (
              <div
                key={p.name}
                className="flex-1 rounded-3xl bg-white ring-1 ring-slate-200 p-6 sm:p-7 flex flex-col"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                      {p.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    In development
                  </span>
                </div>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed">{p.blurb}</p>

                <ul className="mt-4 space-y-2">
                  {p.formats.map((f) => (
                    <li
                      key={f}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-400 ring-1 ring-slate-100"
                    >
                      <span>{f}</span>
                      <span className="text-xs">Coming soon</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-auto pt-4 text-xs text-slate-500">{p.support}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};