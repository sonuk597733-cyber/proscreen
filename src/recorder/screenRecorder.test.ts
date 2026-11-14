import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ProScreenRecorder,
  buildDisplayMediaOptions,
  classifyCaptureError,
  downloadRecordingArtifact,
  formatByteSize,
  formatRecordingDuration,
  getBitrateForQuality,
  getExtensionForMimeType,
  getResolutionBounds,
  validatePreRecordingStream,
} from './screenRecorder';
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
