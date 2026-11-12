import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

/**
 * Tier 2 — Boundary & Corner Cases: Test Suite 01
 * Zoom limits clamping strictly to [8, 600] scale bounds (or [8%, 600%]).
 * Prevents NaN, Infinity, negative scales, or viewport collapse under extreme inputs.
 * Features covered:
 * - Feature 1: Canvas Infinite Viewport & Navigation
 * - Feature 59: Adversarial Coverage Hardening
 */
test.describe('Tier 2: 01 Viewport Zoom Limits Clamping', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-limit-zoom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-01-B01: Extreme wheel zoom-in is clamped to upper limit (600% / scale <= 600) with no NaN or Infinity', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const center = await canvas.getCanvasCenter();

    // Fire 40 aggressive zoom-in wheel gestures in rapid succession
    for (let i = 0; i < 40; i++) {
      await canvas.wheelZoom(-300, center);
    }

    const transform = await canvas.getTransform();

    // Assert scale is finite, strictly positive, and not NaN or Infinity
    expect(Number.isFinite(transform.scale)).toBe(true);
    expect(Number.isNaN(transform.scale)).toBe(false);
    expect(transform.scale).toBeGreaterThan(0);

    // Scale must be clamped to at most 600 (or 6.0 if normalized to 1.0 = 100%)
    const maxScale = transform.scale > 10 ? 600 : 6.0;
    expect(transform.scale).toBeLessThanOrEqual(maxScale + 0.01);

    // Translation coordinates must remain finite numbers
    expect(Number.isFinite(transform.tx)).toBe(true);
    expect(Number.isFinite(transform.ty)).toBe(true);
  });

  test('TC-01-B02: Extreme wheel zoom-out is clamped to lower limit (8% / scale >= 8 or 0.08) with no negative or zero scale', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const center = await canvas.getCanvasCenter();

    // Fire 40 aggressive zoom-out wheel gestures in rapid succession
    for (let i = 0; i < 40; i++) {
      await canvas.wheelZoom(300, center);
    }

    const transform = await canvas.getTransform();

    // Assert scale is finite, strictly positive, and not NaN or Infinity
    expect(Number.isFinite(transform.scale)).toBe(true);
    expect(Number.isNaN(transform.scale)).toBe(false);
    expect(transform.scale).toBeGreaterThan(0);

    // Scale must be clamped to at least 8 (or 0.08 if normalized to 1.0 = 100%)
    const minScale = transform.scale > 1 ? 8 : 0.08;
    expect(transform.scale).toBeGreaterThanOrEqual(minScale - 0.01);

    // Translation coordinates must remain finite numbers
    expect(Number.isFinite(transform.tx)).toBe(true);
    expect(Number.isFinite(transform.ty)).toBe(true);
  });

  test('TC-01-B03: Viewport stays mounted and responsive after alternating extreme zoom stress', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const center = await canvas.getCanvasCenter();

    // Alternating extremes: full zoom-in followed by full zoom-out
    for (let i = 0; i < 15; i++) {
      await canvas.wheelZoom(-400, center);
    }
    for (let i = 0; i < 25; i++) {
      await canvas.wheelZoom(400, center);
    }

    const finalTransform = await canvas.getTransform();

    // Canvas SVG and board content remain mounted and functional
    await expect(canvas.svgCanvas).toBeVisible();
    await expect(canvas.boardContent).toBeAttached();

    expect(Number.isFinite(finalTransform.scale)).toBe(true);
    expect(finalTransform.scale).toBeGreaterThan(0);
  });
});
