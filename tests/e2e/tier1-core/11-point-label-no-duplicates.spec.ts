import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';
import { ToolbarDriver } from '../helpers/toolbar-driver';
import {
  collectUsedPointNames,
  getNextPointName,
  type CanvasElement,
} from '../../../src/lib/geometry';
import { createSolid3DElement } from '../../../src/lib/geometry3d';

test.describe('Point tool automatic naming: No duplicate letters on existing shapes', () => {
  test('collectUsedPointNames and getNextPointName never duplicate 3D solid or 2D polygon vertices', () => {
    // 1. Test 3D pyramid (vertices: S, A, B, C, D)
    const pyramid = createSolid3DElement('pyramid', { x: 0, y: 0 }, []);
    expect(pyramid.props.vertexNames).toEqual(['S', 'A', 'B', 'C', 'D']);

    const elementsWithPyramid: CanvasElement[] = [pyramid];
    const used = collectUsedPointNames(elementsWithPyramid);
    expect(used.has('S')).toBe(true);
    expect(used.has('A')).toBe(true);
    expect(used.has('B')).toBe(true);
    expect(used.has('C')).toBe(true);
    expect(used.has('D')).toBe(true);

    // When placing a point on an edge (constraint !== free), should pick M, then N, then P...
    const edgePointPreferred = ['M', 'N', 'P', 'Q', 'K', 'H', 'E', 'F', 'I', 'J'];
    const p1 = getNextPointName(elementsWithPyramid, edgePointPreferred);
    expect(p1).toBe('M');

    // Add point M to elements
    const ptM: CanvasElement = {
      id: 'pt_m',
      type: 'GeomPoint',
      transform: { x: 1, y: 1, scale: 1, rotation: 0, z: 0 },
      style: {},
      props: { name: 'M' },
    };
    elementsWithPyramid.push(ptM);

    const p2 = getNextPointName(elementsWithPyramid, edgePointPreferred);
    expect(p2).toBe('N');

    // When placing a free point (empty preferred pool), should pick E (first unused letter after A, B, C, D)
    const freePoint = getNextPointName(elementsWithPyramid, []);
    expect(freePoint).toBe('E');
    expect(['S', 'A', 'B', 'C', 'D']).not.toContain(freePoint);
  });

  test('Point tool UI: placing a point on a shape does not duplicate existing letters', async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    const roomId = `test-point-labels-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });

    // Place 3D triangular pyramid (vertices S, A, B, C)
    await toolbar.selectDropdownItem('Không gian', 'Chóp tam giác');
    const center = await canvas.getCanvasCenter();
    await canvas.clickAt(center);

    // Verify solid element exists
    const solid = canvas.boardContent.locator('[data-wb-type="Solid3D"]').first();
    await expect(solid).toBeVisible({ timeout: 5000 });

    // Select Point tool
    const pointBtn = page.locator('button[data-tool="point"]');
    await expect(pointBtn).toBeVisible();
    await pointBtn.click();

    // Click on canvas near the pyramid edge to place a point
    await canvas.clickAt({ x: center.x - 30, y: center.y - 20 });

    // Verify created point
    const points = page.locator('[data-element-type="Point"]:not([data-handle="true"])');
    await expect(points.first()).toBeVisible();

    // Verify the point name label is NOT one of the pyramid base vertices (A, B, C, S)
    const pointEl = points.first();
    const pointText = await pointEl.locator('text[data-wb-label="true"]').textContent();
    expect(pointText).toBeTruthy();
    expect(['A', 'B', 'C', 'S']).not.toContain(pointText);
  });
});
