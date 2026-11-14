import { test, expect } from "@playwright/test";
import { CanvasDriver } from "../helpers/canvas-driver";
import { ToolbarDriver } from "../helpers/toolbar-driver";

test.describe("Tier 1: 08 Board Types, Patterns & Dark Contrast", () => {
  let roomId: string;

  test.beforeEach(async ({ page }) => {
    roomId = `test-board-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"]', {
      state: "attached",
      timeout: 10_000,
    });
  });

  test("TC-08-01: Switch board surface, pattern, and grid size with dark contrast ink", async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);

    const svg = page.locator('svg[data-wb-canvas="true"]');
    await expect(svg).toHaveAttribute("data-board-surface", "white");
    await expect(svg).toHaveAttribute("data-board-pattern", "grid");
    await expect(svg).toHaveAttribute("data-board-dark", "false");

    // Draw a default ink stroke on white board
    await toolbar.selectTool("ink");
    await canvas.drawStroke([
      { x: 260, y: 260 },
      { x: 380, y: 260 },
    ]);
    await canvas.waitForObjectCount(1);

    // Open More menu -> pick Green Chalkboard + Dots + Large spacing
    await page.locator('[data-action="more"]').click();
    await page.locator('[data-board-surface-option="greenboard"]').click();
    await page.locator('[data-board-pattern-option="dots"]').click();
    await page.locator('[data-board-size-option="lg"]').click();
    await page.keyboard.press("Escape");

    await expect(svg).toHaveAttribute("data-board-surface", "greenboard");
    await expect(svg).toHaveAttribute("data-board-pattern", "dots");
    await expect(svg).toHaveAttribute("data-board-dark", "true");

    // Existing default dark stroke adapts visually to chalk white (#F8FAFC)
    const stroke = canvas.getLatestObject();
    const visualColor = await stroke.evaluate((el) => {
      const target = el.querySelector("path") || el;
      return target.getAttribute("stroke") || window.getComputedStyle(target).stroke;
    });
    expect(visualColor.toLowerCase()).toMatch(/(#f8fafc|rgb\(\s*248,\s*250,\s*252\s*\))/);
  });

  test("TC-08-02: Board config saves per page and Apply All syncs across pages", async ({ page }) => {
    const svg = page.locator('svg[data-wb-canvas="true"]');

    // Set page 1 to blackboard + ruled
    await page.locator('[data-action="more"]').click();
    await page.locator('[data-board-surface-option="blackboard"]').click();
    await page.locator('[data-board-pattern-option="ruled"]').click();
    await page.keyboard.press("Escape");

    await expect(svg).toHaveAttribute("data-board-surface", "blackboard");
    await expect(svg).toHaveAttribute("data-board-pattern", "ruled");

    // Add page 2 -> defaults to white / grid
    await page.locator('[data-action="add-page"]').click();
    await expect(svg).toHaveAttribute("data-board-surface", "white");
    await expect(svg).toHaveAttribute("data-board-pattern", "grid");

    // Switch page 2 to cream + graph and apply to all pages
    await page.locator('[data-action="more"]').click();
    await page.locator('[data-board-surface-option="cream"]').click();
    await page.locator('[data-board-pattern-option="graph"]').click();
    await page.locator('[data-action="board-apply-all"]').click();
    await page.keyboard.press("Escape");

    // Go back to page 1 -> now uses cream + graph
    await page.locator('[data-action="prev-page"]').click();
    await expect(svg).toHaveAttribute("data-board-surface", "cream");
    await expect(svg).toHaveAttribute("data-board-pattern", "graph");
  });

  test("TC-08-03: Switch to A4 Portrait/Landscape format renders A4 sheet overlay", async ({ page }) => {
    // Open more menu
    await page.locator('[data-action="more"]').click();

    // Select A4 Portrait format
    const a4PortraitBtn = page.locator('[data-board-format-option="a4_portrait"]');
    await expect(a4PortraitBtn).toBeVisible();
    await a4PortraitBtn.click();
    await page.keyboard.press("Escape");

    // Verify A4 sheet element is rendered
    const a4Sheet = page.locator('[data-wb-a4-sheet="true"]');
    await expect(a4Sheet).toBeVisible();

    // Switch to A4 Landscape
    await page.locator('[data-action="more"]').click();
    const a4LandscapeBtn = page.locator('[data-board-format-option="a4_landscape"]');
    await expect(a4LandscapeBtn).toBeVisible();
    await a4LandscapeBtn.click();
    await page.keyboard.press("Escape");

    await expect(a4Sheet).toBeVisible();
    await expect(a4Sheet).toContainText("Khổ A4 Ngang");

    // Switch back to Infinite format
    await page.locator('[data-action="more"]').click();
    await page.locator('[data-board-format-option="infinite"]').click();
    await page.keyboard.press("Escape");

    await expect(a4Sheet).toHaveCount(0);
  });
});
