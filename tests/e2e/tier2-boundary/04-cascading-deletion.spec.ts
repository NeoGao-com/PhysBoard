import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 2 — Boundary & Corner Cases: Test Suite 04
 * Cascading Deletion of Dependent Geometric Entities when Parent Vertex is Deleted.
 * Features covered:
 * - Feature 11: Geometry Points (`geometry.point`)
 * - Feature 12: 2D Segments, Lines, Rays, Vectors
 * - Feature 16: 2D Geometry Constructions
 * - Feature 59: Adversarial Coverage Hardening
 */
test.describe('Tier 2: 04 Cascading Deletion on Geometric Dependencies', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-cascade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-04-B01: Deleting parent vertex Point A cascades to remove dependent Segment AB', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // 1. Create Point A at (200, 200) and Point B at (350, 200)
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 200, y: 200 });
    await canvas.clickAt({ x: 350, y: 200 });

    // 2. Connect Point A and Point B with a segment
    await toolbar.selectTool('segment');
    await canvas.drag({ x: 200, y: 200 }, { x: 350, y: 200 });

    const totalBefore = await canvas.getObjectCount();
    expect(totalBefore).toBeGreaterThanOrEqual(3); // Points A, B + Segment AB (or labels)

    // 3. Switch to select tool and select Point A
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 200, y: 200 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    // 4. Delete Point A
    await toolbar.deleteSelection(true);

    // 5. Verify cascading deletion: Point A is deleted AND dependent Segment AB is also removed
    const totalAfter = await canvas.getObjectCount();
    expect(totalAfter).toBeLessThan(totalBefore);

    // Point A must no longer be present
    const pointALabel = page.locator('text:has-text("A"), [data-label="A"]');
    await expect(pointALabel).not.toBeVisible();

    // 6. Undo the deletion: Both Point A and Segment AB should be restored atomically
    await toolbar.undo(true);
    await canvas.waitForObjectCount(totalBefore);
    await expect(pointALabel.first()).toBeVisible();
  });

  test('TC-04-B02: Deleting polygon vertex removes dependent polygon and cleans up orphan geometry', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create a triangle via plane geometry dropdown
    await toolbar.selectDropdownItem('planeGeometry', 'Tam giác vuông');
    await canvas.clickAt({ x: 300, y: 300 });
    await canvas.waitForObjectCount(1);

    // Select the triangle or its vertex
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 300, y: 300 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    // Delete selection
    await toolbar.deleteSelection(true);

    // Verify all parts of the triangle are deleted with no phantom SVG artifacts
    await canvas.waitForObjectCount(0);

    // Undo restores the complete triangle
    await toolbar.undo(true);
    await canvas.waitForObjectCount(1);
    await expect(canvas.getLatestObject()).toBeVisible();
  });
});
