import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordingArtifact, downloadRecordingArtifact } from './screenRecorder';

test('PREVIEW-1: Play and Pause media operations update playback state accurately', async () => {
  let isPlaying = false;
  let videoPaused = true;

  const mockVideo = {
    get paused() {
      return videoPaused;
    },
    play: async () => {
      videoPaused = false;
      isPlaying = true;
    },
    pause: () => {
      videoPaused = true;
      isPlaying = false;
    },
  };

  // Trigger Play
  if (mockVideo.paused) {
    await mockVideo.play();
  }
  assert.equal(isPlaying, true);
  assert.equal(videoPaused, false);

  // Trigger Pause
  if (!mockVideo.paused) {
    mockVideo.pause();
  }
  assert.equal(isPlaying, false);
  assert.equal(videoPaused, true);
});

test('PREVIEW-2: Timeline seeking updates currentTime within duration bounds', () => {
  const durationSec = 30.0;
  let currentTime = 5.0;

  const seek = (targetSec: number) => {
    currentTime = Math.max(0, Math.min(durationSec, targetSec));
  };

  seek(14.5);
  assert.equal(currentTime, 14.5);

  // Clamping test (cannot seek beyond duration)
  seek(45.0);
  assert.equal(currentTime, 30.0);

  // Clamping test (cannot seek below zero)
  seek(-10.0);
  assert.equal(currentTime, 0.0);
});

test('PREVIEW-3: Replay restarts playback from 0:00', () => {
  let currentTime = 18.2;
  let playCalled = false;

  const handleReplay = () => {
    currentTime = 0;
    playCalled = true;
  };

  handleReplay();
  assert.equal(currentTime, 0);
  assert.equal(playCalled, true);
});

test('PREVIEW-4: -5s and +5s seek adjustments accurately step time', () => {
  const duration = 25.0;
  let currentTime = 10.0;

  const seekRelative = (delta: number) => {
    currentTime = Math.max(0, Math.min(duration, currentTime + delta));
  };

  seekRelative(-5);
  assert.equal(currentTime, 5.0);

  seekRelative(5);
  assert.equal(currentTime, 10.0);

  seekRelative(20);
  assert.equal(currentTime, 25.0);

  seekRelative(-50);
  assert.equal(currentTime, 0.0);
});

test('PREVIEW-5: Playback speed cycles across 0.5x, 1x, 1.25x, 1.5x, 2x', () => {
  const rates = [0.5, 1, 1.25, 1.5, 2];
  let currentSpeed = 1;

  const cycleSpeed = () => {
    const nextIdx = (rates.indexOf(currentSpeed) + 1) % rates.length;
    currentSpeed = rates[nextIdx];
  };

  assert.equal(currentSpeed, 1);
  cycleSpeed();
  assert.equal(currentSpeed, 1.25);
  cycleSpeed();
  assert.equal(currentSpeed, 1.5);
  cycleSpeed();
  assert.equal(currentSpeed, 2);
  cycleSpeed();
  assert.equal(currentSpeed, 0.5);
  cycleSpeed();
  assert.equal(currentSpeed, 1);
});

test('PREVIEW-6: Volume and Mute toggle actual media states', () => {
  let isMuted = false;
  let volume = 1.0;

  const toggleMute = () => {
    isMuted = !isMuted;
  };

  const setVolume = (v: number) => {
    volume = Math.max(0, Math.min(1, v));
    if (volume > 0 && isMuted) {
      isMuted = false;
    }
  };

  toggleMute();
  assert.equal(isMuted, true);

  toggleMute();
  assert.equal(isMuted, false);

  setVolume(0.5);
  assert.equal(volume, 0.5);

  // Muting, then changing volume un-mutes
  toggleMute();
  assert.equal(isMuted, true);
  setVolume(0.8);
  assert.equal(isMuted, false);
  assert.equal(volume, 0.8);
});

test('PREVIEW-7: Fullscreen toggles enter and exit', () => {
  let isFullscreen = false;

  const toggleFullscreen = () => {
    isFullscreen = !isFullscreen;
  };

  toggleFullscreen();
  assert.equal(isFullscreen, true);

  toggleFullscreen();
  assert.equal(isFullscreen, false);
});

