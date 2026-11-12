import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 1 — Core Functionality: Test Suite 07
 * Undo / Redo History Engine Transactions (Ctrl+Z and Ctrl+Shift+Z).
 * Features covered:
 * - Feature 9: Undo / Redo History Engine
 * - Feature 57: Keyboard Shortcuts
 */
test.describe('Tier 1: 07 Undo & Redo History Engine', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-undo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-07-01: Undo reverts drawn stroke and Redo restores it', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Initial state: 0 objects
    expect(await canvas.getObjectCount()).toBe(0);

    // Draw an ink stroke
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 300, y: 300 },
      { x: 400, y: 300 },
    ]);
    await canvas.waitForObjectCount(1);

    // Undo via keyboard shortcut (Ctrl+Z)
    await toolbar.undo(true);
    await canvas.waitForObjectCount(0);

    // Redo via keyboard shortcut (Ctrl+Shift+Z)
    await toolbar.redo(true);
    await canvas.waitForObjectCount(1);
  });

  test('TC-07-02: Multi-step undo/redo transaction stack maintains correct object count', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('point');

    // Create 3 points sequentially
    await canvas.clickAt({ x: 200, y: 200 });
    await canvas.waitForObjectCount(1);

    await canvas.clickAt({ x: 300, y: 200 });
    await canvas.waitForObjectCount(2);

    await canvas.clickAt({ x: 400, y: 200 });
    await canvas.waitForObjectCount(3);

    // Undo step 1 -> count: 2
    await toolbar.undo(false);
    await canvas.waitForObjectCount(2);

    // Undo step 2 -> count: 1
    await toolbar.undo(false);
    await canvas.waitForObjectCount(1);

    // Redo step 1 -> count: 2
    await toolbar.redo(false);
    await canvas.waitForObjectCount(2);

    // Undo step again -> count: 1
    await toolbar.undo(false);
    await canvas.waitForObjectCount(1);
  });

  test('TC-07-03: Undo restores element deleted via Delete action', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Draw a stroke
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 250, y: 250 },
      { x: 350, y: 250 },
    ]);
    await canvas.waitForObjectCount(1);

    // Select the stroke and delete it
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 300, y: 250 });
    await toolbar.deleteSelection(true);
    await canvas.waitForObjectCount(0);

    // Undo deletion
    await toolbar.undo(true);
    await canvas.waitForObjectCount(1);
    await expect(canvas.getLatestObject()).toBeVisible();
  });

  test('TC-07-04: Undo reverts element drag move back to original coordinates', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create a point
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 300, y: 300 });
    await canvas.waitForObjectCount(1);

    // Select and move point
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 300, y: 300 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    const boxBefore = await canvas.selectionBox.first().boundingBox();
    expect(boxBefore).toBeTruthy();

    if (boxBefore) {
      await canvas.drag(
        { x: boxBefore.x + 5, y: boxBefore.y + 5 },
        { x: boxBefore.x + 105, y: boxBefore.y + 55 },
        { steps: 5 }
      );
    }

    const boxAfterMove = await canvas.selectionBox.first().boundingBox();
    if (boxBefore && boxAfterMove) {
      expect(boxAfterMove.x).toBeGreaterThan(boxBefore.x + 50);
    }

    // Undo move
    await toolbar.undo(true);

    const boxAfterUndo = await canvas.selectionBox.first().boundingBox();
    if (boxBefore && boxAfterUndo) {
      expect(boxAfterUndo.x).toBeCloseTo(boxBefore.x, -1);
    }
  });
});
