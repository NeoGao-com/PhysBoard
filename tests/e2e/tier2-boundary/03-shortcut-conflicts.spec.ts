import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';
import { MathDriver } from '../helpers/math-driver';

/**
 * Tier 2 — Boundary & Corner Cases: Test Suite 03
 * Shortcut Conflict Isolation: Backspace/Delete inside MathLive does NOT trigger canvas deletion;
 * Enter commits or adds newline; Esc dismisses active dialogs.
 * Features covered:
 * - Feature 26: MathLive Inline Formula Editor
 * - Feature 57: Fullscreen Mode & Shortcuts
 * - Feature 59: Adversarial Coverage Hardening
 */
test.describe('Tier 2: 03 Shortcut Conflict & Keystroke Isolation', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-conflict-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-03-B01: Backspace and Delete keys inside MathLive do NOT trigger canvas object deletion', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const math = new MathDriver(page);

    // 1. Draw a background stroke that should NOT be deleted
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 150, y: 150 },
      { x: 250, y: 150 },
    ]);
    await canvas.waitForObjectCount(1);

    // 2. Select the stroke so it would normally be deleted if global Delete were triggered
    await toolbar.selectTool('select');
    await canvas.clickAt({ x: 200, y: 150 });
    await expect(canvas.selectionBox.first()).toBeVisible();

    // 3. Activate formula tool and click on canvas to focus MathLive editor
    await toolbar.selectTool('formula');
    await canvas.clickAt({ x: 350, y: 250 });
    await math.waitForMathFieldVisible();

    // 4. Type text into the MathLive field
    await math.typeKeystrokes('xyz');
    expect(await math.getFormulaValue()).toContain('z');

    // 5. Press Backspace multiple times inside the formula field
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    // 6. Press Delete key inside the formula field
    await page.keyboard.press('Delete');

    // Assert that formula field text is updated
    const formulaAfter = await math.getFormulaValue();
    expect(formulaAfter).not.toContain('xyz');

    // 7. CRITICAL ISOLATION CHECK: The background canvas object MUST NOT be deleted!
    const canvasObjects = await canvas.getObjectCount();
    expect(canvasObjects).toBeGreaterThanOrEqual(1);
  });

  test('TC-03-B02: Enter key inside MathLive commits formula without unintended side effects', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const math = new MathDriver(page);

    await toolbar.selectTool('formula');
    await canvas.clickAt({ x: 300, y: 300 });
    await math.waitForMathFieldVisible();

    await math.setFormulaValue('x + y = 10');

    // Press Enter to commit
    await page.keyboard.press('Enter');

    // Formula should commit without submitting or throwing errors
    await math.expectKaTeXFormula('10');
  });

  test('TC-03-B03: Escape key dismisses open style popover and menus without canvas state disruption', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Open style picker popover
    await toolbar.openStylePicker();
    const stylePicker = page.locator('[data-wb-style-picker="true"], .wb-style-picker');
    await expect(stylePicker).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Style picker should be dismissed
    await expect(stylePicker).not.toBeVisible();

    // Open More menu
    await toolbar.openMoreMenu();
    await expect(toolbar.moreMenu).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // More menu should be dismissed
    await expect(toolbar.moreMenu).not.toBeVisible();

    // Canvas remains fully operational: draw a stroke to verify
    await toolbar.selectTool('ink');
    await canvas.drawStroke([
      { x: 300, y: 300 },
      { x: 400, y: 300 },
    ]);
    await canvas.waitForObjectCount(1);
  });
});
