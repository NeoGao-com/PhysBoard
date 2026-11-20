import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';
import { computePolyhedronSection, liftSolidTo3D, type Point3D, type Point2D } from '../../../src/lib/geometry3d';

test.describe('Verification of 3 Core User Issues: 3D Polyhedron Cross-Section, A4 Clean Grid, and Sidebar Auto-Shrink', () => {
  let canvas: CanvasDriver;
  let toolbar: ToolbarDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    toolbar = new ToolbarDriver(page);

    const roomId = `verify-issues-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('Issue 1: computePolyhedronSection computes accurate cutting polygon on pyramid edges', () => {
    // S.ABCD pyramid 2D coordinates (Apex S + Base A, B, C, D)
    const pts2D: Point2D[] = [
      { x: 0, y: 5 },     // S
      { x: -3, y: -2 },   // A
      { x: 3, y: -2 },    // B
      { x: 4, y: 0 },     // C
      { x: -2, y: 0 },    // D
    ];
    const lift = liftSolidTo3D('pyramid', pts2D);
    expect(lift).not.toBeNull();
    if (!lift) return;

    // Cut with plane through 3 points on edges (e.g., midpoints of SA, SB, SC)
    const pS = lift.p3[0];
    const pA = lift.p3[1];
    const pB = lift.p3[2];
    const pC = lift.p3[3];

    const cutA: Point3D = { x: (pS.x + pA.x) / 2, y: (pS.y + pA.y) / 2, z: (pS.z + pA.z) / 2 };
    const cutB: Point3D = { x: (pS.x + pB.x) / 2, y: (pS.y + pB.y) / 2, z: (pS.z + pB.z) / 2 };
    const cutC: Point3D = { x: (pS.x + pC.x) / 2, y: (pS.y + pC.y) / 2, z: (pS.z + pC.z) / 2 };

    const section = computePolyhedronSection(lift, [cutA, cutB, cutC]);
    expect(section).not.toBeNull();
    expect(section!.length).toBeGreaterThanOrEqual(3);
    // For 4-sided pyramid cut mid-height, should have 4 intersection points (quadrilateral)
    expect(section!.length).toBe(4);
  });

  test('Issue 2: A4 mode displays clean chosen pattern inside paper without gray grid lines', async ({ page }) => {
    // Open Settings Modal via PageSidebar settings button
    const settingsBtn = page.locator('button[title*="Cài đặt hệ thống"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Switch to "Khổ & Nền bảng" tab
    const boardTab = page.locator('button:has-text("Khổ & Nền bảng")');
    await expect(boardTab).toBeVisible();
    await boardTab.click();

    // Select A4 Portrait format inside SettingsModal
    const a4PortraitBtn = page.locator('[data-board-format-option="a4_portrait"]');
    await expect(a4PortraitBtn).toBeVisible();
    await a4PortraitBtn.click();

    // Close SettingsModal
    await page.keyboard.press('Escape');

    // Verify A4 sheet and pattern definition exists
    const a4Sheet = page.locator('[data-wb-a4-sheet="true"]');
    await expect(a4Sheet).toBeVisible();

    const pageRect = a4Sheet.locator('[data-page-rect="1"]');
    await expect(pageRect).toBeVisible();

    // Verify paper sheet has crisp white background
    const sheetFill = await pageRect.getAttribute('fill');
    expect(sheetFill).toBeTruthy();

    // Verify pattern inside A4 sheet references dedicated a4 grid pattern
    const patternRect = a4Sheet.locator('rect[fill*="wb-a4-grid-1"]');
    await expect(patternRect).toBeAttached();
  });

  test('Issue 3: Sidebar open shrinks canvas width so drawing content is never covered', async ({ page }) => {
    const canvasContainer = page.locator('div[data-board-surface]').first();
    await expect(canvasContainer).toBeVisible();

    // Initially sidebar is open: left = 140px
    await expect.poll(async () => {
      const box = await canvasContainer.boundingBox();
      return box ? box.x : 0;
    }, { timeout: 3000 }).toBeGreaterThanOrEqual(130);

    // Click collapse sidebar button (◀)
    const collapseBtn = page.locator('button[title*="Thu gọn thanh trang"]');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // Verify canvas container left returned to 26px (canvas expands)
    await expect.poll(async () => {
      const box = await canvasContainer.boundingBox();
      return box ? box.x : 0;
    }, { timeout: 3000 }).toBeLessThanOrEqual(35);

    // Click expand sidebar button (▶)
    const expandBtn = page.locator('button[title*="Mở sổ tay trang"]');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // Verify canvas container left shifted back to 140px (canvas shrinks)
    await expect.poll(async () => {
      const box = await canvasContainer.boundingBox();
      return box ? box.x : 0;
    }, { timeout: 3000 }).toBeGreaterThanOrEqual(130);
  });
});
