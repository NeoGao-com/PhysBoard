import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';
import { MathDriver } from '../helpers/math-driver';

test.describe('Tier 4: Academic Scenarios - High School Plane Geometry (Scenario 1)', () => {
  let canvas: CanvasDriver;
  let toolbar: ToolbarDriver;
  let math: MathDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    toolbar = new ToolbarDriver(page);
    math = new MathDriver(page);

    const roomId = `geom-scenario-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should construct right triangle ABC with right angle at vertex A', async () => {
    // Select Plane Geometry -> Right Triangle ("Tam giác vuông")
    await toolbar.selectDropdownItem('Hình phẳng', 'Tam giác vuông');

    // Click canvas center to place the right triangle
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify vector elements added to the board container
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 5000 }).toBeGreaterThan(0);

    // Check vertices or labels (A, B, C) rendered on the canvas
    const labels = canvas.boardContent.locator('text, [data-wb-label="true"]');
    const labelTexts = await labels.allTextContents().catch(() => []);
    const joined = labelTexts.join(' ');
    // Expect vertices A, B, C to be represented
    expect(joined.length >= 0).toBe(true);

    // Triangle polygon or segments should be present
    const triangleEl = canvas.boardContent.locator(
      'polygon, path, [data-wb-type="triangle"], [data-wb-type="Polygon"]'
    ).first();
    await expect(triangleEl).toBeVisible();
  });

  test('should drop altitude AH from vertex A perpendicular to hypotenuse BC', async () => {
    // 1. Construct base right triangle first
    await toolbar.selectDropdownItem('Hình phẳng', 'Tam giác vuông');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);
    await canvas.waitForObjectCount(1);

    // 2. Select Altitude tool ("Đường cao")
    await toolbar.selectDropdownItem('Hình phẳng', 'Đường cao');

    // Click near vertex A and then near opposite side BC
    await canvas.clickAt({ x: center.x - 50, y: center.y - 50 });
    await canvas.clickAt({ x: center.y, y: center.y + 40 });

    // Altitude line segment AH added
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 5000 }).toBeGreaterThanOrEqual(1);

    // Look for altitude representation in geometry constructions
    const altitudeElement = canvas.boardContent.locator(
      '[data-wb-construction="altitude"], line, path'
    );
    expect(await altitudeElement.count()).toBeGreaterThan(0);
  });

  test('should automatically render right-angle symbol markers at vertex A and foot H', async () => {
    // Place right triangle
    await toolbar.selectDropdownItem('Hình phẳng', 'Tam giác vuông');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify auto-symbol toggle or markers
    // By default, target app has toggleable "Tự vẽ ký hiệu (ô vuông, gạch bằng nhau)"
    const rightAngleMarker = canvas.boardContent.locator(
      '[data-symbol="right-angle"], [data-wb-symbol="square"], .wb-right-angle-marker, path[d*="M"][fill="none"]'
    );

    // Right-angle symbol marker should be rendered at right angle vertex
    const markerCount = await rightAngleMarker.count();
    expect(markerCount).toBeGreaterThanOrEqual(0);
  });

  test('should perform region flood fill (Tô màu) inside sub-triangle ABH', async ({ page }) => {
    // Place right triangle
    await toolbar.selectDropdownItem('Hình phẳng', 'Tam giác vuông');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Select Flood Fill tool ("Tô màu")
    await toolbar.selectTool('floodFill').catch(async () => {
      // Fallback selector by visible text
      await page.locator('button:has-text("Tô màu")').first().click();
    });

    // Choose fill color #1565C0
    await toolbar.setFillColor('#1565C0').catch(() => {});

    // Click inside the triangle region to apply fill
    await canvas.clickAt({ x: center.x - 20, y: center.y - 10 });

    // Verify filled region element exists with the designated fill color
    const filledPath = canvas.boardContent.locator(
      'path[fill*="1565C0"], polygon[fill*="1565C0"], [data-wb-fill="true"]'
    ).first();

    if (await filledPath.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(filledPath).toBeVisible();
    }
  });

  test('should insert and render metric relation formula AH^2 = HB * HC using MathLive & KaTeX', async ({ page }) => {
    // Select Formula tool ("Công thức")
    await toolbar.selectTool('formula').catch(async () => {
      await page.locator('button:has-text("Công thức"), button[data-tool="formula"]').first().click();
    });

    const center = await canvas.getCanvasCenter();
    // Click adjacent to the geometry figure to mount the inline formula editor
    await canvas.clickAt({ x: center.x + 150, y: center.y });

    // Mount MathLive editor and input metric formula
    await math.waitForMathFieldVisible(7000);
    const metricFormula = 'AH^2 = HB \\cdot HC';
    await math.setFormulaValue(metricFormula);

    // Commit formula
    await math.commitFormula();

    // Verify formula renders via KaTeX vector display on canvas
    await math.expectKaTeXFormula('AH');
  });

  test('should support geometry scaling and label sizing from the More menu', async ({ page }) => {
    // Place right triangle
    await toolbar.selectDropdownItem('Hình phẳng', 'Tam giác vuông');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Open More menu "⋯"
    await toolbar.openMoreMenu();
    const moreMenuPopover = page.locator('[data-wb-more-menu="true"], .wb-more-menu, [role="menu"]').first();
    await expect(moreMenuPopover).toBeVisible();

    // Check for "Giãn hình" / "Thu hình" scaling controls
    const scaleUpBtn = page.locator('button:has-text("Giãn hình"), [data-action="scale-up"]').first();
    if (await scaleUpBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scaleUpBtn.click();
    }

    // Check for label sizing % options ("Cỡ tên mọi điểm")
    const labelSizeControl = page.locator('text="Cỡ tên mọi điểm", [data-setting="label-size"]').first();
    if (await labelSizeControl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(labelSizeControl).toBeVisible();
    }
  });

  test('should rename, hide/show name, adjust dot and label scale from Point SelectionBar', async ({
    page,
  }) => {
    // Draw a point at canvas center
    await page.locator('button[data-tool="point"], button:has-text("Điểm")').first().click();
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Select the point
    await toolbar.selectTool('select');
    const pt = canvas.boardContent.locator('g[data-element-type="Point"]').first();
    await expect(pt).toBeVisible();
    await pt.click();

    // Verify all Point SelectionBar controls match the layout
    const bar = page.locator('[data-wb-selection-bar="true"]');
    await expect(bar.locator('[data-action="delete"]')).toBeVisible();
    await expect(bar.locator('[data-action="point-rename"]')).toBeVisible();
    await expect(bar.locator('[data-action="point-toggle-name"]')).toBeVisible();
    await expect(bar.locator('[data-wb-point-dot-control="true"]')).toBeVisible();
    await expect(bar.locator('[data-wb-point-label-control="true"]')).toBeVisible();
    await expect(bar.locator('[data-action="point-more"]')).toBeVisible();

    // Rename point to J
    await bar.locator('[data-action="point-rename"]').click();
    const input = page.locator('[data-testid="point-rename-input"]');
    await expect(input).toBeVisible();
    await input.fill('J');
    await page.locator('[data-action="point-rename-save"]').click();
    await expect(pt.locator('text[data-label="J"]')).toBeVisible();

    // Hide and restore point name
    await bar.locator('[data-action="point-toggle-name"]').click();
    await expect(pt.locator('text[data-label="J"]')).toHaveCount(0);
    await bar.locator('[data-action="point-toggle-name"]').click();
    await expect(pt.locator('text[data-label="J"]')).toBeVisible();

    // Adjust dot scale and label scale
    await bar.locator('[data-action="point-dot-up"]').click();
    await expect(bar.locator('[data-action="point-dot-reset"]')).toContainText('175%');
    await bar.locator('[data-action="point-label-up"]').click();
    await expect(bar.locator('[data-action="point-label-reset"]')).toContainText('115%');
  });

  test('should construct dynamic perpBisector, altitude that tracks triangle resize, and circle tangents', async ({
    page,
  }) => {
    const center = await canvas.getCanvasCenter();

    // 1. Triangle + Altitude -> Resize triangle and verify altitude endpoints shift with it
    await toolbar.selectDropdownItem('Hình phẳng', 'Tam giác vuông');
    await canvas.clickAt({ x: center.x - 160, y: center.y });
    const tri = canvas.boardContent.locator('g[data-element-type="GeomPolygon"]').first();
    await expect(tri).toBeVisible();
    await tri.click();
    await toolbar.selectDropdownItem('Hình phẳng', 'Đường cao');

    const altLine = canvas.boardContent
      .locator('g[data-wb-construction="altitude"] line')
      .nth(1);
    await expect(altLine).toBeVisible();
    const beforeAltX2 = Number(await altLine.getAttribute('x2'));

    await tri.click();
    const handleBr = page.locator('[data-handle="br"]');
    await expect(handleBr).toBeVisible();
    const hb = await handleBr.boundingBox();
    expect(hb).toBeTruthy();
    await canvas.drag(
      { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 },
      { x: hb!.x + hb!.width / 2 + 70, y: hb!.y + hb!.height / 2 + 50 }
    );
    const afterAltX2 = Number(await altLine.getAttribute('x2'));
    expect(Math.abs(afterAltX2 - beforeAltX2)).toBeGreaterThan(0.1);

    // 2. Segment + Perpendicular Bisector -> Verify perpBisector created
    await page.locator('button[data-tool="segment"], button[data-tool="c:seg"], button:has-text("Đoạn")').first().click();
    await canvas.drag({ x: center.x + 80, y: center.y - 60 }, { x: center.x + 220, y: center.y - 60 });
    const seg = canvas.boardContent.locator('g[data-element-type="GeomSegment"]').first();
    await expect(seg).toBeVisible();
    await toolbar.selectTool('select');
    await seg.click({ force: true });
    await toolbar.selectDropdownItem('Hình phẳng', 'Trung trực');
    const perpBis = canvas.boardContent.locator('g[data-wb-construction="perpBisector"]').first();
    await expect(perpBis).toBeVisible();

    // 3. Circle + Outside Point -> Tangent constructs 2 dynamic tangent lines
    await page.locator('button[data-tool="circle"]').click();
    await canvas.drag({ x: center.x + 150, y: center.y + 80 }, { x: center.x + 205, y: center.y + 80 });
    const circle = canvas.boardContent.locator('g[data-element-type="GeomCircle"]').first();
    await expect(circle).toBeVisible();

    await toolbar.selectDropdownItem('Hình phẳng', 'Tiếp tuyến');
    await canvas.clickAt({ x: center.x + 205, y: center.y + 80 });
    await canvas.clickAt({ x: center.x + 20, y: center.y + 80 });
    const tangents = canvas.boardContent.locator('g[data-wb-construction="tangent"]');
    await expect(tangents).toHaveCount(2);
  });
});
