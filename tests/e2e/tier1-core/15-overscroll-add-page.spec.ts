import { test, expect } from "@playwright/test";
import { CanvasDriver } from "../helpers/canvas-driver";
import { ToolbarDriver } from "../helpers/toolbar-driver";

test.describe("Tier 1: 15 Continuous A4 Overscroll Hold To Add Page", () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-overscroll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', {
      state: "attached",
      timeout: 10_000,
    });
  });

  test("TC-15-01: In A4 mode, scrolling down past bottom and holding automatically adds a new page", async ({
    page,
  }) => {
    // 1. Switch board format to A4 portrait
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("a4_portrait");
    });

    // Verify initial page count is 1
    const sidebarTitle = page.locator('div:has-text("SỔ TAY")').first();
    await expect(sidebarTitle).toContainText("SỔ TAY (1)");

    const svgCanvas = page.locator('svg[data-wb-canvas="true"]');
    const box = await svgCanvas.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // 2. Scroll down until reaching the bottom of the page
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(40);
    }

    // 3. Now at bottom edge: continue scrolling down and hold for >= 750ms
    const startTime = Date.now();
    while (Date.now() - startTime < 850) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }

    // 4. Verify page count updated to 2
    await expect(sidebarTitle).toContainText("SỔ TAY (2)", { timeout: 6000 });

    // Verify page 2 rect exists in A4 sheet
    const page2Rect = page.locator('[data-wb-a4-sheet="true"] [data-page-rect="2"]');
    await expect(page2Rect).toBeVisible({ timeout: 5000 });
  });

  test("TC-15-02: Cancelling scroll early (< 350ms) does NOT add a new page", async ({
    page,
  }) => {
    // 1. Switch board format to A4 portrait
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("a4_portrait");
    });

    const sidebarTitle = page.locator('div:has-text("SỔ TAY")').first();
    await expect(sidebarTitle).toContainText("SỔ TAY (1)");

    const svgCanvas = page.locator('svg[data-wb-canvas="true"]');
    const box = await svgCanvas.boundingBox();
    if (!box) return;

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // 2. Dispatch a brief flick (only 120ms of wheel events)
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(50);
    await page.mouse.wheel(0, 100);

    // Wait 500ms idle to let overscroll timeout expire
    await page.waitForTimeout(500);

    // Page count MUST still be 1!
    await expect(sidebarTitle).toContainText("SỔ TAY (1)");
    const page2Rect = page.locator('[data-wb-a4-sheet="true"] [data-page-rect="2"]');
    await expect(page2Rect).toHaveCount(0);
  });

  test("TC-15-03: In Infinite format, overscrolling does not trigger adding pages", async ({
    page,
  }) => {
    // Ensure in default infinite format
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("infinite");
    });

    const sidebarTitle = page.locator('div:has-text("SỔ TAY")').first();
    await expect(sidebarTitle).toContainText("SỔ TAY (1)");

    const svgCanvas = page.locator('svg[data-wb-canvas="true"]');
    const box = await svgCanvas.boundingBox();
    if (!box) return;

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Dispatch downward wheel events for 800ms
    const startTime = Date.now();
    while (Date.now() - startTime < 800) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(60);
    }

    // In infinite mode, page count stays 1
    await expect(sidebarTitle).toContainText("SỔ TAY (1)");
    const indicator = page.locator('[data-testid="overscroll-add-page-indicator"]');
    await expect(indicator).toHaveCount(0);
  });

  test("TC-15-04: Multi-page consecutive append from bottom of page 2 to page 3", async ({
    page,
  }) => {
    // 1. Switch to A4 portrait
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("a4_portrait");
    });

    const sidebarTitle = page.locator('div:has-text("SỔ TAY")').first();
    await expect(sidebarTitle).toContainText("SỔ TAY (1)");

    const svgCanvas = page.locator('svg[data-wb-canvas="true"]');
    const box = await svgCanvas.boundingBox();
    if (!box) return;

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // 2. Scroll to bottom of page 1 and hold to add page 2
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(40);
    }
    let startTime = Date.now();
    while (Date.now() - startTime < 850) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    await expect(sidebarTitle).toContainText("SỔ TAY (2)", { timeout: 6000 });

    // Wait for lockout cool-down (800ms)
    await page.waitForTimeout(800);

    // 3. Scroll through page 2 to bottom and hold to trigger page 3
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(40);
    }
    startTime = Date.now();
    while (Date.now() - startTime < 850) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    await expect(sidebarTitle).toContainText("SỔ TAY (3)", { timeout: 6000 });
  });
});
