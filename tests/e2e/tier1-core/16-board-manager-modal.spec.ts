import { test, expect } from '@playwright/test';

test.describe('Board & Folder Manager (Samsung Notes style)', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-bmanager-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('can open BoardManagerModal from sidebar button, create folder and new board', async ({ page }) => {
    // Open sidebar if collapsed
    const collapsedBtn = page.locator('aside[data-wb-page-sidebar-collapsed="true"] button[data-action="open-board-manager"]');
    if (await collapsedBtn.isVisible().catch(() => false)) {
      await collapsedBtn.click();
    } else {
      const openBtn = page.locator('button[data-action="open-board-manager"]').first();
      await expect(openBtn).toBeVisible();
      await openBtn.click();
    }

    // Modal should be visible
    const modal = page.locator('[data-testid="board-manager-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('button:has-text("Tất cả bảng")')).toBeVisible();
    await expect(modal.locator('button:has-text("Thùng rác")')).toBeVisible();
    await expect(modal.locator('text=Thư mục').first()).toBeVisible();

    // Verify "Tạo bảng mới" button is visible inside modal
    const newBoardBtn = modal.locator('button:has-text("Tạo bảng mới")').first();
    await expect(newBoardBtn).toBeVisible();

    // Verify "Chèn PDF" button is visible inside modal
    const importPdfBtn = modal.locator('button:has-text("Chèn PDF")');
    await expect(importPdfBtn).toBeVisible();

    // Close modal via close button
    const closeBtn = modal.locator('button[title*="Quay lại bảng vẽ"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
