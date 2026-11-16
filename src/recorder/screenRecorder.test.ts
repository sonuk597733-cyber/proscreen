import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AreaCropProcessor,
  ProScreenRecorder,
  RecordingArtifact,
  buildDisplayMediaOptions,
  calculateRecommendedBitrate,
  classifyCaptureError,
  downloadRecordingArtifact,
  formatByteSize,
  formatRecordingDuration,
  getBitrateForQuality,
  getExtensionForMimeType,
  getResolutionBounds,
  getResolutionCapabilities,
  selectAutomaticRecordingProfile,
  validatePreRecordingStream,
} from './screenRecorder';
import {
  StudioAudioMixer,
  MicAudioMonitor,
  enumerateAudioInputDevices,
} from './audioEngine';
import { RecordingSettings } from '../types/settings';

const BASE_SETTINGS: RecordingSettings = {
  mode: 'tab',
  quality: 'high',
  resolution: '1080p',
  frameRate: 30,
  mimeType: 'auto',
  micAudio: false,
  tabAudio: true,
};

class MockTrack {
  kind: 'video' | 'audio';
  readyState: 'live' | 'ended' = 'live';
  stopped = false;
  listeners: Record<string, Array<() => void>> = {};

  constructor(kind: 'video' | 'audio', initialState: 'live' | 'ended' = 'live') {
    this.kind = kind;
    this.readyState = initialState;
  }
  stop() {
    this.stopped = true;
    this.readyState = 'ended';
  }
  getSettings() {
    return this.kind === 'video' ? { width: 1280, height: 720 } : {};
  }
  applyConstraints() {
    return Promise.resolve();
  }
  addEventListener(event: string, fn: () => void) {
    this.listeners[event] = this.listeners[event] ?? [];
    this.listeners[event].push(fn);
  }
  emit(event: string) {
    if (event === 'ended') this.readyState = 'ended';
    (this.listeners[event] ?? []).forEach((fn) => fn());
  }
}

class MockMediaStream {
  tracks: MockTrack[];
  constructor(tracks: MockTrack[] = []) {
    this.tracks = tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getTracks() {
    return this.tracks;
  }
}

function withMockBrowserEnv(
  opts: {
    getDisplayMedia?: () => Promise<MockMediaStream>;
    getUserMedia?: (constraints: unknown) => Promise<MockMediaStream>;
    chromeSendMessage?: (msg: unknown, cb: (res: unknown) => void) => void;
    emitEmptyChunks?: boolean;
    triggerErrorOnStart?: boolean;
  },
  fn: (ctx: {
    revokedUrls: string[];
  }) => Promise<void>
) {
  const g = globalThis as Record<string, unknown>;
  const origNavigator = g.navigator;
  const origMediaRecorder = g.MediaRecorder;
  const origMediaStream = g.MediaStream;
  const origURL = g.URL;
  const origChrome = g.chrome;

  const revokedUrls: string[] = [];

  class MockMediaRecorder {
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    mimeType = 'video/webm;codecs=vp9,opus';
    ondataavailable: ((ev: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((ev: { error: Error }) => void) | null = null;

    static isTypeSupported(mime: string) {
      return mime.startsWith('video/webm');
    }

    start() {
      this.state = 'recording';
      if (opts.triggerErrorOnStart) {
        this.state = 'inactive';
        this.onerror?.({ error: new Error('Mock encoder failure') });
      }
    }
    pause() {
      if (this.state === 'recording') this.state = 'paused';
    }
    resume() {
      if (this.state === 'paused') this.state = 'recording';
    }
    requestData() {
      if (!opts.emitEmptyChunks) {
        this.ondataavailable?.({ data: new Blob(['mock-webm-bytes'], { type: this.mimeType }) });
      }
    }
    stop() {
      if (this.state === 'inactive') return;
      if (!opts.emitEmptyChunks) {
        this.ondataavailable?.({ data: new Blob(['final-frame'], { type: this.mimeType }) });
      }
      this.state = 'inactive';
      this.onstop?.();
    }
  }

  Object.defineProperty(g, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getDisplayMedia: opts.getDisplayMedia,
        getUserMedia: opts.getUserMedia,
      },
    },
  });
  Object.defineProperty(g, 'MediaRecorder', { configurable: true, value: MockMediaRecorder });
  Object.defineProperty(g, 'MediaStream', { configurable: true, value: MockMediaStream });
  Object.defineProperty(g, 'URL', {
    configurable: true,
    value: {
      createObjectURL: () => `blob:mock/${Date.now()}`,
      revokeObjectURL: (u: string) => revokedUrls.push(u),
    },
  });

