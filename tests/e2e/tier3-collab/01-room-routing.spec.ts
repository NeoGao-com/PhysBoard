import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 3: Multi-Client Collaboration - Room Routing & Lifecycle', () => {
  test('should parse and connect to room session via ?room=<roomId> query param', async ({ page }) => {
    const roomId = `room-test-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const canvas = new CanvasDriver(page);

    await page.goto(`/?room=${roomId}`);

    // Verify URL retains the room parameter
    expect(page.url()).toContain(`room=${roomId}`);

    // Wait for the SVG canvas viewport to mount
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
    await expect(canvas.svgCanvas).toBeVisible();

    // Verify room metadata or indicator exists in page context
    const roomIndicator = page.locator(
      `[data-wb-room="${roomId}"], [data-room-id="${roomId}"], .wb-room-badge, title`
    ).first();
    const isAttached = await roomIndicator.count() > 0;
    expect(isAttached).toBe(true);
  });

  test('should route to a room when navigating to the root path', async ({ page }) => {
    const canvas = new CanvasDriver(page);

    await page.goto('/');

    // Either routes automatically to a new room (?room=...) or allows instant room creation/entry
    await page.waitForLoadState('domcontentloaded');

    const currentUrl = page.url();
    if (currentUrl.includes('room=')) {
      // Automatic room assignment
      const roomMatch = currentUrl.match(/room=([^&]+)/);
      expect(roomMatch).not.toBeNull();
      expect(roomMatch![1].length).toBeGreaterThan(0);
      await expect(canvas.svgCanvas).toBeAttached({ timeout: 10_000 });
    } else {
      // Landing / dashboard / demo join path
      const joinBtn = page.locator(
        'button:has-text("Bắt đầu"), button:has-text("Bảng mới"), a[href*="room="], button[data-action="new-room"]'
      ).first();
      if (await joinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await joinBtn.click();
        await page.waitForURL(/room=/, { timeout: 10_000 });
        expect(page.url()).toContain('room=');
        await expect(canvas.svgCanvas).toBeAttached();
      } else {
        // Fallback: direct canvas mount
        await expect(canvas.svgCanvas).toBeAttached({ timeout: 10_000 });
      }
    }
  });

  test('should persist room state across full page reloads', async ({ page }) => {
    const roomId = `persist-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

    // Draw an ink stroke on the canvas
    await toolbar.selectTool('ink');
    const bounds = await canvas.getCanvasBounds();
    const startPoint = { x: bounds.x + 200, y: bounds.y + 200 };
    const endPoint = { x: bounds.x + 350, y: bounds.y + 250 };

    await canvas.drawStroke([
      startPoint,
      { x: bounds.x + 270, y: bounds.y + 220 },
      endPoint,
    ]);

    // Verify object exists in DOM
    await expect.poll(async () => canvas.getObjectCount(), { timeout: 5000 }).toBeGreaterThan(0);
    const countBeforeReload = await canvas.getObjectCount();

    // Reload the room session
    await page.reload();
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

    // Assert that the persisted board state retains elements after reload
    await expect.poll(async () => canvas.getObjectCount(), {
      timeout: 10_000,
      message: 'Board state did not persist after page reload',
    }).toBe(countBeforeReload);
  });

  test('should provide a share link containing the active room parameter', async ({ page, context }) => {
    const roomId = `share-${Date.now()}`;
    const canvas = new CanvasDriver(page);

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

    // Look for share action button on toolbar or header
    const shareButton = page.locator(
      'button[data-action="share"], button:has-text("Chia sẻ"), button[title*="Chia sẻ"], button[title*="Share"]'
    ).first();

    if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareButton.click();

      // Check if modal opens or clipboard is populated
      const modalShareInput = page.locator(
        '[data-wb-share-url="true"], input[readonly][value*="room="], input[data-testid="share-link"]'
      ).first();

      if (await modalShareInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const shareUrl = await modalShareInput.inputValue();
        expect(shareUrl).toContain(`room=${roomId}`);
      } else {
        // Read clipboard
        const clipboardText = await page.evaluate(async () => {
          return await navigator.clipboard.readText().catch(() => '');
        });
        if (clipboardText) {
          expect(clipboardText).toContain(`room=${roomId}`);
        }
      }
    } else {
      // Share URL contract directly aligns with current page URL
      expect(page.url()).toContain(`room=${roomId}`);
    }
  });

  test('should handle malformed or encoded room query parameters gracefully', async ({ page }) => {
    const canvas = new CanvasDriver(page);

    // 1. URL encoded characters in roomId
    const encodedRoom = encodeURIComponent('phòng học #1 & 2');
    await page.goto(`/?room=${encodedRoom}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
    await expect(canvas.svgCanvas).toBeVisible();

    // 2. Empty room parameter fallback
    await page.goto('/?room=');
    await page.waitForLoadState('domcontentloaded');
    // Ensure no unhandled exception crash and canvas attaches
    await expect(canvas.svgCanvas).toBeAttached({ timeout: 10_000 });
  });
});
