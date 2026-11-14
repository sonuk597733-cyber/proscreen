import {
  RecordingMode,
  RecordingQuality,
  RecordingResolution,
  RecordingSettings,
} from '../types/settings';
import { isExtensionContext } from '../utils/env';
import { recDebugLog } from './debugLog';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopping';

export interface RecordingFormatOption {
  label: string;
  mimeType: string;
}

export interface RecordingArtifact {
  id: string;
  blobUrl: string;
  downloadUrl?: string;
  filename: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  createdAt: number;
  mode?: RecordingMode;
  videoWidth?: number;
  videoHeight?: number;
  hasAudio?: boolean;
  fromOffscreen?: boolean;
}

export type CaptureErrorPhase =
  | 'picker'
  | 'desktopGetUserMedia'
  | 'getDisplayMedia'
  | 'recorder';

const MAX_DATA_URL_DOWNLOAD_BYTES = 35 * 1024 * 1024;

const CANDIDATE_FORMATS: RecordingFormatOption[] = [
  { label: 'WebM (VP9 + Opus)', mimeType: 'video/webm;codecs=vp9,opus' },
  { label: 'WebM (VP9)', mimeType: 'video/webm;codecs=vp9' },
  { label: 'WebM (VP8 + Opus)', mimeType: 'video/webm;codecs=vp8,opus' },
  { label: 'WebM (Standard)', mimeType: 'video/webm' },
  { label: 'MP4 (H.264)', mimeType: 'video/mp4' },
];

export function getSupportedRecordingFormats(): RecordingFormatOption[] {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return [];
  }
  return CANDIDATE_FORMATS.filter((f) => {
    try {
      return MediaRecorder.isTypeSupported(f.mimeType);
    } catch {
      return false;
    }
  });
}

export function resolveRecordingMimeType(preferred: string): string {
  const supported = getSupportedRecordingFormats();
  if (preferred && preferred !== 'auto' && supported.some((f) => f.mimeType === preferred)) {
    return preferred;
  }
  return supported[0]?.mimeType ?? 'video/webm';
}

export function getExtensionForMimeType(mimeType: string): 'mp4' | 'webm' {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

export function getBitrateForQuality(quality: RecordingQuality): number {
  if (quality === 'ultra') return 8_000_000;
  if (quality === 'standard') return 2_500_000;
  return 5_000_000;
}

export function getResolutionBounds(
  resolution: RecordingResolution
): { width?: { ideal: number }; height?: { ideal: number } } {
  if (resolution === '1080p') return { width: { ideal: 1920 }, height: { ideal: 1080 } };
  if (resolution === '720p') return { width: { ideal: 1280 }, height: { ideal: 720 } };
  return {};
}

export function buildDisplayMediaOptions(
  settings: RecordingSettings
): DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
} {
  const resBounds = getResolutionBounds(settings.resolution);
  const video: MediaTrackConstraints & { displaySurface?: 'browser' | 'window' | 'monitor' } = {
    frameRate: { ideal: settings.frameRate },
    ...resBounds,
  };

  if (settings.mode === 'tab') {
    video.displaySurface = 'browser';
  } else if (settings.mode === 'window') {
    video.displaySurface = 'window';
  } else {
    video.displaySurface = 'monitor';
  }

  const options: DisplayMediaStreamOptions & {
    preferCurrentTab?: boolean;
    selfBrowserSurface?: 'include' | 'exclude';
  } = {
    video,
    audio: settings.tabAudio,
  };

  if (settings.mode === 'tab') {
    options.preferCurrentTab = true;
    options.selfBrowserSurface = 'include';
  }

  return options;
}

