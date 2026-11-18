import test from 'node:test';
import assert from 'node:assert/strict';
import { StrokeAnnotation } from '../types/annotation';
import {
  cancelAnnotationTimers,
  createDefaultTimerSettings,
  formatCountdownMs,
  getActiveTimerCountdownMs,
  isAnnotationExpired,
  pauseAnnotationTimers,
  resetAnnotationTimers,
  resumeAnnotationTimers,
  stampAnnotationWithTimer,
} from './timer';

function makeStroke(id: string, createdAt = 1000): StrokeAnnotation {
  return {
    id,
    category: 'stroke',
    tool: 'pen',
    points: [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ],
    color: '#2563EB',
    thickness: 4,
    opacity: 1,
    createdAt,
  };
}

test('Timer defaults to OFF and annotations stamped with timer OFF never expire', () => {
  const timer = createDefaultTimerSettings();
  assert.equal(timer.enabled, false);
  const s = stampAnnotationWithTimer(makeStroke('a', 1000), timer, 1000);
  assert.equal(s.expiresAt, null);
  assert.equal(isAnnotationExpired(s, 10_000_000), false);
});

test('Timer ON schedules only newly created annotations and expires them at deadline', () => {
  const oldPermanent = stampAnnotationWithTimer(makeStroke('old', 500), createDefaultTimerSettings(), 500);
  const timer = { enabled: true, durationMs: 5000, paused: false, showInRecording: false };
  const timed = stampAnnotationWithTimer(makeStroke('new', 1000), timer, 1000);

  assert.equal(timed.expiresAt, 6000);
  assert.equal(isAnnotationExpired(oldPermanent, 10_000), false);
  assert.equal(isAnnotationExpired(timed, 5999), false);
  assert.equal(isAnnotationExpired(timed, 6000), true);
});

test('Pause freezes remaining ms and resume shifts expiresAt cleanly', () => {
  const timer = { enabled: true, durationMs: 10_000, paused: false, showInRecording: false };
  const s = stampAnnotationWithTimer(makeStroke('p1', 1000), timer, 1000);

  const paused = pauseAnnotationTimers([s], 4000);
  assert.equal(paused[0].expiresAt, null);
  assert.equal(paused[0].pausedRemainingMs, 7000);
  assert.equal(isAnnotationExpired(paused[0], 99_000), false);

  const resumed = resumeAnnotationTimers(paused, 20_000);
  assert.equal(resumed[0].expiresAt, 27_000);
  assert.equal(isAnnotationExpired(resumed[0], 26_999), false);
  assert.equal(isAnnotationExpired(resumed[0], 27_000), true);
});

test('Reset updates timed items only; Cancel disarms pending expiration without deleting items', () => {
  const perm = makeStroke('perm', 100);
  const timed = stampAnnotationWithTimer(
    makeStroke('timed', 1000),
    { enabled: true, durationMs: 5000, paused: false, showInRecording: false },
    1000
  );

  const reset = resetAnnotationTimers([perm, timed], 12_000, false, 3000);
  assert.equal(reset[0].expiresAt, undefined);
  assert.equal(reset[1].expiresAt, 15_000);

  const cancelled = cancelAnnotationTimers(reset);
  assert.equal(cancelled[1].expiresAt, null);
  assert.equal(isAnnotationExpired(cancelled[1], 100_000), false);
});

test('Countdown formatting & active countdown calculation work as expected', () => {
  const timer = { enabled: true, durationMs: 15_000, paused: false, showInRecording: false };
  const s1 = stampAnnotationWithTimer(makeStroke('s1', 1000), timer, 1000);
  const s2 = stampAnnotationWithTimer(makeStroke('s2', 5000), timer, 5000);
  const rem = getActiveTimerCountdownMs([s1, s2], timer, 10_000);
  assert.equal(rem, 6000);
  assert.equal(formatCountdownMs(6000), '6s');
  assert.equal(formatCountdownMs(125_000), '2:05');
});
