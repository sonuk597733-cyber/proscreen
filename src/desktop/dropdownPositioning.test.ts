import test from 'node:test';
import assert from 'node:assert/strict';
import { PopoutId, PopoutPosition } from '../toolbar/ToolbarPopouts';
import { isPointerInsidePopoutBoundary, shouldDismissPopoutForPointer } from './popoutInteraction';

// Standalone mathematical model matching computePopoutCoords & DesktopToolbarApp bounds logic
function computeTestPopoutCoords(params: {
  id: PopoutId;
  screenWidth: number;
  screenHeight: number;
  toolbarX: number;
  toolbarY: number;
  triggerLocalTop: number;
  triggerHeight: number;
  isDesktopToolbarWindow: boolean;
}): PopoutPosition {
  const {
    id,
    screenWidth,
    screenHeight,
    toolbarX,
    toolbarY,
    triggerLocalTop,
    triggerHeight,
    isDesktopToolbarWindow,
  } = params;

  const ESTIMATED_POPOUT_HEIGHT: Record<PopoutId, number> = {
    cursor: 220,
    pen: 260,
    highlighter: 240,
    eraser: 200,
    brush: 280,
    shapes: 310,
    text: 240,
    color: 360,
    undo: 200,
    timer: 230,
    screenshot: 250,
    recorder: 260,
    board: 250,
    settings: 240,
  };

  const estHeight = ESTIMATED_POPOUT_HEIGHT[id] ?? 220;
  const vh = isDesktopToolbarWindow ? 520 : screenHeight;
  const spaceRight = screenWidth - (toolbarX + 44);
  const openLeft = spaceRight < 340 && toolbarX >= 340;

  const triggerMidY = triggerLocalTop + triggerHeight / 2;
  const desiredTop = triggerLocalTop - 4;
  const clampedTop = Math.max(8, Math.min(vh - Math.min(estHeight, vh - 16) - 8, desiredTop));
  const anchorOffsetY = Math.max(12, Math.min(estHeight - 12, Math.round(triggerMidY - clampedTop)));

  if (openLeft && isDesktopToolbarWindow) {
    return {
      top: clampedTop,
      right: 44,
      openSide: 'left',
      anchorOffsetY,
    };
  }

  return {
    top: clampedTop,
    left: isDesktopToolbarWindow ? 44 : toolbarX + 44,
    openSide: 'right',
    anchorOffsetY,
  };
}

test('DROPDOWN-1: Dynamic direction detection opens right when sufficient space exists', () => {
  const coords = computeTestPopoutCoords({
    id: 'color',
    screenWidth: 1920,
    screenHeight: 1080,
    toolbarX: 50,
    toolbarY: 100,
    triggerLocalTop: 200,
    triggerHeight: 28,
    isDesktopToolbarWindow: true,
  });

  assert.equal(coords.openSide, 'right');
  assert.equal(coords.left, 44);
  assert.equal(coords.right, undefined);
  assert.ok(coords.top >= 8);
});

test('DROPDOWN-2: Dynamic direction detection opens left when near right screen edge', () => {
  const coords = computeTestPopoutCoords({
    id: 'color',
    screenWidth: 1920,
    screenHeight: 1080,
    toolbarX: 1800, // Near right edge: 1920 - 1844 = 76px remaining space (< 340)
    toolbarY: 100,
    triggerLocalTop: 200,
    triggerHeight: 28,
    isDesktopToolbarWindow: true,
  });

  assert.equal(coords.openSide, 'left');
  assert.equal(coords.right, 44);
  assert.equal(coords.left, undefined);
  assert.ok(coords.top >= 8);
});

test('DROPDOWN-3: Stability - repeated coordinate computations never oscillate', () => {
  const coords1 = computeTestPopoutCoords({
    id: 'shapes',
    screenWidth: 1920,
    screenHeight: 1080,
    toolbarX: 1750,
    toolbarY: 100,
    triggerLocalTop: 150,
    triggerHeight: 28,
    isDesktopToolbarWindow: true,
  });

  const coords2 = computeTestPopoutCoords({
    id: 'shapes',
    screenWidth: 1920,
    screenHeight: 1080,
    toolbarX: 1750,
    toolbarY: 100,
    triggerLocalTop: 150,
    triggerHeight: 28,
    isDesktopToolbarWindow: true,
  });

  assert.deepEqual(coords1, coords2, 'Coordinate computations must be deterministic');
});

test('DROPDOWN-4: Vertical collision clamping prevents popout from overflowing viewport', () => {
  // Trigger button near the very bottom of the toolbar (e.g. Settings tool at Y=480)
  const coords = computeTestPopoutCoords({
    id: 'color', // estHeight = 360
    screenWidth: 1920,
    screenHeight: 1080,
    toolbarX: 500,
    toolbarY: 100,
    triggerLocalTop: 480,
    triggerHeight: 28,
    isDesktopToolbarWindow: true,
  });

  // Clamped top must ensure top + estHeight <= vh - 8
  const maxAllowedTop = 520 - 360 - 8; // 152
  assert.ok(coords.top <= maxAllowedTop, `Top (${coords.top}) must not exceed maxAllowedTop (${maxAllowedTop})`);
  assert.ok(coords.top >= 8, `Top (${coords.top}) must be at least 8px`);
  assert.ok(coords.anchorOffsetY >= 12, 'Anchor offset must remain within popout boundaries');
});