export function formatRecordingDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isRecordingApiSupported(): boolean {
  if (isExtensionContext()) {
    return (
      typeof chrome !== 'undefined' &&
      Boolean(chrome.runtime?.sendMessage) &&
      typeof MediaRecorder !== 'undefined'
    );
  }
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function classifyCaptureError(
  err: unknown,
  phase: CaptureErrorPhase,
  errorCode?: string
): string {
  const rawMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const msgLower = rawMessage.toLowerCase();
  const errName = err instanceof Error ? err.name : '';

  if (phase === 'picker') {
    if (errorCode === 'picker_cancelled') {
      return 'Screen picker was cancelled — select a screen, window, or tab and click Share.';
    }
    if (errorCode === 'unsupported_mode') {
      return 'Chrome desktop capture API is unavailable in this browser context.';
    }
    if (errorCode === 'no_target_tab') {
      return 'No active Chrome tab was found to attach screen recording.';
    }
    return rawMessage || 'Chrome screen capture picker failed to open.';
  }

  if (phase === 'recorder') {
    if (errName === 'NotSupportedError') {
      return 'Selected video format or codec is not supported by MediaRecorder.';
    }
    if (errName === 'InvalidStateError') {
      return 'MediaRecorder entered an invalid state during initialization.';
    }
    return rawMessage ? `MediaRecorder initialization failed: ${rawMessage}` : 'MediaRecorder initialization failed.';
  }

  if (errName === 'AbortError') {
    return phase === 'getDisplayMedia'
      ? 'Screen sharing picker was cancelled before selecting a source.'
      : 'Screen capture stream initialization was aborted.';
  }

  if (errName === 'NotAllowedError') {
    if (msgLower.includes('permissions policy') || msgLower.includes('disallowed')) {
      return 'Screen capture is blocked by this page’s Permissions-Policy header.';
    }
    if (msgLower.includes('user gesture') || msgLower.includes('activation')) {
      return 'Screen capture requires a direct user click — click Start Recording again.';
    }
    if (msgLower.includes('denied by system') || msgLower.includes('system')) {
      return 'Operating system screen recording permission is denied. Enable Chrome in OS Screen Recording settings.';
    }
    if (phase === 'getDisplayMedia') {
      return msgLower.includes('cancel') || msgLower.includes('dismiss')
        ? 'Screen sharing picker was cancelled before choosing a source.'
        : 'Screen recording permission was cancelled or denied.';
    }
    return 'Stream permission was denied while initializing desktop capture.';
  }

  if (errName === 'InvalidStateError') {
    return 'Capture stream token expired or context mismatched. Please click Start Recording again.';
  }

  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return 'No compatible screen, window, or tab source was available.';
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return 'Browser or OS could not read video frames from the selected capture source.';
  }

  if (errName === 'OverconstrainedError') {
    return 'Requested recording resolution or frame rate is unsupported by the selected source.';
  }

  if (errName === 'TypeError') {
    return 'This browser context does not support the requested screen capture options.';
  }

  return rawMessage
    ? `Failed to initialize screen capture stream: ${rawMessage}`
    : 'Failed to initialize screen capture stream.';
}

export function validatePreRecordingStream(
  stream: MediaStream | null | undefined
): { ok: true; primaryVideoTrack: MediaStreamTrack } | { ok: false; error: string } {
  if (!stream) {
    return { ok: false, error: 'Screen capture stream was not initialized.' };
  }
  const videoTracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
  if (videoTracks.length === 0) {
    return { ok: false, error: 'Selected capture source did not return a video track.' };
  }
  const primaryVideoTrack = videoTracks[0];
  if (primaryVideoTrack.readyState && primaryVideoTrack.readyState !== 'live') {
    return {
      ok: false,
      error: `Captured video track is not live (state: ${primaryVideoTrack.readyState}).`,
    };
  }
  if (typeof MediaRecorder === 'undefined') {
    return { ok: false, error: 'MediaRecorder API is unavailable in this browser.' };
  }
  return { ok: true, primaryVideoTrack };
}

