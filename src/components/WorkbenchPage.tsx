import React, { useState } from 'react';
import { Check, ChevronRight, Code2, Layers, ShieldCheck, Terminal } from 'lucide-react';
import { ToolType } from '../types/annotation';

interface WorkbenchPageProps {
  activeTabKey: string;
  activeTool: ToolType;
  ghostMode: boolean;
  presentationMode: boolean;
  toolbarVisible: boolean;
  annotationCount: number;
  backdropRef: React.MutableRefObject<HTMLElement | null>;
  onSwitchSimulatedTab: (tabKey: string) => void;
  onSelectTool: (tool: ToolType) => void;
  onToggleToolbar: () => void;
  onExitGhostMode: () => void;
  onExitPresentationMode: () => void;
  onOpenSettings: () => void;
}

const SIMULATED_TABS = [
  {
    key: 'demo:tab-architecture',
    label: 'Tab 1: System Diagram',
    title: 'Event-Driven Telemetry Architecture',
    subtitle:
      'Annotate over live diagrams, highlight request paths, or switch to Cursor Mode to test underlying interactive controls.',
  },
  {
    key: 'demo:tab-lesson',
    label: 'Tab 2: Lecture Notes',
    title: 'Linear Algebra: Eigenvalues & Transformations',
    subtitle:
      'Switch tabs freely — each browser tab stores isolated annotation layers without leaking ink across pages.',
  },
  {
    key: 'demo:tab-code',
    label: 'Tab 3: Code Review',
    title: 'TypeScript Stroke Smoothing Pipeline',
    subtitle:
      'Use the Highlighter and Arrow tools to call out lines during code walkthroughs and video tutorials.',
  },
];

