import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 1 — Core Functionality: Test Suite 03
 * Contact Eraser Tool, Collision Detection (12px stroke threshold, 24px object threshold), Object Removal.
 * Features covered:
 * - Feature 5: Contact Eraser Tool (`erase`)
 */
test.describe('Tier 1: 03 Contact Eraser Tool & Collision Detection', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-erase-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-03-01: Activate contact eraser tool', async ({ page }) => {
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('erase');

    const eraserBtn = toolbar.getToolButton('erase');
    const isActive = await eraserBtn.evaluate((el) => {
      return (
        el.getAttribute('data-active') === 'true' ||
        el.getAttribute('aria-pressed') === 'true' ||
        el.classList.contains('active') ||
        el.classList.contains('bg-accent') ||
        el.classList.contains('bg-blue-50')
      );
    });

    expect(isActive).toBe(true);
  });

  test('TC-03-02: Contact eraser deletes ink stroke within 12px collision threshold', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Draw a horizontal ink stroke along y = 300 from x = 200 to 400
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 200, y: 300 },
      { x: 400, y: 300 },
    ]);
    await canvas.waitForObjectCount(1);

    // Switch to eraser tool
    await toolbar.selectTool('erase');

    // Drag eraser vertically crossing the stroke at x = 300 from y = 290 to y = 310
    // This crosses directly through the stroke with distance <= 10px <= 12px
    await canvas.drag(
      { x: 300, y: 290 },
      { x: 300, y: 310 },
      { steps: 5 }
    );

    // Stroke should be detected and erased
    await canvas.waitForObjectCount(0);
  });

  test('TC-03-03: Contact eraser ignores strokes outside collision threshold (> 20px distance)', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Draw a horizontal stroke along y = 300
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 200, y: 300 },
      { x: 400, y: 300 },
    ]);
    await canvas.waitForObjectCount(1);

    // Switch to eraser tool
    await toolbar.selectTool('erase');

    // Drag eraser parallel to stroke at y = 270 (distance is 30px > 12px threshold)
    await canvas.drag(
      { x: 200, y: 270 },
      { x: 400, y: 270 },
      { steps: 5 }
    );

    // Wait short period to ensure no erroneous deletion occurs
    await page.waitForTimeout(300);

    // Stroke should remain intact
    const count = await canvas.getObjectCount();
    expect(count).toBe(1);
  });

  test('TC-03-04: Contact eraser deletes geometric objects within 24px threshold', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Create a point or small circle at (350, 350)
    await toolbar.selectTool('point');
    await canvas.clickAt({ x: 350, y: 350 });
    await canvas.waitForObjectCount(1);

    // Switch to eraser tool
    await toolbar.selectTool('erase');

    // Swipe eraser within 18px of the object center (e.g. at 350, 365)
    // 15px is well within the 24px threshold
    await canvas.drag(
      { x: 330, y: 365 },
      { x: 370, y: 365 },
      { steps: 4 }
    );

    // Geometric object should be removed
    await canvas.waitForObjectCount(0);
  });

  test('TC-03-05: Continuous sweeping eraser gesture removes multiple intersected objects', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Draw three vertical strokes at x = 200, x = 300, and x = 400
    await toolbar.selectTool('ink');
    await canvas.drawStroke([{ x: 200, y: 200 }, { x: 200, y: 300 }]);
    await canvas.drawStroke([{ x: 300, y: 200 }, { x: 300, y: 300 }]);
    await canvas.drawStroke([{ x: 400, y: 200 }, { x: 400, y: 300 }]);

    await canvas.waitForObjectCount(3);

    // Switch to eraser tool
    await toolbar.selectTool('erase');

    // Single sweep across all three lines horizontally along y = 250 from x = 150 to x = 450
    await canvas.drag(
      { x: 150, y: 250 },
      { x: 450, y: 250 },
      { steps: 10 }
    );

    // All 3 intersected strokes must be erased
    await canvas.waitForObjectCount(0);
  });
});
