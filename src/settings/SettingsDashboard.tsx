import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  Info,
  Keyboard,
  Paintbrush,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  RecordingMode,
  RecordingQuality,
  RecordingResolution,
  ResolvedThemeMode,
  ThemeMode,
  UserSettings,
} from '../types/settings';
import { BoardMode, ToolType } from '../types/annotation';
import {
  DEFAULT_SHORTCUTS,
  detectShortcutConflicts,
  eventToShortcutString,
} from '../shortcuts/shortcutManager';
import { resolveThemeMode } from '../utils/theme';
import { TIMER_PRESETS_MS, clampTimerDurationMs, formatCountdownMs } from '../canvas/timer';
import {
  RecordingArtifact,
  RecordingFormatOption,
  getSupportedRecordingFormats,
} from '../recorder/screenRecorder';

type SettingsTab = 'general' | 'drawing' | 'creator' | 'shortcuts' | 'data' | 'about';

const ACCENT_SWATCHES = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface SettingsDashboardProps {
  open: boolean;
  isStandalonePage?: boolean;
  settings: UserSettings;
  resolvedTheme?: ResolvedThemeMode;
  latestRecording?: RecordingArtifact | null;
  supportedRecordingFormats?: RecordingFormatOption[];
  onUpdateSettings: (updater: (prev: UserSettings) => UserSettings) => void;
  onExportSettings: () => void;
  onImportSettings: (jsonText: string) => boolean;
  onResetSettings: () => void;
  onClearSavedAnnotations: () => void;
  onClearTemporaryRecording?: () => void;
  onClose?: () => void;
}

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({
  open,
  isStandalonePage = false,
  settings,
  resolvedTheme,
  latestRecording = null,
  supportedRecordingFormats,
  onUpdateSettings,
  onExportSettings,
  onImportSettings,
  onResetSettings,
  onClearSavedAnnotations,
  onClearTemporaryRecording,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open && !isStandalonePage) return null;

  const effectiveTheme = resolvedTheme ?? resolveThemeMode(settings.theme);
  const isDark = effectiveTheme === 'dark';
  const isDesktopApp =
    typeof window !== 'undefined' && Boolean((window as Window & { proscreenDesktop?: { isDesktop?: boolean } }).proscreenDesktop?.isDesktop);
  const conflicts = detectShortcutConflicts(settings.shortcuts);
  const formatOptions = supportedRecordingFormats ?? getSupportedRecordingFormats();
  const accentColor = settings.accentColor || '#2563EB';

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Sliders className="w-4 h-4" /> },
    { id: 'drawing', label: 'Drawing & Timer', icon: <Paintbrush className="w-4 h-4" /> },
    { id: 'creator', label: 'Recorder & Creator', icon: <Video className="w-4 h-4" /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'data', label: 'Data & Storage', icon: <Database className="w-4 h-4" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  ];

  const cardClass = isDark
    ? 'bg-slate-900/80 border-slate-800 text-slate-100'
    : 'bg-slate-50 border-slate-200 text-slate-900';

  const inputClass = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';

  const content = (
    <div
      data-testid="settings-dashboard"
      className={`w-full max-w-4xl rounded-xl border overflow-hidden shadow-2xl flex flex-col md:flex-row ${
        isStandalonePage ? 'min-h-[540px] mx-auto my-0' : 'max-h-[86vh]'
      } ${isDark ? 'bg-[#0B1120] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
    >
      {/* Left Navigation */}
      <aside
        className={`w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-col justify-between ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div>
          <div className="px-2 pb-4 border-b border-slate-500/20">
            <h2 className="text-base font-bold tracking-tight">ProScreen Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isDesktopApp ? 'Windows Desktop Studio Preferences' : 'Extension & Studio Preferences'}
            </p>
          </div>
          <nav className="mt-3 space-y-1" aria-label="Settings sections">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={active ? { backgroundColor: accentColor } : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer ${
                    active
                      ? 'text-white'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-950'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden md:block pt-4 border-t border-slate-500/20 text-[11px] text-slate-400 px-2">
          <div>ProScreen v3.0.0</div>
          <div className="mt-0.5">
            {isDesktopApp ? 'Windows Desktop · Local Storage' : 'Manifest V3 · Local Storage'}
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-500/20">
          <h3 className="text-sm font-semibold capitalize">{activeTab} Configuration</h3>
          {!isStandalonePage && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Interface Theme</label>
                    <select
                      aria-label="Interface Theme"
                      value={settings.theme}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          theme: e.target.value as ThemeMode,
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="dark">Dark Mode</option>
                      <option value="light">Light Mode</option>
                      <option value="system">System Match ({effectiveTheme})</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Accent Color</label>
                    <div className="flex items-center gap-2 pt-1">
                      {ACCENT_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          aria-label={`Accent ${hex}`}
                          onClick={() => onUpdateSettings((p) => ({ ...p, accentColor: hex }))}
                          className={`w-6 h-6 rounded-md cursor-pointer ${
                            accentColor.toUpperCase() === hex
                              ? 'ring-2 ring-offset-1 ring-white/80'
                              : ''
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                      <input
                        type="color"
                        aria-label="Custom Accent Color"
                        value={accentColor}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            accentColor: e.target.value.toUpperCase(),
                          }))
                        }
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Toolbar Density</label>
                    <select
                      aria-label="Toolbar Density"
                      value={settings.toolbarSize}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          toolbarSize: e.target.value as 'compact' | 'standard',
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="standard">Standard (Single-Column)</option>
                      <option value="compact">Dense (Single-Column)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Default Active Tool</label>
                    <select
                      aria-label="Default Active Tool"
                      value={settings.defaultTool}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          defaultTool: e.target.value as ToolType,
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="pen">Pen</option>
                      <option value="cursor">Cursor (Pass-through)</option>
                      <option value="select">Select / Move Ink</option>
                      <option value="highlighter">Highlighter</option>
                      <option value="arrow">Arrow</option>
                      <option value="text">Text</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Default Board Mode</label>
                    <select
                      aria-label="Default Board Mode"
                      value={settings.defaultBoardMode}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          defaultBoardMode: e.target.value as BoardMode,
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="webpage">Webpage Overlay</option>
                      <option value="whiteboard">Whiteboard</option>
                      <option value="blackboard">Blackboard</option>
                      <option value="grid-paper">Grid Paper</option>
                      <option value="ruled-notebook">Ruled Notebook</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="show-tooltips" className="text-xs font-medium">
                      Show Hover Tooltips & Shortcuts
                    </label>
                    <input
                      id="show-tooltips"
                      type="checkbox"
                      checked={settings.showTooltips}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({ ...p, showTooltips: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="edge-snap" className="text-xs font-medium">
                      Snap Toolbar to Screen Edges
                    </label>
                    <input
                      id="edge-snap"
                      type="checkbox"
                      checked={settings.edgeSnapping}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({ ...p, edgeSnapping: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="start-collapsed" className="text-xs font-medium">
                      Start in 2-Icon Compact Dock
                    </label>
                    <input
                      id="start-collapsed"
                      type="checkbox"
                      checked={settings.toolbarCollapsed}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({ ...p, toolbarCollapsed: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="wb-grid" className="text-xs font-medium">
                      Show Alignment Grid on Boards
                    </label>
                    <input
                      id="wb-grid"
                      type="checkbox"
                      checked={settings.whiteboardGrid}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({ ...p, whiteboardGrid: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="confirm-clear" className="text-xs font-medium">
                      Confirm before Clear Screen
                    </label>
                    <input
                      id="confirm-clear"
                      type="checkbox"
                      checked={settings.confirmBeforeClear}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({ ...p, confirmBeforeClear: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'drawing' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <h4 className="text-xs font-semibold text-slate-400">Pen Defaults</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="flex items-center justify-between text-xs">
                    <span>Color</span>
                    <input
                      type="color"
                      value={settings.pen.color}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          pen: { ...p.pen, color: e.target.value.toUpperCase() },
                        }))
                      }
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Thickness</span>
                      <span className="font-mono tabular-nums">{settings.pen.thickness}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={36}
                      value={settings.pen.thickness}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          pen: { ...p.pen, thickness: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Opacity</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(settings.pen.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(settings.pen.opacity * 100)}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          pen: { ...p.pen, opacity: Number(e.target.value) / 100 },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <h4 className="text-xs font-semibold text-slate-400">Highlighter Defaults</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="flex items-center justify-between text-xs">
                    <span>Color</span>
                    <input
                      type="color"
                      value={settings.highlighter.color}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          highlighter: {
                            ...p.highlighter,
                            color: e.target.value.toUpperCase(),
                          },
                        }))
                      }
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Thickness</span>
                      <span className="font-mono tabular-nums">
                        {settings.highlighter.thickness}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={64}
                      value={settings.highlighter.thickness}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          highlighter: { ...p.highlighter, thickness: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Opacity</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(settings.highlighter.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={75}
                      value={Math.round(settings.highlighter.opacity * 100)}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          highlighter: { ...p.highlighter, opacity: Number(e.target.value) / 100 },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <h4 className="text-xs font-semibold text-slate-400">Eraser & Shape Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Eraser Radius</span>
                      <span className="font-mono tabular-nums">{settings.eraserSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={72}
                      value={settings.eraserSize}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({ ...p, eraserSize: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Shape Border</span>
                      <span className="font-mono tabular-nums">{settings.shape.thickness}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={settings.shape.thickness}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          shape: { ...p.shape, thickness: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Arrow Head Size</span>
                      <span className="font-mono tabular-nums">
                        {settings.shape.arrowHeadSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={36}
                      value={settings.shape.arrowHeadSize}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          shape: { ...p.shape, arrowHeadSize: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <h4 className="text-xs font-semibold text-slate-400">
                  Annotation Timer & Optional Effects
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">Annotation Auto-Clear Timer</div>
                      <p className="text-xs text-slate-400">
                        Disabled by default so drawings stay permanently until manually cleared.
                        When enabled, newly drawn annotations clear after the selected duration.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable Annotation Timer"
                      checked={settings.timer.enabled}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          timer: { ...p.timer, enabled: e.target.checked, paused: false },
                        }))
                      }
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 mr-1">
                      Duration ({formatCountdownMs(settings.timer.durationMs)}):
                    </span>
                    {TIMER_PRESETS_MS.map((preset) => (
                      <button
                        key={preset.ms}
                        type="button"
                        onClick={() =>
                          onUpdateSettings((p) => ({
                            ...p,
                            timer: { ...p.timer, durationMs: preset.ms },
                          }))
                        }
                        className={`px-2 py-1 rounded text-xs font-mono cursor-pointer ${
                          settings.timer.durationMs === preset.ms
                            ? 'bg-amber-600 text-white'
                            : 'border border-slate-500/30 hover:bg-slate-500/15'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <label className="inline-flex items-center gap-1 text-xs ml-auto">
                      <span>Sec:</span>
                      <input
                        type="number"
                        min={1}
                        max={3600}
                        value={Math.round(settings.timer.durationMs / 1000)}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            timer: {
                              ...p.timer,
                              durationMs: clampTimerDurationMs(Number(e.target.value || 1) * 1000),
                            },
                          }))
                        }
                        className={`w-16 px-2 py-1 text-xs rounded border font-mono ${inputClass}`}
                      />
                    </label>
                  </div>

                  <div className="pt-3 border-t border-slate-500/20">
                    <label className="flex items-center justify-between gap-3 text-xs">
                      <span className="max-w-xl">
                        <span className="block font-medium">Show timer progress in recordings</span>
                        <span className="block mt-1 text-slate-400">
                          Shows a small progress ring while timed ink is active. Nothing floats on screen while you are not recording.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        aria-label="Show timer progress in recordings"
                        checked={settings.timer.showInRecording}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            timer: { ...p.timer, showInRecording: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-500/20">
                    <div>
                      <div className="text-xs font-semibold">
                        Optional Fading Ink Effect (Laser Ink)
                      </div>
                      <p className="text-xs text-slate-400">
                        OFF by default. When turned on, new ink smoothly fades out after the fade
                        duration without requiring manual erasing.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable Optional Fading Ink"
                      checked={settings.creator.fadingInkEnabled}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          creator: { ...p.creator, fadingInkEnabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-semibold">Keyboard Shortcut Visualizer</h4>
                    <p className="mt-1 max-w-xl text-xs text-slate-400">
                      Off by default. When enabled, ProScreen shows modified shortcuts only while a ProScreen desktop window or supported extension tab is active. Other apps are never observed, and keys are not saved.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Enable Keyboard Shortcut Visualizer"
                    checked={settings.keyboardVisualizer.enabled}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        keyboardVisualizer: { ...p.keyboardVisualizer, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="space-y-1 text-xs">
                    <span className="block text-slate-400">Notification position</span>
                    <select
                      aria-label="Keyboard Visualizer Position"
                      value={settings.keyboardVisualizer.position}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          keyboardVisualizer: {
                            ...p.keyboardVisualizer,
                            position: e.target.value as UserSettings['keyboardVisualizer']['position'],
                          },
                        }))
                      }
                      className={`w-full px-2.5 py-2 rounded-lg border ${inputClass}`}
                    >
                      <option value="bottom-left">Bottom left</option>
                      <option value="bottom-center">Bottom center</option>
                      <option value="bottom-right">Bottom right</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 text-xs">
                    <span>Animate notifications</span>
                    <input
                      type="checkbox"
                      aria-label="Animate shortcut notifications"
                      checked={settings.keyboardVisualizer.animate}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          keyboardVisualizer: { ...p.keyboardVisualizer, animate: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-sky-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-xs">
                    <span>Show shortcuts in recordings</span>
                    <input
                      type="checkbox"
                      aria-label="Show shortcuts in recordings"
                      checked={settings.keyboardVisualizer.showInRecording}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          keyboardVisualizer: { ...p.keyboardVisualizer, showInRecording: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-sky-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'creator' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <h4 className="text-xs font-semibold text-slate-400">
                  Built-In Video Screen Recorder Defaults
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Capture Mode</label>
                    <select
                      aria-label="Default Capture Mode"
                      value={settings.recording.mode}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          recording: { ...p.recording, mode: e.target.value as RecordingMode },
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="tab">Current Browser Tab</option>
                      <option value="window">Application Window</option>
                      <option value="screen">Entire Screen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Resolution</label>
                    <select
                      aria-label="Recording Resolution"
                      value={settings.recording.resolution}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          recording: {
                            ...p.recording,
                            resolution: e.target.value as RecordingResolution,
                          },
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="source">Native Source Resolution</option>
                      <option value="1080p">1080p Full HD (1920x1080)</option>
                      <option value="720p">720p HD (1280x720)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Quality Preset</label>
                    <select
                      aria-label="Recording Quality"
                      value={settings.recording.quality}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          recording: {
                            ...p.recording,
                            quality: e.target.value as RecordingQuality,
                          },
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="standard">Standard (2.5 Mbps)</option>
                      <option value="high">High (5 Mbps)</option>
                      <option value="ultra">Ultra (8 Mbps)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Frame Rate</label>
                    <select
                      aria-label="Recording FPS"
                      value={settings.recording.frameRate}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          recording: {
                            ...p.recording,
                            frameRate: Number(e.target.value) === 60 ? 60 : 30,
                          },
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Video Format</label>
                    <select
                      aria-label="Recording Video Format"
                      value={settings.recording.mimeType}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          recording: { ...p.recording, mimeType: e.target.value },
                        }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${inputClass}`}
                    >
                      <option value="auto">Auto (Best Supported)</option>
                      {formatOptions.map((opt) => (
                        <option key={opt.mimeType} value={opt.mimeType}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col justify-center gap-2 pt-2">
                    <label className="flex items-center justify-between text-xs">
                      <span>Include Tab Audio</span>
                      <input
                        type="checkbox"
                        checked={settings.recording.tabAudio}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            recording: { ...p.recording, tabAudio: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs">
                      <span>Include Microphone Audio</span>
                      <input
                        type="checkbox"
                        checked={settings.recording.micAudio}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            recording: { ...p.recording, micAudio: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Recording-Friendly Minimal Toolbar</div>
                    <p className="text-xs text-slate-400">
                      Hides secondary management icons during Creator Mode so recordings stay clean.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Recording-Friendly Minimal Toolbar"
                    checked={settings.creator.recordingFriendlyToolbar}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        creator: { ...p.creator, recordingFriendlyToolbar: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Ghost Mode Hotkey Reminder</div>
                    <p className="text-xs text-slate-400">
                      Briefly displays a restore shortcut toast when entering Ghost Mode.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Ghost Mode Hotkey Reminder"
                    checked={settings.creator.ghostModeShortcutHint}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        creator: { ...p.creator, ghostModeShortcutHint: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-500/20">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Optional Fade Duration</span>
                      <span className="font-mono tabular-nums">
                        {(settings.creator.fadingInkDurationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={10000}
                      step={500}
                      value={settings.creator.fadingInkDurationMs}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          creator: { ...p.creator, fadingInkDurationMs: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Spotlight Radius</span>
                      <span className="font-mono tabular-nums">
                        {settings.creator.spotlightRadius}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={300}
                      step={10}
                      value={settings.creator.spotlightRadius}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          creator: { ...p.creator, spotlightRadius: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              {conflicts.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Shortcut conflict detected</div>
                    <ul className="mt-1 space-y-0.5">
                      {conflicts.map((c, idx) => (
                        <li key={idx}>
                          <span className="font-mono">{c.keys}</span>:{' '}
                          {c.reason === 'browser-reserved'
                            ? 'Reserved by Chrome/OS browser shortcuts.'
                            : `Duplicates "${c.conflictingLabel}".`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-500/20">
                  <span className="text-xs font-medium text-slate-400">
                    Click any shortcut badge and press your desired key combination
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((p) => ({
                        ...p,
                        shortcuts: DEFAULT_SHORTCUTS.map((s) => ({ ...s })),
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Shortcuts</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-500/15">
                  {settings.shortcuts.map((binding) => {
                    const isRecording = recordingId === binding.id;
                    return (
                      <div
                        key={binding.id}
                        className="flex items-center justify-between px-4 py-2.5 text-xs"
                      >
                        <div>
                          <div className="font-medium">{binding.label}</div>
                          {binding.chromeCommand && (
                            <div className="text-[11px] text-slate-400">
                              Also configurable globally in{' '}
                              <span className="font-mono">chrome://extensions/shortcuts</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setRecordingId(binding.id)}
                          onKeyDown={(e) => {
                            if (!isRecording) return;
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.key === 'Escape') {
                              setRecordingId(null);
                              return;
                            }
                            const combo = eventToShortcutString(e);
                            if (combo) {
                              onUpdateSettings((p) => ({
                                ...p,
                                shortcuts: p.shortcuts.map((s) =>
                                  s.id === binding.id ? { ...s, keys: combo } : s
                                ),
                              }));
                              setRecordingId(null);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                            isRecording
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : isDark
                              ? 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500'
                              : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                          }`}
                        >
                          {isRecording ? 'Press keys...' : binding.keys}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-3 ${cardClass}`}>
                <h4 className="text-xs font-semibold">Export & Download Preferences</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium">Ask where to save exported files</div>
                    <p className="text-xs text-slate-400">
                      Prompts Chrome Save As dialog for screenshots and video downloads when
                      available.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Ask where to save exported files"
                    checked={settings.exportPrefs.askWhereToSave}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        exportPrefs: { ...p.exportPrefs, askWhereToSave: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-3 ${cardClass}`}>
                <h4 className="text-xs font-semibold">Settings Backup & Restore</h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={onExportSettings}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Settings JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Settings JSON</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onImportSettings(reader.result);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={onResetSettings}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Settings</span>
                  </button>
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-3 ${cardClass}`}>
                <h4 className="text-xs font-semibold">Temporary Recordings & Saved Tab Ink</h4>
                <p className="text-xs text-slate-400">
                  {latestRecording
                    ? `Temporary recording buffered in memory: ${latestRecording.filename} (${Math.round(
                        latestRecording.sizeBytes / 1024
                      )} KB).`
                    : 'No temporary video recordings buffered in memory.'}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {onClearTemporaryRecording && (
                    <button
                      type="button"
                      disabled={!latestRecording}
                      onClick={onClearTemporaryRecording}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-500/30 hover:bg-slate-500/15 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Temporary Recordings</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClearSavedAnnotations}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <span>Clear Current Tab Saved Annotations</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4 text-xs leading-relaxed">
              <div className={`p-4 rounded-xl border space-y-2 ${cardClass}`}>
                <h4 className="font-semibold text-sm">
                  {isDesktopApp ? 'ProScreen Desktop v3.0.0' : 'ProScreen v3.0.0'}
                </h4>
                <p className="text-slate-400">
                  {isDesktopApp
                    ? 'A native Windows screen recording and on-screen annotation studio built for teachers, software engineers, online presenters, and video creators.'
                    : 'A Manifest V3 Chrome Extension and interactive studio built for teachers, software engineers, online presenters, and tutorial creators.'}
                </p>
                <p className="text-slate-400">
                  <strong>Privacy:</strong> All drawings, color presets, shortcuts, screenshots,
                  video recordings, and session data remain strictly on your local machine.
                  ProScreen makes zero external analytics or telemetry requests.
                </p>
              </div>

              {isDesktopApp ? (
                <div className={`p-4 rounded-xl border space-y-2 ${cardClass}`}>
                  <h4 className="font-semibold text-sm">Windows Desktop Tips</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                    <li>
                      <strong>Recordings Folder:</strong> Saved recordings are written to your Windows
                      Videos folder (or custom Save As path) and are preserved across app updates or uninstall.
                    </li>
                    <li>
                      <strong>Global Hotkeys:</strong> Press <code className="font-mono">Alt+Shift+P</code> to toggle
                      the floating toolbar or <code className="font-mono">Alt+V</code> to return to click-through Pointer mode.
                    </li>
                  </ul>
                </div>
              ) : (
                <div className={`p-4 rounded-xl border space-y-2 ${cardClass}`}>
                  <h4 className="font-semibold text-sm">Known Chrome Extension Platform Limitations</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                    <li>
                      <strong>Browser Sandbox Boundary:</strong> Manifest V3 extensions can only
                      annotate standard <code className="font-mono">http://</code> and{' '}
                      <code className="font-mono">https://</code> web pages inside Chrome. They cannot
                      draw over native Windows desktop apps, OS menus, or restricted{' '}
                      <code className="font-mono">chrome://</code> and Chrome Web Store pages.
                    </li>
                    <li>
                      <strong>Global Desktop Overlay Alternative:</strong> Cross-application Windows
                      ink requires the ProScreen Windows Desktop application.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isStandalonePage) {
    return content;
  }

  return (
    <div
      role="dialog"
      aria-label="ProScreen Settings"
      className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
    >
      {content}
    </div>
  );
};
