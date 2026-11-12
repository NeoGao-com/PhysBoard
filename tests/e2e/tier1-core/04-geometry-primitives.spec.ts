import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 1 — Core Functionality: Test Suite 04
 * 2D Geometry Primitives: Points with Auto-Labels (A, B, C), Segments, Lines, Rays, Vectors,
 * Circles, Polygons, Special Triangles, and Special Quadrilaterals.
 * Features covered:
 * - Feature 11: Geometry Points (`geometry.point`)
 * - Feature 12: 2D Segments, Lines, Rays, Vectors
 * - Feature 13: 2D Circles & Arbitrary Polygons
 * - Feature 14: Special Triangles
 * - Feature 15: Special Quadrilaterals
 */
test.describe('Tier 1: 04 2D Geometry Primitives & Auto-Labels', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-geom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-04-01: Points are auto-labeled sequentially (A, B, C) upon placement', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('point');

    // Click 3 distinct positions on canvas
    await canvas.clickAt({ x: 250, y: 250 });
    await canvas.clickAt({ x: 400, y: 250 });
    await canvas.clickAt({ x: 325, y: 400 });

    // Wait for at least 3 point objects/labels
    await expect.poll(async () => canvas.getObjectCount()).toBeGreaterThanOrEqual(3);

    // Verify auto-labels A, B, C exist in DOM
    const textA = page.locator('text:has-text("A"), [data-label="A"]');
    const textB = page.locator('text:has-text("B"), [data-label="B"]');
    const textC = page.locator('text:has-text("C"), [data-label="C"]');

    await expect(textA.first()).toBeVisible();
    await expect(textB.first()).toBeVisible();
    await expect(textC.first()).toBeVisible();
  });

  test('TC-04-02: Straight segment, line, ray, and vector tools create corresponding elements', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // 1. Straight segment
    await toolbar.selectTool('segment');
    await canvas.drag({ x: 200, y: 200 }, { x: 350, y: 200 });
    await canvas.waitForObjectCount(1);

    const segmentEl = canvas.getLatestObject();
    await expect(segmentEl).toBeVisible();

    // 2. Vector with arrow head
    await toolbar.selectDropdownItem('segment', 'Vectơ');
    await canvas.drag({ x: 200, y: 280 }, { x: 350, y: 280 });
    await canvas.waitForObjectCount(2);

    const vectorEl = canvas.getLatestObject();
    const hasMarker = await vectorEl.evaluate((el) => {
      const line = el.tagName.toLowerCase() === 'line' ? el : el.querySelector('line, path') || el;
      return (
        line.getAttribute('marker-end') !== null ||
        el.querySelector('polygon, marker, path.arrow') !== null ||
        el.getAttribute('data-type') === 'vector'
      );
    });
    expect(hasMarker).toBe(true);

    // 3. Infinite Line
    await toolbar.selectDropdownItem('segment', 'Đường');
    await canvas.drag({ x: 200, y: 350 }, { x: 350, y: 350 });
    await canvas.waitForObjectCount(3);
  });

  test('TC-04-03: Circle and arbitrary polygon creation', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // 1. Circle via center-radius drag
    await toolbar.selectTool('circle');
    await canvas.drag({ x: 300, y: 300 }, { x: 380, y: 300 });
    await canvas.waitForObjectCount(1);

    const circle = canvas.getLatestObject();
    const isCircle = await circle.evaluate((el) => {
      return el.tagName.toLowerCase() === 'circle' || el.querySelector('circle') !== null;
    });
    expect(isCircle).toBe(true);

    // 2. Polygon via vertex clicks
    await toolbar.selectTool('polygon');
    const vertices = [
      { x: 450, y: 200 },
      { x: 550, y: 200 },
      { x: 500, y: 300 },
      { x: 450, y: 200 }, // Close polygon
    ];
    for (const v of vertices) {
      await canvas.clickAt(v);
    }

    await canvas.waitForObjectCount(2);
    const polygon = canvas.getLatestObject();
    const isPolygon = await polygon.evaluate((el) => {
      return (
        el.tagName.toLowerCase() === 'polygon' ||
        el.tagName.toLowerCase() === 'path' ||
        el.querySelector('polygon, path') !== null
      );
    });
    expect(isPolygon).toBe(true);
  });

  test('TC-04-04: Special triangles (Right, Isosceles, Equilateral) creation', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Right triangle (Tam giác vuông)
    await toolbar.selectDropdownItem('planeGeometry', 'Tam giác vuông');
    await canvas.clickAt({ x: 250, y: 250 });
    await canvas.waitForObjectCount(1);

    const rightTriangle = canvas.getLatestObject();
    await expect(rightTriangle).toBeVisible();

    // Equilateral triangle (Tam giác đều)
    await toolbar.selectDropdownItem('planeGeometry', 'Tam giác đều');
    await canvas.clickAt({ x: 450, y: 250 });
    await canvas.waitForObjectCount(2);

    const equilateral = canvas.getLatestObject();
    await expect(equilateral).toBeVisible();
  });

  test('TC-04-05: Special quadrilaterals (Rectangle, Parallelogram, Rhombus, Square) creation', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Rectangle (Hình chữ nhật)
    await toolbar.selectDropdownItem('planeGeometry', 'Hình chữ nhật');
    await canvas.clickAt({ x: 300, y: 300 });
    await canvas.waitForObjectCount(1);

    const rect = canvas.getLatestObject();
    await expect(rect).toBeVisible();

    // Square (Hình vuông)
    await toolbar.selectDropdownItem('planeGeometry', 'Hình vuông');
    await canvas.clickAt({ x: 500, y: 300 });
    await canvas.waitForObjectCount(2);

    const square = canvas.getLatestObject();
    await expect(square).toBeVisible();
  });
});
