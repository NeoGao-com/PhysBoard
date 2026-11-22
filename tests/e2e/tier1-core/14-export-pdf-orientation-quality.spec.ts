import { test, expect } from "@playwright/test";
import { CanvasDriver } from "../helpers/canvas-driver";
import { ToolbarDriver } from "../helpers/toolbar-driver";
import { ExportDriver } from "../helpers/export-driver";
import * as fs from "node:fs/promises";

function parsePdfMediaBoxes(buffer: Buffer): Array<{ width: number; height: number; isPortrait: boolean }> {
  const text = buffer.toString("binary");
  const mediaBoxRegex = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g;
  const boxes: Array<{ width: number; height: number; isPortrait: boolean }> = [];
  let match: RegExpExecArray | null;
  while ((match = mediaBoxRegex.exec(text)) !== null) {
    const x1 = parseFloat(match[1]);
    const y1 = parseFloat(match[2]);
    const x2 = parseFloat(match[3]);
    const y2 = parseFloat(match[4]);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    boxes.push({
      width,
      height,
      isPortrait: height > width,
    });
  }
  return boxes;
}

test.describe("Tier 1: 14 PDF Export Orientation & Quality Verification", () => {
  let roomId: string;
  const sampleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  test.beforeEach(async ({ page }) => {
    roomId = `test-export-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', {
      state: "attached",
      timeout: 10_000,
    });
  });

  test("TC-14-01: A4 Portrait mode exports true Portrait PDF (595 x 842 pt, never landscape)", async ({
    page,
  }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    // 1. Switch board format to a4_portrait
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("a4_portrait");
    });

    // 2. Draw an ink stroke on the canvas
    await page.locator('button[data-tool="ink"]').first().click();
    await canvas.drawStroke([
      { x: 200, y: 200 },
      { x: 350, y: 350 },
    ]);

    // 3. Intercept PDF export
    const download = await exportDriver.interceptDownload(async () => {
      await toolbar.triggerExport("PDF");
    });

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    // Validate PDF header and size
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);

    // 4. Validate MediaBox strictly matches A4 Portrait dimensions: width ~595pt, height ~842pt
    const boxes = parsePdfMediaBoxes(buffer);
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    const page1Box = boxes[0];
    expect(page1Box.isPortrait).toBe(true);
    expect(page1Box.width).toBeGreaterThanOrEqual(590);
    expect(page1Box.width).toBeLessThanOrEqual(600);
    expect(page1Box.height).toBeGreaterThanOrEqual(835);
    expect(page1Box.height).toBeLessThanOrEqual(850);
  });

  test("TC-14-02: A4 Landscape mode exports true Landscape PDF (842 x 595 pt)", async ({
    page,
  }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    // 1. Switch board format to a4_landscape
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("a4_landscape");
    });

    // 2. Draw an ink stroke
    await page.locator('button[data-tool="ink"]').first().click();
    await canvas.drawStroke([
      { x: 250, y: 200 },
      { x: 450, y: 250 },
    ]);

    // 3. Intercept PDF export
    const download = await exportDriver.interceptDownload(async () => {
      await toolbar.triggerExport("PDF");
    });

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    // Validate PDF header
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");

    // 4. Validate MediaBox strictly matches A4 Landscape dimensions: width ~842pt, height ~595pt
    const boxes = parsePdfMediaBoxes(buffer);
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    const page1Box = boxes[0];
    expect(page1Box.isPortrait).toBe(false);
    expect(page1Box.width).toBeGreaterThanOrEqual(835);
    expect(page1Box.width).toBeLessThanOrEqual(850);
    expect(page1Box.height).toBeGreaterThanOrEqual(590);
    expect(page1Box.height).toBeLessThanOrEqual(600);
  });

  test("TC-14-03: Multi-page PDF Export preserves pages and orientation", async ({
    page,
  }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    // 1. Set to A4 Portrait
    await page.evaluate(() => {
      const setFmt = (window as unknown as { __testSetBoardFormat?: (f: string) => void }).__testSetBoardFormat;
      if (setFmt) setFmt("a4_portrait");
    });

    // 2. Add page 2
    await page.locator('button:has-text("+ Thêm trang"), button[data-action="add-page"]').first().click();

    // 3. Draw on current page
    await page.locator('button[data-tool="ink"]').first().click();
    await canvas.drawStroke([
      { x: 200, y: 300 },
      { x: 300, y: 400 },
    ]);

    // 4. Open Export PDF modal, choose "Tất cả các trang"
    await toolbar.openMoreMenu();
    const exportTab = page.locator('button:has-text("Xuất file")').first();
    if (await exportTab.isVisible()) await exportTab.click();
    await page.locator('[data-action="export-pdf"]').first().click();

    // Wait for ExportPdfModal
    const modal = page.locator('div:has-text("Xuất tài liệu PDF")').first();
    await modal.waitFor({ state: "visible" });

    // Select "Tất cả các trang"
    await page.locator('label:has-text("Tất cả các trang") input[type="radio"]').click();

    // Intercept download from confirm button
    const download = await exportDriver.interceptDownload(async () => {
      await page.locator('button[data-action="confirm-export-pdf"]').click();
    });

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    // Validate PDF has 2 portrait pages
    const boxes = parsePdfMediaBoxes(buffer);
    expect(boxes.length).toBe(2);
    for (const box of boxes) {
      expect(box.isPortrait).toBe(true);
      expect(box.width).toBeGreaterThanOrEqual(590);
      expect(box.width).toBeLessThanOrEqual(600);
      expect(box.height).toBeGreaterThanOrEqual(835);
      expect(box.height).toBeLessThanOrEqual(850);
    }
  });

  test("TC-14-04: PDF Export with inserted PDF page retains high quality and portrait layout", async ({
    page,
  }) => {
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    // 1. Insert a portrait PDF page
    await page.evaluate(
      ({ src }) => {
        const insertFn = (
          window as unknown as {
            __testInsertPdfPages?: (pages: unknown[]) => void;
          }
        ).__testInsertPdfPages;
        if (!insertFn) throw new Error("__testInsertPdfPages not found");
        insertFn([
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

    // 2. Intercept download
    const download = await exportDriver.interceptDownload(async () => {
      await toolbar.triggerExport("PDF");
    });

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    // Validate PDF
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    const boxes = parsePdfMediaBoxes(buffer);
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    expect(boxes[0].isPortrait).toBe(true);
  });
});
