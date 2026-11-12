import { test, expect } from '@playwright/test';
import * as Y from 'yjs';
import {
  getTransformHandles,
  calculateResizeFactors,
  getInkBoundingBox,
  getCompositeBoundingBox,
} from '../../src/lib/selection';
import { WhiteboardCommandDispatcher } from '../../src/lib/dispatcher';
import { CanvasElement, BoundingBox } from '../../src/types/whiteboard';

/**
 * Challenger 2: Deep Stress, Adversarial Edge Cases & Fuzz Harness
 * Milestone 1: Core Selection Math & CRDT Engine
 */

test.describe('Challenger 2: Adversarial Selection & Bounding Box Stress Tests', () => {

  test('ADV-SEL-01: Degenerate and extreme bounding boxes (zero width, zero height, single point, negative infinity)', () => {
    // 1. Single-point Ink element
    const singlePointEl: CanvasElement = {
      id: 'pt-1',
      type: 'Ink',
      transform: { x: 50, y: -75, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 't', createdAtSeq: 1 },
      props: { points: [0, 0] },
    };
    const ptBox = getInkBoundingBox(singlePointEl);
    expect(ptBox.width).toBe(0);
    expect(ptBox.height).toBe(0);
    expect(ptBox.centerX).toBe(50);
    expect(ptBox.centerY).toBe(-75);

    // 2. Purely horizontal line (height = 0)
    const horizLine: CanvasElement = {
      id: 'line-h',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 't', createdAtSeq: 2 },
      props: { points: [-100, 50, 100, 50] },
    };
    const hBox = getInkBoundingBox(horizLine);
    expect(hBox.width).toBe(200);
    expect(hBox.height).toBe(0);
    expect(hBox.centerY).toBe(50);

    const hHandles = getTransformHandles(hBox);
    expect(hHandles).toHaveLength(8);

    // North handle on horizontal line: Et = maxY - minY = 50 - 50 = 0.
    const nHandle = hHandles.find((h) => h.type === 'n')!;
    const nFactor = calculateResizeFactors(nHandle, { x: nHandle.x, y: nHandle.y }, { x: 0, y: 100 });
    // Zero height denominator must gracefully return scale 1, avoiding NaN or Infinity
    expect(nFactor.scaleX).toBe(1);
    expect(nFactor.scaleY).toBe(1);

    // 3. Purely vertical line (width = 0)
    const vertLine: CanvasElement = {
      id: 'line-v',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 't', createdAtSeq: 3 },
      props: { points: [30, -100, 30, 100] },
    };
    const vBox = getInkBoundingBox(vertLine);
    expect(vBox.width).toBe(0);
    expect(vBox.height).toBe(200);

    const vHandles = getTransformHandles(vBox);
    const eHandle = vHandles.find((h) => h.type === 'e')!;
    const eFactor = calculateResizeFactors(eHandle, { x: eHandle.x, y: eHandle.y }, { x: 80, y: 0 });
    // Zero width denominator must gracefully return scale 1
    expect(eFactor.scaleX).toBe(1);
    expect(eFactor.scaleY).toBe(1);

    // 4. Massive 1,000-point complex polygon
    const largePoints: number[] = [];
    for (let i = 0; i < 1000; i++) {
      largePoints.push(Math.sin(i) * 500, Math.cos(i) * 300);
    }
    const massiveEl: CanvasElement = {
      id: 'massive-ink',
      type: 'Ink',
      transform: { x: 100, y: -200, scale: 2, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 't', createdAtSeq: 4 },
      props: { points: largePoints },
    };
    const massiveBox = getInkBoundingBox(massiveEl);
    expect(massiveBox.minX).toBeLessThan(100 - 490 * 2);
    expect(massiveBox.maxX).toBeGreaterThan(100 + 490 * 2);
    expect(massiveBox.minY).toBeLessThan(-200 - 290 * 2);
    expect(massiveBox.maxY).toBeGreaterThan(-200 + 290 * 2);
    expect(Number.isFinite(massiveBox.width)).toBe(true);
    expect(Number.isFinite(massiveBox.height)).toBe(true);
  });

  test('ADV-SEL-02: Fuzzing resize projection with erratic, orthogonal, and reverse mouse movements', () => {
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
    const seHandle = handles.find((h) => h.type === 'se')!; // anchor at (0, 100), handle at (100, 0)
    const initPos = { x: 100, y: 0 };

    // 1. Orthogonal drag: dragging perpendicular to diagonal (e.g. up and right)
    // Diagonal vector is (100, -100). Perpendicular vector is (100, 100).
    // Moving to (200, 100): current vector from anchor (0, 100) is (200, 0).
    // Dot product with (100, -100) = 200*100 + 0*(-100) = 20000.
    // Denominator = 100^2 + (-100)^2 = 20000.
    // Projection = 20000 / 20000 = 1.0 -> no scale distortion along orthogonal axis!
    const orthFactor = calculateResizeFactors(seHandle, initPos, { x: 200, y: 100 });
    expect(orthFactor.scaleX).toBeCloseTo(1.0, 5);
    expect(orthFactor.scaleY).toBeCloseTo(1.0, 5);

    // 2. Reverse drag beyond anchor (negative coordinates):
    // Dragging SE handle deep into top-left quadrant (-500, 600)
    // Projection becomes negative -> must clamp cleanly to min 0.15 without crashing or inverting
    const revFactor = calculateResizeFactors(seHandle, initPos, { x: -500, y: 600 });
    expect(revFactor.scaleX).toBe(0.15);
    expect(revFactor.scaleY).toBe(0.15);

    // 3. Directional East handle with negative reverse drag
    const eHandle = handles.find((h) => h.type === 'e')!; // anchor at (0, 50), handle at (100, 50)
    const eInit = { x: 100, y: 50 };
    const eRev = calculateResizeFactors(eHandle, eInit, { x: -200, y: 50 });
    // dx = -200, it = 100 -> dx/it = -2 -> clamped to min 0.15
    expect(eRev.scaleX).toBe(0.15);
    expect(eRev.scaleY).toBe(1);
  });

  test('ADV-SEL-03: Composite bounding box with mixed elements, empty inputs, and hidden flags', () => {
    // Empty array returns null
    expect(getCompositeBoundingBox([])).toBeNull();

    const el1: CanvasElement = {
      id: 'el-1',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 't', createdAtSeq: 1 },
      props: { points: [0, 0, 10, 10] },
    };

    const el2: CanvasElement = {
      id: 'el-2',
      type: 'Rectangle',
      transform: { x: 50, y: 50, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2 },
      meta: { page: 1, createdBy: 't', createdAtSeq: 2 },
      props: { width: 40, height: 20 }, // cx=50, cy=50 -> x:[30, 70], y:[40, 60]
    };

    const elHidden: CanvasElement = {
      id: 'el-hidden',
      type: 'Ink',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: '#000', width: 2, hidden: true },
      meta: { page: 1, createdBy: 't', createdAtSeq: 3 },
      props: { points: [1000, 1000, 2000, 2000] },
    };

    const composite = getCompositeBoundingBox([el1, el2, elHidden]);
    expect(composite).not.toBeNull();
    // elHidden MUST be ignored!
    expect(composite!.minX).toBe(0);
    expect(composite!.maxX).toBe(70);
    expect(composite!.minY).toBe(0);
    expect(composite!.maxY).toBe(60);
    expect(composite!.width).toBe(70);
    expect(composite!.height).toBe(60);
  });
});

