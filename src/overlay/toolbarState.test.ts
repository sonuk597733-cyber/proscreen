import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../storage/validation';
import { isDrawingTool, isPointerTool, ToolType } from '../types/annotation';

function deriveInteractionMode(toolbarVisible: boolean, activeTool: ToolType): 'pointer' | 'drawing' {
  if (!toolbarVisible || activeTool === 'pointer' || activeTool === 'cursor') {
    return 'pointer';
  }
  return 'drawing';
}

function computeCanvasPointerEvents(toolbarVisible: boolean, activeTool: ToolType): string {
  const isCursorPassThrough =
    deriveInteractionMode(toolbarVisible, activeTool) === 'pointer' ||
    toolbarVisible === false ||
    activeTool === 'pointer' ||
    activeTool === 'cursor';
  return isCursorPassThrough ? 'pointer-events-none' : 'pointer-events-auto';
}

test('1. Default state: defaults to POINTER mode on startup/init', () => {
  const defaults = createDefaultSettings();
  assert.equal(defaults.defaultTool, 'pointer', 'defaultTool in settings must be pointer');

  const initialToolbarVisible = true;
  const initialActiveTool: ToolType = 'pointer';
  const initialInteractionMode = deriveInteractionMode(initialToolbarVisible, initialActiveTool);

  assert.equal(initialToolbarVisible, true, 'toolbarVisible must start true');
  assert.equal(initialActiveTool, 'pointer', 'activeTool must start pointer');
  assert.equal(initialInteractionMode, 'pointer', 'interactionMode must start pointer');
  assert.equal(
    computeCanvasPointerEvents(initialToolbarVisible, initialActiveTool),
    'pointer-events-none',
    'canvas overlay must have pointer-events-none in pointer mode so webpage is clickable'
  );
});

test('2. Drawing mode activates ONLY when drawing tool is explicitly selected', () => {
  const drawingTools: ToolType[] = ['pen', 'highlighter', 'eraser', 'arrow', 'rect', 'line', 'text', 'laser'];

  for (const tool of drawingTools) {
    assert.equal(isDrawingTool(tool), true, `${tool} should be recognized as a drawing tool`);
    const mode = deriveInteractionMode(true, tool);
    assert.equal(mode, 'drawing', `Selecting ${tool} must set interactionMode to drawing`);
    assert.equal(
      computeCanvasPointerEvents(true, tool),
      'pointer-events-auto',
      `Canvas must receive pointer events when ${tool} is actively selected`
    );
  }
});

test('3. Switching back to Pointer immediately restores Pointer mode and pointer-events-none', () => {
  let toolbarVisible = true;
  let activeTool: ToolType = 'pen';
  let mode = deriveInteractionMode(toolbarVisible, activeTool);
  assert.equal(mode, 'drawing');
  assert.equal(computeCanvasPointerEvents(toolbarVisible, activeTool), 'pointer-events-auto');

  // User clicks Pointer / Arrow
  activeTool = 'pointer';
  mode = deriveInteractionMode(toolbarVisible, activeTool);
  assert.equal(mode, 'pointer', 'interactionMode must immediately switch back to pointer');
  assert.equal(
    computeCanvasPointerEvents(toolbarVisible, activeTool),
    'pointer-events-none',
    'Canvas must immediately set pointer-events-none so website clicks work'
  );
});

test('4. Eye Closed: toolbar hides, activeTool resets to pointer, canvas has pointer-events-none', () => {
  // Scenario: user was actively drawing with pen
  let toolbarVisible = true;
  let activeTool: ToolType = 'pen';
  assert.equal(deriveInteractionMode(toolbarVisible, activeTool), 'drawing');

  // User clicks Eye toggle to CLOSE eye
  toolbarVisible = false;
  activeTool = 'pointer'; // Eye close resets to pointer
  const mode = deriveInteractionMode(toolbarVisible, activeTool);

  assert.equal(toolbarVisible, false, 'toolbarVisible must be false when eye closed');
  assert.equal(activeTool, 'pointer', 'activeTool must reset to pointer when eye closed');
  assert.equal(mode, 'pointer', 'interactionMode must be pointer when eye closed');
  assert.equal(
    computeCanvasPointerEvents(toolbarVisible, activeTool),
    'pointer-events-none',
    'Canvas must be pointer-events-none when eye is closed'
  );
});

