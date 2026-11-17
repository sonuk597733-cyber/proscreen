import React, { useEffect, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  LayoutGrid,
  PenTool,
  Power,
  Video,
} from 'lucide-react';
import { SettingsDashboard } from '../settings/SettingsDashboard';
import { FirstLaunchOnboardingModal } from '../components/FirstLaunchOnboardingModal';
import { UserSettings } from '../types/settings';
import type { DesktopSharedState } from '../desktop/desktopTypes';
import {
  loadSettings,
  resetSettingsToDefaults,
  saveSettings,
} from '../storage/storageAdapter';
import {
  createDefaultSettings,
  validateImportedSettingsJson,
} from '../storage/validation';

export const OptionsApp: React.FC = () => {
  const desktop = typeof window !== 'undefined' ? window.proscreenDesktop : undefined;
  const isDesktopApp = Boolean(desktop?.isDesktop);

  const [settings, setSettings] = useState<UserSettings>(() => createDefaultSettings());
  const [desktopState, setDesktopState] = useState<DesktopSharedState | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (!desktop || typeof desktop.onSettingsChanged !== 'function') return;
    return desktop.onSettingsChanged((updated) => {
      if (updated) {
        setSettings(updated);
      }
    });
  }, [desktop]);

  useEffect(() => {
    if (!desktop || typeof desktop.getState !== 'function') return;
    void desktop.getState().then(setDesktopState).catch(() => {});
    if (typeof desktop.onStateChange === 'function') {
      return desktop.onStateChange(setDesktopState);
    }
    return undefined;
  }, [desktop]);

  const updateSettings = (updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      void saveSettings(next);
      return next;
    });
  };

  const toolbarVisible = desktopState?.toolbarVisible ?? true;
  const activeTool = desktopState?.activeTool ?? 'pointer';
  const isRecording = desktopState?.isRecording ?? false;

  return (
    <div className="min-h-screen bg-[#070B14] p-3 sm:p-4">
      {isDesktopApp && desktop && (
        <header
          data-testid="desktop-studio-launcher"
          className="max-w-4xl mx-auto mb-3 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-bold text-xs shadow">
              P
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white tracking-tight truncate">
                ProScreen Desktop Studio
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Toolbar: {toolbarVisible ? 'Visible' : 'Hidden'} ·{' '}
                {activeTool === 'pointer' || activeTool === 'cursor'
                  ? 'Pointer Mode'
                  : `Drawing (${activeTool})`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => desktop.toggleEye()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-medium border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              {toolbarVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{toolbarVisible ? 'Hide Toolbar' : 'Show Toolbar'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                desktop.setEye(true);
                desktop.dispatchAction('select-tool', 'pen');
                desktop.setInteractionMode('drawing');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold whitespace-nowrap cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Start Drawing</span>
            </button>
            <button
              type="button"
              onClick={() => {
                desktop.setEye(true);
                desktop.dispatchAction('switch-board', 'whiteboard');
                desktop.setInteractionMode('drawing');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-medium border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Whiteboard</span>
            </button>
            <button
              type="button"
              onClick={() => desktop.dispatchAction('capture-screenshot')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-medium border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Screenshot</span>
            </button>
            <button
              type="button"
              onClick={() => desktop.dispatchAction('toggle-recording')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border whitespace-nowrap cursor-pointer ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isRecording ? 'Stop Recording' : 'Record'}</span>
            </button>
            <button
              type="button"
              onClick={() => desktop.quitApp()}
              title="Exit ProScreen completely"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-red-950/70 text-slate-300 hover:text-red-200 text-[11px] font-medium border border-slate-800 hover:border-red-800/60 whitespace-nowrap cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Quit</span>
            </button>
          </div>
        </header>
      )}
      {notice && (
        <div className="max-w-4xl mx-auto mb-3 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-xs text-blue-200">
          {notice}
        </div>
      )}
      <SettingsDashboard
        open
        isStandalonePage
        settings={settings}
        onUpdateSettings={updateSettings}
        onExportSettings={() => {
          const blob = new Blob([JSON.stringify(settings, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `proscreen-settings-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          setNotice('Settings exported to JSON.');
        }}
        onImportSettings={(json) => {
          const res = validateImportedSettingsJson(json);
          if (!res.ok || !res.data) {
            setNotice(res.error || 'Failed to import settings.');
            return false;
          }
          setSettings(res.data);
          void saveSettings(res.data);
          setNotice('Settings imported and saved.');
          return true;
        }}
        onResetSettings={async () => {
          const def = await resetSettingsToDefaults();
          setSettings(def);
          setNotice('Settings reset to defaults.');
        }}
        onClearSavedAnnotations={() => {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.get(null, (items) => {
              const keys = Object.keys(items).filter((k) =>
                k.startsWith('proscreen_tab_state_v1:')
              );
              if (keys.length > 0) {
                chrome.storage.local.remove(keys);
              }
              setNotice(`Cleared ${keys.length} saved tab annotation snapshot(s).`);
            });
          }
        }}
      />
      <FirstLaunchOnboardingModal
        isOpen={!settings.hasSeenOnboarding && !onboardingDismissed}
        onClose={(dontShowAgain) => {
          setOnboardingDismissed(true);
          if (dontShowAgain) {
            updateSettings((prev) => ({ ...prev, hasSeenOnboarding: true }));
          }
        }}
      />
    </div>
  );
};
