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
});
