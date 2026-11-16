import React from 'react';
import { useRouter } from '../router';
import { MousePointer, Crop, Video, PlayCircle, ArrowRight, Download, Check } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const { navigate } = useRouter();

  const steps = [
    {
      step: '01',
      title: 'Open ProScreen',
      description: 'Launch ProScreen from your Desktop or Start Menu. The floating studio toolbar immediately appears ready over any application.',
      icon: MousePointer,
      highlight: 'Instant launch',
    },
    {
      step: '02',
      title: 'Select What You Want to Capture',
      description: 'Choose your recording mode: entire desktop, specific application window, browser tab, or custom dragged rectangular area.',
      icon: Crop,
      highlight: '4 flexible modes',
    },
    {
      step: '03',
      title: 'Record Your Screen',
      description: 'Click Record. Draw on-screen annotations, highlight critical details with chisel pens, and record dual-track microphone and system audio.',
      icon: Video,
      highlight: '60 FPS DXGI motion',
    },
    {
      step: '04',
      title: 'Preview and Save Your Recording',
      description: 'Instantly scrub through your recording with the built-in video player. Replay, inspect, and export with zero-delay seek metadata.',
      icon: PlayCircle,
      highlight: 'Immediate seek playback',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-neutral-50 scroll-mt-18 border-b border-neutral-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
              SIMPLE 4-STEP WORKFLOW
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            How ProScreen works
          </h2>

          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Zero complicated setup. Start recording, drawing, and explaining in under ten seconds.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white rounded-2xl border border-neutral-200/80 p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-blue-600 font-mono">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                    {item.title}
                  </h3>

                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{item.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Callout */}
        <div className="mt-14 text-center">
          <button
            onClick={() => navigate('home', 'download')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Try It Yourself — Free for 6 Months</span>
          </button>
        </div>
      </div>
    </section>
  );
};