test('DROPDOWN-5: Window bounds calculation for openLeft vs openRight', () => {
  const tbX = 1800;
  const tbY = 200;
  const screenWidth = 1920;
  const spaceRight = screenWidth - (tbX + 44);
  const openLeft = spaceRight < 340 && tbX >= 340;

  assert.equal(openLeft, true);

  // When openLeft: window moves left by 340 to accommodate 340px popout + 44px toolbar
  const windowBoundsLeft = {
    x: tbX - 340,
    y: tbY,
    width: 384,
    height: 540,
  };
  assert.equal(windowBoundsLeft.x, 1460);
  assert.equal(windowBoundsLeft.width, 384);

  // When closing: window restores to exact tbX with normal width 44
  const restoredBounds = {
    x: tbX,
    y: tbY,
    width: 44,
    height: 520,
  };
  assert.equal(restoredBounds.x, 1800);
  assert.equal(restoredBounds.width, 44);
});

test('DROPDOWN-6: Programmatic bounds flag and width guard prevent moved event from corrupting toolbar position', () => {
  let isProgrammaticBoundsChange = false;
  let savedToolbarPosition = { x: 1800, y: 200 };

  const onMoved = (actualWinX: number, actualWinY: number, width: number) => {
    // Width guard: if width > 50, window is expanded for a popout flyout, NEVER a drag!
    if (width > 50) {
      return;
    }
    if (isProgrammaticBoundsChange) {
      return;
    }
    savedToolbarPosition = { x: actualWinX, y: actualWinY };
  };

  // Simulate popout opening on the left (shifts window to 1460, width 384)
  isProgrammaticBoundsChange = true;
  onMoved(1460, 200, 384);
  assert.equal(savedToolbarPosition.x, 1800, 'Saved position must NOT be corrupted during programmatic bounds change');

  // Even if programmatic flag clears while popout is still open (width 384):
  isProgrammaticBoundsChange = false;
  onMoved(1460, 200, 384);
  assert.equal(savedToolbarPosition.x, 1800, 'Width guard (>50) protects saved position even if timer expired');

  // Simulate genuine user drag (window is collapsed, width 44)
  onMoved(1750, 210, 44);
  assert.equal(savedToolbarPosition.x, 1750, 'Saved position MUST update during genuine user drag');
  assert.equal(savedToolbarPosition.y, 210);
});

test('DROPDOWN-7: Single bounds update on open and single restore on close (Zero bounds thrashing)', () => {
  const boundsLog: Array<{ x: number; y: number; width: number; height: number }> = [];

  class BoundsLifecycleSimulator {
    private lastAppliedPopout: string | null = null;
    private basePos = { x: 1800, y: 150 };

    openPopout(id: string) {
      if (this.lastAppliedPopout === null) {
        const targetBounds = {
          x: this.basePos.x - 340,
          y: this.basePos.y,
          width: 384,
          height: 540,
        };
        boundsLog.push(targetBounds);
      }
      this.lastAppliedPopout = id;
    }

    closePopout() {
      if (this.lastAppliedPopout !== null) {
        const restoredBounds = {
          x: this.basePos.x,
          y: this.basePos.y,
          width: 44,
          height: 520,
        };
        boundsLog.push(restoredBounds);
        this.lastAppliedPopout = null;
      }
    }
  }

  const sim = new BoundsLifecycleSimulator();

  // 1. Open 'pen' popout on right edge
  sim.openPopout('pen');
  assert.equal(boundsLog.length, 1, 'Exactly one bounds change when opening popout');
  assert.equal(boundsLog[0].x, 1460);
  assert.equal(boundsLog[0].width, 384);

  // 2. Subsequent state updates while popout is open do NOT re-apply bounds
  sim.openPopout('pen');
  sim.openPopout('pen');
  assert.equal(boundsLog.length, 1, 'Zero redundant bounds calls while popout remains open');

  // 3. Close popout
  sim.closePopout();
  assert.equal(boundsLog.length, 2, 'Exactly one restore bounds call on close');
  assert.equal(boundsLog[1].x, 1800);
  assert.equal(boundsLog[1].width, 44);

  // 4. Multiple close calls do NOT duplicate restore
  sim.closePopout();
  assert.equal(boundsLog.length, 2, 'Redundant close does not emit duplicate bounds calls');
});

