import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 1 — Core Functionality: Test Suite 06
 * Selection Tool, Single Click Selection, Bounding Box Handles, Drag Translation,
 * Corner Handle Resize, Marquee Multi-Select, and Floating Selection Action Bar.
 * Features covered:
 * - Feature 7: Selection & Bounding Box Transform
 * - Feature 8: Marquee Multi-Select
 * - Feature 10: Floating Selection Action Bar (`data-wb-selection-bar`)
 */
test.describe('Tier 1: 06 Selection, Transform & Action Bar', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-select-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-06-01: Single element click selection reveals bounding box and transform handles', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Draw an ink stroke at known coordinates
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 300, y: 300 },
      { x: 450, y: 300 },
    ]);
    await canvas.waitForObjectCount(1);

    // Switch to select tool
    await toolbar.selectTool('select');

    // Click on the element
    await canvas.clickAt({ x: 350, y: 300 });

    // Assert bounding box is visible
    await expect(canvas.selectionBox.first()).toBeVisible();

    // Assert handles (e.g. corner / edge handles) are present
    const handles = page.locator('[data-wb-handle], .wb-handle');
    const handleCount = await handles.count();
    expect(handleCount).toBeGreaterThanOrEqual(4);
  });

  test('TC-06-02: Drag translation moves selected element to new coordinates', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create a point
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 300, y: 300 });
    await canvas.waitForObjectCount(1);

    // Select the element
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 300, y: 300 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    const initialBox = await canvas.selectionBox.first().boundingBox();
    expect(initialBox).toBeTruthy();

    // Drag from center of selection box by +100px X and +50px Y
    if (initialBox) {
      const startX = initialBox.x + initialBox.width / 2;
      const startY = initialBox.y + initialBox.height / 2;
      await canvas.drag(
        { x: startX, y: startY },
        { x: startX + 100, y: startY + 50 },
        { steps: 5 }
      );
    }

    const updatedBox = await canvas.selectionBox.first().boundingBox();
    expect(updatedBox).toBeTruthy();

    if (initialBox && updatedBox) {
      expect(updatedBox.x).toBeGreaterThan(initialBox.x + 50);
      expect(updatedBox.y).toBeGreaterThan(initialBox.y + 20);
    }
  });

  test('TC-06-03: Dragging corner resize handle resizes the element dimensions', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create a circle or rectangle
    await toolbar.selectDropdownItem('planeGeometry', 'Hình chữ nhật');
    await canvas.clickAt({ x: 350, y: 350 });
    await canvas.waitForObjectCount(1);

    // Select element
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 350, y: 350 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    const boxBefore = await canvas.selectionBox.first().boundingBox();
    expect(boxBefore).toBeTruthy();

    // Find south-east (bottom-right) resize handle
    const seHandle = page.locator('[data-wb-handle="se"], .wb-handle-se, [data-handle="se"]').first();
    await expect(seHandle).toBeVisible();

    const handleBox = await seHandle.boundingBox();
    if (handleBox && boxBefore) {
      // Drag handle outward (+60px, +60px)
      await canvas.drag(
        { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 },
        { x: handleBox.x + 60, y: handleBox.y + 60 },
        { steps: 5 }
      );

      const boxAfter = await canvas.selectionBox.first().boundingBox();
      expect(boxAfter).toBeTruthy();
      if (boxAfter) {
        expect(boxAfter.width).toBeGreaterThan(boxBefore.width);
        expect(boxAfter.height).toBeGreaterThan(boxBefore.height);
      }
    }
  });

  test('TC-06-04: Marquee drag encloses and multi-selects multiple elements', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create two separate points at (250, 250) and (350, 250)
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 250, y: 250 });
    await canvas.clickAt({ x: 350, y: 250 });
    await expect.poll(async () => canvas.getObjectCount()).toBeGreaterThanOrEqual(2);

    // Switch to select tool
    await toolbar.selectTool('select');

    // Drag marquee rectangle starting at (200, 200) to (400, 300) enclosing both points
    await canvas.marqueeSelect({ x: 200, y: 200 }, { x: 400, y: 300 });

    // Selection box should appear and span across both elements
    await expect(canvas.selectionBox.first()).toBeVisible();
    const multiBox = await canvas.selectionBox.first().boundingBox();
    expect(multiBox).toBeTruthy();
    if (multiBox) {
      expect(multiBox.width).toBeGreaterThan(90);
    }
  });

  test('TC-06-05: Floating selection action bar displays duplicate and delete actions', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create one point
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 300, y: 300 });
    await canvas.waitForObjectCount(1);

    // Select the point
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 300, y: 300 });

    // Verify floating action bar appears
    await expect(toolbar.selectionBar).toBeVisible();

    // Duplicate element via action bar
    const duplicateBtn = toolbar.selectionBar.locator(
      'button[data-action="duplicate"], button[title*="Nhân bản"], button:has-text("Nhân bản")'
    ).first();
    await duplicateBtn.click();

    // Object count should increase to 2
    await canvas.waitForObjectCount(2);

    // Delete selection via action bar
    const deleteBtn = toolbar.selectionBar.locator(
      'button[data-action="delete"], button[title*="Xóa"], button:has-text("Xóa")'
    ).first();
    await deleteBtn.click();

    // One object removed
    await canvas.waitForObjectCount(1);
  });
});
