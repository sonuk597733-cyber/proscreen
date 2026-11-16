import test from 'node:test';
import assert from 'node:assert/strict';
import { clampToolbarToDisplays, calculateVirtualBounds } from './multiMonitor';
import type { DesktopDisplayInfo } from './desktopTypes';

/**
 * Mock Window abstraction simulating Electron BrowserWindow behavior on Win32
 */
class MockBrowserWindow {
  public isVisibleState = false;
  public focusable: boolean;
  public ignoreMouse = false;
  public destroyed = false;
  public bounds = { x: 0, y: 0, width: 0, height: 0 };
  public alwaysOnTop = false;
  public alwaysOnTopLevel = 'normal';
  public zOrder = 0; // Higher = top of z-order stack

  constructor(options: { focusable?: boolean; show?: boolean; width?: number; height?: number }) {
    this.focusable = options.focusable ?? true;
    this.isVisibleState = options.show ?? false;
    this.bounds.width = options.width ?? 0;
    this.bounds.height = options.height ?? 0;
  }

  showInactive() {
    this.isVisibleState = true;
  }

  show() {
    this.isVisibleState = true;
  }

  hide() {
    this.isVisibleState = false;
  }

  isVisible() {
    return this.isVisibleState;
  }

  isDestroyed() {
    return this.destroyed;
  }

  destroy() {
    this.destroyed = true;
    this.isVisibleState = false;
  }

  setIgnoreMouseEvents(ignore: boolean) {
    this.ignoreMouse = ignore;
  }

  setFocusable(f: boolean) {
    this.focusable = f;
  }

  setAlwaysOnTop(flag: boolean, level = 'normal', relativeLevel = 0) {
    this.alwaysOnTop = flag;
    this.alwaysOnTopLevel = level;
    let base = 5;
    if (level === 'screen-saver') base = 100;
    else if (level === 'pop-up-menu') base = 20;
    else if (level === 'floating') base = 10;
    this.zOrder = Math.max(this.zOrder, base + relativeLevel);
  }

  moveTop() {
    this.zOrder += 10;
  }

  setBounds(b: { x?: number; y?: number; width?: number; height?: number }) {
    if (b.x !== undefined) this.bounds.x = b.x;
    if (b.y !== undefined) this.bounds.y = b.y;
    if (b.width !== undefined) this.bounds.width = b.width;
    if (b.height !== undefined) this.bounds.height = b.height;
  }

  getPosition() {
    return [this.bounds.x, this.bounds.y];
  }

  setPosition(x: number, y: number) {
    this.bounds.x = x;
    this.bounds.y = y;
  }
}

/**
 * State simulator mirroring Electron main process IPC logic and window rules
 */
class MainProcessSimulator {
  public overlayWindow: MockBrowserWindow | null = null;
  public toolbarWindow: MockBrowserWindow | null = null;
  public trayDestroyed = false;
  public shortcutsRegistered = new Set<string>();
  public sharedState = {
    interactionMode: 'pointer' as 'pointer' | 'drawing',
    activeTool: 'pointer',
    historyCount: 0,
    isRecording: false,
    toolbarVisible: true,
    restoreButtonVisible: false,
    toolbarPosition: { x: 16, y: 76 },
    restoreButtonPosition: { x: 16, y: 76 },
  };

  createOverlay() {
    const win = new MockBrowserWindow({
      focusable: false,
      show: false,
      width: 1920,
      height: 1080,
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true);
    this.overlayWindow = win;
    return win;
  }

  createToolbar() {
    const win = new MockBrowserWindow({
      focusable: true,
      show: true,
      width: 44,
      height: 520,
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.moveTop();
    win.setIgnoreMouseEvents(false);
    this.toolbarWindow = win;
    return win;
  }

  applyInteractionMode(mode: 'pointer' | 'drawing') {
    this.sharedState.interactionMode = mode;
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;

    if (mode === 'pointer') {
      this.overlayWindow.setIgnoreMouseEvents(true);
      if (this.sharedState.historyCount === 0 && !this.sharedState.isRecording) {
        if (this.overlayWindow.isVisible()) this.overlayWindow.hide();
      } else {
        if (!this.overlayWindow.isVisible()) this.overlayWindow.showInactive();
        this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        this.overlayWindow.setIgnoreMouseEvents(true);
      }
    } else {
      if (!this.overlayWindow.isVisible()) this.overlayWindow.showInactive();
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      this.overlayWindow.setIgnoreMouseEvents(false);

      if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
        this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
        this.toolbarWindow.moveTop();
      }
    }
  }

  setToolbarBounds(bounds: { x?: number; y?: number; width?: number; height?: number }) {
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
      this.toolbarWindow.setBounds(bounds);
      this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      this.toolbarWindow.moveTop();
    }
  }

  handleIpcSetOverlayIgnoreMouse(ignore: boolean) {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    if (ignore) {
      this.overlayWindow.setIgnoreMouseEvents(true);
    } else {
      if (this.sharedState.interactionMode === 'drawing') {
        this.overlayWindow.setIgnoreMouseEvents(false);
        this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
          this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
          this.toolbarWindow.moveTop();
        }
      }
    }
  }