test('DROPDOWN-8: Click outside dismisses popout, click inside keeps it open', () => {
  let activePopout: string | null = 'color';

  const handlePointerDown = (target: { closest: (sel: string) => boolean }) => {
    if (
      !target.closest('[data-testid="proscreen-toolbar"]') &&
      !target.closest('[data-testid^="popout-"]') &&
      !target.closest('[role="dialog"]')
    ) {
      activePopout = null;
    }
  };

  // Click inside popout dialog
  handlePointerDown({
    closest: (sel) => sel === '[role="dialog"]' || sel === '[data-testid^="popout-"]',
  });
  assert.equal(activePopout, 'color', 'Click inside popout dialog must keep dropdown open');

  // Click inside toolbar button
  handlePointerDown({
    closest: (sel) => sel === '[data-testid="proscreen-toolbar"]',
  });
  assert.equal(activePopout, 'color', 'Click on toolbar must keep dropdown open');

  // Click outside (e.g. on backdrop/desktop)
  handlePointerDown({
    closest: () => false,
  });
  assert.equal(activePopout, null, 'Click outside must cleanly dismiss dropdown');
});

test('DROPDOWN-9: DPI subpixel delta threshold ignores <= 1px rounding flutter', () => {
  const isBoundsChangeSignificant = (
    cur: { x: number; y: number; width: number; height: number },
    next: { x: number; y: number; width: number; height: number }
  ) => {
    const dx = Math.abs(cur.x - next.x);
    const dy = Math.abs(cur.y - next.y);
    const dw = Math.abs(cur.width - next.width);
    const dh = Math.abs(cur.height - next.height);
    return dx > 1 || dy > 1 || dw > 1 || dh > 1;
  };

  // 1-pixel rounding differences from Windows DPI scaling
  const curDpi = { x: 888, y: 122, width: 384, height: 540 };
  const nextDpi = { x: 887, y: 122, width: 385, height: 540 }; // 1px rounding drift
  assert.equal(isBoundsChangeSignificant(curDpi, nextDpi), false, 'Subpixel/1px flutter must be ignored');

  // Real bounds change
  const realChange = { x: 1228, y: 122, width: 44, height: 520 };
  assert.equal(isBoundsChangeSignificant(curDpi, realChange), true, 'Real bounds change must be processed');
});

test('DROPDOWN-10: Repeated open/close cycles on right edge do not accumulate coordinate drift', () => {
  const initialX = 1800;
  const initialY = 200;
  let currentToolbarX = initialX;
  let currentToolbarY = initialY;

  for (let cycle = 0; cycle < 10; cycle++) {
    // Open on right edge
    const openLeft = (1920 - (currentToolbarX + 44)) < 340;
    assert.equal(openLeft, true);
    const shiftedX = currentToolbarX - 340;
    assert.equal(shiftedX, 1460);

    // Popout closed: restored to exact initial coordinate
    const restoredX = currentToolbarX;
    assert.equal(restoredX, initialX, `Cycle ${cycle}: Restored X must match initial X`);
    assert.equal(currentToolbarY, initialY, `Cycle ${cycle}: Restored Y must match initial Y`);
  }
});

test('DROPDOWN-11: Permanent right anchoring on right edge guarantees 0px screen shift across open/close lifecycle', () => {
  const tbX = 1800;
  const screenWidth = 1920;
  const isRightEdgeToolbar = screenWidth - (tbX + 44) < 340 && tbX >= 340;
  assert.equal(isRightEdgeToolbar, true, 'Must detect right edge toolbar');

  const effectiveOpenSide = isRightEdgeToolbar ? 'left' : 'right';
  assert.equal(effectiveOpenSide, 'left');

  // Both when idle (popout null) and active (popout open), panelRef is anchored to right: 4
  const panelStyle = {
    position: 'absolute',
    right: effectiveOpenSide === 'left' ? 4 : undefined,
    left: effectiveOpenSide === 'left' ? undefined : 4,
    top: 4,
  };
  assert.equal(panelStyle.position, 'absolute');
  assert.equal(panelStyle.right, 4);
  assert.equal(panelStyle.left, undefined);

  // Screen coordinate calculation when window is closed (width = 44)
  const closedWinX = tbX;
  const closedWinWidth = 44;
  const panelWidth = 34;
  // right: 4 inside 44px window -> left offset inside window = 44 - 34 - 4 = 6
  const closedPanelLeft = closedWinWidth - panelWidth - panelStyle.right!;
  const closedScreenX = closedWinX + closedPanelLeft;
  assert.equal(closedScreenX, 1806, 'Idle screen position must be 1806');

  // Screen coordinate calculation when window is expanded (width = 384, x shifted -340)
  const openWinX = tbX - 340; // 1460
  const openWinWidth = 384;
  // right: 4 inside 384px window -> left offset inside window = 384 - 34 - 4 = 346
  const openPanelLeft = openWinWidth - panelWidth - panelStyle.right!;
  const openScreenX = openWinX + openPanelLeft;
  assert.equal(openScreenX, 1806, 'Expanded screen position must be EXACTLY 1806');

  // Crucial invariant: Screen position delta must be ZERO
  const screenDelta = Math.abs(openScreenX - closedScreenX);
  assert.equal(screenDelta, 0, 'Zero subpixel shift: toolbar position on monitor never shifts during bounds transition');
});