  if (opts.chromeSendMessage) {
    Object.defineProperty(g, 'chrome', {
      configurable: true,
      value: {
        runtime: {
          id: 'test-extension-id',
          lastError: undefined,
          sendMessage: opts.chromeSendMessage,
        },
      },
    });
  } else {
    Object.defineProperty(g, 'chrome', { configurable: true, value: undefined });
  }

  return fn({ revokedUrls }).finally(() => {
    Object.defineProperty(g, 'navigator', { configurable: true, value: origNavigator });
    Object.defineProperty(g, 'MediaRecorder', { configurable: true, value: origMediaRecorder });
    Object.defineProperty(g, 'MediaStream', { configurable: true, value: origMediaStream });
    Object.defineProperty(g, 'URL', { configurable: true, value: origURL });
    Object.defineProperty(g, 'chrome', { configurable: true, value: origChrome });
  });
}

test('formatRecordingDuration and formatByteSize format accurately', () => {
  assert.equal(formatRecordingDuration(0), '00:00');
  assert.equal(formatRecordingDuration(9_400), '00:09');
  assert.equal(formatRecordingDuration(65_000), '01:05');
  assert.equal(formatRecordingDuration(600_000), '10:00');
  assert.equal(formatByteSize(0), '0 KB');
  assert.equal(formatByteSize(512), '1 KB');
  assert.equal(formatByteSize(245_760), '240 KB');
  assert.equal(formatByteSize(2_621_440), '2.5 MB');
});

test('quality bitrates, resolution bounds, mime extension, and capture options map cleanly', () => {
  assert.equal(getBitrateForQuality('standard'), 2_500_000);
  assert.equal(getBitrateForQuality('high'), 5_000_000);
  assert.equal(getBitrateForQuality('ultra'), 8_000_000);
  assert.equal(getExtensionForMimeType('video/mp4'), 'mp4');
  assert.equal(getExtensionForMimeType('video/webm;codecs=vp9'), 'webm');
  assert.deepEqual(getResolutionBounds('source'), {});
  assert.deepEqual(getResolutionBounds('1080p'), {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  });
  assert.deepEqual(getResolutionBounds('720p'), {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  });

  const tabOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'tab' });
  assert.equal(tabOpts.preferCurrentTab, true);
  assert.equal((tabOpts.video as { displaySurface?: string }).displaySurface, 'browser');

  const winOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'window' });
  assert.equal(winOpts.preferCurrentTab, undefined);
  assert.equal((winOpts.video as { displaySurface?: string }).displaySurface, 'window');

  const scrOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'screen' });
  assert.equal(scrOpts.preferCurrentTab, undefined);
  assert.equal((scrOpts.video as { displaySurface?: string }).displaySurface, 'monitor');
});

test('classifyCaptureError distinguishes picker cancel, policy block, user gesture, unsupported, and recorder failures', () => {
  assert.match(
    classifyCaptureError('', 'picker', 'picker_cancelled'),
    /picker was cancelled/i
  );
  assert.match(
    classifyCaptureError('', 'picker', 'unsupported_mode'),
    /unavailable/i
  );

  const policyErr = new Error('Access to display-capture is disallowed by permissions policy');
  policyErr.name = 'NotAllowedError';
  assert.match(classifyCaptureError(policyErr, 'getDisplayMedia'), /Permissions-Policy/i);

  const gestureErr = new Error('Must be handling a user gesture');
  gestureErr.name = 'NotAllowedError';
  assert.match(classifyCaptureError(gestureErr, 'getDisplayMedia'), /direct user click/i);

  const abortErr = new Error('User cancelled');
  abortErr.name = 'AbortError';
  assert.match(classifyCaptureError(abortErr, 'getDisplayMedia'), /cancelled before selecting/i);

  const recErr = new Error('Codec unsupported');
  recErr.name = 'NotSupportedError';
  assert.match(classifyCaptureError(recErr, 'recorder'), /not supported by MediaRecorder/i);
});

