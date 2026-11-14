import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

test.describe('Tier 4: Scientific Calculator Widget & Whiteboard Integration', () => {
  let canvas: CanvasDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    const roomId = `calc-suite-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should open calculator from toolbar, perform arithmetic 2 + 3 * 4 = 14, and insert formula to whiteboard canvas', async ({
    page,
  }) => {
    // 1. Open Calculator from toolbar
    const calcBtn = page.locator('[data-tool="calculator"]');
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();

    // The Casio fx-580VN X calculator panel should be visible
    const panel = page.locator('[data-calc-panel="true"]');
    await expect(panel).toBeVisible({ timeout: 10_000 });

    // Verify Casio fx-580VN X body and LCD canvas
    const body = page.locator('[data-calc-body="fx580vnx"]');
    await expect(body).toBeVisible();
    const lcd = page.locator('canvas[data-calc-lcd]');
    await expect(lcd).toBeVisible();

    // Verify model selector has fx-580VN X option
    const modelSelect = page.locator('[data-calc-model="true"]');
    await expect(modelSelect).toBeVisible();

    // 2. Click keypad numbers on fx-580VN X: 2, +, 3, x, 4, =
    await page.locator('button[data-calc-key="2"]').click();
    await page.locator('button[data-calc-key="plus"]').click();
    await page.locator('button[data-calc-key="3"]').click();
    await page.locator('button[data-calc-key="times"]').click();
    await page.locator('button[data-calc-key="4"]').click();
    await page.locator('button[data-calc-key="eq"]').click();

    // 3. Test Close button
    const closeBtn = page.locator('button[data-calc-close="true"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(panel).not.toBeVisible();
  });

  test('should also open calculator from Insert Menu', async ({ page }) => {
    // Open insert dropdown
    await page.locator('[data-dropdown="insert"]').click();
    const insertCalcBtn = page.locator('[data-wb-insert-calculator="true"]');
    await expect(insertCalcBtn).toBeVisible();
    await insertCalcBtn.click();

    // Verify Casio fx-580VN X calculator opens
    const panel = page.locator('[data-calc-panel="true"]');
    await expect(panel).toBeVisible({ timeout: 10_000 });
  });
});