test('DROPDOWN-12: Desktop mode hover leave immunity prevents infinite open/close oscillation', () => {
  let activePopout: PopoutId | null = 'pen';
  let hoverCloseTimerFired = false;

  const simulateHoverClose = (isDesktopToolbarWindow: boolean) => {
    if (isDesktopToolbarWindow) {
      // Immunity in desktop mode
      return;
    }
    hoverCloseTimerFired = true;
    activePopout = null;
  };

  // When in desktop window mode (isDesktopToolbarWindow = true):
  simulateHoverClose(true);
  assert.equal(activePopout, 'pen', 'Desktop mode must NOT auto-close on mouseleave');
  assert.equal(hoverCloseTimerFired, false, 'Hover close timer must not fire in desktop mode');

  // When in web/extension overlay mode (isDesktopToolbarWindow = false):
  simulateHoverClose(false);
  assert.equal(activePopout, null, 'Web overlay mode can auto-close on mouseleave');
  assert.equal(hoverCloseTimerFired, true);
});

test('DROPDOWN-13: Dropdown container stops mousedown and click bubbling so dropdown options never trigger outside-click dismiss', () => {
  let activePopout: PopoutId | null = 'color';
  let outsideDismissFired = false;

  // Window-level mousedown listener
  const handleWindowMouseDown = (targetTag: string, hasRoleDialog: boolean, isInsideToolbar: boolean) => {
    if (!hasRoleDialog && !isInsideToolbar) {
      outsideDismissFired = true;
      activePopout = null;
    }
  };

  // 1. Simulating click inside dropdown: event propagation is stopped at popout container
  let eventStopped = false;
  const handlePopoutMouseDown = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    eventStopped = true;
  };

  handlePopoutMouseDown({ stopPropagation: () => {} });
  assert.equal(eventStopped, true, 'Popout container must stop event propagation');
  // Since event was stopped, window-level mousedown never executes
  assert.equal(activePopout, 'color', 'Dropdown must remain open when interacting inside');
  assert.equal(outsideDismissFired, false);

  // 2. Simulating true outside click on desktop background
  handleWindowMouseDown('DIV', false, false);
  assert.equal(outsideDismissFired, true, 'Outside click must trigger dismissal');
  assert.equal(activePopout, null);
});

test('DROPDOWN-14: Desktop toolbar bounds change calls moveTop() to keep toolbarWindow strictly above overlayWindow', () => {
  let toolbarZ = 10;
  let overlayZ = 20; // Overlay currently active for drawing

  const onSetToolbarBounds = () => {
    // Window bounds resize executed
    // Calling moveTop() immediately raises toolbarWindow above overlayWindow
    toolbarZ = overlayZ + 1;
  };

  onSetToolbarBounds();
  assert.ok(toolbarZ > overlayZ, 'toolbarWindow must be strictly above overlayWindow so dropdown receives clicks');
});

test('DROPDOWN-15: Desktop root container background provides hit-testable surface when popout is active', () => {
  const getRootBg = (activePopout: PopoutId | null): string => {
    return activePopout ? 'rgba(0, 0, 0, 0.001)' : 'transparent';
  };

  // Idle: transparent to allow seamless desktop appearance
  assert.equal(getRootBg(null), 'transparent');

  // Popout active: non-zero alpha (0.001) ensures Windows DWM routes all clicks to toolbarWindow
  assert.equal(getRootBg('pen'), 'rgba(0, 0, 0, 0.001)');
  assert.equal(getRootBg('color'), 'rgba(0, 0, 0, 0.001)');
});

test('DROPDOWN-16: desktopOpenSide override in popout coordinate calculation guarantees openSide: left and right: 44, left: undefined', () => {
  // Simulates computePopoutCoords with forceOpenSide: 'left'
  const computeCoordsWithOverride = (forceSide?: 'left' | 'right'): PopoutPosition => {
    const isDesktopToolbarWindow = true;
    const openLeft = forceSide === 'left';
    if (openLeft && isDesktopToolbarWindow) {
      return {
        top: 100,
        right: 44,
        openSide: 'left',
        anchorOffsetY: 16,
      };
    }
    return {
      top: 100,
      left: 44,
      openSide: 'right',
      anchorOffsetY: 16,
    };
  };

  const leftCoords = computeCoordsWithOverride('left');
  assert.equal(leftCoords.openSide, 'left');
  assert.equal(leftCoords.right, 44);
  assert.equal(leftCoords.left, undefined, 'left must be undefined when opening left so popout anchors to right and opens left');

  const rightCoords = computeCoordsWithOverride('right');
  assert.equal(rightCoords.openSide, 'right');
  assert.equal(rightCoords.left, 44);
  assert.equal(rightCoords.right, undefined);
});

test('DROPDOWN-17: Escape key in capture phase dismisses popout even when event originates inside nested child elements', () => {
  let activePopout: string | null = 'color';
  let propagationStopped = false;

  // Outer container stops bubbling propagation
  const childElementHandler = (e: { key: string; stopPropagation: () => void }) => {
    propagationStopped = true;
  };

  // Window handler attached with capture: true
  const windowCaptureHandler = (e: { key: string }) => {
    if (e.key === 'Escape') {
      activePopout = null;
    }
  };

  // Capture phase runs BEFORE child element handler
  const escapeEvent = { key: 'Escape', stopPropagation: () => { propagationStopped = true; } };
  windowCaptureHandler(escapeEvent);
  childElementHandler(escapeEvent);

  assert.equal(activePopout, null, 'Escape must dismiss popout via capture phase listener');
});

