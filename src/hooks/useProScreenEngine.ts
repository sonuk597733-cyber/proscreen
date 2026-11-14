import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnnotationItem,
  BoardMode,
  LaserPoint,
  Point,
  SavedSession,
  ShapeAnnotation,
  StrokeAnnotation,
  TextAnnotation,
  ToolType,
} from '../types/annotation';
import {
  RecordingMode,
  ResolvedThemeMode,
  UserSettings,
} from '../types/settings';
import { isExtensionContext } from '../utils/env';
import {
  HistoryScope,
  HistoryState,
  addAnnotationItem,
  canRedo,
  canUndo,
  clearAllAnnotations,
  createHistoryState,
  mapItemsWithoutHistory,
  pruneExpiredItems,
  redoHistory,
  removeAnnotationItems,
  undoHistory,
  updateAnnotationItem,
} from '../canvas/history';
import {
  cancelAnnotationTimers,
  clampTimerDurationMs,
  getActiveTimerCountdownMs,
  pauseAnnotationTimers,
  resetAnnotationTimers,
  resumeAnnotationTimers,
  stampAnnotationWithTimer,
} from '../canvas/timer';
import { resolveThemeMode } from '../utils/theme';
import {
  ProScreenRecorder,
  RecordingArtifact,
  RecordingStatus,
  downloadRecordingArtifact,
  formatByteSize,
  getSupportedRecordingFormats,
  isRecordingApiSupported,
} from '../recorder/screenRecorder';
import {
  BoundingBox,
  ResizeHandle,
  clientToItemPoint,
  getAnnotationBoundingBox,
  getResizeHandleAtPoint,
  hitTestAnnotationAtClientPoint,
  hitTestTopAnnotationAtClientPoint,
  itemBoxToViewportBox,
  normalizeCircleEnd,
  scaleAnnotationItem,
  simplifyAndSmoothPoints,
  snapAnglePoint,
  translateAnnotationItem,
} from '../canvas/geometry';
import {
  clearTabAnnotationState,
  deleteSavedSession,
  loadSavedSessions,
  loadSettings,
  loadTabAnnotationState,
  resetSettingsToDefaults,
  saveSessionSnapshot,
  saveSettings,
  saveTabAnnotationState,
} from '../storage/storageAdapter';
import {
  createDefaultSettings,
  validateImportedAnnotations,
  validateImportedSettingsJson,
} from '../storage/validation';
import { isEditableElement, matchesShortcutEvent } from '../shortcuts/shortcutManager';
import { pushRecentColor, toggleFavoriteColor } from '../utils/color';
import {
  CaptureResult,
  CropRect,
  captureAnnotatedScreenshot,
  copyPngToClipboard,
  downloadPngDataUrl,
} from '../screenshot/capture';
import { isShapeTool } from '../tools/toolDefinitions';

export interface StatusBanner {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface InternalBoardPage {
  id: string;
  title: string;
  boardMode: Exclude<BoardMode, 'webpage'>;
  backgroundImageDataUrl?: string;
  history: HistoryState;
}

type SelectDragMode =
  | {
      kind: 'move';
      itemId: string;
      initialItem: AnnotationItem;
      startClient: Point;
    }
  | {
      kind: 'resize';
      itemId: string;
      initialItem: AnnotationItem;
      initialBox: BoundingBox;
      handle: ResizeHandle;
      startClient: Point;
    };

export function useProScreenEngine(initialTabKey: string) {
  const [tabKey, setTabKey] = useState<string>(initialTabKey);
  const [hydratedTabKey, setHydratedTabKey] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => createDefaultSettings());
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [history, setHistory] = useState<HistoryState>(() => createHistoryState());
  const [activeTool, setActiveToolState] = useState<ToolType>('pointer');
  const [boardMode, setBoardMode] = useState<BoardMode>('webpage');
  const [boardPages, setBoardPages] = useState<InternalBoardPage[]>(() => [
    { id: 'page_1', title: 'Page 1', boardMode: 'whiteboard', history: createHistoryState([]) },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Eye OFF / ON State Architecture: toolbarVisible, restoreButtonVisible, annotationsVisible, and history (annotationData)
  const [toolbarVisible, setToolbarVisibleInternal] = useState(true);
  const [restoreButtonVisible, setRestoreButtonVisibleInternal] = useState(false);
  const [annotationsVisible, setAnnotationsVisibleInternal] = useState(true);

  // Reliable single source of truth for interactionMode
  const interactionMode: 'pointer' | 'drawing' =
    !toolbarVisible || !annotationsVisible || activeTool === 'pointer' || activeTool === 'cursor'
      ? 'pointer'
      : 'drawing';

  const setActiveTool = useCallback((tool: ToolType) => {
    const normalized = tool === 'cursor' ? 'pointer' : tool;
    setActiveToolState(normalized);
  }, []);

  const closeEye = useCallback(() => {
    setToolbarVisibleInternal(false);
    setRestoreButtonVisibleInternal(true);
    setAnnotationsVisibleInternal(true);
    setActiveToolState('pointer');
    setSelectedItemId(null);
    setSelectedTextId(null);
    setEditingTextId(null);
    draftItemRef.current = null;
    selectDragRef.current = null;
  }, []);

  const openEye = useCallback(() => {
    setToolbarVisibleInternal(true);
    setRestoreButtonVisibleInternal(false);
    setAnnotationsVisibleInternal(true);
    setActiveToolState('pointer');
  }, []);

  const toggleEye = useCallback(() => {
    setToolbarVisibleInternal((prev) => {
      const next = !prev;
      setRestoreButtonVisibleInternal(!next);
      setAnnotationsVisibleInternal(true);
      setActiveToolState('pointer');
      if (!next) {
        setSelectedItemId(null);
        setSelectedTextId(null);
        setEditingTextId(null);
        draftItemRef.current = null;
        selectDragRef.current = null;
      }
      return next;
    });
  }, []);

  const setAnnotationsVisible = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setAnnotationsVisibleInternal((prev) =>
        typeof action === 'function' ? action(prev) : action
      );
    },
    []
  );