export function createSafeMediaRecorder(
  stream: MediaStream,
  preferredMime: string,
  bitrate: number
): { recorder: MediaRecorder; mimeType: string } {
  const mimeType = resolveRecordingMimeType(preferredMime);
  try {
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });
    return { recorder, mimeType: recorder.mimeType || mimeType };
  } catch {
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      return { recorder, mimeType: recorder.mimeType || mimeType };
    } catch {
      const recorder = new MediaRecorder(stream);
      return { recorder, mimeType: recorder.mimeType || 'video/webm' };
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  if (typeof FileReader === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    } catch {
      resolve(null);
    }
  });
}

export interface RecorderLifecycleCallbacks {
  onStatusChange: (status: RecordingStatus) => void;
  onComplete: (artifact: RecordingArtifact) => void;
  onCancelled: () => void;
  onError: (message: string) => void;
  onWarning: (message: string) => void;
}

export class ProScreenRecorder {
  private recorder: MediaRecorder | null = null;
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private chunks: Blob[] = [];
  private activeMimeType = 'video/webm';
  private activeMode: RecordingMode = 'tab';
  private startedAt = 0;
  private accumulatedMs = 0;
  private status: RecordingStatus = 'idle';
  private cancelled = false;
  private runtimeErrorMessage: string | null = null;
  private usingOffscreen = false;
  private capturedDimensions: { width?: number; height?: number } = {};
  private capturedHasAudio = false;
  private callbacks: RecorderLifecycleCallbacks;

  constructor(callbacks: RecorderLifecycleCallbacks) {
    this.callbacks = callbacks;
  }

  getStatus(): RecordingStatus {
    return this.status;
  }

  isUsingOffscreen(): boolean {
    return this.usingOffscreen;
  }

  getElapsedMs(now = Date.now()): number {
    if (this.status === 'idle') return 0;
    if (this.status === 'paused' || this.status === 'stopping') return this.accumulatedMs;
    return this.accumulatedMs + Math.max(0, now - this.startedAt);
  }

  hasActiveTracks(): boolean {
    const dTracks = this.displayStream?.getTracks() ?? [];
    const mTracks = this.micStream?.getTracks() ?? [];
    return [...dTracks, ...mTracks].some((t) => t.readyState === 'live');
  }

  private setStatus(next: RecordingStatus) {
    this.status = next;
    this.callbacks.onStatusChange(next);
  }

  private cleanupMediaResources() {
    try {
      this.displayStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore track stop error
    }
    try {
      this.micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore track stop error
    }
    try {
      this.mixedStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore track stop error
    }
    try {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Ignore AudioContext close error
    }
    this.displayStream = null;
    this.micStream = null;
    this.mixedStream = null;
    this.audioCtx = null;
    this.recorder = null;
  }

  /**
   * Synchronizes local state when a popup-initiated offscreen recording begins externally.
   */
  attachExternalOffscreenSession(mode: RecordingMode, mimeType: string) {
    this.cleanupMediaResources();
    this.usingOffscreen = true;
    this.activeMode = mode;
    this.activeMimeType = mimeType || 'video/webm';
    this.accumulatedMs = 0;
    this.startedAt = Date.now();
    this.cancelled = false;
    this.runtimeErrorMessage = null;
    this.setStatus('recording');
  }

  /**
   * Completes or resets state when background/offscreen broadcasts final completion.
   */
  handleExternalOffscreenFinished() {
    if (this.usingOffscreen) {
      this.usingOffscreen = false;
      this.accumulatedMs = 0;
      this.setStatus('idle');
    }
  }

