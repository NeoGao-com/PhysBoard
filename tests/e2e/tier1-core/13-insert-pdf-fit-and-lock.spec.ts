import { test, expect } from "@playwright/test";
import { CanvasDriver } from "../helpers/canvas-driver";
import { ToolbarDriver } from "../helpers/toolbar-driver";

test.describe("Tier 1: 13 Insert PDF Fit to Paper & Lock Controls", () => {
  let roomId: string;
  const sampleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  test.beforeEach(async ({ page }) => {
    roomId = `test-pdf-lock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', {
      state: "attached",
      timeout: 10_000,
    });
  });

  test("TC-13-01: Inserted PDF pages fit 100% exactly to A4 paper bounds and world coordinates", async ({
    page,
  }) => {
    // 1. Insert 2 pages of PDF (portrait)
    await page.evaluate(
      ({ src }) => {
        const insertFn = (
          window as unknown as {
            __testInsertPdfPages?: (pages: unknown[]) => void;
          }
        ).__testInsertPdfPages;
        if (!insertFn) throw new Error("__testInsertPdfPages not found on window");
        insertFn([
          {
            pageNumber: 1,
            src,
            w: 10,
            h: 14.14,
            pixelWidth: 1000,
            pixelHeight: 1414,
          },
          {
            pageNumber: 2,
            src,
            w: 10,
            h: 14.14,
            pixelWidth: 1000,
            pixelHeight: 1414,
          },
        ]);
      },
      { src: sampleDataUrl }
    );

    // 2. Verify A4 sheet overlay is active and has 2 pages
    const a4Sheet = page.locator('[data-wb-a4-sheet="true"]');
    await expect(a4Sheet).toBeVisible();

    const page1Rect = page.locator('rect[data-page-rect="1"]');
    const page2Rect = page.locator('rect[data-page-rect="2"]');
    await expect(page1Rect).toBeVisible();
    await expect(page2Rect).toBeVisible();

    // In A4 portrait: pageW = 17, pageH = 24.04, pageStep = 24.04 + 0.8 = 24.84
    await expect(page1Rect).toHaveAttribute("x", "-8.5");
    await expect(page1Rect).toHaveAttribute("y", "0");
    await expect(page1Rect).toHaveAttribute("width", "17");
    await expect(page1Rect).toHaveAttribute("height", "24.04");

    await expect(page2Rect).toHaveAttribute("x", "-8.5");
    await expect(page2Rect).toHaveAttribute("y", "24.84");
    await expect(page2Rect).toHaveAttribute("width", "17");
    await expect(page2Rect).toHaveAttribute("height", "24.04");

    // 3. Verify inserted Image elements
    const images = page.locator('g[data-element-type="Image"]');
    await expect(images).toHaveCount(2);

    const img1 = images.nth(0);
    const img2 = images.nth(1);

    await expect(img1).toHaveAttribute("data-locked", "true");
    await expect(img1).toHaveAttribute("data-is-pdf", "true");
    await expect(img2).toHaveAttribute("data-locked", "true");
    await expect(img2).toHaveAttribute("data-is-pdf", "true");

    // Verify transform translation for page 1: targetY = -(0 + 24.04 / 2) = -12.02, so translate(0 12.02)
    const t1 = await img1.getAttribute("transform");
    expect(t1).toContain("translate(0 12.02)");

    // Inner <image> on page 1 has width=17, height=24.04, x=-8.5, y=-12.02
    const innerImg1 = img1.locator("image");
    await expect(innerImg1).toHaveAttribute("width", "17");
    await expect(innerImg1).toHaveAttribute("height", "24.04");
    await expect(innerImg1).toHaveAttribute("x", "-8.5");
    await expect(innerImg1).toHaveAttribute("y", "-12.02");

    // Verify transform translation for page 2: targetY = -(24.84 + 12.02) = -36.86, so translate(0 36.86)
    const t2 = await img2.getAttribute("transform");
    expect(t2).toContain("translate(0 36.86)");

    const innerImg2 = img2.locator("image");
    await expect(innerImg2).toHaveAttribute("width", "17");
    await expect(innerImg2).toHaveAttribute("height", "24.04");
    await expect(innerImg2).toHaveAttribute("x", "-8.5");
    await expect(innerImg2).toHaveAttribute("y", "-12.02");
  });

  test("TC-13-02: Locked PDF cannot be selected or moved; drawing and erasing pass through", async ({
    page,
  }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    // Insert 1 page of PDF
    await page.evaluate(
      ({ src }) => {
        const insertFn = (
          window as unknown as {
            __testInsertPdfPages?: (pages: unknown[]) => void;
          }
        ).__testInsertPdfPages;
        insertFn?.([
          {
            pageNumber: 1,
            src,
            w: 10,
            h: 14.14,
            pixelWidth: 1000,
            pixelHeight: 1414,
          },
        ]);
      },
      { src: sampleDataUrl }
    );

    const pdfEl = page.locator('g[data-element-type="Image"]').first();
    await expect(pdfEl).toBeVisible();
    await expect(pdfEl).toHaveAttribute("data-locked", "true");

    // Check pointerEvents on <image>
    const pointerEvents = await pdfEl
      .locator("image")
      .evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe("none");

    // 1. Select tool: clicking on the PDF should NOT select it
    const selectBtn = page.locator('button[data-tool="select"]');
    await selectBtn.click();
    await expect(selectBtn).toHaveAttribute("data-active", "true");
    const svgBox = await canvas.svgCanvas.boundingBox();
    expect(svgBox).not.toBeNull();
    const cx = svgBox!.x + svgBox!.width / 2;
    const cy = svgBox!.y + svgBox!.height / 2;

    await page.mouse.click(cx, cy);
    await page.waitForTimeout(100);
    await expect(pdfEl).not.toHaveAttribute("data-selected", "true");

    // 2. Marquee box: dragging across the PDF should NOT select it
    await page.mouse.move(cx - 60, cy - 60);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy + 60, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    await expect(pdfEl).not.toHaveAttribute("data-selected", "true");

    // 3. Pen tool: drawing on the PDF should create an Ink stroke
    const penBtn = page.locator('button[data-tool="ink"]');
    await penBtn.click();
    await canvas.drawStroke([
      { x: cx - 40, y: cy - 20 },
      { x: cx + 40, y: cy - 20 },
    ]);
    const strokes = page.locator('g[data-element-type="Ink"][data-id]');
    await expect(strokes).toHaveCount(1);

    // 3b. Ctrl+A must select the ink stroke and NEVER select the locked PDF
    await page.keyboard.press("Control+a");
    await expect(strokes.first().locator("g[data-element-type=\"Ink\"]")).toHaveAttribute(
      "data-selected",
      "true"
    );
    await expect(pdfEl).not.toHaveAttribute("data-selected", "true");
    await page.keyboard.press("Escape");

    // 4. Contact Eraser: erasing the stroke should delete the ink but NOT delete the PDF
    await toolbar.selectTool("erase");
    await page.mouse.move(cx - 50, cy - 20);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy - 20, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    // Stroke is deleted, PDF remains intact
    await expect(strokes).toHaveCount(0);
    await expect(pdfEl).toBeVisible();
  });

  test("TC-13-03: Lock & Unlock mechanism toggles between fixed paper and movable image", async ({
    page,
  }) => {
    // Insert 1 page of PDF
    await page.evaluate(
      ({ src }) => {
        const insertFn = (
          window as unknown as {
            __testInsertPdfPages?: (pages: unknown[]) => void;
          }
        ).__testInsertPdfPages;
        insertFn?.([
          {
            pageNumber: 1,
            src,
            w: 10,
            h: 14.14,
            pixelWidth: 1000,
            pixelHeight: 1414,
          },
        ]);
      },
      { src: sampleDataUrl }
    );

    const pdfEl = page.locator('g[data-element-type="Image"]').first();
    await expect(pdfEl).toHaveAttribute("data-locked", "true");

    // 1. Verify canvas has no floating lock badge (only exists in SỔ TAY sidebar)
    await expect(page.locator('[data-action="toggle-pdf-lock"]')).toHaveCount(0);

    // 2. Lock button in SỔ TAY sidebar
    const sidebarLockBtn = page.locator(
      '[data-action="sidebar-toggle-pdf-lock"][data-page="1"]'
    );
    await expect(sidebarLockBtn).toBeVisible();
    await expect(sidebarLockBtn).toContainText("Đã khóa PDF");

    // 3. Click sidebar lock button to unlock
    await sidebarLockBtn.click();
    await expect(sidebarLockBtn).toContainText("Mở khóa PDF");

    // PDF element is now unlocked and selected
    await expect(pdfEl).not.toHaveAttribute("data-locked", "true");
    await expect(pdfEl).toHaveAttribute("data-selected", "true");

    // Selection bar appears and contains "Khóa vào trang"
    const lockSelectionBtn = page.locator('[data-action="lock-selection"]');
    await expect(lockSelectionBtn).toBeVisible();

    // 4. Click "Khóa vào trang" to lock back
    await lockSelectionBtn.click();
    await expect(pdfEl).toHaveAttribute("data-locked", "true");
    await expect(pdfEl).not.toHaveAttribute("data-selected", "true");
    await expect(sidebarLockBtn).toContainText("Đã khóa PDF");
  });

  test("TC-13-04: PageSidebar thumbnail card displays PDF lock status and allows toggle", async ({
    page,
  }) => {
    // Insert 1 page of PDF
    await page.evaluate(
      ({ src }) => {
        const insertFn = (
          window as unknown as {
            __testInsertPdfPages?: (pages: unknown[]) => void;
          }
        ).__testInsertPdfPages;
        insertFn?.([
          {
            pageNumber: 1,
            src,
            w: 10,
            h: 14.14,
            pixelWidth: 1000,
            pixelHeight: 1414,
          },
        ]);
      },
      { src: sampleDataUrl }
    );

    // Sidebar button for page 1 PDF lock in SỔ TAY
    const sidebarLockBtn = page.locator(
      '[data-action="sidebar-toggle-pdf-lock"][data-page="1"]'
    );
    await expect(sidebarLockBtn).toBeVisible();
    await expect(sidebarLockBtn).toContainText("Đã khóa PDF");

    // Click sidebar lock button to unlock
    await sidebarLockBtn.click();
    await expect(sidebarLockBtn).toContainText("Mở khóa PDF");

    const pdfEl = page.locator('g[data-element-type="Image"]').first();
    await expect(pdfEl).not.toHaveAttribute("data-locked", "true");

    // Click again to lock
    await sidebarLockBtn.click();
    await expect(sidebarLockBtn).toContainText("Đã khóa PDF");
    await expect(pdfEl).toHaveAttribute("data-locked", "true");
  });
});