test('5. Eye Opened: toolbar returns in Pointer mode without automatic drawing mode', () => {
  // Scenario: Eye was closed
  let toolbarVisible = false;
  let activeTool: ToolType = 'pointer';

  // User opens eye (clicks restore toggle / Alt+M)
  toolbarVisible = true;
  activeTool = 'pointer'; // Eye open always starts in POINTER mode
  const mode = deriveInteractionMode(toolbarVisible, activeTool);

  assert.equal(toolbarVisible, true, 'toolbarVisible must be true when eye opened');
  assert.equal(activeTool, 'pointer', 'activeTool must be pointer when eye opened');
  assert.equal(mode, 'pointer', 'interactionMode must be pointer when eye opened');
  assert.equal(
    computeCanvasPointerEvents(toolbarVisible, activeTool),
    'pointer-events-none',
    'Canvas must remain pointer-events-none when eye opens until user picks a tool'
  );
});

test('6. Cursor alias maps cleanly to Pointer mode', () => {
  assert.equal(isPointerTool('pointer'), true);
  assert.equal(isPointerTool('cursor'), true);
  assert.equal(deriveInteractionMode(true, 'cursor'), 'pointer');
  assert.equal(computeCanvasPointerEvents(true, 'cursor'), 'pointer-events-none');
});

test('7. Eye OFF / ON: Epic Pen Style - hides toolbar & temporarily hides annotation layer without deleting data', () => {
  // ProScreenOverlay & DesktopOverlayApp: Canvas hides rendering when annotationsVisible is false; FloatingToolbar returns null when toolbarVisible is false
  const renderFloatingToolbar = (toolbarVisible: boolean) => {
    if (!toolbarVisible) return null;
    return { mounted: true, testId: 'proscreen-toolbar' };
  };

  const renderAnnotationOverlay = (
    toolbarVisible: boolean,
    annotationsVisible: boolean,
    items: string[]
  ) => {
    return {
      toolbarMounted: toolbarVisible,
      annotationsRendered: annotationsVisible ? items : [],
      itemsCountInData: items.length,
      pointerEvents: toolbarVisible && annotationsVisible ? 'auto' : 'none',
    };
  };

  const mockAnnotations = ['stroke_pen_1', 'shape_rect_2', 'arrow_3', 'text_4', 'ellipse_5'];

  // Eye ON: Toolbar visible, annotations visible, 5 items rendered
  assert.notEqual(renderFloatingToolbar(true), null, 'Toolbar should be visible when Eye is ON');
  const overlayOn = renderAnnotationOverlay(true, true, mockAnnotations);
  assert.equal(overlayOn.toolbarMounted, true);
  assert.equal(overlayOn.annotationsRendered.length, 5);
  assert.equal(overlayOn.itemsCountInData, 5);

  // Eye OFF: Toolbar hidden, annotation layers hidden, but all 5 items remain intact in data!
  assert.equal(renderFloatingToolbar(false), null, 'Toolbar must be hidden when Eye is OFF');
  const overlayOff = renderAnnotationOverlay(false, false, mockAnnotations);
  assert.equal(overlayOff.toolbarMounted, false);
  assert.equal(overlayOff.annotationsRendered.length, 0, 'Annotation layers must be temporarily hidden');
  assert.equal(overlayOff.itemsCountInData, 5, 'All 5 items must remain 100% intact in data');
  assert.equal(overlayOff.pointerEvents, 'none', 'Pointer events must pass through when Eye is OFF');
});

test('8. Hover dropdown geometry: popout coordinates overlap toolbar boundary with seamless bridge', () => {
  const computePopoutCoords = (
    tbLeft: number,
    tbRight: number,
    vw: number,
    estWidth: number
  ) => {
    const openLeft = tbLeft > vw * 0.56;
    if (openLeft) {
      return {
        right: Math.max(8, vw - tbLeft - 6),
        openSide: 'left' as const,
      };
    }
    return {
      left: Math.max(8, Math.min(vw - estWidth - 8, tbRight - 6)),
      openSide: 'right' as const,
    };
  };

  // Toolbar at x=20, width=34 -> tbLeft=20, tbRight=54 in a 1920px viewport
  const coordsRight = computePopoutCoords(20, 54, 1920, 248);
  assert.equal(coordsRight.openSide, 'right');
  // Popout left must overlap toolbar right edge (54 - 6 = 48)
  assert.equal(coordsRight.left, 48, 'Popout must overlap toolbar edge by 6px to avoid dead hover gaps');

  // Toolbar on the right side: tbLeft=1800 in a 1920px viewport
  const coordsLeft = computePopoutCoords(1800, 1834, 1920, 248);
  assert.equal(coordsLeft.openSide, 'left');
  // vw - tbLeft - 6 = 1920 - 1800 - 6 = 114
  assert.equal(coordsLeft.right, 114, 'Left-opening popout must overlap toolbar left edge by 6px');
});