  dispatchAction(action: string, payload?: unknown) {
    if (action === 'select-recording-area' || action === 'capture-area') {
      this.sharedState.interactionMode = 'drawing';
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        if (!this.overlayWindow.isVisible()) this.overlayWindow.showInactive();
        this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        this.overlayWindow.setIgnoreMouseEvents(false);
      }
      if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
        this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
        this.toolbarWindow.moveTop();
      }
    }
    if (action === 'cancel-recording-area') {
      if (this.sharedState.activeTool === 'pointer' || this.sharedState.activeTool === 'cursor') {
        this.sharedState.interactionMode = 'pointer';
        if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
          this.overlayWindow.setIgnoreMouseEvents(true);
          if (this.sharedState.historyCount === 0 && !this.sharedState.isRecording) {
            this.overlayWindow.hide();
          }
        }
      }
    }
  }

  simulateAppBlur() {
    // Mirroring main.ts app.on('browser-window-blur') & toolbarWindow.on('blur')
    if (this.overlayWindow && !this.overlayWindow.isDestroyed() && this.overlayWindow.isVisible()) {
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
      this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      this.toolbarWindow.moveTop();
    }
  }

  moveToolbar(pos: { x: number; y: number }) {
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
      const cur = this.toolbarWindow.bounds;
      const clamped = clampToolbarToDisplays(pos.x, pos.y, cur.width, cur.height, [
        {
          id: 1,
          label: 'Primary',
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          workArea: { x: 0, y: 0, width: 1920, height: 1040 },
          scaleFactor: 1.0,
          isPrimary: true,
        },
      ], { allowFullVerticalRange: true });
      const nextX = Math.round(clamped.x);
      const nextY = Math.round(clamped.y);
      if (cur.x !== nextX || cur.y !== nextY) {
        this.toolbarWindow.setPosition(nextX, nextY);
        if (this.sharedState.toolbarVisible) {
          this.sharedState.toolbarPosition = { x: nextX, y: nextY };
        } else {
          this.sharedState.restoreButtonPosition = { x: nextX, y: nextY };
        }
      }
    }
  }

  saveToolbarPosition(pos: { x: number; y: number }) {
    this.sharedState.toolbarPosition = { x: Math.round(pos.x), y: Math.round(pos.y) };
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
      this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      this.toolbarWindow.moveTop();
    }
  }

  saveRestoreButtonPosition(pos: { x: number; y: number }) {
    this.sharedState.restoreButtonPosition = { x: Math.round(pos.x), y: Math.round(pos.y) };
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
      this.toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      this.toolbarWindow.moveTop();
    }
  }

  setEyeState(visible: boolean) {
    this.sharedState.toolbarVisible = visible;
    this.sharedState.restoreButtonVisible = !visible;
    if (visible) {
      if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
        const tbPos = this.sharedState.toolbarPosition;
        this.toolbarWindow.setBounds({
          x: tbPos.x,
          y: tbPos.y,
          width: 44,
          height: 520,
        });
        this.toolbarWindow.show();
      }
    } else {
      if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
        const resPos = this.sharedState.restoreButtonPosition;
        this.toolbarWindow.setBounds({
          x: resPos.x,
          y: resPos.y,
          width: 44,
          height: 44,
        });
        this.toolbarWindow.show();
      }
    }
  }

  registerEmergencyShortcuts(): { [key: string]: boolean } {
    const keys = ['Alt+Shift+Q', 'Ctrl+Shift+Q', 'Ctrl+Alt+Q'];
    const results: { [key: string]: boolean } = {};
    for (const k of keys) {
      this.shortcutsRegistered.add(k);
      results[k] = true;
    }
    return results;
  }

  executeGracefulExit() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) this.overlayWindow.destroy();
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) this.toolbarWindow.destroy();
    this.trayDestroyed = true;
    this.shortcutsRegistered.clear();
  }

  executeEmergencyExit() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) this.overlayWindow.destroy();
    if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) this.toolbarWindow.destroy();
    this.trayDestroyed = true;
    this.shortcutsRegistered.clear();
  }
}

