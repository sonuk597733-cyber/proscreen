import { RecordingMode, RecordingQuality, RecordingResolution } from '../types/settings';
import { recDebugLog } from '../recorder/debugLog';

interface ActiveOffscreenSession {
  recorder: MediaRecorder;
  chunks: Blob[];
  tabStream: MediaStream;
  micStream: MediaStream | null;
  audioCtx: AudioContext | null;
  mimeType: string;
  mode: RecordingMode;
  cancelled: boolean;
  runtimeError: string | null;
  askWhereToSave: boolean;
  startedAt: number;
  accumulatedMs: number;
  paused: boolean;
  videoWidth?: number;
  videoHeight?: number;
  hasAudio: boolean;
}

let activeSession: ActiveOffscreenSession | null = null;
let retainedObjectUrl: string | null = null;
let retainedFilename: string | null = null;
let retainedMimeType: string | null = null;

const MAX_PREVIEW_DATA_URL_BYTES = 35 * 1024 * 1024;

function revokeRetainedUrl() {
  if (retainedObjectUrl) {
    try {
      URL.revokeObjectURL(retainedObjectUrl);
    } catch {
      // Ignore revoke error
    }
    retainedObjectUrl = null;
    retainedFilename = null;
    retainedMimeType = null;
  }
}

function qualityToBitrate(quality: RecordingQuality): number {
  if (quality === 'ultra') return 8_000_000;
  if (quality === 'standard') return 2_500_000;
  return 5_000_000;
}

function resolutionConstraints(resolution: RecordingResolution): { maxWidth?: number; maxHeight?: number } {
  if (resolution === '1080p') return { maxWidth: 1920, maxHeight: 1080 };
  if (resolution === '720p') return { maxWidth: 1280, maxHeight: 720 };
  return {};
}

function chooseMimeType(requested?: string): string {
  if (requested && requested !== 'auto' && MediaRecorder.isTypeSupported(requested)) {
    return requested;
  }
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // Skip unsupported check
    }
  }
  return 'video/webm';
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
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

function cleanupSession(session: ActiveOffscreenSession | null) {
  if (!session) return;
  try {
    session.tabStream.getTracks().forEach((t) => t.stop());
  } catch {
    // Ignore track stop errors
  }
  try {
    session.micStream?.getTracks().forEach((t) => t.stop());
  } catch {
    // Ignore track stop errors
  }
  try {
    if (session.audioCtx && session.audioCtx.state !== 'closed') {
      void session.audioCtx.close();
    }
  } catch {
    // Ignore AudioContext close error
  }
}

function getSessionDurationMs(session: ActiveOffscreenSession): number {
  if (session.paused) return session.accumulatedMs;
  return session.accumulatedMs + Math.max(0, Date.now() - session.startedAt);
}

