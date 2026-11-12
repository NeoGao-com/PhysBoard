import { Browser, BrowserContext, Page, expect } from '@playwright/test';
import { CanvasDriver } from './canvas-driver';

export interface PeerClient {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  canvas: CanvasDriver;
}

/**
 * Collaboration Test Harness for multi-client real-time synchronization.
 * Spawns isolated browser contexts, navigates them to a shared room,
 * and provides polling helpers for CRDT convergence and peer cursor verification.
 */
export class CollabHarness {
  private peers: PeerClient[] = [];

  constructor(public readonly browser: Browser) {}

  /**
   * Spawns N isolated browser contexts and navigates all of them to `/?room=${roomId}`
   */
  async createPeers(roomId: string, count = 2, baseURL = 'http://localhost:3000'): Promise<PeerClient[]> {
    const clients: PeerClient[] = [];

    for (let i = 0; i < count; i++) {
      const clientId = `peer-${i + 1}`;
      const clientName = `User_${i + 1}`;

      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
      });

      const page = await context.newPage();
      const canvas = new CanvasDriver(page);

      // Navigate to room session
      await page.goto(`${baseURL}/?room=${roomId}`);

      // Ensure canvas element is mounted
      await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
        state: 'attached',
        timeout: 10_000,
      });

      const peer: PeerClient = {
        id: clientId,
        name: clientName,
        context,
        page,
        canvas,
      };

      clients.push(peer);
      this.peers.push(peer);
    }

    return clients;
  }

  /**
   * Assert that a peer cursor for sourceClient appears on targetPage with deterministic presence
   */
  async assertPeerCursorVisible(
    targetPage: Page,
    options: { name?: string; color?: string; timeout?: number } = {}
  ) {
    const timeout = options.timeout ?? 5000;
    const cursorLocator = targetPage.locator('[data-wb-peer-cursor="true"], .wb-peer-cursor');

    await cursorLocator.first().waitFor({ state: 'visible', timeout });

    if (options.name) {
      await expect(cursorLocator.filter({ hasText: options.name }).first()).toBeVisible({ timeout });
    }

    if (options.color) {
      const cursorWithColor = targetPage.locator(
        `[data-wb-peer-cursor="true"][data-color="${options.color}"], .wb-peer-cursor[style*="${options.color}"]`
      );
      await expect(cursorWithColor.first()).toBeVisible({ timeout });
    }
  }

  /**
   * Poll until both pages have identical vector element counts in their board containers
   */
  async waitForSync(pageA: Page, pageB: Page, timeout = 5000): Promise<number> {
    let finalCount = -1;

    await expect.poll(async () => {
      const countA = await pageA.locator('g[data-board-content="true"] > *, g.wb-board-content > *').count();
      const countB = await pageB.locator('g[data-board-content="true"] > *, g.wb-board-content > *').count();

      if (countA === countB && countA >= 0) {
        finalCount = countA;
        return countA;
      }
      return -1;
    }, {
      timeout,
      intervals: [50, 100, 200],
      message: 'CRDT state failed to converge: element count mismatch between clients',
    }).toBeGreaterThanOrEqual(0);

    return finalCount;
  }

  /**
   * Verify CRDT element IDs across two client pages match exactly
   */
  async assertElementsMatch(pageA: Page, pageB: Page, timeout = 5000) {
    await this.waitForSync(pageA, pageB, timeout);

    const getElementIds = async (page: Page) => {
      return await page.locator('g[data-board-content="true"] > *, g.wb-board-content > *').evaluateAll((elements) =>
        elements.map((el) => el.getAttribute('data-id') || el.id || el.tagName.toLowerCase()).sort()
      );
    };

    await expect.poll(async () => {
      const idsA = await getElementIds(pageA);
      const idsB = await getElementIds(pageB);
      if (idsA.length === idsB.length && idsA.every((id, idx) => id === idsB[idx])) {
        return true;
      }
      return false;
    }, { timeout }).toBe(true);
  }

  /**
   * Simulate network disconnection for a peer context
   */
  async setOffline(peerIndex: number, offline: boolean) {
    if (peerIndex >= 0 && peerIndex < this.peers.length) {
      await this.peers[peerIndex].context.setOffline(offline);
    }
  }

  /**
   * Clean up and close all created browser contexts
   */
  async cleanup() {
    for (const peer of this.peers) {
      await peer.context.close().catch(() => {});
    }
    this.peers = [];
  }
}