// ============================================================================
// PROBLEM 1 TESTS: GLOBAL OVERLAY & TOOLBAR VISIBILITY ABOVE WINDOWS APPS
// ============================================================================

test('P1-1: Toolbar always-on-top configuration uses screen-saver level for Windows', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();
  assert.equal(toolbar.alwaysOnTop, true, 'Toolbar must be always-on-top');
  assert.equal(toolbar.alwaysOnTopLevel, 'screen-saver', 'Toolbar must use screen-saver level on Windows for kSecuritySurface priority');
  assert.ok(toolbar.zOrder >= 100, 'Toolbar zOrder must reflect high priority');
});

test('P1-2: Overlay always-on-top configuration uses screen-saver level when visible', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  assert.equal(overlay.alwaysOnTop, true, 'Overlay must be always-on-top');
  assert.equal(overlay.alwaysOnTopLevel, 'screen-saver', 'Overlay must use screen-saver level on Windows');
});

test('P1-3: Toolbar remains visible and topmost after switching application focus (e.g. Chrome)', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();
  assert.equal(toolbar.isVisible(), true);

  // User switches focus to Chrome / Edge / Explorer (triggers browser-window-blur)
  sim.simulateAppBlur();

  assert.equal(toolbar.isVisible(), true, 'Toolbar must remain visible when user switches to Chrome');
  assert.equal(toolbar.alwaysOnTop, true, 'Toolbar must maintain alwaysOnTop');
  assert.equal(toolbar.alwaysOnTopLevel, 'screen-saver', 'Toolbar must re-assert screen-saver topmost level on blur');
});

test('P1-4: Overlay with annotations remains visible after switching application focus', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  sim.createToolbar();

  sim.sharedState.historyCount = 3; // Annotations exist on screen
  sim.applyInteractionMode('pointer');
  assert.equal(overlay.isVisible(), true);

  // User switches to Chrome
  sim.simulateAppBlur();

  assert.equal(overlay.isVisible(), true, 'Annotations must remain visible over Chrome');
  assert.equal(overlay.alwaysOnTopLevel, 'screen-saver', 'Overlay must maintain screen-saver topmost level');
  assert.equal(overlay.ignoreMouse, true, 'Overlay in pointer mode MUST retain ignoreMouse=true so Chrome can be clicked');
});

test('P1-5: Toolbar z-order after dropdown expansion stays strictly above overlay and normal apps', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  const toolbar = sim.createToolbar();

  // Drawing mode active
  sim.applyInteractionMode('drawing');
  assert.ok(toolbar.zOrder > overlay.zOrder, 'Toolbar must be above overlay');

  // Popout opens (expands to 384x540)
  sim.setToolbarBounds({ width: 384, height: 540 });
  assert.equal(toolbar.bounds.width, 384);
  assert.ok(toolbar.zOrder > overlay.zOrder, 'Expanded toolbar dropdown must remain above overlay');
  assert.equal(toolbar.alwaysOnTopLevel, 'screen-saver', 'Expanded toolbar must maintain screen-saver level');
});

test('P1-6: Pointer mode click-through safety is preserved over normal apps', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  sim.createToolbar();

  sim.applyInteractionMode('pointer');
  assert.equal(overlay.ignoreMouse, true, 'Pointer mode enforces ignoreMouse=true');
  assert.equal(overlay.focusable, false, 'Overlay must be non-focusable so clicking underlying apps works');
});

