import { isRestrictedBrowserUrl } from '../utils/env';
import { recDebugLog } from '../recorder/debugLog';

async function ensureContentScriptInjected(tabId: number, url?: string): Promise<boolean> {
  if (isRestrictedBrowserUrl(url)) {
    return false;
  }
  try {
    const ping = await new Promise<boolean>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'PROSCREEN_PING' }, (res) => {
        if (chrome.runtime.lastError || !res?.alive) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (ping) return true;

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css'],
      });
    } catch {
      // CSS may already be injected
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existingContexts = await (
    chrome.runtime as unknown as {
      getContexts?: (opts: { contextTypes: string[]; documentUrls?: string[] }) => Promise<unknown[]>;
    }
  ).getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts && existingContexts.length > 0) {
    return;
  }

  const reasons: chrome.offscreen.Reason[] = [chrome.offscreen.Reason.USER_MEDIA];
  const displayMediaReason = (chrome.offscreen.Reason as unknown as Record<string, chrome.offscreen.Reason>)
    .DISPLAY_MEDIA;
  if (displayMediaReason) {
    reasons.push(displayMediaReason);
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons,
    justification: 'Record Chrome tab, window, or screen video and audio for ProScreen screen recorder.',
  });
}

function downloadAndVerify(options: chrome.downloads.DownloadOptions): Promise<{
  ok: boolean;
  downloadId?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    chrome.downloads.download(options, (downloadId) => {
      if (chrome.runtime.lastError || typeof downloadId !== 'number') {
        resolve({
          ok: false,
          error: chrome.runtime.lastError?.message || 'Chrome download could not be started.',
        });
        return;
      }

      let settled = false;
      const finish = (res: { ok: boolean; downloadId?: number; error?: string }) => {
        if (settled) return;
        settled = true;
        chrome.downloads.onChanged.removeListener(onChanged);
        clearTimeout(timer);
        resolve(res);
      };

      const onChanged = (delta: chrome.downloads.DownloadDelta) => {
        if (delta.id !== downloadId) return;
        if (delta.state?.current === 'complete') {
          recDebugLog('Download result: complete', { downloadId });
          finish({ ok: true, downloadId });
        } else if (delta.state?.current === 'interrupted') {
          recDebugLog('Download result: interrupted', {
            downloadId,
            error: delta.error?.current || 'interrupted',
          });
          finish({
            ok: false,
            downloadId,
            error: delta.error?.current || 'Chrome download was interrupted.',
          });
        }
      };

      const timer = setTimeout(() => {
        // Large or SaveAs prompt downloads may remain in progress; verify existence before timing out
        chrome.downloads.search({ id: downloadId }, (items) => {
          const item = items?.[0];
          if (item?.state === 'interrupted') {
            finish({ ok: false, downloadId, error: item.error || 'Download interrupted.' });
          } else {
            finish({ ok: true, downloadId });
          }
        });
      }, 15_000);

      chrome.downloads.onChanged.addListener(onChanged);
    });
  });
}

function sendMessageToTabSafe(tabId: number, payload: unknown) {
  try {
    chrome.tabs.sendMessage(tabId, payload, () => {
      // Read lastError to avoid unchecked runtime.lastError warnings when tab navigated/closed
      void chrome.runtime.lastError;
    });
  } catch {
    // Ignore closed/navigated tabs
  }
}

let activeRecordingTabId: number | null = null;
let lastRetainedDownload: { url: string; filename: string } | null = null;

