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

  test('TC-02-08: Top-docked toolbar supports scaling and layout reset', async ({ page }) => {
    const header = page.locator('[data-wb-toolbar="true"]');
    await expect(header).toBeVisible();

    const initialBox = await header.boundingBox();
    expect(initialBox).not.toBeNull();
    if (initialBox) {
      // Docked flush to the top edge
      expect(initialBox.y).toBeLessThanOrEqual(4);
    }

    // Scale up toolbar via + button (open scale controls if in mobile/overflow or click directly if visible)
    const scaleInc = page.locator('[data-wb-toolbar-scale-inc="true"]');
    const scaleReset = page.locator('[data-wb-toolbar-scale-reset="true"]');
    if (await scaleInc.isVisible()) {
      await scaleInc.click();
      await expect(scaleReset).toHaveText('110%');

      // Reset scale
      await scaleReset.click();
      await expect(scaleReset).toHaveText('100%');
    }
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

  test('TC-02-10: Laser pointer draws glowing stroke and automatically fades out after 1.5s', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const initialCount = await canvas.getObjectCount();

    // Select Laser Pointer tool
    const laserBtn = page.locator('button[data-tool="ink:laser"]');
    await expect(laserBtn).toBeVisible();
    await laserBtn.click();
    await expect(laserBtn).toHaveAttribute('data-active', 'true');

    // Draw with laser pointer
    await canvas.drawStroke([
      { x: 300, y: 300 },
      { x: 350, y: 320 },
      { x: 400, y: 300 },
    ]);

    // Laser stroke should render with data-laser-stroke="true"
    const laserStroke = page.locator('[data-laser-stroke="true"]');
    await expect(laserStroke).toBeVisible();

    // The persistent whiteboard element count should NOT increase (laser does not persist in Yjs)
    const countDuringLaser = await canvas.getObjectCount();
    expect(countDuringLaser).toBe(initialCount);

    // Wait 1.6s for complete fade out
    await page.waitForTimeout(1600);
    await expect(laserStroke).toHaveCount(0);
  });

  test('TC-02-11: Ink-to-Shape automatically snaps rough drawn strokes to geometric primitives on hold', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    await toolbar.selectTool('ink');

    const drawAndHold = async (pts: Array<{ x: number; y: number }>, holdMs = 420) => {
      await page.mouse.move(pts[0].x, pts[0].y);
      await page.mouse.down({ button: 'left' });
      for (let i = 1; i < pts.length; i++) {
        await page.mouse.move(pts[i].x, pts[i].y, { steps: 3 });
      }
      await page.waitForTimeout(holdMs);
      await page.mouse.up({ button: 'left' });
    };

    const initialCount = await canvas.getObjectCount();

    // 1. Draw a rough straight line segment + hold -> snaps to GeomSegment
    await drawAndHold([
      { x: 200, y: 200 },
      { x: 250, y: 201 },
      { x: 300, y: 200 },
      { x: 350, y: 202 },
      { x: 400, y: 200 },
    ]);
    await canvas.waitForObjectCount(initialCount + 1);
    const latestSegment = canvas.getLatestObject();
    await expect(latestSegment).toHaveAttribute('data-element-type', 'GeomSegment');

    // 2. Draw a rough circle + hold -> snaps to GeomCircle
    const center = { x: 500, y: 300 };
    const radius = 60;
    const circlePoints: Array<{ x: number; y: number }> = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      circlePoints.push({
        x: center.x + radius * Math.cos(angle) + (Math.random() * 4 - 2),
        y: center.y + radius * Math.sin(angle) + (Math.random() * 4 - 2),
      });
    }
    await drawAndHold(circlePoints);
    await canvas.waitForObjectCount(initialCount + 2);
    const latestCircle = canvas.getLatestObject();
    await expect(latestCircle).toHaveAttribute('data-element-type', 'GeomCircle');

    // 3. Draw a rough triangle + hold -> snaps to GeomPolygon
    await drawAndHold([
      { x: 250, y: 400 },
      { x: 350, y: 400 },
      { x: 300, y: 480 },
      { x: 250, y: 400 },
    ]);
    await canvas.waitForObjectCount(initialCount + 3);
    const latestPoly = canvas.getLatestObject();
    await expect(latestPoly).toHaveAttribute('data-element-type', 'GeomPolygon');
  });

  test('TC-02-12: Recognizes ellipses smoothly on hold and preserves open curved edges without flattening', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    await toolbar.selectTool('ink');

    const initialCount = await canvas.getObjectCount();

    // 1. Draw an elongated ellipse (rx = 95, ry = 40) + hold -> snaps to ellipse instead of polygon
    const ellCenter = { x: 620, y: 260 };
    const ellPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 24; i++) {
      const angle = (i / 24) * 2 * Math.PI;
      ellPoints.push({
        x: ellCenter.x + 95 * Math.cos(angle),
        y: ellCenter.y + 40 * Math.sin(angle),
      });
    }
    await page.mouse.move(ellPoints[0].x, ellPoints[0].y);
    await page.mouse.down({ button: 'left' });
    for (let i = 1; i < ellPoints.length; i++) {
      await page.mouse.move(ellPoints[i].x, ellPoints[i].y, { steps: 2 });
    }
    await page.waitForTimeout(420);
    await page.mouse.up({ button: 'left' });
    await canvas.waitForObjectCount(initialCount + 1);
    const latestEllipse = canvas.getLatestObject();
    await expect(latestEllipse).toHaveAttribute('data-element-type', 'GeomCircle');
    await expect(latestEllipse).toHaveAttribute('data-wb-type', 'ellipse');
    await expect(latestEllipse.locator('ellipse').first()).toBeVisible();

    // 2. Draw an open smooth curved edge (moderate bow ~9%) -> must stay Ink, not GeomSegment
    const arcPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const x = 220 + t * 220;
      const y = 480 - Math.sin(t * Math.PI) * 20;
      arcPoints.push({ x, y });
    }
    await canvas.drawStroke(arcPoints);
    await canvas.waitForObjectCount(initialCount + 2);
    const latestCurve = canvas.getLatestObject();
    await expect(latestCurve).toHaveAttribute('data-element-type', 'Ink');
  });

  test('TC-02-13: ShortStraw mid-edge rectangle beautification on hold + quick Circle/Ellipse toggle & Revert pill', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    await toolbar.selectTool('ink');

    const drawAndHold = async (pts: Array<{ x: number; y: number }>, holdMs = 420) => {
      await page.mouse.move(pts[0].x, pts[0].y);
      await page.mouse.down({ button: 'left' });
      for (let i = 1; i < pts.length; i++) {
        await page.mouse.move(pts[i].x, pts[i].y, { steps: 2 });
      }
      await page.waitForTimeout(holdMs);
      await page.mouse.up({ button: 'left' });
    };

    const initialCount = await canvas.getObjectCount();

    // 1. Draw a rough rectangle starting from the middle of the top edge + hold
    await drawAndHold([
      { x: 350, y: 200 },
      { x: 450, y: 202 },
      { x: 452, y: 310 },
      { x: 250, y: 312 },
      { x: 248, y: 200 },
      { x: 355, y: 200 },
    ]);
    await canvas.waitForObjectCount(initialCount + 1);
    const rectEl = canvas.getLatestObject();
    await expect(rectEl).toHaveAttribute('data-element-type', 'GeomPolygon');
    // Bare shape must not draw auto A/B/C/D vertex labels
    await expect(rectEl.locator('[data-wb-vertex="true"]')).toHaveCount(0);

    // 2. Draw an oval + hold and test the floating post-snap pill (toggle Circle <-> Ellipse & Revert)
    const ovalPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 24; i++) {
      const angle = (i / 24) * 2 * Math.PI;
      ovalPts.push({
        x: 640 + 80 * Math.cos(angle),
        y: 350 + 45 * Math.sin(angle),
      });
    }
    await drawAndHold(ovalPts);
    await canvas.waitForObjectCount(initialCount + 2);

    const pill = page.locator('[data-wb-ink-snap-pill="true"]');
    await expect(pill).toBeVisible();

    // Toggle to Circle
    const toggleBtn = pill.locator('[data-action="toggle-circle-ellipse"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(canvas.getLatestObject()).toHaveAttribute('data-wb-type', 'circle');

    // Revert back to raw Ink stroke
    const revertBtn = pill.locator('[data-action="revert-ink-snap"]');
    await revertBtn.click();
    await expect(pill).not.toBeVisible();
    await expect(canvas.getLatestObject()).toHaveAttribute('data-element-type', 'Ink');
  });

  test('TC-02-14: Normal fast handwriting (letter o, horizontal dash) without holding stays Ink and does NOT snap to shape', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    await toolbar.selectTool('ink');

    const initialCount = await canvas.getObjectCount();

    // Fast horizontal stroke (like writing a fraction bar or minus sign) without holding
    await canvas.drawStroke([
      { x: 220, y: 220 },
      { x: 260, y: 220 },
      { x: 300, y: 220 },
      { x: 340, y: 220 },
    ], { steps: 1 });
    await canvas.waitForObjectCount(initialCount + 1);
    await expect(canvas.getLatestObject()).toHaveAttribute('data-element-type', 'Ink');

    // Fast circle-like stroke (like writing letter "o" or "0") without holding
    const oPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 16; i++) {
      const angle = (i / 16) * 2 * Math.PI;
      oPts.push({ x: 450 + 30 * Math.cos(angle), y: 240 + 30 * Math.sin(angle) });
    }
    await canvas.drawStroke(oPts, { steps: 1 });
    await canvas.waitForObjectCount(initialCount + 2);
    await expect(canvas.getLatestObject()).toHaveAttribute('data-element-type', 'Ink');
  });

  test('TC-02-15: Custom Ink-to-Shape hold duration slider in Settings controls hold delay and persists', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Open Settings -> adjust hold duration slider to 750ms (0,75 giây)
    await page.locator('button[data-action-open-settings="true"]').first().click();
    const slider = page.getByTestId('ink-hold-delay-slider');
    await expect(slider).toBeVisible();
    await slider.fill('750');
    await expect(page.getByTestId('ink-hold-delay-value')).toContainText('0,75');
    await page.keyboard.press('Escape');

    const savedDelay = await page.evaluate(() => window.localStorage.getItem('physboard_ink_hold_delay_ms'));
    expect(savedDelay).toBe('750');

    await toolbar.selectTool('ink');
    const initialCount = await canvas.getObjectCount();

    // Hold 400ms (< 750ms) -> stays Ink
    await page.mouse.move(220, 260);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(380, 260, { steps: 4 });
    await page.waitForTimeout(400);
    await page.mouse.up({ button: 'left' });
    await canvas.waitForObjectCount(initialCount + 1);
    await expect(canvas.getLatestObject()).toHaveAttribute('data-element-type', 'Ink');

    // Hold 840ms (> 750ms) -> snaps to GeomSegment
    await page.mouse.move(220, 340);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(380, 340, { steps: 4 });
    await page.waitForTimeout(840);
    await page.mouse.up({ button: 'left' });
    await canvas.waitForObjectCount(initialCount + 2);
    await expect(canvas.getLatestObject()).toHaveAttribute('data-element-type', 'GeomSegment');
  });
});
