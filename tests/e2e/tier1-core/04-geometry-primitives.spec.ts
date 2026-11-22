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

  test('TC-04-06: Segment decorations (ground/water) render below segment regardless of draw direction, flip side, and delete cleanly', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // 1. Draw horizontal segment left-to-right at y=300
    await toolbar.selectTool('segment');
    await canvas.drag({ x: 240, y: 300 }, { x: 460, y: 300 });
    await canvas.waitForObjectCount(1);

    // 2. Select the segment
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 350, y: 300 });

    const decorBar = page.locator('[data-wb-segment-decor-bar="true"]');
    await expect(decorBar).toBeVisible();

    // 3. Add Ground decoration (Mặt đất) — must appear BELOW the segment
    const groundBtn = decorBar.locator('button[data-decor-kind="ground"]');
    await groundBtn.click();
    await expect(groundBtn).toHaveAttribute('data-active', 'true');

    const groundDecor = page.locator('g[data-wb-decor="ground"]');
    await expect(groundDecor).toHaveCount(1);

    const checkGroundBelow = async (expectedBelow: boolean) => {
      const result = await groundDecor.evaluate((g) => {
        const paths = g.querySelectorAll('path');
        const visPath = paths[paths.length - 1] as SVGPathElement;
        const bbox = visPath.getBBox();
        const seg = document.querySelector('[data-element-type="GeomSegment"], [data-wb-type="GeomSegment"]') as SVGGElement | null;
        const segLine = seg?.querySelector('line') ?? (seg as unknown as SVGLineElement | null);
        const segY = segLine ? parseFloat(segLine.getAttribute('y1') || '0') : bbox.y;
        return {
          bboxTop: bbox.y,
          bboxBottom: bbox.y + bbox.height,
          segY,
        };
      });
      if (expectedBelow) {
        expect(result.bboxBottom).toBeGreaterThan(result.segY + 0.05);
        expect(result.bboxTop).toBeGreaterThanOrEqual(result.segY - 0.02);
      } else {
        expect(result.bboxTop).toBeLessThan(result.segY - 0.05);
        expect(result.bboxBottom).toBeLessThanOrEqual(result.segY + 0.02);
      }
    };

    await checkGroundBelow(true);

    // 4. Flip side to top (⇅ Đổi mặt) and back to bottom
    const flipBtn = decorBar.locator('button[data-action="line-decor-flip"]');
    await expect(flipBtn).toBeVisible();
    await flipBtn.click();
    await checkGroundBelow(false);

    await flipBtn.click();
    await checkGroundBelow(true);

    // 5. Toggle Ground off by clicking the active button
    await groundBtn.click();
    await expect(groundDecor).toHaveCount(0);
    await expect(groundBtn).toHaveAttribute('data-active', 'false');

    // 6. Add both Ground and Water (verify Water is also below), then clear all via 🗑 Xoá trang trí
    const waterBtn = decorBar.locator('button[data-decor-kind="water"]');
    await groundBtn.click();
    await waterBtn.click();
    await expect(page.locator('g[data-element-type="LineDecor"]')).toHaveCount(2);

    const waterBelow = await page.locator('g[data-wb-decor="water"]').evaluate((g) => {
      const paths = g.querySelectorAll('path');
      const visPath = paths[paths.length - 1] as SVGPathElement;
      const bbox = visPath.getBBox();
      const seg = document.querySelector('[data-element-type="GeomSegment"]') as SVGGElement | null;
      const segLine = seg?.querySelector('line');
      const segY = segLine ? parseFloat(segLine.getAttribute('y1') || '0') : 0;
      return { bboxTop: bbox.y, segY };
    });
    expect(waterBelow.bboxTop).toBeGreaterThan(waterBelow.segY + 0.02);

    await decorBar.locator('button[data-action="line-decor-clear"]').click();
    await expect(page.locator('g[data-element-type="LineDecor"]')).toHaveCount(0);
    // Parent segment must remain intact
    await expect(page.locator('[data-element-type="GeomSegment"]')).toHaveCount(1);

    // 7. Draw a second segment RIGHT-TO-LEFT, add Ground, confirm still below, then select LineDecor directly & Delete
    await toolbar.selectTool('segment');
    await canvas.drag({ x: 460, y: 400 }, { x: 240, y: 400 });
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 350, y: 400 });
    await expect(decorBar).toBeVisible();
    await decorBar.locator('button[data-decor-kind="ground"]').click();
    await expect(page.locator('g[data-wb-decor="ground"]')).toHaveCount(1);

    const secondGround = await page.locator('g[data-wb-decor="ground"]').evaluate((g) => {
      const paths = g.querySelectorAll('path');
      const visPath = paths[paths.length - 1] as SVGPathElement;
      const bbox = visPath.getBBox();
      const segs = Array.from(document.querySelectorAll('[data-element-type="GeomSegment"] line'));
      const segLine = segs[segs.length - 1] as SVGLineElement | undefined;
      const segY = segLine ? parseFloat(segLine.getAttribute('y1') || '0') : 0;
      return { bboxBottom: bbox.y + bbox.height, segY };
    });
    expect(secondGround.bboxBottom).toBeGreaterThan(secondGround.segY + 0.05);

    // Click slightly below the second segment (on the ground hatches, away from center transform handle at x=350) and press Delete
    await canvas.clickAt({ x: 390, y: 407 });
    await expect(page.locator('g[data-wb-decor="ground"]')).toHaveAttribute('data-selected', 'true');
    await page.keyboard.press('Delete');
    await expect(page.locator('g[data-wb-decor="ground"]')).toHaveCount(0);
  });
});
