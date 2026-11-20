import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Laser Pointer Modes: Dot Spot vs Light Trail', () => {
  let canvas: CanvasDriver;
  let toolbar: ToolbarDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    toolbar = new ToolbarDriver(page);

    const roomId = `laser-mode-test-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('Laser default is Dot mode: moves laser spot and does NOT draw any stroke or trail', async ({ page }) => {
    // Select Laser tool
    const laserBtn = page.locator('button[data-tool="ink:laser"]');
    await expect(laserBtn).toBeVisible();
    await laserBtn.click();

    // Verify button shows Laser (Chấm)
    await expect(laserBtn).toContainText('Chấm');

    // Move pointer over canvas
    const center = await canvas.getCanvasCenter();
    await page.mouse.move(center.x, center.y);

    // Verify laser spot indicator is visible at the pointer location
    const laserSpot = page.locator('[data-laser-spot="true"]');
    await expect(laserSpot).toBeVisible();

    // Press down and drag across canvas
    await page.mouse.down();
    await expect(laserSpot).toHaveAttribute('data-laser-pressed', 'true');
    await page.mouse.move(center.x + 100, center.y + 80, { steps: 5 });
    await page.mouse.up();

    // In dot mode: MUST NOT create any ink or laser strokes on canvas!
    const laserStrokes = page.locator('[data-laser-stroke="true"]');
    await expect(laserStrokes).toHaveCount(0);

    // Canvas object count remains 0
    const count = await canvas.getObjectCount();
    expect(count).toBe(0);
  });

  test('Clicking Laser button when active toggles between Dot mode and Trail mode', async ({ page }) => {
    const laserBtn = page.locator('button[data-tool="ink:laser"]');
    await expect(laserBtn).toBeVisible();
    await laserBtn.click();
    await expect(laserBtn).toContainText('Chấm');

    // Click again to toggle to Trail mode
    await laserBtn.click();
    await expect(laserBtn).toContainText('Vệt');

    // In Trail mode, dragging on canvas draws a fading laser stroke
    const center = await canvas.getCanvasCenter();
    await canvas.drag(center, { x: center.x + 120, y: center.y + 60 });

    const laserStrokes = page.locator('[data-laser-stroke="true"]');
    await expect(laserStrokes).toHaveCount(1);

    // Click again to toggle back to Dot mode
    await laserBtn.click();
    await expect(laserBtn).toContainText('Chấm');
  });
});
