import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultSettings,
  mergeAndValidateSettings,
  validateImportedAnnotations,
  validateImportedSettingsJson,
} from './validation';
import {
  DEFAULT_SHORTCUTS,
  detectShortcutConflicts,
  matchesShortcutEvent,
} from '../shortcuts/shortcutManager';

test('validateImportedAnnotations accepts valid bundle and rejects malformed payloads', () => {
  const validJson = JSON.stringify({
    schema: 'proscreen-annotations-v1',
    exportedAt: 1700000000000,
    tabKey: 'tab:1',
    boardMode: 'whiteboard',
    items: [
      {
        id: 'stroke-1',
        category: 'stroke',
        tool: 'pen',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
        color: '#2563EB',
        thickness: 4,
        opacity: 1,
        createdAt: 1700000000000,
      },
    ],
  });

  const valid = validateImportedAnnotations(validJson);
  assert.equal(valid.ok, true);
  assert.equal(valid.data?.items.length, 1);

  const invalidSchema = validateImportedAnnotations(JSON.stringify({ schema: 'wrong', items: [] }));
  assert.equal(invalidSchema.ok, false);

  const badColor = validateImportedAnnotations(
    JSON.stringify({
      schema: 'proscreen-annotations-v1',
      items: [
        {
          id: 'bad',
          category: 'stroke',
          tool: 'pen',
          points: [{ x: 1, y: 1 }],
          color: 'not-a-hex',
          thickness: 4,
          opacity: 1,
          createdAt: 1,
        },
      ],
    })
  );
  assert.equal(badColor.ok, false);
});

test('settings validation merges safely and rejects invalid version', () => {
  const defaults = createDefaultSettings();
  assert.equal(defaults.timer.enabled, false);
  assert.equal(defaults.creator.fadingInkEnabled, false);
  assert.equal(defaults.showTooltips, true);
  const merged = mergeAndValidateSettings({
    theme: 'system',
    accentColor: '#10b981',
    pen: { color: '#ff0000', thickness: 999 },
    timer: { enabled: true, durationMs: 25000, paused: false },
    recording: { mode: 'screen', quality: 'ultra', resolution: '1080p', frameRate: 60 },
  });
  assert.equal(merged.theme, 'system');
  assert.equal(merged.accentColor, '#10B981');
  assert.equal(merged.pen.color, '#FF0000');
  assert.equal(merged.pen.thickness, 48);
  assert.equal(merged.timer.enabled, true);
  assert.equal(merged.timer.durationMs, 25000);
  assert.equal(merged.recording.mode, 'screen');
  assert.equal(merged.recording.frameRate, 60);
  assert.equal(merged.highlighter.color, defaults.highlighter.color);

  const invalid = validateImportedSettingsJson(JSON.stringify({ schemaVersion: 99 }));
  assert.equal(invalid.ok, false);
});

test('shortcut manager detects duplicates and reserved browser conflicts', () => {
  assert.equal(detectShortcutConflicts(DEFAULT_SHORTCUTS).length, 0);

  const modified = DEFAULT_SHORTCUTS.map((s) => ({ ...s }));
  modified[0].keys = 'Ctrl+T';
  modified[1].keys = 'Alt+H'; // duplicates highlighter

  const conflicts = detectShortcutConflicts(modified);
  assert.ok(conflicts.some((c) => c.reason === 'browser-reserved'));
  assert.ok(conflicts.some((c) => c.reason === 'duplicate'));

  assert.equal(
    matchesShortcutEvent(
      { key: 'p', ctrlKey: false, metaKey: false, altKey: true, shiftKey: false },
      'Alt+P'
    ),
    true
  );
});
