import { test, expect } from '@playwright/test';
import { CanvasDriver } from '../helpers/canvas-driver';

test.describe('Tier 4: Academic Scenarios - Grade 10-12 Physics Suite', () => {
  let canvas: CanvasDriver;

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasDriver(page);
    const roomId = `physics-suite-${Date.now()}`;
    await page.goto(`/?room=${roomId}`);
    await canvas.svgCanvas.waitFor({ state: 'attached', timeout: 15_000 });
  });

  test('should browse PhysicsDrawer, animate Spring Pendulum, record data, and plot Oxy regression', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-open-drawer="true"]').click();
    await page.locator('[data-testid="physics-drawer"]').waitFor({ state: 'visible' });

    // Switch grade tabs
    await page.locator('[data-physics-tab="sim10"]').click();
    await expect(page.locator('[data-physics-insert-sim="projectile"]')).toBeVisible();
    await page.locator('[data-physics-tab="sim12"]').click();
    await expect(page.locator('[data-physics-insert-sim="rlc_ac_osc"]')).toBeVisible();
    await page.locator('[data-physics-tab="sim11"]').click();

    // Insert Spring Pendulum
    await page.locator('[data-physics-insert-sim="spring_pendulum"]').click();
    const sim = page.locator('g[data-element-type="PhysicsSim"]').first();
    await expect(sim).toBeVisible();

    // Check period T metric before & after changing stiffness k
    const tMetric = sim.locator('[data-physics-metric="T"]');
    const beforeT = await tMetric.textContent();
    await sim.locator('[data-physics-param="k"]').fill('160');
    await sim.locator('[data-physics-param="k"]').dispatchEvent('change');
    const afterT = await tMetric.textContent();
    expect(afterT).not.toBe(beforeT);

    // Play & Pause simulation
    await sim.locator('[data-physics-play="true"]').click();
    await page.waitForTimeout(350);
    await sim.locator('[data-physics-play="true"]').click();

    // Record 2 samples into PhysicsLabTable and plot regression
    await sim.locator('[data-physics-record="true"]').click();
    await sim.locator('[data-physics-param="m"]').fill('0.8');
    await sim.locator('[data-physics-param="m"]').dispatchEvent('change');
    await sim.locator('[data-physics-record="true"]').click();

    const table = page.locator('g[data-element-type="PhysicsLabTable"]').first();
    await expect(table).toBeVisible();
    await table.locator('[data-physics-regression-plot="true"]').click();

    await expect(page.locator('g[data-element-type="Axes2D"]').first()).toBeVisible();
    await expect(page.locator('g[data-element-type="Plot"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('should solve DC circuit dynamically when toggling switch K and show live Ohm readings', async ({
    page,
  }) => {
    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-action="phys:diag:circuit"]').click();

    const circuit = page.locator('g[data-physics-diagram="circuit"]').first();
    await expect(circuit).toBeVisible();

    const readout = circuit.locator('[data-physics-circuit-readout="true"]');
    await expect(readout).toContainText('I_mạch =');

    // Open switch K -> current drops to 0.00 A
    await circuit.locator('[data-physics-switch="true"]').click();
    await expect(readout).toContainText('Mạch hở: I = 0.00 A');

    // Close switch K again -> positive current restores
    await circuit.locator('[data-physics-switch="true"]').click();
    await expect(readout).toContainText('I_mạch =');
  });

  test('should trace 3 rays in Optics diagram and transition between real and virtual image', async ({
    page,
  }) => {
    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-action="phys:diag:optics"]').click();

    const optics = page.locator('g[data-physics-diagram="optics"]').first();
    await expect(optics).toBeVisible();
    const summary = optics.locator('[data-physics-optics-summary="true"]');

    // Default d = 24cm, f = 14cm -> real inverted image
    await expect(summary).toContainText('Ảnh thật');

    // Move object inside focal length d = 8cm -> virtual upright magnified image
    const dSlider = optics.locator('[data-physics-optics-d="true"]');
    await dSlider.fill('8');
    await dSlider.dispatchEvent('change');
    await expect(summary).toContainText('Ảnh ảo, cùng chiều');
  });

  test('should insert Formulas, Instruments, 1-click Lesson Preset, and resize without anchor drift', async ({
    page,
  }) => {
    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-action="phys:inst:protractor"]').click();

    const protractor = page.locator('g[data-physics-instrument="protractor"]').first();
    await expect(protractor).toBeVisible();

    // Rotate via SelectionBar
    await page.locator('[data-action="phys-rotate-cw"]').click();

    // Resize SE corner handle and verify NW anchor stays fixed
    const nw0 = await page.locator('[data-wb-handle="nw"]').boundingBox();
    const se0 = await page.locator('[data-wb-handle="se"]').boundingBox();
    expect(nw0 && se0).toBeTruthy();
    if (nw0 && se0) {
      await page.mouse.move(se0.x + se0.width / 2, se0.y + se0.height / 2);
      await page.mouse.down();
      await page.mouse.move(se0.x + se0.width / 2 + 50, se0.y + se0.height / 2 + 30, {
        steps: 6,
      });
      await page.mouse.up();
      const nw1 = await page.locator('[data-wb-handle="nw"]').boundingBox();
      expect(nw1).toBeTruthy();
      if (nw1) {
        const drift = Math.hypot(nw1.x - nw0.x, nw1.y - nw0.y);
        expect(drift).toBeLessThan(3);
      }
    }

    // Insert 1-click lesson preset + formula from drawer
    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-open-drawer="true"]').click();
    await page.locator('[data-physics-tab="formulas"]').click();
    await page.locator('[data-physics-insert-formula="f11_dddh"]').click();
    await expect(page.locator('g[data-element-type="MathText"]').first()).toBeVisible();

    await page.locator('[data-dropdown="physics"]').click();
    await page.locator('[data-physics-open-drawer="true"]').click();
    await page.locator('[data-physics-tab="lessons"]').click();
    await page.locator('[data-physics-lesson="lesson_10_projectile"]').click();
    await expect(page.locator('g[data-physics-kind="projectile"]').first()).toBeVisible();
  });
});