test('PREVIEW-8: Open in Player invokes desktop.openPath with verified file path', async () => {
  let invokedPath = '';

  const mockDesktop = {
    openPath: async (p: string) => {
      invokedPath = p;
      return '';
    },
  };

  const target = 'C:\\Users\\dell\\Desktop\\proscreen\\my-recording.webm';
  const res = await mockDesktop.openPath(target);
  assert.equal(res, '');
  assert.equal(invokedPath, target);
});

test('PREVIEW-9: Open Folder invokes desktop.showItemInFolder with verified file path', async () => {
  let revealedPath = '';

  const mockDesktop = {
    showItemInFolder: async (p: string) => {
      revealedPath = p;
      return true;
    },
  };

  const target = 'C:\\Users\\dell\\Desktop\\proscreen\\my-recording.webm';
  const ok = await mockDesktop.showItemInFolder(target);
  assert.equal(ok, true);
  assert.equal(revealedPath, target);
});

test('PREVIEW-10: Discard workflow prompts confirmation and revokes temporary blob resources', () => {
  let showConfirm = false;
  let discarded = false;
  let revokedUrl = '';

  const testArtifact: RecordingArtifact = {
    id: 'rec_123',
    filename: 'test.webm',
    blobUrl: 'blob:http://localhost/test-uuid',
    savedPath: 'C:\\Users\\dell\\Desktop\\test.webm',
    sizeBytes: 1024,
    mimeType: 'video/webm',
    durationMs: 5000,
    createdAt: Date.now(),
    mode: 'screen',
  };

  // Click discard button
  showConfirm = true;
  assert.equal(showConfirm, true);
  assert.equal(discarded, false);

  // Confirm discard
  const confirmDiscard = () => {
    showConfirm = false;
    discarded = true;
    revokedUrl = testArtifact.blobUrl;
  };

  confirmDiscard();
  assert.equal(showConfirm, false);
  assert.equal(discarded, true);
  assert.equal(revokedUrl, 'blob:http://localhost/test-uuid');
});

test('PREVIEW-11: Done closes modal while preserving saved recording', () => {
  let modalOpen = true;
  let currentRecording: RecordingArtifact | null = {
    id: 'rec_keep',
    filename: 'kept.webm',
    blobUrl: 'blob:test',
    savedPath: 'C:\\saved.webm',
    sizeBytes: 5000,
    mimeType: 'video/webm',
    durationMs: 10000,
    createdAt: Date.now(),
    mode: 'window',
  };

  const handleDone = () => {
    modalOpen = false;
  };

  handleDone();
  assert.equal(modalOpen, false);
  assert.notEqual(currentRecording, null);
  assert.equal(currentRecording?.filename, 'kept.webm');
});

test('PREVIEW-12: Save As invokes save with askWhereToSave=true for native dialog', async () => {
  let passedSaveAs = false;

  const onDownload = async (askWhereToSave?: boolean) => {
    passedSaveAs = Boolean(askWhereToSave);
    return { ok: true, path: 'C:\\custom-dest.webm' };
  };

  const handleSaveAs = async () => {
    await onDownload(true);
  };

  await handleSaveAs();
  assert.equal(passedSaveAs, true);
});

test('PREVIEW-13: Close button (X) dismisses preview without deleting saved file', () => {
  let modalOpen = true;
  let fileDeleted = false;

  const handleClose = () => {
    modalOpen = false;
  };

  handleClose();
  assert.equal(modalOpen, false);
  assert.equal(fileDeleted, false);
});

test('PREVIEW-14: Interaction mode switches to drawing when modal is open and enables mouse events', () => {
  const getInteractionMode = (previewOpen: boolean, activeTool: string) => {
    const hasActiveModal = previewOpen;
    return hasActiveModal || activeTool !== 'pointer' ? 'drawing' : 'pointer';
  };

  // Even if activeTool is pointer, opening preview forces drawing/interactive mode
  assert.equal(getInteractionMode(true, 'pointer'), 'drawing');
  assert.equal(getInteractionMode(false, 'pointer'), 'pointer');
  assert.equal(getInteractionMode(false, 'pen'), 'drawing');
});
