# ProScreen v1.0.2 — Official Production Release Changelog

**Release Date:** November 17, 2026  
**Status:** Production Stable (v1.0.2)  
**Target OS:** Windows 10 & Windows 11 (64-bit)  
**Browser Support:** Chromium 116+ (Chrome, Edge, Brave, Opera, Vivaldi)  

---

## Executive Overview

ProScreen v1.0.2 is the official production release of the ProScreen Windows Desktop Application and Chrome Screen Annotation Studio. This milestone brings a complete visual overhaul of the web platform to pure white mode matching [Epic Pen Pro](https://epicpen.com/pro), eliminates video freezing and stuttering via DXGI GPU acceleration and duration metadata injection, restores all 14 controls of the Recording Preview Modal, and hardens the Windows multi-monitor startup lifecycle.

---

## Key Highlights

### 1. Recording Engine & Zero-Stutter Playback
- **DXGI Desktop Duplication 60 FPS Capture:** Hardware-accelerated desktop video frame capture with zero dropped frames on Intel/AMD GPUs under Windows 10 and 11.
- **Duration Metadata Injection:** Injected accurate header metadata into recorded WebM and MP4 files, resolving infinite duration errors, timeline seek freezes, and unseekable video streams.
- **High-Performance Media Protocol:** Custom `proscreen-media://local/` streaming protocol with HTTP range-request support for instant video preview playback.
- **Dual-Channel Studio Audio Mixer:** System audio loopback mixed with microphone capture at 48 kHz, voice gain staging, high-pass rumble filter, and brickwall peak limiter.

### 2. Complete Recording Preview Modal Functionality
- **14 Verified Controls:** All 14 preview modal controls have been tested and verified:
  1. Play / Pause
  2. Timeline Seek Slider
  3. Replay from 0:00
  4. -5 Seconds Step
  5. +5 Seconds Step
  6. Playback Speed Selector (0.5x, 1x, 1.25x, 1.5x, 2x)
  7. Volume & Mute Toggle
  8. Fullscreen Toggle
  9. Open in Native OS Player (`desktop.openPath`)
  10. Open Folder in Explorer (`desktop.showItemInFolder`)
  11. Discard Recording (with confirmation and blob revocation)
  12. Done / Keep Recording
  13. Save As (custom folder selection dialog)
  14. Close Modal (preserving saved video file)

### 3. Epic Pen Pro-Inspired Website Rebuild
- **Pure White Mode:** Eradicated dark navy backgrounds, glowing blobs, and neon glassmorphism in favor of crisp `#ffffff` / `#f9fafb` surfaces with `#0f172a` typography and royal blue `#2563eb` accents.
- **Alternating Storytelling Rows:** 6 alternating two-column feature showcases with real application window frames and checkmark spec lists.
- **Transparent Pricing:** Clean single-card pricing detailing "First 6 Months Free ($0)", then $1/month with zero upfront credit card requirement.
- **Live Dynamic Asset Sync:** Real-time GitHub Releases API hydration via `useLatestReleases` hook.

### 4. Desktop Architecture & Lifecycle Hardening
- **Modular Refactoring:** Extracted and unit-tested `startupLifecycle`, `interactionLifecycle`, `electronPaths`, and `mediaUrl`.
- **Z-Order Management:** Clean `applyDesktopWindowZOrder` hierarchy ensuring overlay stays strictly behind toolbars and modal dialogs.
- **Right-Edge Stability:** Permanent anchoring eliminating toolbar-popout bounds jitter on display boundaries.
- **AppUserModelID:** Native Windows taskbar pinning and notification identity `com.proscreen.annotationstudio`.

---

## Distributed Release Binaries

| Asset | Type | Size | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| `ProScreen-Setup-1.0.2.exe` | Windows NSIS Setup Installer | 133.8 MB | `9C208855EBB06A6BCB90F2ACF7BD6021D56D626345A67A7098C0F75223D82E1A` |
| `ProScreen-Portable-1.0.2.exe` | Standalone Portable EXE | 119.5 MB | `D1F1D4F4D8A00BDCA5B9F29D777CB12010599372477695B4705BA2BB9944E78B` |
| `ProScreen-Chrome-Extension-1.0.2.zip` | Manifest V3 Extension | 2.1 MB | `2A96BF8A2A956ED1FF0B835DF1EAB67EE93DECB31580D079E340C5B8FEE2A551` |
