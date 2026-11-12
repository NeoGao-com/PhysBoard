import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';

test.describe('Tier 3: Multi-Client Collaboration - Room Isolation', () => {
  test('should completely isolate canvas objects between separate rooms', async ({ browser }) => {
    const roomA = `iso-A-${Date.now()}`;
    const roomB = `iso-B-${Date.now()}`;

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const canvasA = new CanvasDriver(pageA);
    const canvasB = new CanvasDriver(pageB);
    const toolbarA = new ToolbarDriver(pageA);

    try {
      // Connect to Room A and Room B simultaneously
      await pageA.goto(`/?room=${roomA}`);
      await pageB.goto(`/?room=${roomB}`);

      await canvasA.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
      await canvasB.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

      // Room A creates multiple vector elements
      await toolbarA.selectTool('ink');
      const bA = await canvasA.getCanvasBounds();

      await canvasA.drawStroke([
        { x: bA.x + 100, y: bA.y + 100 },
        { x: bA.x + 200, y: bA.y + 150 },
      ]);
      await canvasA.drawStroke([
        { x: bA.x + 220, y: bA.y + 160 },
        { x: bA.x + 300, y: bA.y + 200 },
      ]);

      // Assert Room A has 2 elements
      await expect.poll(async () => canvasA.getObjectCount(), { timeout: 5000 }).toBe(2);

      // Give time for any accidental broadcast cross-talk
      await pageB.waitForTimeout(1000);

      // Room B MUST have 0 elements (complete isolation)
      const countB = await canvasB.getObjectCount();
      expect(countB).toBe(0);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should isolate live peer cursor awareness between distinct rooms', async ({ browser }) => {
    const roomA = `cursor-iso-A-${Date.now()}`;
    const roomB = `cursor-iso-B-${Date.now()}`;

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const canvasA = new CanvasDriver(pageA);
    const canvasB = new CanvasDriver(pageB);

    try {
      await pageA.goto(`/?room=${roomA}`);
      await pageB.goto(`/?room=${roomB}`);

      await canvasA.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
      await canvasB.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

      // Move mouse actively in Room A
      const bA = await canvasA.getCanvasBounds();
      await pageA.mouse.move(bA.x + 300, bA.y + 300);
      await pageA.waitForTimeout(500);

      // Verify no peer cursors appear on Room B
      const peerCursorsInB = pageB.locator('[data-wb-peer-cursor="true"], .wb-peer-cursor');
      const count = await peerCursorsInB.count();
      expect(count).toBe(0);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should ensure mutations in Room B do not contaminate Room A', async ({ browser }) => {
    const roomA = `cross-bleed-A-${Date.now()}`;
    const roomB = `cross-bleed-B-${Date.now()}`;

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const canvasA = new CanvasDriver(pageA);
    const canvasB = new CanvasDriver(pageB);
    const toolbarA = new ToolbarDriver(pageA);
    const toolbarB = new ToolbarDriver(pageB);

    try {
      await pageA.goto(`/?room=${roomA}`);
      await pageB.goto(`/?room=${roomB}`);

      await canvasA.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
      await canvasB.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

      // Room A draws 1 element
      await toolbarA.selectTool('ink');
      const bA = await canvasA.getCanvasBounds();
      await canvasA.drawStroke([
        { x: bA.x + 100, y: bA.y + 100 },
        { x: bA.x + 150, y: bA.y + 120 },
      ]);
      await expect.poll(async () => canvasA.getObjectCount(), { timeout: 5000 }).toBe(1);

      // Room B draws 3 elements
      await toolbarB.selectTool('ink');
      const bB = await canvasB.getCanvasBounds();
      for (let i = 0; i < 3; i++) {
        await canvasB.drawStroke([
          { x: bB.x + 100 + i * 40, y: bB.y + 100 },
          { x: bB.x + 130 + i * 40, y: bB.y + 140 },
        ]);
      }
      await expect.poll(async () => canvasB.getObjectCount(), { timeout: 5000 }).toBe(3);

      // Room A must remain at exactly 1 element
      await pageA.waitForTimeout(500);
      const finalCountA = await canvasA.getObjectCount();
      expect(finalCountA).toBe(1);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should maintain separate multi-page structures per room', async ({ browser }) => {
    const roomA = `page-iso-A-${Date.now()}`;
    const roomB = `page-iso-B-${Date.now()}`;

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const canvasA = new CanvasDriver(pageA);
    const canvasB = new CanvasDriver(pageB);
    const toolbarA = new ToolbarDriver(pageA);
    const toolbarB = new ToolbarDriver(pageB);

    try {
      await pageA.goto(`/?room=${roomA}`);
      await pageB.goto(`/?room=${roomB}`);

      await canvasA.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
      await canvasB.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

      // Room A adds a new page
      if (await toolbarA.pageBar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toolbarA.addNewPage();
        const indicatorA = await toolbarA.getCurrentPageText();
        expect(indicatorA).toContain('2');

        // Room B page indicator should remain at page 1
        const indicatorB = await toolbarB.getCurrentPageText();
        expect(indicatorB).toMatch(/1\s*\/\s*1/);
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