test('validatePreRecordingStream rejects null stream, empty video tracks, and non-live tracks', async () => {
  await withMockBrowserEnv({}, async () => {
    const missing = validatePreRecordingStream(null);
    assert.equal(missing.ok, false);

    const noVideo = validatePreRecordingStream(
      new MockMediaStream([new MockTrack('audio')]) as unknown as MediaStream
    );
    assert.equal(noVideo.ok, false);

    const endedVideo = validatePreRecordingStream(
      new MockMediaStream([new MockTrack('video', 'ended')]) as unknown as MediaStream
    );
    assert.equal(endedVideo.ok, false);
    if (!endedVideo.ok) {
      assert.match(endedVideo.error, /not live/i);
    }

    const valid = validatePreRecordingStream(
      new MockMediaStream([new MockTrack('video', 'live')]) as unknown as MediaStream
    );
    assert.equal(valid.ok, true);
  });
});

test('ProScreenRecorder executes start -> pause -> resume -> stop lifecycle and cleans tracks', async () => {
  const videoTrack = new MockTrack('video');
  const audioTrack = new MockTrack('audio');
  const statuses: string[] = [];
  let completedBytes = 0;
  let completedHasAudio = false;

  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => new MockMediaStream([videoTrack, audioTrack]),
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: (s) => statuses.push(s),
        onComplete: (artifact) => {
          completedBytes = artifact.sizeBytes;
          completedHasAudio = Boolean(artifact.hasAudio);
        },
        onCancelled: () => assert.fail('Should not cancel'),
        onError: (e) => assert.fail(`Unexpected error: ${e}`),
        onWarning: () => {},
      });

      const started = await rec.start(BASE_SETTINGS, false);
      assert.equal(started, true);
      assert.equal(rec.getStatus(), 'recording');
      assert.equal(rec.hasActiveTracks(), true);

      assert.equal(rec.pause(), true);
      assert.equal(rec.getStatus(), 'paused');
      assert.equal(rec.resume(), true);
      assert.equal(rec.getStatus(), 'recording');

      assert.equal(rec.stop(), true);
      assert.equal(rec.getStatus(), 'idle');
      assert.equal(videoTrack.stopped, true);
      assert.equal(audioTrack.stopped, true);
      assert.equal(completedHasAudio, true);
      assert.ok(completedBytes > 0);
      assert.deepEqual(statuses, ['recording', 'paused', 'recording', 'stopping', 'idle']);
    }
  );
});

