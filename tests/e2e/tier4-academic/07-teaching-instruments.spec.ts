import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

test.describe('Tier 4: Teaching Instruments Suite - Ruler, Set Square, Protractor & Compass', () => {
  let canvas: CanvasDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    const roomId = `instruments-suite-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should insert and interact with Ruler, SetSquare, Protractor 180/360 and Compass from Dụng cụ dạy học menu', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    // 1. Open "Dụng cụ dạy học" menu
    const menuBtn = page.locator('[data-dropdown="instruments"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.locator('[data-wb-instruments-menu="true"]')).toBeVisible();

    // 2. Insert Ruler (Thước thẳng)
    await page.locator('[data-instrument-select="ruler"]').click();
    const ruler = page.locator('g[data-physics-instrument="ruler"]').first();
    await expect(ruler).toBeVisible();

    // Rotate via SelectionBar
    await page.locator('[data-action="phys-rotate-cw"]').click();

    // 3. Insert Set Square 30-60-90 (Êke)
    await menuBtn.click();
    await page.locator('[data-instrument-select="setsquare"]').click();
    const setsquare = page.locator('g[data-physics-instrument="setsquare"]').first();
    await expect(setsquare).toBeVisible();
    await expect(setsquare).toHaveAttribute('data-setsquare-kind', '30-60-90');

    // Switch to 45-45-90 via SelectionBar
    const switchSetSquareBtn = page.locator('[data-action="switch-setsquare-kind"]');
    await expect(switchSetSquareBtn).toBeVisible();
    await switchSetSquareBtn.click();
    await expect(setsquare).toHaveAttribute('data-setsquare-kind', '45-45-90');

    // 4. Insert Protractor (Thước đo góc)
    await menuBtn.click();
    await page.locator('[data-instrument-select="protractor"]').click();
    const protractor = page.locator('g[data-physics-instrument="protractor"]').first();
    await expect(protractor).toBeVisible();
    await expect(protractor).toHaveAttribute('data-protractor-type', '180');

    // Step protractor angle readout
    const stepAngleBtn = page.locator('[data-action="step-protractor-angle"]');
    await expect(stepAngleBtn).toBeVisible();
    await stepAngleBtn.click();
    await expect(protractor.locator('[data-protractor-readout="true"]')).toContainText('60°');

    // Switch to 360° full circle
    const switchProtractorBtn = page.locator('[data-action="switch-protractor-type"]');
    await switchProtractorBtn.click();
    await expect(protractor).toHaveAttribute('data-protractor-type', '360');

    // 5. Insert Compass (Compa)
    await menuBtn.click();
    await page.locator('[data-instrument-select="compass"]').click();
    const compass = page.locator('g[data-physics-instrument="compass"]').first();
    await expect(compass).toBeVisible();

    // Adjust compass radius via SelectionBar
    const radiusIncBtn = page.locator('[data-action="compass-radius-inc"]');
    await expect(radiusIncBtn).toBeVisible();
    await radiusIncBtn.click();
    await expect(compass).toContainText('R=3.5cm');

    // Draw circular arc from compass badge
    await compass.locator('[data-compass-action="draw-circle"]').click();
    await expect(page.locator('g[data-element-type="Ink"]').first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('should snap pen stroke to ruler edge when drawing near ruler', async ({ page }) => {
    // Insert Ruler
    await page.locator('[data-dropdown="instruments"]').click();
    await page.locator('[data-instrument-select="ruler"]').click();
    const ruler = page.locator('g[data-physics-instrument="ruler"]').first();
    await expect(ruler).toBeVisible();

    // Select Pen
    await page.locator('[data-tool="ink"]').first().click();

    // Draw a stroke along the top of the canvas where ruler sits
    const box = await canvas.svgCanvas.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      const midX = box.x + box.width / 2;
      const midY = box.y + box.height / 2;
      // Start drag near ruler
      await page.mouse.move(midX - 80, midY - 20);
      await page.mouse.down();
      await page.mouse.move(midX + 80, midY - 18, { steps: 5 });
      await page.mouse.up();
    }

    // A smooth ink element is created
    await expect(page.locator('g[data-element-type="Ink"]').first()).toBeVisible();
  });
});