chrome.commands.onCommand.addListener(async (command) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;

  const ready = await ensureContentScriptInjected(activeTab.id, activeTab.url);
  if (!ready) return;

  sendMessageToTabSafe(activeTab.id, {
    type: 'PROSCREEN_COMMAND',
    command,
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return;

  if (message.type === 'ACTIVATE_ON_TAB') {
    (async () => {
      const tabId: number | undefined = message.tabId ?? sender.tab?.id;
      const url: string | undefined = message.url ?? sender.tab?.url;
      if (typeof tabId !== 'number') {
        sendResponse({ ok: false, error: 'No active tab found.' });
        return;
      }
      if (isRestrictedBrowserUrl(url)) {
        sendResponse({
          ok: false,
          error:
            'Chrome security policy blocks extensions from drawing on chrome://, edge://, or Chrome Web Store pages.',
        });
        return;
      }
      const ok = await ensureContentScriptInjected(tabId, url);
      if (!ok) {
        sendResponse({
          ok: false,
          error: 'Could not inject ProScreen overlay into this page.',
        });
        return;
      }
      sendMessageToTabSafe(tabId, {
        type: 'PROSCREEN_ACTION',
        action: message.action ?? 'show',
        payload: message.payload,
      });
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'GET_TAB_ID') {
    if (typeof sender.tab?.id === 'number') {
      sendResponse({ tabId: sender.tab.id });
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tabId: tabs?.[0]?.id ?? null });
    });
    return true;
  }

  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    (async () => {
      let windowId = sender.tab?.windowId;
      if (typeof windowId !== 'number') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        windowId = activeTab?.windowId;
      }
      if (typeof windowId !== 'number') {
        sendResponse({ ok: false, error: 'Unable to determine active Chrome window.' });
        return;
      }
      chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          sendResponse({
            ok: false,
            error:
              chrome.runtime.lastError?.message ||
              'Chrome refused tab capture due to page restrictions or missing tab permissions.',
          });
          return;
        }
        sendResponse({ ok: true, dataUrl });
      });
    })();
    return true;
  }

  if (message.type === 'DOWNLOAD_PNG' || message.type === 'DOWNLOAD_FILE') {
    const filename = message.filename || `proscreen-${Date.now()}.png`;
    const saveAs = Boolean(message.saveAs);
    const url = message.dataUrl || message.url;
    if (!url) {
      sendResponse({ ok: false, error: 'Missing file URL for Chrome download.' });
      return;
    }
    void downloadAndVerify({
      url,
      filename,
      saveAs,
      conflictAction: 'uniquify',
    }).then((res) => {
      sendResponse({ ...res, filename });
    });
    return true;
  }

  if (message.type === 'DOWNLOAD_OFFSCREEN_RECORDING') {
    (async () => {
      let downloadUrl = lastRetainedDownload?.url;
      let filename = message.filename || lastRetainedDownload?.filename || `proscreen-recording-${Date.now()}.webm`;

      if (!downloadUrl) {
        const retained = await new Promise<{ ok?: boolean; objectUrl?: string; filename?: string }>(
          (resolve) => {
            chrome.runtime.sendMessage({ type: 'OFFSCREEN_GET_RETAINED_URL' }, (res) => {
              if (chrome.runtime.lastError) {
                resolve({});
                return;
              }
              resolve(res ?? {});
            });
          }
        );
        downloadUrl = retained.objectUrl;
        if (!message.filename && retained.filename) {
          filename = retained.filename;
        }
      }

      if (!downloadUrl) {
        sendResponse({ ok: false, error: 'Recorded file is no longer buffered in extension memory.' });
        return;
      }

      const res = await downloadAndVerify({
        url: downloadUrl,
        filename,
        saveAs: Boolean(message.saveAs),
        conflictAction: 'uniquify',
      });
      sendResponse(res);
    })();
    return true;
  }

  if (message.type === 'START_TAB_RECORDING') {
    (async () => {
      try {
        let targetTabId: number | undefined = message.tabId ?? sender.tab?.id;
        let targetTabUrl: string | undefined = message.url ?? sender.tab?.url;
        if (typeof targetTabId !== 'number') {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          targetTabId = activeTab?.id;
          targetTabUrl = activeTab?.url;
        }
        if (typeof targetTabId !== 'number') {
          sendResponse({ ok: false, fallbackRequired: true, error: 'No active tab ID available.' });
          return;
        }

        recDebugLog('Capture API called: chrome.tabCapture.getMediaStreamId', {
          mode: 'tab',
          hasTabId: true,
        });

        const streamId = await new Promise<string>((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId({ targetTabId }, (id) => {
            if (chrome.runtime.lastError || !id) {
              recDebugLog('tabCapture result: rejected', {
                message: chrome.runtime.lastError?.message || 'streamId missing',
              });
              reject(new Error(chrome.runtime.lastError?.message || 'tabCapture stream ID denied.'));
              return;
            }
            recDebugLog('tabCapture result: granted', { hasStreamId: true });
            resolve(id);
          });
        });

        await ensureOffscreenDocument();
        activeRecordingTabId = targetTabId;

        const offscreenRes = await new Promise<{
          ok: boolean;
          mimeType?: string;
          warning?: string;
          error?: string;
        }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'OFFSCREEN_START_RECORDING',
              payload: {
                streamId,
                sourceType: 'tab',
                ...(message.payload ?? {}),
              },
            },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
                return;
              }
              resolve(res ?? { ok: false, error: 'Offscreen recorder did not respond.' });
            }
          );
        });

        // If started from extension popup, make sure the tab overlay receives active REC status bar
        if (offscreenRes.ok && message.fromPopup) {
          const injected = await ensureContentScriptInjected(targetTabId, targetTabUrl);
          if (injected) {
            sendMessageToTabSafe(targetTabId, {
              type: 'PROSCREEN_ACTION',
              action: 'external-recording-started',
              payload: {
                mode: message.payload?.mode || 'tab',
                mimeType: offscreenRes.mimeType || 'video/webm',
              },
            });
          }
        }

        if (!offscreenRes.ok) {
          activeRecordingTabId = null;
        }

        sendResponse(offscreenRes);
      } catch (err) {
        sendResponse({
          ok: false,
          fallbackRequired: true,
          error: err instanceof Error ? err.message : 'tabCapture requires extension action invocation.',
        });
      }
    })();
    return true;
  }

  if (message.type === 'CHOOSE_DESKTOP_MEDIA') {
    (async () => {
      const mode =
        message.mode === 'screen' || message.mode === 'window' || message.mode === 'tab'
          ? (message.mode as 'screen' | 'window' | 'tab')
          : 'screen';
      const tabAudio = Boolean(message.tabAudio);

      if (typeof chrome.desktopCapture?.chooseDesktopMedia !== 'function') {
        recDebugLog('chooseDesktopMedia unavailable', { mode });
        sendResponse({
          ok: false,
          errorCode: 'unsupported_mode',
          error: 'Chrome desktopCapture API is unavailable in this browser context.',
        });
        return;
      }

      let targetTab: chrome.tabs.Tab | undefined = sender.tab;
      if (!targetTab || typeof targetTab.id !== 'number') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTab = activeTab;
      }

      if (!targetTab || typeof targetTab.id !== 'number') {
        recDebugLog('chooseDesktopMedia failed: missing targetTab', { mode });
        sendResponse({
          ok: false,
          errorCode: 'no_target_tab',
          error: 'No active Chrome tab was found for desktop capture.',
        });
        return;
      }

      const rawSources: Array<'screen' | 'window' | 'tab' | 'audio'> =
        mode === 'screen'
          ? tabAudio
            ? ['screen', 'audio']
            : ['screen']
          : mode === 'window'
          ? ['window']
          : tabAudio
          ? ['tab', 'audio']
          : ['tab'];
      const sources = rawSources as unknown as chrome.desktopCapture.DesktopCaptureSourceType[];

      recDebugLog('Capture API called: chrome.desktopCapture.chooseDesktopMedia', {
        mode,
        sources,
        hasTargetTab: true,
      });

      let settled = false;
      try {
        chrome.desktopCapture.chooseDesktopMedia(sources, targetTab, (streamId, options) => {
          if (settled) return;
          settled = true;

          if (chrome.runtime.lastError) {
            recDebugLog('Picker result: runtime error', {
              mode,
              message: chrome.runtime.lastError.message,
            });
            sendResponse({
              ok: false,
              errorCode: 'picker_error',
              error: chrome.runtime.lastError.message || 'Chrome desktop capture picker failed.',
            });
            return;
          }

          if (!streamId) {
            recDebugLog('Picker result: cancelled by user', { mode });
            sendResponse({
              ok: false,
              errorCode: 'picker_cancelled',
              error: 'Screen picker was cancelled — select a source and click Share to record.',
            });
            return;
          }

          const canRequestAudioTrack = Boolean(options?.canRequestAudioTrack);
          recDebugLog('Picker result: granted', {
            mode,
            hasStreamId: true,
            canRequestAudioTrack,
          });
          sendResponse({
            ok: true,
            streamId,
            canRequestAudioTrack,
          });
        });
      } catch (err) {
        if (!settled) {
          settled = true;
          recDebugLog('chooseDesktopMedia threw exception', {
            mode,
            message: err instanceof Error ? err.message : 'unknown',
          });
          sendResponse({
            ok: false,
            errorCode: 'picker_error',
            error:
              err instanceof Error
                ? err.message
                : 'Failed to open Chrome desktop capture picker.',
          });
        }
      }
    })();
    return true;
  }

  if (message.type === 'PAUSE_TAB_RECORDING') {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_PAUSE_RECORDING' }, (res) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse(res ?? { ok: false });
    });
    return true;
  }

  if (message.type === 'RESUME_TAB_RECORDING') {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_RESUME_RECORDING' }, (res) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse(res ?? { ok: false });
    });
    return true;
  }

  if (message.type === 'STOP_TAB_RECORDING') {
    chrome.runtime.sendMessage(
      { type: 'OFFSCREEN_STOP_RECORDING', cancel: Boolean(message.cancel) },
      (res) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse(res ?? { ok: false });
      }
    );
    return true;
  }

  if (message.type === 'CLEAR_OFFSCREEN_RECORDING') {
    lastRetainedDownload = null;
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_CLEAR_RECORDING' }, () => {
      void chrome.runtime.lastError;
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'OFFSCREEN_RECORDING_FINISHED') {
    (async () => {
      let downloadOk = false;
      let downloadError: string | undefined;
      let downloadId: number | undefined;

      if (!message.cancelled && !message.error && (message.dataUrl || message.objectUrl)) {
        const filename = message.filename || `proscreen-recording-${Date.now()}.webm`;
        const primaryUrl = message.dataUrl || message.objectUrl;
        lastRetainedDownload = { url: message.objectUrl || primaryUrl, filename };

        const dlResult = await downloadAndVerify({
          url: primaryUrl,
          filename,
          saveAs: Boolean(message.saveAs),
          conflictAction: 'uniquify',
        });
        downloadOk = dlResult.ok;
        downloadError = dlResult.error;
        downloadId = dlResult.downloadId;

        if (!downloadOk && message.objectUrl && primaryUrl !== message.objectUrl) {
          const fallbackDl = await downloadAndVerify({
            url: message.objectUrl,
            filename,
            saveAs: Boolean(message.saveAs),
            conflictAction: 'uniquify',
          });
          downloadOk = fallbackDl.ok;
          downloadError = fallbackDl.error;
          downloadId = fallbackDl.downloadId;
        }
      }

      const tabToNotify = activeRecordingTabId;
      activeRecordingTabId = null;

      if (typeof tabToNotify === 'number') {
        sendMessageToTabSafe(tabToNotify, {
          type: 'PROSCREEN_RECORDING_COMPLETED',
          cancelled: Boolean(message.cancelled),
          error: message.error,
          dataUrl: message.dataUrl,
          objectUrl: message.objectUrl,
          filename: message.filename,
          mimeType: message.mimeType,
          sizeBytes: message.sizeBytes,
          durationMs: message.durationMs,
          videoWidth: message.videoWidth,
          videoHeight: message.videoHeight,
          hasAudio: message.hasAudio,
          mode: message.mode,
          downloadOk,
          downloadError,
          downloadId,
        });
      }

      sendResponse({ ok: true, downloadOk, downloadError });
    })();
    return true;
  }
});

// Ensure content script is present and responsive on active tab switch
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab?.id || isRestrictedBrowserUrl(tab.url)) return;
    await ensureContentScriptInjected(tab.id, tab.url);
  } catch {
    // Ignore closed/unsupported tabs or browser window tear-down
  }
});

// Ensure content script is injected when tab completes navigation or reload
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url && !isRestrictedBrowserUrl(tab.url)) {
    try {
      await ensureContentScriptInjected(tabId, tab.url);
    } catch {
      // Ignore
    }
  }
});

// Clean up transient tab state when a tab closes to prevent orphaned storage accumulation
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`proscreen_tab_state_v1:tab:${tabId}`]);
});
