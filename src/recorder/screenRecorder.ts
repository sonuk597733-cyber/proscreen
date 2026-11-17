import {
  RecordingAreaRect,
  RecordingMode,
  RecordingQuality,
  RecordingResolution,
  RecordingSettings,
} from '../types/settings';
import { isExtensionContext } from '../utils/env';
import { StudioAudioMixer, acquireMicrophoneStream } from './audioEngine';
import { recDebugLog } from './debugLog';
import { toProScreenMediaUrl } from '../desktop/mediaUrl';

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
  sourceWidth?: number;
  sourceHeight?: number;
  codec?: string;
  frameRate?: number;
  quality?: RecordingQuality;
  hasAudio?: boolean;
  fromOffscreen?: boolean;
  savedPath?: string;
}

export type CaptureErrorPhase =
  | 'picker'
  | 'desktopGetUserMedia'
  | 'getDisplayMedia'
  | 'recorder';

const MAX_DATA_URL_DOWNLOAD_BYTES = 35 * 1024 * 1024;

const CANDIDATE_FORMATS: RecordingFormatOption[] = [
  { label: 'WebM (Studio HD)', mimeType: 'video/webm' },
  { label: 'MP4 (H.264 HD)', mimeType: 'video/mp4' },
  { label: 'WebM (VP8 + Opus)', mimeType: 'video/webm;codecs=vp8,opus' },
  { label: 'WebM (VP9)', mimeType: 'video/webm;codecs=vp9' },
  { label: 'MP4 (H.264 + AAC)', mimeType: 'video/mp4;codecs=avc1,mp4a.40.2' },
  { label: 'WebM (VP9 + Opus)', mimeType: 'video/webm;codecs=vp9,opus' },
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

export function resolveRecordingMimeType(preferred: string, hasAudio = true): string {
  const supported = getSupportedRecordingFormats();
  if (preferred && preferred !== 'auto' && supported.some((f) => f.mimeType === preferred)) {
    return preferred;
  }
  if (!hasAudio) {
    const videoOnly = supported.find(
      (f) => !f.mimeType.includes('opus') && !f.mimeType.includes('mp4a')
    );
    if (videoOnly) return videoOnly.mimeType;
  }
  return supported[0]?.mimeType ?? 'video/webm';
}

export function getExtensionForMimeType(mimeType: string): 'mp4' | 'webm' {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

export function calculateRecommendedBitrate(
  resolution: RecordingResolution,
  frameRate: 30 | 60 | 120,
  quality: RecordingQuality
): { videoBitsPerSecond: number; audioBitsPerSecond: number } {
  let baseVideo = 6_000_000;
  if (resolution === '16k') baseVideo = 80_000_000;
  else if (resolution === '8k') baseVideo = 45_000_000;
  else if (resolution === '4k') baseVideo = 20_000_000;
  else if (resolution === '1440p') baseVideo = 10_000_000;
  else if (resolution === '1080p') baseVideo = 6_000_000;
  else if (resolution === '720p') baseVideo = 3_000_000;

  if (frameRate === 120) {
    baseVideo = Math.round(baseVideo * 2.0);
  } else if (frameRate === 60) {
    baseVideo = Math.round(baseVideo * 1.4);
  }

  const qualityMultiplier =
    quality === 'ultra-pro'
      ? 2.0
      : quality === 'ultra'
      ? 1.5
      : quality === 'standard'
      ? 0.65
      : 1.0;
  const videoBitsPerSecond = Math.round(baseVideo * qualityMultiplier);

  const audioBitsPerSecond =
    quality === 'ultra-pro'
      ? 320_000
      : quality === 'ultra'
      ? 256_000
      : quality === 'high'
      ? 192_000
      : 128_000;

  return { videoBitsPerSecond, audioBitsPerSecond };
}

export function getBitrateForQuality(quality: RecordingQuality): number {
  if (quality === 'ultra-pro') return 12_000_000;
  if (quality === 'ultra') return 8_000_000;
  if (quality === 'standard') return 2_500_000;
  return 5_000_000;
}

export interface AutoRecordingProfile {
  resolution: RecordingResolution;
  frameRate: 30 | 60 | 120;
  mimeType: string;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  quality: RecordingQuality;
}

export function selectAutomaticRecordingProfile(
  sourceW?: number,
  sourceH?: number
): AutoRecordingProfile {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const screenW = sourceW ?? (typeof window !== 'undefined' ? (window.screen?.width || 1920) * dpr : 1920);
  const screenH = sourceH ?? (typeof window !== 'undefined' ? (window.screen?.height || 1080) * dpr : 1080);
  const totalPixels = screenW * screenH;

  const supported = getSupportedRecordingFormats();
  const mimeType = supported.length > 0 ? supported[0].mimeType : 'video/webm;codecs=vp8,opus';

  const frameRate: 30 | 60 = 60;
  let resolution: RecordingResolution = '1080p';
  let quality: RecordingQuality = 'high';

  if (totalPixels >= 3840 * 2160 * 0.85) {
    resolution = '4k';
    quality = 'ultra';
  } else if (totalPixels >= 2560 * 1440 * 0.85) {
    resolution = '1440p';
    quality = 'ultra';
  } else if (totalPixels >= 1920 * 1080 * 0.85) {
    resolution = '1080p';
    quality = 'high';
  } else {
    resolution = '720p';
    quality = 'standard';
  }

  const { videoBitsPerSecond, audioBitsPerSecond } = calculateRecommendedBitrate(
    resolution,
    frameRate,
    quality
  );

  return {
    resolution,
    frameRate,
    mimeType,
    videoBitsPerSecond,
    audioBitsPerSecond,
    quality,
  };
}

export function getResolutionBounds(
  resolution: RecordingResolution
): { width?: { ideal: number }; height?: { ideal: number } } {
  if (resolution === '16k') return { width: { ideal: 15360 }, height: { ideal: 8640 } };
  if (resolution === '8k') return { width: { ideal: 7680 }, height: { ideal: 4320 } };
  if (resolution === '4k') return { width: { ideal: 3840 }, height: { ideal: 2160 } };
  if (resolution === '1440p') return { width: { ideal: 2560 }, height: { ideal: 1440 } };
  if (resolution === '1080p') return { width: { ideal: 1920 }, height: { ideal: 1080 } };
  if (resolution === '720p') return { width: { ideal: 1280 }, height: { ideal: 720 } };
  return {};
}

export interface ResolutionCapability {
  resolution: RecordingResolution;
  label: string;
  width: number;
  height: number;
  supported: boolean;
  isNative: boolean;
  reason?: string;
}

export function getResolutionCapabilities(
  sourceW?: number,
  sourceH?: number
): Record<'4k' | '8k' | '16k', ResolutionCapability> {
  const curW = sourceW ?? (typeof window !== 'undefined' ? (window.screen?.width || 1920) : 1920);
  const curH = sourceH ?? (typeof window !== 'undefined' ? (window.screen?.height || 1080) : 1080);

  let maxTextureSize = 8192;
  if (typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (gl) {
        maxTextureSize =
          (gl as WebGLRenderingContext).getParameter(
            (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE
          ) || 8192;
      }
    } catch {}
  }

  const supports8K = maxTextureSize >= 7680;
  const supports16K = maxTextureSize >= 15360;

  return {
    '4k': {
      resolution: '4k',
      label: '4K Ultra HD (3840 × 2160)',
      width: 3840,
      height: 2160,
      supported: true,
      isNative: curW >= 3840 && curH >= 2160,
      reason:
        curW < 3840
          ? `Display is ${curW}×${curH} — captures at full native display resolution without upscaling.`
          : undefined,
    },
    '8k': {
      resolution: '8k',
      label: '8K Master (7680 × 4320)',
      width: 7680,
      height: 4320,
      supported: supports8K,
      isNative: curW >= 7680 && curH >= 4320,
      reason: !supports8K
        ? '8K output exceeds current GPU texture limits. 4K profile recommended.'
        : curW < 7680
        ? `Display is ${curW}×${curH} — captures at maximum native physical detail.`
        : undefined,
    },
    '16k': {
      resolution: '16k',
      label: '16K Extreme (15360 × 8640)',
      width: 15360,
      height: 8640,
      supported: supports16K,
      isNative: curW >= 15360 && curH >= 8640,
      reason: !supports16K
        ? '16K requires specialized GPU hardware with >16GB VRAM and Level 6+ AV1/VP9 encoder. Falling back to highest supported resolution (8K / 4K).'
        : `Experimental profile: high memory bandwidth. Display is ${curW}×${curH}.`,
    },
  };
}

export function buildDisplayMediaOptions(
  settings: RecordingSettings
): DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
} {
  const resBounds = getResolutionBounds(settings.resolution);
  const video: MediaTrackConstraints & {
    displaySurface?: 'browser' | 'window' | 'monitor';
  } = {
    frameRate: { ideal: settings.frameRate, max: settings.frameRate },
    ...resBounds,
  };

  if (settings.resolution === 'source' && typeof window !== 'undefined' && window.screen) {
    const dpr = window.devicePixelRatio || 1;
    const sw = window.screen.width * dpr;
    const sh = window.screen.height * dpr;
    if (sw > 0 && sh > 0) {
      video.width = { ideal: Math.round(sw) };
      video.height = { ideal: Math.round(sh) };
    }
  }

  if (settings.mode === 'tab') {
    video.displaySurface = typeof window !== 'undefined' && (window as any).proscreenDesktop ? 'monitor' : 'browser';
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
  bitrates: number | { videoBitsPerSecond?: number; audioBitsPerSecond?: number }
): { recorder: MediaRecorder; mimeType: string } {
  const hasAudio = stream.getAudioTracks().length > 0;
  const mimeType = resolveRecordingMimeType(preferredMime, hasAudio);
  const vBps = typeof bitrates === 'number' ? bitrates : bitrates.videoBitsPerSecond;
  const aBps = typeof bitrates === 'object' && hasAudio ? bitrates.audioBitsPerSecond : undefined;

  try {
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: vBps,
      audioBitsPerSecond: aBps,
    });
    return { recorder, mimeType: recorder.mimeType || mimeType };
  } catch {
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: vBps,
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

/**
 * Injects or updates EBML Duration element (0x44, 0x89) into WebM files so that
 * HTMLMediaElement (video tags), Chrome, Edge, and media players have finite duration,
 * accurate timeline scrubbing, and instant seeking.
 */
export function injectWebmDuration(buffer: Uint8Array | ArrayBuffer, durationMs: number): Uint8Array {
  if (!buffer || buffer.byteLength < 48 || durationMs <= 0) {
    return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  }
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // EBML Header check: 0x1A, 0x45, 0xDF, 0xA3
  if (u8[0] !== 0x1a || u8[1] !== 0x45 || u8[2] !== 0xdf || u8[3] !== 0xa3) {
    return u8;
  }

  // Find Info element ID: 0x15, 0x49, 0xA9, 0x66 within the first 4KB
  const searchLimit = Math.min(u8.length - 4, 4096);
  let infoPos = -1;
  for (let i = 0; i < searchLimit; i++) {
    if (u8[i] === 0x15 && u8[i + 1] === 0x49 && u8[i + 2] === 0xa9 && u8[i + 3] === 0x66) {
      infoPos = i;
      break;
    }
  }
  if (infoPos === -1) return u8;

  const vintPos = infoPos + 4;
  const firstByte = u8[vintPos];
  let vintLen = 1;
  let mask = 0x80;
  while ((firstByte & mask) === 0 && vintLen <= 8) {
    mask >>= 1;
    vintLen++;
  }
  if (vintLen > 4) return u8;

  let infoSize = firstByte & (mask - 1);
  for (let i = 1; i < vintLen; i++) {
    infoSize = (infoSize << 8) | u8[vintPos + i];
  }

  const infoContentStart = vintPos + vintLen;
  const infoContentEnd = infoContentStart + infoSize;
  if (infoContentEnd > u8.length) return u8;

  // Check if Duration element (0x44, 0x89) already exists in Info content
  let durPos = -1;
  for (let i = infoContentStart; i < infoContentEnd - 2; i++) {
    if (u8[i] === 0x44 && u8[i + 1] === 0x89) {
      durPos = i;
      break;
    }
  }

  // If Duration element already exists, update its float value in-place
  if (durPos !== -1) {
    const durVint = u8[durPos + 2];
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (durVint === 0x84) {
      view.setFloat32(durPos + 3, durationMs, false);
      return u8;
    } else if (durVint === 0x88) {
      view.setFloat64(durPos + 3, durationMs, false);
      return u8;
    }
  }

  // Duration element needs to be inserted: [0x44, 0x89, 0x84, 4-byte-float-BE] -> 7 bytes
  const durElement = new Uint8Array(7);
  durElement[0] = 0x44;
  durElement[1] = 0x89;
  durElement[2] = 0x84;
  const durView = new DataView(durElement.buffer);
  durView.setFloat32(3, durationMs, false);

  const newInfoSize = infoSize + 7;
  let newVintBytes: Uint8Array;
  if (newInfoSize < 127) {
    newVintBytes = new Uint8Array([0x80 | newInfoSize]);
  } else if (newInfoSize < 16383) {
    newVintBytes = new Uint8Array([(0x4000 | newInfoSize) >> 8, (0x4000 | newInfoSize) & 0xff]);
  } else {
    newVintBytes = new Uint8Array([
      (0x200000 | newInfoSize) >> 16,
      ((0x200000 | newInfoSize) >> 8) & 0xff,
      (0x200000 | newInfoSize) & 0xff,
    ]);
  }

  const out = new Uint8Array(u8.length - vintLen + newVintBytes.length + 7);
  out.set(u8.subarray(0, vintPos), 0);
  let cur = vintPos;
  out.set(newVintBytes, cur);
  cur += newVintBytes.length;
  out.set(u8.subarray(infoContentStart, infoContentEnd), cur);
  cur += infoSize;
  out.set(durElement, cur);
  cur += 7;
  out.set(u8.subarray(infoContentEnd), cur);

  return out;
}

export interface RecorderLifecycleCallbacks {
  onStatusChange: (status: RecordingStatus) => void;
  onComplete: (artifact: RecordingArtifact) => void;
  onCancelled: () => void;
  onError: (message: string) => void;
  onWarning: (message: string) => void;
}

/**
 * AreaCropProcessor captures a full-display stream, applies continuous hardware-accelerated
 * cropping to the selected bounding box, and generates a cropped MediaStream containing ONLY
 * the target rectangle with zero surrounding desktop pixels or black bars.
 */
export class AreaCropProcessor {
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private croppedStream: MediaStream | null = null;
  private destroyed = false;

  async init(
    sourceStream: MediaStream,
    areaRect: RecordingAreaRect,
    frameRate = 30
  ): Promise<MediaStreamTrack | null> {
    if (typeof document === 'undefined') {
      return null;
    }

    try {
      const video = document.createElement('video');
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(video);
      }
      video.srcObject = sourceStream;

      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        };
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
        } else {
          video.addEventListener('loadedmetadata', onLoaded);
          setTimeout(() => resolve(), 1200);
        }
      });

      await video.play().catch(() => {});

      const displayW =
        areaRect.displayBounds?.width ||
        (typeof window !== 'undefined'
          ? window.innerWidth || window.screen?.width || 1920
          : 1920);
      const displayH =
        areaRect.displayBounds?.height ||
        (typeof window !== 'undefined'
          ? window.innerHeight || window.screen?.height || 1080
          : 1080);

      const scaleX = video.videoWidth > 0 && displayW > 0 ? video.videoWidth / displayW : 1;
      const scaleY = video.videoHeight > 0 && displayH > 0 ? video.videoHeight / displayH : 1;

      const sx = Math.max(0, Math.round(areaRect.x * scaleX));
      const sy = Math.max(0, Math.round(areaRect.y * scaleY));
      const sourceW = video.videoWidth > 0 ? video.videoWidth : displayW;
      const sourceH = video.videoHeight > 0 ? video.videoHeight : displayH;
      const sw = Math.max(16, Math.min(sourceW - sx, Math.round(areaRect.width * scaleX)));
      const sh = Math.max(16, Math.min(sourceH - sy, Math.round(areaRect.height * scaleY)));

      // Align dimensions to even numbers (macroblock alignment) to prevent encoder resampling stutter
      const swEven = Math.max(16, sw - (sw % 2));
      const shEven = Math.max(16, sh - (sh % 2));

      const canvas = document.createElement('canvas');
      canvas.width = swEven;
      canvas.height = shEven;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return null;

      this.videoEl = video;
      this.canvasEl = canvas;
      this.ctx = ctx;

      let lastRenderTime = performance.now();
      const targetIntervalMs = Math.max(16, Math.round(1000 / Math.max(1, frameRate)));

      const renderFrame = () => {
        if (this.destroyed) return;
        lastRenderTime = performance.now();
        try {
          if (video.readyState >= 2) {
            ctx.drawImage(video, sx, sy, swEven, shEven, 0, 0, canvas.width, canvas.height);
          }
        } catch {
          // Ignore transient rendering errors
        }

        const videoAny = video as unknown as {
          requestVideoFrameCallback?: (cb: () => void) => number;
        };
        if (typeof videoAny.requestVideoFrameCallback === 'function') {
          this.animFrameId = videoAny.requestVideoFrameCallback(renderFrame);
        } else if (typeof requestAnimationFrame === 'function') {
          this.animFrameId = requestAnimationFrame(renderFrame);
        }
      };

      renderFrame();

      // Background heartbeat: keeps canvas rendering active even if requestVideoFrameCallback
      // or requestAnimationFrame is deprioritized by Chromium when the window is non-focused.
      this.heartbeatTimer = setInterval(() => {
        if (this.destroyed) {
          if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
          return;
        }
        if (performance.now() - lastRenderTime >= targetIntervalMs * 1.5) {
          renderFrame();
        }
      }, targetIntervalMs);

      const canvasAny = canvas as unknown as {
        captureStream?: (fps?: number) => MediaStream;
      };
      if (typeof canvasAny.captureStream === 'function') {
        const stream = canvasAny.captureStream(frameRate);
        this.croppedStream = stream;
        const track = stream.getVideoTracks()[0] ?? null;
        if (track && 'contentHint' in track) {
          try {
            (track as any).contentHint = 'motion';
          } catch {}
        }
        return track;
      }
      return null;
    } catch {
      this.cleanup();
      return null;
    }
  }

  cleanup() {
    this.destroyed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.animFrameId !== null) {
      const videoAny = this.videoEl as unknown as {
        cancelVideoFrameCallback?: (id: number) => void;
      } | null;
      if (videoAny && typeof videoAny.cancelVideoFrameCallback === 'function') {
        try {
          videoAny.cancelVideoFrameCallback(this.animFrameId);
        } catch {}
      } else if (typeof cancelAnimationFrame === 'function') {
        try {
          cancelAnimationFrame(this.animFrameId);
        } catch {}
      }
      this.animFrameId = null;
    }

    try {
      this.croppedStream?.getTracks().forEach((t) => t.stop());
    } catch {}

    if (this.videoEl) {
      try {
        this.videoEl.pause();
        this.videoEl.srcObject = null;
        if (this.videoEl.parentNode) {
          this.videoEl.parentNode.removeChild(this.videoEl);
        }
      } catch {}
      this.videoEl = null;
    }

    this.canvasEl = null;
    this.ctx = null;
    this.croppedStream = null;
  }
}