test('ProScreenRecorder uses CHOOSE_DESKTOP_MEDIA + chromeMediaSource desktop in extension mode for screen/window/tab fallback', async () => {
  const sentMessages: Array<{ type: string; mode?: string }> = [];
  const gUMCalls: Array<unknown> = [];
  let getDisplayMediaCalled = false;

  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => {
        getDisplayMediaCalled = true;
        return new MockMediaStream([new MockTrack('video')]);
      },
      getUserMedia: async (constraints) => {
        gUMCalls.push(constraints);
        return new MockMediaStream([new MockTrack('video')]);
      },
      chromeSendMessage: (msg, cb) => {
        const typed = msg as { type: string; mode?: string };
        sentMessages.push(typed);
        if (typed.type === 'START_TAB_RECORDING') {
          cb({ ok: false, fallbackRequired: true, error: 'tabCapture not invoked' });
          return;
        }
        if (typed.type === 'CHOOSE_DESKTOP_MEDIA') {
          cb({ ok: true, streamId: 'stream-id-123', canRequestAudioTrack: false });
          return;
        }
        cb({ ok: true });
      },
    },
    async () => {
      const warnings: string[] = [];
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => {},
        onCancelled: () => {},
        onError: (e) => assert.fail(`Unexpected error: ${e}`),
        onWarning: (w) => warnings.push(w),
      });

      // Screen mode goes straight to CHOOSE_DESKTOP_MEDIA
      const screenOk = await rec.start({ ...BASE_SETTINGS, mode: 'screen' }, false);
      assert.equal(screenOk, true);
      assert.equal(getDisplayMediaCalled, false);
      assert.equal(sentMessages[0].type, 'CHOOSE_DESKTOP_MEDIA');
      assert.equal(sentMessages[0].mode, 'screen');
      assert.equal(warnings.length, 1);
      rec.stop();
      await new Promise((r) => setTimeout(r, 10));

      // Window mode goes straight to CHOOSE_DESKTOP_MEDIA
      sentMessages.length = 0;
      const winOk = await rec.start({ ...BASE_SETTINGS, mode: 'window', tabAudio: false }, false);
      assert.equal(winOk, true);
      assert.equal(sentMessages[0].type, 'CHOOSE_DESKTOP_MEDIA');
      assert.equal(sentMessages[0].mode, 'window');
      rec.stop();
      await new Promise((r) => setTimeout(r, 10));

      // Tab mode tries START_TAB_RECORDING then falls back to CHOOSE_DESKTOP_MEDIA (never getDisplayMedia)
      sentMessages.length = 0;
      const tabOk = await rec.start({ ...BASE_SETTINGS, mode: 'tab', tabAudio: false }, false);
      assert.equal(tabOk, true);
      assert.equal(getDisplayMediaCalled, false);
      assert.deepEqual(
        sentMessages.map((m) => m.type),
        ['START_TAB_RECORDING', 'CHOOSE_DESKTOP_MEDIA']
      );
      assert.equal(gUMCalls.length, 3);
      rec.stop();
    }
  );
});

test('ProScreenRecorder stops cleanly on cancelled desktop picker without calling getDisplayMedia', async () => {
  const errors: string[] = [];
  let getDisplayMediaCalled = false;

  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => {
        getDisplayMediaCalled = true;
        return new MockMediaStream([new MockTrack('video')]);
      },
      chromeSendMessage: (msg, cb) => {
        const typed = msg as { type: string };
        if (typed.type === 'CHOOSE_DESKTOP_MEDIA') {
          cb({
            ok: false,
            errorCode: 'picker_cancelled',
            error: 'Screen picker was cancelled.',
          });
          return;
        }
        cb({ ok: false });
      },
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => assert.fail('Should not complete'),
        onCancelled: () => assert.fail('Should not fire onCancelled'),
        onError: (e) => errors.push(e),
        onWarning: () => {},
      });
      const ok = await rec.start({ ...BASE_SETTINGS, mode: 'screen' }, false);
      assert.equal(ok, false);
      assert.equal(getDisplayMediaCalled, false);
      assert.equal(rec.getStatus(), 'idle');
      assert.equal(errors.length, 1);
      assert.match(errors[0], /picker was cancelled/i);
    }
  );
});

test('ProScreenRecorder handles permission denial cleanly without leaving stale state', async () => {
  const errors: string[] = [];
  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => {
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      },
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => assert.fail('Should not complete'),
        onCancelled: () => assert.fail('Should not cancel'),
        onError: (e) => errors.push(e),
        onWarning: () => {},
      });
      const ok = await rec.start(BASE_SETTINGS, false);
      assert.equal(ok, false);
      assert.equal(rec.getStatus(), 'idle');
      assert.equal(errors.length, 1);
      assert.match(errors[0], /denied/i);
    }
  );
});

