# ProScreen v1.0.2 — Known Limitations & Architectural Notes

**Version:** 1.0.2  
**Target Platform:** Windows 10/11 & Chromium Extension  

---

## 1. Operating System Compatibility
- **macOS & Linux Desktop Applications:** ProScreen currently provides native Windows executables (`.exe`). macOS (Metal/ScreenCaptureKit) and Linux (Wayland/PipeWire) native builds are under active development and marked as "Coming Soon". Users on macOS and Linux can use the Manifest V3 Chrome Extension.
- **UIPI (User Interface Privilege Isolation):** Under Windows security architecture, non-elevated applications cannot inject mouse events or draw above processes running with elevated (Administrator) integrity levels (e.g. Task Manager or elevated Command Prompts). To annotate over elevated applications, run ProScreen as Administrator.

## 2. Screen Recording & Hardware Acceleration
- **DirectX 11 / DXGI Desktop Duplication:** High-efficiency 60 FPS recording relies on standard DirectX 11 hardware support. On legacy virtual machines with basic VGA display drivers, hardware-accelerated desktop capture falls back to standard Chromium display capture.
- **Protected Digital Content (DRM):** Video protected by hardware DRM (such as Netflix or protected streaming services in hardware-accelerated browsers) will appear blacked out in accordance with Windows Protected Media Path standards.

## 3. Chrome Extension Architecture
- **Browser Scope:** The Chrome Extension annotates and records web tabs and web pages. It cannot draw on top of external OS windows (e.g., File Explorer, VS Code, or other native applications) due to browser sandbox boundaries. For system-wide drawing, use the native Windows desktop app.
- **Chrome Web Store Status:** The extension package is 100% Manifest V3 compliant and currently distributed as an unpacked production ZIP package awaiting public listing review.