  const setRestoreButtonVisible = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setRestoreButtonVisibleInternal((prev) =>
        typeof action === 'function' ? action(prev) : action
      );
    },
    []
  );

  const setToolbarVisible = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setToolbarVisibleInternal((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        setActiveToolState('pointer');
        if (!next) {
          setSelectedItemId(null);
          setSelectedTextId(null);
          setEditingTextId(null);
          draftItemRef.current = null;
          selectDragRef.current = null;
        }
        return next;
      });
    },
    []
  );
  const [ghostMode, setGhostMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [latestRecording, setLatestRecording] = useState<RecordingArtifact | null>(null);
  const [recordingPreviewOpen, setRecordingPreviewOpen] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeMode>(() =>
    resolveThemeMode(createDefaultSettings().theme)
  );
  const [timerNowMs, setTimerNowMs] = useState<number>(() => Date.now());

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [selectingArea, setSelectingArea] = useState(false);
  const [screenshotResult, setScreenshotResult] = useState<CaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [banner, setBanner] = useState<StatusBanner | null>(null);

  // Live transient drawing refs (avoid high-frequency React re-renders during pointer move)
  const draftItemRef = useRef<AnnotationItem | null>(null);
  const selectDragRef = useRef<SelectDragMode | null>(null);
  const laserTrailRef = useRef<LaserPoint[]>([]);
  const pointerPosRef = useRef<Point>({ x: -500, y: -500 });
  const erasedInDragRef = useRef<Set<string>>(new Set());
  const backdropElementRef = useRef<HTMLElement | null>(null);
  const recorderRef = useRef<ProScreenRecorder | null>(null);
  const tabHistoryCacheRef = useRef<Map<string, HistoryState>>(new Map());
  const webpageHistoryRef = useRef<HistoryState>(createHistoryState([]));
  const historyRef = useRef<HistoryState>(history);
  historyRef.current = history;

  const isRecording = recordingStatus !== 'idle';
  const recordingSupported = isRecordingApiSupported();
  const supportedRecordingFormats = getSupportedRecordingFormats();

  const currentBoardPage = boardPages[activePageIndex] ?? boardPages[0];
  const currentBackgroundImage =
    boardMode !== 'webpage' ? currentBoardPage?.backgroundImageDataUrl : undefined;

  const showBanner = useCallback((message: string, tone: StatusBanner['tone'] = 'info') => {
    const id = Date.now();
    setBanner({ id, message, tone });
    window.setTimeout(() => {
      setBanner((prev) => (prev && prev.id === id ? null : prev));
    }, 3600);
  }, []);

  // Load persisted settings & saved sessions on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const [loadedSettings, sessions] = await Promise.all([
        loadSettings(),
        loadSavedSessions(),
      ]);
      if (!active) return;
      setSettings(loadedSettings);
      // Requirement 1: On extension installation, browser startup, page reload, and toolbar initialization,
      // the default active tool must ALWAYS be POINTER / ARROW. Never activate Pen or any drawing tool automatically.
      setActiveToolState('pointer');
      setBoardMode(loadedSettings.defaultBoardMode);
      setSavedSessions(sessions);
      setSettingsLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep in-memory Undo/Redo cache synced only for webpage mode of the currently hydrated tab
  useEffect(() => {
    if (hydratedTabKey === tabKey && boardMode === 'webpage') {
      tabHistoryCacheRef.current.set(tabKey, history);
      webpageHistoryRef.current = history;
    } else if (boardMode !== 'webpage') {
      setBoardPages((prev) =>
        prev.map((pg, idx) =>
          idx === activePageIndex
            ? { ...pg, boardMode: boardMode as Exclude<BoardMode, 'webpage'>, history }
            : pg
        )
      );
    }
  }, [tabKey, hydratedTabKey, history, boardMode, activePageIndex]);

  // Load tab-isolated annotations whenever tabKey changes
  useEffect(() => {
    let active = true;
    setHydratedTabKey(null);
    const cached = tabHistoryCacheRef.current.get(tabKey);
    if (cached) {
      webpageHistoryRef.current = cached;
      if (boardMode === 'webpage') {
        setHistory(cached);
      }
    }
    (async () => {
      const snapshot = await loadTabAnnotationState(tabKey);
      if (!active) return;
      if (!cached) {
        if (snapshot) {
          const restored = createHistoryState(snapshot.items);
          tabHistoryCacheRef.current.set(tabKey, restored);
          webpageHistoryRef.current = restored;
          setHistory(restored);
          setBoardMode(snapshot.boardMode);
          if (typeof snapshot.toolbarVisible === 'boolean') {
            setToolbarVisibleInternal(snapshot.toolbarVisible);
          }
        } else {
          const empty = createHistoryState([]);
          tabHistoryCacheRef.current.set(tabKey, empty);
          webpageHistoryRef.current = empty;
          setHistory(empty);
          setBoardMode('webpage');
        }
      } else if (snapshot) {
        setBoardMode(snapshot.boardMode);
        if (typeof snapshot.toolbarVisible === 'boolean') {
          setToolbarVisibleInternal(snapshot.toolbarVisible);
        }
      }
      setEditingTextId(null);
      setSelectedTextId(null);
      setSelectedItemId(null);
      // Requirement 11: Switch between tabs - no stale overlay or stuck drawing mode
      setActiveToolState('pointer');
      draftItemRef.current = null;
      selectDragRef.current = null;
      setHydratedTabKey(tabKey);
    })();
    return () => {
      active = false;
    };
  }, [tabKey]);

  // Persist tab webpage annotations only once active tab has completed hydration
  useEffect(() => {
    if (!settingsLoaded || hydratedTabKey !== tabKey) return;
    if (boardMode !== 'webpage') return;
    void saveTabAnnotationState({
      tabKey,
      boardMode: 'webpage',
      items: history.items,
      toolbarVisible,
      updatedAt: Date.now(),
    });
  }, [tabKey, hydratedTabKey, boardMode, history.items, toolbarVisible, settingsLoaded]);

  // Persist settings updates cleanly
  const updateSettings = useCallback((updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      void saveSettings(next);
      return next;
    });
  }, []);

  // Resolve Dark / Light / System theme and track OS preference
  useEffect(() => {
    setResolvedTheme(resolveThemeMode(settings.theme));
    if (settings.theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  // Periodic pruning for timer-scheduled items and optional fading ink
  useEffect(() => {
    const hasExpiringItems = history.items.some(
      (i) =>
        (typeof i.expiresAt === 'number' && !settings.timer.paused) ||
        (i.fadeDurationMs && i.fadeDurationMs > 0)
    );
    if (!hasExpiringItems) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTimerNowMs(now);
      setHistory((prev) => pruneExpiredItems(prev, now));
    }, 200);
    return () => window.clearInterval(timer);
  }, [history.items, settings.timer.paused]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Active color/thickness/opacity helpers depending on current tool
  const getActiveBrushConfig = useCallback(() => {
    if (activeTool === 'highlighter') {
      return {
        color: settings.highlighter.color,
        thickness: settings.highlighter.thickness,
        opacity: settings.highlighter.opacity,
      };
    }
    if (isShapeTool(activeTool)) {
      return {
        color: settings.shape.color,
        thickness: settings.shape.thickness,
        opacity: settings.shape.opacity,
      };
    }
    if (activeTool === 'text') {
      return {
        color: settings.text.color,
        thickness: settings.text.fontSize,
        opacity: 1,
      };
    }
    if (activeTool === 'laser') {
      return {
        color: settings.laserColor,
        thickness: settings.laserSize,
        opacity: 1,
      };
    }
    if (activeTool === 'eraser') {
      return {
        color: '#94A3B8',
        thickness: settings.eraserSize,
        opacity: 1,
      };
    }
    return {
      color: settings.pen.color,
      thickness: settings.pen.thickness,
      opacity: settings.pen.opacity,
    };
  }, [activeTool, settings]);

  const setActiveColor = useCallback(
    (hex: string) => {
      updateSettings((prev) => {
        const recentColors = pushRecentColor(prev.recentColors, hex);
        if (activeTool === 'highlighter') {
          return { ...prev, recentColors, highlighter: { ...prev.highlighter, color: hex } };
        }
        if (isShapeTool(activeTool)) {
          return { ...prev, recentColors, shape: { ...prev.shape, color: hex } };
        }
        if (activeTool === 'text') {
          return { ...prev, recentColors, text: { ...prev.text, color: hex } };
        }
        if (activeTool === 'laser') {
          return { ...prev, recentColors, laserColor: hex };
        }
        return { ...prev, recentColors, pen: { ...prev.pen, color: hex } };
      });
    },
    [activeTool, updateSettings]
  );

  const setActiveThickness = useCallback(
    (thickness: number) => {
      updateSettings((prev) => {
        if (activeTool === 'highlighter') {
          return { ...prev, highlighter: { ...prev.highlighter, thickness } };
        }
        if (isShapeTool(activeTool)) {
          return { ...prev, shape: { ...prev.shape, thickness } };
        }
        if (activeTool === 'eraser') {
          return { ...prev, eraserSize: thickness };
        }
        if (activeTool === 'laser') {
          return { ...prev, laserSize: thickness };
        }
        if (activeTool === 'text') {
          return { ...prev, text: { ...prev.text, fontSize: thickness } };
        }
        return { ...prev, pen: { ...prev.pen, thickness } };
      });
    },
    [activeTool, updateSettings]
  );

  const setActiveOpacity = useCallback(
    (opacity: number) => {
      updateSettings((prev) => {
        if (activeTool === 'highlighter') {
          return { ...prev, highlighter: { ...prev.highlighter, opacity } };
        }
        if (isShapeTool(activeTool)) {
          return { ...prev, shape: { ...prev.shape, opacity } };
        }
        return { ...prev, pen: { ...prev.pen, opacity } };
      });
    },
    [activeTool, updateSettings]
  );

  const toggleFavorite = useCallback(
    (hex: string) => {
      updateSettings((prev) => ({
        ...prev,
        favoriteColors: toggleFavoriteColor(prev.favoriteColors, hex),
      }));
    },
    [updateSettings]
  );

  // Actions
  const undo = useCallback((scope: HistoryScope = 'all') => {
    setHistory((prev) => undoHistory(prev, scope));
  }, []);

  const redo = useCallback((scope: HistoryScope = 'all') => {
    setHistory((prev) => redoHistory(prev, scope));
  }, []);

  const clearScreen = useCallback(
    (force = false) => {
      if (historyRef.current.items.length === 0) return;
      if (!force && settings.confirmBeforeClear) {
        setClearConfirmOpen(true);
        return;
      }
      setClearConfirmOpen(false);
      setHistory((prev) => clearAllAnnotations(prev));
      setEditingTextId(null);
      setSelectedTextId(null);
      setSelectedItemId(null);
      showBanner('Cleared screen annotations (Ctrl+Z to undo)', 'info');
    },
    [settings.confirmBeforeClear, showBanner]
  );

  const confirmClearScreen = useCallback(() => {
    clearScreen(true);
  }, [clearScreen]);

  const cancelClearScreen = useCallback(() => {
    setClearConfirmOpen(false);
  }, []);

  const toggleGhostMode = useCallback(() => {
    setGhostMode((prev) => {
      const next = !prev;
      if (next && settings.creator.ghostModeShortcutHint) {
        showBanner('Ghost Mode active — toolbar hidden. Press Alt+G to restore.', 'info');
      }
      return next;
    });
  }, [settings.creator.ghostModeShortcutHint, showBanner]);

  const toggleCreatorMode = useCallback(() => {
    updateSettings((prev) => {
      const nextEnabled = !prev.creator.creatorModeEnabled;
      return {
        ...prev,
        creator: {
          ...prev.creator,
          creatorModeEnabled: nextEnabled,
          cursorSpotlightEnabled: nextEnabled ? true : prev.creator.cursorSpotlightEnabled,
        },
      };
    });
  }, [updateSettings]);

  // Timer Controls
  const toggleTimerEnabled = useCallback(() => {
    updateSettings((prev) => {
      const nextEnabled = !prev.timer.enabled;
      return {
        ...prev,
        timer: {
          ...prev.timer,
          enabled: nextEnabled,
          paused: nextEnabled ? prev.timer.paused : false,
        },
      };
    });
  }, [updateSettings]);

  const setTimerDurationMs = useCallback(
    (ms: number) => {
      const clamped = clampTimerDurationMs(ms);
      updateSettings((prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          durationMs: clamped,
        },
      }));
    },
    [updateSettings]
  );

  const toggleTimerPaused = useCallback(() => {
    const now = Date.now();
    const nextPaused = !settings.timer.paused;
    updateSettings((prev) => ({
      ...prev,
      timer: { ...prev.timer, paused: nextPaused },
    }));
    setHistory((prev) =>
      mapItemsWithoutHistory(prev, (items) =>
        nextPaused ? pauseAnnotationTimers(items, now) : resumeAnnotationTimers(items, now)
      )
    );
    setTimerNowMs(now);
  }, [settings.timer.paused, updateSettings]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    setHistory((prev) =>
      mapItemsWithoutHistory(prev, (items) =>
        resetAnnotationTimers(items, settings.timer.durationMs, settings.timer.paused, now)
      )
    );
    setTimerNowMs(now);
    showBanner('Active annotation timers reset', 'info');
  }, [settings.timer.durationMs, settings.timer.paused, showBanner]);

  const cancelTimer = useCallback(() => {
    updateSettings((prev) => ({
      ...prev,
      timer: { ...prev.timer, enabled: false, paused: false },
    }));
    setHistory((prev) => mapItemsWithoutHistory(prev, cancelAnnotationTimers));
    showBanner('Annotation timer turned off — existing ink will stay on screen.', 'info');
  }, [showBanner, updateSettings]);

  // Video Screen Recorder setup & controls
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const recorder = new ProScreenRecorder({
      onStatusChange: (status) => {
        setRecordingStatus(status);
        if (status === 'idle') {
          setRecordingElapsedMs(0);
        }
      },
      onComplete: (artifact) => {
        setLatestRecording((prev) => {
          if (prev?.blobUrl && prev.blobUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(prev.blobUrl);
            } catch {
              // Ignore revoke errors
            }
          }
          return artifact;
        });
        void downloadRecordingArtifact(
          artifact,
          settingsRef.current.exportPrefs.askWhereToSave
        ).then((dlRes) => {
          if (dlRes.ok) {
            showBanner(
              `Saved recording (${formatByteSize(artifact.sizeBytes)} ${
                artifact.mimeType.includes('mp4') ? 'MP4' : 'WebM'
              }).`,
              'success'
            );
          } else {
            showBanner(
              `Recording ready (${formatByteSize(artifact.sizeBytes)}), download blocked: ${
                dlRes.error || 'use Preview to download.'
              }`,
              'error'
            );
          }
        });
      },
      onCancelled: () => {
        showBanner('Screen recording cancelled — no file saved.', 'info');
      },
      onError: (msg) => {
        showBanner(msg, 'error');
      },
      onWarning: (msg) => {
        showBanner(msg, 'info');
      },
    });
    recorderRef.current = recorder;

    return () => {
      recorder.destroy();
      recorderRef.current = null;
    };
  }, [showBanner]);

  useEffect(() => {
    if (recordingStatus !== 'recording') return;
    const interval = window.setInterval(() => {
      if (recorderRef.current) {
        setRecordingElapsedMs(recorderRef.current.getElapsedMs());
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [recordingStatus]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const listener = (msg: {
      type?: string;
      cancelled?: boolean;
      error?: string;
      dataUrl?: string | null;
      objectUrl?: string;
      filename?: string;
      mimeType?: string;
      sizeBytes?: number;
      durationMs?: number;
      videoWidth?: number;
      videoHeight?: number;
      hasAudio?: boolean;
      mode?: RecordingMode;
      downloadOk?: boolean;
      downloadError?: string;
    }) => {
      if (msg?.type === 'PROSCREEN_RECORDING_COMPLETED') {
        recorderRef.current?.handleExternalOffscreenFinished();
        setRecordingStatus('idle');
        setRecordingElapsedMs(0);

        if (msg.error) {
          showBanner(msg.error, 'error');
          return;
        }
        if (msg.cancelled) {
          showBanner('Tab recording cancelled — no file saved.', 'info');
          return;
        }
        if (msg.filename && (msg.sizeBytes ?? 0) > 0) {
          const artifact: RecordingArtifact = {
            id: `rec_${Date.now()}`,
            blobUrl: msg.dataUrl || '',
            filename: msg.filename,
            mimeType: msg.mimeType || 'video/webm',
            durationMs: msg.durationMs || 0,
            sizeBytes: msg.sizeBytes || 0,
            createdAt: Date.now(),
            mode: msg.mode || 'tab',
            videoWidth: msg.videoWidth,
            videoHeight: msg.videoHeight,
            hasAudio: Boolean(msg.hasAudio),
            fromOffscreen: true,
          };
          setLatestRecording((prev) => {
            if (prev?.blobUrl && prev.blobUrl.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(prev.blobUrl);
              } catch {
                // Ignore revoke errors
              }
            }
            return artifact;
          });

          if (msg.downloadOk === false) {
            showBanner(
              `Recording captured (${formatByteSize(artifact.sizeBytes)}), Chrome download failed: ${
                msg.downloadError || 'click Download in Recorder.'
              }`,
              'error'
            );
          } else {
            showBanner(
              `Saved Chrome tab recording (${msg.filename} · ${formatByteSize(artifact.sizeBytes)}).`,
              'success'
            );
          }
        } else {
          showBanner('Recording finished with no video data.', 'error');
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [showBanner]);

  const attachExternalRecording = useCallback(
    (mode: RecordingMode, mimeType: string) => {
      setRecordingElapsedMs(0);
      recorderRef.current?.attachExternalOffscreenSession(mode, mimeType);
      showBanner('Chrome tab recording started.', 'info');
    },
    [showBanner]
  );

  const startRecording = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) return false;
    setRecordingElapsedMs(0);
    const ok = await rec.start(settings.recording, settings.exportPrefs.askWhereToSave);
    if (ok) {
      const modeLabel =
        settings.recording.mode === 'tab'
          ? 'Tab'
          : settings.recording.mode === 'window'
          ? 'Window'
          : 'Screen';
      showBanner(`${modeLabel} recording started.`, 'info');
    }
    return ok;
  }, [settings.exportPrefs.askWhereToSave, settings.recording, showBanner]);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.cancel();
  }, []);

  const toggleScreenRecording = useCallback(async () => {
    if (recordingStatus !== 'idle') {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [recordingStatus, startRecording, stopRecording]);

  const downloadLatestRecording = useCallback(async () => {
    if (!latestRecording) return;
    const res = await downloadRecordingArtifact(
      latestRecording,
      settings.exportPrefs.askWhereToSave
    );
    if (res.ok) {
      showBanner(`Downloaded ${latestRecording.filename}`, 'success');
    } else {
      showBanner(res.error || 'Could not download recording.', 'error');
    }
  }, [latestRecording, settings.exportPrefs.askWhereToSave, showBanner]);

  const clearTemporaryRecording = useCallback(() => {
    setRecordingPreviewOpen(false);
    setLatestRecording((prev) => {
      if (prev?.blobUrl && prev.blobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(prev.blobUrl);
        } catch {
          // Ignore revoke error
        }
      }
      if (prev?.fromOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'CLEAR_OFFSCREEN_RECORDING' }, () => {
          void chrome.runtime.lastError;
        });
      }
      return null;
    });
    showBanner('Cleared temporary video recording from memory.', 'info');
  }, [showBanner]);

  const togglePresentationMode = useCallback(() => {
    setPresentationMode((prev) => {
      const next = !prev;
      if (next) {
        showBanner('Presentation Mode active — streamlined stage & focus controls.', 'info');
      } else {
        showBanner('Exited Presentation Mode.', 'info');
      }
      return next;
    });
  }, [showBanner]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showBanner(
        'Fullscreen request was blocked by browser or iframe permissions.',
        'error'
      );
    }
  }, [showBanner]);

  // Multi-page Teaching Board & Mode switching
  const switchBoardMode = useCallback(
    (mode: BoardMode) => {
      if (mode === boardMode) return;

      if (mode === 'webpage') {
        setBoardPages((prev) =>
          prev.map((pg, idx) =>
            idx === activePageIndex ? { ...pg, history: historyRef.current } : pg
          )
        );
        setBoardMode('webpage');
        setHistory(webpageHistoryRef.current);
        setSelectedItemId(null);
        return;
      }

      // Entering or changing a non-webpage Teaching Board
      if (boardMode === 'webpage') {
        webpageHistoryRef.current = historyRef.current;
        const targetPage = boardPages[activePageIndex] ?? boardPages[0];
        setBoardPages((prev) =>
          prev.map((pg, idx) => (idx === activePageIndex ? { ...pg, boardMode: mode } : pg))
        );
        setHistory(targetPage?.history ?? createHistoryState([]));
      } else {
        setBoardPages((prev) =>
          prev.map((pg, idx) =>
            idx === activePageIndex ? { ...pg, boardMode: mode, history: historyRef.current } : pg
          )
        );
      }

      setBoardMode(mode);
      setSelectedItemId(null);

      if (mode === 'blackboard' && settings.pen.color === '#0F172A') {
        updateSettings((prev) => ({
          ...prev,
          pen: { ...prev.pen, color: '#F8FAFC' },
        }));
      }
      if (mode !== 'blackboard' && settings.pen.color === '#F8FAFC') {
        updateSettings((prev) => ({
          ...prev,
          pen: { ...prev.pen, color: '#0F172A' },
        }));
      }
    },
    [activePageIndex, boardMode, boardPages, settings.pen.color, updateSettings]
  );

  const selectBoardPage = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= boardPages.length || nextIndex === activePageIndex) return;
      const updated = boardPages.map((pg, idx) =>
        idx === activePageIndex && boardMode !== 'webpage'
          ? { ...pg, history: historyRef.current }
          : pg
      );
      setBoardPages(updated);
      const target = updated[nextIndex];
      setActivePageIndex(nextIndex);
      setBoardMode(target.boardMode);
      setHistory(target.history);
      setSelectedItemId(null);
    },
    [activePageIndex, boardMode, boardPages]
  );

  const addBoardPage = useCallback(() => {
    const activeSurface: Exclude<BoardMode, 'webpage'> =
      boardMode === 'webpage' ? 'whiteboard' : boardMode;
    if (boardMode === 'webpage') {
      webpageHistoryRef.current = historyRef.current;
    }
    const newPage: InternalBoardPage = {
      id: `page_${Date.now()}`,
      title: `Page ${boardPages.length + 1}`,
      boardMode: activeSurface,
      history: createHistoryState([]),
    };
    const nextPages = [
      ...boardPages.map((pg, idx) =>
        idx === activePageIndex && boardMode !== 'webpage'
          ? { ...pg, history: historyRef.current }
          : pg
      ),
      newPage,
    ];
    setBoardPages(nextPages);
    setActivePageIndex(nextPages.length - 1);
    setBoardMode(activeSurface);
    setHistory(newPage.history);
    setSelectedItemId(null);
    showBanner(`Added ${newPage.title}`, 'info');
  }, [activePageIndex, boardMode, boardPages, showBanner]);

  const setBoardBackgroundImage = useCallback(
    (dataUrl: string | undefined) => {
      if (boardMode === 'webpage') {
        switchBoardMode('whiteboard');
      }
      setBoardPages((prev) =>
        prev.map((pg, idx) =>
          idx === activePageIndex ? { ...pg, backgroundImageDataUrl: dataUrl } : pg
        )
      );
      showBanner(dataUrl ? 'Imported board background image' : 'Removed board background', 'success');
    },
    [activePageIndex, boardMode, showBanner, switchBoardMode]
  );

  // Drawing & Select/Transform Handlers
  const getScrollOffset = () => ({
    x: typeof window !== 'undefined' ? window.scrollX || 0 : 0,
    y: typeof window !== 'undefined' ? window.scrollY || 0 : 0,
  });

  const beginStrokeOrShape = useCallback(
    (pt: Point, pressure?: number) => {
      const fadeDurationMs = settings.creator.fadingInkEnabled
        ? settings.creator.fadingInkDurationMs
        : null;
      const now = Date.now();
      const coordSpace = boardMode === 'webpage' ? 'document' : 'viewport';
      const scroll = getScrollOffset();
      const itemPt = clientToItemPoint(pt, coordSpace, scroll);

      if (activeTool === 'select') {
        selectDragRef.current = null;
        if (selectedItemId) {
          const currentSelected = history.items.find((it) => it.id === selectedItemId);
          if (currentSelected) {
            const rawBox = getAnnotationBoundingBox(currentSelected);
            const viewBox = itemBoxToViewportBox(rawBox, currentSelected.coordSpace, scroll);
            const handle = getResizeHandleAtPoint(viewBox, pt, 12);
            if (handle) {
              selectDragRef.current = {
                kind: 'resize',
                itemId: currentSelected.id,
                initialItem: currentSelected,
                initialBox: rawBox,
                handle,
                startClient: pt,
              };
              draftItemRef.current = currentSelected;
              return;
            }
          }
        }

        const hit = hitTestTopAnnotationAtClientPoint(history.items, pt, 10, scroll);
        if (hit) {
          setSelectedItemId(hit.id);
          if (hit.category === 'text') setSelectedTextId(hit.id);
          selectDragRef.current = {
            kind: 'move',
            itemId: hit.id,
            initialItem: hit,
            startClient: pt,
          };
          draftItemRef.current = hit;
        } else {
          setSelectedItemId(null);
          setSelectedTextId(null);
        }
        return;
      }

      if (activeTool === 'pen' || activeTool === 'highlighter') {
        const cfg = activeTool === 'highlighter' ? settings.highlighter : settings.pen;
        const stroke: StrokeAnnotation = {
          id: `st_${now}_${Math.random().toString(36).slice(2, 7)}`,
          category: 'stroke',
          coordSpace,
          tool: activeTool,
          points: [{ x: itemPt.x, y: itemPt.y, pressure: pressure ?? 0.5, timestamp: now }],
          color: cfg.color,
          thickness: cfg.thickness,
          opacity: cfg.opacity,
          penStyle: activeTool === 'pen' ? settings.pen.penStyle ?? 'solid' : undefined,
          highlighterStyle:
            activeTool === 'highlighter' ? settings.highlighter.highlighterStyle ?? 'soft' : undefined,
          createdAt: now,
          fadeDurationMs,
        };
        draftItemRef.current = stroke;
        return;
      }

      if (isShapeTool(activeTool)) {
        const shape: ShapeAnnotation = {
          id: `sh_${now}_${Math.random().toString(36).slice(2, 7)}`,
          category: 'shape',
          coordSpace,
          shapeType: activeTool,
          start: { x: itemPt.x, y: itemPt.y },
          end: { x: itemPt.x, y: itemPt.y },
          points:
            activeTool === 'freehand-shape' ? [{ x: itemPt.x, y: itemPt.y }] : undefined,
          color: settings.shape.color,
          fillColor: settings.shape.fillColor,
          fillOpacity:
            activeTool === 'filled-rect' ? Math.max(0.22, settings.shape.fillOpacity) : 0,
          thickness: settings.shape.thickness,
          opacity: settings.shape.opacity,
          arrowHeadSize: settings.shape.arrowHeadSize,
          createdAt: now,
          fadeDurationMs,
        };
        draftItemRef.current = shape;
        return;
      }

      if (activeTool === 'eraser') {
        erasedInDragRef.current = new Set();
        const hits = history.items
          .filter((item) =>
            hitTestAnnotationAtClientPoint(item, pt, settings.eraserSize / 2, scroll)
          )
          .map((i) => i.id);
        if (hits.length > 0) {
          hits.forEach((id) => erasedInDragRef.current.add(id));
          setHistory((prev) => removeAnnotationItems(prev, hits));
        }
        return;
      }

      if (activeTool === 'laser') {
        laserTrailRef.current.push({ x: pt.x, y: pt.y, timestamp: now });
      }
    },
    [activeTool, boardMode, history.items, selectedItemId, settings]
  );

  const moveStrokeOrShape = useCallback(
    (pt: Point, pressure?: number, shiftKey = false) => {
      pointerPosRef.current = pt;
      const now = Date.now();
      const scroll = getScrollOffset();

      if (activeTool === 'select' && selectDragRef.current) {
        const drag = selectDragRef.current;
        const dx = pt.x - drag.startClient.x;
        const dy = pt.y - drag.startClient.y;
        if (drag.kind === 'move') {
          draftItemRef.current = translateAnnotationItem(drag.initialItem, dx, dy);
        } else {
          const b = drag.initialBox;
          let minX = b.minX;
          let minY = b.minY;
          let maxX = b.maxX;
          let maxY = b.maxY;
          if (drag.handle === 'nw' || drag.handle === 'sw') {
            minX = Math.min(b.maxX - 16, b.minX + dx);
          } else {
            maxX = Math.max(b.minX + 16, b.maxX + dx);
          }
          if (drag.handle === 'nw' || drag.handle === 'ne') {
            minY = Math.min(b.maxY - 16, b.minY + dy);
          } else {
            maxY = Math.max(b.minY + 16, b.maxY + dy);
          }
          draftItemRef.current = scaleAnnotationItem(drag.initialItem, b, {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
          });
        }
        return;
      }

      if (activeTool === 'laser') {
        laserTrailRef.current.push({ x: pt.x, y: pt.y, timestamp: now });
        if (laserTrailRef.current.length > 60) {
          laserTrailRef.current = laserTrailRef.current.slice(-60);
        }
        return;
      }

      if (activeTool === 'eraser' && erasedInDragRef.current) {
        const hits = history.items
          .filter(
            (item) =>
              !erasedInDragRef.current.has(item.id) &&
              hitTestAnnotationAtClientPoint(item, pt, settings.eraserSize / 2, scroll)
          )
          .map((i) => i.id);
        if (hits.length > 0) {
          hits.forEach((id) => erasedInDragRef.current.add(id));
          setHistory((prev) => removeAnnotationItems(prev, hits));
        }
        return;
      }

      const draft = draftItemRef.current;
      if (!draft) return;

      const draftSpace = draft.coordSpace ?? 'viewport';
      const itemPt = clientToItemPoint(pt, draftSpace, scroll);

      if (draft.category === 'stroke') {
        draft.points.push({ x: itemPt.x, y: itemPt.y, pressure: pressure ?? 0.5, timestamp: now });
      } else if (draft.category === 'shape') {
        if (draft.shapeType === 'freehand-shape' && draft.points) {
          draft.points.push({ x: itemPt.x, y: itemPt.y });
          draft.end = itemPt;
          return;
        }
        let nextEnd = itemPt;
        if (draft.shapeType === 'circle') {
          nextEnd = normalizeCircleEnd(draft.start, itemPt);
        } else if (
          shiftKey &&
          (draft.shapeType === 'line' ||
            draft.shapeType === 'arrow' ||
            draft.shapeType === 'double-arrow')
        ) {
          nextEnd = snapAnglePoint(draft.start, itemPt, 15);
        } else if (shiftKey && (draft.shapeType === 'rect' || draft.shapeType === 'filled-rect')) {
          nextEnd = normalizeCircleEnd(draft.start, itemPt);
        }
        draft.end = nextEnd;
      }
    },
    [activeTool, history.items, settings.eraserSize]
  );

  const endStrokeOrShape = useCallback(() => {
    if (activeTool === 'select' && selectDragRef.current) {
      const transformed = draftItemRef.current;
      const drag = selectDragRef.current;
      selectDragRef.current = null;
      draftItemRef.current = null;
      if (transformed && Math.hypot(0, 0) === 0) {
        // Only commit if pointer moved >= 2px
        const movedDist = Math.hypot(
          pointerPosRef.current.x - drag.startClient.x,
          pointerPosRef.current.y - drag.startClient.y
        );
        if (movedDist >= 2) {
          setHistory((prev) => updateAnnotationItem(prev, transformed));
        }
      }
      return;
    }

    const draft = draftItemRef.current;
    draftItemRef.current = null;
    if (!draft) return;

    if (draft.category === 'stroke') {
      const smoothed = simplifyAndSmoothPoints(draft.points, 1.5);
      const now = Date.now();
      const finalized: StrokeAnnotation = stampAnnotationWithTimer(
        {
          ...draft,
          points: smoothed,
          createdAt: now,
        },
        settings.timer,
        now
      );
      setHistory((prev) => addAnnotationItem(prev, finalized));
    } else if (draft.category === 'shape') {
      if (draft.shapeType === 'freehand-shape' && draft.points) {
        const smoothed = simplifyAndSmoothPoints(draft.points, 3);
        if (smoothed.length < 3) return;
        const box = getAnnotationBoundingBox({ ...draft, points: smoothed });
        if (box.width < 6 && box.height < 6) return;
        const now = Date.now();
        const finalized: ShapeAnnotation = stampAnnotationWithTimer(
          {
            ...draft,
            points: smoothed,
            start: { x: box.minX, y: box.minY },
            end: { x: box.maxX, y: box.maxY },
            createdAt: now,
          },
          settings.timer,
          now
        );
        setHistory((prev) => addAnnotationItem(prev, finalized));
        return;
      }
      const dist = Math.hypot(draft.end.x - draft.start.x, draft.end.y - draft.start.y);
      if (dist < 4) return;
      const now = Date.now();
      const finalized: ShapeAnnotation = stampAnnotationWithTimer(
        {
          ...draft,
          createdAt: now,
        },
        settings.timer,
        now
      );
      setHistory((prev) => addAnnotationItem(prev, finalized));
    }
  }, [activeTool, settings.timer]);

  // Text Tool Actions
  const createTextAt = useCallback(
    (pt: Point) => {
      const now = Date.now();
      const id = `txt_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const coordSpace = boardMode === 'webpage' ? 'document' : 'viewport';
      const itemPt = clientToItemPoint(pt, coordSpace, getScrollOffset());
      const item: TextAnnotation = stampAnnotationWithTimer(
        {
          id,
          category: 'text',
          coordSpace,
          x: itemPt.x,
          y: itemPt.y,
          text: '',
          fontFamily: settings.text.fontFamily,
          fontSize: settings.text.fontSize,
          bold: settings.text.bold,
          italic: settings.text.italic,
          align: settings.text.align,
          color:
            boardMode === 'blackboard' && settings.text.color === '#0F172A'
              ? '#F8FAFC'
              : settings.text.color,
          backgroundColor:
            boardMode === 'blackboard' && settings.text.backgroundColor === '#FFFFFF'
              ? '#1E293B'
              : settings.text.backgroundColor,
          createdAt: now,
          fadeDurationMs: settings.creator.fadingInkEnabled
            ? settings.creator.fadingInkDurationMs
            : null,
        },
        settings.timer,
        now
      );
      setHistory((prev) => addAnnotationItem(prev, item));
      setEditingTextId(id);
      setSelectedTextId(id);
      setSelectedItemId(id);
    },
    [boardMode, settings]
  );

  const updateTextItem = useCallback((updated: TextAnnotation) => {
    setHistory((prev) => updateAnnotationItem(prev, updated));
  }, []);

  const deleteItemById = useCallback((id: string) => {
    setHistory((prev) => removeAnnotationItems(prev, [id]));
    setEditingTextId((cur) => (cur === id ? null : cur));
    setSelectedTextId((cur) => (cur === id ? null : cur));
    setSelectedItemId((cur) => (cur === id ? null : cur));
  }, []);

  const deleteSelectedObject = useCallback(() => {
    const targetId = selectedItemId || selectedTextId;
    if (!targetId) return false;
    deleteItemById(targetId);
    showBanner('Removed selected annotation', 'info');
    return true;
  }, [deleteItemById, selectedItemId, selectedTextId, showBanner]);

  // Screenshot & PNG Export Actions (temporarily hides UI chrome cleanly during capture)
  const triggerCapture = useCallback(
    async (crop?: CropRect | null) => {
      setIsCapturing(true);
      setSelectingArea(false);
      await new Promise((r) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => r(null))));
      const result = await captureAnnotatedScreenshot({
        items: settings.creator.annotationsVisible ? history.items : [],
        boardMode,
        whiteboardGrid: settings.whiteboardGrid,
        backgroundImageDataUrl: currentBackgroundImage,
        crop,
        backdropElement: backdropElementRef.current,
      });
      setIsCapturing(false);
      setScreenshotResult(result);
      if (!result.ok && result.error) {
        showBanner(result.error, 'error');
      }
      return result;
    },
    [
      boardMode,
      currentBackgroundImage,
      history.items,
      settings.creator.annotationsVisible,
      settings.whiteboardGrid,
      showBanner,
    ]
  );

  const quickExportPng = useCallback(async () => {
    setIsCapturing(true);
    await new Promise((r) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => r(null))));
    const result = await captureAnnotatedScreenshot({
      items: settings.creator.annotationsVisible ? history.items : [],
      boardMode,
      whiteboardGrid: settings.whiteboardGrid,
      backgroundImageDataUrl: currentBackgroundImage,
      crop: null,
      backdropElement: backdropElementRef.current,
    });
    setIsCapturing(false);
    if (!result.ok || !result.dataUrl) {
      showBanner(result.error || 'Could not export PNG.', 'error');
      return;
    }
    const filename = `proscreen-${boardMode}-${Date.now()}.png`;
    const dl = await downloadPngDataUrl(
      result.dataUrl,
      filename,
      settings.exportPrefs.askWhereToSave
    );
    if (dl.ok) {
      showBanner(`Saved ${dl.filename ?? filename}`, 'success');
    } else {
      showBanner(dl.error || 'PNG download failed.', 'error');
    }
  }, [
    boardMode,
    currentBackgroundImage,
    history.items,
    settings.creator.annotationsVisible,
    settings.exportPrefs.askWhereToSave,
    settings.whiteboardGrid,
    showBanner,
  ]);

  const quickCopyScreenshot = useCallback(async () => {
    setIsCapturing(true);
    await new Promise((r) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => r(null))));
    const result = await captureAnnotatedScreenshot({
      items: settings.creator.annotationsVisible ? history.items : [],
      boardMode,
      whiteboardGrid: settings.whiteboardGrid,
      backgroundImageDataUrl: currentBackgroundImage,
      crop: null,
      backdropElement: backdropElementRef.current,
    });
    setIsCapturing(false);
    if (!result.ok || !result.dataUrl) {
      showBanner(result.error || 'Could not capture screenshot.', 'error');
      return;
    }
    const copyRes = await copyPngToClipboard(result.dataUrl);
    if (copyRes.ok) {
      showBanner('Copied annotated screenshot to clipboard', 'success');
    } else {
      setScreenshotResult(result);
      showBanner(copyRes.error || 'Opened preview modal — click Copy or Download PNG.', 'info');
    }
  }, [
    boardMode,
    currentBackgroundImage,
    history.items,
    settings.creator.annotationsVisible,
    settings.whiteboardGrid,
    showBanner,
  ]);

  // Session Management
  const saveCurrentSession = useCallback(
    async (customName?: string) => {
      const name =
        customName?.trim() ||
        `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const session: SavedSession = {
        id: `sess_${Date.now()}`,
        name,
        tabKey,
        url: typeof window !== 'undefined' ? window.location.href : '',
        savedAt: Date.now(),
        boardMode,
        items: history.items,
        backgroundImageDataUrl: currentBackgroundImage,
      };
      const next = await saveSessionSnapshot(session);
      setSavedSessions(next);
      showBanner(`Saved "${name}" (${history.items.length} annotations)`, 'success');
    },
    [boardMode, currentBackgroundImage, history.items, showBanner, tabKey]
  );

  const restoreSession = useCallback(
    (session: SavedSession) => {
      if (session.boardMode !== 'webpage') {
        if (boardMode === 'webpage') {
          webpageHistoryRef.current = historyRef.current;
        }
        setBoardPages((prev) =>
          prev.map((pg, idx) =>
            idx === activePageIndex
              ? {
                  ...pg,
                  boardMode: session.boardMode as Exclude<BoardMode, 'webpage'>,
                  backgroundImageDataUrl: session.backgroundImageDataUrl,
                  history: createHistoryState(session.items),
                }
              : pg
          )
        );
      }
      setBoardMode(session.boardMode);
      setHistory(createHistoryState(session.items));
      setSelectedItemId(null);
      showBanner(`Restored "${session.name}"`, 'success');
    },
    [activePageIndex, boardMode, showBanner]
  );

  const removeSavedSession = useCallback(async (id: string) => {
    const next = await deleteSavedSession(id);
    setSavedSessions(next);
  }, []);

  const exportAnnotationsJson = useCallback(() => {
    const bundle = {
      schema: 'proscreen-annotations-v1' as const,
      exportedAt: Date.now(),
      tabKey,
      boardMode,
      items: history.items,
      backgroundImageDataUrl: currentBackgroundImage,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proscreen-annotations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('Exported annotations JSON', 'success');
  }, [boardMode, currentBackgroundImage, history.items, showBanner, tabKey]);

  const importAnnotationsJson = useCallback(
    (jsonText: string) => {
      const res = validateImportedAnnotations(jsonText);
      if (!res.ok || !res.data) {
        showBanner(res.error || 'Failed to import annotations JSON.', 'error');
        return false;
      }
      setBoardMode(res.data.boardMode);
      setHistory(createHistoryState(res.data.items));
      if (res.data.backgroundImageDataUrl && res.data.boardMode !== 'webpage') {
        setBoardPages((prev) =>
          prev.map((pg, idx) =>
            idx === activePageIndex
              ? {
                  ...pg,
                  boardMode: res.data!.boardMode as Exclude<BoardMode, 'webpage'>,
                  backgroundImageDataUrl: res.data!.backgroundImageDataUrl,
                }
              : pg
          )
        );
      }
      showBanner(`Imported ${res.data.items.length} annotations`, 'success');
      return true;
    },
    [activePageIndex, showBanner]
  );

  const exportSettingsJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proscreen-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('Exported settings JSON', 'success');
  }, [settings, showBanner]);

  const importSettingsJson = useCallback(
    (jsonText: string) => {
      const res = validateImportedSettingsJson(jsonText);
      if (!res.ok || !res.data) {
        showBanner(res.error || 'Failed to import settings.', 'error');
        return false;
      }
      setSettings(res.data);
      void saveSettings(res.data);
      showBanner('Settings imported and applied', 'success');
      return true;
    },
    [showBanner]
  );

  const resetAllSettings = useCallback(async () => {
    const defaults = await resetSettingsToDefaults();
    setSettings(defaults);
    showBanner('Settings reset to defaults', 'info');
  }, [showBanner]);

  const clearCurrentTabStorage = useCallback(async () => {
    await clearTabAnnotationState(tabKey);
    setHistory(createHistoryState([]));
    showBanner('Cleared saved annotations for current tab', 'info');
  }, [showBanner, tabKey]);

  // Execute named action (shared by keyboard shortcuts and Chrome Commands API)
  const runShortcutAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'cursor':
        case 'pointer':
          setActiveTool('pointer');
          break;
        case 'pen':
          setActiveTool('pen');
          break;
        case 'highlighter':
          setActiveTool('highlighter');
          break;
        case 'eraser':
          setActiveTool('eraser');
          break;
        case 'arrow':
          setActiveTool('arrow');
          break;
        case 'rect':
          setActiveTool('rect');
          break;
        case 'text':
          setActiveTool('text');
          break;
        case 'laser':
          setActiveTool('laser');
          break;
        case 'undo':
          undo('all');
          break;
        case 'redo':
          redo('all');
          break;
        case 'clear':
          clearScreen();
          break;
        case 'screenshot':
          void triggerCapture(null);
          break;
        case 'toggle-toolbar':
          toggleEye();
          break;
        case 'toggle-ghost':
          toggleGhostMode();
          break;
        case 'whiteboard':
          switchBoardMode(boardMode === 'whiteboard' ? 'webpage' : 'whiteboard');
          break;
        case 'blackboard':
          switchBoardMode(boardMode === 'blackboard' ? 'webpage' : 'blackboard');
          break;
      }
    },
    [boardMode, clearScreen, redo, switchBoardMode, toggleEye, toggleGhostMode, triggerCapture, undo]
  );

  // Global keyboard shortcut listener (always active even in Ghost Mode; ignores input fields)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      if (e.key === 'Escape') {
        if (clearConfirmOpen) {
          setClearConfirmOpen(false);
          return;
        }
        if (selectingArea) {
          setSelectingArea(false);
          return;
        }
        if (editingTextId) {
          setEditingTextId(null);
          return;
        }
        if (selectedItemId) {
          setSelectedItemId(null);
          return;
        }
        if (presentationMode) {
          setPresentationMode(false);
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault();
        deleteSelectedObject();
        return;
      }

      for (const binding of settings.shortcuts) {
        if (matchesShortcutEvent(e, binding.keys)) {
          e.preventDefault();
          e.stopPropagation();
          runShortcutAction(binding.action);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'Z') {
        e.preventDefault();
        redo('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    clearConfirmOpen,
    deleteSelectedObject,
    editingTextId,
    presentationMode,
    redo,
    runShortcutAction,
    selectedItemId,
    selectingArea,
    settings.shortcuts,
  ]);

  // Listen to Chrome Extension Commands forwarded by background service worker
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const listener = (msg: { type?: string; command?: string }) => {
      if (msg?.type === 'PROSCREEN_COMMAND') {
        if (msg.command === 'toggle-toolbar') runShortcutAction('toggle-toolbar');
        if (msg.command === 'toggle-ghost-mode') runShortcutAction('toggle-ghost');
        if (msg.command === 'capture-screenshot') runShortcutAction('screenshot');
        if (msg.command === 'clear-annotations') runShortcutAction('clear');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [runShortcutAction]);

  const activeBrush = getActiveBrushConfig();
  const textItems = history.items.filter((i): i is TextAnnotation => i.category === 'text');
  const activeTimerCountdownMs = getActiveTimerCountdownMs(
    history.items,
    settings.timer,
    timerNowMs
  );

  return {
    tabKey,
    setTabKey,
    settings,
    resolvedTheme,
    updateSettings,
    history,
    canUndoAll: canUndo(history, 'all'),
    canRedoAll: canRedo(history, 'all'),
    canUndoStroke: canUndo(history, 'stroke'),
    canRedoStroke: canRedo(history, 'stroke'),
    canUndoShape: canUndo(history, 'shape'),
    canRedoShape: canRedo(history, 'shape'),
    activeTool,
    setActiveTool,
    interactionMode,
    boardMode,
    switchBoardMode,
    boardPages,
    activePageIndex,
    currentBackgroundImage,
    selectBoardPage,
    addBoardPage,
    setBoardBackgroundImage,
    toolbarVisible,
    setToolbarVisible,
    restoreButtonVisible,
    setRestoreButtonVisible,
    annotationsVisible,
    setAnnotationsVisible,
    openEye,
    closeEye,
    toggleEye,
    ghostMode,
    toggleGhostMode,
    presentationMode,
    togglePresentationMode,
    isFullscreen,
    toggleFullscreen,
    settingsOpen,
    setSettingsOpen,
    clearConfirmOpen,
    confirmClearScreen,
    cancelClearScreen,
    activeTimerCountdownMs,
    toggleTimerEnabled,
    setTimerDurationMs,
    toggleTimerPaused,
    resetTimer,
    cancelTimer,
    isRecording,
    recordingStatus,
    recordingElapsedMs,
    latestRecording,
    recordingPreviewOpen,
    setRecordingPreviewOpen,
    recordingSupported,
    supportedRecordingFormats,
    attachExternalRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    toggleScreenRecording,
    downloadLatestRecording,
    clearTemporaryRecording,
    editingTextId,
    setEditingTextId,
    selectedTextId,
    setSelectedTextId,
    selectedItemId,
    setSelectedItemId,
    deleteSelectedObject,
    textItems,
    savedSessions,
    selectingArea,
    setSelectingArea,
    screenshotResult,
    setScreenshotResult,
    isCapturing,
    banner,
    activeBrush,
    setActiveColor,
    setActiveThickness,
    setActiveOpacity,
    toggleFavorite,
    undo,
    redo,
    clearScreen,
    toggleCreatorMode,
    beginStrokeOrShape,
    moveStrokeOrShape,
    endStrokeOrShape,
    createTextAt,
    updateTextItem,
    deleteItemById,
    triggerCapture,
    quickExportPng,
    quickCopyScreenshot,
    saveCurrentSession,
    restoreSession,
    removeSavedSession,
    exportAnnotationsJson,
    importAnnotationsJson,
    runShortcutAction,
    exportSettingsJson,
    importSettingsJson,
    resetAllSettings,
    clearCurrentTabStorage,
    draftItemRef,
    laserTrailRef,
    pointerPosRef,
    backdropElementRef,
  };
}
