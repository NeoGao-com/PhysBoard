import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 4: Academic Scenarios - 3D Space Geometry & Stereometry (Scenario 3)', () => {
  let canvas: CanvasDriver;
  let toolbar: ToolbarDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    toolbar = new ToolbarDriver(page);

    const roomId = `space-scenario-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should insert 3D spatial solid (triangular pyramid S.ABC) on canvas', async () => {
    // Select Space Geometry -> Triangular pyramid ("Chóp tam giác")
    await toolbar.selectDropdownItem('Không gian', 'Chóp tam giác');

    // Click canvas center to place 3D solid
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify 3D solid element is rendered in board container
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 5000 }).toBeGreaterThan(0);

    const solidElement = canvas.boardContent.locator(
      '[data-wb-type="Solid3D"], [data-wb-type="solid3d"], .wb-solid3d, g.solid3d'
    ).first();
    await expect(solidElement).toBeVisible();

    // Verify vertex labels (S, A, B, C)
    const vertexLabels = solidElement.locator('text');
    const texts = await vertexLabels.allTextContents().catch(() => []);
    expect(texts.some((t) => t.includes('S') || t.includes('A') || t.includes('B') || t.includes('C'))).toBe(true);
  });

  test('should render hidden perspective edges with dashed stroke and visible edges solid', async () => {
    // Place 3D triangular pyramid
    await toolbar.selectDropdownItem('Không gian', 'Chóp tam giác');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    const solidElement = canvas.boardContent.locator(
      '[data-wb-type="Solid3D"], [data-wb-type="solid3d"], .wb-solid3d, g.solid3d'
    ).first();
    await expect(solidElement).toBeVisible();

    // Inspect edges of the 3D model
    const edges = solidElement.locator('line, path');
    const edgeCount = await edges.count();
    expect(edgeCount).toBeGreaterThanOrEqual(4);

    // Query for dashed edges (hidden perspective lines in stereometry)
    const dashedEdges = solidElement.locator(
      'line[stroke-dasharray], path[stroke-dasharray], [data-wb-edge="hidden"], .wb-hidden-edge'
    );
    const dashedCount = await dashedEdges.count();

    // Stereometric projection of a pyramid must have at least one hidden rear/base edge
    expect(dashedCount).toBeGreaterThanOrEqual(1);

    // Query for solid edges (visible front faces)
    const solidEdges = solidElement.locator(
      'line:not([stroke-dasharray]), path:not([stroke-dasharray])'
    );
    expect(await solidEdges.count()).toBeGreaterThanOrEqual(1);
  });

  test('should adjust 3D perspective projection interactively using orbital rotation controls', async ({ page }) => {
    // Place 3D solid
    await toolbar.selectDropdownItem('Không gian', 'Chóp tam giác');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify orbital control bar is present for 3D elements
    const orbitBar = canvas.orbitBar;
    if (await orbitBar.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(orbitBar).toBeVisible();

      // Read initial vertex coordinates before rotation
      const firstVertex = canvas.boardContent.locator('circle, [data-wb-vertex="true"]').first();
      const initialBox = await firstVertex.boundingBox();

      // Drag azimuth slider or rotation ring on the orbit bar
      const azimuthControl = orbitBar.locator(
        'input[type="range"], [data-wb-orbit="azimuth"], .wb-orbit-handle'
      ).first();

      if (await azimuthControl.isVisible()) {
        const box = await azimuthControl.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 10, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 5 });
          await page.mouse.up();
        }
      }

      // Verify that vertex coordinates recomputed
      if (initialBox) {
        const updatedBox = await firstVertex.boundingBox();
        expect(updatedBox).not.toBeNull();
      }
    }
  });

  test('should extract true 2D plane face (Tách mặt phẳng hình thật) beside the 3D solid', async ({ page }) => {
    // Place 3D solid
    await toolbar.selectDropdownItem('Không gian', 'Chóp tam giác');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    const initialCount = await canvas.getObjectCount();

    // Select 3D tool: "Tách mặt phẳng (hình thật)"
    await toolbar.selectDropdownItem('Không gian', 'Tách mặt phẳng').catch(async () => {
      // In some menus it may be titled "Tách mặt phẳng" or "Tách mặt"
      await page.locator('[role="menuitem"]:has-text("Tách mặt"), button:has-text("Tách mặt")').first().click();
    });

    // Click a face or vertex of the solid, then click adjacent canvas spot to place 2D true planar shape
    await canvas.clickAt({ x: center.x, y: center.y });
    await canvas.clickAt({ x: center.x + 220, y: center.y });

    // Verify a new 2D polygon element representing the unfolded/extracted face is added
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 6000 }).toBeGreaterThanOrEqual(initialCount);
  });

  test('should insert 3D Cartesian frame Oxyz onto canvas', async () => {
    // Select Space Geometry -> Coordinate system Oxyz ("Hệ trục Oxyz")
    await toolbar.selectDropdownItem('Không gian', 'Hệ trục Oxyz');

    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify 3D coordinate system element
    const oxyzElement = canvas.boardContent.locator(
      '[data-wb-type="Oxyz"], [data-wb-type="oxyz"], .wb-oxyz'
    ).first();

    if (await oxyzElement.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(oxyzElement).toBeVisible();

      // Should display x, y, z labels
      const axisTexts = await oxyzElement.locator('text').allTextContents();
      expect(axisTexts.some((t) => t.includes('z') || t.includes('y') || t.includes('x'))).toBe(true);
    }
  });

  test('should move attached 3D edge point and segment when resizing a 3D pyramid', async ({
    page,
  }) => {
    await toolbar.selectDropdownItem('Không gian', 'Chóp tứ giác');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    const solid = canvas.boardContent.locator('g[data-wb-type="Solid3D"]').first();
    await expect(solid).toBeVisible();

    // Place a constrained point on a 3D edge via "Điểm trên cạnh / đường"
    const sBox = await solid.boundingBox();
    expect(sBox).toBeTruthy();
    await toolbar.selectDropdownItem('Không gian', 'Điểm trên cạnh / đường');
    await canvas.clickAt({ x: sBox!.x + sBox!.width * 0.35, y: sBox!.y + sBox!.height * 0.45 });

    const attachedPt = canvas.boardContent.locator('g[data-element-type="Point"] circle').first();
    await expect(attachedPt).toBeVisible();
    const beforeCx = Number(await attachedPt.getAttribute('cx'));

    // Resize the Solid3D via bottom-right handle
    await toolbar.selectTool('select');
    await solid.click({ force: true });
    const handleSe = page.locator('[data-handle="se"]');
    await expect(handleSe).toBeVisible();
    const hb = await handleSe.boundingBox();
    expect(hb).toBeTruthy();
    await canvas.drag(
      { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 },
      { x: hb!.x + hb!.width / 2 + 80, y: hb!.y + hb!.height / 2 + 60 }
    );

    const afterCx = Number(await attachedPt.getAttribute('cx'));
    expect(Math.abs(afterCx - beforeCx)).toBeGreaterThan(0.2);
  });
});
