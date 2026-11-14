import React, { useState } from 'react';
import { WORKFLOWS } from '../constants';
import { GraduationCap, Code2, LayoutDashboard, Video, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from '../router';

export const WorkflowShowcase: React.FC = () => {
  const [activeWorkflowId, setActiveWorkflowId] = useState(WORKFLOWS[0].id);
  const { navigate } = useRouter();

  const iconMap: Record<string, React.ReactNode> = {
    educators: <GraduationCap className="w-5 h-5" />,
    engineers: <Code2 className="w-5 h-5" />,
    product: <LayoutDashboard className="w-5 h-5" />,
    creators: <Video className="w-5 h-5" />,
  };

  const activeWorkflow = WORKFLOWS.find((w) => w.id === activeWorkflowId) || WORKFLOWS[0];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <span>Tailored For Real Workflows</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How Professionals Use ProScreen
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Whether you are lecturing online, reviewing code pull requests, presenting Figma mockups, or streaming tutorials — ProScreen accelerates your communication.
          </p>
        </div>

        {/* Workflow Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {WORKFLOWS.map((w) => {
            const isSelected = w.id === activeWorkflowId;
            return (
              <button
                key={w.id}
                onClick={() => setActiveWorkflowId(w.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <span className={isSelected ? 'text-white' : 'text-blue-400'}>{iconMap[w.id]}</span>
                <span>{w.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Workflow Card */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1123] to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  {activeWorkflow.role}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeWorkflow.title}
                </h3>
              </div>

              <p className="text-base text-slate-300 leading-relaxed">
                {activeWorkflow.description}
              </p>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Key Implemented Tools for this workflow:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeWorkflow.features.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  onClick={() => navigate('download')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all"
                >
                  Download Free v1.0.0
                </button>
                <button
                  onClick={() => navigate('playground')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
                >
                  Try In Studio
                </button>
              </div>
            </div>

            {/* Right Stat Callout Box */}
            <div className="lg:col-span-5 flex flex-col justify-center items-center p-8 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-center space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                {iconMap[activeWorkflow.id]}
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeWorkflow.stat}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Verified Performance Benchmark
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Direct3D hardware-accelerated drawing pipeline running seamlessly alongside active software windows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
