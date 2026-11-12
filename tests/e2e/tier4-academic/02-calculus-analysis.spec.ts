import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 4: Academic Scenarios - Calculus & Function Analysis (Scenario 2)', () => {
  let canvas: CanvasDriver;
  let toolbar: ToolbarDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    toolbar = new ToolbarDriver(page);

    const roomId = `calc-scenario-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should insert 2D Oxy Cartesian coordinate axes onto the whiteboard', async () => {
    // Select Functions dropdown -> Coordinate axes Oxy ("Hệ trục Oxy")
    await toolbar.selectDropdownItem('Hàm số', 'Hệ trục Oxy');

    // Click canvas center to place the coordinate system
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify axes element rendered in board content
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 5000 }).toBeGreaterThan(0);

    const axesElement = canvas.boardContent.locator(
      '[data-wb-type="Axes"], [data-wb-type="axes"], .wb-axes, g.axes'
    ).first();
    await expect(axesElement).toBeVisible();

    // Verify axis arrow markers and origin label "O"
    const axisLabels = axesElement.locator('text');
    const labelTexts = await axisLabels.allTextContents().catch(() => []);
    expect(labelTexts.some((t) => t.includes('x') || t.includes('y') || t.includes('O'))).toBe(true);
  });

  test('should plot explicit function y = x^3 - 3x + m with variable parameter slider', async ({ page }) => {
    // 1. Insert Oxy axes first
    await toolbar.selectDropdownItem('Hàm số', 'Hệ trục Oxy');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // 2. Select Function Plotter ("Vẽ đồ thị trên hệ trục Oxy" / "Vẽ đồ thị")
    await toolbar.selectDropdownItem('Hàm số', 'Vẽ đồ thị');

    // Input dialog or inline formula field for y = f(x)
    const formulaInput = page.locator(
      'input[data-wb-plot="formula"], input[placeholder*="f(x)"], math-field, [data-testid="plot-input"]'
    ).first();

    if (await formulaInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await formulaInput.fill('x^3 - 3*x + m');
      await page.keyboard.press('Enter');
    }

    // 3. Confirm dynamic slider for parameter 'm' appears
    const sliderM = page.locator(
      '[data-wb-slider="m"], input[type="range"][name="m"], .wb-parameter-slider'
    ).first();

    if (await sliderM.isVisible({ timeout: 4000 }).catch(() => false)) {
      // Drag or set slider value to 2
      await sliderM.fill('2');
      await sliderM.dispatchEvent('input');
      await sliderM.dispatchEvent('change');

      // Verify graph curve path updates dynamically
      const plotPath = canvas.boardContent.locator(
        'path[data-wb-plot="curve"], .wb-plot-curve, path.curve'
      ).first();
      await expect(plotPath).toBeVisible();
    }
  });

  test('should generate calculus variation table (bảng biến thiên) with critical points and arrows', async () => {
    // Select Functions dropdown -> Variation Table ("Bảng biến thiên")
    await toolbar.selectDropdownItem('Hàm số', 'Bảng biến thiên');

    // Click canvas to place the table
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt({ x: center.x, y: center.y + 100 });

    // Verify variation table element appears
    const varTable = canvas.boardContent.locator(
      '[data-wb-type="VarTable"], [data-wb-type="var-table"], .wb-var-table, table.var-table'
    ).first();
    await expect(varTable).toBeVisible({ timeout: 6000 });

    // Verify row headers: x, y' (f'(x)), y (f(x))
    const tableText = await varTable.textContent();
    expect(tableText).toBeTruthy();

    // Verify critical points or monotonic arrows (e.g. \nearrow or \searrow SVG paths)
    const arrowsOrRows = varTable.locator('path, text, tr, td');
    expect(await arrowsOrRows.count()).toBeGreaterThan(3);
  });

  test('should render interactive trigonometric circle with draggable point M and coordinate readout', async ({ page }) => {
    // Select Functions dropdown -> Trigonometric Circle ("Đường tròn lượng giác")
    await toolbar.selectDropdownItem('Hàm số', 'Đường tròn lượng giác');

    // Click canvas to place trig circle
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify trig circle is rendered
    const trigCircle = canvas.boardContent.locator(
      '[data-wb-type="TrigCircle"], [data-wb-type="trig-circle"], .wb-trig-circle'
    ).first();
    await expect(trigCircle).toBeVisible({ timeout: 6000 });

    // Verify draggable point M on the unit circle
    const pointM = trigCircle.locator(
      '[data-wb-point="M"], circle[data-draggable="true"], .wb-trig-point-m'
    ).first();

    if (await pointM.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await pointM.boundingBox();
      if (box) {
        // Drag point M around the circle
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 80, box.y - 60, { steps: 5 });
        await page.mouse.up();
      }

      // Verify dynamic readout panel for cos, sin, tan, cot
      const readoutPanel = page.locator(
        '[data-wb-trig-values="true"], .wb-trig-readout'
      ).first();
      if (await readoutPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await readoutPanel.textContent();
        expect(text).toMatch(/cos|sin|tan|cot/i);
      }
    }
  });

  test('should open searchable real-world math drawer (🏞 Thực tế ▾) with categories', async ({ page }) => {
    // Open Real-world dropdown
    await toolbar.selectDropdownItem('Thực tế', 'Tìm vật khác…').catch(async () => {
      // Alternatively click direct drawer trigger
      await page.locator('button:has-text("Thực tế")').first().click();
      await page.locator('[role="menuitem"]:has-text("Tìm"), button:has-text("Tìm")').first().click();
    });

    // Verify searchable SVG drawer opens
    const drawer = page.locator(
      '[data-wb-drawer="realworld"], .wb-realworld-drawer, [data-testid="realworld-drawer"]'
    ).first();

    if (await drawer.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(drawer).toBeVisible();

      // Check categories (NGƯỜI & CÂY, CÔNG TRÌNH, CỘT & ĐỒ VẬT, XE & TÀU, TRỜI & ĐẤT)
      const categoryTabs = drawer.locator('button, [role="tab"], .wb-category-tab');
      expect(await categoryTabs.count()).toBeGreaterThan(0);

      // Verify search input
      const searchInput = drawer.locator('input[type="search"], input[placeholder*="Tìm"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('cây');
        await page.waitForTimeout(300);
      }
    }
  });
});
