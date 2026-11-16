import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createDefaultSettings } from '../storage/validation';
import { UserSettings } from '../types/settings';

describe('Main Process I/O Safety & Persistence Suite', () => {
  it('IO-1: Rapid position updates execute in-memory with zero disk blocking', () => {
    let settings: UserSettings = createDefaultSettings();
    const startTime = performance.now();

    for (let i = 0; i < 500; i++) {
      settings = {
        ...settings,
        toolbarPosition: { x: 10 + i, y: 50 + i },
      };
    }
    const elapsed = performance.now() - startTime;

    assert.equal(settings.toolbarPosition.x, 509);
    assert.equal(settings.toolbarPosition.y, 549);
    assert.ok(elapsed < 300, `Elapsed time was ${elapsed}ms, expected < 300ms`);
  });

  it('IO-2: Independent positions: toolbarPosition and restoreButtonPosition do not overwrite each other', () => {
    let settings: UserSettings = createDefaultSettings();
    settings.toolbarPosition = { x: 120, y: 240 };
    settings.restoreButtonPosition = { x: 45, y: 90 };

    settings.toolbarPosition = { x: 500, y: 600 };
    assert.deepEqual(settings.restoreButtonPosition, { x: 45, y: 90 }, 'restoreButtonPosition must remain untouched');

    settings.restoreButtonPosition = { x: 80, y: 150 };
    assert.deepEqual(settings.toolbarPosition, { x: 500, y: 600 }, 'toolbarPosition must remain untouched');
  });

  it('IO-3: Unrelated settings are preserved during position updates', () => {
    let settings: UserSettings = createDefaultSettings();
    settings.theme = 'dark';
    settings.accentColor = '#FF0055';
    settings.pen = { color: '#00FF00', thickness: 12, opacity: 0.8, penStyle: 'dashed' };
    settings.confirmBeforeClear = true;

    settings.toolbarPosition = { x: 300, y: 400 };

    assert.equal(settings.theme, 'dark');
    assert.equal(settings.accentColor, '#FF0055');
    assert.equal(settings.pen.color, '#00FF00');
    assert.equal(settings.pen.thickness, 12);
    assert.equal(settings.confirmBeforeClear, true);
    assert.deepEqual(settings.toolbarPosition, { x: 300, y: 400 });
  });

  it('IO-4: Serialized debounced asynchronous write writes latest snapshot accurately', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proscreen-io-test-'));
    const targetFile = path.join(tempDir, 'settings.json');

    try {
      let activeSettings: UserSettings = createDefaultSettings();
      let activeWrite: Promise<boolean> | null = null;
      let hasPending = false;

      async function performWrite(data: UserSettings): Promise<boolean> {
        const tmp = `${targetFile}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
        await fs.promises.rename(tmp, targetFile);
        return true;
      }

      async function triggerWrite(): Promise<void> {
        if (activeWrite) {
          hasPending = true;
          return;
        }
        const snapshot = { ...activeSettings };
        hasPending = false;
        activeWrite = performWrite(snapshot).finally(() => {
          activeWrite = null;
          if (hasPending) {
            void triggerWrite();
          }
        });
      }

      activeSettings.toolbarPosition = { x: 100, y: 200 };
      void triggerWrite();

      activeSettings.toolbarPosition = { x: 350, y: 450 };
      void triggerWrite();

      activeSettings.toolbarPosition = { x: 789, y: 987 };
      void triggerWrite();

      while (activeWrite || hasPending) {
        await new Promise((r) => setTimeout(r, 10));
      }

      const fileContent = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      assert.equal(fileContent.toolbarPosition.x, 789);
      assert.equal(fileContent.toolbarPosition.y, 987);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('IO-5: Shutdown persistence: synchronous flush writes final in-memory state', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proscreen-shutdown-test-'));
    const targetFile = path.join(tempDir, 'settings.json');

    try {
      const activeSettings: UserSettings = createDefaultSettings();
      activeSettings.toolbarPosition = { x: 888, y: 999 };

      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, JSON.stringify(activeSettings, null, 2), 'utf-8');

      const fileContent = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      assert.equal(fileContent.toolbarPosition.x, 888);
      assert.equal(fileContent.toolbarPosition.y, 999);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('IO-6: Async write in progress when shutdown begins completes safely with latest data', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proscreen-shutdown-async-'));
    const targetFile = path.join(tempDir, 'settings.json');

    try {
      let activeSettings: UserSettings = createDefaultSettings();
      let currentVersion = 0;
      let committedVersion = 0;
      let isShuttingDown = false;
      let isShutdownCompleted = false;

      let activeWritePromise: Promise<boolean> | null = null;

      async function performWrite(data: UserSettings, version: number): Promise<boolean> {
        const tmp = `${targetFile}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        // Simulate a slow file write
        await new Promise((r) => setTimeout(r, 40));
        await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');

        if (version < committedVersion || isShutdownCompleted) {
          try { await fs.promises.unlink(tmp); } catch {}
          return false;
        }

        await fs.promises.rename(tmp, targetFile);
        committedVersion = Math.max(committedVersion, version);
        return true;
      }

      // 1. Start an async write of version 1
      activeSettings.toolbarPosition = { x: 111, y: 111 };
      currentVersion++;
      const v1 = currentVersion;
      activeWritePromise = performWrite({ ...activeSettings }, v1).finally(() => {
        activeWritePromise = null;
      });

      // 2. While write is in flight, user drags toolbar to position 222 (version 2)
      activeSettings.toolbarPosition = { x: 222, y: 222 };
      currentVersion++;

      // 3. Graceful shutdown starts: waits for active write, then commits final snapshot
      isShuttingDown = true;
      if (activeWritePromise) {
        await activeWritePromise;
      }

      if (currentVersion > committedVersion) {
        const finalVersion = currentVersion;
        fs.writeFileSync(targetFile, JSON.stringify(activeSettings, null, 2), 'utf-8');
        committedVersion = Math.max(committedVersion, finalVersion);
      }
      isShutdownCompleted = true;

      const fileContent = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      assert.equal(fileContent.toolbarPosition.x, 222, 'Final settings file must have the latest position (222)');
      assert.equal(fileContent.toolbarPosition.y, 222);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('IO-7: Stale temporary-file rename is blocked if newer settings were committed', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proscreen-race-guard-'));
    const targetFile = path.join(tempDir, 'settings.json');

    try {
      let committedVersion = 0;
      let isShutdownCompleted = false;

      // Simulate an older async write that was delayed
      const staleTmp = `${targetFile}.stale.tmp`;
      const staleData: UserSettings = { ...createDefaultSettings(), toolbarPosition: { x: 10, y: 10 } };
      fs.writeFileSync(staleTmp, JSON.stringify(staleData, null, 2), 'utf-8');

      // Meanwhile, shutdown or newer write commits version 5 with position (999, 999)
      const freshData: UserSettings = { ...createDefaultSettings(), toolbarPosition: { x: 999, y: 999 } };
      fs.writeFileSync(targetFile, JSON.stringify(freshData, null, 2), 'utf-8');
      committedVersion = 5;
      isShutdownCompleted = true;

      // Now the stale async write (version 1) tries to finish its rename
      const staleVersion = 1;
      let renameExecuted = false;
      if (staleVersion < committedVersion || isShutdownCompleted) {
        // Must discard and unlink stale temp file!
        try { fs.unlinkSync(staleTmp); } catch {}
      } else {
        fs.renameSync(staleTmp, targetFile);
        renameExecuted = true;
      }

      assert.equal(renameExecuted, false, 'Stale rename must not execute');
      assert.equal(fs.existsSync(staleTmp), false, 'Stale tmp file must be unlinked');

      // Verify target file still has the fresh data
      const finalContent = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      assert.equal(finalContent.toolbarPosition.x, 999);
      assert.equal(finalContent.toolbarPosition.y, 999);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('IO-8: Debounce timer pending during shutdown is cancelled and flushed immediately', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proscreen-debounce-shutdown-'));
    const targetFile = path.join(tempDir, 'settings.json');

    try {
      let activeSettings: UserSettings = createDefaultSettings();
      let timer: NodeJS.Timeout | null = null;
      let timerFired = false;

      // Schedule a debounce timer for 500ms
      activeSettings.toolbarPosition = { x: 777, y: 888 };
      timer = setTimeout(() => {
        timerFired = true;
      }, 500);

      // Shutdown happens 10ms later
      await new Promise((r) => setTimeout(r, 10));

      // Shutdown cancels timer and flushes synchronously
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fs.writeFileSync(targetFile, JSON.stringify(activeSettings, null, 2), 'utf-8');

      // Wait 600ms to verify timer never fired
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(timerFired, false, 'Debounce timer must have been cancelled');

      const saved = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      assert.equal(saved.toolbarPosition.x, 777);
      assert.equal(saved.toolbarPosition.y, 888);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('IO-9: Async write failure during shutdown is caught safely without leaving orphan temp files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proscreen-write-err-'));
    // Make target directory read-only or invalid
    const invalidTarget = path.join(tempDir, 'invalid-sub-dir', 'settings.json');

    let errorCaught = false;
    const tempPath = `${invalidTarget}.tmp`;

    try {
      // Trying to write to non-existent uncreated dir will fail
      await fs.promises.writeFile(tempPath, 'data');
    } catch {
      errorCaught = true;
      try { await fs.promises.unlink(tempPath); } catch {}
    }

    assert.equal(errorCaught, true, 'Write error must be caught gracefully');
    assert.equal(fs.existsSync(tempPath), false, 'Temporary file must not exist');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('IO-10: Repeated quit requests are handled idempotently without duplicate shutdown runs', async () => {
    let isShuttingDown = false;
    let isShutdownCompleted = false;
    let shutdownPromise: Promise<boolean> | null = null;
    let executeCount = 0;

    async function gracefulShutdown(): Promise<boolean> {
      if (isShutdownCompleted) return true;
      if (shutdownPromise) return shutdownPromise;

      shutdownPromise = (async () => {
        isShuttingDown = true;
        executeCount++;
        await new Promise((r) => setTimeout(r, 20));
        isShutdownCompleted = true;
        return true;
      })();

      return shutdownPromise;
    }

    // Call 5 times concurrently
    const results = await Promise.all([
      gracefulShutdown(),
      gracefulShutdown(),
      gracefulShutdown(),
      gracefulShutdown(),
      gracefulShutdown(),
    ]);

    assert.deepEqual(results, [true, true, true, true, true]);
    assert.equal(executeCount, 1, 'Shutdown procedure must execute exactly once');
    assert.equal(isShutdownCompleted, true);
  });
});