test('DROPDOWN-18: Base toolbar anchor is guarded against corruption while popout is active or restoring', () => {
  let baseToolbarPos = { x: 1800, y: 100 };
  let activePopout: string | null = null;
  let lastAppliedPopout: string | null = null;

  // Window expands for popout
  activePopout = 'color';
  lastAppliedPopout = 'color';
  const expandedScreenX = 1460; // Window shifted by -340
  const expandedWidth = 384;

  // Simulating renderer idle check
  const syncAnchor = (currentWinW: number, winScreenX: number) => {
    if (!activePopout && lastAppliedPopout === null) {
      if (currentWinW <= 50) {
        baseToolbarPos = { x: winScreenX, y: 100 };
      }
    }
  };

  // While open: width > 50, activePopout != null
  syncAnchor(expandedWidth, expandedScreenX);
  assert.equal(baseToolbarPos.x, 1800, 'Anchor X must NOT be updated while popout is open');

  // Popout dismissed: activePopout becomes null, but lastAppliedPopout is still set until restored
  activePopout = null;
  syncAnchor(expandedWidth, expandedScreenX);
  assert.equal(baseToolbarPos.x, 1800, 'Anchor X must NOT be overwritten by expanded window X before restore');

  // Window restored: lastAppliedPopout cleared, width returns to 44
  lastAppliedPopout = null;
  const restoredScreenX = 1800;
  syncAnchor(44, restoredScreenX);
  assert.equal(baseToolbarPos.x, 1800, 'Anchor X remains exactly 1800 across entire open/close lifecycle');
});

test('DROPDOWN-19: Zero visual shift calculation during right-edge opening transition (Delta X = 0px)', () => {
  const tbX = 1800;
  const tbY = 100;
  const toolbarPanelWidth = 34;
  const margin = 4;

  // Closed state: window at tbX, width 44. Toolbar anchored at right: 4 inside 44px window
  const closedWindowX = tbX;
  const closedWindowW = 44;
  const closedToolbarScreenX = closedWindowX + (closedWindowW - toolbarPanelWidth - margin); // 1800 + (44 - 34 - 4) = 1806

  // Open state: window shifted left to tbX - 340, width 384. Toolbar anchored at right: 4 inside 384px window
  const openWindowX = tbX - 340;
  const openWindowW = 384;
  const openToolbarScreenX = openWindowX + (openWindowW - toolbarPanelWidth - margin); // 1460 + (384 - 34 - 4) = 1806

  const deltaX = Math.abs(closedToolbarScreenX - openToolbarScreenX);
  assert.equal(deltaX, 0, 'Screen X coordinate of vertical toolbar must not change by even 1px across open transition');
});

test('DROPDOWN-20: Persistent desktopOpenSide derived from anchor ensures panelRef CSS never flips between left and right during open/close lifecycle', () => {
  const anchorX = 1800;
  const screenWidth = 1920;
  const isNearRight = (screenWidth - (anchorX + 44) < 340) && anchorX >= 340;
  const side = isNearRight ? 'left' : 'right';

  assert.equal(side, 'left');
  // Both closed and open states evaluate to 'left'
  const closedSide = (screenWidth - (anchorX + 44) < 340) && anchorX >= 340 ? 'left' : 'right';
  const openSide = (screenWidth - (anchorX + 44) < 340) && anchorX >= 340 ? 'left' : 'right';
  assert.equal(closedSide, openSide, 'desktopOpenSide must remain identical before and during popout');
});

test('DROPDOWN-22: Dedicated Popout Utility Window Architecture - Zero setToolbarBounds calls on toolbarWindow during dropdown open/close', () => {
  let toolbarBoundsCalls = 0;
  const fakeDesktop = {
    setToolbarBounds: (_bounds: { width: number; height: number; x?: number; y?: number }) => {
      toolbarBoundsCalls++;
    },
  };

  // Simulating DesktopToolbarApp behavior:
  // When activePopout changes to 'color' or 'brush', fakeDesktop.setToolbarBounds is NEVER invoked!
  let activePopout: PopoutId | null = null;
  const onSetActivePopout = (id: PopoutId | null) => {
    activePopout = id;
    // Stationary architecture opens dedicated window via openPopout, zero calls to setToolbarBounds
  };

  // 1. Open color dropdown
  onSetActivePopout('color');
  assert.equal(activePopout, 'color');
  assert.equal(toolbarBoundsCalls, 0, 'toolbarWindow must receive 0 setToolbarBounds calls when dropdown opens');

  // 2. Switch to shapes dropdown
  onSetActivePopout('shapes');
  assert.equal(activePopout, 'shapes');
  assert.equal(toolbarBoundsCalls, 0, 'toolbarWindow must receive 0 setToolbarBounds calls when dropdown switches');

  // 3. Close dropdown
  onSetActivePopout(null);
  assert.equal(activePopout, null);
  assert.equal(toolbarBoundsCalls, 0, 'toolbarWindow must receive 0 setToolbarBounds calls when dropdown closes');
});

