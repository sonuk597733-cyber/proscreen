# ProScreen v1.0.2 — Windows Installation & Setup Guide

**App:** ProScreen — Professional Screen Annotation Studio  
**Version:** 1.0.2  
**Platform:** Windows 10 & Windows 11 (64-bit)  

---

## 1. Choosing Your Distribution

ProScreen is distributed in two official formats for Windows:

### A. Windows NSIS Setup Installer (`ProScreen-Setup-1.0.2.exe`)
- **Recommended for:** Daily desktop work, educators, presenters, and content creators.
- **Features:** Automatic desktop shortcut, Windows Start Menu entry, clean uninstaller via Windows Settings / Control Panel, and update-ready architecture.
- **Elevation:** Does not require administrator privileges if installed for current user; prompts for UAC only if installing for all machine users.

### B. Windows Standalone Portable (`ProScreen-Portable-1.0.2.exe`)
- **Recommended for:** USB drives, secondary testing, enterprise locked-down PCs, or quick presentations without installation.
- **Features:** Zero installation, leaves zero Windows registry residue, self-contained. Run directly from any folder or removable flash drive.

---

## 2. Step-by-Step Installation

### Installing via Setup Installer
1. Download `ProScreen-Setup-1.0.2.exe` from the official release page or website:  
   `https://sonuk597733-cyber.github.io/proscreen/?p=/download`
2. *(Recommended)* Verify the SHA-256 checksum in PowerShell:
   ```powershell
   Get-FileHash -Path "$HOME\Downloads\ProScreen-Setup-1.0.2.exe" -Algorithm SHA256
   ```
   Confirm that the output matches:
   `9C208855EBB06A6BCB90F2ACF7BD6021D56D626345A67A7098C0F75223D82E1A`
3. Double-click `ProScreen-Setup-1.0.2.exe` to launch the setup wizard.
4. Choose your installation location (default: `%LocalAppData%\Programs\ProScreen`).
5. Complete installation and check "Launch ProScreen".

### Running Portable Version
1. Download `ProScreen-Portable-1.0.2.exe`.
2. Verify checksum:
   ```powershell
   Get-FileHash -Path "$HOME\Downloads\ProScreen-Portable-1.0.2.exe" -Algorithm SHA256
   ```
   Matches:
   `D1F1D4F4D8A00BDCA5B9F29D777CB12010599372477695B4705BA2BB9944E78B`
3. Double-click `ProScreen-Portable-1.0.2.exe` to launch immediately.

---

## 3. Microsoft Defender SmartScreen Notice

On newly released versions that have not yet accumulated telemetry reputation in Microsoft cloud systems, Windows Defender SmartScreen may display:
> *"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."*

**How to proceed safely:**
1. Confirm that the SHA-256 hash verified in PowerShell matches the official published checksum above.
2. Click **"More info"** on the SmartScreen dialog.
3. Verify the application name displays `ProScreen-Setup-1.0.2.exe` (or `ProScreen-Portable-1.0.2.exe`).
4. Click **"Run anyway"**.

---

## 4. Key Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Alt+Shift+P` | Show / Hide Toolbar (Eye ON / Eye OFF) | Global Windows |
| `Alt+V` | Return to Pointer Mode (Pass-Through) | Global Windows |
| `Alt+P` | Pen Drawing Tool | Studio Overlay |
| `Alt+H` | Semi-Transparent Highlighter | Studio Overlay |
| `Alt+T` | Text Tool | Studio Overlay |
| `Alt+A` | Directional Arrow Tool | Studio Overlay |
| `Alt+R` | Rectangle / Shapes Tool | Studio Overlay |
| `Alt+E` | Eraser Tool | Studio Overlay |
| `Alt+Shift+R` | Start / Stop Screen Recording | Global Windows |
| `Alt+Shift+S` | Capture Screenshot | Global Windows |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo Annotation | Studio Overlay |
| `Esc` | Close Active Popouts / Exit Drawing | Studio Overlay |