export class ProScreenRecorder {
  private recorder: MediaRecorder | null = null;
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private audioMixer: StudioAudioMixer | null = null;
  private cropProcessor: AreaCropProcessor | null = null;
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
    try {
      this.audioMixer?.cleanup();
    } catch {
      // Ignore audioMixer cleanup error
    }
    try {
      this.cropProcessor?.cleanup();
    } catch {
      // Ignore cropProcessor cleanup error
    }
    this.cropProcessor = null;
    this.displayStream = null;
    this.micStream = null;
    this.mixedStream = null;
    this.audioCtx = null;
    this.audioMixer = null;
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
        recDebugLog('Calling navigator.mediaDevices.getDisplayMedia', { displayConstraints });
        displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
        recDebugLog('getDisplayMedia succeeded', {
          videoTracks: displayStream.getVideoTracks().length,
          audioTracks: displayStream.getAudioTracks().length,
        });
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

      // Set contentHint to 'motion' for smooth 60 FPS recording with zero dropped frames
      if ('contentHint' in primaryVideoTrack) {
        try {
          (primaryVideoTrack as any).contentHint = 'motion';
        } catch {}
      }

      // Best-effort resolution & FPS preference without causing OverconstrainedError
      if (typeof primaryVideoTrack.applyConstraints === 'function') {
        const resBounds = getResolutionBounds(settings.resolution);
        const physicalConstraints: MediaTrackConstraints = {
          frameRate: { ideal: settings.frameRate, max: settings.frameRate },
          ...resBounds,
        };
        if (settings.resolution === 'source') {
          physicalConstraints.width = { ideal: 3840 };
          physicalConstraints.height = { ideal: 2160 };
        }
        void primaryVideoTrack
          .applyConstraints(physicalConstraints)
          .catch(() => {});
      }