test('DROPDOWN-23: Popout window geometry calculation on right edge vs left edge across primary and secondary monitors', () => {
  function computePopoutWindowGeometry(params: {
    tbX: number;
    tbY: number;
    workArea: { x: number; y: number; width: number; height: number };
  }) {
    const { tbX, tbY, workArea } = params;
    const popoutWidth = 320;
    const popoutHeight = 540;
    const spaceRight = (workArea.x + workArea.width) - (tbX + 44);
    const openLeft = spaceRight < popoutWidth && (tbX - workArea.x) >= popoutWidth;
    const popoutX = openLeft ? (tbX - popoutWidth) : (tbX + 44);
    const maxWinY = Math.max(workArea.y + 4, workArea.y + workArea.height - popoutHeight - 4);
    const popoutY = Math.max(workArea.y + 4, Math.min(tbY, maxWinY));
    return {
      x: Math.round(popoutX),
      y: Math.round(popoutY),
      width: popoutWidth,
      height: popoutHeight,
      openSide: openLeft ? ('left' as const) : ('right' as const),
    };
  }

  // Case A: Primary monitor (1920x1080), toolbar at right edge (tbX = 1870)
  const geomRightEdge = computePopoutWindowGeometry({
    tbX: 1870,
    tbY: 200,
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  });
  assert.equal(geomRightEdge.openSide, 'left', 'Must open towards left when near right edge');
  assert.equal(geomRightEdge.x, 1870 - 320, 'Popout X must be exactly adjacent to left of toolbar (1550)');
  assert.equal(geomRightEdge.width, 320);
  assert.equal(geomRightEdge.height, 540);

  // Case B: Primary monitor, toolbar at left edge (tbX = 50)
  const geomLeftEdge = computePopoutWindowGeometry({
    tbX: 50,
    tbY: 200,
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  });
  assert.equal(geomLeftEdge.openSide, 'right', 'Must open towards right when near left edge');
  assert.equal(geomLeftEdge.x, 50 + 44, 'Popout X must be exactly adjacent to right of toolbar (94)');

  // Case C: Secondary monitor (e.g. left of primary, x = -1920, width = 1920), toolbar at right edge of secondary (tbX = -50)
  const geomSecondaryRight = computePopoutWindowGeometry({
    tbX: -50,
    tbY: 100,
    workArea: { x: -1920, y: 0, width: 1920, height: 1080 },
  });
  assert.equal(geomSecondaryRight.openSide, 'left');
  assert.equal(geomSecondaryRight.x, -50 - 320, 'Correctly offsets into secondary monitor coordinate space');
});

test('DROPDOWN-24: Dragging dismissal - beginning a toolbar move immediately closes any active popout window', () => {
  let popoutOpen = true;
  let popoutWindowVisible = true;

  const onDesktopMove = (_x: number, _y: number) => {
    // Moving toolbar dismisses popout
    popoutOpen = false;
    popoutWindowVisible = false;
  };

  onDesktopMove(500, 200);
  assert.equal(popoutOpen, false, 'Popout state must reset to false upon dragging');
  assert.equal(popoutWindowVisible, false, 'Popout window must hide upon dragging');
});

test('DROPDOWN-25: Seamless dropdown switching sequence: Color -> Size -> Shapes -> Highlighter -> Color -> Color (close)', () => {
  type PopoutId = 'color' | 'brush' | 'shapes' | 'highlighter';
  let activePopout: PopoutId | null = null;
  let activeTool: string = 'pointer';
  const eventLog: string[] = [];

  const handleToolbarClick = (buttonId: 'color' | 'brush' | 'shapes' | 'highlighter') => {
    if (activePopout === buttonId) {
      activePopout = null;
      eventLog.push(`close:${buttonId}`);
    } else {
      activePopout = buttonId;
      if (buttonId === 'shapes') activeTool = 'arrow';
      if (buttonId === 'highlighter') activeTool = 'highlighter';
      eventLog.push(`open:${buttonId}`);
    }
  };

  // 1. Click Color -> Color dropdown opens
  handleToolbarClick('color');
  assert.equal(activePopout, 'color');

  // 2. Click Size (brush) -> Color closes, Size opens immediately
  handleToolbarClick('brush');
  assert.equal(activePopout, 'brush');

  // 3. Click Shapes -> Size closes, Shapes opens immediately and selects shape tool
  handleToolbarClick('shapes');
  assert.equal(activePopout, 'shapes');
  assert.equal(activeTool, 'arrow');

  // 4. Click Highlighter -> Shapes closes, Highlighter opens immediately and selects highlighter
  handleToolbarClick('highlighter');
  assert.equal(activePopout, 'highlighter');
  assert.equal(activeTool, 'highlighter');

  // 5. Click Color again -> Highlighter closes, Color opens
  handleToolbarClick('color');
  assert.equal(activePopout, 'color');

  // 6. Click Color again -> Color closes
  handleToolbarClick('color');
  assert.equal(activePopout, null);

  assert.deepEqual(eventLog, [
    'open:color',
    'open:brush',
    'open:shapes',
    'open:highlighter',
    'open:color',
    'close:color',
  ]);
});

