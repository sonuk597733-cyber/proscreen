import React, { useState } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eye,
  Camera,
  Video,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Keyboard,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface FirstLaunchOnboardingModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export const FirstLaunchOnboardingModal: React.FC<FirstLaunchOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to ProScreen',
      subtitle: 'Your Screen. Your Canvas.',
      icon: Sparkles,
      iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p className="leading-relaxed">
            ProScreen is a professional screen annotation and presentation studio for Windows. It provides a lightweight, transparent overlay that lets you draw, highlight, type, and record over any application.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero Latency</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Hardware-accelerated drawing overlay with immediate stroke response.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Private</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Zero tracking, zero analytics, zero cloud transmission. Everything stays on your PC.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Pointer Mode (Pass-Through)',
      subtitle: 'Work with your applications without interference',
      icon: MousePointer,
      iconBg: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p className="leading-relaxed">
            By default, ProScreen starts in <strong className="text-white">Pointer Mode</strong>. While in Pointer Mode, ProScreen ignores mouse clicks and forwards every click, scroll, and drag directly to underlying apps (Excel, VS Code, PowerPoint, browser).
          </p>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Instant Return to Pointer Mode:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">
                Alt + V
              </kbd>
            </div>
            <p className="text-[11px] text-slate-400">
              Finished drawing a diagram? Press <code className="text-sky-300">Alt+V</code> anytime to immediately interact with your desktop apps again.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Studio Annotation Tools',
      subtitle: 'Highlighters, pens, arrows, and shapes',
      icon: PenTool,
      iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p className="text-xs leading-relaxed">
            Choose from a rich set of production tools designed for presentations and video creation:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2 text-white">
                <PenTool className="w-3.5 h-3.5 text-blue-400" />
                <span>Pen Tool</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">Alt+P</kbd>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2 text-white">
                <Highlighter className="w-3.5 h-3.5 text-yellow-400" />
                <span>Highlighter</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">Alt+H</kbd>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2 text-white">
                <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                <span>Arrow Tool</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">Alt+A</kbd>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2 text-white">
                <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                <span>Text Tool</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">Alt+T</kbd>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            Need a clean canvas? Toggle <strong className="text-white">Whiteboard (Alt+W)</strong> or <strong className="text-white">Blackboard (Alt+B)</strong> anytime.
          </p>
        </div>
      ),
    },
    {
      title: 'Floating Eye & Capture',
      subtitle: 'Hide the toolbar cleanly during presentations',
      icon: Eye,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p className="leading-relaxed">
            Click the <strong className="text-white">Eye icon</strong> on the toolbar (or press <strong className="text-emerald-300 font-mono">Alt+Shift+P</strong>) to collapse the studio. Your annotations stay on screen while the toolbar shrinks into a tiny floating restore eye you can place anywhere.
          </p>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                <Camera className="w-3.5 h-3.5 text-sky-400" /> Screenshot
              </span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px] border border-slate-700">
                Alt + Shift + S
              </kbd>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                <Video className="w-3.5 h-3.5 text-rose-400" /> Screen Recording
              </span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-rose-300 font-mono text-[10px] border border-slate-700">
                Alt + Shift + R
              </kbd>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleFinish = () => {
    onClose(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1120] to-slate-950 border border-blue-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Welcome Guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Header */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${current.iconBg} shrink-0`}>
            <current.icon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-blue-400 font-semibold tracking-wider uppercase">
              Step {currentStep + 1} of {steps.length}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {current.title}
            </h3>
            <p className="text-xs text-slate-400">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Step Body */}
        <div className="min-h-[160px] flex flex-col justify-center">
          {current.content}
        </div>

        {/* Stepper Dots & Navigation Buttons */}
        <div className="pt-2 border-t border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            {/* Step Indicator Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Back & Next / Finish Controls */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {isLast ? (
                <button
                  onClick={handleFinish}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep((s) => s + 1)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Don't show again checkbox */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[11px]">Don&apos;t show this guide on startup</span>
            </label>

            <button
              onClick={handleFinish}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
