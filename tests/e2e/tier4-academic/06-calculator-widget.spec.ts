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

    const widget = page.locator('[data-testid="calculator-widget"]');
    await expect(widget).toBeVisible();

    // 2. Type calculation or use keypad: 2 + 3 * 4
    await page.locator('[data-testid="calc-btn-2"]').click();
    await page.locator('[data-testid="calc-btn-add"]').click();
    await page.locator('[data-testid="calc-btn-3"]').click();
    await page.locator('[data-testid="calc-btn-mult"]').click();
    await page.locator('[data-testid="calc-btn-4"]').click();

    // Expression input should show "2+3*4"
    const input = page.locator('[data-testid="calculator-input"]');
    await expect(input).toHaveValue('2+3*4');

    // Result should automatically compute 14
    const resultDisplay = page.locator('[data-testid="calculator-result"]');
    await expect(resultDisplay).toHaveText('= 14');

    // Press equals button
    await page.locator('[data-testid="calc-btn-equals"]').click();

    // 3. Insert Formula and Result into Canvas
    const insertFormulaBtn = page.locator('[data-testid="calc-insert-formula"]');
    await expect(insertFormulaBtn).toBeEnabled();
    await insertFormulaBtn.click();

    // Verify MathText element is added to canvas
    const mathText = page.locator('g[data-element-type="MathText"]').first();
    await expect(mathText).toBeVisible({ timeout: 5000 });

    // Verify content includes expression
    const textContent = await mathText.textContent();
    expect(textContent).toContain('14');

    // 4. Test scientific functions: sin(30) with DEG mode = 0.5
    await page.locator('[data-testid="calc-btn-clear"]').click();
    await expect(input).toHaveValue('');

    // Ensure angle mode is DEG
    const degRadBtn = page.locator('[data-testid="calc-deg-rad-toggle"]');
    const modeText = await degRadBtn.textContent();
    if (modeText?.trim() !== 'DEG') {
      await degRadBtn.click();
    }
    await expect(degRadBtn).toHaveText('DEG');

    // Click 'sin(' then '30' then ')'
    await page.locator('[data-testid="calc-btn-sin"]').click();
    await page.locator('[data-testid="calc-btn-3"]').click();
    await page.locator('[data-testid="calc-btn-0"]').click();
    await page.locator('[data-testid="calc-btn-rparen"]').click();

    await expect(resultDisplay).toHaveText('= 0.5');

    // 5. Test Minimize and Close
    const minimizeBtn = page.locator('[data-testid="calc-minimize-btn"]');
    await minimizeBtn.click();
    // In minimized state, input is hidden
    await expect(input).not.toBeVisible({ timeout: 5000 });

    // Expand back
    await minimizeBtn.click();
    await expect(input).toBeVisible({ timeout: 5000 });

    // Close calculator
    const closeBtn = page.locator('[data-testid="calc-close-btn"]');
    await closeBtn.click();
    await expect(widget).not.toBeVisible();
  });

  test('should also open calculator from Insert Menu', async ({ page }) => {
    // Open insert dropdown
    await page.locator('[data-dropdown="insert"]').click();
    const insertCalcBtn = page.locator('[data-wb-insert-calculator="true"]');
    await expect(insertCalcBtn).toBeVisible();
    await insertCalcBtn.click();

    // Verify calculator opens
    const widget = page.locator('[data-testid="calculator-widget"]');
    await expect(widget).toBeVisible();
  });
});