export const WorkbenchPage: React.FC<WorkbenchPageProps> = ({
  activeTabKey,
  activeTool,
  ghostMode,
  presentationMode,
  toolbarVisible,
  annotationCount,
  backdropRef,
  onSwitchSimulatedTab,
  onSelectTool,
  onToggleToolbar,
  onExitGhostMode,
  onExitPresentationMode,
  onOpenSettings,
}) => {
  const [sampleCounter, setSampleCounter] = useState(0);
  const [sampleStep, setSampleStep] = useState<'ingest' | 'process' | 'emit'>('ingest');

  const currentTab =
    SIMULATED_TABS.find((t) => t.key === activeTabKey) ?? SIMULATED_TABS[0];

  return (
    <div
      ref={(el) => {
        backdropRef.current = el;
      }}
      data-presentation-mode={presentationMode ? 'true' : 'false'}
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      {presentationMode && (
        <div
          data-testid="presentation-stage-bar"
          className="fixed top-4 right-4 z-[2147483630] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-100 border border-slate-700 text-xs shadow-lg backdrop-blur-md"
        >
          <span className="font-medium">Presentation Mode</span>
          <button
            type="button"
            onClick={onExitPresentationMode}
            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
          >
            Exit (Esc)
          </button>
        </div>
      )}

      {/* Top Bar Contract: hidden during Presentation Mode */}
      {!presentationMode && (
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
          >
            ProScreen
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#sandbox"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Annotation Sandbox
            </a>
            <a
              href="#install"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Chrome Install
            </a>
            <a
              href="#shortcuts"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Shortcuts
            </a>
            <button
              type="button"
              onClick={onOpenSettings}
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Settings
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {ghostMode ? (
              <button
                type="button"
                onClick={onExitGhostMode}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Exit Ghost Mode
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleToolbar}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {toolbarVisible ? 'Hide Toolbar' : 'Show Toolbar'}
              </button>
            )}
          </div>
        </header>
      )}

      <main id="sandbox" className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Workspace Status & Simulated Tab Isolation Bar */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Chrome Extension MV3</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{annotationCount} active items</span>
                <span aria-hidden="true">·</span>
                <span>Tool: {activeTool}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 [text-wrap:balance]">
                {currentTab.title}
              </h1>
              <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
                {currentTab.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg max-w-full">
              {SIMULATED_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSwitchSimulatedTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTabKey === tab.key
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Realistic Interactive Target Surface for Drawing & Cursor Pass-Through Verification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
            {activeTabKey === 'demo:tab-architecture' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="text-xs font-medium text-slate-500">
                    Interactive Pipeline Diagram (Test Cursor Mode vs Drawing Tools)
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['ingest', 'process', 'emit'] as const).map((step, idx) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setSampleStep(step)}
                        className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                          sampleStep === step
                            ? 'border-blue-600 bg-blue-50/70 text-slate-950'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-[11px] font-mono text-slate-500">0{idx + 1}</div>
                        <div className="text-sm font-semibold capitalize mt-1">{step}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {step === 'ingest'
                            ? 'Pointer & stylus capture'
                            : step === 'process'
                            ? 'Quadratic smoothing'
                            : 'Canvas & PNG export'}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Underlying Page Interaction Check
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Switch to Cursor Mode (<kbd className="font-mono">Alt+V</kbd>) to click this
                        counter while your annotations remain visible.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="underlying-page-counter"
                      onClick={() => setSampleCounter((c) => c + 1)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums"
                    >
                      Clicks: {sampleCounter}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-slate-950 text-slate-100 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">pipeline.ts</span>
                    <span>Highlight or circle lines</span>
                  </div>
                  <pre className="text-xs font-mono leading-relaxed text-slate-200 overflow-x-auto">
{`export function smoothStroke(pts: Point[]) {
  if (pts.length < 3) return pts;
  return pts.map((p, i) => ({
    x: (p.x + (pts[i + 1]?.x ?? p.x)) / 2,
    y: (p.y + (pts[i + 1]?.y ?? p.y)) / 2,
    pressure: p.pressure ?? 0.5,
  }));
}`}
                  </pre>
                </div>
              </div>
            )}

            {activeTabKey === 'demo:tab-lesson' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-slate-950">
                    Theorem: Spectral Decomposition
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Every real symmetric matrix A can be diagonalized by an orthogonal matrix Q such
                    that A = QΛQᵀ. Try using the Highlighter tool to emphasize key variables or the
                    Whiteboard button for scratchpad derivation.
                  </p>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm text-slate-800">
                    A v = λ v &nbsp;&nbsp;⇒&nbsp;&nbsp; det(A − λI) = 0
                  </div>
                </div>
                <div className="h-52 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-xs font-medium text-slate-500">
                    Sketch Coordinate Axes Here
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTool('arrow')}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    <span>Select Arrow Tool</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activeTabKey === 'demo:tab-code' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Code2 className="w-4 h-4 text-blue-600" />
                    <span>Pull Request #142 — Canvas DPR Scaling Review</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">src/canvas/renderer.ts</span>
                </div>
                <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto">
{`const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = Math.round(window.innerWidth * dpr);
canvas.height = Math.round(window.innerHeight * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);`}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Chrome Extension Installation & Shortcut Reference */}
        {!presentationMode && (
          <section id="install" className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>Install ProScreen in Google Chrome</span>
              </div>
              <ol className="space-y-2.5 text-sm text-slate-600 list-decimal pl-5">
                <li>
                  Run <code className="text-xs bg-slate-200/70 px-1.5 py-0.5 rounded">npm run build</code>{' '}
                  to generate the Manifest V3 bundle inside <code className="text-xs bg-slate-200/70 px-1.5 py-0.5 rounded">dist/</code>.
                </li>
                <li>
                  Open <code className="text-xs bg-slate-200/70 px-1.5 py-0.5 rounded">chrome://extensions/</code> and enable{' '}
                  <strong>Developer mode</strong> in the top-right corner.
                </li>
                <li>
                  Click <strong>Load unpacked</strong> and select the generated{' '}
                  <code className="text-xs bg-slate-200/70 px-1.5 py-0.5 rounded">dist</code> folder.
                </li>
                <li>
                  Pin ProScreen to your Chrome toolbar or press{' '}
                  <kbd className="text-xs bg-slate-200/70 px-1.5 py-0.5 rounded font-mono">Alt+Shift+P</kbd> on any webpage.
                </li>
              </ol>
            </div>

            <div id="shortcuts" className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Browser Scope & Windows Companion Boundary</span>
              </div>
              <div className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Annotates standard web pages, web slides, docs, code hosts, and whiteboards
                    inside Chrome with isolated per-tab persistence.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Chrome extensions cannot draw over arbitrary Windows desktop applications or{' '}
                    <code className="text-xs bg-slate-200/70 px-1 rounded">chrome://</code> pages.
                    System-wide Windows ink requires a dedicated native companion process.
                  </span>
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
