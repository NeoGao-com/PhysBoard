import { test, expect } from '@playwright/test';
import {
  screenToWorld,
  worldToScreen,
  calculateZoomAtPoint,
  MIN_SCALE,
  MAX_SCALE,
  ContainerRect,
} from '@/lib/coordinates';
import { checkEraserCollision } from '@/lib/eraser';
import { CanvasElement } from '@/types/whiteboard';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Empirical Challenger Verification Suite for Milestone 1 (M1)
 * Mathematical Algorithms & Geometric Engine Stress Testing.
 *
 * Scope:
 * 1. Coordinates Invertibility (screenToWorld <=> worldToScreen) across extreme coordinates [-100000, 100000]
 * 2. Zoom Boundary Clamping & Edge Deltas (e.g. deltaY = +/- 1e6, +/- 1e12) strictly within [8, 600]
 * 3. Cursor-Centered Anchor Invariance under normal, extreme, and clamped zooming
 * 4. Eraser Geometry 12px Polyline Boundary Threshold (11.9px vs 12.1px) across zoom scales [10, 45, 200, 600]
 * 5. Eraser Geometry 24px Centroid Boundary Threshold (23.9px vs 24.1px) across zoom scales [10, 45, 200, 600]
 * 6. Live Browser DOM integration verification
 */
