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

  test('Laser default is Trail mode: draws fading light trail on canvas', async ({ page }) => {
    // Select Laser tool
    const laserBtn = page.locator('button[data-tool="ink:laser"]');
    await expect(laserBtn).toBeVisible();
    await laserBtn.click();

    // Verify button shows Laser (Vệt) by default
    await expect(laserBtn).toContainText('Vệt');

    // In Trail mode, dragging on canvas draws a fading laser stroke
    const center = await canvas.getCanvasCenter();
    await canvas.drag(center, { x: center.x + 120, y: center.y + 60 });

    const laserStrokes = page.locator('[data-laser-stroke="true"]');
    await expect(laserStrokes).toHaveCount(1);
  });

  test('Clicking Laser button when active toggles between Trail mode and Dot mode', async ({ page }) => {
    const laserBtn = page.locator('button[data-tool="ink:laser"]');
    await expect(laserBtn).toBeVisible();
    await laserBtn.click();
    await expect(laserBtn).toContainText('Vệt');

    // Click again to toggle to Dot mode
    await laserBtn.click();
    await expect(laserBtn).toContainText('Chấm');

    // In dot mode: moving pointer shows spot and dragging does NOT create any ink or laser strokes
    const center = await canvas.getCanvasCenter();
    await page.mouse.move(center.x, center.y);
    const laserSpot = page.locator('[data-laser-spot="true"]');
    await expect(laserSpot).toBeVisible();

    await page.mouse.down();
    await page.mouse.move(center.x + 100, center.y + 80, { steps: 5 });
    await page.mouse.up();

    const laserStrokes = page.locator('[data-laser-stroke="true"]');
    await expect(laserStrokes).toHaveCount(0);

    // Click again to toggle back to Trail mode
    await laserBtn.click();
    await expect(laserBtn).toContainText('Vệt');
  });
});