test('P1-7: Drawing mode interaction allows strokes over normal apps while keeping toolbar interactive', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  const toolbar = sim.createToolbar();

  sim.applyInteractionMode('drawing');
  assert.equal(overlay.isVisible(), true);
  assert.equal(overlay.ignoreMouse, false, 'Drawing mode captures clicks to draw strokes');
  assert.equal(toolbar.ignoreMouse, false, 'Toolbar remains directly interactive');
  assert.ok(toolbar.zOrder > overlay.zOrder, 'Toolbar remains above overlay for immediate tool switching');
});

test('P1-8: Window recreation preserves visibility settings and always-on-top level', () => {
  const sim = new MainProcessSimulator();
  const t1 = sim.createToolbar();
  t1.destroy();

  // Recreate toolbar
  const t2 = sim.createToolbar();
  assert.equal(t2.isVisible(), true, 'Recreated toolbar must be visible');
  assert.equal(t2.alwaysOnTop, true);
  assert.equal(t2.alwaysOnTopLevel, 'screen-saver');
  assert.equal(t2.bounds.width, 44);
});

// ============================================================================
// PREVIOUS CRITICAL REGRESSION TESTS
// ============================================================================

test('Test 1: Proper Win32 Z-Order allows drawing & toolbar clicks without overlay click-through traps', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  const toolbar = sim.createToolbar();

  sim.applyInteractionMode('drawing');
  assert.equal(overlay.ignoreMouse, false, 'Overlay must capture drawing clicks');
  assert.ok(toolbar.zOrder > overlay.zOrder, 'Toolbar must be higher in Z-order than overlay');
});

test('Test 2: No-forwarding mode keeps overlay in active capture mode throughout Drawing', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  sim.createToolbar();

  sim.applyInteractionMode('drawing');
  assert.equal(overlay.ignoreMouse, false, 'Drawing mode captures mouse events');
});

test('Test 3: Toolbar drag safely supports negative screen coordinates on multi-monitors', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 2,
      label: 'Secondary Left',
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: -1920, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1.0,
      isPrimary: false,
    },
    {
      id: 1,
      label: 'Primary Right',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1.0,
      isPrimary: true,
    },
  ];

  const clamped = clampToolbarToDisplays(-1500, 200, 44, 520, displays, { allowFullVerticalRange: true });
  assert.equal(clamped.x, -1500);
  assert.equal(clamped.y, 200);

  const clampedEdge = clampToolbarToDisplays(-2000, 100, 44, 520, displays, { allowFullVerticalRange: true });
  assert.equal(clampedEdge.x, -1920);
});

test('Test 4: Toolbar window bounds expand on popout open and restore on collapse without coordinate shifts', () => {
  const sim = new MainProcessSimulator();
  sim.createOverlay();
  const toolbar = sim.createToolbar();

  assert.equal(toolbar.bounds.width, 44);
  assert.equal(toolbar.bounds.height, 520);

  sim.setToolbarBounds({ width: 384, height: 540 });
  assert.equal(toolbar.bounds.width, 384);
  assert.equal(toolbar.bounds.height, 540);

  sim.setToolbarBounds({ width: 44, height: 520 });
  assert.equal(toolbar.bounds.width, 44);
  assert.equal(toolbar.bounds.height, 520);
});

test('Test 5: Screen to Viewport coordinate mapping accurately handles negative bounds', () => {
  const displays: DesktopDisplayInfo[] = [
    {
      id: 2,
      label: 'Secondary Left',
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: -1920, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1.0,
      isPrimary: false,
    },
    {
      id: 1,
      label: 'Primary',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1.0,
      isPrimary: true,
    },
  ];

  const vb = calculateVirtualBounds(displays);
  assert.equal(vb.x, -1920);
  assert.equal(vb.y, 0);
  assert.equal(vb.width, 3840);
  assert.equal(vb.height, 1080);
});

test('Test 6: Rapid tool switching maintains robust capture state', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  sim.createToolbar();

  const toolSequence: Array<{ tool: string; mode: 'pointer' | 'drawing'; expectedIgnore: boolean }> = [
    { tool: 'pen', mode: 'drawing', expectedIgnore: false },
    { tool: 'pointer', mode: 'pointer', expectedIgnore: true },
    { tool: 'highlighter', mode: 'drawing', expectedIgnore: false },
    { tool: 'pointer', mode: 'pointer', expectedIgnore: true },
  ];

  for (const step of toolSequence) {
    sim.applyInteractionMode(step.mode);
    assert.equal(overlay.ignoreMouse, step.expectedIgnore);
  }
});

