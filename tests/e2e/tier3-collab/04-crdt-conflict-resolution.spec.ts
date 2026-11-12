import { test, expect } from '@playwright/test';
import { CollabHarness } from '../helpers/collab-harness';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 3: Multi-Client Collaboration - CRDT Conflict Resolution', () => {
  let collab: CollabHarness;

  test.afterEach(async () => {
    if (collab) {
      await collab.cleanup();
    }
  });

  test('should resolve concurrent strokes drawn simultaneously without losing either element', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `crdt-simultaneous-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);
    const toolbarB = new ToolbarDriver(clientB.page);

    await toolbarA.selectTool('ink');
    await toolbarB.selectTool('ink');

    const bA = await clientA.canvas.getCanvasBounds();
    const bB = await clientB.canvas.getCanvasBounds();

    // Execute concurrent drawing actions at the exact same moment
    await Promise.all([
      clientA.canvas.drawStroke([
        { x: bA.x + 100, y: bA.y + 100 },
        { x: bA.x + 150, y: bA.y + 150 },
      ]),
      clientB.canvas.drawStroke([
        { x: bB.x + 300, y: bB.y + 100 },
        { x: bB.x + 350, y: bB.y + 150 },
      ]),
    ]);

    // CRDT state must converge deterministically with both elements preserved
    await collab.waitForSync(clientA.page, clientB.page, 7000);
    const countA = await clientA.canvas.getObjectCount();
    const countB = await clientB.canvas.getObjectCount();

    expect(countA).toBe(2);
    expect(countB).toBe(2);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should converge deterministically when Client 1 translates an element while Client 2 updates its style', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `crdt-transform-style-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);
    const toolbarB = new ToolbarDriver(clientB.page);

    // Initial state: Client A creates a stroke
    await toolbarA.selectTool('ink');
    const bA = await clientA.canvas.getCanvasBounds();
    const startPt = { x: bA.x + 200, y: bA.y + 200 };
    const endPt = { x: bA.x + 280, y: bA.y + 200 };
    await clientA.canvas.drawStroke([startPt, endPt]);

    await collab.waitForSync(clientA.page, clientB.page, 5000);
    expect(await clientB.canvas.getObjectCount()).toBe(1);

    // Select the element on both clients
    await toolbarA.selectTool('select');
    await clientA.canvas.clickAt({ x: bA.x + 240, y: bA.y + 200 });

    await toolbarB.selectTool('select');
    const bB = await clientB.canvas.getCanvasBounds();
    await clientB.canvas.clickAt({ x: bB.x + 240, y: bB.y + 200 });

    // Concurrent edit: Client A drags/moves the element while Client B alters stroke styling
    await Promise.all([
      // Client A moves element right by 60px
      clientA.canvas.drag(
        { x: bA.x + 240, y: bA.y + 200 },
        { x: bA.x + 300, y: bA.y + 200 },
        { steps: 3 }
      ),
      // Client B changes stroke color to green (#16A34A)
      toolbarB.setStrokeColor('#16A34A').catch(() => {}),
    ]);

    // Allow CRDT sync to resolve
    await collab.waitForSync(clientA.page, clientB.page, 7000);

    // Verify both clients have exactly 1 element with matching attributes
    expect(await clientA.canvas.getObjectCount()).toBe(1);
    expect(await clientB.canvas.getObjectCount()).toBe(1);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should handle concurrent deletion and modification deterministically', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `crdt-delete-conflict-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);
    const toolbarB = new ToolbarDriver(clientB.page);

    // Initial element creation
    await toolbarA.selectTool('ink');
    const bA = await clientA.canvas.getCanvasBounds();
    await clientA.canvas.drawStroke([
      { x: bA.x + 180, y: bA.y + 180 },
      { x: bA.x + 260, y: bA.y + 180 },
    ]);
    await collab.waitForSync(clientA.page, clientB.page, 5000);

    // Select on both
    await toolbarA.selectTool('select');
    await clientA.canvas.clickAt({ x: bA.x + 220, y: bA.y + 180 });

    await toolbarB.selectTool('select');
    const bB = await clientB.canvas.getCanvasBounds();
    await clientB.canvas.clickAt({ x: bB.x + 220, y: bB.y + 180 });

    // Client A deletes while Client B modifies style
    await Promise.all([
      toolbarA.deleteSelection(),
      toolbarB.setStrokeColor('#DC2626').catch(() => {}),
    ]);

    // Board state must converge identically on both clients (tombstone wins or deterministic state)
    await collab.waitForSync(clientA.page, clientB.page, 7000);
    const finalCountA = await clientA.canvas.getObjectCount();
    const finalCountB = await clientB.canvas.getObjectCount();

    expect(finalCountA).toBe(finalCountB);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });

  test('should scope undo/redo operations to local client transactions without undoing peer work', async ({ browser }) => {
    collab = new CollabHarness(browser);
    const roomId = `crdt-undo-scope-${Date.now()}`;
    const [clientA, clientB] = await collab.createPeers(roomId, 2);
    const toolbarA = new ToolbarDriver(clientA.page);
    const toolbarB = new ToolbarDriver(clientB.page);

    // Step 1: Client A draws stroke A
    await toolbarA.selectTool('ink');
    const bA = await clientA.canvas.getCanvasBounds();
    await clientA.canvas.drawStroke([
      { x: bA.x + 100, y: bA.y + 100 },
      { x: bA.x + 160, y: bA.y + 100 },
    ]);
    await collab.waitForSync(clientA.page, clientB.page, 5000);
    expect(await clientA.canvas.getObjectCount()).toBe(1);

    // Step 2: Client B draws stroke B
    await toolbarB.selectTool('ink');
    const bB = await clientB.canvas.getCanvasBounds();
    await clientB.canvas.drawStroke([
      { x: bB.x + 250, y: bB.y + 250 },
      { x: bB.x + 310, y: bB.y + 250 },
    ]);
    await collab.waitForSync(clientA.page, clientB.page, 5000);
    expect(await clientA.canvas.getObjectCount()).toBe(2);

    // Step 3: Client A triggers Undo
    // Per CRDT Y.UndoManager semantics with tracked origins, Client A's undo should undo stroke A, NOT stroke B!
    await toolbarA.undo();
    await collab.waitForSync(clientA.page, clientB.page, 5000);

    // Total elements remaining should be 1 (Client B's stroke B is retained)
    const countA = await clientA.canvas.getObjectCount();
    const countB = await clientB.canvas.getObjectCount();
    expect(countA).toBe(1);
    expect(countB).toBe(1);
    await collab.assertElementsMatch(clientA.page, clientB.page, 5000);
  });
});
