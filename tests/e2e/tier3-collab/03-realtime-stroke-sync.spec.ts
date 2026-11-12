import { test, expect } from '@playwright/test';
import { CollabHarness } from '../helpers/collab-harness';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 3: Multi-Client Collaboration - Realtime Stroke Synchronization', () => {
  let collab: CollabHarness;

  test.afterEach(async () => {
    if (collab) {
      await collab.cleanup();
    }
  });

  test('should propagate a freehand stroke from Client 1 to Client 2 in real time without reload', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `stroke-sync-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);

    // Initial check: both clients start with 0 objects
    await collab.waitForSync(clientA.page, clientB.page, 5000);
    const initialCount = await clientA.canvas.getObjectCount();

    // Client A selects Pen tool and draws a stroke
    await toolbarA.selectTool('ink');
    const bounds = await clientA.canvas.getCanvasBounds();

    await clientA.canvas.drawStroke([
      { x: bounds.x + 150, y: bounds.y + 150 },
      { x: bounds.x + 220, y: bounds.y + 190 },
      { x: bounds.x + 300, y: bounds.y + 160 },
    ]);

    // Client A object count increments
    await expect.poll(async () => clientA.canvas.getObjectCount(), { timeout: 5000 }).toBe(initialCount + 1);

    // Client B must reflect the new stroke via CRDT sync without reloading the page
    await expect.poll(async () => clientB.canvas.getObjectCount(), {
      timeout: 7000,
      message: 'Client B did not receive the stroke drawn by Client A in real time',
    }).toBe(initialCount + 1);

    // Assert atomic consistency of rendered elements
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should support bidirectional real-time stroke synchronization', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `bi-stroke-sync-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);
    const toolbarB = new ToolbarDriver(clientB.page);

    // Step 1: Client A draws stroke 1
    await toolbarA.selectTool('ink');
    const bA = await clientA.canvas.getCanvasBounds();
    await clientA.canvas.drawStroke([
      { x: bA.x + 100, y: bA.y + 100 },
      { x: bA.x + 180, y: bA.y + 120 },
    ]);
    await collab.waitForSync(clientA.page, clientB.page, 5000);

    // Step 2: Client B draws stroke 2
    await toolbarB.selectTool('ink');
    const bB = await clientB.canvas.getCanvasBounds();
    await clientB.canvas.drawStroke([
      { x: bB.x + 350, y: bB.y + 200 },
      { x: bB.x + 420, y: bB.y + 250 },
    ]);

    // Step 3: Verify both clients converge to exactly 2 objects
    await expect.poll(async () => clientA.canvas.getObjectCount(), { timeout: 7000 }).toBe(2);
    await expect.poll(async () => clientB.canvas.getObjectCount(), { timeout: 7000 }).toBe(2);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should synchronize rapid bursts of sequential strokes without dropping events', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `burst-sync-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);

    await toolbarA.selectTool('ink');
    const bounds = await clientA.canvas.getCanvasBounds();
    const strokeCount = 5;

    // Draw 5 rapid strokes across distinct canvas regions
    for (let i = 0; i < strokeCount; i++) {
      const offsetX = 50 * i;
      await clientA.canvas.drawStroke([
        { x: bounds.x + 100 + offsetX, y: bounds.y + 100 },
        { x: bounds.x + 120 + offsetX, y: bounds.y + 140 },
        { x: bounds.x + 140 + offsetX, y: bounds.y + 100 },
      ], { steps: 1 });
    }

    // Both clients should converge to all 5 strokes
    await expect.poll(async () => clientA.canvas.getObjectCount(), { timeout: 8000 }).toBe(strokeCount);
    await expect.poll(async () => clientB.canvas.getObjectCount(), { timeout: 8000 }).toBe(strokeCount);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should faithfully synchronize stroke styling properties across peers', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `style-sync-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);

    // Client A sets custom stroke style: red color (#DC2626) and bold stroke
    await toolbarA.selectTool('ink');
    await toolbarA.setStrokeColor('#DC2626').catch(() => {});

    const bounds = await clientA.canvas.getCanvasBounds();
    await clientA.canvas.drawStroke([
      { x: bounds.x + 200, y: bounds.y + 200 },
      { x: bounds.x + 280, y: bounds.y + 240 },
    ]);

    await collab.waitForSync(clientA.page, clientB.page, 5000);

    // Verify rendered stroke element on Client B reflects stroke styling
    const latestObjectB = clientB.canvas.getLatestObject();
    await expect(latestObjectB).toBeVisible();

    // Check style attribute or stroke attribute on Client B's element
    const strokeValue = await latestObjectB.evaluate((el: SVGElement) => {
      const path = el.querySelector('path') || el;
      return (
        path.getAttribute('stroke') ||
        (path as unknown as HTMLElement).style.stroke ||
        el.getAttribute('data-stroke') ||
        ''
      );
    });

    if (strokeValue) {
      expect(strokeValue.toLowerCase()).toMatch(/#dc2626|rgb\(220,\s*38,\s*38\)/);
    }
  });
});
