# ProScreen — Professional Windows Desktop & Chrome Screen Annotation Studio

ProScreen is a screen annotation application inspired by Epic Pen, providing both a native **Windows Desktop Application** and a **Manifest V3 Chrome Extension**. It enables presenters, educators, developers, and creators to draw, annotate, highlight, and explain directly over any Windows desktop application or website.

---

## 1. Distribution & Downloads

Both standalone Windows executables and the Chrome Extension are ready:

| Distribution | Location | Description |
|---|---|---|
| **Windows Installer** | [`release/ProScreen-Setup-1.0.0.exe`](release/ProScreen-Setup-1.0.0.exe) | Standard Windows NSIS installer with Desktop shortcut, Start Menu integration, and clean uninstaller. |
| **Windows Portable** | [`release/ProScreen-Portable-1.0.0.exe`](release/ProScreen-Portable-1.0.0.exe) | Single standalone `.exe` requiring zero installation. Run directly from any folder or USB drive. |
| **Unpacked Desktop App** | [`release/win-unpacked/ProScreen.exe`](release/win-unpacked/ProScreen.exe) | Direct executable binary for immediate testing without extraction. |
| **Chrome Extension** | [`dist/`](dist/) | Manifest V3 production bundle ready for loading into Google Chrome, Microsoft Edge, and Brave. |

---

## 2. Installation & Quick Start

### A. Windows Desktop Application

#### Option 1: Installer (`ProScreen-Setup-1.0.0.exe`)
1. Double-click `release/ProScreen-Setup-1.0.0.exe`.
2. Choose your destination directory and finish the setup.
3. Launch **ProScreen** from your Desktop shortcut or Start Menu.
4. To uninstall, run `Uninstall ProScreen.exe` from the installation folder or via Windows Settings → Installed apps.

#### Option 2: Portable (`ProScreen-Portable-1.0.0.exe`)
1. Copy `release/ProScreen-Portable-1.0.0.exe` to any folder (e.g., Desktop or USB drive).
2. Double-click to launch immediately. No dependencies or installation required.

---

### B. Chrome Extension (`dist/`)

1. Open Google Chrome (or any Chromium browser: Edge, Brave, Opera).
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. Select the `dist/` directory located at `C:\Users\dell\Desktop\proscreen\dist`.
6. Pin **ProScreen** from the Chrome extension puzzle menu.
7. Open any standard website (Google, YouTube, Wikipedia, GitHub, etc.) to start annotating.

---

## 3. Core Workflow & Features

### 1. Pointer Mode (Default Pass-Through)
- **Pointer is the default mode.**
- In Pointer mode, clicks, text selection, and mouse scrolling pass through directly to underlying applications (Excel, PowerPoint, Word, VS Code, File Explorer, browsers).
- No invisible overlay ever blocks your mouse.
- To switch to Pointer mode at any time, click the Pointer icon or press **Alt+V**.

### 2. Eye OFF / Eye ON — Epic Pen Style with Floating Restore Button
- **Eye ON (Normal Mode):**
  - Full floating toolbar is visible.
  - All tools and panels are accessible.
  - All drawings, text, arrows, and shapes are visible.
  - The floating Eye restore button is hidden.
- **Eye OFF (Collapsed Mode):**
  - Click the **Eye button** on the toolbar (or press **Alt+Shift+P**).
  - The toolbar and tool panels hide completely.
  - **All existing annotations remain visible on screen.**
  - **Only one small, sleek floating Eye restore button is displayed.**
  - The floating Eye button can be dragged anywhere on your screen. Its position is saved automatically.
  - Zero mouse interception occurs outside the small button area.
- **Restore Tools:**
  - Click the small floating Eye button.
  - The complete toolbar returns in its previous position.
  - The small restore button disappears.
- **Delete Behavior:**
  - If you manually delete an annotation (using Eraser, Delete Selected, or Clear Screen), it stays permanently deleted.
  - Toggling Eye OFF and Eye ON preserves only the active annotation data. Deleted work is never resurrected.

### 3. Annotation Tools
- **Pen:** Smooth freehand drawing with adjustable color, thickness, and styles (solid, dashed, calligraphy).
- **Highlighter:** Semi-transparent blending highlighter (normal and chisel styles).
- **Text:** Click anywhere to create editable text boxes. Move, edit font size, change color, and delete text.
- **Arrow:** Click and drag to create sharp arrows or double-headed arrows.
- **Geometric Shapes:** Rectangle, rounded rectangle, circle, line, and ellipse with fill options.
- **Eraser:** Point-and-click or drag-to-erase annotations with customizable eraser radius.
- **Undo / Redo:** Full chronological history stack and independent stroke/shape history scopes.
- **Color Picker:** 32 color presets, custom RGB/HEX picker, and recent/favorite color palettes.

### 4. Whiteboard & Blackboard Modes
- Instant fullscreen canvas for lectures, brainstorming, and wireframing.
- Background styles: Whiteboard, Blackboard, Grid Paper, and Ruled Notebook.
- Add multiple whiteboard pages, navigate pages, and export high-resolution PNG snapshots.

### 5. Screenshot & Screen Recording
- **Screenshot:** Capture the full screen or drag an area selection. Copy directly to clipboard or save as PNG.
- **Screen Recording:** Real in-browser / desktop screen capture using `MediaRecorder`. Floating recording status bar with duration timer, pause/resume, and direct save dialog.

---

## 4. Keyboard Shortcuts

