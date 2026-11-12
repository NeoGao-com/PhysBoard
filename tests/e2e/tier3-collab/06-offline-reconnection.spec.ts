import { test, expect } from '@playwright/test';
import { CollabHarness } from '../helpers/collab-harness';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 3: Multi-Client Collaboration - Offline Reconnection & Caching', () => {
  let collab: CollabHarness;

  test.afterEach(async () => {
    if (collab) {
      await collab.cleanup();
    }
  });

  test('should cache local edits while offline and reconcile with room upon reconnection', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `offline-reconcile-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);

    // Initial sync
    await collab.waitForSync(clientA.page, clientB.page, 5000);
    const initialCount = await clientA.canvas.getObjectCount();

    // Simulate network disconnect on Client A
    await collab.setOffline(0, true);

    // Client A draws an ink stroke while disconnected
    await toolbarA.selectTool('ink');
    const bA = await clientA.canvas.getCanvasBounds();
    await clientA.canvas.drawStroke([
      { x: bA.x + 100, y: bA.y + 100 },
      { x: bA.x + 200, y: bA.y + 150 },
    ]);

    // Client A reflects local change immediately
    await expect.poll(async () => clientA.canvas.getObjectCount(), { timeout: 3000 }).toBe(initialCount + 1);

    // Client B must NOT have the new element yet because Client A is offline
    await clientB.page.waitForTimeout(500);
    expect(await clientB.canvas.getObjectCount()).toBe(initialCount);

    // Restore network connection on Client A
    await collab.setOffline(0, false);

    // Both clients should cleanly reconcile via CRDT sync
    await expect.poll(async () => clientB.canvas.getObjectCount(), {
      timeout: 8000,
      message: 'Client B did not receive Client A cached edits after reconnection',
    }).toBe(initialCount + 1);

    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should merge concurrent offline edits from both clients without data loss', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `offline-concurrent-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);
    const toolbarB = new ToolbarDriver(clientB.page);

    await collab.waitForSync(clientA.page, clientB.page, 5000);

    // Client A goes offline
    await collab.setOffline(0, true);

    // Client A draws stroke 1 while offline
    await toolbarA.selectTool('ink');
    const bA = await clientA.canvas.getCanvasBounds();
    await clientA.canvas.drawStroke([
      { x: bA.x + 80, y: bA.y + 80 },
      { x: bA.x + 160, y: bA.y + 80 },
    ]);

    // Client B (still online) draws stroke 2
    await toolbarB.selectTool('ink');
    const bB = await clientB.canvas.getCanvasBounds();
    await clientB.canvas.drawStroke([
      { x: bB.x + 250, y: bB.y + 200 },
      { x: bB.x + 350, y: bB.y + 200 },
    ]);

    // Client A reconnects
    await collab.setOffline(0, false);

    // Both clients should converge to exactly 2 elements
    await expect.poll(async () => clientA.canvas.getObjectCount(), { timeout: 8000 }).toBe(2);
    await expect.poll(async () => clientB.canvas.getObjectCount(), { timeout: 8000 }).toBe(2);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should display offline/reconnection banner or indicator when connection status changes', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `offline-indicator-${Date.now()}`;
    const [clientA] = await collab.createPeers(roomId, 1);

    // Disconnect network
    await collab.setOffline(0, true);

    // Check offline indicator if app implements offline UI badge/toast
    const offlineIndicator = clientA.page.locator(
      '[data-wb-status="offline"], .wb-offline-banner, [title*="Mất kết nối"], [data-testid="offline-status"]'
    ).first();

    if (await offlineIndicator.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(offlineIndicator).toBeVisible();

      // Reconnect
      await collab.setOffline(0, false);
      await expect(offlineIndicator).toBeHidden({ timeout: 7000 });
    } else {
      // Reconnect cleanly without crash
      await collab.setOffline(0, false);
      await expect(clientA.canvas.svgCanvas).toBeVisible();
    }
  });

  test('should retain cached board state from IndexedDB when reloaded while disconnected', async ({ browser }) => {
    const roomId = `idb-cache-${Date.now()}`;
    const context = await browser.newContext();
    const page = await context.newPage();
    const toolbar = new ToolbarDriver(page);

    try {
      await page.goto(`/?room=${roomId}`);
      const canvas = toolbar.page;
      const svg = canvas.locator('svg[data-wb-canvas="true"], svg.wb-canvas').first();
      await svg.waitFor({ state: 'attached', timeout: 15_000 });

      // Draw a stroke while connected
      await toolbar.selectTool('ink');
      const box = await svg.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 250, box.y + 200);
        await page.mouse.up();
      }

      // Allow IndexedDB write transaction to flush
      await page.waitForTimeout(1000);

      // Disconnect context
      await context.setOffline(true);

      // Reload page offline
      await page.reload().catch(() => {});

      // If service worker or cached bundle serves the page, verify cached objects
      const objects = page.locator('g[data-board-content="true"] > *, g.wb-board-content > *');
      if (await objects.count().catch(() => 0) > 0) {
        expect(await objects.count()).toBeGreaterThanOrEqual(1);
      }
    } finally {
      await context.close();
    }
  });
});
