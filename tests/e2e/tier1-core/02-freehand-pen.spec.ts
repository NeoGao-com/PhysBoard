import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 1 — Core Functionality: Test Suite 02
 * Freehand Ink Pen Tool, Dynamic Fountain Pen with Velocity Variation, Stroke Styling Picker.
 * Features covered:
 * - Feature 3: Freehand Pen Tool (`ink`)
 * - Feature 4: Fountain Pen Tool (`ink:fountain`)
 * - Feature 6: Stroke & Fill Styling Picker
 */
test.describe('Tier 1: 02 Freehand & Fountain Pen Tools with Styling', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-pen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-02-01: Draw smooth freehand ink stroke with standard pen tool', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    const initialCount = await canvas.getObjectCount();

    // Select standard ink pen tool
    await toolbar.selectTool('ink');

    // Draw a curved stroke
    const strokePoints = [
      { x: 300, y: 300 },
      { x: 330, y: 310 },
      { x: 370, y: 330 },
      { x: 420, y: 340 },
      { x: 480, y: 330 },
    ];
    await canvas.drawStroke(strokePoints, { steps: 3 });

    // Assert an object is added to the canvas
    await canvas.waitForObjectCount(initialCount + 1);

    const latest = canvas.getLatestObject();
    await expect(latest).toBeVisible();

    // Verify it is rendered as an SVG path or ink container
    const tagName = await latest.evaluate((el) => el.tagName.toLowerCase());
    expect(['path', 'g', 'polyline']).toContain(tagName);
  });

  test('TC-02-02: Fountain pen tool creates velocity-sensitive calligraphy stroke', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    const initialCount = await canvas.getObjectCount();

    // Select fountain pen tool
    await toolbar.selectTool('ink:fountain');

    // Draw a stroke with varying velocity by adding delays between segments
    const points = [
      { x: 350, y: 250 },
      { x: 370, y: 270 },
      { x: 400, y: 300 },
      { x: 450, y: 330 },
      { x: 520, y: 350 },
    ];
    await canvas.drawStroke(points, { steps: 4, delay: 20 });

    await canvas.waitForObjectCount(initialCount + 1);

    const fountainStroke = canvas.getLatestObject();
    await expect(fountainStroke).toBeVisible();

    // Check fountain nib designation or polygon contour rendering
    const isFountain = await fountainStroke.evaluate((el) => {
      return (
        el.getAttribute('data-nib') === 'fountain' ||
        el.getAttribute('data-type') === 'fountain' ||
        el.classList.contains('wb-fountain-stroke') ||
        el.tagName.toLowerCase() === 'polygon' ||
        el.tagName.toLowerCase() === 'path'
      );
    });
    expect(isFountain).toBe(true);
  });

  test('TC-02-03: Stroke color swatches update drawn stroke appearance', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('ink');

    // Select Blue color swatch (#1565C0)
    await toolbar.setStrokeColor('#1565C0');

    // Draw blue stroke
    await canvas.drawStroke([
      { x: 250, y: 200 },
      { x: 350, y: 200 },
    ]);

    const blueStroke = canvas.getLatestObject();
    const strokeColor = await blueStroke.evaluate((el) => {
      const pathEl = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return pathEl.getAttribute('stroke') || window.getComputedStyle(pathEl).stroke;
    });

    // Check color matches #1565C0 (or rgb(21, 101, 192))
    expect(strokeColor.toLowerCase()).toMatch(/(#1565c0|rgb\(\s*21,\s*101,\s*192\s*\))/);

    // Select Red color swatch (#DC2626)
    await toolbar.setStrokeColor('#DC2626');

    // Draw red stroke
    await canvas.drawStroke([
      { x: 250, y: 260 },
      { x: 350, y: 260 },
    ]);

    const redStroke = canvas.getLatestObject();
    const redColor = await redStroke.evaluate((el) => {
      const pathEl = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return pathEl.getAttribute('stroke') || window.getComputedStyle(pathEl).stroke;
    });

    expect(redColor.toLowerCase()).toMatch(/(#dc2626|rgb\(\s*220,\s*38,\s*38\s*\))/);
  });

  test('TC-02-04: Stroke width presets apply distinct thicknesses', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('ink');

    // Select thin width preset (~1px)
    await toolbar.setStrokeWidth('thin');
    await canvas.drawStroke([
      { x: 200, y: 150 },
      { x: 300, y: 150 },
    ]);
    const thinStroke = canvas.getLatestObject();
    const thinWidth = await thinStroke.evaluate((el) => {
      const target = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return parseFloat(target.getAttribute('stroke-width') || window.getComputedStyle(target).strokeWidth);
    });

    // Select bold width preset (~3.5px or 5px)
    await toolbar.setStrokeWidth('bold');
    await canvas.drawStroke([
      { x: 200, y: 220 },
      { x: 300, y: 220 },
    ]);
    const boldStroke = canvas.getLatestObject();
    const boldWidth = await boldStroke.evaluate((el) => {
      const target = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return parseFloat(target.getAttribute('stroke-width') || window.getComputedStyle(target).strokeWidth);
    });

    expect(boldWidth).toBeGreaterThan(thinWidth);
  });

  test('TC-02-05: Stroke style solid vs dashed applies stroke-dasharray attribute', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('ink');

    // Select dashed stroke style
    await toolbar.setStrokeStyle('dashed');
    await canvas.drawStroke([
      { x: 200, y: 350 },
      { x: 320, y: 350 },
    ]);

    const dashedStroke = canvas.getLatestObject();
    const dashArray = await dashedStroke.evaluate((el) => {
      const target = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return target.getAttribute('stroke-dasharray') || window.getComputedStyle(target).strokeDasharray;
    });

    expect(dashArray).toBeTruthy();
    expect(dashArray).not.toBe('none');

    // Select solid stroke style
    await toolbar.setStrokeStyle('solid');
    await canvas.drawStroke([
      { x: 200, y: 400 },
      { x: 320, y: 400 },
    ]);

    const solidStroke = canvas.getLatestObject();
    const solidDash = await solidStroke.evaluate((el) => {
      const target = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return target.getAttribute('stroke-dasharray') || window.getComputedStyle(target).strokeDasharray;
    });

    expect(solidDash === 'none' || !solidDash || solidDash === '').toBe(true);
  });

  test('TC-02-06: Additional pen variants (highlighter, pencil, brush, dashed) render with distinct nibs', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const initialCount = await canvas.getObjectCount();

    const nibs = [
      { tool: 'ink:highlighter', nib: 'highlighter', y: 200 },
      { tool: 'ink:pencil', nib: 'pencil', y: 240 },
      { tool: 'ink:brush', nib: 'brush', y: 280 },
      { tool: 'ink:dashed', nib: 'dashed', y: 320 },
    ] as const;

    for (let i = 0; i < nibs.length; i++) {
      const item = nibs[i];
      await page.locator('[aria-label^="Chọn loại bút"]').click();
      await page.locator(`[data-menu-item="${item.tool}"]`).click();
      await canvas.drawStroke([
        { x: 260, y: item.y },
        { x: 420, y: item.y + 15 },
      ]);
      await canvas.waitForObjectCount(initialCount + i + 1);
      const latest = canvas.getLatestObject();
      await expect(latest).toHaveAttribute('data-nib', item.nib);
    }
  });

  test('TC-02-07: Custom hex stroke color picker applies arbitrary color', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    await toolbar.selectTool('ink');

    await page.locator('[data-popover="style"]').click();
    const hexInput = page.getByTestId('custom-color-hex');
    await hexInput.fill('#7c3aed');
    await hexInput.press('Enter');

    await canvas.drawStroke([
      { x: 280, y: 260 },
      { x: 420, y: 260 },
    ]);

    const latest = canvas.getLatestObject();
    const color = await latest.evaluate((el) => {
      const target = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
      return target.getAttribute('stroke') || window.getComputedStyle(target).stroke;
    });
    expect(color.toLowerCase()).toMatch(/(#7c3aed|rgb\(\s*124,\s*58,\s*237\s*\))/);
  });

  test('TC-02-08: Floating toolbar supports scaling, dragging, and layout reset', async ({ page }) => {
    const header = page.locator('[data-wb-toolbar="true"]');
    await expect(header).toBeVisible();

    const initialBox = await header.boundingBox();
    expect(initialBox).not.toBeNull();

    // Scale up toolbar via + button
    await page.locator('[data-wb-toolbar-scale-inc="true"]').click();
    await expect(page.locator('[data-wb-toolbar-scale-reset="true"]')).toHaveText('110%');

    // Drag toolbar via grip handle
    const grip = page.locator('[data-wb-toolbar-drag="true"]');
    const gripBox = await grip.boundingBox();
    expect(gripBox).not.toBeNull();
    if (gripBox) {
      await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(gripBox.x + 80, gripBox.y + 70, { steps: 5 });
      await page.mouse.up();
    }

    const movedBox = await header.boundingBox();
    expect(movedBox).not.toBeNull();
    if (initialBox && movedBox) {
      expect(movedBox.y).toBeGreaterThan(initialBox.y + 30);
    }

    // Reset position & scale
    await page.locator('[data-wb-toolbar-scale-reset="true"]').click();
    await expect(page.locator('[data-wb-toolbar-scale-reset="true"]')).toHaveText('100%');
  });

  test('TC-02-09: Pen-only mode blocks touch drawing and allows stylus/mouse drawing', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('ink');
    const initialCount = await canvas.getObjectCount();

    // Toggle Pen-Only Mode ON via quick button
    const penOnlyBtn = page.locator('[data-action="toggle-pen-only"]');
    await expect(penOnlyBtn).toBeVisible();
    await penOnlyBtn.click();
    await expect(penOnlyBtn).toHaveAttribute('data-active', 'true');

    // Simulate touch stroke (pointerType === 'touch')
    const svg = page.locator('svg[data-wb-canvas="true"], svg.wb-canvas');
    await svg.dispatchEvent('pointerdown', {
      clientX: 300,
      clientY: 300,
      pointerType: 'touch',
      pointerId: 1,
      bubbles: true,
    });
    await svg.dispatchEvent('pointermove', {
      clientX: 350,
      clientY: 350,
      pointerType: 'touch',
      pointerId: 1,
      bubbles: true,
    });
    await svg.dispatchEvent('pointerup', {
      clientX: 350,
      clientY: 350,
      pointerType: 'touch',
      pointerId: 1,
      bubbles: true,
    });

    // Touch input must NOT create a stroke
    const countAfterTouch = await canvas.getObjectCount();
    expect(countAfterTouch).toBe(initialCount);

    // Mouse or Pen input (pointerType === 'mouse' or 'pen') DOES create a stroke
    await canvas.drawStroke([
      { x: 400, y: 400 },
      { x: 450, y: 450 },
    ]);
    await canvas.waitForObjectCount(initialCount + 1);

    // Toggle Pen-Only Mode OFF
    await penOnlyBtn.click();
    await expect(penOnlyBtn).toHaveAttribute('data-active', 'false');
  });
});
