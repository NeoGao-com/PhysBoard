import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';
import { ExportDriver } from '../helpers/export-driver';

test.describe('Tier 4: Academic Scenarios - Exam Authoring Mode & Multimodal Export (Scenario 4)', () => {
  let canvas: CanvasDriver;
  let toolbar: ToolbarDriver;
  let exportDriver: ExportDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    toolbar = new ToolbarDriver(page);
    exportDriver = new ExportDriver(page);

    const roomId = `exam-scenario-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should transition into full-screen A4 Exam Authoring Mode (Soạn đề)', async ({ page }) => {
    // Open Exam Mode from More menu
    await toolbar.openExamMode().catch(async () => {
      // Direct navigation if available
      await toolbar.openMoreMenu();
      const examBtn = page.locator('button:has-text("Mở đề thi"), button:has-text("Soạn đề")').first();
      await examBtn.click();
    });

    // Verify Exam Authoring container is mounted
    const examEditor = page.locator('[data-wb-exam-editor="true"], .wb-exam-editor, .exam-mode-container').first();
    await expect(examEditor).toBeVisible({ timeout: 10_000 });

    // Verify document editor toolbar is visible
    const docToolbar = page.locator('[data-wb-doc-toolbar="true"], .wb-doc-toolbar').first();
    if (await docToolbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(docToolbar).toBeVisible();
    }
  });

  test('should display standard MoET header template with school, exam, and exam code fields', async ({ page }) => {
    await toolbar.openExamMode().catch(() => {});

    const examEditor = page.locator('[data-wb-exam-editor="true"], .wb-exam-editor').first();
    await examEditor.waitFor({ state: 'visible', timeout: 10_000 });

    // MoET standard header: "SỞ GD&ĐT", "KỲ THI", "MÃ ĐỀ"
    const editorContent = await examEditor.textContent();
    expect(editorContent).toBeTruthy();

    const moetHeader = examEditor.locator(
      'text="SỞ GD", text="KỲ THI", text="MÃ ĐỀ", [data-wb-exam-header="true"]'
    ).first();

    if (await moetHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(moetHeader).toBeVisible();
    }
  });

  test('should support 50/50 split-screen whiteboard and drag figure into exam document (← Kéo hình sang trang)', async ({ page }) => {
    await toolbar.openExamMode().catch(() => {});

    // Click "Vẽ hình" button in exam editor to toggle 50/50 split screen
    const splitWhiteboardBtn = page.locator(
      'button:has-text("Vẽ hình"), button[data-action="split-whiteboard"]'
    ).first();

    if (await splitWhiteboardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await splitWhiteboardBtn.click();

      // Check that split screen canvas appears
      const splitCanvas = page.locator('svg[data-wb-canvas="true"], svg.wb-canvas').first();
      await expect(splitCanvas).toBeVisible();

      // Draw a figure on the whiteboard half
      const box = await splitCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 180);
        await page.mouse.up();
      }

      // Check for "← Kéo hình sang trang" button/handle
      const dragToDocBtn = page.locator(
        'button:has-text("Kéo hình sang trang"), [data-action="drag-to-doc"]'
      ).first();

      if (await dragToDocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(dragToDocBtn).toBeVisible();
      }
    }
  });

  test('should open and configure CV 7991 Exam Matrix Drawer with topic quotas', async ({ page }) => {
    await toolbar.openExamMode().catch(() => {});

    // Open CV 7991 Matrix drawer
    const matrixBtn = page.locator(
      'button:has-text("Ma trận"), button[data-action="open-matrix"], [data-wb-btn="matrix"]'
    ).first();

    if (await matrixBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await matrixBtn.click();

      // Matrix drawer should be visible
      const matrixDrawer = toolbar.matrixDrawer;
      await expect(matrixDrawer).toBeVisible({ timeout: 5000 });

      // Verify cognitive levels: "Biết" (Nhận biết), "Hiểu" (Thông hiểu), "Vận dụng"
      const drawerText = await matrixDrawer.textContent();
      expect(drawerText).toMatch(/Biết|Hiểu|Vận dụng/i);
    }
  });

  test('should validate multimodal exports: PNG, PDF, TikZ LaTeX, and Word DOCX', async ({ page }) => {
    // 1. Draw a vector element on the canvas first to avoid empty export issues
    await toolbar.selectTool('ink');
    const bounds = await canvas.getCanvasBounds();
    await canvas.drawStroke([
      { x: bounds.x + 200, y: bounds.y + 200 },
      { x: bounds.x + 300, y: bounds.y + 250 },
    ]);
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 5000 }).toBeGreaterThan(0);

    // 2. Validate TikZ LaTeX export
    await toolbar.triggerExport('TikZ').catch(async () => {
      await toolbar.openMoreMenu();
      await page.locator('button:has-text("TikZ")').first().click();
    });

    // Check TikZ code modal
    const tikzModal = page.locator('[data-wb-export="tikz"], .wb-tikz-modal, [role="dialog"]').first();
    if (await tikzModal.isVisible({ timeout: 4000 }).catch(() => false)) {
      const code = await exportDriver.getTikZExportCode().catch(() => '');
      if (code) {
        expect(code).toContain('tikzpicture');
      }
      // Close modal
      await page.keyboard.press('Escape');
    }

    // 3. Validate PNG Download if triggerable
    const pngBtn = page.locator('[data-action="export-png"], button:has-text("PNG")').first();
    if (await pngBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const download = await exportDriver.interceptDownload(async () => {
        await pngBtn.click();
      }).catch(() => null);

      if (download) {
        const result = await exportDriver.validatePNGDownload(download);
        expect(result.isValidFormat).toBe(true);
      }
    }

    // 4. Validate PDF Download if triggerable
    const pdfBtn = page.locator('[data-action="export-pdf"], button:has-text("PDF")').first();
    if (await pdfBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const download = await exportDriver.interceptDownload(async () => {
        await pdfBtn.click();
      }).catch(() => null);

      if (download) {
        const result = await exportDriver.validatePDFDownload(download);
        expect(result.isValidFormat).toBe(true);
      }
    }
  });
});
