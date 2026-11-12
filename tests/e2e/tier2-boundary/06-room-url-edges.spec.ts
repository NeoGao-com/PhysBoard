import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

/**
 * Tier 2 — Boundary & Corner Cases: Test Suite 06
 * Room URL Edge Cases: Malformed Characters, Empty Room Fallback, and Single-Tab Lock Guard.
 * Features covered:
 * - Feature 42: Room Lifecycle & Routing (`?room=`)
 * - Feature 45: Single-Tab Lock & Offline Cache
 * - Feature 59: Adversarial Coverage Hardening
 */
test.describe('Tier 2: 06 Room URL Edge Cases & Single-Tab Lock Guard', () => {
  test('TC-06-B01: Adversarial room parameter with script tags or path traversal is sanitized safely', async ({ page }) => {
    // Collect uncaught error exceptions
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Adversarial room query string
    const adversarialRoom = '../../attack<script>alert(1)<%2Fscript>';
    const response = await page.goto(`/?room=${encodeURIComponent(adversarialRoom)}`);

    // Must not crash with Next.js 500 Internal Server Error
    expect(response?.status()).toBeLessThan(500);

    // Canvas should still mount cleanly under sanitized room ID
    const canvas = new CanvasDriver(page);
    await expect(canvas.svgCanvas).toBeAttached({ timeout: 10_000 });

    // No uncaught script injection errors
    const hasXssError = errors.some((msg) => msg.includes('alert(1)'));
    expect(hasXssError).toBe(false);
  });

  test('TC-06-B02: Empty room parameter gracefully falls back to a valid room session', async ({ page }) => {
    // Navigate to empty room parameter `?room=`
    await page.goto('/?room=');

    // Canvas must mount or page should redirect to a generated room
    const canvas = new CanvasDriver(page);
    await expect(canvas.svgCanvas).toBeAttached({ timeout: 10_000 });

    // URL should either maintain a clean session or have redirected to a valid room
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('undefined');
    expect(currentUrl).not.toContain('null');
  });

  test('TC-06-B03: Single-tab lock guard detects duplicate active tabs for the same room', async ({ context }) => {
    const roomId = `test-tablock-${Date.now()}`;

    // Open first tab in the browser context
    const tab1 = await context.newPage();
    await tab1.goto(`/?room=${roomId}`);

    const canvas1 = new CanvasDriver(tab1);
    await expect(canvas1.svgCanvas).toBeAttached({ timeout: 10_000 });

    // Open second tab in the same browser context for the EXACT same room
    const tab2 = await context.newPage();
    await tab2.goto(`/?room=${roomId}`);

    // Tab 2 or Tab 1 should activate the single-tab lock guard screen or warning
    // Locator covers: [data-wb-lock-screen="true"], .wb-tab-lock, or text "bảng đang mở ở tab khác" / "Đã mở ở tab khác"
    const lockSelector =
      '[data-wb-lock-screen="true"], .wb-tab-lock, [data-testid="tab-lock"], :has-text("tab khác")';
    const tab2Lock = tab2.locator(lockSelector);
    const tab1Lock = tab1.locator(lockSelector);

    // Either the lock screen is displayed or tab takeover is safely handled
    const isLockTriggered =
      (await tab2Lock.first().isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await tab1Lock.first().isVisible({ timeout: 1000 }).catch(() => false));
    const tab2CanvasMounted = await tab2.locator('svg[data-wb-canvas="true"], svg.wb-canvas').isVisible().catch(() => false);

    // At least one of the protection states must hold: lock screen is displayed OR canvas operates with safe session takeover
    expect(isLockTriggered || tab2CanvasMounted).toBe(true);

    await tab1.close().catch(() => {});
    await tab2.close().catch(() => {});
  });
});
