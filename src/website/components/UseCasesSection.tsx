import React from 'react';
import { useRouter } from '../router';
import {
  GraduationCap,
  BookOpen,
  Code2,
  Video,
  Presentation,
  Briefcase,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface UseCaseCard {
  id: string;
  role: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  bgGlow: string;
  benefits: string[];
}

const USE_CASES: UseCaseCard[] = [
  {
    id: 'students',
    role: 'Students & Learners',
    title: 'Capture Lectures & Create Visual Study Guides',
    description:
      'Record online lectures and webinars with system audio, highlight critical textbook diagrams, annotate lecture slides, and create revision videos for exam prep without messy clutter.',
    icon: <GraduationCap className="w-6 h-6" />,
    colorClass: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    bgGlow: 'from-blue-600/10 to-transparent',
    benefits: [
      'Record Zoom & Google Meet lectures with synchronized audio',
      'Fading ink timer highlights notes without permanent screen marks',
      'Instant area screenshots copied directly to your clipboard',
      '100% local video saving with zero account sign-up',
    ],
  },
  {
    id: 'teachers',
    role: 'Teachers & Educators',
    title: 'Transform Any Lesson Into an Interactive Classroom',
    description:
      'Draw mathematical derivations, point out geography maps, and switch to Blackboard mode during live video classes. Send personalized video feedback on student assignments in seconds.',
    icon: <BookOpen className="w-6 h-6" />,
    colorClass: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    bgGlow: 'from-amber-600/10 to-transparent',
    benefits: [
      'Full-screen Whiteboard and Blackboard modes with one hotkey',
      'Dual-track audio records both your voice and student questions',
      'Chisel highlighter marks textbook lines without covering text',
      'Movable floating Eye restore button keeps presentation clean',
    ],
  },
  {
    id: 'developers',
    role: 'Developers & Software Engineers',
    title: 'Walk Through Code & Reproduce Bugs with Zero Latency',
    description:
      'Explain pull requests, demonstrate UI interactions, and record bug reproduction clips with console output. Draw arrows directly over VS Code and browser DevTools with zero mouse blockage.',
    icon: <Code2 className="w-6 h-6" />,
    colorClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    bgGlow: 'from-emerald-600/10 to-transparent',
    benefits: [
      'Direct3D 11 pass-through: type and debug while annotations stay pinned',
      '60 FPS DXGI GPU capture ensures zero dropped frames in terminal',
      'Window-specific recording targets only the relevant application',
      'Directional vector arrows with 45-degree angle snapping',
    ],
  },
  {
    id: 'creators',
    role: 'Content Creators & Streamers',
    title: 'Produce High-Quality Software Tutorials with Ease',
    description:
      'Produce studio-quality video tutorials without expensive editing setups. Record crisp 60 FPS video with synchronized microphone commentary, highlight details on the fly, and review clips instantly.',
    icon: <Video className="w-6 h-6" />,
    colorClass: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    bgGlow: 'from-purple-600/10 to-transparent',
    benefits: [
      'Broadcast-quality 48 kHz audio with brickwall peak limiter',
      'Custom WebM and MP4 high-bitrate video export',
      'In-app preview modal with 0.5x–2x speed and frame scrubber',
      'No watermarks, no time limits, and zero sponsored branding',
    ],
  },
  {
    id: 'trainers',
    role: 'Online Trainers & Instructors',
    title: 'Create Scalable Enterprise SOPs & Software Onboarding',
    description:
      'Build reusable, high-impact training walkthroughs for enterprise software. Frame precise application areas with Area Recording, highlight critical workflow steps, and export clean, watermark-free videos.',
    icon: <Presentation className="w-6 h-6" />,
    colorClass: 'text-sky-400 border-sky-500/20 bg-sky-500/10',
    bgGlow: 'from-sky-600/10 to-transparent',
    benefits: [
      'Area Recording frames exact software UI boundaries',
      'Numbered callouts and geometric highlight shapes',
      'Instant WebM duration metadata for instant seeking in VLC',
      'Multi-monitor virtual coordinate calculation across all displays',
    ],
  },
  {
    id: 'professionals',
    role: 'Business Professionals & Managers',
    title: 'Replace 30-Minute Meetings with 2-Minute Video Memos',
    description:
      'Annotate financial spreadsheets, mark up PDF contracts, review slide decks, and share actionable video briefings with clients and team members asynchronously.',
    icon: <Briefcase className="w-6 h-6" />,
    colorClass: 'text-rose-400 border-rose-500/20 bg-rose-500/10',
    bgGlow: 'from-rose-600/10 to-transparent',
    benefits: [
      'Cut hours of meeting fatigue with quick async video memos',
      'Native Windows "Save As" dialog saves directly to company folders',
      'Zero telemetry and zero cloud upload ensures corporate privacy',
      'Global hotkeys (Alt+Shift+R, Alt+Shift+S) for one-second capture',
    ],
  },
];

export const UseCasesSection: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section id="use-cases" className="py-20 lg:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tailored For Real Work</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Built for Every{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Professional Workflow
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            See how ProScreen transforms everyday communication across education, software development, content creation, and business.
          </p>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map((uc) => (
            <div
              key={uc.id}
              className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0B1123]/90 to-slate-950/90 border border-slate-800/80 hover:border-blue-500/40 p-7 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${uc.colorClass} group-hover:scale-110 transition-transform`}>
                    {uc.icon}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    {uc.role}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                    {uc.title}
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-2.5">
                    {uc.description}
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  {uc.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-800/60">
                <button
                  onClick={() => navigate('download', 'download')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-950/90 hover:bg-blue-600/20 text-slate-300 hover:text-white border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all group-hover:border-blue-500/30"
                >
                  <span>Start Free in {uc.role.split(' ')[0]}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
