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
  Download,
} from 'lucide-react';

interface UseCaseCard {
  id: string;
  role: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
}

const USE_CASES: UseCaseCard[] = [
  {
    id: 'students',
    role: 'Students',
    title: 'Capture lectures & visual study guides',
    description:
      'Record online lectures with crystal-clear system audio. Draw arrows over diagram slides, annotate formulas, and export video clips for exam revision.',
    icon: <GraduationCap className="w-5 h-5 text-blue-600" />,
    benefits: [
      'Record Zoom and Google Meet sessions with synchronized audio',
      'Fading ink marks up key points without permanently cluttering notes',
      'Instant area screenshots for assignments and homework',
    ],
  },
  {
    id: 'teachers',
    role: 'Teachers',
    title: 'Interactive classroom presentations',
    description:
      'Turn your desktop into a dynamic whiteboard during live classes. Explain mathematical equations, annotate PDF textbooks, and share video walkthroughs.',
    icon: <BookOpen className="w-5 h-5 text-blue-600" />,
    benefits: [
      'Full-screen Whiteboard and Blackboard toggles with one click',
      'Dual-track audio records both your voice narration and student questions',
      'Chisel highlighter marks textbook lines without covering text',
    ],
  },
  {
    id: 'developers',
    role: 'Developers',
    title: 'Code walkthroughs & bug reproduction',
    description:
      'Demonstrate pull requests, walk through terminal sessions, and reproduce complex issues. Annotate directly over code editors and DevTools.',
    icon: <Code2 className="w-5 h-5 text-blue-600" />,
    benefits: [
      'Direct3D pass-through: type and debug while annotations remain visible',
      '60 FPS DXGI GPU capture ensures zero dropped frames in the terminal',
      'Single application window isolation avoids sharing sensitive desktop data',
    ],
  },
  {
    id: 'creators',
    role: 'Content Creators',
    title: 'Crisp tutorials with zero watermarks',
    description:
      'Produce studio-quality video tutorials without expensive gear. Record smooth 60 FPS video with synchronized microphone commentary and instant playback.',
    icon: <Video className="w-5 h-5 text-blue-600" />,
    benefits: [
      'Broadcast-quality 48 kHz audio with hardware peak limiter',
      'Built-in player with scrub timeline and multi-speed playback (0.5x–2x)',
      'Clean exports with zero watermarks and zero time limits',
    ],
  },
  {
    id: 'trainers',
    role: 'Online Trainers',
    title: 'Software onboarding & training SOPs',
    description:
      'Create step-by-step training walkthroughs for enterprise software. Frame precise UI sections with Area Recording and highlight essential workflow steps.',
    icon: <Presentation className="w-5 h-5 text-blue-600" />,
    benefits: [
      'Sub-pixel area selection frames specific software panels',
      'Fading ink countdown timer keeps students focused on active steps',
      'Clean WebM and MP4 container exports for LMS platforms',
    ],
  },
  {
    id: 'professionals',
    role: 'Business Professionals',
    title: 'Asynchronous updates & executive reviews',
    description:
      'Replace lengthy meetings with quick video walkthroughs. Review quarterly decks, highlight spreadsheets, and share actionable video summaries.',
    icon: <Briefcase className="w-5 h-5 text-blue-600" />,
    benefits: [
      '100% local processing protects corporate confidential data',
      'Zero telemetry, zero cloud uploads, and zero account dependencies',
      'Immediate seek metadata for instant scrubbing in VLC or browser',
    ],
  },
];

export const UseCasesSection: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <section id="use-cases" className="py-20 lg:py-28 bg-white scroll-mt-18 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              BUILT FOR EVERY WORKFLOW
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Designed for those who explain for a living
          </h2>

          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Whether you teach a classroom, document code, or train a distributed team, ProScreen adapts to your presentation style.
          </p>
        </div>

        {/* 6 Clean Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {USE_CASES.map((uc) => (
            <div
              key={uc.id}
              className="bg-neutral-50/70 hover:bg-neutral-50 rounded-2xl border border-neutral-200/80 p-7 flex flex-col justify-between space-y-6 transition-colors shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                    {uc.icon}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {uc.role}
                    </span>
                    <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                      {uc.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-neutral-600 leading-relaxed">
                  {uc.description}
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-neutral-700">
                  {uc.benefits.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Action Callout */}
        <div className="mt-14 text-center">
          <button
            onClick={() => navigate('home', 'download')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Free for Windows</span>
          </button>
        </div>
      </div>
    </section>
  );
};