| Shortcut | Scope | Action |
|---|---|---|
| **Alt+Shift+P** | Global OS & Extension | Show / Hide Toolbar (Eye ON / Eye OFF) |
| **Alt+V** | Global OS & Extension | Return to Pointer Mode (Pass-Through) |
| **Alt+Shift+S** | Global OS & Extension | Capture Screenshot |
| **Alt+Shift+X** | Global OS & Extension | Clear All Annotations (with confirmation option) |
| **Alt+Shift+R** | Global OS & Extension | Start / Stop Screen Recording |
| **Alt+P** | Studio / Toolbar | Select Pen Tool |
| **Alt+H** | Studio / Toolbar | Select Highlighter Tool |
| **Alt+T** | Studio / Toolbar | Select Text Tool |
| **Alt+A** | Studio / Toolbar | Select Arrow Tool |
| **Alt+R** | Studio / Toolbar | Select Rectangle Tool |
| **Alt+E** | Studio / Toolbar | Select Eraser Tool |
| **Alt+W** | Studio / Toolbar | Switch to Whiteboard Mode |
| **Alt+B** | Studio / Toolbar | Switch to Blackboard Mode |
| **Ctrl+Z** | Studio / Toolbar | Undo Last Annotation |
| **Ctrl+Y** | Studio / Toolbar | Redo Last Annotation |

---

## 5. Security & Architecture Specifications

### Electron Architecture
- `contextIsolation: true`
- `nodeIntegration: false`
- Strictly validated IPC via secure preload bridge (`window.proscreenDesktop`).
- Native mouse event pass-through via `win.setIgnoreMouseEvents(true, { forward: true })`.
- Multi-monitor virtual bounds calculation supporting primary, secondary (negative X/Y), and mixed-DPI displays.
- Single-instance lock to prevent duplicate application instances.

### Chrome Extension Architecture
- Manifest V3 compliant.
- Styles inlined via build-time injection (`__PROSCREEN_INLINE_CSS__`) directly into Shadow DOM to bypass host-page Content Security Policy (CSP) headers on strict sites (e.g., GitHub, Google, YouTube, Wikipedia, ChatGPT).
- Single overlay host guard with MutationObserver re-attachment for Single-Page Applications (SPAs).

---

## 6. Known Limitations & Troubleshooting

1. **Internal Chrome Pages (`chrome://`):**
   - *Behavior:* Chrome extensions cannot inject content scripts into internal browser pages (`chrome://extensions`, `chrome://settings`) or the Chrome Web Store due to browser security restrictions.
   - *Fix:* Use the **Windows Desktop Application** (`ProScreen-Setup-1.0.0.exe` or `ProScreen-Portable-1.0.0.exe`) when you need to annotate over Chrome internal tabs, desktop apps, or system windows.
2. **Elevated Windows Apps (Administrator / UAC):**
   - *Behavior:* When drawing over Windows applications running with elevated Administrator privileges, Windows UIPI (User Interface Privilege Isolation) may prevent mouse interaction from non-elevated overlays.
   - *Fix:* Run ProScreen as Administrator if you need to annotate over elevated software (such as Task Manager or Administrator Command Prompts).
3. **Multi-Monitor Coordinate Changes:**
   - *Behavior:* When plugging or unplugging an external monitor, windows may shift positions.
   - *Fix:* ProScreen automatically listens to Windows display events (`screen.on('display-metrics-changed')`) and recalculates virtual bounds, automatically clamping the toolbar inside the nearest visible monitor.

---

## 7. Official Commercial Website

The production-ready official website for ProScreen is built with React 19, Tailwind CSS v4, Lucide icons, and zero-telemetry architecture:

### Pages & Routes
- **Home (`/` or `#/home`):** Cinematic hero ("Your Screen. Your Canvas."), Bento feature grid, interactive live preview, workflow showcases, and compatibility comparison.
- **Features (`#/features`):** Deep architectural breakdown of all 11 implemented tools, stroke physics, and interactive keyboard shortcuts cheatsheet.
- **Windows Download (`#/download`):** Official Download Center for `ProScreen-Setup-1.0.0.exe` (132.7 MB) and `ProScreen-Portable-1.0.0.exe` (118.4 MB) with verified SHA-256 hashes and installation guides.
- **Chrome Extension (`#/chrome-extension`):** Manifest V3 extension page, "Coming Soon" Chrome Web Store status, and 30-second unpacked developer build installation guide.
- **Product Gallery (`#/gallery`):** High-definition interface previews of Desktop Overlay, Eye OFF floating restore button, Whiteboard, Blackboard, Area Screenshot, and Recording HUD.
- **Changelog (`#/changelog`):** Full official v1.0.0 release notes.
- **FAQ (`#/faq`):** Searchable knowledge base categorized by General, Windows, Chrome Extension, Shortcuts, Troubleshooting, and Security.
- **Support & Diagnostics (`#/support`):** Real-time client diagnostics (browser, OS, DPI, WebGL, MediaRecorder) and troubleshooting decision trees.
- **Privacy Policy (`#/privacy`):** 100% local processing and zero telemetry commitment.
- **Terms & Conditions (`#/terms`):** Software licensing and commercial usage agreement.
- **Interactive Studio (`#/playground`):** Live in-browser annotation sandbox powered by the real ProScreen engine.

### Running & Building the Website
```bash
# Run local development server
npm run dev

# Run production build
npm run build

# Preview production build
npm run preview

# Verify all quality controls
npx tsx scripts/verify-website.ts
```
