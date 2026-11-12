import { test, expect } from '@playwright/test';
import * as Y from 'yjs';
import {
  getTransformHandles,
  calculateResizeFactors,
  testMarqueeIntersection,
} from '../../src/lib/selection';
import { WhiteboardCommandDispatcher } from '../../src/lib/dispatcher';
import { CanvasElement, BoundingBox, TransformHandle } from '../../src/types/whiteboard';
import { CanvasDriver } from './helpers/canvas-driver';
import { ToolbarDriver } from './helpers/toolbar-driver';

/**
 * Challenger 2 Empirical Stress Test Suite
 * Milestone 1: Selection, Transforms & CRDT State Synchronization
 */

test.describe('Challenger 2: Selection & Transform Mathematics', () => {

  test('EMP-SEL-01: 8 transform handles positioning, bounding box corners, and hit box geometry', async () => {
    // Test symmetric box centered at origin
    const bbox1: BoundingBox = {
      minX: -100,
      maxX: 100,
      minY: -50,
      maxY: 50,
      width: 200,
      height: 100,
      centerX: 0,
      centerY: 0,
    };

    const handles1 = getTransformHandles(bbox1);
    expect(handles1).toHaveLength(8);

    const handleMap1 = new Map<string, TransformHandle>();
    for (const h of handles1) {
      handleMap1.set(h.type, h);
    }

    // Verify all 8 handles exist
    const expectedTypes = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const t of expectedTypes) {
      expect(handleMap1.has(t)).toBe(true);
    }

    // 1. nw handle: Top-Left in math coords (minX, maxY) -> opposite anchor is se (maxX, minY)
    const nw = handleMap1.get('nw')!;
    expect(nw.x).toBe(-100);
    expect(nw.y).toBe(50);
    expect(nw.anchorX).toBe(100);
    expect(nw.anchorY).toBe(-50);
    expect(nw.mode).toBe('xy');
    expect(nw.cursor).toBe('nwse-resize');

    // 2. n handle: Top-Center (centerX, maxY) -> anchor is s (centerX, minY)
    const n = handleMap1.get('n')!;
    expect(n.x).toBe(0);
    expect(n.y).toBe(50);
    expect(n.anchorX).toBe(0);
    expect(n.anchorY).toBe(-50);
    expect(n.mode).toBe('y');
    expect(n.cursor).toBe('ns-resize');

    // 3. ne handle: Top-Right (maxX, maxY) -> anchor is sw (minX, minY)
    const ne = handleMap1.get('ne')!;
    expect(ne.x).toBe(100);
    expect(ne.y).toBe(50);
    expect(ne.anchorX).toBe(-100);
    expect(ne.anchorY).toBe(-50);
    expect(ne.mode).toBe('xy');
    expect(ne.cursor).toBe('nesw-resize');

    // 4. e handle: Middle-Right (maxX, centerY) -> anchor is w (minX, centerY)
    const e = handleMap1.get('e')!;
    expect(e.x).toBe(100);
    expect(e.y).toBe(0);
    expect(e.anchorX).toBe(-100);
    expect(e.anchorY).toBe(0);
    expect(e.mode).toBe('x');
    expect(e.cursor).toBe('ew-resize');

    // 5. se handle: Bottom-Right (maxX, minY) -> anchor is nw (minX, maxY)
    const se = handleMap1.get('se')!;
    expect(se.x).toBe(100);
    expect(se.y).toBe(-50);
    expect(se.anchorX).toBe(-100);
    expect(se.anchorY).toBe(50);
    expect(se.mode).toBe('xy');
    expect(se.cursor).toBe('nwse-resize');

    // 6. s handle: Bottom-Center (centerX, minY) -> anchor is n (centerX, maxY)
    const s = handleMap1.get('s')!;
    expect(s.x).toBe(0);
    expect(s.y).toBe(-50);
    expect(s.anchorX).toBe(0);
    expect(s.anchorY).toBe(50);
    expect(s.mode).toBe('y');
    expect(s.cursor).toBe('ns-resize');

    // 7. sw handle: Bottom-Left (minX, minY) -> anchor is ne (maxX, maxY)
    const sw = handleMap1.get('sw')!;
    expect(sw.x).toBe(-100);
    expect(sw.y).toBe(-50);
    expect(sw.anchorX).toBe(100);
    expect(sw.anchorY).toBe(50);
    expect(sw.mode).toBe('xy');
    expect(sw.cursor).toBe('nesw-resize');

    // 8. w handle: Middle-Left (minX, centerY) -> anchor is e (maxX, centerY)
    const w = handleMap1.get('w')!;
    expect(w.x).toBe(-100);
    expect(w.y).toBe(0);
    expect(w.anchorX).toBe(100);
    expect(w.anchorY).toBe(0);
    expect(w.mode).toBe('x');
    expect(w.cursor).toBe('ew-resize');

    // Adversarial test: Asymmetric, translated, purely negative coordinates
    const bboxNeg: BoundingBox = {
      minX: -500,
      maxX: -200,
      minY: -400,
      maxY: -100,
      width: 300,
      height: 300,
      centerX: -350,
      centerY: -250,
    };
    const handlesNeg = getTransformHandles(bboxNeg);
    expect(handlesNeg).toHaveLength(8);
    for (const h of handlesNeg) {
      // Confirm each handle lies strictly on the perimeter of bboxNeg
      expect(h.x).toBeGreaterThanOrEqual(bboxNeg.minX);
      expect(h.x).toBeLessThanOrEqual(bboxNeg.maxX);
      expect(h.y).toBeGreaterThanOrEqual(bboxNeg.minY);
      expect(h.y).toBeLessThanOrEqual(bboxNeg.maxY);
    }
  });

  test('EMP-SEL-02: Corner handle uniform scaling math and min/max clamping', async () => {
    const bbox: BoundingBox = {
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 100,
      width: 100,
      height: 100,
      centerX: 50,
      centerY: 50,
    };
    const handles = getTransformHandles(bbox);
    const seHandle = handles.find((h) => h.type === 'se')!; // at (100, 0), anchor at (0, 100)

    const initPos = { x: seHandle.x, y: seHandle.y }; // (100, 0)
    // Anchor is at (0, 100). Initial vector = (100 - 0, 0 - 100) = (100, -100). Length squared = 20000.

    // 1. Double the size along diagonal: move from (100, 0) to (200, -100)
    // Vector becomes (200, -200), projection = (200*100 + (-200)*(-100))/20000 = 40000/20000 = 2.0
    const factor2x = calculateResizeFactors(seHandle, initPos, { x: 200, y: -100 });
    expect(factor2x.scaleX).toBeCloseTo(2.0, 5);
    expect(factor2x.scaleY).toBeCloseTo(2.0, 5);

    // 2. Halve the size: move to (50, 50)
    // Vector becomes (50, -50), projection = (50*100 + (-50)*(-100))/20000 = 10000/20000 = 0.5
    const factorHalf = calculateResizeFactors(seHandle, initPos, { x: 50, y: 50 });
    expect(factorHalf.scaleX).toBeCloseTo(0.5, 5);
    expect(factorHalf.scaleY).toBeCloseTo(0.5, 5);

    // 3. Minimum scale clamping: move exactly to anchor (0, 100)
    const factorMin = calculateResizeFactors(seHandle, initPos, { x: 0, y: 100 });
    expect(factorMin.scaleX).toBe(0.15); // clamped to 0.15 min
    expect(factorMin.scaleY).toBe(0.15);

    // 4. Maximum scale clamping: move extremely far to (5000, -5000)
    const factorMax = calculateResizeFactors(seHandle, initPos, { x: 5000, y: -5000 });
    expect(factorMax.scaleX).toBe(20); // clamped to 20 max
    expect(factorMax.scaleY).toBe(20);

    // 5. Test NW handle under Cartesian space
    const nwHandle = handles.find((h) => h.type === 'nw')!; // at (0, 100), anchor at (100, 0)
    const nwInit = { x: nwHandle.x, y: nwHandle.y };
    // Move up and left in Cartesian space: x = -100, y = 200
    // Anchor (100, 0). Init vector = (-100, 100). Curr vector = (-200, 200). Projection = 2.0
    const nw2x = calculateResizeFactors(nwHandle, nwInit, { x: -100, y: 200 });
    expect(nw2x.scaleX).toBeCloseTo(2.0, 5);
    expect(nw2x.scaleY).toBeCloseTo(2.0, 5);
  });

  test('EMP-SEL-03: Edge handle directional scaling math under inverted Y Cartesian space', async () => {
    const bbox: BoundingBox = {
      minX: 10,
      maxX: 110,
      minY: 20,
      maxY: 120,
      width: 100,
      height: 100,
      centerX: 60,
      centerY: 70,
    };
    const handles = getTransformHandles(bbox);

    // 1. East handle (e): mode 'x', anchor is (minX, centerY) = (10, 70), initial handle is (110, 70)
    const eHandle = handles.find((h) => h.type === 'e')!;
    expect(eHandle.mode).toBe('x');
    const eInit = { x: eHandle.x, y: eHandle.y };

    // Drag right by +50: x becomes 160. dx = 160 - 10 = 150. it = 110 - 10 = 100. sx = 1.5
    const eResize = calculateResizeFactors(eHandle, eInit, { x: 160, y: 70 });
    expect(eResize.scaleX).toBeCloseTo(1.5, 5);
    expect(eResize.scaleY).toBe(1); // Y strictly invariant

    // 2. West handle (w): mode 'x', anchor is (maxX, centerY) = (110, 70), initial handle is (10, 70)
    const wHandle = handles.find((h) => h.type === 'w')!;
    expect(wHandle.mode).toBe('x');
    const wInit = { x: wHandle.x, y: wHandle.y };

    // Drag left by -50: x becomes -40. dx = -40 - 110 = -150. it = 10 - 110 = -100. sx = -150/-100 = 1.5
    const wResize = calculateResizeFactors(wHandle, wInit, { x: -40, y: 70 });
    expect(wResize.scaleX).toBeCloseTo(1.5, 5);
    expect(wResize.scaleY).toBe(1); // Y strictly invariant

    // 3. North handle (n): mode 'y', anchor is (centerX, minY) = (60, 20), initial handle is (60, 120)
    // In Cartesian math space, +Y is UP. Moving mouse UP increases world Y!
    const nHandle = handles.find((h) => h.type === 'n')!;
    expect(nHandle.mode).toBe('y');
    const nInit = { x: nHandle.x, y: nHandle.y };

    // Drag UP in world space: y increases from 120 to 170. dy = 170 - 20 = 150. Et = 120 - 20 = 100. sy = 1.5
    const nResize = calculateResizeFactors(nHandle, nInit, { x: 60, y: 170 });
    expect(nResize.scaleX).toBe(1); // X strictly invariant
    expect(nResize.scaleY).toBeCloseTo(1.5, 5);

    // Drag DOWN in world space: y shrinks to 70. dy = 70 - 20 = 50. sy = 50/100 = 0.5
    const nShrink = calculateResizeFactors(nHandle, nInit, { x: 60, y: 70 });
    expect(nShrink.scaleX).toBe(1);
    expect(nShrink.scaleY).toBeCloseTo(0.5, 5);

    // 4. South handle (s): mode 'y', anchor is (centerX, maxY) = (60, 120), initial handle is (60, 20)
    // Moving mouse DOWN decreases world Y!
    const sHandle = handles.find((h) => h.type === 's')!;
    expect(sHandle.mode).toBe('y');
    const sInit = { x: sHandle.x, y: sHandle.y };

    // Drag DOWN in world space: y decreases from 20 to -30. dy = -30 - 120 = -150. Et = 20 - 120 = -100. sy = 1.5
    const sResize = calculateResizeFactors(sHandle, sInit, { x: 60, y: -30 });
    expect(sResize.scaleX).toBe(1); // X strictly invariant
    expect(sResize.scaleY).toBeCloseTo(1.5, 5);
  });

  test('EMP-SEL-04: Marquee AABB intersection with partially enclosed, fully enclosed, and disjoint elements', async () => {
    // Construct test elements in math coordinate space
    const fullyEnclosed: CanvasElement = {
      id: 'el-full',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 'tester', createdAtSeq: 1 },
      props: { points: [20, 20, 40, 40, 60, 60] },
    };

    const partiallyEnclosed: CanvasElement = {
      id: 'el-partial',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 'tester', createdAtSeq: 2 },
      props: { points: [80, 80, 150, 150] }, // Crosses border of marquee (0..100)
    };

    const disjointX: CanvasElement = {
      id: 'el-disjoint-x',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 'tester', createdAtSeq: 3 },
      props: { points: [150, 20, 180, 40] },
    };

    const disjointY: CanvasElement = {
      id: 'el-disjoint-y',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 'tester', createdAtSeq: 4 },
      props: { points: [20, 150, 40, 180] },
    };

    const touchingEdge: CanvasElement = {
      id: 'el-touching',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 'tester', createdAtSeq: 5 },
      props: { points: [100, 50, 120, 60] }, // Touches x=100
    };

    const hiddenElement: CanvasElement = {
      id: 'el-hidden',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2, hidden: true },
      meta: { page: 1, createdBy: 'tester', createdAtSeq: 6 },
      props: { points: [30, 30, 50, 50] },
    };

    const allElements = [
      fullyEnclosed,
      partiallyEnclosed,
      disjointX,
      disjointY,
      touchingEdge,
      hiddenElement,
    ];

    // Marquee bounding rectangle: [0, 0] to [100, 100]
    const marquee1 = { sx: 0, sy: 0, x: 100, y: 100 };
    const matched1 = testMarqueeIntersection(marquee1, allElements);

    // Must match fully enclosed, partially enclosed, and touching edge
    expect(matched1).toContain('el-full');
    expect(matched1).toContain('el-partial');
    expect(matched1).toContain('el-touching');

    // Must NOT match disjoint elements
    expect(matched1).not.toContain('el-disjoint-x');
    expect(matched1).not.toContain('el-disjoint-y');

    // Must NOT match hidden element
    expect(matched1).not.toContain('el-hidden');

    // Inverted Marquee Drag: Dragging from (100, 100) down to (0, 0)
    const marqueeInverted = { sx: 100, sy: 100, x: 0, y: 0 };
    const matchedInverted = testMarqueeIntersection(marqueeInverted, allElements);
    expect(matchedInverted.sort()).toEqual(matched1.sort());
  });
});

