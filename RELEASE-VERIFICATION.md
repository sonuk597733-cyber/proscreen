# ProScreen v1.0.2 — Release Verification Report

**Verification Date:** November 17, 2026  
**Environment:** Windows 10/11 x64, Electron 45.3.2, Node.js 25.7.0 / 20.x, Vite 8.3.8  

---

## 1. Test Suite Verification

- **Total Test Suites Executed:** 18
- **Total Unit & Integration Tests:** 206
- **Test Result:** 206 Passed, 0 Failed, 0 Skipped
- **Execution Time:** ~8.5 seconds

### Verified Test Suites:
1. `src/canvas/cursorContrast.test.ts` (4 tests) — High-contrast dual-tone SVG cursors
2. `src/canvas/geometry.test.ts` (7 tests) — Hit testing, arrow math, circle aspect ratio, fading alpha
3. `src/canvas/history.test.ts` (4 tests) — Independent stroke/shape scopes, undo/redo, pruning
4. `src/canvas/timer.test.ts` (5 tests) — Countdown timer, pause, resume, reset, cancel
5. `src/desktop/dropdownPositioning.test.ts` (32 tests) — Edge clamping, 0px bounds shift, popout stability
6. `src/desktop/electronPaths.test.ts` (4 tests) — Desktop HTML targets, icon discovery, fallback resolution
7. `src/desktop/interactionLifecycle.test.ts` (8 tests) — Popout coordinator, Z-order stack, shortcut classification
8. `src/desktop/mainIoSafety.test.ts` (6 tests) — In-memory debouncing, shutdown flush, multi-position safety
9. `src/desktop/mediaUrl.test.ts` (4 tests) — Media URL encoding, range-request resolution, disk path normalization
10. `src/desktop/multiMonitor.test.ts` (7 tests) — DPI scaling, multi-monitor bounds, negative virtual space
11. `src/desktop/startupLifecycle.test.ts` (7 tests) — Chromium switches, display bounds, log formatting
12. `src/desktop/windowSafety.test.ts` (9 tests) — Window destroy checks, IPC sender validation, memory safety
13. `src/overlay/toolbarState.test.ts` (8 tests) — State transitions, Eye ON/OFF, active tool selection
14. `src/recorder/recordingPreviewModal.test.ts` (14 tests) — All 14 preview modal controls functional
15. `src/recorder/screenRecorder.test.ts` (28 tests) — 4 recording modes, dual audio, error classification, duration injection
16. `src/storage/validation.test.ts` (4 tests) — Settings migration, schema validation, boundary capping
17. `src/utils/color.test.ts` (3 tests) — 24 presets, HEX/RGB round-trip, deduplication
18. `src/website/releaseHelpers.test.ts` (6 tests) — Dynamic release parsing, GitHub URL validation, hash formatters

---

## 2. Build Verification

| Target | Build Tool | Output | Result |
| :--- | :--- | :--- | :--- |
| TypeScript Typecheck | `tsc --noEmit` | Clean type validation | **PASS (0 errors)** |
| Official Website | `npm run build:website` | `dist-website/` | **PASS (4.90s)** |
| Electron & Extension | `npm run build` | `dist/` | **PASS (6.20s)** |
| Chrome Extension ZIP | `node scripts/package-extension.js` | `release/ProScreen-Chrome-Extension-1.0.2.zip` | **PASS (2.1 MB)** |
| Windows NSIS Installer | `electron-builder --win (nsis)` | `release/ProScreen-Setup-1.0.2.exe` | **PASS (133.8 MB)** |
| Windows Portable Executable | `electron-builder --win (portable)` | `release/ProScreen-Portable-1.0.2.exe` | **PASS (119.5 MB)** |

---

## 3. Cryptographic Asset Verification (Official GitHub Release Assets)

```powershell
Get-FileHash -Path release\ProScreen-Setup-1.0.2.exe, release\ProScreen-Portable-1.0.2.exe, release\ProScreen-Chrome-Extension-1.0.2.zip -Algorithm SHA256 | Format-List Path, Hash
```

- **Installer (`ProScreen-Setup-1.0.2.exe`):**  
  Size: 140,351,351 bytes  
  SHA-256: `A4A965C9E486B3A91259B0D46891C20A9A941143E1D0DABC0A41177B5005B2F2`

- **Portable (`ProScreen-Portable-1.0.2.exe`):**  
  Size: 125,316,228 bytes  
  SHA-256: `6A610B473B5D711EE4F6319BE46F0877167C8A01AEC1785635F5A929EACD5F64`

- **Extension ZIP (`ProScreen-Chrome-Extension-1.0.2.zip`):**  
  Size: 2,194,945 bytes  
  SHA-256: `2CBC16A2D37DCAB6667290BDB2F48A1F688FC030DE9782C16B5DEA609EFB33FF`

- **Release Manifest (`release-manifest.json`):**  
  Size: 758 bytes

---

## 4. Protected Invariants

- `src/canvas/timer.ts`: **0 diff verified** (Strict Invariant maintained).
- `contextIsolation`: Enabled across all renderer windows.
- `nodeIntegration`: Disabled in all web preferences.
