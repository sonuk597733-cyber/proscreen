import React, { useEffect, useState } from 'react';
import { SettingsDashboard } from '../settings/SettingsDashboard';
import { FirstLaunchOnboardingModal } from '../components/FirstLaunchOnboardingModal';
import { UserSettings } from '../types/settings';
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
  const [settings, setSettings] = useState<UserSettings>(() => createDefaultSettings());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const updateSettings = (updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      void saveSettings(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#070B14] p-4 sm:p-8">
      {notice && (
        <div className="max-w-4xl mx-auto mb-3 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-xs text-blue-200">
          {notice}
          <FirstLaunchOnboardingModal
        isOpen={!settings.hasSeenOnboarding}
        onClose={(dontShowAgain) => {
          if (dontShowAgain) {
            updateSettings((prev) => ({ ...prev, hasSeenOnboarding: true }));
          }
        }}
      />
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
        isOpen={!settings.hasSeenOnboarding}
        onClose={(dontShowAgain) => {
          if (dontShowAgain) {
            updateSettings((prev) => ({ ...prev, hasSeenOnboarding: true }));
          }
        }}
      />
    </div>
  );
};
