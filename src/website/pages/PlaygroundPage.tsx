import React from 'react';
import { ProScreenOverlay } from '../../overlay/ProScreenOverlay';
import { WorkbenchPage } from '../../components/WorkbenchPage';
import { useProScreenEngine } from '../../hooks/useProScreenEngine';
import { Sparkles, Download, Monitor, ArrowLeft, Info, HelpCircle } from 'lucide-react';
import { useRouter } from '../router';

export const PlaygroundPage: React.FC = () => {
  const { navigate } = useRouter();
  const engine = useProScreenEngine('demo:tab-architecture');

  return (
    <div className="w-full relative min-h-screen bg-[#070A14] flex flex-col">
      {/* Playground Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-slate-900/80 border-b border-blue-500/20 px-4 py-3 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                ProScreen In-Browser Live Studio
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300">
                Interactive Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Draw directly below, switch simulated tabs, test Whiteboard (Alt+W), or try the Eye button (Alt+Shift+P).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('download')}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download for Windows</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 relative overflow-hidden">
        <WorkbenchPage
          activeTabKey={engine.tabKey}
          activeTool={engine.activeTool}
          ghostMode={engine.ghostMode}
          presentationMode={engine.presentationMode}
          toolbarVisible={engine.toolbarVisible}
          annotationCount={engine.history.items.length}
          backdropRef={engine.backdropElementRef}
          onSwitchSimulatedTab={(nextKey) => engine.setTabKey(nextKey)}
          onSelectTool={(t) => engine.setActiveTool(t)}
          onToggleToolbar={() => engine.setToolbarVisible((v) => !v)}
          onExitGhostMode={() => engine.toggleGhostMode()}
          onExitPresentationMode={() => engine.togglePresentationMode()}
          onOpenSettings={() => engine.setSettingsOpen(true)}
        />

        {/* Live ProScreen Overlay Engine */}
        <ProScreenOverlay engine={engine} />
      </div>
    </div>
  );
};