test('ProScreenRecorder rejects 0-byte recordings and handles runtime MediaRecorder error', async () => {
  const videoTrack = new MockTrack('video');
  const emptyErrors: string[] = [];

  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => new MockMediaStream([videoTrack]),
      emitEmptyChunks: true,
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => assert.fail('Should reject empty Blob'),
        onCancelled: () => {},
        onError: (e) => emptyErrors.push(e),
        onWarning: () => {},
      });
      await rec.start({ ...BASE_SETTINGS, tabAudio: false }, false);
      rec.stop();
      assert.equal(emptyErrors.length, 1);
      assert.match(emptyErrors[0], /zero video frames/i);
      assert.equal(videoTrack.stopped, true);
    }
  );

  const track2 = new MockTrack('video');
  const runtimeErrors: string[] = [];
  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => new MockMediaStream([track2]),
      triggerErrorOnStart: true,
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => {},
        onCancelled: () => {},
        onError: (e) => runtimeErrors.push(e),
        onWarning: () => {},
      });
      await rec.start({ ...BASE_SETTINGS, tabAudio: false }, false);
      assert.equal(rec.getStatus(), 'idle');
      assert.equal(track2.stopped, true);
      assert.equal(runtimeErrors.length, 1);
      assert.match(runtimeErrors[0], /Mock encoder failure/);
    }
  );
});

test('ProScreenRecorder auto-stops when user clicks browser Stop Sharing track ended', async () => {
  const videoTrack = new MockTrack('video');
  let completed = false;

  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => new MockMediaStream([videoTrack]),
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => {
          completed = true;
        },
        onCancelled: () => {},
        onError: (e) => assert.fail(e),
        onWarning: () => {},
      });
      await rec.start({ ...BASE_SETTINGS, tabAudio: false }, false);
      assert.equal(rec.getStatus(), 'recording');
      videoTrack.emit('ended');
      assert.equal(completed, true);
      assert.equal(rec.getStatus(), 'idle');
    }
  );
});

test('downloadRecordingArtifact validates URL presence cleanly', async () => {
  const res = await downloadRecordingArtifact({
    id: 'r1',
    blobUrl: '',
    filename: 'missing.webm',
    mimeType: 'video/webm',
    durationMs: 1000,
    sizeBytes: 100,
    createdAt: Date.now(),
  });
  assert.equal(res.ok, false);
});

test('calculateRecommendedBitrate computes adaptive video and studio audio bitrates', () => {
  // 4K @ 60 FPS Ultra
  const ultra4k60 = calculateRecommendedBitrate('4k', 60, 'ultra');
  assert.ok(ultra4k60.videoBitsPerSecond >= 35_000_000, '4K 60fps ultra bitrate is high fidelity');
  assert.equal(ultra4k60.audioBitsPerSecond, 256_000, 'Ultra audio bitrate is 256kbps studio opus');

  // 1080p @ 60 FPS High
  const high1080p60 = calculateRecommendedBitrate('1080p', 60, 'high');
  assert.equal(high1080p60.videoBitsPerSecond, 8_400_000);
  assert.equal(high1080p60.audioBitsPerSecond, 192_000);

  // 1080p @ 30 FPS High
  const high1080p30 = calculateRecommendedBitrate('1080p', 30, 'high');
  assert.equal(high1080p30.videoBitsPerSecond, 6_000_000);
  assert.equal(high1080p30.audioBitsPerSecond, 192_000);

  // 720p @ 30 FPS Standard
  const std720p30 = calculateRecommendedBitrate('720p', 30, 'standard');
  assert.equal(std720p30.videoBitsPerSecond, 1_950_000);
  assert.equal(std720p30.audioBitsPerSecond, 128_000);
});

test('getResolutionBounds supports 4K, 8K, 16K and 1440p resolutions', () => {
  assert.deepEqual(getResolutionBounds('16k'), { width: { ideal: 15360 }, height: { ideal: 8640 } });
  assert.deepEqual(getResolutionBounds('8k'), { width: { ideal: 7680 }, height: { ideal: 4320 } });
  assert.deepEqual(getResolutionBounds('4k'), { width: { ideal: 3840 }, height: { ideal: 2160 } });
  assert.deepEqual(getResolutionBounds('1440p'), { width: { ideal: 2560 }, height: { ideal: 1440 } });
  assert.deepEqual(getResolutionBounds('1080p'), { width: { ideal: 1920 }, height: { ideal: 1080 } });
  assert.deepEqual(getResolutionBounds('720p'), { width: { ideal: 1280 }, height: { ideal: 720 } });
  assert.deepEqual(getResolutionBounds('source'), {});
});

