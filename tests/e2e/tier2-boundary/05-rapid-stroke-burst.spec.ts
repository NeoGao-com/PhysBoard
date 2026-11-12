import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

/**
 * Tier 2 — Boundary & Corner Cases: Test Suite 05
 * Rapid Stroke Burst: Rapid injection of 50 consecutive pointer strokes.
 * Verifies no event dropping, no thread deadlock, and high-frequency stroke throughput.
 * Features covered:
 * - Feature 3: Freehand Pen Tool (`ink`)
 * - Feature 59: Adversarial Coverage Hardening
 */
test.describe('Tier 2: 05 Rapid High-Frequency Stroke Burst', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-burst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-05-B01: Rapid injection of 50 consecutive pointer strokes without dropped events', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('ink');

    const totalStrokes = 50;

    // Rapidly inject 50 short distinct strokes with zero wait delays
    for (let i = 0; i < totalStrokes; i++) {
      const startX = 100 + (i % 25) * 20;
      const startY = i < 25 ? 200 : 350;
      await canvas.drawStroke(
        [
          { x: startX, y: startY },
          { x: startX + 5, y: startY + 25 },
        ],
        { steps: 1 }
      );
    }

    // Wait for all 50 strokes to settle in the board content
    await canvas.waitForObjectCount(totalStrokes, 15_000);

    // Verify exactly 50 stroke elements are rendered
    const finalCount = await canvas.getObjectCount();
    expect(finalCount).toBe(totalStrokes);
  });

  test('TC-05-B02: Canvas thread remains responsive and interactive immediately after rapid burst', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await toolbar.selectTool('ink');

    // Burst 25 rapid strokes
    for (let i = 0; i < 25; i++) {
      const x = 120 + i * 15;
      await canvas.drawStroke([{ x, y: 150 }, { x, y: 180 }], { steps: 1 });
    }

    await canvas.waitForObjectCount(25, 10_000);

    // Immediately test camera pan to confirm event loop is not stalled or frozen
    const initialTransform = await canvas.getTransform();
    await canvas.pan(50, 50);
    const postPanTransform = await canvas.getTransform();

    // Pan must succeed promptly
    expect(postPanTransform.tx).toBeCloseTo(initialTransform.tx + 50, -1);
    expect(postPanTransform.ty).toBeCloseTo(initialTransform.ty + 50, -1);
  });
});