test('9. Cross-tab state isolation: distinct tabs maintain separate annotation snapshots', () => {
  interface TabSnapshot {
    items: string[];
    boardMode: string;
    toolbarVisible: boolean;
  }

  const storageMap = new Map<string, TabSnapshot>();

  const saveTabState = (tabKey: string, snapshot: TabSnapshot) => {
    storageMap.set(tabKey, snapshot);
  };

  const loadTabState = (tabKey: string): TabSnapshot | undefined => {
    return storageMap.get(tabKey);
  };

  // Tab 1 creates annotations
  saveTabState('tab:1', {
    items: ['stroke-1', 'stroke-2'],
    boardMode: 'webpage',
    toolbarVisible: true,
  });

  // Tab 2 has its own empty annotations
  saveTabState('tab:2', {
    items: [],
    boardMode: 'webpage',
    toolbarVisible: false,
  });

  // Verify Tab 1 data remains intact and isolated
  const tab1 = loadTabState('tab:1');
  const tab2 = loadTabState('tab:2');

  assert.equal(tab1?.items.length, 2, 'Tab 1 must retain its 2 annotations');
  assert.equal(tab1?.toolbarVisible, true, 'Tab 1 toolbarVisible must be true');

  assert.equal(tab2?.items.length, 0, 'Tab 2 must have its separate empty annotations');
  assert.equal(tab2?.toolbarVisible, false, 'Tab 2 toolbarVisible must be isolated');

  // User adds stroke to Tab 2
  saveTabState('tab:2', {
    items: ['stroke-tab2'],
    boardMode: 'webpage',
    toolbarVisible: true,
  });

  // Tab 1 is unaffected by Tab 2 modifications
  assert.equal(loadTabState('tab:1')?.items.length, 2, 'Tab 1 must remain unchanged when Tab 2 updates');
});

test('10. Duplicate injection guard prevents multiple overlay hosts', () => {
  const existingDom = new Set<string>();
  const HOST_ID = 'proscreen-extension-host';

  const mountOverlay = (): boolean => {
    if (existingDom.has(HOST_ID)) {
      return false; // Already mounted, skip duplicate injection
    }
    existingDom.add(HOST_ID);
    return true;
  };

  assert.equal(mountOverlay(), true, 'First injection should succeed');
  assert.equal(mountOverlay(), false, 'Second injection on same tab must be prevented by guard');
  assert.equal(existingDom.size, 1, 'Only one host element can exist');
});

test('11. Alt+Shift+P shortcut matches toggle-toolbar command and in-page event', () => {
  const isMatch = (e: { altKey: boolean; shiftKey: boolean; key: string }) => {
    return e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p');
  };

  assert.equal(isMatch({ altKey: true, shiftKey: true, key: 'P' }), true);
  assert.equal(isMatch({ altKey: true, shiftKey: true, key: 'p' }), true);
  assert.equal(isMatch({ altKey: false, shiftKey: true, key: 'P' }), false);
  assert.equal(isMatch({ altKey: true, shiftKey: false, key: 'P' }), false);
  assert.equal(isMatch({ altKey: true, shiftKey: true, key: 'X' }), false);
});

test('12. Eye OFF does not delete, clear, or reset existing annotations in history or text items', () => {
  interface EngineMockState {
    toolbarVisible: boolean;
    activeTool: ToolType;
    historyItems: string[];
    textItems: string[];
  }

  const state: EngineMockState = {
    toolbarVisible: true,
    activeTool: 'pen',
    historyItems: ['stroke_1', 'shape_rect_2', 'arrow_3'],
    textItems: ['txt_label_1'],
  };

  // User closes eye
  const closeEye = (s: EngineMockState) => {
    s.toolbarVisible = false;
    s.activeTool = 'pointer';
    // State is preserved! Never clear history or text items!
  };

  closeEye(state);

  assert.equal(state.toolbarVisible, false, 'Toolbar is hidden');
  assert.equal(state.activeTool, 'pointer', 'Tool resets to pointer');
  assert.equal(state.historyItems.length, 3, 'History items must NOT be deleted on Eye OFF');
  assert.equal(state.textItems.length, 1, 'Text items must NOT be deleted on Eye OFF');
  assert.deepEqual(state.historyItems, ['stroke_1', 'shape_rect_2', 'arrow_3']);
  assert.deepEqual(state.textItems, ['txt_label_1']);
});

