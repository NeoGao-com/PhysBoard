import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

test.describe('Tier 4: Math & Physics Deep Integrations', () => {
  let canvas: CanvasDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    const roomId = `deep-integrations-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('Oscilloscope Oxy Graph: Export physics graph & stream realtime curves', async ({ page }) => {
    // Open Physics Drawer and insert Spring Pendulum
    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-open-drawer="true"]').click();
    await page.locator('[data-testid="physics-drawer"]').waitFor({ state: 'visible' });

    await page.locator('[data-physics-tab="sim11"]').click();
    await page.locator('[data-physics-insert-sim="spring_pendulum"]').click();

    const sim = page.locator('g[data-element-type="PhysicsSim"]').first();
    await expect(sim).toBeVisible();

    // Click "📊 Đồ thị Oxy" button inside sim card
    await sim.locator('[data-physics-export-graph="true"]').click();

    // Verify Axes2D element is generated with linkedSimId and oscilloscope curves
    const axes = page.locator('g[data-element-type="Axes2D"]').first();
    await expect(axes).toBeVisible();
    await expect(axes.locator('g.wb-oscilloscope-curves')).toBeVisible();
  });

  test('Formula Popover: 1-click Quick Actions (Vẽ đồ thị, Bảng biến thiên, Tô miền tích phân)', async ({
    page,
  }) => {
    // Select Formula tool from Toolbar
    await page.locator('[data-tool="formula"]').click();
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify MathEditor modal / card is visible with the 3 quick action buttons
    const mathEditor = page.locator('.wb-math-editor');
    await expect(mathEditor).toBeVisible();

    const plotBtn = mathEditor.locator('[data-action="formula-quick-plot"]');
    const varTableBtn = mathEditor.locator('[data-action="formula-quick-vartable"]');
    const shadeBtn = mathEditor.locator('[data-action="formula-quick-shade"]');

    await expect(plotBtn).toBeVisible();
    await expect(varTableBtn).toBeVisible();
    await expect(shadeBtn).toBeVisible();

    // Click "Tạo bảng biến thiên"
    await varTableBtn.click();
    await expect(page.locator('g[data-element-type="VarTable"]').first()).toBeVisible();
  });

  test('3D Net Unfolding: Unfold 3D solid into 2D printable net', async ({ page }) => {
    // Insert 3D Pyramid
    await page.locator('[data-dropdown="space"]').click();
    await page.locator('button:has-text("Chóp tam giác")').click();
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    const solid = page.locator('g[data-element-type="Solid3D"]').first();
    await expect(solid).toBeVisible();

    // Choose Unfold tool from 3D space menu
    await page.locator('[data-dropdown="space"]').click();
    await page.locator('button:has-text("Trải phẳng đa diện")').click();

    // Click on the pyramid to unfold it
    await canvas.clickAt(center);

    // Verify 2D unfolded polygons were created
    const netPolygons = page.locator('g[data-element-type="GeomPolygon"]');
    expect(await netPolygons.count()).toBeGreaterThanOrEqual(2);
  });
});