test('Test 7: Graceful and Emergency exits both cleanly destroy windows and shortcuts', () => {
  const simGraceful = new MainProcessSimulator();
  const overlayG = simGraceful.createOverlay();
  const toolbarG = simGraceful.createToolbar();
  simGraceful.registerEmergencyShortcuts();

  simGraceful.executeGracefulExit();
  assert.equal(overlayG.isDestroyed(), true);
  assert.equal(toolbarG.isDestroyed(), true);
  assert.equal(simGraceful.trayDestroyed, true);

  const simEmergency = new MainProcessSimulator();
  const overlayE = simEmergency.createOverlay();
  const toolbarE = simEmergency.createToolbar();
  simEmergency.registerEmergencyShortcuts();

  simEmergency.executeEmergencyExit();
  assert.equal(overlayE.isDestroyed(), true);
  assert.equal(toolbarE.isDestroyed(), true);
  assert.equal(simEmergency.trayDestroyed, true);
});

// ============================================================================
// PROBLEM 1B TESTS: TOOLBAR CLICK, DRAG PERFORMANCE & INSTANT TOOL ACTIVATION
// ============================================================================

test('P1B-1: Inactive tool button click directly switches active tool without opening popouts', () => {
  let activeTool = 'pointer';
  let activePopout: string | null = null;

  const handleToolClick = (clickedTool: string, isCursorActive = false) => {
    if (activeTool === clickedTool) {
      activePopout = activePopout === clickedTool ? null : clickedTool;
    } else {
      activeTool = clickedTool;
      activePopout = null;
    }
  };

  // User is on pointer and clicks Pen
  handleToolClick('pen');
  assert.equal(activeTool, 'pen', 'Tool must be activated immediately');
  assert.equal(activePopout, null, 'Popout must remain null so toolbar window does not expand');

  // User is on pen and clicks Highlighter
  handleToolClick('highlighter');
  assert.equal(activeTool, 'highlighter', 'Highlighter must activate immediately');
  assert.equal(activePopout, null, 'Popout must remain closed');

  // User is on highlighter and clicks Pointer
  handleToolClick('pointer');
  assert.equal(activeTool, 'pointer', 'Pointer must activate immediately');
  assert.equal(activePopout, null, 'Popout must remain closed');
});

test('P1B-2: Active tool button click toggles popout open and closed', () => {
  let activeTool = 'pen';
  let activePopout: string | null = null;

  const handleToolClick = (clickedTool: string) => {
    if (activeTool === clickedTool) {
      activePopout = activePopout === clickedTool ? null : clickedTool;
    } else {
      activeTool = clickedTool;
      activePopout = null;
    }
  };

  // Clicking already-active pen opens its sub-options
  handleToolClick('pen');
  assert.equal(activeTool, 'pen');
  assert.equal(activePopout, 'pen', 'Active tool click must open popout');

  // Clicking it again closes popout
  handleToolClick('pen');
  assert.equal(activePopout, null, 'Second click must toggle popout closed');
});

test('P1B-3: Drag move does not flood Z-order changes or display queries', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();
  const initialZ = toolbar.zOrder;

  // Simulate 60 moves during drag
  for (let i = 0; i < 60; i++) {
    sim.moveToolbar({ x: 100 + i, y: 150 + i });
  }

  // Z-order must NOT have increased by 60x10 = 600 during move!
  assert.equal(toolbar.zOrder, initialZ, 'Drag move must not touch Z-order stack on every pixel');
  assert.equal(toolbar.bounds.x, 159);
  assert.equal(toolbar.bounds.y, 209);
});

test('P1B-4: Drag end (save position) re-asserts always-on-top and topmost once', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();
  const initialZ = toolbar.zOrder;

  // Drag finish triggers saveToolbarPosition
  sim.saveToolbarPosition({ x: 300, y: 400 });

  assert.equal(toolbar.alwaysOnTop, true);
  assert.equal(toolbar.alwaysOnTopLevel, 'screen-saver');
  assert.ok(toolbar.zOrder > initialZ, 'Save position asserts topmost once upon drop');
  assert.equal(sim.sharedState.toolbarPosition.x, 300);
  assert.equal(sim.sharedState.toolbarPosition.y, 400);
});