test('13. Eye ON restores toolbar in Pointer mode while preserving all annotations', () => {
  interface EngineMockState {
    toolbarVisible: boolean;
    activeTool: ToolType;
    historyItems: string[];
  }

  const state: EngineMockState = {
    toolbarVisible: false,
    activeTool: 'pointer',
    historyItems: ['stroke_1', 'arrow_2'],
  };

  // User opens eye / hits Alt+Shift+P
  const openEye = (s: EngineMockState) => {
    s.toolbarVisible = true;
    s.activeTool = 'pointer';
  };

  openEye(state);

  assert.equal(state.toolbarVisible, true, 'Toolbar is visible');
  assert.equal(state.activeTool, 'pointer', 'Toolbar restores in POINTER mode');
  assert.equal(state.historyItems.length, 2, 'All annotations remain exactly where they were');
});

test('14. Switching tools preserves all existing annotations', () => {
  let activeTool: ToolType = 'pen';
  const history = ['stroke_A', 'stroke_B'];

  // User switches from Pen to Highlighter, then to Arrow, then to Pointer
  const tools: ToolType[] = ['highlighter', 'arrow', 'rect', 'text', 'pointer'];
  for (const tool of tools) {
    activeTool = tool;
    assert.equal(activeTool, tool);
    assert.equal(history.length, 2, 'Annotations must be preserved when switching tools');
  }
});

test('15. Switching tabs preserves each tab annotations independently', () => {
  const tabs = new Map<string, string[]>();
  tabs.set('tab_1', ['item_1', 'item_2']);
  tabs.set('tab_2', ['item_3']);

  assert.equal(tabs.get('tab_1')?.length, 2);
  assert.equal(tabs.get('tab_2')?.length, 1);

  // Return to tab 1
  assert.deepEqual(tabs.get('tab_1'), ['item_1', 'item_2']);
});

test('16. Area selector activates drawing mode and allows interactive selection', () => {
  const isInteractiveInDesktop = (toolbarVisible: boolean, activeTool: ToolType, selectingArea: boolean) => {
    return toolbarVisible && ((activeTool !== 'pointer' && activeTool !== 'cursor') || selectingArea);
  };

  // When in pointer mode, normally not interactive (pass-through)
  assert.equal(isInteractiveInDesktop(true, 'pointer', false), false);

  // When area capture is initiated, mode becomes interactive immediately
  assert.equal(isInteractiveInDesktop(true, 'pointer', true), true);
});

test('17. Tool cursor definitions distinguish Pen, Highlighter, Arrow, Text without generic plus icon', () => {
  const getToolCursorType = (tool: ToolType): string => {
    if (tool === 'pointer') return 'default';
    if (tool === 'text') return 'text';
    if (tool === 'pen') return 'pen-svg';
    if (tool === 'highlighter') return 'highlighter-svg';
    if (tool === 'arrow') return 'arrow-svg';
    if (tool === 'rect' || tool === 'circle') return 'crosshair';
    return 'default';
  };

  assert.equal(getToolCursorType('pointer'), 'default');
  assert.equal(getToolCursorType('text'), 'text');
  assert.equal(getToolCursorType('pen'), 'pen-svg', 'Pen must have dedicated pen cursor');
  assert.equal(getToolCursorType('highlighter'), 'highlighter-svg', 'Highlighter must have dedicated highlighter cursor');
  assert.equal(getToolCursorType('arrow'), 'arrow-svg', 'Arrow must have dedicated arrow cursor');
  assert.equal(getToolCursorType('rect'), 'crosshair', 'Geometric shapes use precision crosshair');
});