test.describe('Challenger 2: Adversarial CRDT Undo/Redo Engine Stress Tests', () => {

  test('ADV-CRDT-01: Consecutive gesture bursts create strictly discrete undo items', () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'burst_tester', name: 'Burst Tester' },
    });

    dispatcher.dispatch({
      type: 'object.create',
      params: {
        id: 'target-burst',
        type: 'Point',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000', width: 2 },
        props: { x: 0, y: 0 },
      },
    });
    expect(dispatcher.undoManager.undoStack.length).toBe(1);

    // Perform 5 separate drag gestures in sequence
    const numGestures = 5;
    for (let g = 1; g <= numGestures; g++) {
      dispatcher.gesture(true);
      for (let p = 1; p <= 10; p++) {
        dispatcher.dispatch({
          type: 'object.update',
          params: {
            id: 'target-burst',
            transform: { x: g * 100 + p, y: g * 100 + p },
          },
        });
      }
      dispatcher.gesture(false);
    }

    // Stack should now have 1 (create) + 5 (gestures) = 6 items!
    expect(dispatcher.undoManager.undoStack.length).toBe(1 + numGestures);

    // Current position should be (510, 510)
    let el = dispatcher.getElements().find((e) => e.id === 'target-burst')!;
    expect(el.transform.x).toBe(510);
    expect(el.transform.y).toBe(510);

    // Step-by-step undo each gesture
    for (let g = numGestures; g >= 1; g--) {
      const undone = dispatcher.undo();
      expect(undone).toBe(true);
      el = dispatcher.getElements().find((e) => e.id === 'target-burst')!;
      if (g > 1) {
        // Previous gesture end position
        expect(el.transform.x).toBe((g - 1) * 100 + 10);
        expect(el.transform.y).toBe((g - 1) * 100 + 10);
      } else {
        // Reverted to pre-gesture state (created at (0, 0))
        expect(el.transform.x).toBe(0);
        expect(el.transform.y).toBe(0);
      }
    }

    // Now only 1 item on undo stack (the initial create)
    expect(dispatcher.undoManager.undoStack.length).toBe(1);
    expect(dispatcher.undoManager.redoStack.length).toBe(numGestures);

    // Redo all 5 gestures back to final position
    for (let g = 1; g <= numGestures; g++) {
      const redone = dispatcher.redo();
      expect(redone).toBe(true);
    }
    el = dispatcher.getElements().find((e) => e.id === 'target-burst')!;
    expect(el.transform.x).toBe(510);
  });

  test('ADV-CRDT-02: Branch truncation on new action after undo', () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'branch_tester', name: 'Branch Tester' },
    });

    // Action 1: Create
    dispatcher.dispatch({
      type: 'object.create',
      params: {
        id: 'branch-el',
        type: 'Point',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000', width: 2 },
        props: { x: 0, y: 0 },
      },
    });

    // Action 2: Update 1
    dispatcher.dispatch({
      type: 'object.update',
      params: { id: 'branch-el', transform: { x: 10, y: 10 } },
    });

    // Action 3: Update 2
    dispatcher.dispatch({
      type: 'object.update',
      params: { id: 'branch-el', transform: { x: 20, y: 20 } },
    });

    expect(dispatcher.undoManager.undoStack.length).toBe(3);

    // Undo Action 3 -> now on undo stack: 2, on redo stack: 1
    dispatcher.undo();
    expect(dispatcher.undoManager.undoStack.length).toBe(2);
    expect(dispatcher.undoManager.redoStack.length).toBe(1);

    // Now dispatch NEW action: Update 3 to (99, 99)
    dispatcher.dispatch({
      type: 'object.update',
      params: { id: 'branch-el', transform: { x: 99, y: 99 } },
    });

    // Redo stack MUST now be empty (standard CRDT branch divergence handling)
    expect(dispatcher.undoManager.redoStack.length).toBe(0);
    expect(dispatcher.undoManager.undoStack.length).toBe(3);
  });

  test('ADV-CRDT-03: Atomic batch deletion and multi-object restoration fidelity', () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'batch_del_tester', name: 'Batch Del Tester' },
    });

    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = `multi-obj-${i}`;
      ids.push(id);
      dispatcher.dispatch({
        type: 'object.create',
        params: {
          id,
          type: 'Point',
          transform: { x: i * 20, y: i * 30, scale: 1, rotation: 0, z: i },
          style: { stroke: `#${i}${i}${i}`, width: i + 1 },
          props: { val: i * 100 },
        },
      });
    }

    expect(dispatcher.getElements()).toHaveLength(5);
    const undoStackBeforeBatch = dispatcher.undoManager.undoStack.length;

    // Delete 3 objects in a single batch
    const toDelete = [ids[0], ids[2], ids[4]];
    dispatcher.deleteObjects(toDelete);

    // Remaining count should be 2
    expect(dispatcher.getElements()).toHaveLength(2);
    // Batch deletion must add exactly 1 undo step!
    expect(dispatcher.undoManager.undoStack.length).toBe(undoStackBeforeBatch + 1);

    // Undo batch deletion
    dispatcher.undo();

    // All 5 must be restored immediately
    const restored = dispatcher.getElements();
    expect(restored).toHaveLength(5);

    // Verify properties of restored deleted objects
    for (const id of toDelete) {
      const el = restored.find((e) => e.id === id);
      expect(el).toBeDefined();
    }
  });

  test('ADV-CRDT-04: Interleaved layout transactions under high contention', () => {
    const doc = new Y.Doc();
    const dispatcher = new WhiteboardCommandDispatcher({
      doc,
      actor: { id: 'interleave_tester', name: 'Interleave Tester' },
    });

    // Create 3 elements with user actions
    for (let i = 1; i <= 3; i++) {
      dispatcher.dispatch({
        type: 'object.create',
        params: {
          id: `item-${i}`,
          type: 'Point',
          transform: { x: i * 10, y: i * 10, scale: 1, rotation: 0, z: 0 },
          style: { stroke: '#000', width: 2 },
          props: {},
        },
      });

      // Interleave layout transaction
      dispatcher.layout(() => {
        dispatcher.dispatch({
          type: 'object.update',
          params: { id: `item-${i}`, transform: { x: i * 10, y: i * 10 + 5 } },
        });
      });
    }

    // Total user actions = 3. Layout actions = 3. Undo stack MUST be exactly 3!
    expect(dispatcher.undoManager.undoStack.length).toBe(3);

    // Undo 3 times
    expect(dispatcher.undo()).toBe(true);
    expect(dispatcher.getElements().find((e) => e.id === 'item-3')).toBeUndefined();

    expect(dispatcher.undo()).toBe(true);
    expect(dispatcher.getElements().find((e) => e.id === 'item-2')).toBeUndefined();

    expect(dispatcher.undo()).toBe(true);
    expect(dispatcher.getElements().find((e) => e.id === 'item-1')).toBeUndefined();

    // No user actions left to undo
    expect(dispatcher.canUndo()).toBe(false);
    expect(dispatcher.undo()).toBe(false);
  });
});