test('getResolutionCapabilities detects native display size and honest capability flags', () => {
  // Test with standard 1080p display
  const caps1080p = getResolutionCapabilities(1920, 1080);
  assert.equal(caps1080p['4k'].isNative, false);
  assert.equal(caps1080p['8k'].isNative, false);
  assert.equal(caps1080p['16k'].isNative, false);
  assert.ok(caps1080p['4k'].reason?.includes('1920×1080'));

  // Test with 4K UHD display
  const caps4K = getResolutionCapabilities(3840, 2160);
  assert.equal(caps4K['4k'].isNative, true);
  assert.equal(caps4K['8k'].isNative, false);
  assert.equal(caps4K['4k'].reason, undefined);

  // Test with 8K display
  const caps8K = getResolutionCapabilities(7680, 4320);
  assert.equal(caps8K['8k'].isNative, true);
  assert.equal(caps8K['8k'].reason, undefined);
});

test('calculateRecommendedBitrate scales for ultra-pro and 120 FPS', () => {
  const ultraPro4k120 = calculateRecommendedBitrate('4k', 120, 'ultra-pro');
  assert.ok(ultraPro4k120.videoBitsPerSecond >= 55_000_000, 'Ultra-pro 120 FPS video reaches 55+ Mbps');
  assert.equal(ultraPro4k120.audioBitsPerSecond, 320_000, 'Ultra-pro audio is 320 kbps studio master');

  const ultraPro8k60 = calculateRecommendedBitrate('8k', 60, 'ultra-pro');
  assert.ok(ultraPro8k60.videoBitsPerSecond >= 80_000_000, '8K ultra-pro reaches studio master bitrate');

  assert.equal(getBitrateForQuality('ultra-pro'), 12_000_000);
  assert.equal(getBitrateForQuality('ultra'), 8_000_000);
  assert.equal(getBitrateForQuality('high'), 5_000_000);
});

test('selectAutomaticRecordingProfile chooses best genuinely supported configuration automatically', () => {
  // 1080p display
  const p1080 = selectAutomaticRecordingProfile(1920, 1080);
  assert.equal(p1080.resolution, '1080p');
  assert.equal(p1080.frameRate, 60);
  assert.equal(p1080.audioBitsPerSecond, 192_000);
  assert.ok(p1080.videoBitsPerSecond >= 8_000_000);

  // 1440p display
  const p1440 = selectAutomaticRecordingProfile(2560, 1440);
  assert.equal(p1440.resolution, '1440p');
  assert.equal(p1440.frameRate, 60);
  assert.ok(p1440.videoBitsPerSecond >= 16_000_000);

  // 4K UHD display
  const p4k = selectAutomaticRecordingProfile(3840, 2160);
  assert.equal(p4k.resolution, '4k');
  assert.equal(p4k.frameRate, 60);
  assert.ok(p4k.videoBitsPerSecond >= 25_000_000);
});

