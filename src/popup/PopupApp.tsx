import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Ghost,
  Moon,
  PenTool,
  Radio,
  Settings,
  Sun,
  Trash2,
  Video,
} from 'lucide-react';
import { isRestrictedBrowserUrl } from '../utils/env';
import { loadSettings } from '../storage/storageAdapter';

export const PopupApp: React.FC = () => {
  const [tabInfo, setTabInfo] = useState<{ id?: number; url?: string; title?: string }>({});
  const [status, setStatus] = useState<string | null>(null);
  const [startingRec, setStartingRec] = useState(false);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs?.[0];
      if (t) {
        setTabInfo({ id: t.id, url: t.url, title: t.title });
      }
    });
  }, []);

  const restricted = isRestrictedBrowserUrl(tabInfo.url);

  const sendAction = (action: string) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    chrome.runtime.sendMessage(
      {
        type: 'ACTIVATE_ON_TAB',
        tabId: tabInfo.id,
        url: tabInfo.url,
        action,
      },
      (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          setStatus(res?.error || 'Could not activate overlay on this tab.');
          return;
        }
        window.close();
      }
    );
  };

  const startDirectTabRecording = async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage || typeof tabInfo.id !== 'number') {
      return;
    }
    setStartingRec(true);
    setStatus(null);
    try {
      const userSettings = await loadSettings();
      chrome.runtime.sendMessage(
        {
          type: 'START_TAB_RECORDING',
          tabId: tabInfo.id,
          url: tabInfo.url,
          fromPopup: true,
          payload: {
            mode: 'tab',
            quality: userSettings.recording.quality,
            resolution: userSettings.recording.resolution,
            frameRate: userSettings.recording.frameRate,
            mimeType: userSettings.recording.mimeType,
            micAudio: userSettings.recording.micAudio,
            tabAudio: userSettings.recording.tabAudio,
            askWhereToSave: userSettings.exportPrefs.askWhereToSave,
          },
        },
        (res) => {
          setStartingRec(false);
          if (chrome.runtime.lastError || !res?.ok) {
            setStatus(
              chrome.runtime.lastError?.message ||
                res?.error ||
                'Could not start tab recording on this page.'
            );
            return;
          }
          window.close();
        }
      );
    } catch (err) {
      setStartingRec(false);
      setStatus(err instanceof Error ? err.message : 'Unable to start tab recording.');
    }
  };

  return (
    <div className="w-[340px] bg-[#0B1120] text-slate-100 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <PenTool className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">ProScreen</h1>
            <p className="text-[11px] text-slate-400">Screen Annotation Studio</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => chrome.runtime?.openOptionsPage?.()}
          aria-label="Open full settings"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {restricted ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-semibold">Restricted Browser Page</div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-200/90">
              Chrome prevents extensions from drawing on internal pages like{' '}
              <span className="font-mono">chrome://</span> or the Chrome Web Store. Switch to any
              standard website tab to annotate.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => sendAction('show')}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Activate Annotation Toolbar
          </button>

          <button
            type="button"
            disabled={startingRec}
            onClick={() => void startDirectTabRecording()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{startingRec ? 'Starting Tab Capture...' : 'Record Current Tab (1-Click)'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => sendAction('whiteboard')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs cursor-pointer"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Whiteboard</span>
            </button>
            <button
              type="button"
              onClick={() => sendAction('blackboard')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span>Blackboard</span>
            </button>
            <button
              type="button"
              onClick={() => sendAction('creator')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>Creator Mode</span>
            </button>
            <button
              type="button"
              onClick={() => sendAction('ghost')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs cursor-pointer"
            >
              <Ghost className="w-3.5 h-3.5 text-violet-400" />
              <span>Ghost Mode</span>
            </button>
            <button
              type="button"
              onClick={() => sendAction('screenshot')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>Screenshot</span>
            </button>
            <button
              type="button"
              onClick={() => sendAction('clear')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Screen</span>
            </button>
          </div>
        </div>
      )}

      {status && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {status}
        </p>
      )}

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Toggle: Alt+Shift+P</span>
        <button
          type="button"
          onClick={() => chrome.runtime?.openOptionsPage?.()}
          className="text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Settings & Shortcuts
        </button>
      </div>
    </div>
  );
};
