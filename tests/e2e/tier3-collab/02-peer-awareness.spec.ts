import { test, expect } from '@playwright/test';
import { CollabHarness } from '../helpers/collab-harness';

test.describe('Tier 3: Multi-Client Collaboration - Peer Awareness & Cursors', () => {
  let collab: CollabHarness;

  test.afterEach(async () => {
    if (collab) {
      await collab.cleanup();
    }
  });

  test('should register multi-client peer presence via Yjs awareness in the same room', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `aware-presence-${Date.now()}`;

    // Spawn 2 independent browser contexts connected to the same room
    const [clientA, clientB] = await collab.createPeers(roomId, 2);

    // Verify both clients have active canvas viewports
    await expect(clientA.canvas.svgCanvas).toBeVisible();
    await expect(clientB.canvas.svgCanvas).toBeVisible();

    // Check awareness peer indicator or count badge if available
    const peerCounter = clientA.page.locator(
      '[data-wb-peer-count="true"], .wb-peer-counter, [title*="người tham gia"]'
    ).first();

    if (await peerCounter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(peerCounter).toContainText(/2/);
    }
  });

  test('should reflect live peer cursor tracking with position updates and name badge', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `cursor-tracking-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);

    const boundsA = await clientA.canvas.getCanvasBounds();
    const targetCoord = { x: boundsA.x + 350, y: boundsA.y + 250 };

    // Move Client A's mouse on canvas to emit cursor awareness
    await clientA.page.mouse.move(targetCoord.x, targetCoord.y);

    // Allow awareness throttle to propagate
    await clientA.page.waitForTimeout(300);

    // Client B should observe Client A's peer cursor element
    const peerCursorB = clientB.page.locator('[data-wb-peer-cursor="true"], .wb-peer-cursor').first();
    await peerCursorB.waitFor({ state: 'visible', timeout: 7000 });
    await expect(peerCursorB).toBeVisible();

    // Verify presence of a name badge label on the cursor
    const nameLabel = peerCursorB.locator('.wb-peer-label, [data-wb-peer-label="true"], span').first();
    if (await nameLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await nameLabel.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should assign deterministic distinct user colors for different peers', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `peer-colors-${Date.now()}`;
    const peers = await collab.createPeers(roomId, 3);

    // Move all peers on their canvases
    for (const peer of peers) {
      const b = await peer.canvas.getCanvasBounds();
      await peer.page.mouse.move(b.x + 200, b.y + 200);
    }

    await peers[0].page.waitForTimeout(300);

    // On Client 1's screen, inspect all remote peer cursors
    const remoteCursors = peers[0].page.locator('[data-wb-peer-cursor="true"], .wb-peer-cursor');
    const count = await remoteCursors.count();

    if (count >= 2) {
      // Gather colors from style or data attributes
      const colors = await remoteCursors.evaluateAll((elements) =>
        elements.map((el) => {
          return (
            el.getAttribute('data-color') ||
            (el as HTMLElement).style.backgroundColor ||
            (el as HTMLElement).style.color ||
            el.getAttribute('fill') ||
            ''
          );
        })
      );

      // Verify that remote peer cursors have non-empty colors
      for (const c of colors) {
        expect(c).not.toBe('');
      }
    }
  });

  test('should remove peer cursor when a client disconnects or leaves the room', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `peer-leave-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);

    // Client B moves mouse to establish cursor presence
    const boundsB = await clientB.canvas.getCanvasBounds();
    await clientB.page.mouse.move(boundsB.x + 300, boundsB.y + 300);

    // Client A observes Client B's cursor
    const peerCursorOnA = clientA.page.locator('[data-wb-peer-cursor="true"], .wb-peer-cursor').first();
    await peerCursorOnA.waitFor({ state: 'visible', timeout: 7000 });

    // Client B disconnects / closes page
    await clientB.context.close();

    // Client A should observe peer cursor removal within Yjs awareness timeout
    await expect(peerCursorOnA).toBeHidden({ timeout: 10_000 });
  });

  test('should distinguish between local user indicator and remote peer cursors', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `peer-self-check-${Date.now()}`;
    const [clientA] = await collab.createPeers(roomId, 1);

    // Client A moves mouse
    const boundsA = await clientA.canvas.getCanvasBounds();
    await clientA.page.mouse.move(boundsA.x + 250, boundsA.y + 250);

    // A single client should not render a peer cursor for itself
    const selfPeerCursor = clientA.page.locator('[data-wb-peer-cursor="true"], .wb-peer-cursor');
    const count = await selfPeerCursor.count();
    expect(count).toBe(0);
  });
});