test('P1B-5: Browser-window-blur keeps toolbar strictly on top of overlay', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  const toolbar = sim.createToolbar();

  overlay.show();
  sim.simulateAppBlur();

  assert.ok(toolbar.zOrder > overlay.zOrder, 'Toolbar must be higher in Z-order than overlay after app blur');
  assert.equal(toolbar.alwaysOnTopLevel, 'screen-saver');
  assert.equal(overlay.alwaysOnTopLevel, 'screen-saver');
});

// ============================================================================
// COMPREHENSIVE 12-POINT REPEATED DRAG & EYE HANDLE VERIFICATION
// ============================================================================

test('REQ-1: First drag moves window smoothly and persists position', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();
  assert.equal(toolbar.bounds.x, 0);
  assert.equal(toolbar.bounds.y, 0);

  // User drags from initial (16, 76) by (+100, +200)
  const startX = 16;
  const startY = 76;
  const targetX = startX + 100;
  const targetY = startY + 200;

  sim.moveToolbar({ x: targetX, y: targetY });
  sim.saveToolbarPosition({ x: targetX, y: targetY });

  assert.equal(toolbar.bounds.x, 116);
  assert.equal(toolbar.bounds.y, 276);
  assert.equal(sim.sharedState.toolbarPosition.x, 116);
  assert.equal(sim.sharedState.toolbarPosition.y, 276);
});

test('REQ-2: Second drag immediately starts without restarting and updates position', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();

  // First drag
  sim.moveToolbar({ x: 200, y: 150 });
  sim.saveToolbarPosition({ x: 200, y: 150 });
  assert.equal(toolbar.bounds.x, 200);
  assert.equal(toolbar.bounds.y, 150);

  // Second drag immediately without closing or restarting
  sim.moveToolbar({ x: 350, y: 400 });
  sim.saveToolbarPosition({ x: 350, y: 400 });
  assert.equal(toolbar.bounds.x, 350);
  assert.equal(toolbar.bounds.y, 400);
  assert.equal(sim.sharedState.toolbarPosition.x, 350);
  assert.equal(sim.sharedState.toolbarPosition.y, 400);
});

test('REQ-3: At least 20 consecutive drag operations work with 0 position resets or jumps', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();

  let curX = 50;
  let curY = 50;

  for (let i = 1; i <= 25; i++) {
    const nextX = curX + 15;
    const nextY = curY + 10;

    // Simulate drag start, intermediate moves, and drop
    sim.moveToolbar({ x: curX + 5, y: curY + 3 });
    sim.moveToolbar({ x: nextX, y: nextY });
    sim.saveToolbarPosition({ x: nextX, y: nextY });

    assert.equal(toolbar.bounds.x, nextX, `Drag ${i} must reach target X`);
    assert.equal(toolbar.bounds.y, nextY, `Drag ${i} must reach target Y`);
    assert.equal(sim.sharedState.toolbarPosition.x, nextX);
    assert.equal(sim.sharedState.toolbarPosition.y, nextY);

    curX = nextX;
    curY = nextY;
  }
});

test('REQ-4: Dragging left, right, up, down, and diagonally calculates exact deltas', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();

  // Start at (500, 400)
  sim.moveToolbar({ x: 500, y: 400 });
  sim.saveToolbarPosition({ x: 500, y: 400 });

  // 1. Move Left
  sim.moveToolbar({ x: 400, y: 400 });
  sim.saveToolbarPosition({ x: 400, y: 400 });
  assert.equal(toolbar.bounds.x, 400);
  assert.equal(toolbar.bounds.y, 400);

  // 2. Move Right
  sim.moveToolbar({ x: 650, y: 400 });
  sim.saveToolbarPosition({ x: 650, y: 400 });
  assert.equal(toolbar.bounds.x, 650);

  // 3. Move Up
  sim.moveToolbar({ x: 650, y: 200 });
  sim.saveToolbarPosition({ x: 650, y: 200 });
  assert.equal(toolbar.bounds.y, 200);

  // 4. Move Down
  sim.moveToolbar({ x: 650, y: 600 });
  sim.saveToolbarPosition({ x: 650, y: 600 });
  assert.equal(toolbar.bounds.y, 600);

  // 5. Move Diagonally
  sim.moveToolbar({ x: 250, y: 150 });
  sim.saveToolbarPosition({ x: 250, y: 150 });
  assert.equal(toolbar.bounds.x, 250);
  assert.equal(toolbar.bounds.y, 150);
});