test.describe('Challenger 2: CRDT Undo/Redo Engine & State Synchronization', () => {

  test('EMP-CRDT-01: Gesture batching compresses rapid continuous pointer moves into exactly ONE undo step', async () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'test_actor', name: 'Tester' },
    });

    // 1. Initial element creation (Undo step 1)
    const createRes = dispatcher.dispatch({
      type: 'object.create',
      params: {
        id: 'drag-target-1',
        type: 'Rectangle',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000', width: 2 },
        props: { width: 100, height: 100 },
      },
    });
    expect(createRes.ok).toBe(true);
    expect(dispatcher.undoManager.undoStack.length).toBe(1);

    // 2. Begin continuous drag gesture
    dispatcher.gesture(true);

    // Simulate 50 continuous rapid pointer moves during the drag gesture
    for (let step = 1; step <= 50; step++) {
      dispatcher.batch(() => {
        dispatcher.dispatch({
          type: 'object.update',
          params: {
            id: 'drag-target-1',
            transform: { x: step * 2, y: step * 3 },
          },
        });
      });
    }

    // End drag gesture
    dispatcher.gesture(false);

    // CRITICAL INVARIANT: The entire continuous drag gesture MUST register as exactly ONE additional undo step!
    expect(dispatcher.undoManager.undoStack.length).toBe(2);

    // Verify current element position is at the end of the gesture (x: 100, y: 150)
    const elementsAfterDrag = dispatcher.getElements();
    const movedEl = elementsAfterDrag.find((e) => e.id === 'drag-target-1')!;
    expect(movedEl.transform.x).toBe(100);
    expect(movedEl.transform.y).toBe(150);

    // 3. Perform a single Undo
    const undoSuccess = dispatcher.undo();
    expect(undoSuccess).toBe(true);

    // The element MUST revert cleanly back to its initial position (x: 0, y: 0) in ONE step!
    const elementsAfterUndo = dispatcher.getElements();
    const revertedEl = elementsAfterUndo.find((e) => e.id === 'drag-target-1')!;
    expect(revertedEl.transform.x).toBe(0);
    expect(revertedEl.transform.y).toBe(0);
    expect(dispatcher.undoManager.undoStack.length).toBe(1);

    // 4. Perform a single Redo
    const redoSuccess = dispatcher.redo();
    expect(redoSuccess).toBe(true);

    // The element MUST restore to its post-drag position (x: 100, y: 150) in ONE step!
    const elementsAfterRedo = dispatcher.getElements();
    const redoneEl = elementsAfterRedo.find((e) => e.id === 'drag-target-1')!;
    expect(redoneEl.transform.x).toBe(100);
    expect(redoneEl.transform.y).toBe(150);
    expect(dispatcher.undoManager.undoStack.length).toBe(2);
  });

  test('EMP-CRDT-02: Layout origin transactions tagged with origin "layout" do not pollute the undo stack', async () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'test_actor', name: 'Tester' },
    });

    // Step 1: User creates element A
    dispatcher.dispatch({
      type: 'object.create',
      params: {
        id: 'elem-A',
        type: 'Point',
        transform: { x: 10, y: 20, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#1565C0', width: 2 },
        props: { x: 10, y: 20 },
      },
    });
    expect(dispatcher.undoManager.undoStack.length).toBe(1);

    // Step 2: Perform 20 layout transactions tagged with origin LAYOUT_ORIGIN
    for (let i = 0; i < 20; i++) {
      dispatcher.layout(() => {
        dispatcher.dispatch({
          type: 'object.update',
          params: {
            id: 'elem-A',
            transform: { x: 10 + i, y: 20 + i },
          },
        });
      });
    }

    // CRITICAL INVARIANT: Layout transactions MUST NOT increment the undo stack!
    expect(dispatcher.undoManager.undoStack.length).toBe(1);

    // Step 3: User creates element B
    dispatcher.dispatch({
      type: 'object.create',
      params: {
        id: 'elem-B',
        type: 'Point',
        transform: { x: 100, y: 200, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#DC2626', width: 2 },
        props: { x: 100, y: 200 },
      },
    });
    expect(dispatcher.undoManager.undoStack.length).toBe(2);

    // Step 4: Perform more layout transactions
    dispatcher.layout(() => {
      dispatcher.dispatch({
        type: 'object.update',
        params: { id: 'elem-B', transform: { x: 105, y: 205 } },
      });
    });

    // Undo stack still strictly 2!
    expect(dispatcher.undoManager.undoStack.length).toBe(2);

    // Step 5: Undo once -> reverts element B creation
    dispatcher.undo();
    expect(dispatcher.getElements().find((e) => e.id === 'elem-B')).toBeUndefined();
    expect(dispatcher.undoManager.undoStack.length).toBe(1);

    // Step 6: Undo again -> reverts element A creation
    dispatcher.undo();
    expect(dispatcher.getElements().find((e) => e.id === 'elem-A')).toBeUndefined();
    expect(dispatcher.undoManager.undoStack.length).toBe(0);
  });

  test('EMP-CRDT-03: Deletion and undo restoration cleanly restores exact element with identical id, transform, style, and props', async () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'fidelity_tester', name: 'Fidelity Tester' },
    });

    // Create a rich complex element
    const originalEl: CanvasElement = {
      id: 'precise_stroke_99',
      type: 'Ink',
      transform: {
        x: -42.85,
        y: 194.22,
        scale: 1.45,
        rotation: 15,
        z: 7,
      },
      style: {
        stroke: '#7C3AED',
        fill: '#BE123C',
        width: 3.5,
        opacity: 0.85,
        dash: true,
        hidden: false,
      },
      meta: {
        createdBy: 'fidelity_tester',
        createdAtSeq: 10,
        page: 1,
      },
      props: {
        points: [10.5, 20.2, 30.7, 40.9, 50.1, 60.3],
        pressures: [0.2, 0.5, 0.9],
        nib: 'fountain',
        closed: false,
      },
    };

    const res = dispatcher.dispatch({
      type: 'object.create',
      params: {
        id: originalEl.id,
        type: originalEl.type,
        transform: originalEl.transform,
        style: originalEl.style,
        props: originalEl.props,
      },
    });
    expect(res.ok).toBe(true);

    const created = dispatcher.getElements().find((e) => e.id === originalEl.id)!;
    expect(created).toBeDefined();

    // Delete the element
    const delRes = dispatcher.dispatch({
      type: 'object.delete',
      params: { id: originalEl.id },
    });
    expect(delRes.ok).toBe(true);
    expect(dispatcher.getElements().find((e) => e.id === originalEl.id)).toBeUndefined();

    // Execute Undo
    const undoRes = dispatcher.undo();
    expect(undoRes).toBe(true);

    // Verify restored element
    const restored = dispatcher.getElements().find((e) => e.id === originalEl.id);
    expect(restored).toBeDefined();

    // Verify exact identity and attributes
    expect(restored!.id).toBe(originalEl.id);
    expect(restored!.type).toBe(originalEl.type);

    // Verify exact transform
    expect(restored!.transform.x).toBeCloseTo(originalEl.transform.x, 5);
    expect(restored!.transform.y).toBeCloseTo(originalEl.transform.y, 5);
    expect(restored!.transform.scale).toBeCloseTo(originalEl.transform.scale, 5);
    expect(restored!.transform.rotation).toBeCloseTo(originalEl.transform.rotation, 5);
    expect(restored!.transform.z).toBe(originalEl.transform.z);

    // Verify exact style
    expect(restored!.style.stroke).toBe(originalEl.style.stroke);
    expect(restored!.style.fill).toBe(originalEl.style.fill);
    expect(restored!.style.width).toBe(originalEl.style.width);
    expect(restored!.style.dash).toBe(originalEl.style.dash);
    expect(restored!.style.hidden).toBe(false);

    // Verify exact props
    expect(restored!.props.points).toEqual(originalEl.props.points);
    expect(restored!.props.pressures).toEqual(originalEl.props.pressures);
    expect(restored!.props.nib).toBe(originalEl.props.nib);
    expect(restored!.props.closed).toBe(originalEl.props.closed);

    // Test Redo
    dispatcher.redo();
    expect(dispatcher.getElements().find((e) => e.id === originalEl.id)).toBeUndefined();

    // Test Undo again
    dispatcher.undo();
    const restoredAgain = dispatcher.getElements().find((e) => e.id === originalEl.id)!;
    expect(restoredAgain.id).toBe(originalEl.id);
    expect(restoredAgain.props.points).toEqual(originalEl.props.points);
  });
});

