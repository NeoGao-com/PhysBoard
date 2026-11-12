import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';
import { ExportDriver } from '../helpers/export-driver';

/**
 * Tier 2 — Boundary & Corner Cases: Test Suite 02
 * Empty board export guard (PNG, PDF, TikZ).
 * Ensures zero-element boards export valid files without corrupt output or runtime crashes.
 * Features covered:
 * - Feature 56: Word / LaTeX / TikZ Export & Import
 * - Feature 59: Adversarial Coverage Hardening
 */
test.describe('Tier 2: 02 Empty Board Export Safeguards', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-empty-export-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('TC-02-B01: Exporting an empty canvas to PNG yields valid PNG file with magic header', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    // Confirm board is completely empty
    expect(await canvas.getObjectCount()).toBe(0);

    // Intercept download triggered from More menu -> PNG
    const download = await exportDriver.interceptDownload(async () => {
      await toolbar.triggerExport('PNG');
    });

    // Validate downloaded file is not corrupted and has 8-byte PNG header
    const result = await exportDriver.validatePNGDownload(download);
    expect(result.isValidFormat).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(50);
  });

  test('TC-02-B02: Exporting an empty canvas to PDF yields valid PDF document', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    expect(await canvas.getObjectCount()).toBe(0);

    // Intercept download triggered from More menu -> PDF
    const download = await exportDriver.interceptDownload(async () => {
      await toolbar.triggerExport('PDF');
    });

    // Validate downloaded file has valid %PDF- header
    const result = await exportDriver.validatePDFDownload(download);
    expect(result.isValidFormat).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(100);
  });

  test('TC-02-B03: TikZ export on empty canvas outputs valid empty tikzpicture environment', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const exportDriver = new ExportDriver(page);

    expect(await canvas.getObjectCount()).toBe(0);

    // Trigger TikZ export dialog
    await toolbar.triggerExport('TikZ');

    // Retrieve generated TikZ code
    const tikzCode = await exportDriver.getTikZExportCode();

    expect(tikzCode).toContain('\\begin{tikzpicture}');
    expect(tikzCode).toContain('\\end{tikzpicture}');
  });
});
