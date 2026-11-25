import {
  getToolGuide,
  getSelectionGuide,
} from "../../../src/lib/tool-guides";
import { test, expect } from "@playwright/test";

test.describe("Tool Instruction Guides Coverage Audit", () => {
  const ALL_REGISTERED_TOOLS = [
    // 1. Selection & Canvas Navigation
    "select",
    "select:marquee",
    "pan",

    // 2. Inking Tools
    "ink",
    "ink:fountain",
    "ink:pencil",
    "ink:highlighter",
    "ink:brush",
    "ink:dashed",
    "ink:laser",
    "erase",

    // 3. Text, Formula & Annotation
    "formula",
    "text.write",

    // 4. Basic Geometric Primitives
    "point",
    "geometry.point",
    "segment",
    "c:segment",
    "c:dseg",
    "c:ray",
    "c:line",
    "c:vector",
    "circle",
    "c:circle",
    "polygon",
    "c:polygon",
    "floodFill",

    // 5. 2D Triangles
    "c:triRight",
    "c:triRightIso",
    "c:triIso",
    "c:triEqui",

    // 6. Triangle Lines & Centers
    "c:altitude",
    "c:median",
    "c:bisector",
    "c:centroid",
    "c:ortho",
    "c:circum",
    "c:incircle",

    // 7. Geometric Relations
    "c:onedge",
    "c:midpoint",
    "c:perpbis",
    "c:diameter",
    "c:perp",
    "c:parallel",
    "c:intersect",
    "c:reflect",
    "c:angleval",
    "c:tangent",

    // 8. Quadrilaterals
    "c:pgram",
    "c:rhombus",
    "c:rect",
    "c:square",

    // 9. 3D Space Polyhedra & Solids
    "p3:box",
    "p3:cube",
    "p3:prism:3",
    "p3:prism:5",
    "p3:prism:6",
    "p3:pyramid:3",
    "p3:pyramid:4",
    "p3:pyramid:5",
    "p3:pyramid:6",
    "p3:frustum:3",
    "p3:frustum:4",
    "p3:frustum:6",
    "p3:cylinder",
    "p3:cone",
    "p3:sphere",
    "p3:axes",
    "plane",

    // 10. 3D Advanced Constructions
    "c:lineplane",
    "c:giaotuyen",
    "c:perp3d",
    "c:section",
    "c:boxrule",
    "c:circumsphere",
    "c:flatten",
    "c:unfold",
    "c:footplane",
    "c:distplane",
    "c:commonperp",
    "c:measure",
    "c:anglelp",
    "c:angleplanes",

    // 11. Coordinate Systems, Functions & Statistics
    "p3:oxy",
    "p3:plot",
    "conic:ellipse",
    "conic:parabola",
    "conic:hyperbola",
    "vartable:variation",
    "vartable:sign",
    "p3:chart",
    "p3:bayes",
    "p3:numberline",
  ];

  test("every tool has a valid, non-empty Vietnamese guide and icon", () => {
    for (const toolId of ALL_REGISTERED_TOOLS) {
      const guide = getToolGuide(toolId);
      expect(guide).toBeDefined();
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.desc.length).toBeGreaterThan(10);
      expect(guide.icon.length).toBeGreaterThan(0);
    }
  });

  test("handles dynamic multi-step construction status hints cleanly", () => {
    const guideWithStep = getToolGuide("c:segment", "Chọn điểm thứ hai");
    expect(guideWithStep.desc).toContain("Chọn điểm thứ hai");
    expect(guideWithStep.desc.toLowerCase()).toContain("đoạn thẳng");
  });

  test("handles single and group selection states with tailored guidance", () => {
    const pointSel = getSelectionGuide(1, "GeomPoint", "A");
    expect(pointSel.title).toContain("Điểm A");
    expect(pointSel.desc).toContain("Kéo để di chuyển");

    const multiSel = getSelectionGuide(5);
    expect(multiSel.title).toContain("5 đối tượng");
    expect(multiSel.desc).toContain("cùng lúc");
  });

  test("fallback returns safe, meaningful guide for unknown tool", () => {
    const fallback = getToolGuide("unknown:customTool");
    expect(fallback).toBeDefined();
    expect(fallback.title).toContain("unknown:customTool");
    expect(fallback.desc.length).toBeGreaterThan(0);
  });

  test("UI: instruction guide mounts, displays active tool hints, and toggles on/off", async ({ page }) => {
    const roomId = `test-guide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: 'attached',
      timeout: 10_000,
    });

    const guideBar = page.locator('aside[data-wb-instruction-guide="true"]');
    await expect(guideBar).toBeVisible();

    // Verify initial guide text for default tool (Pen / Bút)
    await expect(guideBar).toContainText("Bút");

    // Click Select tool and verify guide updates
    const selectButton = page.locator('button[data-tool="select"], button[title*="Chọn"]').first();
    if (await selectButton.isVisible()) {
      await selectButton.click();
      await expect(guideBar).toContainText("Chọn");
    }

    // Toggle off via the guide bar's "Tắt" button
    const closeBtn = guideBar.locator('button:has-text("Tắt")');
    await closeBtn.click();
    await expect(guideBar).not.toBeVisible();

    // Toggle back on via Settings modal
    const settingsBtn = page.locator('button[data-action="more"]').first();
    await settingsBtn.click();
    const modal = page.locator('[data-testid="settings-modal"]');
    await expect(modal).toBeVisible();
    const guideCheckbox = page.locator('input[type="checkbox"][data-setting="tool-guides"]');
    await guideCheckbox.click();
    await page.keyboard.press("Escape");

    // Guide bar should be visible again
    await expect(guideBar).toBeVisible();
  });
});
