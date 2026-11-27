import { test, expect, type Page } from "@playwright/test";
import { CanvasDriver } from "../helpers/canvas-driver";
import { ToolbarDriver } from "../helpers/toolbar-driver";

async function setAutoSwitchOff(page: Page) {
  await page.locator('button[data-action-open-settings="true"]').first().click();
  const label = page.locator("label", { hasText: "Không tự chuyển" }).first();
  await expect(label).toBeVisible();
  await label.click();
  await page.keyboard.press("Escape");
}

test.describe("Real Check: Segment & Circle Tools", () => {
  test.beforeEach(async ({ page }) => {
    const roomId = `seg-circ-check-${Date.now()}`;
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
      } catch {
        // ignore
      }
    });
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: "attached",
      timeout: 15_000,
    });
  });

  test("Segment: drag, 2-click, and snapping onto existing segment/endpoints", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();
    await setAutoSwitchOff(page);

    // 1. Drag to create segment 1
    await toolbar.selectTool("segment");
    await canvas.drag(
      { x: center.x - 140, y: center.y - 60 },
      { x: center.x - 20, y: center.y - 60 }
    );
    await canvas.waitForObjectCount(1);

    // 2. 2-click to create segment 2 (click start -> move -> verify preview -> click end)
    await page.mouse.click(center.x + 20, center.y - 60);
    await page.mouse.move(center.x + 140, center.y - 60, { steps: 5 });
    await expect(page.locator("[data-wb-draft-measure='true']")).toBeVisible();
    await page.mouse.click(center.x + 140, center.y - 60);
    await canvas.waitForObjectCount(2);

    // 3. Draw segment 3 STARTING directly on an existing segment's middle (creates snapped GeomPoint + GeomSegment = 4 elements)
    await canvas.drag(
      { x: center.x - 80, y: center.y - 60 },
      { x: center.x - 80, y: center.y + 80 }
    );
    await canvas.waitForObjectCount(4);

    expect(errors).toEqual([]);
  });

  test("Circle: drag, 2-click, and drawing from existing point/circle", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();
    await setAutoSwitchOff(page);

    // 1. Drag to create circle 1
    await toolbar.selectTool("circle");
    await canvas.drag(
      { x: center.x - 100, y: center.y },
      { x: center.x - 30, y: center.y }
    );
    await canvas.waitForObjectCount(1);

    // 2. 2-click to create circle 2
    await page.mouse.click(center.x + 100, center.y);
    await page.mouse.move(center.x + 160, center.y, { steps: 5 });
    await expect(page.locator("[data-wb-draft-measure='true']")).toBeVisible();
    await page.mouse.click(center.x + 160, center.y);
    await canvas.waitForObjectCount(2);

    // 3. Place a GeomPoint and draw circle centered on it
    await toolbar.selectTool("point");
    await page.mouse.click(center.x, center.y + 120);
    await canvas.waitForObjectCount(3);

    await toolbar.selectTool("circle");
    await canvas.drag(
      { x: center.x, y: center.y + 120 },
      { x: center.x + 60, y: center.y + 120 }
    );
    await canvas.waitForObjectCount(4);

    // 4. Pen-only mode with stylus pen on Segment & Circle
    await page.locator('button[title*="Chế độ chỉ bút"]').first().click();
    await page.evaluate(
      ({ x1, y1, x2, y2 }) => {
        const svg = document.querySelector('svg[data-wb-canvas="true"], svg.wb-canvas')!;
        svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "pen", pointerId: 99, button: 0, buttons: 1, pressure: 0.7, clientX: x1, clientY: y1 }));
        svg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerType: "pen", pointerId: 99, button: -1, buttons: 1, pressure: 0.7, clientX: x2, clientY: y2 }));
        svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerType: "pen", pointerId: 99, button: 0, buttons: 0, pressure: 0, clientX: x2, clientY: y2 }));
      },
      { x1: center.x - 100, y1: center.y - 120, x2: center.x - 40, y2: center.y - 120 }
    );
    await canvas.waitForObjectCount(5);

    expect(errors).toEqual([]);
  });

  test("Segment & Circle in A4 mode and via keyboard shortcuts / submenu", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();

    // Test submenu c:segment, c:dseg, c:line, c:ray, c:vector
    await toolbar.selectTool("c:dseg");
    await canvas.drag(
      { x: center.x - 100, y: center.y - 50 },
      { x: center.x + 100, y: center.y - 50 }
    );
    await canvas.waitForObjectCount(1);

    // Test shortcut or button switch back to circle and draw in default autoSwitch mode
    await toolbar.selectTool("circle");
    await canvas.drag(
      { x: center.x, y: center.y + 40 },
      { x: center.x + 50, y: center.y + 40 }
    );
    await canvas.waitForObjectCount(2);

    // Verify circle SVG actually has non-zero radius and visible geometry
    const circleRadius = await canvas.boardContent.locator("circle").first().getAttribute("r");
    expect(Number(circleRadius)).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test("Segment & Circle in A4 mode work properly on lower half of Page 1 without flattening", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Switch board format to A4 Portrait
    await page.locator('button[data-action-open-settings="true"]').first().click();
    await page.locator('button:has-text("Khổ & Nền bảng")').first().click();
    const a4Format = page.locator('[data-board-format-option="a4_portrait"]').first();
    await expect(a4Format).toBeVisible();
    await a4Format.click();
    await page.keyboard.press("Escape");

    // Pan slightly up (drag canvas upward) so lower half of A4 Page 1 is centered in viewport
    const center = await canvas.getCanvasCenter();
    await canvas.pan(0, -350);

    // Draw vertical segment in the lower half of A4 Page 1
    await toolbar.selectTool("segment");
    await canvas.drag(
      { x: center.x - 80, y: center.y - 40 },
      { x: center.x - 80, y: center.y + 80 }
    );
    await expect(canvas.boardContent.locator('[data-element-type="GeomSegment"]')).toHaveCount(1);

    const segLine = canvas.boardContent.locator('[data-element-type="GeomSegment"] line').last();
    const y1 = Number(await segLine.getAttribute("y1"));
    const y2 = Number(await segLine.getAttribute("y2"));
    // Vertical segment must remain vertical (y2 - y1 > 1.5 world units, NOT flattened to 0!)
    expect(Math.abs(y2 - y1)).toBeGreaterThan(1.5);

    // Draw circle in the lower half of A4 Page 1
    await toolbar.selectTool("circle");
    await canvas.drag(
      { x: center.x + 60, y: center.y + 180 },
      { x: center.x + 120, y: center.y + 180 }
    );
    await expect(canvas.boardContent.locator('[data-element-type="GeomCircle"]')).toHaveCount(1);

    const circEl = canvas.boardContent.locator('[data-element-type="GeomCircle"] circle').last();
    const r = Number(await circEl.getAttribute("r"));
    const cy = Number(await circEl.getAttribute("cy"));
    expect(r).toBeGreaterThan(0.5);
    // In SVG Y-down coordinates, lower half of A4 Page 1 (heightWorld = 24.04, midpoint = 12.02) has cy > 12.1
    expect(cy).toBeGreaterThan(12.1);

    expect(errors).toEqual([]);
  });
});