  private async acquireExtensionDesktopStream(
    settings: RecordingSettings
  ): Promise<{ stream: MediaStream } | null> {
    recDebugLog('Capture API requested via background: chrome.desktopCapture.chooseDesktopMedia', {
      mode: settings.mode,
      tabAudio: settings.tabAudio,
    });

    const desktopRes = await new Promise<{
      ok: boolean;
      streamId?: string;
      canRequestAudioTrack?: boolean;
      errorCode?: string;
      error?: string;
    }>((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'CHOOSE_DESKTOP_MEDIA',
          mode: settings.mode,
          tabAudio: settings.tabAudio,
        },
        (res) => {
          if (chrome.runtime.lastError) {
            resolve({
              ok: false,
              errorCode: 'picker_error',
              error: chrome.runtime.lastError.message,
            });
            return;
          }
          resolve(res ?? { ok: false, errorCode: 'picker_error', error: 'No response from extension service worker.' });
        }
      );
    });

    recDebugLog('Extension desktop picker result', {
      mode: settings.mode,
      ok: desktopRes.ok,
      errorCode: desktopRes.errorCode,
      canRequestAudioTrack: desktopRes.canRequestAudioTrack,
    });

    if (!desktopRes.ok || !desktopRes.streamId) {
      // Only fall back to getDisplayMedia if Chrome's desktopCapture API itself is unavailable.
      if (
        desktopRes.errorCode === 'unsupported_mode' &&
        typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getDisplayMedia)
      ) {
        recDebugLog('desktopCapture unavailable, falling back to getDisplayMedia', {
          mode: settings.mode,
        });
        const fallbackStream = await navigator.mediaDevices.getDisplayMedia(
          buildDisplayMediaOptions(settings)
        );
        return { stream: fallbackStream };
      }

      const message = classifyCaptureError(desktopRes.error, 'picker', desktopRes.errorCode);
      this.callbacks.onError(message);
      return null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError(
        'Browser media capture requires HTTPS (or localhost). Switch to an HTTPS page or use ProScreen popup 1-click Tab Recording.'
      );
      return null;
    }

    const wantDesktopAudio = Boolean(settings.tabAudio && desktopRes.canRequestAudioTrack);
    if (settings.tabAudio && !desktopRes.canRequestAudioTrack) {
      this.callbacks.onWarning(
        'Selected source did not enable system/tab audio sharing — recording video cleanly.'
      );
    }

    const desktopVideoMandatory = {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: desktopRes.streamId,
    };

    const constraints: MediaStreamConstraints = {
      audio: wantDesktopAudio
        ? ({
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: desktopRes.streamId,
            },
          } as unknown as MediaTrackConstraints)
        : false,
      video: {
        mandatory: desktopVideoMandatory,
      } as unknown as MediaTrackConstraints,
    };

    try {
      recDebugLog('Initializing stream via getUserMedia(desktop)', {
        mode: settings.mode,
        withAudio: wantDesktopAudio,
      });
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream };
    } catch (streamErr) {
      // If audio constraint caused failure on a track without audio support, retry video-only once
      if (wantDesktopAudio && !(streamErr instanceof Error && streamErr.name === 'NotAllowedError')) {
        try {
          recDebugLog('Retrying desktop getUserMedia video-only after audio failure', {
            mode: settings.mode,
            errorName: streamErr instanceof Error ? streamErr.name : 'unknown',
          });
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { mandatory: desktopVideoMandatory } as unknown as MediaTrackConstraints,
          });
          this.callbacks.onWarning(
            'Desktop audio could not be attached for this source — recording video cleanly.'
          );
          return { stream: videoOnlyStream };
        } catch (retryErr) {
          this.callbacks.onError(classifyCaptureError(retryErr, 'desktopGetUserMedia'));
          return null;
        }
      }

      recDebugLog('Desktop getUserMedia permission/stream error', {
        mode: settings.mode,
        errorName: streamErr instanceof Error ? streamErr.name : 'unknown',
      });
      this.callbacks.onError(classifyCaptureError(streamErr, 'desktopGetUserMedia'));
      return null;
    }
  }

  async start(settings: RecordingSettings, askWhereToSave: boolean): Promise<boolean> {
    if (this.status !== 'idle') return false;
    this.cancelled = false;
    this.runtimeErrorMessage = null;
    this.usingOffscreen = false;
    this.chunks = [];
    this.accumulatedMs = 0;
    this.activeMode = settings.mode;
    this.capturedDimensions = {};
    this.capturedHasAudio = false;

    const inExtension = isExtensionContext() && Boolean(chrome.runtime?.sendMessage);

    // 1. In Chrome Extension context with mode === 'tab', try chrome.tabCapture + MV3 Offscreen first.
    if (settings.mode === 'tab' && inExtension) {
      recDebugLog('Capture API called: chrome.tabCapture.getMediaStreamId (via background)', {
        mode: 'tab',
      });
      const offscreenAttempt = await new Promise<{
        ok: boolean;
        fallbackRequired?: boolean;
        mimeType?: string;
        warning?: string;
        error?: string;
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'START_TAB_RECORDING',
            payload: {
              mode: settings.mode,
              quality: settings.quality,
              resolution: settings.resolution,
              frameRate: settings.frameRate,
              mimeType: settings.mimeType,
              micAudio: settings.micAudio,
              tabAudio: settings.tabAudio,
              askWhereToSave,
            },
          },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, fallbackRequired: true, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(res ?? { ok: false, fallbackRequired: true });
          }
        );
      });

      if (offscreenAttempt.ok) {
        this.usingOffscreen = true;
        this.activeMimeType = offscreenAttempt.mimeType || 'video/webm';
        this.startedAt = Date.now();
        this.setStatus('recording');
        recDebugLog('Offscreen tabCapture recording started', {
          mimeType: this.activeMimeType,
        });
        if (offscreenAttempt.warning) {
          this.callbacks.onWarning(offscreenAttempt.warning);
        }
        return true;
      }

      if (!offscreenAttempt.fallbackRequired) {
        this.callbacks.onError(
          offscreenAttempt.error || 'Could not start Chrome extension tab recording.'
        );
        return false;
      }

      recDebugLog('tabCapture requires activeTab gesture; falling back to chrome.desktopCapture', {
        reason: offscreenAttempt.error,
      });
    }

    // 2. Acquire display/screen/window/tab stream using the appropriate browser/extension API
    let displayStream: MediaStream;
    try {
      if (inExtension) {
        const extResult = await this.acquireExtensionDesktopStream(settings);
        if (!extResult) {
          return false;
        }
        displayStream = extResult.stream;
      } else {
        if (!isRecordingApiSupported()) {
          this.callbacks.onError(
            'This browser context does not support screen recording (getDisplayMedia / MediaRecorder).'
          );
          return false;
        }
        recDebugLog('Capture API called: navigator.mediaDevices.getDisplayMedia', {
          mode: settings.mode,
          tabAudio: settings.tabAudio,
        });
        const displayConstraints = buildDisplayMediaOptions(settings);
        displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
        recDebugLog('Permission result: getDisplayMedia granted', { mode: settings.mode });
      }

      this.displayStream = displayStream;

      // 3. Validate acquired stream & live video track BEFORE initializing MediaRecorder
      const preCheck = validatePreRecordingStream(displayStream);
      if (!preCheck.ok) {
        recDebugLog('Pre-recording stream validation failed', { error: preCheck.error });
        this.cleanupMediaResources();
        this.callbacks.onError(preCheck.error);
        return false;
      }

      const primaryVideoTrack = preCheck.primaryVideoTrack;
      const videoTracks = displayStream.getVideoTracks();
      recDebugLog('Stream & track states validated', {
        videoTracks: videoTracks.length,
        primaryTrackState: primaryVideoTrack.readyState,
        displayAudioTracks: displayStream.getAudioTracks().length,
      });

      // Best-effort resolution & FPS preference without causing OverconstrainedError
      if (typeof primaryVideoTrack.applyConstraints === 'function') {
        const resBounds = getResolutionBounds(settings.resolution);
        void primaryVideoTrack
          .applyConstraints({
            frameRate: { ideal: settings.frameRate },
            ...resBounds,
          })
          .catch(() => {});
      }

      const trackSettings =
        typeof primaryVideoTrack.getSettings === 'function' ? primaryVideoTrack.getSettings() : {};
      this.capturedDimensions = {
        width: typeof trackSettings.width === 'number' ? trackSettings.width : undefined,
        height: typeof trackSettings.height === 'number' ? trackSettings.height : undefined,
      };

      // 4. Optional Microphone capture & distinct audio failure reporting
      let micStream: MediaStream | null = null;
      if (settings.micAudio && navigator.mediaDevices?.getUserMedia) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.micStream = micStream;
        } catch (micErr) {
          const micErrName = micErr instanceof Error ? micErr.name : '';
          recDebugLog('Microphone capture skipped', { errorName: micErrName });
          this.callbacks.onWarning(
            micErrName === 'NotFoundError'
              ? 'No microphone hardware found — recording continues without mic audio.'
              : micErrName === 'NotAllowedError'
              ? 'Microphone permission denied — recording continues without mic audio.'
              : 'Microphone audio unavailable — recording continues with video only.'
          );
        }
      } else if (settings.micAudio) {
        this.callbacks.onWarning(
          'Microphone capture API is unavailable in this context — recording without mic.'
        );
      }

      const tracks: MediaStreamTrack[] = [...videoTracks];
      const displayAudio = displayStream.getAudioTracks();
      const micAudio = micStream?.getAudioTracks() ?? [];

      if (settings.tabAudio && displayAudio.length === 0 && !inExtension) {
        this.callbacks.onWarning(
          'Selected source did not include system/tab audio — recording video cleanly.'
        );
      }

      if (displayAudio.length > 0 && micAudio.length > 0 && typeof AudioContext !== 'undefined') {
        const audioCtx = new AudioContext();
        this.audioCtx = audioCtx;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }
        const dest = audioCtx.createMediaStreamDestination();
        audioCtx.createMediaStreamSource(new MediaStream(displayAudio)).connect(dest);
        audioCtx.createMediaStreamSource(new MediaStream(micAudio)).connect(dest);
        tracks.push(...dest.stream.getAudioTracks());
        this.capturedHasAudio = dest.stream.getAudioTracks().length > 0;
      } else if (displayAudio.length > 0) {
        tracks.push(...displayAudio);
        this.capturedHasAudio = true;
      } else if (micAudio.length > 0) {
        tracks.push(...micAudio);
        this.capturedHasAudio = true;
      }

      const combinedStream = new MediaStream(tracks);
      this.mixedStream = combinedStream;

      // 5. MediaRecorder creation & pre-start state verification
      let recorder: MediaRecorder;
      let mimeType: string;
      try {
        const created = createSafeMediaRecorder(
          combinedStream,
          settings.mimeType,
          getBitrateForQuality(settings.quality)
        );
        recorder = created.recorder;
        mimeType = created.mimeType;
      } catch (recInitErr) {
        this.cleanupMediaResources();
        this.setStatus('idle');
        this.callbacks.onError(classifyCaptureError(recInitErr, 'recorder'));
        return false;
      }

      if (recorder.state !== 'inactive') {
        this.cleanupMediaResources();
        this.setStatus('idle');
        this.callbacks.onError(`MediaRecorder started in invalid state: ${recorder.state}`);
        return false;
      }

      this.activeMimeType = mimeType;
      this.recorder = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          this.chunks.push(ev.data);
        }
      };

      recorder.onerror = (ev) => {
        const err = (ev as unknown as { error?: Error }).error;
        this.runtimeErrorMessage = err?.message || 'MediaRecorder encountered an encoding error.';
        recDebugLog('MediaRecorder runtime error', { message: this.runtimeErrorMessage });
        this.cleanupMediaResources();
        this.chunks = [];
        this.setStatus('idle');
        this.callbacks.onError(this.runtimeErrorMessage);
      };

      recorder.onstop = async () => {
        const finalDurationMs = this.getElapsedMs();
        const wasCancelled = this.cancelled;
        const runtimeErr = this.runtimeErrorMessage;
        const chunks = this.chunks;
        const dims = { ...this.capturedDimensions };
        const hasAudio = this.capturedHasAudio;
        this.chunks = [];
        this.cleanupMediaResources();
        this.setStatus('idle');

        if (runtimeErr) {
          return;
        }

        if (wasCancelled) {
          recDebugLog('Recording stopped: cancelled by user');
          this.callbacks.onCancelled();
          return;
        }

        const totalChunkBytes = chunks.reduce((sum, c) => sum + (c?.size || 0), 0);
        if (chunks.length === 0 || totalChunkBytes === 0) {
          recDebugLog('Recording stopped with zero bytes', { chunkCount: chunks.length });
          this.callbacks.onError('Recording finished with zero video frames captured.');
          return;
        }

        const blob = new Blob(chunks, { type: this.activeMimeType });
        recDebugLog('Recording stopped: Blob verified', {
          sizeBytes: blob.size,
          mimeType: blob.type || this.activeMimeType,
          durationMs: finalDurationMs,
        });

        if (!blob || blob.size === 0) {
          this.callbacks.onError('Recorded video file was empty (0 bytes).');
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const ext = getExtensionForMimeType(this.activeMimeType);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const downloadUrl =
          inExtension && blob.size <= MAX_DATA_URL_DOWNLOAD_BYTES
            ? (await blobToDataUrl(blob)) ?? undefined
            : undefined;

        const artifact: RecordingArtifact = {
          id: `rec_${Date.now()}`,
          blobUrl,
          downloadUrl,
          filename: `proscreen-${this.activeMode}-${stamp}.${ext}`,
          mimeType: blob.type || this.activeMimeType,
          durationMs: finalDurationMs,
          sizeBytes: blob.size,
          createdAt: Date.now(),
          mode: this.activeMode,
          videoWidth: dims.width,
          videoHeight: dims.height,
          hasAudio,
          fromOffscreen: false,
        };
        this.callbacks.onComplete(artifact);
      };

      primaryVideoTrack.addEventListener('ended', () => {
        if (this.status === 'recording' || this.status === 'paused') {
          recDebugLog('Capture track ended externally (Stop sharing clicked)');
          this.stop();
        }
      });

      recorder.start(250);
      recDebugLog('MediaRecorder started', {
        state: recorder.state,
        mimeType: this.activeMimeType,
      });
      if (this.runtimeErrorMessage) {
        this.cleanupMediaResources();
        this.setStatus('idle');
        return false;
      }
      this.startedAt = Date.now();
      this.setStatus('recording');
      return true;
    } catch (err) {
      this.cleanupMediaResources();
      this.setStatus('idle');
      recDebugLog('Capture initialization error', {
        errorName: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message : 'unknown',
      });
      this.callbacks.onError(classifyCaptureError(err, 'getDisplayMedia'));
      return false;
    }
  }

  pause(): boolean {
    if (this.status !== 'recording') return false;
    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'PAUSE_TAB_RECORDING' }, (res) => {
        if (chrome.runtime.lastError || (res && res.ok === false)) {
          this.callbacks.onWarning('Could not pause offscreen recording cleanly.');
        }
      });
      this.accumulatedMs += Math.max(0, Date.now() - this.startedAt);
      this.setStatus('paused');
      return true;
    }
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.pause();
      this.accumulatedMs += Math.max(0, Date.now() - this.startedAt);
      this.setStatus('paused');
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.status !== 'paused') return false;
    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RESUME_TAB_RECORDING' }, (res) => {
        if (chrome.runtime.lastError || (res && res.ok === false)) {
          this.callbacks.onWarning('Could not resume offscreen recording cleanly.');
        }
      });
      this.startedAt = Date.now();
      this.setStatus('recording');
      return true;
    }
    if (this.recorder && this.recorder.state === 'paused') {
      this.recorder.resume();
      this.startedAt = Date.now();
      this.setStatus('recording');
      return true;
    }
    return false;
  }

  stop(): boolean {
    if (this.status !== 'recording' && this.status !== 'paused') return false;
    this.cancelled = false;
    if (this.status === 'recording') {
      this.accumulatedMs += Math.max(0, Date.now() - this.startedAt);
    }

    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      this.setStatus('stopping');
      chrome.runtime.sendMessage({ type: 'STOP_TAB_RECORDING', cancel: false }, (res) => {
        if (chrome.runtime.lastError || (res && res.ok === false)) {
          this.usingOffscreen = false;
          this.setStatus('idle');
          this.callbacks.onError(
            chrome.runtime.lastError?.message ||
              res?.error ||
              'Failed to stop offscreen tab recording.'
          );
        }
      });
      return true;
    }

    if (this.recorder && this.recorder.state !== 'inactive') {
      this.setStatus('stopping');
      try {
        if (this.recorder.state === 'recording' && typeof this.recorder.requestData === 'function') {
          this.recorder.requestData();
        }
      } catch {
        // Ignore requestData errors when stopping immediately
      }
      this.recorder.stop();
      return true;
    }

    this.cleanupMediaResources();
    this.setStatus('idle');
    return false;
  }

  cancel(): boolean {
    if (this.status !== 'recording' && this.status !== 'paused') return false;
    this.cancelled = true;
    if (this.status === 'recording') {
      this.accumulatedMs += Math.max(0, Date.now() - this.startedAt);
    }

    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      this.setStatus('stopping');
      chrome.runtime.sendMessage({ type: 'STOP_TAB_RECORDING', cancel: true }, (res) => {
        if (chrome.runtime.lastError || (res && res.ok === false)) {
          this.usingOffscreen = false;
          this.setStatus('idle');
          this.callbacks.onCancelled();
        }
      });
      return true;
    }

    if (this.recorder && this.recorder.state !== 'inactive') {
      this.setStatus('stopping');
      this.recorder.stop();
      return true;
    }

    this.cleanupMediaResources();
    this.setStatus('idle');
    this.callbacks.onCancelled();
    return true;
  }

  destroy() {
    this.cancelled = true;
    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: 'STOP_TAB_RECORDING', cancel: true });
      } catch {
        // Ignore extension teardown errors
      }
      this.usingOffscreen = false;
    }
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.stop();
      }
    } catch {
      // Ignore stop error during teardown
    }
    this.cleanupMediaResources();
    this.setStatus('idle');
  }
}

