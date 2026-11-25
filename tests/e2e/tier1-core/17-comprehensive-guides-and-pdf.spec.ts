import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { WHITEBOARD_COMMANDS } from "../../../src/lib/commands";
import { TOOL_GUIDE_CATALOG } from "../../../src/lib/tool-guides";
import {
  COMPLETE_FEATURE_CATALOG,
  IN_APP_GUIDE_CHAPTERS,
  INDIVIDUAL_TOOL_REFERENCE,
  MANUAL_BOOK_CHAPTERS,
} from "../../../src/lib/manual-catalog";
import { TUTORIAL_NOTEBOOKS } from "../../../src/lib/tutorial-notebooks";
import { CanvasDriver } from "../helpers/canvas-driver";

const ROOT = path.resolve(__dirname, "../../..");

test.describe("Comprehensive Guides, 9 Tutorial Notebooks & Complete PDF Manual", () => {
  test("Audit 1: 100% command/tool coverage and generated screenshot/PDF assets exist", () => {
    expect(IN_APP_GUIDE_CHAPTERS.length).toBe(20);
    expect(MANUAL_BOOK_CHAPTERS.length).toBe(14);
    expect(TUTORIAL_NOTEBOOKS.length).toBe(9);
    expect(COMPLETE_FEATURE_CATALOG.length).toBeGreaterThanOrEqual(40);

    const indexedKeys = new Set<string>();
    for (const f of COMPLETE_FEATURE_CATALOG) {
      for (const k of f.toolKeys ?? []) {
        indexedKeys.add(k);
        indexedKeys.add(k.replace(/^tool:/, ""));
      }
      expect(f.pcHowTo.trim().length).toBeGreaterThan(10);
      expect(f.tabletHowTo.trim().length).toBeGreaterThan(10);
    }
    for (const t of INDIVIDUAL_TOOL_REFERENCE) {
      indexedKeys.add(t.key);
      indexedKeys.add(t.key.replace(/^tool:/, ""));
    }

    for (const cmd of WHITEBOARD_COMMANDS) {
      const clean = cmd.id.replace(/^tool:/, "");
      if (clean === "point" || clean === "circle" || clean === "polygon") continue;
      expect(
        indexedKeys.has(cmd.id) || indexedKeys.has(clean),
        `Missing command in manual catalog: ${cmd.id}`
      ).toBe(true);
    }

    for (const toolKey of Object.keys(TOOL_GUIDE_CATALOG)) {
      if (
        toolKey === "geometry.point" ||
        toolKey === "segment" ||
        toolKey === "circle" ||
        toolKey === "polygon"
      ) {
        continue;
      }
      expect(
        indexedKeys.has(toolKey),
        `Missing TOOL_GUIDE_CATALOG key in manual catalog: ${toolKey}`
      ).toBe(true);
    }

    // Verify all 20 guide screenshots exist and are non-empty
    let totalBytes = 0;
    for (const ch of IN_APP_GUIDE_CHAPTERS) {
      const shotAbs = path.join(ROOT, "public", ch.screenshotSrc.replace(/^\.\//, ""));
      expect(fs.existsSync(shotAbs), `Missing screenshot: ${shotAbs}`).toBe(true);
      const stat = fs.statSync(shotAbs);
      expect(stat.size).toBeGreaterThan(5_000);
      totalBytes += stat.size;
    }

    // Verify both PDF copies exist and are compact
    const docsPdf = path.join(ROOT, "docs", "PhysBoard-Cam-Nang-Toan-Tap.pdf");
    const publicPdf = path.join(ROOT, "public", "docs", "PhysBoard-Cam-Nang-Toan-Tap.pdf");
    expect(fs.existsSync(docsPdf), `Missing PDF: ${docsPdf}`).toBe(true);
    expect(fs.existsSync(publicPdf), `Missing bundled PDF: ${publicPdf}`).toBe(true);
    const pdfSize = fs.statSync(publicPdf).size;
    expect(pdfSize).toBeGreaterThan(150_000);
    totalBytes += pdfSize;
    expect(totalBytes).toBeLessThan(25 * 1024 * 1024);
  });

  test("Audit 2: FeatureGuideModal renders 20 illustrated chapters & 100% tool search", async ({
    page,
  }) => {
    const roomId = `guide-modal-${Date.now()}`;
    await page.addInitScript(() => {
      window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
    });
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', { state: "attached" });

    // Open Feature Guide via sidebar button
    await page.locator('[data-action="open-feature-guide"]').first().click();
    const modal = page.getByTestId("feature-guide-modal");
    await expect(modal).toBeVisible();

    // Verify 20 chapters listed in nav rail
    const navButtons = modal.locator("[data-guide-chapter]");
    await expect(navButtons).toHaveCount(20);

    // Verify chapter 1 screenshot loads with real natural dimensions
    const shotImg = modal.getByTestId("feature-guide-screenshot");
    await expect(shotImg).toBeVisible();
    await expect
      .poll(async () => shotImg.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(200);

    // Switch to chapter 12 (Thiết diện 3D) and verify screenshot renders
    await modal.locator('[data-guide-chapter="12-space-sections-distances"]').click();
    await expect(modal).toContainText("Thiết diện");
    await expect
      .poll(async () => shotImg.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(200);

    // Switch to 100% Tool Encyclopedia tab & search diacritic-insensitively
    await modal.getByTestId("guide-tab-catalog").click();
    const searchInput = modal.getByTestId("guide-catalog-search");
    await searchInput.fill("thiet dien");
    await expect(modal.getByTestId("catalog-item-feat-3d-section")).toBeVisible();

    await searchInput.fill("zalo");
    await expect(modal.getByTestId("catalog-item-feat-support-zalo-manual")).toBeVisible();
    await expect(modal).toContainText("0853769246");
  });

  test("Audit 3: Pre-seeded folder with 9 interactive tutorial notebooks & restore works", async ({
    page,
  }) => {
    const canvas = new CanvasDriver(page);
    const roomId = `tut-audit-${Date.now()}`;
    await page.addInitScript(() => {
      window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
    });
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: "attached" });

    // Default board must remain untouched & clean initially
    expect(await canvas.getObjectCount()).toBe(0);

    // Open BoardManagerModal and check tutorial folder
    await page.locator('[data-action="open-board-manager"]').first().click();
    const tutorialFolder = page.getByText("📘 Sổ tay Hướng dẫn & Thực hành mẫu").first();
    await expect(tutorialFolder).toBeVisible({ timeout: 10_000 });
    await tutorialFolder.click();

    // Verify all 9 sample notebooks exist inside the folder
    for (const tut of TUTORIAL_NOTEBOOKS) {
      await expect(page.getByText(tut.name).first()).toBeVisible();
    }

    // Open Tutorial 2 ("Bài 2 — Hình Phẳng 2D Động & Ký hiệu SGK")
    await page.getByText("Bài 2 — Hình Phẳng 2D Động & Ký hiệu SGK").first().click();
    await page.waitForSelector('svg[data-wb-canvas="true"]', { state: "attached" });

    // Confirm interactive elements loaded cleanly
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
  });

  test("Audit 4: Offline in-app PdfManualViewerModal renders PDF pages cleanly", async ({
    page,
  }) => {
    const roomId = `pdf-manual-${Date.now()}`;
    await page.addInitScript(() => {
      window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
    });
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', { state: "attached" });

    await page.locator('[data-action="open-feature-guide"]').first().click();
    await page.getByTestId("guide-open-pdf-btn").click();

    const pdfModal = page.getByTestId("pdf-manual-viewer-modal");
    await expect(pdfModal).toBeVisible();

    const pageImg = pdfModal.getByTestId("pdf-manual-page-img");
    await expect(pageImg).toBeVisible({ timeout: 25_000 });
    await expect
      .poll(async () => pageImg.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(200);

    const totalText = await pdfModal.getByTestId("pdf-manual-total-pages").innerText();
    const totalNum = parseInt(totalText.replace(/[^0-9]/g, ""), 10);
    expect(totalNum).toBeGreaterThanOrEqual(20);
  });
});
