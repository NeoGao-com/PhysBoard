import { Page, Locator, expect } from '@playwright/test';

export interface Point2D {
  x: number;
  y: number;
}

export interface CanvasTransform {
  tx: number;
  ty: number;
  scale: number;
}

/**
 * Driver for interacting with the Mathvera Infinite Vector Whiteboard Canvas.
 * Supports Cartesian Y-up coordinate conversion, pointer gestures, pan, and exponential wheel zoom.
 */
export class CanvasDriver {
  constructor(public readonly page: Page) {}

  /**
   * Main SVG viewport locator
   */
  get svgCanvas(): Locator {
    return this.page.locator('svg[data-wb-canvas="true"], svg.wb-canvas').first();
  }

  /**
   * Board content container group containing all drawn vector elements
   */
  get boardContent(): Locator {
    return this.page.locator('g[data-board-content="true"], g.wb-board-content').first();
  }

  /**
   * Dot grid pattern element
   */
  get dotGridPattern(): Locator {
    return this.page.locator('#wb-dot-grid, pattern[data-wb-grid="true"]');
  }

  /**
   * Selection bounding box overlay
   */
  get selectionBox(): Locator {
    return this.page.locator('[data-wb-selection-box="true"], .wb-selection-box');
  }

  /**
   * Floating selection action bar (duplicate, cut, copy, delete)
   */
  get selectionBar(): Locator {
    return this.page.locator('[data-wb-selection-bar="true"], .wb-selection-bar');
  }

  /**
   * 3D orbit controls bar
   */
  get orbitBar(): Locator {
    return this.page.locator('[data-wb-orbit-bar="true"], .wb-orbit-bar');
  }

  /**
   * Get the bounding box of the canvas in browser viewport pixels
   */
  async getCanvasBounds() {
    await this.svgCanvas.waitFor({ state: 'visible' });
    const box = await this.svgCanvas.boundingBox();
    if (!box) {
      throw new Error('CanvasDriver: SVG canvas bounding box is not available');
    }
    return box;
  }

  /**
   * Calculate center point of canvas
   */
  async getCanvasCenter(): Promise<Point2D> {
    const box = await this.getCanvasBounds();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
  }

  /**
   * Read the current pan & zoom transform from the board content element
   */
  async getTransform(): Promise<CanvasTransform> {
    return await this.boardContent.evaluate((el: SVGElement) => {
      const transformAttr = el.getAttribute('transform') || '';
      const translateMatch = transformAttr.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
      const scaleMatch = transformAttr.match(/scale\(\s*([-\d.]+)\s*\)/);

      const tx = translateMatch ? parseFloat(translateMatch[1]) : 0;
      const ty = translateMatch ? parseFloat(translateMatch[2]) : 0;
      const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

      return { tx, ty, scale };
    }).catch(() => ({ tx: 0, ty: 0, scale: 1 }));
  }

  /**
   * Mathematical Cartesian Y-up coordinate conversion:
   * Screen (browser clientX, clientY) -> Cartesian World (x right, y up)
   * Formula: worldX = (screenX - tx) / scale, worldY = -(screenY - ty) / scale
   */
  screenToWorld(screen: Point2D, transform: CanvasTransform): Point2D {
    return {
      x: (screen.x - transform.tx) / transform.scale,
      y: -(screen.y - transform.ty) / transform.scale,
    };
  }

  /**
   * Mathematical Cartesian Y-up coordinate conversion:
   * Cartesian World (x right, y up) -> Screen (browser clientX, clientY)
   * Formula: screenX = worldX * scale + tx, screenY = -worldY * scale + ty
   */
  worldToScreen(world: Point2D, transform: CanvasTransform): Point2D {
    return {
      x: world.x * transform.scale + transform.tx,
      y: -world.y * transform.scale + transform.ty,
    };
  }

  /**
   * Execute a freehand stroke with pointer events along a sequence of screen points
   */
  async drawStroke(points: Point2D[], options: { steps?: number; delay?: number } = {}) {
    if (points.length === 0) return;
    const steps = options.steps ?? 2;

    await this.page.mouse.move(points[0].x, points[0].y);
    await this.page.mouse.down({ button: 'left' });

    for (let i = 1; i < points.length; i++) {
      await this.page.mouse.move(points[i].x, points[i].y, { steps });
      if (options.delay) {
        await this.page.waitForTimeout(options.delay);
      }
    }

    await this.page.mouse.up({ button: 'left' });
  }

  /**
   * Single click at specified screen coordinates
   */
  async clickAt(point: Point2D) {
    await this.page.mouse.click(point.x, point.y);
  }

  /**
   * Double click at specified screen coordinates
   */
  async doubleClickAt(point: Point2D) {
    await this.page.mouse.dblclick(point.x, point.y);
  }

  /**
   * Linear drag gesture from start to end coordinates
   */
  async drag(start: Point2D, end: Point2D, options: { steps?: number; button?: 'left' | 'right' | 'middle' } = {}) {
    const steps = options.steps ?? 5;
    const button = options.button ?? 'left';

    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down({ button });
    await this.page.mouse.move(end.x, end.y, { steps });
    await this.page.mouse.up({ button });
  }

  /**
   * Canvas pan navigation gesture using Space bar + mouse drag
   */
  async pan(deltaX: number, deltaY: number) {
    const center = await this.getCanvasCenter();
    await this.page.keyboard.down('Space');
    await this.page.mouse.move(center.x, center.y);
    await this.page.mouse.down({ button: 'left' });
    await this.page.mouse.move(center.x + deltaX, center.y + deltaY, { steps: 5 });
    await this.page.mouse.up({ button: 'left' });
    await this.page.keyboard.up('Space');
  }

  /**
   * Canvas wheel zoom gesture at optional focal coordinates (defaults to canvas center)
   */
  async wheelZoom(deltaY: number, focalPoint?: Point2D) {
    const center = focalPoint ?? (await this.getCanvasCenter());
    await this.page.mouse.move(center.x, center.y);
    await this.page.mouse.wheel(0, deltaY);
    // Allow animation frame or debounce settling
    await this.page.waitForTimeout(100);
  }

  /**
   * Marquee drag selection over a rectangular area
   */
  async marqueeSelect(from: Point2D, to: Point2D) {
    await this.drag(from, to, { steps: 8 });
  }

  /**
   * Get the total number of vector elements rendered in the board container
   */
  async getObjectCount(): Promise<number> {
    return await this.boardContent.locator('> *').count();
  }

  /**
   * Get locator for all drawn elements or filtered by tag/class
   */
  getObjects(selector = '> *'): Locator {
    return this.boardContent.locator(selector);
  }

  /**
   * Get locator for the most recently added vector element
   */
  getLatestObject(): Locator {
    return this.boardContent.locator('> *').last();
  }

  /**
   * Wait for a specific number of elements to appear on the board
   */
  async waitForObjectCount(expectedCount: number, timeout = 5000) {
    await expect.poll(async () => this.getObjectCount(), { timeout }).toBe(expectedCount);
  }
}