test.describe('Challenger 2: Live Browser E2E Interaction Stress Test', () => {

  test('EMP-E2E-01: Live canvas 8-handle visibility, hit detection, and directional cursor styling', async ({ page }) => {
    const roomId = `stress-handles-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Draw ink stroke
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 300, y: 300 },
      { x: 450, y: 400 },
    ]);
    await canvas.waitForObjectCount(1);

    // Select stroke
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 375, y: 350 });

    // Assert selection box visible
    await expect(canvas.selectionBox.first()).toBeVisible();

    // Verify all 8 handles exist in DOM with correct data attributes
    const expectedHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const hType of expectedHandles) {
      const handleEl = page.locator(`[data-wb-handle="${hType}"]`).first();
      await expect(handleEl).toBeAttached();
      await expect(handleEl).toBeVisible();
    }

    // Verify corner handle cursors
    const nwHandle = page.locator('[data-wb-handle="nw"]').first();
    await expect(nwHandle).toHaveCSS('cursor', 'nwse-resize');

    const neHandle = page.locator('[data-wb-handle="ne"]').first();
    await expect(neHandle).toHaveCSS('cursor', 'nesw-resize');

    const seHandle = page.locator('[data-wb-handle="se"]').first();
    await expect(seHandle).toHaveCSS('cursor', 'nwse-resize');

    const swHandle = page.locator('[data-wb-handle="sw"]').first();
    await expect(swHandle).toHaveCSS('cursor', 'nesw-resize');

    // Verify edge handle cursors
    const nHandle = page.locator('[data-wb-handle="n"]').first();
    await expect(nHandle).toHaveCSS('cursor', 'ns-resize');

    const sHandle = page.locator('[data-wb-handle="s"]').first();
    await expect(sHandle).toHaveCSS('cursor', 'ns-resize');

    const eHandle = page.locator('[data-wb-handle="e"]').first();
    await expect(eHandle).toHaveCSS('cursor', 'ew-resize');

    const wHandle = page.locator('[data-wb-handle="w"]').first();
    await expect(wHandle).toHaveCSS('cursor', 'ew-resize');
  });

  test('EMP-E2E-02: Live browser gesture batching compresses multi-point drag into single undo', async ({ page }) => {
    const roomId = `stress-gesture-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create a point
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 400, y: 300 });
    await canvas.waitForObjectCount(1);

    // Select the point
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 400, y: 300 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    const boxBefore = await canvas.selectionBox.first().boundingBox();
    expect(boxBefore).toBeTruthy();

    const startX = boxBefore!.x + boxBefore!.width / 2;
    const startY = boxBefore!.y + boxBefore!.height / 2;

    // Perform continuous 15-step drag to (startX + 120, startY + 80)
    await canvas.drag(
      { x: startX, y: startY },
      { x: startX + 120, y: startY + 80 },
      { steps: 15 }
    );

    const boxAfterDrag = await canvas.selectionBox.first().boundingBox();
    expect(boxAfterDrag).toBeTruthy();
    expect(boxAfterDrag!.x).toBeGreaterThan(boxBefore!.x + 80);

    // Press Ctrl+Z exactly ONCE
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    // Box should immediately be back at initial position (+- 5px tolerance)
    const boxAfterUndo = await canvas.selectionBox.first().boundingBox();
    expect(boxAfterUndo).toBeTruthy();
    expect(Math.abs(boxAfterUndo!.x - boxBefore!.x)).toBeLessThan(5);
    expect(Math.abs(boxAfterUndo!.y - boxBefore!.y)).toBeLessThan(5);
  });
});
