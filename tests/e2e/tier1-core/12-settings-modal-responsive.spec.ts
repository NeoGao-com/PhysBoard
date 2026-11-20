import { test, expect } from '@playwright/test';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('SettingsModal Responsive Redesign (Desktop Master-Detail & Mobile Pill Tabs)', () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-settings-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', {
      state: 'attached',
      timeout: 10_000,
    });
  });

  test('Desktop layout: Renders elegant Master-Detail layout with Left Sidebar & clean Right Panel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Open Settings Modal via toolbar button
    const settingsBtn = page.locator('button[data-action="more"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const modal = page.locator('[data-testid="settings-modal"]');
    await expect(modal).toBeVisible();

    // Verify Master-Detail sidebar exists
    const sidebar = modal.locator('aside');
    await expect(sidebar).toBeVisible();

    // Verify sidebar contains all 7 main tabs
    const generalTab = sidebar.locator('button:has-text("Chung & Thao tác")');
    const modularTab = sidebar.locator('button:has-text("Bố cục Mô-đun (Lego)")');
    const boardTab = sidebar.locator('button:has-text("Khổ & Nền bảng")');
    const scaleTab = sidebar.locator('button:has-text("Tỉ lệ & Cỡ chữ")');
    const toolbarTab = sidebar.locator('button:has-text("Ẩn/Hiện Công cụ")');
    const laserTab = sidebar.locator('button:has-text("Bút Laser")');
    const exportTab = sidebar.locator('button:has-text("Xuất file & Đề thi")');

    await expect(generalTab).toBeVisible();
    await expect(modularTab).toBeVisible();
    await expect(boardTab).toBeVisible();
    await expect(scaleTab).toBeVisible();
    await expect(toolbarTab).toBeVisible();
    await expect(laserTab).toBeVisible();
    await expect(exportTab).toBeVisible();
    const updateTab = sidebar.locator('button:has-text("Cập nhật ứng dụng")');
    await expect(updateTab).toBeVisible();

    // Click "Khổ & Nền bảng" and verify board options appear
    await boardTab.click();
    const surfaceBtn = page.locator('[data-board-surface-option="greenboard"]');
    await expect(surfaceBtn).toBeVisible();

    // Take Desktop Screenshot
    await modal.screenshot({
      path: 'C:/Users/ugaoc/.gemini/antigravity/brain/3c2747e0-93da-4b25-bc05-93d8f4e8f73a/settings-desktop.png',
    });

    // Click "Tỉ lệ & Cỡ chữ" and verify label scale steppers appear
    await scaleTab.click();
    const labelDown = page.locator('[data-action="label-size-down"]');
    await expect(labelDown).toBeVisible();

    // Click "Xuất file & Đề thi" and verify export actions appear
    await exportTab.click();
    const pdfExport = page.locator('[data-action="export-pdf"]');
    await expect(pdfExport).toBeVisible();

    // Click "Cập nhật ứng dụng" and verify update controls appear
    await updateTab.click();
    const checkUpdateBtn = page.locator('button[data-action="check-update"]');
    await expect(checkUpdateBtn).toBeVisible();

    // Close via modal close button
    const closeBtn = modal.locator('button[aria-label="Đóng cài đặt"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Mobile layout: Adapts to phone screen with full height, horizontal pill tabs and touch buttons', async ({
    page,
  }) => {
    // Smartphone viewport (iPhone 14 / Android)
    await page.setViewportSize({ width: 390, height: 844 });

    // Open Settings Modal
    const settingsBtn = page.locator('button[data-action="more"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const modal = page.locator('[data-testid="settings-modal"]');
    await expect(modal).toBeVisible();

    // Sidebar should NOT be rendered in mobile view
    const sidebar = modal.locator('aside');
    await expect(sidebar).toHaveCount(0);

    // Pill tab navigation should be visible at the top
    const pillBar = modal.locator('.phys-settings-no-scrollbar');
    await expect(pillBar).toBeVisible();

    // Check pill tabs
    const boardPill = modal.locator('button:has-text("Khổ & Nền bảng")');
    await expect(boardPill).toBeVisible();
    await boardPill.click();

    // Verify board controls are rendered cleanly in single-column touch cards
    const a4Format = page.locator('[data-board-format-option="a4_portrait"]');
    await expect(a4Format).toBeVisible();

    // Take Mobile Screenshot
    await modal.screenshot({
      path: 'C:/Users/ugaoc/.gemini/antigravity/brain/3c2747e0-93da-4b25-bc05-93d8f4e8f73a/settings-mobile.png',
    });

    // Verify mobile footer contains "Mặc định" and "Hoàn tất"
    const defaultBtn = modal.locator('footer button:has-text("Mặc định")');
    const doneBtn = modal.locator('footer button:has-text("Hoàn tất")');
    await expect(defaultBtn).toBeVisible();
    await expect(doneBtn).toBeVisible();

    // Close via Done button
    await doneBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