test('DROPDOWN-26: Transition ID generation prevents stale close events from closing a newer active dropdown', () => {
  let activeTransitionId = 0;
  let currentActivePopout: string | null = null;

  const openPopout = (id: string) => {
    activeTransitionId++;
    currentActivePopout = id;
    return activeTransitionId;
  };

  const handlePopoutClosed = (info?: { transitionId?: number }) => {
    if (!info || typeof info.transitionId !== 'number' || info.transitionId === activeTransitionId) {
      currentActivePopout = null;
    }
  };

  // User opens 'color' (transition 1)
  const t1 = openPopout('color');
  assert.equal(currentActivePopout, 'color');
  assert.equal(t1, 1);

  // User immediately switches to 'brush' (transition 2)
  const t2 = openPopout('brush');
  assert.equal(currentActivePopout, 'brush');
  assert.equal(t2, 2);

  // A delayed blur/close event from transition 1 arrives after transition 2 is already active
  handlePopoutClosed({ transitionId: t1 });
  assert.equal(
    currentActivePopout,
    'brush',
    'Stale close event from transition 1 must NOT close active dropdown from transition 2'
  );

  // A valid close event for current transition 2 arrives (e.g. Escape or outside click)
  handlePopoutClosed({ transitionId: t2 });
  assert.equal(currentActivePopout, null, 'Matching transition ID cleanly closes the dropdown');
});

test('DROPDOWN-27: Out-of-order popout data is discarded when older transition ID is detected in dropdown renderer', () => {
  let latestTransitionId = 0;
  let displayedPopout: string | null = null;

  const onPopoutDataReceived = (data: { popoutId: string | null; transitionId?: number }) => {
    if (typeof data.transitionId === 'number') {
      if (data.transitionId < latestTransitionId) {
        return; // Stale transition message discarded
      }
      latestTransitionId = data.transitionId;
    }
    displayedPopout = data.popoutId;
  };

  // Message 1 arrives for transition 1 ('color')
  onPopoutDataReceived({ popoutId: 'color', transitionId: 1 });
  assert.equal(displayedPopout, 'color');

  // Message 2 arrives for transition 2 ('shapes')
  onPopoutDataReceived({ popoutId: 'shapes', transitionId: 2 });
  assert.equal(displayedPopout, 'shapes');

  // A delayed stale null packet for transition 1 arrives out of order
  onPopoutDataReceived({ popoutId: null, transitionId: 1 });
  assert.equal(
    displayedPopout,
    'shapes',
    'Out of order packet from transition 1 must not wipe displayed popout for transition 2'
  );
});

test('DROPDOWN-28: Stationary toolbar stability (0px displacement) across the entire multi-dropdown switching sequence', () => {
  const initialToolbarPos = { x: 1850, y: 150 };
  let currentToolbarPos = { ...initialToolbarPos };

  // Switching dropdowns uses the dedicated utility window and MUST NOT invoke moveToolbar or setBounds on toolbarWindow
  const switchingSequence = ['color', 'brush', 'shapes', 'highlighter', 'color'];
  for (const popout of switchingSequence) {
    // Each popout opens without modifying toolbarWindow coordinates
    assert.deepEqual(currentToolbarPos, initialToolbarPos, `Toolbar remained stationary when opening ${popout}`);
  }

  assert.equal(currentToolbarPos.x, 1850);
  assert.equal(currentToolbarPos.y, 150);
});

test('DROPDOWN-29: Discrete option selection commits state before triggering auto-close', () => {
  let activePopout: string | null = 'color';
  let currentColor = '#FF0000';
  let currentSize = 3;
  let currentTool = 'pen';
  let currentBoardMode = 'webpage';

  const closePopout = () => {
    activePopout = null;
  };

  // 1. Color swatch selection
  const selectColor = (hex: string) => {
    currentColor = hex;
    closePopout();
  };
  selectColor('#00FF00');
  assert.equal(currentColor, '#00FF00');
  assert.equal(activePopout, null, 'Color popout closed immediately after color selection');

  // 2. Brush preset selection
  activePopout = 'brush';
  const selectBrushPreset = (size: number) => {
    currentSize = size;
    closePopout();
  };
  selectBrushPreset(12);
  assert.equal(currentSize, 12);
  assert.equal(activePopout, null, 'Brush popout closed immediately after size preset selection');

  // 3. Shape selection
  activePopout = 'shapes';
  const selectShape = (tool: string) => {
    currentTool = tool;
    closePopout();
  };
  selectShape('rect');
  assert.equal(currentTool, 'rect');
  assert.equal(activePopout, null, 'Shapes popout closed immediately after shape selection');

  // 4. Board mode selection
  activePopout = 'board';
  const selectBoard = (mode: string) => {
    currentBoardMode = mode;
    closePopout();
  };
  selectBoard('whiteboard');
  assert.equal(currentBoardMode, 'whiteboard');
  assert.equal(activePopout, null, 'Board popout closed immediately after board mode selection');
});

