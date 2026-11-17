import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PopoutTransitionCoordinator,
  classifyForwardedShortcut,
  computeFloatingZOrderStack,
  shouldOverlayReceiveMouse,
  shouldToolbarApplyPopoutClosed,
} from './interactionLifecycle';
import {
  computePrimaryWindowBounds,
  evaluateStartupWindowHealth,
  shouldLaunchMainStudioWindow,
} from './startupLifecycle';

test('LIFECYCLE-01: Popout open -> blur close clears toolbar activePopout across 20 repeated cycles', () => {
  const coordinator = new PopoutTransitionCoordinator();
  let toolbarSeq = 0;
  let openSessionId = 0;
  let toolbarActivePopout: string | null = null;

  for (let i = 1; i <= 20; i++) {
    toolbarSeq += 1;
    const requestedId = toolbarSeq;
    openSessionId = requestedId;
    toolbarActivePopout = i % 2 === 0 ? 'color' : 'pen';

    const opened = coordinator.open(toolbarActivePopout, requestedId);
    assert.equal(opened.accepted, true);
    assert.equal(opened.transitionId, requestedId);

    // Popout loses focus (blur / Escape inside popout) — Main echoes exact session transitionId
    const closed = coordinator.close();
    assert.equal(closed.shouldClose, true);
    assert.equal(closed.transitionId, requestedId);

    const shouldClear = shouldToolbarApplyPopoutClosed(openSessionId, {
      transitionId: closed.transitionId,
    });
    assert.equal(shouldClear, true, `Cycle ${i}: activePopout must clear on blur close`);
    openSessionId = 0;
    toolbarActivePopout = null;
    assert.equal(toolbarActivePopout, null);
  }
});

test('LIFECYCLE-02: Rapid popout switching discards stale close of superseded transitionId', () => {
  const coordinator = new PopoutTransitionCoordinator();

  // Open Pen (#1), then immediately switch to Shapes (#2)
  const penOpen = coordinator.open('pen', 1);
  assert.equal(penOpen.accepted, true);
  assert.equal(coordinator.currentPopoutId, 'pen');

  const shapesOpen = coordinator.open('shapes', 2);
  assert.equal(shapesOpen.accepted, true);
  assert.equal(coordinator.currentPopoutId, 'shapes');
  assert.equal(coordinator.currentSessionId, 2);

  // Stale close request carrying transitionId=1 must be ignored by main & toolbar
  const staleMainClose = coordinator.close(1);
  assert.equal(staleMainClose.shouldClose, false);
  assert.equal(coordinator.currentPopoutId, 'shapes');

  const toolbarIgnoresStale = shouldToolbarApplyPopoutClosed(2, { transitionId: 1 });
  assert.equal(toolbarIgnoresStale, false);

  // Legitimate close of #2 closes cleanly
  const validClose = coordinator.close(2);
  assert.equal(validClose.shouldClose, true);
  assert.equal(validClose.transitionId, 2);
  assert.equal(coordinator.currentPopoutId, null);
});

test('LIFECYCLE-03: Out-of-order stale open request cannot resurrect an older popout', () => {
  const coordinator = new PopoutTransitionCoordinator();
  coordinator.open('color', 5);
  coordinator.close(5);

  const staleOpen = coordinator.open('pen', 4);
  assert.equal(staleOpen.accepted, false);
  assert.equal(coordinator.currentPopoutId, null);
  assert.equal(coordinator.lastTransitionId, 5);
});

test('LIFECYCLE-04: Explicit toolbar close (drag / outside click) preserves monotonic sync', () => {
  const coordinator = new PopoutTransitionCoordinator();
  let toolbarSeq = 0;

  toolbarSeq += 1;
  let openSessionId = toolbarSeq;
  coordinator.open('brush', openSessionId);

  // Toolbar starts drag -> sends openSessionId without bumping seq
  const dragClose = coordinator.close(openSessionId);
  assert.equal(dragClose.shouldClose, true);
  assert.equal(dragClose.transitionId, 1);
  assert.equal(shouldToolbarApplyPopoutClosed(openSessionId, { transitionId: dragClose.transitionId }), true);
  openSessionId = 0;

  // Next hover/click increments seq to 2 -> accepted immediately
  toolbarSeq += 1;
  openSessionId = toolbarSeq;
  const nextOpen = coordinator.open('recorder', openSessionId);
  assert.equal(nextOpen.accepted, true);
  assert.equal(nextOpen.transitionId, 2);
});

