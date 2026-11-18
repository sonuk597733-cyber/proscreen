import { ReleaseAsset, FeatureItem, FaqItem, ChangelogRelease } from './types';

// GitHub Release Distribution Configuration
export const GITHUB_USERNAME = (import.meta as any).env?.VITE_GITHUB_USERNAME || 'sonuk597733-cyber';
export const GITHUB_REPO = (import.meta as any).env?.VITE_GITHUB_REPO || `${GITHUB_USERNAME}/proscreen`;
export const RELEASE_VERSION = '1.0.3';
export const RELEASE_TAG = `v${RELEASE_VERSION}`;
export const RELEASE_MANIFEST_URL = `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/release-manifest.json`;

export const getReleaseDownloadUrl = (fileName: string): string => {
  // If running locally, serve from local /downloads/ folder; in production or GitHub Pages, route to GitHub Releases
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return `/downloads/${fileName}`;
    }
  }
  return `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${fileName}`;
};

export const OFFICIAL_RELEASES: {
  installer: ReleaseAsset;
  portable: ReleaseAsset;
  extensionZip: ReleaseAsset;
} = {
  installer: {
    fileName: 'ProScreen-Setup-1.0.3.exe',
    version: RELEASE_VERSION,
    sizeBytes: 140350424,
    sizeFormatted: '133.8 MB',
    sha256: 'CD2EE7DCEDFCEA3F5C029CAD906798CFC6A41116901CB4DC86746D170C784713',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/ProScreen-Setup-1.0.3.exe`,
    releaseDate: 'November 2026',
    targetOS: 'Windows 10 / Windows 11 (64-bit)',
    architecture: 'x64 (Intel / AMD)',
    type: 'installer',
    description:
      'Standard Windows NSIS installer with automatic desktop shortcut, start menu entry, and clean uninstaller.',
    highlights: [
      'Full desktop shortcut and Start Menu integration',
      'Clean Windows uninstaller via Settings & Control Panel',
      'Automatic update-safe directory layout',
      'Per-user or system-wide installation support',
    ],
  },
  portable: {
    fileName: 'ProScreen-Portable-1.0.3.exe',
    version: RELEASE_VERSION,
    sizeBytes: 125325365,
    sizeFormatted: '119.5 MB',
    sha256: '1BACE4962CB9AFDF47AC578EE5DE5B865F1428DA440B0D7913D7E33875C4C0B7',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/ProScreen-Portable-1.0.3.exe`,
    releaseDate: 'November 2026',
    targetOS: 'Windows 10 / Windows 11 (64-bit)',
    architecture: 'x64 (Intel / AMD)',
    type: 'portable',
    description:
      'Self-contained single executable. Zero installation required. Run directly from any folder or USB drive.',
    highlights: [
      'Zero installation or administrative privileges needed',
      'Ideal for USB drives and restricted enterprise PCs',
      'Leaves zero registry residue on your system',
      'Same native zero-latency overlay and hotkeys',
    ],
  },
  extensionZip: {
    fileName: 'ProScreen-Chrome-Extension-1.0.3.zip',
    version: RELEASE_VERSION,
    sizeBytes: 2207341,
    sizeFormatted: '2.1 MB',
    sha256: 'EAFB7A568A4C28278DD537B1F19B07EA7457C71E77F7C3B891D656DB7C55F4E4',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/ProScreen-Chrome-Extension-1.0.3.zip`,
    releaseDate: 'November 2026',
    targetOS: 'Chromium Browsers (Chrome, Edge, Brave, Opera, Vivaldi)',
    architecture: 'Universal Manifest V3',
    type: 'portable' as const,
    description:
      'Production Manifest V3 extension package ready to load unpacked or distribute.',
    highlights: [
      'Universal support across all Chromium v116+ browsers',
      'Zero native installation needed — load directly in Developer mode',
      'Shadow DOM encapsulated styles with CSP bypass architecture',
      'Per-tab isolated drawing layers and screen recorder',
    ],
  },
};

export const IMPLEMENTED_FEATURES: FeatureItem[] = [
  {
    id: 'pen-highlighter',
    title: 'Pen & Highlighter',
    shortDesc: 'Ultra-smooth freehand drawing and semi-transparent chisel highlighters.',
    fullDesc:
      'Engineered with Bezier path interpolation for buttery smooth ink strokes at native monitor refresh rates. Switch between solid ink, calligraphy, and chisel highlighters that blend cleanly over text, IDE code, and slides without obscuring details.',
    category: 'tools',
    shortcut: 'Alt+P / Alt+H',
    badge: 'Hardware Accelerated',
    specs: ['Adjustable stroke width (1px - 48px)', '32 curated color presets & custom HEX/RGB', 'Calligraphy & chisel nib styles', 'Zero-jitter Bezier smoothing'],
    icon: 'PenTool',
  },
  {
    id: 'text-shapes',
    title: 'Text & Geometric Shapes',
    shortDesc: 'Crisp typography and auto-aligning geometric shapes.',
    fullDesc:
      'Click anywhere to place editable text boxes with instant font-size scaling and custom color fills. Draw rectangles, rounded rectangles, perfect circles, ellipses, and bordered boxes with outline or solid fill modes.',
    category: 'tools',
    shortcut: 'Alt+T / Alt+R',
    specs: ['Dynamic text box resize and auto-wrap', 'Proportional 1:1 circle constraint (Shift key)', 'Configurable corner radius on rounded rectangles', 'Solid, subtle tint, or outline fill styles'],
    icon: 'Type',
  },
  {
    id: 'arrow-line',
    title: 'Arrow & Line Tools',
    shortDesc: 'Sharp directional callouts and double-headed vectors.',
    fullDesc:
      'Call attention to specific UI elements, code lines, or chart anomalies with arrow tools. Features 45-degree angle snapping, symmetrical arrowhead geometry, and double-headed indicators for length/interval notation.',
    category: 'tools',
    shortcut: 'Alt+A',
    specs: ['Symmetrical vector arrowheads', 'Double-headed arrows for range notation', '45° angle snapping for clean diagrams', 'Direct segment distance hit-testing'],
    icon: 'ArrowUpRight',
  },
  {
    id: 'eraser',
    title: 'Precision Eraser',
    shortDesc: 'Point-and-click or drag-to-erase with dynamic hit testing.',
    fullDesc:
      'Erase entire annotations with a single click or drag across strokes using a circular eraser brush. Built with direct segment perpendicular distance algorithms for zero false positives.',
    category: 'tools',
    shortcut: 'Alt+E',
    specs: ['Configurable eraser brush radius', 'Individual element hit-testing', 'Delete-selected element capability', 'Clean canvas without tearing'],
    icon: 'Eraser',
  },
  {
    id: 'undo-redo',
    title: 'Undo & Redo Engine',
    shortDesc: 'Full chronological history stack with scoped stroke/shape rollbacks.',
    fullDesc:
      'Never lose your work. ProScreen maintains a deep chronological undo/redo stack that tracks every stroke, shape, text edit, and clear action. Even accidental clears can be instantly undone.',
    category: 'core',
    shortcut: 'Ctrl+Z / Ctrl+Y',
    specs: ['Infinite history steps within session', 'Independent stroke & shape scopes', 'Full restore after accidental Clear Screen', 'Zero memory leaks via immutable state'],
    icon: 'RotateCcw',
  },
  {
    id: 'floating-eye',
    title: 'Floating Eye Restore Button',
    shortDesc: 'Epic Pen style toolbar collapse with 0% screen blocking.',
    fullDesc:
      'Click the Eye button or press Alt+Shift+P to collapse the toolbar. All your existing annotations remain visible on screen while the toolbar disappears, leaving only a sleek movable floating Eye restore button. Clicks everywhere else pass directly through to your desktop apps.',
    category: 'core',
    shortcut: 'Alt+Shift+P',
    badge: 'Epic Pen Style',
    specs: ['Toolbar collapses without wiping drawings', 'Sleek draggable restore button', 'Remembers last screen coordinates', '100% mouse pass-through outside button'],
    icon: 'Eye',
  },
  {
    id: 'whiteboard-blackboard',
    title: 'Whiteboard & Blackboard',
    shortDesc: 'Instant fullscreen presentation backdrops with multiple page sheets.',
    fullDesc:
      'Transform any monitor into an immaculate teaching surface in one click. Toggle between Pure Whiteboard, Midnight Blackboard, Dot Grid Paper, and Ruled Engineering Notebook. Add multiple pages and export high-resolution PNG notes.',
    category: 'workspace',
    shortcut: 'Alt+W / Alt+B',
    specs: ['Whiteboard, Blackboard, Dot Grid, Ruled Paper', 'Multi-page canvas sheet management', 'One-click high-res PNG export', 'Instant toggle back to live desktop'],
    icon: 'Presentation',
  },
  {
    id: 'screenshot-capture',
    title: 'Screenshot Capture',
    shortDesc: 'Full-screen or rectangular area selector with clipboard copy.',
    fullDesc:
      'Capture pixel-perfect snapshots of your annotated screen. Drag to select a custom region or capture the full monitor. Automatically copies the PNG image to your system clipboard and offers one-click file download.',
    category: 'capture',
    shortcut: 'Alt+Shift+S',
    specs: ['Free-drag rectangular area selection', 'Instant Ctrl+V clipboard ready', 'PNG file download dialog', 'Retains high-DPI display crispness'],
    icon: 'Camera',
  },
  {
    id: 'screen-recording',
    title: 'Screen Recording',
    shortDesc: 'Real in-app screen capture via MediaRecorder with status HUD.',
    fullDesc:
      'Record your screen with all active drawings and live cursor overlays. Features a floating recording status bar with live timer, pause/resume controls, and direct WebM video export with crystal-clear audio sync.',
    category: 'capture',
    shortcut: 'Alt+Shift+R',
    specs: ['Native MediaRecorder video capture', 'Floating HUD with live elapsed timer', 'Pause and resume without losing frames', 'WebM video format with high bitrates'],
    icon: 'Video',
  },
  {
    id: 'global-shortcuts',
    title: 'Global Shortcuts',
    shortDesc: 'System-wide and in-app hotkeys that work from any software.',
    fullDesc:
      'Control ProScreen effortlessly while presenting in PowerPoint, debugging in VS Code, or browsing in Chrome. Global hotkeys register at the OS level on Windows and through Chrome commands in the extension.',
    category: 'system',
    shortcut: 'Alt+Shift+P / Alt+V',
    specs: ['OS-level global key registration', 'Alt+V instant pointer pass-through', 'Alt+Shift+X clear with safety guard', 'Customizable keybinding manager'],
    icon: 'Keyboard',
  },
  {
    id: 'multi-monitor',
    title: 'Multi-Monitor Support',
    shortDesc: 'Unified virtual desktop coordinate mapping across all displays.',
    fullDesc:
      'Seamlessly annotate across dual, triple, or ultra-wide multi-monitor setups. ProScreen calculates unified virtual screen bounds, properly handles secondary monitors with negative X/Y coordinates, and auto-clamps toolbars to visible viewports.',
    category: 'system',
    badge: 'Native Electron',
    specs: ['Supports negative virtual coordinates', 'Mixed-DPI display scaling support', 'Display disconnect auto-clamp protection', 'Seamless cross-display dragging'],
    icon: 'Monitor',
  },
];

export const WORKFLOWS = [
  {
    id: 'students',
    title: 'Students & Learners',
    role: 'Lecture Capture, Problem Solving & Study Notes',
    description:
      'Record online lectures, capture assignments, and annotate digital textbooks without missing a beat. Draw formulas, highlight key passages, add audio notes, and save review sessions for exam prep.',
    features: ['Instant Screen & Audio Capture', 'Fading Ink Countdown', 'Chisel Highlighter', 'Clipboard Screenshots'],
    stat: '100% focused study flow',
  },
  {
    id: 'teachers',
    title: 'Teachers & Educators',
    role: 'Online Classes, Video Feedback & Whiteboards',
    description:
      'Deliver crystal-clear lessons across Zoom, Google Meet, and Teams. Write equations over presentations, switch instantly to Blackboard mode for derivations, and share smooth MP4/WebM video explanations.',
    features: ['Full-Screen Whiteboard/Blackboard', 'Smooth Freehand Pen', 'Dual Audio (Voice + System)', 'Floating Toolbar'],
    stat: 'Zero lag during video calls',
  },
  {
    id: 'developers',
    title: 'Software Developers & Engineers',
    role: 'Code Walkthroughs, Bug Demos & Architecture',
    description:
      'Explain complex pull requests, demonstrate frontend interactions, and record bug reproduction clips with console output. Draw arrows directly over VS Code and browser DevTools with zero mouse blockage.',
    features: ['60 FPS Window & Screen Capture', 'Direct3D Pass-Through', 'Directional Arrows & Callouts', 'Multi-Monitor Support'],
    stat: 'Zero mouse blocking in IDE',
  },
  {
    id: 'creators',
    title: 'Content Creators & Streamers',
    role: 'YouTube Tutorials, Product Demos & Highlights',
    description:
      'Produce studio-quality tutorials without expensive editing setups. Record crisp 60 FPS video with synchronized microphone commentary, highlight details on the fly, and review clips instantly in the built-in player.',
    features: ['High-Bitrate 60 FPS Video', 'Brickwall Audio Limiter', 'Instant Timeline Scrubber', 'Customizable Shortcuts'],
    stat: 'Native 60 FPS output',
  },
  {
    id: 'trainers',
    title: 'Online Trainers & Instructors',
    role: 'SOP Walkthroughs, Webinars & Onboarding',
    description:
      'Create reusable, high-impact training walkthroughs for enterprise software. Frame precise application areas with Area Recording, highlight critical workflow steps, and export clean, watermark-free videos.',
    features: ['Precision Area Recording', 'Step-by-Step Annotations', 'Movable Floating Eye', 'Instant Video Replay'],
    stat: 'Clear step-by-step guidance',
  },
  {
    id: 'professionals',
    title: 'Business Professionals & Managers',
    role: 'Async Video Memos, Client Pitches & Audits',
    description:
      'Replace lengthy meetings with concise 2-minute video walkthroughs. Annotate financial spreadsheets, mark up PDF contracts and slide decks, and share actionable video briefings with clients and executives.',
    features: ['One-Click Record & Save', 'Window-Specific Capture', 'Clean Modern UI', 'Instant Save As Dialog'],
    stat: 'Save 5+ hours of meetings/wk',
  },
];

export const SYSTEM_REQUIREMENTS = {
  os: 'Windows 10 version 1809 or higher, Windows 11 (64-bit only)',
  cpu: 'Intel Core i3 / AMD Ryzen 3 or higher',
  ram: '4 GB minimum (8 GB recommended for multi-monitor recording)',
  storage: '300 MB free hard drive space for installation',
  gpu: 'DirectX 11 compatible graphics (Hardware acceleration enabled)',
  display: '1280x720 minimum (1080p, 1440p, 4K and Ultrawide fully supported)',
};

export const PLATFORM_MATRIX = [
  {
    feature: 'Annotation over any Windows desktop application',
    desktop: true,
    extension: false,
    note: 'Desktop draws over PowerPoint, Excel, VS Code, Photoshop, etc.',
  },
  {
    feature: 'Annotation over any website tab',
    desktop: true,
    extension: true,
    note: 'Extension runs inside Chromium without native software install',
  },
  {
    feature: 'Mouse click pass-through (Pointer mode)',
    desktop: true,
    extension: true,
    note: 'Zero-latency interaction with underlying controls',
  },
  {
    feature: 'Floating Eye restore button (Epic Pen style)',
    desktop: true,
    extension: true,
    note: 'Toolbar collapses while annotations remain visible',
  },
  {
    feature: 'Multi-monitor virtual desktop bounds',
    desktop: true,
    extension: false,
    note: 'Spans secondary monitors with negative coordinates',
  },
  {
    feature: 'Global OS hotkeys (Alt+Shift+P, Alt+V, Alt+Shift+S)',
    desktop: true,
    extension: 'Browser-scoped',
    note: 'Desktop triggers globally across all apps; extension is browser-focused',
  },
  {
    feature: 'Whiteboard & Blackboard fullscreen canvas',
    desktop: true,
    extension: true,
    note: 'Pure white, blackboard, dot grid, and ruled paper',
  },
  {
    feature: 'Area screenshot & clipboard copy',
    desktop: true,
    extension: true,
    note: 'Drag to select area and copy PNG instantly',
  },
  {
    feature: 'Real-time screen recording with timer HUD',
    desktop: true,
    extension: true,
    note: 'Powered by native MediaRecorder',
  },
  {
    feature: 'CSP bypass via Shadow DOM inlined styles',
    desktop: 'N/A (Native)',
    extension: true,
    note: 'Annotate strictly protected sites like GitHub, Google, ChatGPT',
  },
  {
    feature: 'Zero external telemetry & 100% local processing',
    desktop: true,
    extension: true,
    note: 'No analytics, no telemetry, no cloud servers required',
  },
];

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '1.0.3',
    date: 'November 18, 2026',
    tagline: 'Keyboard Shortcut Visualizer & Verified Windows Release Assets',
    status: 'stable',
    highlights: [
      'Official ProScreen v1.0.3 release with Windows NSIS Installer, Portable EXE, and Chrome Extension ZIP',
      'Added an opt-in Keyboard Shortcut Visualizer with a bounded notification queue, auto-hide, and cleanup',
      'Shortcut detection is limited to the ProScreen application window; system-wide passive monitoring is not provided',
      'Published a release manifest containing the verified sizes and SHA-256 checksums for all three downloads',
    ],
    sections: [
      {
        category: 'Keyboard Shortcut Visualizer',
        items: [
          'Monitoring starts OFF and can be turned on or off by the user',
          'Shows shortcuts detected while the ProScreen application window is focused',
          'Limits notifications to five queued items and automatically hides and cleans up notifications',
          'Does not register global shortcuts or intercept keystrokes from other applications',
        ],
      },
      {
        category: 'Release Integrity',
        items: [
          'Aligned the Chrome extension manifest version with the desktop package version',
          'Added a packaging check that detects version drift before producing the extension ZIP',
          'Verified published download checksums against the v1.0.3 release manifest',
        ],
      },
    ],
  },
  {
    version: '1.0.2',
    date: 'November 17, 2026',
    tagline: 'Production Release — Epic Pen Pro Redesign, Zero-Stutter 60 FPS Engine & Preview Modal Repair',
    status: 'stable',
    highlights: [
      'Official Production Release v1.0.2 with complete Windows NSIS Installer, Portable EXE, and Chrome Extension ZIP',
      'Epic Pen Pro-inspired pure white mode website redesign with alternating visual storytelling rows',
      'Zero-avoidable-stutter 60 FPS recording engine with Direct3D/DXGI GPU acceleration and duration metadata injection',
      'Full Recording Preview Modal functionality: timeline seeking, replay, 0.5x–2x playback speed, volume/mute, fullscreen, and direct file access',
      'Hardened Electron startup and multi-monitor lifecycle with robust window Z-order and DPI scaling',
      'Dynamic GitHub release distribution with live SHA-256 verification and automatic asset hydration',
    ],
    sections: [
      {
        category: 'Recording & Playback Engine',
        items: [
          'DXGI Desktop Duplication 60 FPS screen capture pipeline with zero dropped frames on Windows 10/11',
          'Restored and verified all 14 Preview Modal controls including frame seeking, speed multiplier, and audio volume',
          'Injected duration metadata into WebM/MP4 recordings for smooth continuous timeline scrubbing without freezing',
          'Custom media protocol (proscreen-media://) for high-performance zero-copy local video streaming',
          'Dual-channel studio audio mixer with 48 kHz sampling, voice gain staging, and brickwall peak limiting',
        ],
      },
      {
        category: 'UI & User Experience',
        items: [
          'Pure white mode theme architecture following Epic Pen Pro design benchmarks',
          'Alternating 2-column feature showcase with authentic application window mockups',
          'Transparent pricing presentation: First 6 Months Free ($0), then $1/month with zero upfront billing',
          'Direct download buttons with real file sizes (133.8 MB installer, 119.5 MB portable) and one-click SHA-256 copy',
        ],
      },
      {
        category: 'Windows Desktop Architecture',
        items: [
          'Refactored startup lifecycle into isolated, unit-tested modules (startupLifecycle, interactionLifecycle, electronPaths, mediaUrl)',
          'Eliminated popout-to-toolbar bounds oscillation and coordinate flutter during right-edge docking',
          'Enhanced Windows AppUserModelID registration for smooth taskbar and notification handling',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'November 14, 2026',
    tagline: 'Initial Public Release — Windows Desktop & Chrome Extension',
    status: 'stable',
    highlights: [
      'Official Windows NSIS installer and zero-install Portable executable',
      'Dual-runtime architecture: Native Electron desktop app and Manifest V3 Chrome Extension',
      'Epic Pen style Eye OFF / Eye ON collapse with sleek floating Eye restore button',
      'Pointer mode with verified zero-latency mouse pass-through to underlying apps',
      'Unified virtual screen coordinate mapping across multi-monitor setups',
      '100% local data privacy with zero external telemetry',
    ],
    sections: [
      {
        category: 'Core Annotation Studio',
        items: [
          'Smooth Pen tool with Bezier curve interpolation and customizable stroke width (1px - 48px)',
          'Semi-transparent Highlighter with solid and chisel stroke modes for legible text callouts',
          'Text tool with point-to-type placement, dynamic sizing, and multi-color selection',
          'Geometric shapes: Rectangle, rounded rectangle with radius adjustment, circle with 1:1 Shift snap, ellipse, and straight lines',
          'Directional vector Arrow tool with 45° angle snapping and double-headed length indicators',
          'Eraser with adjustable hit-test radius and individual stroke deletion',
          'Chronological undo/redo stack with independent stroke and shape history scopes',
          '32 color presets plus full RGB/HEX color picker and recent colors memory',
        ],
      },
      {
        category: 'Windows Desktop Application',
        items: [
          'Frameless, transparent native window with hardware-accelerated Direct3D rendering',
          'Native mouse event pass-through via win.setIgnoreMouseEvents(true, { forward: true })',
          'Multi-monitor virtual bounds calculation supporting secondary monitors with negative X/Y coordinates',
          'Automatic display re-clamping on screen resolution or orientation change',
          'Global keyboard shortcuts registered through user32 hotkey APIs',
          'Single-instance lock preventing conflicting duplicate processes',
          'NSIS installer with Desktop shortcut, Start Menu integration, and clean uninstaller',
          'Standalone Portable .exe requiring zero installation or admin privileges',
        ],
      },
      {
        category: 'Chrome Extension (Manifest V3)',
        items: [
          'Full Manifest V3 compliance with background service worker architecture',
          'Shadow DOM encapsulation preventing host page stylesheet contamination',
          'Build-time style inlining (__PROSCREEN_INLINE_CSS__) to bypass strict Content Security Policies (CSP)',
          'Isolated per-tab annotation persistence ensuring zero cross-tab leakage',
          'Single overlay host guard with MutationObserver re-attachment for SPAs',
          'Tab capture recording via offscreen document pipeline',
        ],
      },
      {
        category: 'Capture & Recording',
        items: [
          'Screen snapshot tool supporting full-screen and rectangular area drag selection',
          'Instant clipboard copy of annotated PNG screenshots',
          'Real-time screen recording using MediaRecorder with high-bitrate WebM output',
          'Floating recording status bar with live duration timer, pause, resume, and stop controls',
        ],
      },
      {
        category: 'Quality Assurance & Performance',
        items: [
          '57/57 verified unit and integration tests passing in automated test harness',
          '60+ FPS smooth rendering on 1080p, 1440p, and 4K displays',
          'Zero network calls or background telemetry — all processing remains 100% on your device',
        ],
      },
    ],
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 'what-is-proscreen',
    question: 'What is ProScreen?',
    answer:
      'ProScreen is a professional desktop screen recording and on-screen annotation studio. It lets you record your screen in 60 FPS, draw and highlight directly over any Windows desktop application or website with zero mouse latency, and preview, scrub, and export videos with studio-grade audio.',
    category: 'general',
  },
  {
    id: 'os-supported',
    question: 'Which operating systems are supported?',
    answer:
      'Windows 11 and Windows 10 (64-bit) are currently fully supported with native installer and portable editions. Native macOS (Universal for Apple Silicon and Intel) and Linux (.deb and AppImage) editions are currently in active development and coming soon. A Manifest V3 Chrome Extension is also available for all Chromium browsers.',
    category: 'windows',
  },
  {
    id: 'how-to-download',
    question: 'How do I download ProScreen?',
    answer:
      'You can download ProScreen directly from our official Download Center. We provide both a standard Windows Installer (.exe) with automatic shortcuts and uninstaller, and a standalone Portable (.exe) executable that runs immediately without administrative privileges. Direct file downloads are hosted with zero third-party mirrors or bundled software.',
    category: 'windows',
  },
  {
    id: 'free-six-month-offer',
    question: 'What does the free six-month offer mean?',
    answer:
      'ProScreen Pro is 100% free for your first 6 months. You get full access to all Pro features—including 60 FPS recording, 4K/Studio HD resolution, dual-track audio mixing with limiter, unlimited recordings, zero watermarks, and on-screen drawing tools—at $0 cost. No credit card is required to download and start using ProScreen today.',
    category: 'general',
  },
  {
    id: 'price-after-six-months',
    question: 'What is the price after six months?',
    answer:
      'After the introductory 6-month free period, ProScreen Pro will be $1 per month. This is an affordable monthly subscription designed to support ongoing development, codec optimizations, and operating system updates. Billing and renewal terms will be presented before checkout when billing is implemented.',
    category: 'general',
  },
  {
    id: 'how-to-save-recordings',
    question: 'How do I save recordings?',
    answer:
      'When you stop a recording, the Recording Preview Modal opens automatically. You can review your video, scrub through the timeline, and adjust playback speed. Click "Save As" to choose a custom folder via the native Windows save dialog, or click "Done" to automatically save it to your default videos directory. Recordings are saved in high-bitrate WebM or MP4 format with EBML duration metadata for instant seeking in any media player.',
    category: 'general',
  },
  {
    id: 'can-i-record-selected-area',
    question: 'Can I record a selected area?',
    answer:
      'Yes. ProScreen offers 4 dedicated capture modes: Screen (entire monitor), Window (specific application window), Tab (browser tab), and Area (custom rectangular region). When you choose Area mode, an interactive crop selector lets you frame the exact region you want to capture, displaying live pixel dimensions and coordinates.',
    category: 'general',
  },
  {
    id: 'does-proscreen-support-audio',
    question: 'Does ProScreen support audio?',
    answer:
      'Yes. ProScreen includes a studio audio engine supporting simultaneous system audio (tab / desktop loopback) and microphone audio. It features 48 kHz high-fidelity sampling, microphone gain staging, high-pass rumble filtering, and a brickwall peak limiter to eliminate distortion and digital clipping.',
    category: 'general',
  },
  {
    id: 'how-to-get-support',
    question: 'How do I get support?',
    answer:
      'You can reach our team through the in-app Support Center or via GitHub Issues. We provide detailed troubleshooting guides, installation tips, and keyboard shortcut cheat sheets for both Windows desktop and the Chrome Extension.',
    category: 'general',
  },
  {
    id: 'how-pointer-works',
    question: 'How does Pointer Mode (Pass-Through) work?',
    answer:
      'Pointer Mode is the default mode in ProScreen. In Pointer mode, the drawing overlay ignores mouse clicks and forwards all mouse events directly to underlying applications. You can click buttons in Excel, type code in VS Code, or scroll web pages without ProScreen blocking your cursor. Press Alt+V anytime to instantly return to Pointer mode.',
    category: 'general',
  },
  {
    id: 'eye-button-behavior',
    question: 'How does the Floating Eye Restore Button work?',
    answer:
      'When you click the Eye button on the toolbar (or press Alt+Shift+P), the toolbar and panels hide completely so your screen remains clean during presentations. However, all existing annotations stay visible on your screen. In this collapsed state, only a small, movable floating Eye restore button is shown. Clicking this restore button immediately returns your full toolbar. Outside of the tiny button, your mouse passes completely through to your desktop.',
    category: 'general',
  },
  {
    id: 'installer-vs-portable',
    question: 'What is the difference between the Windows Installer and Portable version?',
    answer:
      'Both versions offer identical features and performance. The Windows Installer (ProScreen-Setup-1.0.0.exe) installs ProScreen into your local AppData folder, creates a Desktop shortcut and Start Menu entry, and registers a standard Windows uninstaller. The Portable version (ProScreen-Portable-1.0.0.exe) is a single standalone file that runs immediately without installation — perfect for running from a USB drive or on computers without administrative rights.',
    category: 'windows',
  },
  {
    id: 'windows-uac-admin',
    question: 'Why does ProScreen sometimes not draw over Administrator command prompts or Task Manager?',
    answer:
      'This is caused by Windows User Interface Privilege Isolation (UIPI), a standard Windows security mechanism that blocks standard applications from sending input to elevated (Run as Administrator) windows. To draw over elevated applications like Task Manager or administrative command prompts, simply right-click ProScreen and select "Run as administrator".',
    category: 'windows',
  },
  {
    id: 'multi-monitor-setup',
    question: 'How does ProScreen handle multiple monitors and mixed DPIs?',
    answer:
      'ProScreen automatically detects all connected displays, calculates unified virtual coordinates (including secondary monitors placed to the left or above with negative coordinates), and handles mixed display scaling. If you disconnect an external monitor, ProScreen automatically repositions the toolbar onto the nearest active display.',
    category: 'windows',
  },
  {
    id: 'chrome-store-status',
    question: 'Is the Chrome Extension available on the Chrome Web Store?',
    answer:
      'The Chrome Extension build is 100% complete and Manifest V3 compliant. It is currently under standard review with the Chrome Web Store team. In the meantime, you can immediately use the extension by downloading the unpacked production bundle from the Chrome Extension page and loading it in Chrome via Developer mode in under 30 seconds.',
    category: 'extension',
  },
  {
    id: 'csp-compatibility',
    question: 'Does the Chrome Extension work on strict sites like GitHub, ChatGPT, or Google Docs?',
    answer:
      'Yes. Many extensions break on modern web apps because strict Content Security Policy (CSP) headers block external CSS. ProScreen uses build-time CSS inlining directly inside an isolated Shadow DOM container. This completely bypasses CSP restrictions without violating browser security rules, ensuring reliable operation on all websites.',
    category: 'extension',
  },
  {
    id: 'shortcuts-customization',
    question: 'What are the main keyboard shortcuts?',
    answer:
      'Key shortcuts include: Alt+Shift+P (Show/Hide Toolbar & Eye Toggle), Alt+V (Return to Pointer Mode), Alt+P (Pen), Alt+H (Highlighter), Alt+T (Text), Alt+A (Arrow), Alt+E (Eraser), Alt+W (Whiteboard), Alt+B (Blackboard), Alt+Shift+S (Capture Screenshot), Alt+Shift+R (Screen Recording), and Ctrl+Z / Ctrl+Y (Undo / Redo).',
    category: 'shortcuts',
  },
  {
    id: 'windows-smartscreen-warning',
    question: 'Why does Windows show "Microsoft Defender SmartScreen prevented an unrecognized app from starting"?',
    answer:
      'Windows Defender SmartScreen displays an informational alert on newly released software that has not yet accumulated telemetry reputation in Microsoft cloud systems. ProScreen is 100% clean, verified, and open source with zero telemetry or background tracking. We recommend verifying the SHA-256 hash using PowerShell (Get-FileHash) before launching to confirm that your download has not been tampered with. Once verified, click "More info" on the SmartScreen dialog and select "Run anyway".',
    category: 'security',
  },
  {
    id: 'telemetry-privacy',
    question: 'Does ProScreen collect telemetry, analytics, or store my screen data in the cloud?',
    answer:
      'Zero. ProScreen is built with a strict local-first privacy model. There are no tracking scripts, no Google Analytics, no error reporting pings, and no cloud servers. All annotations, screenshots, and screen recordings are processed purely in your local computer memory and saved directly to your local disk.',
    category: 'security',
  },
];

export const KEYBOARD_SHORTCUTS = [
  { key: 'Alt+Shift+P', action: 'Show / Hide Toolbar (Eye ON / Eye OFF)', scope: 'Global OS & Extension' },
  { key: 'Alt+V', action: 'Return to Pointer Mode (Pass-Through)', scope: 'Global OS & Extension' },
  { key: 'Alt+Shift+S', action: 'Capture Screenshot (Area / Fullscreen)', scope: 'Global OS & Extension' },
  { key: 'Alt+Shift+R', action: 'Start / Stop Screen Recording', scope: 'Global OS & Extension' },
  { key: 'Alt+Shift+X', action: 'Clear All Annotations', scope: 'Global OS & Extension' },
  { key: 'Alt+P', action: 'Select Pen Tool', scope: 'Studio / Active Overlay' },
  { key: 'Alt+H', action: 'Select Highlighter Tool', scope: 'Studio / Active Overlay' },
  { key: 'Alt+T', action: 'Select Text Tool', scope: 'Studio / Active Overlay' },
  { key: 'Alt+A', action: 'Select Directional Arrow Tool', scope: 'Studio / Active Overlay' },
  { key: 'Alt+R', action: 'Select Rectangle / Shape Tool', scope: 'Studio / Active Overlay' },
  { key: 'Alt+E', action: 'Select Eraser Tool', scope: 'Studio / Active Overlay' },
  { key: 'Alt+W', action: 'Switch to Fullscreen Whiteboard', scope: 'Studio / Active Overlay' },
  { key: 'Alt+B', action: 'Switch to Fullscreen Blackboard', scope: 'Studio / Active Overlay' },
  { key: 'Ctrl+Z', action: 'Undo Last Annotation Action', scope: 'Studio / Active Overlay' },
  { key: 'Ctrl+Y', action: 'Redo Last Undo Action', scope: 'Studio / Active Overlay' },
  { key: 'Esc', action: 'Exit Active Tool / Close Popovers', scope: 'Studio / Active Overlay' },
];

export const PRICING_OFFER = {
  planName: 'ProScreen Pro',
  tagline: 'Complete screen recording & annotation studio for professionals',
  introductoryPeriodMonths: 6,
  introductoryPriceFormatted: '$0',
  introductoryLabel: 'FIRST 6 MONTHS — FREE',
  monthlyPriceAfterIntro: 1,
  monthlyPriceFormatted: '$1 / month',
  billingCadence: 'Monthly subscription after 6-month trial',
  timeline: [
    {
      period: 'Months 1 – 6',
      price: '$0',
      badge: 'Free Access',
      description: 'Full Pro features, unlimited recordings, zero watermarks, 100% free.',
    },
    {
      period: 'After Month 6',
      price: '$1 / mo',
      badge: 'Affordable Pro',
      description: 'Continue with all Pro features for just $1 per month. Cancel anytime.',
    },
  ],
  features: [
    '60 FPS Smooth Desktop Video Capture (DXGI GPU Accelerated)',
    '4 Recording Modes: Screen, Window, Tab, and Area Selection',
    'Up to 4K Ultra HD & Studio High-Bitrate Video Export',
    'Dual-Channel Studio Audio (System Loopback + Microphone)',
    'Studio Audio DSP: 48 kHz, High-Pass Filter & Peak Limiter',
    'Movable Floating Studio Toolbar with Collapsible Eye Restore',
    'Full Annotation Suite: Pen, Highlighter, Arrow, Shapes & Text',
    'Fading Ink Countdown Timer for Temporary Markups',
    'In-App Video Preview Modal with Timeline Scrubbing & 0.5x–2x Speed',
    'Zero Watermarks, Unlimited Recording Length & 100% Local Privacy',
    'WebM & MP4 Direct Native Saving with Injected Duration Metadata',
    'Multi-Monitor Support with DPI Scaling & Negative Coordinates',
  ],
  disclaimer:
    'Billing and renewal terms will be presented before checkout when subscription billing is implemented. Download and use free today — no credit card required.',
};