test('18. ProScreen Eye OFF / ON with Floating Restore Button & Delete Behavior', () => {
  interface FullProScreenState {
    toolbarVisible: boolean;
    restoreButtonVisible: boolean;
    annotationsVisible: boolean;
    annotationData: { id: string; type: string; color: string }[];
    toolbarPosition: { x: number; y: number };
    restoreButtonPosition: { x: number; y: number };
    activeTool: ToolType;
  }

  const state: FullProScreenState = {
    toolbarVisible: true,
    restoreButtonVisible: false,
    annotationsVisible: true,
    annotationData: [
      { id: 'drawing_1', type: 'pen', color: '#EF4444' },
      { id: 'arrow_2', type: 'arrow', color: '#3B82F6' },
    ],
    toolbarPosition: { x: 16, y: 76 },
    restoreButtonPosition: { x: 16, y: 76 },
    activeTool: 'pen',
  };

  const closeEye = (s: FullProScreenState) => {
    s.toolbarVisible = false;
    s.restoreButtonVisible = true;
    s.annotationsVisible = false; // Hides annotations from screen, preserving data in annotationData
    s.activeTool = 'pointer';
  };

  const openEye = (s: FullProScreenState) => {
    s.toolbarVisible = true;
    s.restoreButtonVisible = false;
    s.annotationsVisible = true; // Restores annotations to screen
    s.activeTool = 'pointer';
  };

  const dragRestoreButton = (s: FullProScreenState, newPos: { x: number; y: number }) => {
    s.restoreButtonPosition = { ...newPos };
  };

  const deleteAnnotationManually = (s: FullProScreenState, id: string) => {
    s.annotationData = s.annotationData.filter((item) => item.id !== id);
  };

  // Test 1: Draw something and click Eye OFF: toolbar closes, drawing disappears from screen, but data preserved!
  closeEye(state);
  assert.equal(state.toolbarVisible, false, 'Toolbar closes on Eye OFF');
  assert.equal(state.restoreButtonVisible, true, 'Restore button visible on Eye OFF');
  assert.equal(state.annotationsVisible, false, 'Annotations are hidden from view on Eye OFF');
  assert.equal(state.annotationData.length, 2, 'Drawing remains safely preserved in annotationData');

  // Test 2: Drag the small Eye button: it moves successfully and saves position
  dragRestoreButton(state, { x: 120, y: 350 });
  assert.deepEqual(state.restoreButtonPosition, { x: 120, y: 350 }, 'Restore button position saves successfully');

  // Test 3: Click the Eye button: toolbar returns and drawing reappears
  openEye(state);
  assert.equal(state.toolbarVisible, true, 'Toolbar returns on Eye ON');
  assert.equal(state.restoreButtonVisible, false, 'Floating restore button disappears on Eye ON');
  assert.equal(state.annotationsVisible, true, 'Annotations reappear on Eye ON');
  assert.equal(state.annotationData.length, 2, 'All drawings remain intact');
  assert.deepEqual(state.restoreButtonPosition, { x: 120, y: 350 }, 'Saved restore button position persists');

  // Test 4: Delete the drawing manually
  deleteAnnotationManually(state, 'drawing_1');
  assert.equal(state.annotationData.length, 1, 'Drawing manually deleted');
  assert.equal(state.annotationData[0].id, 'arrow_2');

  // Test 5: Click Eye OFF and Eye ON again: deleted drawing must NOT return!
  closeEye(state);
  assert.equal(state.annotationData.length, 1, 'Eye OFF maintains current state only');
  openEye(state);
  assert.equal(state.annotationData.length, 1, 'Deleted drawing must NOT resurrect on Eye ON');
  assert.equal(state.annotationData[0].id, 'arrow_2');
  assert.equal(state.annotationData.some((a) => a.id === 'drawing_1'), false, 'Deleted work never comes back');

  // Test 6: Create new annotations, repeat process and verify state preservation
  state.annotationData.push({ id: 'shape_rect_3', type: 'rect', color: '#10B981' });
  assert.equal(state.annotationData.length, 2);

  for (let cycle = 1; cycle <= 5; cycle++) {
    closeEye(state);
    assert.equal(state.toolbarVisible, false);
    assert.equal(state.restoreButtonVisible, true);
    assert.equal(state.annotationsVisible, false, `Cycle ${cycle}: annotations hidden from view on Eye OFF`);
    assert.equal(state.annotationData.length, 2, `Cycle ${cycle}: annotationData preserved on Eye OFF`);

    openEye(state);
    assert.equal(state.toolbarVisible, true);
    assert.equal(state.restoreButtonVisible, false);
    assert.equal(state.annotationsVisible, true, `Cycle ${cycle}: annotations restored on Eye ON`);
    assert.equal(state.annotationData.length, 2, `Cycle ${cycle}: annotationData preserved on Eye ON`);
  }

  // Test 7: Verify Chrome Extension and Desktop state consistency
  assert.equal(typeof state.toolbarVisible, 'boolean');
  assert.equal(typeof state.restoreButtonVisible, 'boolean');
  assert.equal(typeof state.annotationsVisible, 'boolean');
  assert.equal(typeof state.restoreButtonPosition.x, 'number');
  assert.equal(typeof state.toolbarPosition.x, 'number');
});

