import { test, expect, type Page } from "@playwright/test";

async function setAutoSwitchMode(page: Page, modeLabel: "Con trỏ chọn (Mặc định)" | "Quay lại Bút vẽ" | "Không tự chuyển") {
  await page.locator('button[data-action-open-settings="true"]').first().click();
  const label = page.locator("label", { hasText: modeLabel }).first();
  await expect(label).toBeVisible();
  await label.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("label", { hasText: modeLabel })).toBeHidden();
}

async function pickPlaneTool(page: Page, toolId: string) {
  await page.locator('button[data-dropdown="planeGeometry"]').first().click();
  const item = page.locator(`[data-wb-plane-menu="true"] button[data-menu-item="${toolId}"]`).first();
  await expect(item).toBeVisible();
  await item.click();
}

async function pickSpaceTool(page: Page, toolId: string) {
  await page.locator('button[data-dropdown="spaceGeometry"]').first().click();
  const item = page.locator(`[data-wb-space-menu="true"] button[data-tool-id="${toolId}"]`).first();
  await expect(item).toBeVisible();
  await item.click();
}

test.describe('Tier 1: 18 Auto-Switch "Không tự chuyển" Across Plane & Space Tools', () => {
  test.beforeEach(async ({ page }) => {
    const roomId = `auto-switch-off-${Date.now()}`;
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
      } catch {
        // ignore
      }
    });
    await page.goto(`/?room=${roomId}`, { waitUntil: "domcontentloaded" });
    await page.locator('svg[data-wb-canvas="true"]').waitFor({ state: "attached", timeout: 15_000 });
  });

  test("Plane Geometry tools keep active tool after creation when Không tự chuyển is enabled", async ({ page }) => {
    await setAutoSwitchMode(page, "Không tự chuyển");
    const saved = await page.evaluate(() => window.localStorage.getItem("physboard_auto_switch_target"));
    expect(saved).toBe("off");

    const selectBtn = page.locator('button[data-tool="select"]').first();
    const planeBtn = page.locator('button[data-dropdown="planeGeometry"]').first();
    const guide = page.locator('[data-wb-instruction-guide="true"]').first();

    // 1. Quadrilateral (c:pgram): place two parallelograms consecutively
    await pickPlaneTool(page, "c:pgram");
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await page.mouse.click(260, 260);
    await page.mouse.click(460, 260);
    await expect.poll(() => page.locator('[data-element-type="GeomPolygon"]').count()).toBe(2);
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(selectBtn).not.toHaveAttribute("data-active", "true");

    // 2. Altitude (c:altitude) after triangle stays on c:altitude (neither pre-applied nor reset)
    await pickPlaneTool(page, "c:altitude");
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Đường cao");

    const polyBox = await page.locator('[data-element-type="GeomPolygon"]').first().boundingBox();
    expect(polyBox).not.toBeNull();
    // Click 3 points to construct an altitude
    await page.mouse.click(260, 260);
    await page.mouse.click(460, 260);
    await page.mouse.click(360, 180);
    await expect.poll(() => page.locator('[data-element-type="GeomConstruction"]').count()).toBeGreaterThanOrEqual(1);
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Đường cao");

    // 3. Midpoint (c:midpoint) stays active after placing midpoint
    await pickPlaneTool(page, "c:midpoint");
    await page.mouse.click(560, 240);
    await page.mouse.click(720, 240);
    await expect.poll(() => page.locator('[data-element-type="Point"]').count()).toBeGreaterThanOrEqual(1);
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Trung điểm");

    // 4. Triangle Centroid (c:centroid) stays active
    await pickPlaneTool(page, "c:centroid");
    await page.mouse.click(560, 420);
    await page.mouse.click(700, 420);
    await page.mouse.click(630, 310);
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Trọng tâm");

    // 5. Angle by degree (c:angleval) stays active after dialog "Dựng"
    await pickPlaneTool(page, "c:angleval");
    await page.mouse.click(780, 380);
    await page.mouse.click(880, 380);
    const angleDialog = page.locator('[data-wb-angle-input="true"]');
    await expect(angleDialog).toBeVisible();
    await angleDialog.getByRole("button", { name: "Dựng" }).click();
    await expect(angleDialog).toBeHidden();
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Góc số đo");

    // 6. Perpendicular (c:perp) and Intersection (c:intersect) stay active
    await pickPlaneTool(page, "c:perp");
    await page.mouse.click(780, 380);
    await page.mouse.click(820, 340);
    await expect(planeBtn).toHaveAttribute("data-active", "true");

    await pickPlaneTool(page, "c:intersect");
    await expect(planeBtn).toHaveAttribute("data-active", "true");
    await expect(selectBtn).not.toHaveAttribute("data-active", "true");
  });

  test("Space Geometry tools keep active tool after creation when Không tự chuyển is enabled", async ({ page }) => {
    await setAutoSwitchMode(page, "Không tự chuyển");

    const selectBtn = page.locator('button[data-tool="select"]').first();
    const spaceBtn = page.locator('button[data-dropdown="spaceGeometry"]').first();
    const guide = page.locator('[data-wb-instruction-guide="true"]').first();

    // 1. Place pyramid (p3:pyramid:4) -> stays on p3:pyramid:4
    await pickSpaceTool(page, "p3:pyramid:4");
    await page.mouse.click(540, 380);
    await expect.poll(() => page.locator('[data-element-type="Solid3D"]').count()).toBe(1);
    await expect(spaceBtn).toHaveAttribute("data-active", "true");
    await expect(selectBtn).not.toHaveAttribute("data-active", "true");

    // 2. Point on edge (c:onedge) -> click 3 times consecutively without resetting tool
    await pickSpaceTool(page, "c:onedge");
    const solidRect = await page.locator('[data-element-type="Solid3D"] rect').first().boundingBox();
    expect(solidRect).not.toBeNull();
    await page.mouse.click(solidRect!.x + solidRect!.width * 0.38, solidRect!.y + solidRect!.height * 0.45);
    await page.mouse.click(solidRect!.x + solidRect!.width * 0.62, solidRect!.y + solidRect!.height * 0.45);
    await page.mouse.click(solidRect!.x + solidRect!.width * 0.5, solidRect!.y + solidRect!.height * 0.8);
    await expect.poll(() => page.locator('[data-element-type="Point"]').count()).toBeGreaterThanOrEqual(3);
    await expect(spaceBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Điểm trên");

    // 3. Cross-section (c:section): pick 3 vertices of the pyramid -> creates RoundSection and stays on c:section
    await pickSpaceTool(page, "c:section");
    const verts = page.locator('[data-element-type="Solid3D"] circle[data-wb-vertex="true"]');
    const vCount = await verts.count();
    expect(vCount).toBeGreaterThanOrEqual(4);
    for (const idx of [0, 1, 2]) {
      const vb = await verts.nth(idx).boundingBox();
      expect(vb).not.toBeNull();
      await page.mouse.click(vb!.x + vb!.width / 2, vb!.y + vb!.height / 2);
    }
    await expect.poll(() => page.locator('[data-element-type="RoundSection"]').count()).toBe(1);
    await expect(spaceBtn).toHaveAttribute("data-active", "true");
    await expect(guide).toContainText("Thiết diện");

    // 4. Unfold 2D Net (c:unfold): click pyramid -> stays on c:unfold
    await pickSpaceTool(page, "c:unfold");
    await page.mouse.click(solidRect!.x + solidRect!.width / 2, solidRect!.y + solidRect!.height / 2);
    await expect.poll(() => page.locator('[data-element-type="GeomPolygon"]').count()).toBeGreaterThanOrEqual(3);
    await expect(spaceBtn).toHaveAttribute("data-active", "true");

    // 5. Flatten Face (c:flatten): click solid face then target position -> stays on c:flatten
    await pickSpaceTool(page, "c:flatten");
    await page.mouse.click(solidRect!.x + solidRect!.width / 2, solidRect!.y + solidRect!.height / 2);
    await page.mouse.click(260, 520);
    await expect(spaceBtn).toHaveAttribute("data-active", "true");

    // 6. Plane parallelogram (plane): click empty spot -> stays on plane
    await pickSpaceTool(page, "plane");
    await page.mouse.click(960, 520);
    await expect(spaceBtn).toHaveAttribute("data-active", "true");
    await expect(selectBtn).not.toHaveAttribute("data-active", "true");
  });

  test("Quay lại Bút vẽ switches construction tool back to ink after completion", async ({ page }) => {
    await setAutoSwitchMode(page, "Quay lại Bút vẽ");
    await pickPlaneTool(page, "c:midpoint");
    await page.mouse.click(400, 320);
    await page.mouse.click(560, 320);
    await expect.poll(() => page.locator('[data-element-type="Point"]').count()).toBe(1);
    await expect(page.locator('button[data-tool="ink"]').first()).toHaveAttribute("data-active", "true");
  });
});