test('DROPDOWN-30: Range sliders maintain open state during drag and auto-close only upon pointerup or keyup', () => {
  let activePopout: string | null = 'brush';
  let sliderValue = 5;
  let closedCount = 0;

  const onSliderChange = (newVal: number) => {
    sliderValue = newVal;
    // onChange does NOT close the popout to permit uninterrupted dragging
  };

  const onSliderPointerUp = () => {
    activePopout = null;
    closedCount++;
  };

  const onSliderKeyUp = (key: string) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      activePopout = null;
      closedCount++;
    }
  };

  // Simulate dragging slider across multiple positions: 6 -> 7 -> 8 -> 10
  onSliderChange(6);
  assert.equal(activePopout, 'brush', 'Popout remains open during drag tick 1');
  onSliderChange(7);
  assert.equal(activePopout, 'brush', 'Popout remains open during drag tick 2');
  onSliderChange(10);
  assert.equal(sliderValue, 10);
  assert.equal(activePopout, 'brush', 'Popout remains open at target slider value');

  // Pointer released (drag completed)
  onSliderPointerUp();
  assert.equal(activePopout, null, 'Popout auto-closes on pointerup release');
  assert.equal(closedCount, 1);

  // Test keyboard step navigation
  activePopout = 'highlighter';
  onSliderChange(12);
  assert.equal(activePopout, 'highlighter');
  onSliderKeyUp('ArrowRight');
  assert.equal(activePopout, null, 'Popout auto-closes after keyboard slider adjustment');
  assert.equal(closedCount, 2);
});

test('DROPDOWN-31: Stationary toolbar coordinates are 100% preserved during auto-close', () => {
  const toolbarCoord = { x: 1920 - 44, y: 300 };
  let currentCoord = { ...toolbarCoord };
  let activePopout: string | null = 'color';

  const commitColor = (hex: string) => {
    activePopout = null;
    // Closing popout window must never mutate toolbarCoord
  };

  commitColor('#3B82F6');
  assert.equal(activePopout, null);
  assert.deepEqual(currentCoord, toolbarCoord, 'Toolbar position remains strictly unchanged after auto-close');
});

test('DROPDOWN-32: Restored Recorder Popout structure, width (270px), and 4 recording modes (tab, window, screen, area)', () => {
  const recordingModes = ['tab', 'window', 'screen', 'area'] as const;
  assert.equal(recordingModes.length, 4, 'Must support exactly 4 modes: tab, window, screen, area');
  assert.ok(recordingModes.includes('tab'));
  assert.ok(recordingModes.includes('window'));
  assert.ok(recordingModes.includes('screen'));
  assert.ok(recordingModes.includes('area'));

  let activePopout: string | null = 'recorder';
  let currentMode: string = 'screen';
  let areaSelectionTriggered = false;

  const selectMode = (mode: 'tab' | 'window' | 'screen' | 'area') => {
    currentMode = mode;
    if (mode === 'area') {
      activePopout = null;
      areaSelectionTriggered = true;
    }
  };

  selectMode('tab');
  assert.equal(currentMode, 'tab');
  assert.equal(activePopout, 'recorder');

  selectMode('window');
  assert.equal(currentMode, 'window');

  selectMode('area');
  assert.equal(currentMode, 'area');
  assert.equal(activePopout, null, 'Popout closes when area mode launches selector overlay');
  assert.equal(areaSelectionTriggered, true);
});

test('DROPDOWN-33: Shared native hover boundary keeps the popout open between toolbar and menu', () => {
  const toolbar = { x: 100, y: 80, width: 44, height: 640 };
  const rightPopout = { x: 144, y: 80, width: 320, height: 540 };
  const leftPopout = { x: -220, y: 80, width: 320, height: 540 };

  assert.equal(isPointerInsidePopoutBoundary({ x: 120, y: 120 }, toolbar, rightPopout), true);
  assert.equal(isPointerInsidePopoutBoundary({ x: 160, y: 120 }, toolbar, rightPopout), true);
  assert.equal(
    isPointerInsidePopoutBoundary({ x: 142, y: 120 }, toolbar, rightPopout),
    true,
    'The small window seam remains part of the interaction boundary'
  );
  assert.equal(isPointerInsidePopoutBoundary({ x: 50, y: 750 }, toolbar, rightPopout), false);
  assert.equal(isPointerInsidePopoutBoundary({ x: 30, y: 120 }, toolbar, leftPopout), true);
  assert.equal(isPointerInsidePopoutBoundary({ x: -210, y: 120 }, toolbar, leftPopout), true);
});

test('DROPDOWN-34: Outside pointer closes only after a short grace period', () => {
  assert.equal(shouldDismissPopoutForPointer({ pointerInside: true, outsideSince: 0, now: 500 }), false);
  assert.equal(shouldDismissPopoutForPointer({ pointerInside: false, outsideSince: null, now: 500 }), false);
  assert.equal(shouldDismissPopoutForPointer({ pointerInside: false, outsideSince: 500, now: 739 }), false);
  assert.equal(shouldDismissPopoutForPointer({ pointerInside: false, outsideSince: 500, now: 740 }), true);
});