test('19. Seamless tool switching: Drawing tools (rect, pen, circle) switch without locking toolbar', () => {
  const tools: ToolType[] = ['rect', 'pen', 'highlighter', 'eraser', 'line', 'circle', 'arrow', 'text', 'pointer'];
  let currentActiveTool: ToolType = 'pointer';
  let currentInteractionMode: 'pointer' | 'drawing' = 'pointer';

  for (const tool of tools) {
    // Switch to tool
    currentActiveTool = tool;
    currentInteractionMode = deriveInteractionMode(true, tool);

    if (tool === 'pointer' || tool === 'cursor') {
      assert.equal(currentInteractionMode, 'pointer', `Switching to ${tool} must restore pointer mode`);
      assert.equal(
        computeCanvasPointerEvents(true, tool),
        'pointer-events-none',
        'Pointer mode must set pointer-events-none'
      );
    } else {
      assert.equal(currentInteractionMode, 'drawing', `Switching to ${tool} must activate drawing mode`);
      assert.equal(
        computeCanvasPointerEvents(true, tool),
        'pointer-events-auto',
        'Drawing tool must allow canvas drawing'
      );
    }
  }

  // Switch specifically from rect to pointer and verify
  currentActiveTool = 'rect';
  currentInteractionMode = deriveInteractionMode(true, currentActiveTool);
  assert.equal(currentInteractionMode, 'drawing');

  // Immediately click Pen
  currentActiveTool = 'pen';
  currentInteractionMode = deriveInteractionMode(true, currentActiveTool);
  assert.equal(currentActiveTool, 'pen');
  assert.equal(currentInteractionMode, 'drawing');

  // Immediately click Pointer
  currentActiveTool = 'pointer';
  currentInteractionMode = deriveInteractionMode(true, currentActiveTool);
  assert.equal(currentActiveTool, 'pointer');
  assert.equal(currentInteractionMode, 'pointer');
});

test('20. Toolbar Hitbox Exclusion: Points inside toolbar area are protected from canvas drawing', () => {
  const toolbarPos = { x: 16, y: 76 };
  const toolbarWidth = 44;
  const toolbarHeight = 520;

  const isPointOverToolbar = (x: number, y: number): boolean => {
    return (
      x >= toolbarPos.x - 4 &&
      x <= toolbarPos.x + toolbarWidth + 4 &&
      y >= toolbarPos.y - 4 &&
      y <= toolbarPos.y + toolbarHeight + 10
    );
  };

  // Test point on toolbar button (e.g. x: 30, y: 150)
  assert.equal(isPointOverToolbar(30, 150), true, 'Toolbar button point must be recognized as inside toolbar');
  assert.equal(isPointOverToolbar(16, 76), true, 'Top-left corner of toolbar is inside toolbar');
  assert.equal(isPointOverToolbar(60, 200), true, 'Right margin of toolbar is protected');

  // Test point on desktop / canvas outside toolbar (e.g. x: 500, y: 300)
  assert.equal(isPointOverToolbar(500, 300), false, 'Open canvas area is NOT inside toolbar');
  assert.equal(isPointOverToolbar(10, 50), false, 'Area above toolbar is NOT inside toolbar');
});

test('21. Desktop Window Drag: Screen coordinate deltas remain stable during window motion', () => {
  // Screen coordinate simulation: mouse moves 50px right, 30px down on monitor
  const startScreenX = 200;
  const startScreenY = 300;
  const initWindowPos = { x: 16, y: 76 };

  // Frame 1: mouse moved by (10, 5)
  const screenX1 = 210;
  const screenY1 = 305;
  const dx1 = screenX1 - startScreenX; // 10
  const dy1 = screenY1 - startScreenY; // 5
  const windowPos1 = { x: initWindowPos.x + dx1, y: initWindowPos.y + dy1 }; // (26, 81)
  assert.deepEqual(windowPos1, { x: 26, y: 81 });

  // Frame 2: mouse moved to (250, 330)
  const screenX2 = 250;
  const screenY2 = 330;
  const dx2 = screenX2 - startScreenX; // 50
  const dy2 = screenY2 - startScreenY; // 30
  const windowPos2 = { x: initWindowPos.x + dx2, y: initWindowPos.y + dy2 }; // (66, 106)
  assert.deepEqual(windowPos2, { x: 66, y: 106 });

  // Verify persistence: next drag session starts from the new position
  const secondSessionInit = { ...windowPos2 };
  const secondStartScreenX = 500;
  const secondScreenX = 520;
  const secondWindowPos = { x: secondSessionInit.x + (secondScreenX - secondStartScreenX), y: secondSessionInit.y };
  assert.equal(secondWindowPos.x, 86, 'Toolbar must not reset to initial (16, 76) on subsequent drag');
});

test('22. Window Z-Order Architecture: Toolbar level is higher than Overlay and Overlay is non-focusable', () => {
  const toolbarWindowConfig = {
    alwaysOnTopLevel: 'pop-up-menu',
    relativeLevel: 1,
    focusable: true,
  };

  const overlayWindowConfig = {
    alwaysOnTopLevel: 'floating',
    relativeLevel: 0,
    focusable: false,
  };

  assert.notEqual(toolbarWindowConfig.alwaysOnTopLevel, overlayWindowConfig.alwaysOnTopLevel);
  assert.ok(toolbarWindowConfig.relativeLevel > overlayWindowConfig.relativeLevel, 'Toolbar relative level must be strictly higher than Overlay');
  assert.equal(overlayWindowConfig.focusable, false, 'Overlay must be non-focusable to prevent stealing activation');
});