export async function downloadRecordingArtifact(
  artifact: RecordingArtifact,
  saveAs = false
): Promise<{ ok: boolean; error?: string }> {
  if (!artifact.blobUrl && !artifact.downloadUrl && !artifact.fromOffscreen) {
    return { ok: false, error: 'Recording file URL is no longer available.' };
  }

  if (isExtensionContext() && chrome.runtime?.sendMessage) {
    if (artifact.fromOffscreen) {
      const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'DOWNLOAD_OFFSCREEN_RECORDING',
            filename: artifact.filename,
            saveAs,
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(resp ?? { ok: false, error: 'Download did not complete.' });
          }
        );
      });
      recDebugLog('Download result (offscreen)', { ok: res.ok, error: res.error });
      return res;
    }

    // Content-script recordings: use Data URL via chrome.downloads for verified MV3 download;
    // for >35MB recordings where downloadUrl is omitted, fall back to direct <a download> in origin.
    if (artifact.downloadUrl) {
      const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'DOWNLOAD_FILE',
            url: artifact.downloadUrl,
            filename: artifact.filename,
            saveAs,
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(resp ?? { ok: true });
          }
        );
      });
      recDebugLog('Download result (extension downloads API)', { ok: res.ok, error: res.error });
      if (res.ok) return res;
      // If background download failed unexpectedly, fall through to in-origin anchor download
    }
  }

  if (!artifact.blobUrl) {
    return { ok: false, error: 'Recording file URL is unavailable.' };
  }

  const a = document.createElement('a');
  a.href = artifact.blobUrl;
  a.download = artifact.filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  recDebugLog('Download result (anchor fallback)', { ok: true, filename: artifact.filename });
  return { ok: true };
}