test('StudioAudioMixer manages dual-audio mixing and single-source passthrough', async () => {
  const mixer = new StudioAudioMixer();

  const tabTrack = new MockTrack('audio');
  const micTrack = new MockTrack('audio');
  const tabStream = new MockMediaStream([tabTrack]) as unknown as MediaStream;
  const micStream = new MockMediaStream([micTrack]) as unknown as MediaStream;

  // 1. Only tab audio -> passthrough
  const tabOnly = await mixer.init({ tabStream, micStream: null });
  assert.equal(tabOnly.length, 1);
  assert.equal(tabOnly[0], tabTrack as unknown as MediaStreamTrack);

  // 2. Only mic audio -> passthrough
  const micOnly = await mixer.init({ tabStream: null, micStream });
  assert.equal(micOnly.length, 1);
  assert.equal(micOnly[0], micTrack as unknown as MediaStreamTrack);

  // 3. Both audio sources -> Web Audio mixer initialization
  const g = globalThis as Record<string, unknown>;
  const origAudioContext = g.AudioContext;

  class MockAudioContext {
    state = 'running';
    sampleRate = 48000;
    currentTime = 0;
    createMediaStreamDestination() {
      const mixedTrack = new MockTrack('audio');
      return {
        stream: new MockMediaStream([mixedTrack]),
      };
    }
    createDynamicsCompressor() {
      return {
        threshold: { setValueAtTime: () => {} },
        knee: { setValueAtTime: () => {} },
        ratio: { setValueAtTime: () => {} },
        attack: { setValueAtTime: () => {} },
        release: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createMediaStreamSource() {
      return {
        connect: () => {},
      };
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }

  g.AudioContext = MockAudioContext;

  try {
    const mixedTracks = await mixer.init({ tabStream, micStream });
    assert.equal(mixedTracks.length, 1, 'Returns 1 mixed output track from destination node');
    mixer.cleanup();
  } finally {
    g.AudioContext = origAudioContext;
  }
});

test('downloadRecordingArtifact uses Electron saveRecordingBuffer when in desktop context', async () => {
  const g = globalThis as Record<string, unknown>;
  const origFetch = g.fetch;
  const origWindow = g.window;

  let savedBuffer: Uint8Array | null = null;
  let savedFilename = '';

  const mockDesktop = {
    saveRecordingBuffer: async (buf: Uint8Array, filename: string) => {
      savedBuffer = buf;
      savedFilename = filename;
      return { ok: true, path: `C:\\Users\\dell\\Videos\\${filename}` };
    },
  };

  g.window = {
    proscreenDesktop: mockDesktop,
  };
  g.fetch = async () => ({
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
  }) as unknown as typeof fetch;

  try {
    const artifact: RecordingArtifact = {
      id: 'rec_desktop',
      blobUrl: 'blob:proscreen/test',
      filename: 'proscreen-screen-2026.webm',
      mimeType: 'video/webm',
      durationMs: 5000,
      sizeBytes: 4,
      createdAt: Date.now(),
    };

    const result = await downloadRecordingArtifact(artifact);
    assert.equal(result.ok, true);
    assert.equal(result.path, 'C:\\Users\\dell\\Videos\\proscreen-screen-2026.webm');
    assert.equal(artifact.savedPath, 'C:\\Users\\dell\\Videos\\proscreen-screen-2026.webm');
    assert.equal(savedFilename, 'proscreen-screen-2026.webm');
    assert.ok(savedBuffer);
    assert.equal((savedBuffer as Uint8Array).length, 4);
  } finally {
    g.fetch = origFetch;
    g.window = origWindow;
  }
});

test('buildDisplayMediaOptions maps all 3 recording modes accurately', () => {
  const tabOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'tab' });
  assert.equal((tabOpts.video as { displaySurface?: string }).displaySurface, 'browser');
  assert.equal(tabOpts.preferCurrentTab, true);

  const winOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'window' });
  assert.equal((winOpts.video as { displaySurface?: string }).displaySurface, 'window');

  const screenOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'screen' });
  assert.equal((screenOpts.video as { displaySurface?: string }).displaySurface, 'monitor');
});

test('ProScreenRecorder accurately handles pause, resume, and elapsed time calculation', async () => {
  const videoTrack = new MockTrack('video');

  await withMockBrowserEnv(
    {
      getDisplayMedia: async () => new MockMediaStream([videoTrack]),
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => {},
        onCancelled: () => {},
        onError: (e) => assert.fail(e),
        onWarning: () => {},
      });

      await rec.start({ ...BASE_SETTINGS, tabAudio: false, micAudio: false }, false);
      assert.equal(rec.getStatus(), 'recording');

      // Emulate 1000ms elapsed
      const t0 = (rec as unknown as { startedAt: number }).startedAt;
      const elapsed1 = rec.getElapsedMs(t0 + 1000);
      assert.equal(elapsed1, 1000);

      // Pause at t0 + 1000ms
      rec.pause(t0 + 1000);
      assert.equal(rec.getStatus(), 'paused');

      // During pause, elapsed time is frozen at 1000ms even after 2000ms wall-clock pass
      const elapsedPaused = rec.getElapsedMs(t0 + 3000);
      assert.equal(elapsedPaused, 1000, 'Elapsed duration remains frozen while paused');

      // Resume at t0 + 3000
      rec.resume(t0 + 3000);
      assert.equal(rec.getStatus(), 'recording');

      // Stop at t0 + 4000 (1000ms before pause + 1000ms after resume = 2000ms total)
      rec.stop(t0 + 4000);
      assert.equal(rec.getStatus(), 'idle');
    }
  );
});