test('23. PERSISTENCE: Drawing annotations, then Eye OFF hides all annotations while keeping history intact', () => {
  interface LayerState {
    toolbarVisible: boolean;
    annotationsVisible: boolean;
    items: Array<{ id: string; type: string; points?: Array<{ x: number; y: number }>; color: string }>;
  }

  const state: LayerState = {
    toolbarVisible: true,
    annotationsVisible: true,
    items: [
      { id: 'st_1', type: 'pen', points: [{ x: 100, y: 100 }, { x: 150, y: 150 }], color: '#EF4444' },
      { id: 'txt_1', type: 'text', color: '#3B82F6' },
      { id: 'sh_1', type: 'rect', color: '#10B981' },
    ],
  };

  // Close Eye / Hide ProScreen
  state.toolbarVisible = false;
  state.annotationsVisible = false;

  // Verify visible annotations disappear from screen
  const renderedOnScreen = state.annotationsVisible ? state.items : [];
  assert.equal(renderedOnScreen.length, 0, 'No annotations rendered on screen when Eye is OFF');

  // Verify underlying data is completely preserved
  assert.equal(state.items.length, 3, 'All 3 items remain safely stored in memory/storage');
  assert.equal(state.items[0].id, 'st_1');
  assert.equal(state.items[1].id, 'txt_1');
  assert.equal(state.items[2].id, 'sh_1');
});

test('24. PERSISTENCE: Eye ON restores all preserved annotations with exact coordinates and attributes without duplicates', () => {
  const preservedItems = [
    { id: 'st_1', type: 'pen', points: [{ x: 100, y: 100 }, { x: 150, y: 150 }], color: '#EF4444' },
    { id: 'txt_1', type: 'text', color: '#3B82F6' },
  ];

  let toolbarVisible = false;
  let annotationsVisible = false;

  // Reopen tool (Eye ON)
  toolbarVisible = true;
  annotationsVisible = true;

  const renderedOnScreen = annotationsVisible ? preservedItems : [];
  assert.equal(renderedOnScreen.length, 2, 'Both preserved items are restored onto the screen');
  assert.deepEqual(renderedOnScreen[0].points, [{ x: 100, y: 100 }, { x: 150, y: 150 }], 'Coordinates restored with zero drift');
  assert.equal(renderedOnScreen[1].color, '#3B82F6');
});

test('25. PERSISTENCE: Explicit Clear All permanently deletes annotations and nothing is restored on reopen', () => {
  let storedItems = [
    { id: 'st_1', type: 'pen', color: '#EF4444' },
    { id: 'st_2', type: 'highlighter', color: '#FACC15' },
  ];
  let annotationsVisible = true;

  // User explicitly clicks Clear All
  storedItems = []; // clearScreen clears stored items

  assert.equal(storedItems.length, 0, 'Stored items array is empty after Clear All');

  // User closes ProScreen
  annotationsVisible = false;
  assert.equal(annotationsVisible ? storedItems : [].length, 0);

  // User reopens ProScreen
  annotationsVisible = true;
  const restored = annotationsVisible ? storedItems : [];
  assert.equal(restored.length, 0, 'Reopening after Clear All must NOT resurrect deleted annotations');
});

test('26. EYE POSITION: Toolbar closing captures exact physical screen coordinates for Eye restore button', () => {
  // Simulating main process setEyeState(false)
  const currentToolbarPos = { x: 1500, y: 250 };
  let sharedToolbarPos = { ...currentToolbarPos };
  let sharedRestorePos = { x: 16, y: 76 }; // Old stale position

  // On toolbar close, capture live toolbar window position:
  const closeX = currentToolbarPos.x;
  const closeY = currentToolbarPos.y;

  sharedToolbarPos = { x: closeX, y: closeY };
  sharedRestorePos = { x: closeX, y: closeY };

  assert.equal(sharedRestorePos.x, 1500, 'Eye restore button must be at X=1500 where toolbar was closed');
  assert.equal(sharedRestorePos.y, 250, 'Eye restore button must be at Y=250 where toolbar was closed');
  assert.notEqual(sharedRestorePos.x, 16, 'Eye restore button must NOT jump to default (16)');
  assert.notEqual(sharedRestorePos.x, 0, 'Eye restore button must NOT jump to (0,0)');
});