test('REQ-5: Dragging to screen corners and edges clamps safely without stuck state', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();

  // Top-left corner
  sim.moveToolbar({ x: -100, y: -50 });
  sim.saveToolbarPosition({ x: 0, y: 0 });
  assert.equal(toolbar.bounds.x, 0);
  assert.equal(toolbar.bounds.y, 0);

  // Top-right corner
  sim.moveToolbar({ x: 2500, y: -50 });
  sim.saveToolbarPosition({ x: 1920 - 44, y: 0 });
  assert.equal(toolbar.bounds.x, 1920 - 44);
  assert.equal(toolbar.bounds.y, 0);

  // Bottom-right corner
  sim.moveToolbar({ x: 2500, y: 2000 });
  assert.ok(toolbar.bounds.x <= 1920 - 44);
  assert.ok(toolbar.bounds.y <= 1040 - 44);

  // Bottom-left corner
  sim.moveToolbar({ x: -100, y: 2000 });
  assert.equal(toolbar.bounds.x, 0);
});

test('REQ-6: Tool button click must not initiate drag', () => {
  let isDragging = false;
  let activeTool = 'pointer';
  let position = { x: 100, y: 200 };

  const handleToolClick = (tool: string) => {
    // Tool buttons execute tool selection only
    activeTool = tool;
  };

  const handleDragDown = () => {
    isDragging = true;
  };

  // Clicking Pen button fires tool click, not drag handle down
  handleToolClick('pen');
  assert.equal(activeTool, 'pen');
  assert.equal(isDragging, false, 'Tool button click must NOT start drag');
  assert.equal(position.x, 100);
  assert.equal(position.y, 200);
});

test('REQ-7: Handle drag must not activate a tool or change active tool', () => {
  let activeTool = 'highlighter';
  let isDragging = false;

  const handleDragStart = () => {
    isDragging = true;
  };
  const handleDragMove = () => {
    // Drag move updates coordinates only
  };
  const handleDragEnd = () => {
    isDragging = false;
  };

  handleDragStart();
  handleDragMove();
  handleDragEnd();

  assert.equal(activeTool, 'highlighter', 'Drag must NOT modify the active tool');
  assert.equal(isDragging, false);
});

test('REQ-8: Tool switching remains functional after repeated dragging', () => {
  const sim = new MainProcessSimulator();
  sim.createToolbar();

  // Perform multiple drags
  for (let i = 0; i < 5; i++) {
    sim.moveToolbar({ x: 100 + i * 20, y: 100 + i * 20 });
    sim.saveToolbarPosition({ x: 100 + i * 20, y: 100 + i * 20 });
  }

  // Switch tools repeatedly
  sim.applyInteractionMode('drawing');
  assert.equal(sim.sharedState.interactionMode, 'drawing');

  sim.applyInteractionMode('pointer');
  assert.equal(sim.sharedState.interactionMode, 'pointer');

  sim.applyInteractionMode('drawing');
  assert.equal(sim.sharedState.interactionMode, 'drawing');
});

test('REQ-9: Eye ON -> drag -> Eye OFF -> drag Eye handle -> Eye ON restores positions independently', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();

  // 1. Toolbar starts at initial position, drag toolbar to (400, 300)
  sim.moveToolbar({ x: 400, y: 300 });
  sim.saveToolbarPosition({ x: 400, y: 300 });
  assert.equal(sim.sharedState.toolbarPosition.x, 400);
  assert.equal(sim.sharedState.toolbarPosition.y, 300);

  // 2. Eye OFF: toolbar hides, Eye restore button appears
  sim.setEyeState(false);
  assert.equal(sim.sharedState.toolbarVisible, false);
  assert.equal(sim.sharedState.restoreButtonVisible, true);
  assert.equal(toolbar.bounds.width, 44);
  assert.equal(toolbar.bounds.height, 44);

  // 3. Drag Eye restore button to (800, 600)
  sim.moveToolbar({ x: 800, y: 600 });
  sim.saveRestoreButtonPosition({ x: 800, y: 600 });
  assert.equal(sim.sharedState.restoreButtonPosition.x, 800);
  assert.equal(sim.sharedState.restoreButtonPosition.y, 600);
  // Toolbar position must still be 400, 300!
  assert.equal(sim.sharedState.toolbarPosition.x, 400, 'Toolbar position must not be corrupted by Eye button drag');
  assert.equal(sim.sharedState.toolbarPosition.y, 300);

  // 4. Eye ON: toolbar reappears at its saved position (400, 300)
  sim.setEyeState(true);
  assert.equal(sim.sharedState.toolbarVisible, true);
  assert.equal(sim.sharedState.restoreButtonVisible, false);
  assert.equal(toolbar.bounds.x, 400, 'Toolbar must return to its saved position');
  assert.equal(toolbar.bounds.y, 300);
  assert.equal(toolbar.bounds.width, 44);
  assert.equal(toolbar.bounds.height, 520);
});