test('LIFECYCLE-05: Floating window Z-order always places overlay strictly below recordingBar, toolbar, and popout', () => {
  const fullStack = computeFloatingZOrderStack({
    overlayVisible: true,
    recordingBarVisible: true,
    toolbarVisible: true,
    popoutVisible: true,
  });
  assert.deepEqual(fullStack, ['overlay', 'recordingBar', 'toolbar', 'popout']);

  const drawingWithoutPopout = computeFloatingZOrderStack({
    overlayVisible: true,
    recordingBarVisible: false,
    toolbarVisible: true,
    popoutVisible: false,
  });
  assert.deepEqual(drawingWithoutPopout, ['overlay', 'toolbar']);

  assert.ok(
    drawingWithoutPopout.indexOf('toolbar') > drawingWithoutPopout.indexOf('overlay'),
    'Toolbar must always be ordered strictly above overlay after drawing strokes / sync-state'
  );
});

test('LIFECYCLE-06: Overlay mouse pass-through rules hold for pointer, drawing, Eye OFF, and modals', () => {
  assert.equal(
    shouldOverlayReceiveMouse({
      interactionMode: 'pointer',
      toolbarVisible: true,
      annotationsVisible: true,
      activeTool: 'pointer',
    }),
    false
  );

  assert.equal(
    shouldOverlayReceiveMouse({
      interactionMode: 'drawing',
      toolbarVisible: true,
      annotationsVisible: true,
      activeTool: 'pen',
    }),
    true
  );

  assert.equal(
    shouldOverlayReceiveMouse({
      interactionMode: 'drawing',
      toolbarVisible: false,
      annotationsVisible: true,
      activeTool: 'pen',
    }),
    false,
    'Eye OFF must force overlay pass-through even if activeTool was not yet reset'
  );

  assert.equal(
    shouldOverlayReceiveMouse({
      interactionMode: 'pointer',
      toolbarVisible: true,
      annotationsVisible: true,
      activeTool: 'pointer',
      hasBlockingOverlayModal: true,
    }),
    true,
    'Active capture / preview modal must receive mouse events'
  );
});

test('LIFECYCLE-07: Forwarded Delete / Undo / Redo shortcuts work on non-editable targets and skip inputs', () => {
  assert.deepEqual(classifyForwardedShortcut({ key: 'Delete' }), { action: 'delete-selected' });
  assert.deepEqual(classifyForwardedShortcut({ key: 'Backspace' }), { action: 'delete-selected' });
  assert.deepEqual(classifyForwardedShortcut({ key: 'z', ctrlKey: true }), {
    action: 'undo',
    payload: 'all',
  });
  assert.deepEqual(classifyForwardedShortcut({ key: 'Z', ctrlKey: true, shiftKey: true }), {
    action: 'redo',
    payload: 'all',
  });
  assert.deepEqual(classifyForwardedShortcut({ key: 'y', metaKey: true }), {
    action: 'redo',
    payload: 'all',
  });

  // Editable target (e.g. HEX input or session name input inside popout) must not fire canvas Delete/Undo
  assert.equal(
    classifyForwardedShortcut({ key: 'Backspace', isEditableTarget: true }),
    null
  );
  assert.equal(
    classifyForwardedShortcut({ key: 'z', ctrlKey: true, isEditableTarget: true }),
    null
  );
});

test('LIFECYCLE-08: Main Studio window launches on normal start, skips background flags, and bounds fit primary display', () => {
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe']), true);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe', '--tray-only']), false);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe', '--background']), false);
  assert.equal(shouldLaunchMainStudioWindow(['ProScreen.exe'], '0'), false);

  const bounds = computePrimaryWindowBounds(
    [
      {
        id: 1,
        label: 'Primary Monitor',
        isPrimary: true,
        bounds: { x: 0, y: 0, width: 1366, height: 768 },
        workArea: { x: 0, y: 0, width: 1366, height: 728 },
        scaleFactor: 1,
      },
    ],
    980,
    680
  );
  assert.ok(bounds.x >= 0 && bounds.y >= 0);
  assert.ok(bounds.width <= 1366 - 40);
  assert.ok(bounds.height <= 728 - 40);

  assert.equal(
    evaluateStartupWindowHealth({
      mainWindowCreated: true,
      toolbarWindowCreated: true,
      overlayWindowCreated: true,
    }).healthy,
    true
  );
  assert.equal(
    evaluateStartupWindowHealth({
      mainWindowCreated: false,
      toolbarWindowCreated: false,
      overlayWindowCreated: true,
    }).healthy,
    false
  );
});