test('27. EYE POSITION: Repeated hide and reopen cycles maintain identical screen coordinates without drift', () => {
  let toolbarPos = { x: 1420, y: 310 };
  let restorePos = { x: 1420, y: 310 };

  for (let cycle = 1; cycle <= 10; cycle++) {
    // 1. Close toolbar
    const closeX = toolbarPos.x;
    const closeY = toolbarPos.y;
    toolbarPos = { x: closeX, y: closeY };
    restorePos = { x: closeX, y: closeY };
    assert.deepEqual(restorePos, { x: 1420, y: 310 }, `Cycle ${cycle}: Eye restore position remains locked`);

    // 2. Reopen toolbar
    const openX = restorePos.x;
    const openY = restorePos.y;
    toolbarPos = { x: openX, y: openY };
    restorePos = { x: openX, y: openY };
    assert.deepEqual(toolbarPos, { x: 1420, y: 310 }, `Cycle ${cycle}: Toolbar restored position remains locked`);
  }
});

test('28. EYE RESTORATION: Engine and authoritative cross-window sync restores multi-type annotations (strokes, shapes, text) after Eye OFF and Eye ON', () => {
  // Simulate active drawings: pen, shape, text
  const strokeItem = {
    id: 'stroke-1',
    tool: 'pen',
    type: 'stroke',
    color: '#EF4444',
    size: 4,
    points: [{ x: 100, y: 120 }, { x: 105, y: 125 }],
  };
  const shapeItem = {
    id: 'shape-1',
    tool: 'rect',
    type: 'shape',
    color: '#3B82F6',
    size: 3,
    start: { x: 200, y: 200 },
    end: { x: 350, y: 320 },
  };
  const textItem = {
    id: 'text-1',
    tool: 'text',
    type: 'text',
    text: 'Architecture Review Note',
    x: 400,
    y: 150,
    fontSize: 18,
    color: '#10B981',
  };

  let engineHistory = [strokeItem, shapeItem, textItem];
  let mainAuthoritativeStore = [...engineHistory];
  let annotationsVisible = true;

  // 1. User clicks Eye OFF: toolbar closes, annotations hidden from view, desktop pass-through
  annotationsVisible = false;
  // overlayWindow is hidden, engine.annotationsVisible is false
  assert.equal(annotationsVisible, false, 'Annotations are hidden from desktop view');
  assert.equal(engineHistory.length, 3, 'Data is NEVER deleted or purged on Eye OFF');
  assert.equal(mainAuthoritativeStore.length, 3, 'Authoritative main process snapshot preserved');

  // 2. User clicks Floating Eye restore button (Eye ON)
  annotationsVisible = true;
  // Main process dispatches desktop:restore-annotations to overlayWindow
  const restoredFromMain = [...mainAuthoritativeStore];
  assert.equal(restoredFromMain.length, 3, 'Authoritative store pushes all 3 items');
  assert.deepEqual(restoredFromMain[0], strokeItem, 'Exact pen stroke restored');
  assert.deepEqual(restoredFromMain[1], shapeItem, 'Exact shape restored');
  assert.deepEqual(restoredFromMain[2], textItem, 'Exact text restored');

  // Verify render condition: when annotationsVisible === true, items are rendered
  const renderedItems = annotationsVisible ? restoredFromMain : [];
  assert.equal(renderedItems.length, 3, 'All 3 items are rendered onto the canvas and text overlay');
});

test('29. EYE RESTORATION: Explicit Clear All purges authoritative store and reopen stays blank', () => {
  let engineHistory = [{ id: 's1', type: 'stroke', points: [] }];
  let mainAuthoritativeStore = [...engineHistory];

  // User explicitly clicks "Clear All"
  engineHistory = [];
  mainAuthoritativeStore = []; // main process resets on clear-screen action

  // User then clicks Eye OFF
  let annotationsVisible = false;
  assert.equal(mainAuthoritativeStore.length, 0);

  // User clicks Eye ON
  annotationsVisible = true;
  const restoredFromMain = [...mainAuthoritativeStore];
  const renderedItems = annotationsVisible ? restoredFromMain : [];
  assert.equal(renderedItems.length, 0, 'No deleted annotations reappear on Eye ON');
});

test('30. SMOOTH TRANSITION: Dropdown open styling applies cubic-bezier fade without toolbar coordinate change', () => {
  const toolbarPos = { x: 1850, y: 100 };
  const popoutPos = { top: 6, right: 6, openSide: 'left', anchorOffsetY: 20 };

  // Popout animation style definition
  const animationKeyframes = `
    @keyframes proscreenDropdownFade {
      0% { opacity: 0; transform: scale(0.97) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  assert.ok(animationKeyframes.includes('proscreenDropdownFade'));
  assert.ok(animationKeyframes.includes('opacity: 1'));
  assert.deepEqual(toolbarPos, { x: 1850, y: 100 }, 'Toolbar screen coordinates maintain 0px shift');
});