      const trackSettings =
        typeof primaryVideoTrack.getSettings === 'function' ? primaryVideoTrack.getSettings() : {};
      this.capturedDimensions = {
        width: typeof trackSettings.width === 'number' ? trackSettings.width : undefined,
        height: typeof trackSettings.height === 'number' ? trackSettings.height : undefined,
      };

      // Area Recording: Crop display stream to exact region if requested
      let activeVideoTrack = primaryVideoTrack;
      if (settings.mode === 'area' && settings.areaRect) {
        const cropProc = new AreaCropProcessor();
        this.cropProcessor = cropProc;
        const croppedTrack = await cropProc.init(
          displayStream,
          settings.areaRect,
          settings.frameRate
        );
        if (croppedTrack) {
          activeVideoTrack = croppedTrack;
          this.capturedDimensions = {
            width: Math.round(settings.areaRect.width),
            height: Math.round(settings.areaRect.height),
          };
        }
      }

      // 4. Microphone capture & studio audio mixing
      let micStream: MediaStream | null = null;
      if (settings.micAudio && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)) {
        try {
          micStream = await acquireMicrophoneStream({
            deviceId: settings.micDeviceId,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
          });
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

      const tracks: MediaStreamTrack[] = [activeVideoTrack];
      const displayAudio = displayStream.getAudioTracks();

      if (settings.tabAudio && displayAudio.length === 0 && !inExtension) {
        this.callbacks.onWarning(
          'Selected source did not include system/tab audio — recording video cleanly.'
        );
      }

      const mixer = new StudioAudioMixer();
      this.audioMixer = mixer;
      const mixedAudioTracks = await mixer.init({
        tabStream: displayAudio.length > 0 ? new MediaStream(displayAudio) : null,
        micStream: this.micStream,
        micGain: settings.micGain,
      });
      tracks.push(...mixedAudioTracks);
      this.capturedHasAudio = mixedAudioTracks.length > 0;

      const combinedStream = new MediaStream(tracks);
      this.mixedStream = combinedStream;

      // 5. MediaRecorder creation & adaptive bitrate calculation
      const bitrates = calculateRecommendedBitrate(
        settings.resolution,
        settings.frameRate,
        settings.quality
      );

      let recorder: MediaRecorder;
      let mimeType: string;
      try {
        const created = createSafeMediaRecorder(
          combinedStream,
          settings.mimeType,
          bitrates
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
          sourceWidth: trackSettings.width,
          sourceHeight: trackSettings.height,
          codec: this.activeMimeType,
          frameRate: settings.frameRate,
          quality: settings.quality,
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

      recDebugLog('Starting MediaRecorder', { mimeType: this.activeMimeType });
      recorder.start(1000);
      recDebugLog('MediaRecorder started successfully', {
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
      console.error('[ProScreen:Recorder] Capture initialization error:', err);
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

  pause(now = Date.now()): boolean {
    if (this.status !== 'recording') return false;
    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'PAUSE_TAB_RECORDING' }, (res) => {
        if (chrome.runtime.lastError || (res && res.ok === false)) {
          this.callbacks.onWarning('Could not pause offscreen recording cleanly.');
        }
      });
      this.accumulatedMs += Math.max(0, now - this.startedAt);
      this.setStatus('paused');
      return true;
    }
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.pause();
      void this.audioMixer?.pause();
      this.accumulatedMs += Math.max(0, now - this.startedAt);
      this.setStatus('paused');
      return true;
    }
    return false;
  }

  resume(now = Date.now()): boolean {
    if (this.status !== 'paused') return false;
    if (this.usingOffscreen && isExtensionContext() && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RESUME_TAB_RECORDING' }, (res) => {
        if (chrome.runtime.lastError || (res && res.ok === false)) {
          this.callbacks.onWarning('Could not resume offscreen recording cleanly.');
        }
      });
      this.startedAt = now;
      this.setStatus('recording');
      return true;
    }
    if (this.recorder && this.recorder.state === 'paused') {
      this.recorder.resume();
      void this.audioMixer?.resume();
      this.startedAt = now;
      this.setStatus('recording');
      return true;
    }
    return false;
  }

  stop(now = Date.now()): boolean {
    if (this.status !== 'recording' && this.status !== 'paused') return false;
    this.cancelled = false;
    if (this.status === 'recording') {
      this.accumulatedMs += Math.max(0, now - this.startedAt);
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
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const effectiveUrl =
    artifact.blobUrl ||
    (artifact.savedPath ? toProScreenMediaUrl(artifact.savedPath) : '');

  if (!effectiveUrl && !artifact.downloadUrl && !artifact.fromOffscreen) {
    return { ok: false, error: 'Recording file URL is no longer available.' };
  }

  // 1. Electron Desktop Native Saving (buffer-first or direct disk copy)
  if (typeof window !== 'undefined' && window.proscreenDesktop) {
    const desktop = window.proscreenDesktop;
    if (desktop.saveRecordingBuffer) {
      // If file already exists on disk, fast copy directly to new destination
      if (artifact.savedPath) {
        try {
          const res = await desktop.saveRecordingBuffer(
            undefined,
            artifact.filename,
            saveAs,
            artifact.savedPath
          );
          if (res.ok && res.path) {
            artifact.savedPath = res.path;
            return { ok: true, path: res.path };
          }
          if (res.error && !res.error.includes('No video buffer')) {
            return { ok: false, error: res.error };
          }
        } catch {
          // Fall back to buffer write below
        }
      }

      if (effectiveUrl) {
        try {
          const resp = await fetch(effectiveUrl);
          const arrayBuf = await resp.arrayBuffer();
          const finalBuf =
            artifact.filename.endsWith('.webm') && artifact.durationMs
              ? injectWebmDuration(arrayBuf, artifact.durationMs)
              : new Uint8Array(arrayBuf);
          if (artifact.filename.endsWith('.webm') && artifact.durationMs) {
            try {
              const patchedBlob = new Blob([finalBuf as unknown as BlobPart], { type: artifact.mimeType });
              artifact.blobUrl = URL.createObjectURL(patchedBlob);
            } catch {
              // Keep original blob URL if recreation fails
            }
          }
          const res = await desktop.saveRecordingBuffer(
            finalBuf,
            artifact.filename,
            saveAs,
            artifact.savedPath
          );
          if (res.ok && res.path) {
            artifact.savedPath = res.path;
            return { ok: true, path: res.path };
          }
          if (res.error) return { ok: false, error: res.error };
          return { ok: false };
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      }
    }
    if (desktop.saveCaptureFile && artifact.blobUrl) {
      try {
        const resp = await fetch(artifact.blobUrl);
        const blob = await resp.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (dataUrl) {
          const res = await desktop.saveCaptureFile(dataUrl, artifact.filename);
          if (res.ok && res.path) {
            artifact.savedPath = res.path;
            return { ok: true, path: res.path };
          }
        }
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
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