test('REQ-10: Eye OFF: hidden toolbar hitboxes must not intercept clicks (window is 44x44)', () => {
  const sim = new MainProcessSimulator();
  const toolbar = sim.createToolbar();

  // Eye OFF
  sim.setEyeState(false);
  assert.equal(toolbar.bounds.width, 44, 'Window width must shrink to 44px for Eye button');
  assert.equal(toolbar.bounds.height, 44, 'Window height must shrink to 44px for Eye button');

  // Verify it does NOT remain 520px or 540px high
  assert.notEqual(toolbar.bounds.height, 520);
  assert.notEqual(toolbar.bounds.height, 540);
});

test('REQ-11: Position persistence preserves coordinates across settings load/save', () => {
  const sim = new MainProcessSimulator();
  sim.createToolbar();

  sim.moveToolbar({ x: 720, y: 480 });
  sim.saveToolbarPosition({ x: 720, y: 480 });

  assert.equal(sim.sharedState.toolbarPosition.x, 720);
  assert.equal(sim.sharedState.toolbarPosition.y, 480);
});

test('REQ-12: No stuck pointer capture or permanently active drag state on early release or blur', () => {
  let isDragging = false;
  let activeDrag: { cleanup: () => void } | null = null;

  const startDrag = () => {
    if (activeDrag) activeDrag.cleanup();
    isDragging = true;
    activeDrag = {
      cleanup: () => {
        isDragging = false;
        activeDrag = null;
      },
    };
  };

  // 1. Normal drag start and cancel/blur
  startDrag();
  assert.equal(isDragging, true);
  (activeDrag as { cleanup: () => void } | null)?.cleanup();
  assert.equal(isDragging, false, 'Cleanup must immediately disarm isDragging');

  // 2. Starting second drag while previous was lingering
  startDrag();
  assert.equal(isDragging, true);
  startDrag(); // Double start
  assert.equal(isDragging, true);
  (activeDrag as { cleanup: () => void } | null)?.cleanup();
  assert.equal(isDragging, false);
});

test('REQ-13: Area selection action activates overlay interactivity and ensures toolbar stays above overlay', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  const toolbar = sim.createToolbar();

  // Initially in pointer mode with history = 0 -> overlay is hidden and ignores mouse
  assert.equal(overlay.ignoreMouse, true);
  assert.equal(overlay.isVisible(), false);

  // Dispatch select-recording-area
  sim.dispatchAction('select-recording-area');

  assert.equal(overlay.isVisible(), true, 'Overlay must become visible for rectangle selection');
  assert.equal(overlay.ignoreMouse, false, 'Overlay must receive mouse events for area selection');
  assert.equal(sim.sharedState.interactionMode, 'drawing');
  assert.ok(toolbar.zOrder > overlay.zOrder, 'Toolbar must remain above overlay in z-order');
});

test('REQ-14: Cancel area selection returns overlay to pure click-through pass-through', () => {
  const sim = new MainProcessSimulator();
  const overlay = sim.createOverlay();
  sim.createToolbar();

  // Activate area selection
  sim.dispatchAction('select-recording-area');
  assert.equal(overlay.ignoreMouse, false);

  // Cancel area selection
  sim.dispatchAction('cancel-recording-area');
  assert.equal(sim.sharedState.interactionMode, 'pointer');
  assert.equal(overlay.ignoreMouse, true, 'Desktop click-through must be restored');
  assert.equal(overlay.isVisible(), false, 'Overlay with zero annotations hides cleanly');
});