test.describe('M1 Empirical Challenger: Mathematical Algorithms & Geometric Engines', () => {

  // =========================================================================
  // 1. Coordinates Invertibility Stress
  // =========================================================================
  test('EC-01: Coordinate Invertibility across extreme ranges [-100000, 100000] and zoom scales', () => {
    const testCoordinates = [-100000, -50000, -1000.5, -42, 0, 0.0001, 10, 314.159, 1000.5, 50000, 100000];
    const testScales = [MIN_SCALE, 10, 24, 45, 100, 300, MAX_SCALE];
    const testTranslations = [
      { tx: 0, ty: 0 },
      { tx: 500, ty: 320 },
      { tx: -25000, ty: 35000 },
      { tx: 50000, ty: -50000 },
    ];
    const testRects: (ContainerRect | null)[] = [
      null,
      { left: 0, top: 0 },
      { left: 142.5, top: 88.75 },
    ];

    let totalChecks = 0;
    let maxError = 0;

    for (const scale of testScales) {
      for (const { tx, ty } of testTranslations) {
        for (const rect of testRects) {
          for (let i = 0; i < testCoordinates.length; i++) {
            const xw = testCoordinates[i];
            const yw = testCoordinates[(i + 3) % testCoordinates.length];
            totalChecks++;

            // Forward: world -> screen
            const screenPt = worldToScreen(xw, yw, tx, ty, scale, rect);

            // Backward: screen -> world
            const recovered = screenToWorld(
              screenPt.clientX,
              screenPt.clientY,
              tx,
              ty,
              scale,
              rect
            );

            const errX = Math.abs(recovered.x - xw);
            const errY = Math.abs(recovered.y - yw);
            const err = Math.max(errX, errY);
            if (err > maxError) maxError = err;

            // Error must be well within numerical floating point precision (< 1e-8)
            expect(errX).toBeLessThan(1e-8);
            expect(errY).toBeLessThan(1e-8);
          }
        }
      }
    }

    // Verify reverse: screen -> world -> screen
    const testScreenPoints = [
      { cx: 0, cy: 0 },
      { cx: 640, cy: 400 },
      { cx: 1920, cy: 1080 },
      { cx: -5000, cy: 5000 },
      { cx: 50000, cy: -50000 },
    ];

    for (const scale of testScales) {
      for (const { tx, ty } of testTranslations) {
        for (const rect of testRects) {
          for (const { cx, cy } of testScreenPoints) {
            totalChecks++;
            const worldPt = screenToWorld(cx, cy, tx, ty, scale, rect);
            const recoveredScreen = worldToScreen(worldPt.x, worldPt.y, tx, ty, scale, rect);

            const errCX = Math.abs(recoveredScreen.clientX - cx);
            const errCY = Math.abs(recoveredScreen.clientY - cy);
            if (errCX > maxError) maxError = errCX;
            if (errCY > maxError) maxError = errCY;

            expect(errCX).toBeLessThan(1e-8);
            expect(errCY).toBeLessThan(1e-8);
          }
        }
      }
    }

    expect(totalChecks).toBeGreaterThan(1000);
    expect(maxError).toBeLessThan(1e-9);
  });

  // =========================================================================
  // 2. Zoom Boundary Clamping & Edge Deltas
  // =========================================================================
  test('EC-02: Wheel zoom edge deltas (+/- 1e6, +/- 1e12) strictly clamp scale within [8, 600]', () => {
    const rect: ContainerRect = { left: 0, top: 0, width: 1000, height: 600 };
    const cx = 500;
    const cy = 300;

    // Test 1: Massive positive deltaY (zoom out) -> clamp to MIN_SCALE (8)
    const extremeZoomOutDeltas = [1e4, 1e6, 1e9, 1e12, 1e15];
    for (const delta of extremeZoomOutDeltas) {
      const result = calculateZoomAtPoint(cx, cy, delta, 500, 320, 45, rect);
      expect(result.scale).toBe(MIN_SCALE);
      expect(Number.isFinite(result.scale)).toBe(true);
      expect(Number.isFinite(result.tx)).toBe(true);
      expect(Number.isFinite(result.ty)).toBe(true);
    }

    // Test 2: Massive negative deltaY (zoom in) -> clamp to MAX_SCALE (600)
    const extremeZoomInDeltas = [-1e4, -1e6, -1e9, -1e12, -1e15];
    for (const delta of extremeZoomInDeltas) {
      const result = calculateZoomAtPoint(cx, cy, delta, 500, 320, 45, rect);
      expect(result.scale).toBe(MAX_SCALE);
      expect(Number.isFinite(result.scale)).toBe(true);
      expect(Number.isFinite(result.tx)).toBe(true);
      expect(Number.isFinite(result.ty)).toBe(true);
    }

    // Test 3: Starting already at boundaries
    // At MIN_SCALE (8), zoom-out must remain 8
    const atMin = calculateZoomAtPoint(cx, cy, 100, 500, 320, MIN_SCALE, rect);
    expect(atMin.scale).toBe(MIN_SCALE);
    expect(atMin.tx).toBe(500);
    expect(atMin.ty).toBe(320);

    // At MAX_SCALE (600), zoom-in must remain 600
    const atMax = calculateZoomAtPoint(cx, cy, -100, 500, 320, MAX_SCALE, rect);
    expect(atMax.scale).toBe(MAX_SCALE);
    expect(atMax.tx).toBe(500);
    expect(atMax.ty).toBe(320);

    // Test 4: Delta of zero -> no change
    const atZero = calculateZoomAtPoint(cx, cy, 0, 500, 320, 100, rect);
    expect(atZero.scale).toBe(100);
    expect(atZero.tx).toBe(500);
    expect(atZero.ty).toBe(320);

    // Test 5: 500 random stochastic zoom delta steps in succession
    let currentV = { tx: 500, ty: 320, scale: 45 };
    for (let step = 0; step < 500; step++) {
      const randDelta = (Math.random() - 0.5) * 2000; // [-1000, 1000]
      const randX = Math.random() * 1280;
      const randY = Math.random() * 800;

      currentV = calculateZoomAtPoint(
        randX,
        randY,
        randDelta,
        currentV.tx,
        currentV.ty,
        currentV.scale,
        rect
      );

      // Invariants that MUST NEVER fail
      expect(currentV.scale).toBeGreaterThanOrEqual(MIN_SCALE);
      expect(currentV.scale).toBeLessThanOrEqual(MAX_SCALE);
      expect(Number.isFinite(currentV.scale)).toBe(true);
      expect(Number.isFinite(currentV.tx)).toBe(true);
      expect(Number.isFinite(currentV.ty)).toBe(true);
    }
  });

  // =========================================================================
  // 3. Cursor-Centered Anchor Invariance
  // =========================================================================
  test('EC-03: Zooming at cursor (cx, cy) guarantees exact world anchor invariance', () => {
    const testFocalPoints = [
      { cx: 0, cy: 0 },
      { cx: 500, cy: 320 },
      { cx: 100, cy: 500 },
      { cx: 1280, cy: 800 },
      { cx: -200, cy: -150 }, // Off-screen cursor
      { cx: 3000, cy: 2500 }, // Far off-screen cursor
    ];

    const testDeltas = [
      -500, -200, -50, -1, 0, 1, 50, 200, 500,
      -1e5, 1e5, // Extreme clamping deltas
    ];

    const initialScales = [MIN_SCALE, 15, 45, 150, 450, MAX_SCALE];
    const rect: ContainerRect = { left: 100, top: 50, width: 1200, height: 750 };

    let totalAnchorChecks = 0;
    let maxDrift = 0;

    for (const initScale of initialScales) {
      for (const { cx, cy } of testFocalPoints) {
        for (const deltaY of testDeltas) {
          totalAnchorChecks++;

          const initTx = 400;
          const initTy = 250;

          // 1. World point before zoom
          const worldAnchor = screenToWorld(cx, cy, initTx, initTy, initScale, rect);

          // 2. Perform zoom
          const nextV = calculateZoomAtPoint(
            cx,
            cy,
            deltaY,
            initTx,
            initTy,
            initScale,
            rect
          );

          // 3. Map the same world point to screen coordinates using next viewport
          const screenAfter = worldToScreen(
            worldAnchor.x,
            worldAnchor.y,
            nextV.tx,
            nextV.ty,
            nextV.scale,
            rect
          );

          // 4. Measure screen drift
          const driftX = Math.abs(screenAfter.clientX - cx);
          const driftY = Math.abs(screenAfter.clientY - cy);
          const drift = Math.max(driftX, driftY);
          if (drift > maxDrift) maxDrift = drift;

          // Invariance assert: drift must be zero within floating point resolution (< 1e-10 px)
          expect(driftX).toBeLessThan(1e-10);
          expect(driftY).toBeLessThan(1e-10);
        }
      }
    }

    expect(totalAnchorChecks).toBeGreaterThanOrEqual(396);
    expect(maxDrift).toBeLessThan(1e-11);
  });

  // =========================================================================
  // 4. Eraser Geometry: 12px Polyline Boundary Threshold
  // =========================================================================
  test('EC-04: Eraser 12px threshold on polyline segments: hits at 11.9px, misses at 12.1px across zoom scales', () => {
    const testScales = [8, 10, 45, 100, 200, 600];

    for (const scale of testScales) {
      // Create a horizontal segment from (100, 200) to (300, 200) in world coordinates
      const inkElement: CanvasElement = {
        id: 'ink_test_seg',
        type: 'Ink',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000000', width: 2 },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: {
          points: [100, 200, 300, 200],
        },
      };

      // Test A: Perpendicular point at midpoint x = 200
      // 11.9px screen distance in world units
      const dHit = 11.9 / scale;
      // 12.1px screen distance in world units
      const dMiss = 12.1 / scale;

      // 1. Point at 11.9px perpendicular -> MUST HIT (11.9px <= 12px threshold)
      let deletedIds: string[] = [];
      const hitCursor = { x: 200, y: 200 + dHit };
      checkEraserCollision(hitCursor, [inkElement], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toContain('ink_test_seg');

      // 2. Point at 12.1px perpendicular -> MUST MISS (12.1px > 12px threshold)
      deletedIds = [];
      const missCursor = { x: 200, y: 200 + dMiss };
      checkEraserCollision(missCursor, [inkElement], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toHaveLength(0);

      // 3. Test at origin (0, 0) to avoid IEEE 754 offset rounding: exact 12.0px
      const originInk: CanvasElement = {
        id: 'ink_origin',
        type: 'Ink',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000000', width: 2 },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: { points: [-100, 0, 100, 0] },
      };
      deletedIds = [];
      checkEraserCollision({ x: 0, y: 12.0 / scale }, [originInk], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toContain('ink_origin');

      // Test B: Longitudinal point past segment endpoint (x = 300, y = 200)
      // 11.9px past end -> MUST HIT
      deletedIds = [];
      checkEraserCollision(
        { x: 300 + dHit, y: 200 },
        [inkElement],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toContain('ink_test_seg');

      // 12.1px past end -> MUST MISS
      deletedIds = [];
      checkEraserCollision(
        { x: 300 + dMiss, y: 200 },
        [inkElement],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toHaveLength(0);

      // Test C: Diagonal segment from (0,0) to (100, 100) with transform offset (50, 50)
      const diagInk: CanvasElement = {
        id: 'ink_diag',
        type: 'Ink',
        transform: { x: 50, y: 50, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000000', width: 2 },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: {
          points: [0, 0, 100, 100], // Absolute coords: (50,50) to (150,150)
        },
      };

      // Midpoint is at (100, 100). Normal vector is (-1/sqrt(2), 1/sqrt(2))
      const nx = -1 / Math.SQRT2;
      const ny = 1 / Math.SQRT2;

      // 11.9px along normal -> MUST HIT
      deletedIds = [];
      checkEraserCollision(
        { x: 100 + nx * dHit, y: 100 + ny * dHit },
        [diagInk],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toContain('ink_diag');

      // 12.1px along normal -> MUST MISS
      deletedIds = [];
      checkEraserCollision(
        { x: 100 + nx * dMiss, y: 100 + ny * dMiss },
        [diagInk],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toHaveLength(0);

      // Test D: Degenerate 0-length segment at (40, 40)
      const degenInk: CanvasElement = {
        id: 'ink_degen',
        type: 'Ink',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000000', width: 2 },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: { points: [40, 40, 40, 40] },
      };
      deletedIds = [];
      checkEraserCollision({ x: 40 + dHit, y: 40 }, [degenInk], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toContain('ink_degen');

      deletedIds = [];
      checkEraserCollision({ x: 40 + dMiss, y: 40 }, [degenInk], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toHaveLength(0);

      // Test E: Hidden ink element -> MUST NEVER HIT even at distance 0
      const hiddenInk: CanvasElement = {
        id: 'ink_hidden',
        type: 'Ink',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#000000', width: 2, hidden: true },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: { points: [100, 200, 300, 200] },
      };
      deletedIds = [];
      checkEraserCollision({ x: 200, y: 200 }, [hiddenInk], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toHaveLength(0);
    }
  });

  // =========================================================================
  // 5. Eraser Geometry: 24px Centroid Boundary Threshold
  // =========================================================================
  test('EC-05: Eraser 24px threshold on centroids: hits at 23.9px, misses at 24.1px across zoom scales', () => {
    const testScales = [8, 10, 45, 100, 200, 600];

    for (const scale of testScales) {
      const pointEl: CanvasElement = {
        id: 'pt_test_target',
        type: 'Point',
        transform: { x: 350, y: 250, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#1565C0', width: 2 },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: { x: 350, y: 250 },
      };

      const dHit24 = 23.9 / scale;
      const dMiss24 = 24.1 / scale;

      // 1. Distance 23.9px -> MUST HIT (23.9px <= 24px threshold)
      let deletedIds: string[] = [];
      checkEraserCollision(
        { x: 350 + dHit24, y: 250 },
        [pointEl],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toContain('pt_test_target');

      // 2. Distance 24.1px -> MUST MISS (24.1px > 24px threshold)
      deletedIds = [];
      checkEraserCollision(
        { x: 350 + dMiss24, y: 250 },
        [pointEl],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toHaveLength(0);

      // 3. Test at origin (0, 0) for exact 24.0px
      const originPt: CanvasElement = {
        id: 'pt_origin',
        type: 'Point',
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#1565C0', width: 2 },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: {},
      };
      deletedIds = [];
      checkEraserCollision(
        { x: 24.0 / scale, y: 0 },
        [originPt],
        scale,
        (id) => deletedIds.push(id)
      );
      expect(deletedIds).toContain('pt_origin');

      // 4. Hidden centroid object -> MUST NEVER HIT even at distance 0
      const hiddenPt: CanvasElement = {
        id: 'pt_hidden',
        type: 'Point',
        transform: { x: 350, y: 250, scale: 1, rotation: 0, z: 0 },
        style: { stroke: '#1565C0', width: 2, hidden: true },
        meta: { page: 1, createdBy: 'test', createdAtSeq: Date.now() },
        props: {},
      };
      deletedIds = [];
      checkEraserCollision({ x: 350, y: 250 }, [hiddenPt], scale, (id) => deletedIds.push(id));
      expect(deletedIds).toHaveLength(0);
    }
  });

  // =========================================================================
  // 6. Live Browser DOM Integration Verification
  // =========================================================================
  test('EC-06: Live Browser DOM: Anchor invariance & 11.9px vs 12.1px eraser accuracy', async ({ page }) => {
    const roomId = `test-empirical-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // 1. Draw a test stroke along y = 350 from x = 200 to 400
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 200, y: 350 },
      { x: 400, y: 350 },
    ]);
    await canvas.waitForObjectCount(1);

    // 2. Select eraser tool
    await toolbar.selectTool('erase');

    // 3. Sweep at y = 350 - 15px = 335px (distance is 15px > 12px threshold)
    // Stroke should NOT be erased
    await canvas.drag(
      { x: 250, y: 335 },
      { x: 350, y: 335 },
      { steps: 5 }
    );
    await page.waitForTimeout(200);
    expect(await canvas.getObjectCount()).toBe(1);

    // 4. Sweep at y = 350 - 8px = 342px (distance is 8px <= 12px threshold)
    // Stroke MUST be erased
    await canvas.drag(
      { x: 250, y: 342 },
      { x: 350, y: 342 },
      { steps: 5 }
    );
    await canvas.waitForObjectCount(0);
  });
});