test('ProScreenRecorder supports all 4 audio combinations', async () => {
  await withMockBrowserEnv(
    {
      getDisplayMedia: async () =>
        new MockMediaStream([new MockTrack('video'), new MockTrack('audio')]),
      getUserMedia: async () => new MockMediaStream([new MockTrack('audio')]),
    },
    async () => {
      const rec = new ProScreenRecorder({
        onStatusChange: () => {},
        onComplete: () => {},
        onCancelled: () => {},
        onError: (e) => assert.fail(e),
        onWarning: () => {},
      });

      // 1. Tab ON, Mic OFF
      const ok1 = await rec.start({ ...BASE_SETTINGS, tabAudio: true, micAudio: false }, false);
      assert.equal(ok1, true);
      rec.stop();

      // 2. Tab OFF, Mic ON
      const ok2 = await rec.start({ ...BASE_SETTINGS, tabAudio: false, micAudio: true }, false);
      assert.equal(ok2, true);
      rec.stop();

      // 3. Both ON
      const ok3 = await rec.start({ ...BASE_SETTINGS, tabAudio: true, micAudio: true }, false);
      assert.equal(ok3, true);
      rec.stop();

      // 4. Both OFF (video only)
      const ok4 = await rec.start({ ...BASE_SETTINGS, tabAudio: false, micAudio: false }, false);
      assert.equal(ok4, true);
      rec.stop();
    }
  );
});

test('buildDisplayMediaOptions maps area recording mode to monitor displaySurface', () => {
  const areaOpts = buildDisplayMediaOptions({ ...BASE_SETTINGS, mode: 'area' });
  assert.equal((areaOpts.video as { displaySurface?: string }).displaySurface, 'monitor');
  assert.equal(areaOpts.preferCurrentTab, undefined);
});

test('AreaCropProcessor safely initializes and cleans up in all environments', async () => {
  const processor = new AreaCropProcessor();
  const track = await processor.init(
    new MockMediaStream([new MockTrack('video')]) as unknown as MediaStream,
    { x: 100, y: 100, width: 800, height: 600 },
    30
  );
  // In Node.js environment without DOM, returns null gracefully
  assert.equal(track, null);
  processor.cleanup();
});

test('StudioAudioMixer incorporates voice gain staging and speech compressor', async () => {
  const mixer = new StudioAudioMixer();
  const micTrack = new MockTrack('audio');
  const micStream = new MockMediaStream([micTrack]) as unknown as MediaStream;

  const g = globalThis as Record<string, unknown>;
  const origAudioContext = g.AudioContext;

  let filterCreated = false;
  let gainApplied = 1.0;

  class EnhancedMockAudioContext {
    state = 'running';
    sampleRate = 48000;
    currentTime = 0;
    createMediaStreamDestination() {
      return { stream: new MockMediaStream([new MockTrack('audio')]) };
    }
    createDynamicsCompressor() {
      return {
        threshold: { setValueAtTime: () => {} },
        knee: { setValueAtTime: () => {} },
        ratio: { setValueAtTime: () => {} },
        attack: { setValueAtTime: () => {} },
        release: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: (val: number) => {
            gainApplied = val;
          },
        },
        connect: () => {},
      };
    }
    createBiquadFilter() {
      filterCreated = true;
      return {
        type: 'highpass',
        frequency: { setValueAtTime: () => {} },
        Q: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createMediaStreamSource() {
      return { connect: () => {} };
    }
    close() {
      return Promise.resolve();
    }
  }

  g.AudioContext = EnhancedMockAudioContext;
  try {
    const tracks = await mixer.init({
      micStream,
      micGain: 1.8,
    });
    assert.equal(tracks.length, 1);
    assert.equal(filterCreated, true, '80Hz high-pass filter inserted into voice pipeline');
    assert.equal(gainApplied, 1.8, 'Custom micGain successfully applied');
    mixer.cleanup();
  } finally {
    g.AudioContext = origAudioContext;
  }
});
