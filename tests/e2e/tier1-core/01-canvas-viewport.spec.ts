import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

/**
 * Tier 1 — Core Functionality: Test Suite 01
 * Canvas Viewport, Dot Grid, Camera Pan/Zoom Dynamics, Cartesian Y-up Coordinates.
 * Features covered:
 * - Feature 1: Canvas Infinite Viewport & Navigation
 * - Feature 2: Dot Grid Background & Theme
 */
test.describe('Tier 1: 01 Canvas Viewport & Navigation', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-vp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-01-01: Viewport mounts with infinite SVG canvas and board content container', async ({ page }) => {
    const canvas = new CanvasDriver(page);

    await expect(canvas.svgCanvas).toBeVisible();
    const bounds = await canvas.getCanvasBounds();

    // Canvas must fill the viewport
    expect(bounds.width).toBeGreaterThan(600);
    expect(bounds.height).toBeGreaterThan(400);

    // Board content container group must be attached
    await expect(canvas.boardContent).toBeAttached();
  });

  test('TC-01-02: Dot grid background pattern (#wb-dot-grid) is properly defined and rendered', async ({ page }) => {
    const canvas = new CanvasDriver(page);

    // Pattern element must exist in the SVG defs
    const pattern = canvas.dotGridPattern.first();
    await expect(pattern).toBeAttached();

    // Pattern dimensions verify grid spacing
    const patternWidth = await pattern.getAttribute('width');
    const patternHeight = await pattern.getAttribute('height');
    expect(Number(patternWidth)).toBeGreaterThan(0);
    expect(Number(patternHeight)).toBeGreaterThan(0);

    // Background rect must reference the dot grid pattern
    const bgRect = page.locator('svg[data-wb-canvas="true"] rect[fill*="wb-dot-grid"], svg.wb-canvas rect[fill*="wb-dot-grid"]').first();
    await expect(bgRect).toBeAttached();
  });

  test('TC-01-03: Camera pan translation updates tx and ty transform of board content', async ({ page }) => {
    const canvas = new CanvasDriver(page);

    const initialTransform = await canvas.getTransform();
    const deltaX = 150;
    const deltaY = 100;

    // Execute pan gesture (Space + drag)
    await canvas.pan(deltaX, deltaY);

    const updatedTransform = await canvas.getTransform();

    // The translation coordinates should shift by approximately the pan delta
    expect(updatedTransform.tx).toBeCloseTo(initialTransform.tx + deltaX, -1);
    expect(updatedTransform.ty).toBeCloseTo(initialTransform.ty + deltaY, -1);
  });

  test('TC-01-04: Exponential wheel zoom alters scale around focal coordinates', async ({ page }) => {
    const canvas = new CanvasDriver(page);

    const initialTransform = await canvas.getTransform();
    const center = await canvas.getCanvasCenter();

    // Zoom in (negative wheel delta)
    await canvas.wheelZoom(-150, center);
    const zoomedInTransform = await canvas.getTransform();
    expect(zoomedInTransform.scale).toBeGreaterThan(initialTransform.scale);

    // Zoom out (positive wheel delta)
    await canvas.wheelZoom(250, center);
    const zoomedOutTransform = await canvas.getTransform();
    expect(zoomedOutTransform.scale).toBeLessThan(zoomedInTransform.scale);
  });

  test('TC-01-05: Mathematical Cartesian Y-up coordinate conversion behaves correctly', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const transform = await canvas.getTransform();

    // Screen points: point B is visually higher than point A (lower clientY)
    const screenA = { x: 400, y: 500 };
    const screenB = { x: 400, y: 300 };

    const worldA = canvas.screenToWorld(screenA, transform);
    const worldB = canvas.screenToWorld(screenB, transform);

    // In mathematical Cartesian Y-up coordinates:
    // Moving UP on screen (decreasing screen y) MUST increase world y (+Y up)
    expect(worldB.y).toBeGreaterThan(worldA.y);

    // Moving RIGHT on screen (increasing screen x) MUST increase world x (+X right)
    const screenC = { x: 600, y: 500 };
    const worldC = canvas.screenToWorld(screenC, transform);
    expect(worldC.x).toBeGreaterThan(worldA.x);

    // Roundtrip verification: worldToScreen(screenToWorld(pt)) == pt
    const roundtripA = canvas.worldToScreen(worldA, transform);
    expect(roundtripA.x).toBeCloseTo(screenA.x, 2);
    expect(roundtripA.y).toBeCloseTo(screenA.y, 2);
  });
});