async function startOffscreenRecording(payload: {
  streamId: string;
  sourceType?: 'tab' | 'desktop';
  mode?: RecordingMode;
  quality: RecordingQuality;
  resolution: RecordingResolution;
  frameRate: 30 | 60;
  mimeType: string;
  micAudio: boolean;
  tabAudio: boolean;
  askWhereToSave: boolean;
}): Promise<{ ok: boolean; mimeType?: string; warning?: string; error?: string }> {
  if (activeSession) {
    cleanupSession(activeSession);
    activeSession = null;
  }

  let tabStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;

  try {
    const mediaSource = payload.sourceType === 'desktop' ? 'desktop' : 'tab';
    const resBounds = resolutionConstraints(payload.resolution);
    const videoMandatory: Record<string, unknown> = {
      chromeMediaSource: mediaSource,
      chromeMediaSourceId: payload.streamId,
      maxFrameRate: payload.frameRate,
    };
    if (resBounds.maxWidth) videoMandatory.maxWidth = resBounds.maxWidth;
    if (resBounds.maxHeight) videoMandatory.maxHeight = resBounds.maxHeight;

    const constraints: MediaStreamConstraints = {
      audio: payload.tabAudio
        ? ({
            mandatory: {
              chromeMediaSource: mediaSource,
              chromeMediaSourceId: payload.streamId,
            },
          } as unknown as MediaTrackConstraints)
        : false,
      video: {
        mandatory: videoMandatory,
      } as unknown as MediaTrackConstraints,
    };

    try {
      tabStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (firstErr) {
      if (payload.tabAudio) {
        // Retry video-only if audio stream constraint is rejected by tab/source
        tabStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { mandatory: videoMandatory } as unknown as MediaTrackConstraints,
        });
      } else {
        throw firstErr;
      }
    }

    const videoTracks = tabStream.getVideoTracks();
    if (videoTracks.length === 0) {
      cleanupSession({
        recorder: null as unknown as MediaRecorder,
        chunks: [],
        tabStream,
        micStream: null,
        audioCtx: null,
        mimeType: 'video/webm',
        mode: payload.mode || 'tab',
        cancelled: true,
        runtimeError: null,
        askWhereToSave: false,
        startedAt: Date.now(),
        accumulatedMs: 0,
        paused: false,
        hasAudio: false,
      });
      return { ok: false, error: 'Captured tab stream has no video track.' };
    }

    const primaryVideoTrack = videoTracks[0];
    recDebugLog('Offscreen stream initialized', {
      mediaSource,
      videoTrackCount: videoTracks.length,
      videoTrackState: primaryVideoTrack.readyState,
      audioTrackCount: tabStream.getAudioTracks().length,
    });

    if (primaryVideoTrack.readyState !== 'live') {
      cleanupSession({
        recorder: null as unknown as MediaRecorder,
        chunks: [],
        tabStream,
        micStream: null,
        audioCtx: null,
        mimeType: 'video/webm',
        mode: payload.mode || 'tab',
        cancelled: true,
        runtimeError: null,
        askWhereToSave: false,
        startedAt: Date.now(),
        accumulatedMs: 0,
        paused: false,
        hasAudio: false,
      });
      return {
        ok: false,
        error: `Captured video track is not live (state: ${primaryVideoTrack.readyState}).`,
      };
    }

    const trackSettings =
      typeof primaryVideoTrack.getSettings === 'function' ? primaryVideoTrack.getSettings() : {};

    let warning: string | undefined;
    if (payload.micAudio) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        micStream = null;
        const micErrName = micErr instanceof Error ? micErr.name : '';
        warning =
          micErrName === 'NotFoundError'
            ? 'No microphone device found — tab recording continues without mic audio.'
            : 'Microphone permission denied — tab recording continues without mic audio.';
      }
    }

    const composedTracks: MediaStreamTrack[] = [...videoTracks];
    const hasTabAudio = tabStream.getAudioTracks().length > 0;
    const hasMicAudio = Boolean(micStream && micStream.getAudioTracks().length > 0);
    let hasAudio = false;

    if (hasTabAudio && hasMicAudio && micStream) {
      audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }
      const dest = audioCtx.createMediaStreamDestination();
      const tabSource = audioCtx.createMediaStreamSource(new MediaStream(tabStream.getAudioTracks()));
      const micSource = audioCtx.createMediaStreamSource(micStream);
      tabSource.connect(dest);
      micSource.connect(dest);
      composedTracks.push(...dest.stream.getAudioTracks());
      hasAudio = dest.stream.getAudioTracks().length > 0;
    } else if (hasTabAudio) {
      composedTracks.push(...tabStream.getAudioTracks());
      hasAudio = true;
    } else if (hasMicAudio && micStream) {
      composedTracks.push(...micStream.getAudioTracks());
      hasAudio = true;
    }

    const finalStream = new MediaStream(composedTracks);
    const chosenMime = chooseMimeType(payload.mimeType);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(finalStream, {
        mimeType: chosenMime,
        videoBitsPerSecond: qualityToBitrate(payload.quality),
      });
    } catch {
      recorder = new MediaRecorder(finalStream);
    }

    const actualMimeType = recorder.mimeType || chosenMime;
    const session: ActiveOffscreenSession = {
      recorder,
      chunks: [],
      tabStream,
      micStream,
      audioCtx,
      mimeType: actualMimeType,
      mode: payload.mode || 'tab',
      cancelled: false,
      runtimeError: null,
      askWhereToSave: payload.askWhereToSave,
      startedAt: Date.now(),
      accumulatedMs: 0,
      paused: false,
      videoWidth: typeof trackSettings.width === 'number' ? trackSettings.width : undefined,
      videoHeight: typeof trackSettings.height === 'number' ? trackSettings.height : undefined,
      hasAudio,
    };
    activeSession = session;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        session.chunks.push(ev.data);
      }
    };

    recorder.onerror = (ev) => {
      const err = (ev as unknown as { error?: Error }).error;
      session.runtimeError = err?.message || 'Offscreen MediaRecorder failed during capture.';
      cleanupSession(session);
      session.chunks = [];
      if (activeSession === session) {
        activeSession = null;
      }
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_RECORDING_FINISHED',
        cancelled: false,
        error: session.runtimeError,
      });
    };

    recorder.onstop = async () => {
      const durationMs = getSessionDurationMs(session);
      const wasCancelled = session.cancelled;
      const runtimeError = session.runtimeError;
      const chunks = session.chunks;
      session.chunks = [];
      cleanupSession(session);
      if (activeSession === session) {
        activeSession = null;
      }

      if (runtimeError) {
        return;
      }

      if (wasCancelled) {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_RECORDING_FINISHED', cancelled: true });
        return;
      }

      const totalBytes = chunks.reduce((sum, c) => sum + (c?.size || 0), 0);
      if (chunks.length === 0 || totalBytes === 0) {
        chrome.runtime.sendMessage({
          type: 'OFFSCREEN_RECORDING_FINISHED',
          cancelled: false,
          error: 'Recording finished with zero captured video bytes.',
        });
        return;
      }

      const blob = new Blob(chunks, { type: session.mimeType });
      recDebugLog('Offscreen recording stopped', {
        sizeBytes: blob.size,
        mimeType: blob.type || session.mimeType,
        durationMs,
      });

      if (!blob || blob.size === 0) {
        chrome.runtime.sendMessage({
          type: 'OFFSCREEN_RECORDING_FINISHED',
          cancelled: false,
          error: 'Recorded video Blob was empty (0 bytes).',
        });
        return;
      }

      revokeRetainedUrl();
      const url = URL.createObjectURL(blob);
      const ext = session.mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
      const filename = `proscreen-${session.mode}-recording-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19)}.${ext}`;

      retainedObjectUrl = url;
      retainedFilename = filename;
      retainedMimeType = session.mimeType;

      const previewDataUrl =
        blob.size <= MAX_PREVIEW_DATA_URL_BYTES ? await blobToDataUrl(blob) : null;

      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_RECORDING_FINISHED',
        cancelled: false,
        objectUrl: url,
        dataUrl: previewDataUrl,
        filename,
        mimeType: session.mimeType,
        sizeBytes: blob.size,
        durationMs,
        videoWidth: session.videoWidth,
        videoHeight: session.videoHeight,
        hasAudio: session.hasAudio,
        mode: session.mode,
        saveAs: session.askWhereToSave,
      });
    };

    primaryVideoTrack.addEventListener('ended', () => {
      if (activeSession === session && session.recorder.state !== 'inactive') {
        try {
          if (session.recorder.state === 'recording' && typeof session.recorder.requestData === 'function') {
            session.recorder.requestData();
          }
        } catch {
          // Ignore requestData errors
        }
        session.recorder.stop();
      }
    });

    if (recorder.state !== 'inactive') {
      cleanupSession(session);
      activeSession = null;
      return { ok: false, error: `MediaRecorder is in invalid state: ${recorder.state}` };
    }

    recorder.start(250);
    recDebugLog('Offscreen MediaRecorder state', {
      state: recorder.state,
      mimeType: actualMimeType,
    });
    if (session.runtimeError) {
      cleanupSession(session);
      if (activeSession === session) activeSession = null;
      return { ok: false, error: session.runtimeError };
    }
    return { ok: true, mimeType: actualMimeType, warning };
  } catch (err) {
    try {
      tabStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore cleanup error
    }
    try {
      micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore cleanup error
    }
    try {
      if (audioCtx && audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    } catch {
      // Ignore AudioContext cleanup error
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to start offscreen tab capture.',
    };
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'OFFSCREEN_START_RECORDING') {
      void startOffscreenRecording(msg.payload).then(sendResponse);
      return true;
    }

    if (msg.type === 'OFFSCREEN_PAUSE_RECORDING') {
      if (activeSession?.recorder.state === 'recording') {
        activeSession.accumulatedMs += Math.max(0, Date.now() - activeSession.startedAt);
        activeSession.paused = true;
        activeSession.recorder.pause();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
      return;
    }

    if (msg.type === 'OFFSCREEN_RESUME_RECORDING') {
      if (activeSession?.recorder.state === 'paused') {
        activeSession.startedAt = Date.now();
        activeSession.paused = false;
        activeSession.recorder.resume();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
      return;
    }

    if (msg.type === 'OFFSCREEN_STOP_RECORDING') {
      if (activeSession && activeSession.recorder.state !== 'inactive') {
        activeSession.cancelled = Boolean(msg.cancel);
        if (!activeSession.paused) {
          activeSession.accumulatedMs += Math.max(0, Date.now() - activeSession.startedAt);
          activeSession.paused = true;
        }
        try {
          if (
            activeSession.recorder.state === 'recording' &&
            typeof activeSession.recorder.requestData === 'function'
          ) {
            activeSession.recorder.requestData();
          }
        } catch {
          // Ignore requestData error
        }
        activeSession.recorder.stop();
        sendResponse({ ok: true });
      } else {
        cleanupSession(activeSession);
        activeSession = null;
        sendResponse({ ok: false, error: 'No active offscreen recording session.' });
      }
      return;
    }

    if (msg.type === 'OFFSCREEN_GET_RETAINED_URL') {
      sendResponse({
        ok: Boolean(retainedObjectUrl),
        objectUrl: retainedObjectUrl,
        filename: retainedFilename,
        mimeType: retainedMimeType,
      });
      return;
    }

    if (msg.type === 'OFFSCREEN_CLEAR_RECORDING') {
      revokeRetainedUrl();
      sendResponse({ ok: true });
      return;
    }
  });
}
