import { test, expect, type Page } from "@playwright/test";
import {
  StylusToolStateMachine,
  isStylusTipInContact,
  normalizeStylusEvent,
} from "../../../src/lib/stylus-adapter";
import { DEFAULT_SPEN_CONFIG, type SPenConfig } from "../../../src/types/whiteboard";
import { CanvasDriver } from "../helpers/canvas-driver";
import { ToolbarDriver } from "../helpers/toolbar-driver";

async function dispatchPenPointer(
  page: Page,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "pointerleave",
  opts: {
    x: number;
    y: number;
    button: number;
    buttons: number;
    pressure?: number;
    pointerId?: number;
    pointerType?: "pen" | "mouse" | "touch";
  }
) {
  await page.evaluate(
    ({ eventType, o }) => {
      const svg = document.querySelector('svg[data-wb-canvas="true"], svg.wb-canvas');
      if (!svg) throw new Error("SVG canvas not found");
      const ev = new PointerEvent(eventType, {
        bubbles: true,
        cancelable: true,
        pointerId: o.pointerId ?? 77,
        pointerType: o.pointerType ?? "pen",
        isPrimary: true,
        clientX: o.x,
        clientY: o.y,
        button: o.button,
        buttons: o.buttons,
        pressure: o.pressure ?? (o.buttons > 0 ? 0.65 : 0),
        width: 1,
        height: 1,
      });
      svg.dispatchEvent(ev);
    },
    { eventType: type, o: opts }
  );
}

test.describe("Universal Stylus Adapter — Unit State Machine & Normalization", () => {
  test("ignores mouse and touch inputs strictly", () => {
    expect(
      normalizeStylusEvent({ pointerType: "mouse", button: 2, buttons: 2, pressure: 0.5 }, "down", null)
    ).toBeNull();
    expect(
      normalizeStylusEvent({ pointerType: "touch", button: 0, buttons: 1, pressure: 0.5 }, "down", null)
    ).toBeNull();
  });

  test("normalizes Primary, Secondary barrel buttons and Hardware Eraser Tail across platforms", () => {
    // Primary barrel (S Pen / Surface / Wacom right-click): buttons & 2 or down button === 2
    const p1 = normalizeStylusEvent({ pointerType: "pen", button: 2, buttons: 2, pressure: 0 }, "down", null);
    expect(p1).toMatchObject({ isPen: true, isPrimaryBarrel: true, isSecondaryBarrel: false, isEraserTail: false });

    // Secondary barrel (Wacom/Huion 2-button): buttons & 4 or down button === 1
    const s1 = normalizeStylusEvent({ pointerType: "pen", button: 1, buttons: 4, pressure: 0 }, "down", null);
    expect(s1).toMatchObject({ isPen: true, isPrimaryBarrel: false, isSecondaryBarrel: true, isEraserTail: false });

    // Secondary barrel should NOT misfire during hover move without button bits
    const hoverMove = normalizeStylusEvent({ pointerType: "pen", button: 1, buttons: 0, pressure: 0 }, "move", null);
    expect(hoverMove?.isSecondaryBarrel).toBe(false);

    // Hardware eraser tail: buttons & 32 or button === 5 or native hint
    const eWin = normalizeStylusEvent({ pointerType: "pen", button: 5, buttons: 32, pressure: 0.8 }, "down", null);
    expect(eWin).toMatchObject({ isPen: true, isEraserTail: true, isTipContact: true });

    const eNative = normalizeStylusEvent(
      { pointerType: "pen", button: 0, buttons: 1, pressure: 0.7 },
      "down",
      { isEraserTail: true, isPrimaryBarrel: false, isSecondaryBarrel: false, ts: Date.now() }
    );
    expect(eNative).toMatchObject({ isPen: true, isEraserTail: true, isTipContact: true });

    // Contact helper must accept tip+barrel combos (1 | 2 = 3, 1 | 4 = 5, 32)
    expect(isStylusTipInContact({ pointerType: "pen", button: 0, buttons: 3, pressure: 0.5 })).toBe(true);
    expect(isStylusTipInContact({ pointerType: "pen", button: 0, buttons: 32, pressure: 0.5 })).toBe(true);
    expect(isStylusTipInContact({ pointerType: "pen", button: 0, buttons: 2, pressure: 0 })).toBe(false);
  });

  test("hardware eraser overrides primary/secondary barrel and cleanly restores previousTool", () => {
    const fsm = new StylusToolStateMachine();
    const cfg: SPenConfig = {
      ...DEFAULT_SPEN_CONFIG,
      behavior: "hold",
      action: "select:marquee",
      secondaryAction: "pan",
      hardwareEraserEnabled: true,
    };

    // Press tip + primary barrel + eraser tail -> eraser wins
    const down = fsm.processEvent(
      { pointerType: "pen", button: 5, buttons: 34, pressure: 0.7 },
      "down",
      "ink",
      cfg,
      null
    );
    expect(down.enteredTemporary).toBe(true);
    expect(down.effectiveTool).toBe("erase");
    expect(down.overrideReason).toBe("hardware-eraser");
    expect(fsm.savedPreviousTool).toBe("ink");

    // Cancel (pen left digitizer unexpectedly) -> must restore "ink" and never stay stuck
    const cancel = fsm.processEvent(
      { pointerType: "pen", button: 0, buttons: 0, pressure: 0 },
      "cancel",
      "erase",
      cfg,
      null
    );
    expect(cancel.exitedTemporary).toBe(true);
    expect(cancel.effectiveTool).toBe("ink");
    expect(fsm.isOverridden).toBe(false);
  });

  test("mid-stroke press and release transitions cleanly without corrupting state", () => {
    const fsm = new StylusToolStateMachine();
    const cfg: SPenConfig = { ...DEFAULT_SPEN_CONFIG, behavior: "hold", action: "erase" };

    // Normal pen down
    const t0 = fsm.processEvent({ pointerType: "pen", button: 0, buttons: 1, pressure: 0.5 }, "down", "ink", cfg, null);
    expect(t0).toMatchObject({ effectiveTool: "ink", enteredTemporary: false, exitedTemporary: false });

    // Mid-stroke primary barrel pressed (buttons = 1 | 2 = 3)
    const t1 = fsm.processEvent({ pointerType: "pen", button: 2, buttons: 3, pressure: 0.5 }, "move", "ink", cfg, null);
    expect(t1).toMatchObject({ effectiveTool: "erase", enteredTemporary: true, exitedTemporary: false, nextActiveTool: "erase" });

    // Button released while tip still touches canvas (buttons = 1)
    const t2 = fsm.processEvent({ pointerType: "pen", button: 2, buttons: 1, pressure: 0.5 }, "move", "erase", cfg, null);
    expect(t2).toMatchObject({ effectiveTool: "ink", enteredTemporary: false, exitedTemporary: true, nextActiveTool: "ink" });
    expect(fsm.isOverridden).toBe(false);
  });
});

test.describe("Tier 1: 19 Universal Stylus Handler E2E", () => {
  test.beforeEach(async ({ page }) => {
    const roomId = `stylus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
      } catch {
        // ignore
      }
    });
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: "attached",
      timeout: 15_000,
    });
  });

  test("TC-19-01: Blocks canvas contextmenu on right-click / barrel press", async ({ page }) => {
    const prevented = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-wb-canvas="true"], svg.wb-canvas');
      if (!svg) throw new Error("SVG canvas not found");
      const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 400, clientY: 320 });
      const dispatchReturn = svg.dispatchEvent(ev);
      return ev.defaultPrevented && !dispatchReturn;
    });
    expect(prevented).toBe(true);
  });

  test("TC-19-02: Primary barrel button temporarily erases and restores active pen tool", async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();
    const y = center.y;

    await toolbar.selectTool("ink");
    await canvas.drawStroke([
      { x: center.x - 100, y },
      { x: center.x + 100, y },
    ]);
    await canvas.waitForObjectCount(1);

    // Hold primary barrel before touching (button: 2, buttons: 3 while touching) across the stroke center
    await dispatchPenPointer(page, "pointerdown", { x: center.x, y: y - 15, button: 2, buttons: 3, pressure: 0.7 });
    await dispatchPenPointer(page, "pointermove", { x: center.x, y, button: -1, buttons: 3, pressure: 0.7 });
    await dispatchPenPointer(page, "pointermove", { x: center.x, y: y + 15, button: -1, buttons: 3, pressure: 0.7 });
    await dispatchPenPointer(page, "pointerup", { x: center.x, y: y + 15, button: 0, buttons: 0, pressure: 0 });

    await canvas.waitForObjectCount(0);

    // Next normal pen stroke must draw immediately without stuck eraser mode
    await dispatchPenPointer(page, "pointerdown", { x: center.x - 60, y: y + 60, button: 0, buttons: 1, pressure: 0.7 });
    await dispatchPenPointer(page, "pointermove", { x: center.x + 60, y: y + 60, button: -1, buttons: 1, pressure: 0.7 });
    await dispatchPenPointer(page, "pointerup", { x: center.x + 60, y: y + 60, button: 0, buttons: 0, pressure: 0 });

    await canvas.waitForObjectCount(1);
  });

  test("TC-19-03: Mid-stroke barrel hold commits stroke 1 to Undo, erases target, and resumes stroke 2 on release", async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();

    // Draw an existing line to erase later
    await toolbar.selectTool("ink");
    await canvas.drawStroke([
      { x: center.x - 120, y: center.y - 80 },
      { x: center.x + 120, y: center.y - 80 },
    ]);
    await canvas.waitForObjectCount(1);

    // Begin pen stroke 1 cleanly away from target
    await dispatchPenPointer(page, "pointerdown", {
      x: center.x - 120,
      y: center.y + 40,
      button: 0,
      buttons: 1,
      pressure: 0.6,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x - 30,
      y: center.y + 40,
      button: -1,
      buttons: 1,
      pressure: 0.6,
    });

    // Mid-stroke: press barrel button (buttons = 3) and sweep over the first stroke at y - 80
    await dispatchPenPointer(page, "pointermove", {
      x: center.x,
      y: center.y - 90,
      button: 2,
      buttons: 3,
      pressure: 0.7,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x,
      y: center.y - 70,
      button: -1,
      buttons: 3,
      pressure: 0.7,
    });

    // Mid-stroke: release barrel button while tip stays in contact (buttons = 1) -> resume stroke 2
    await dispatchPenPointer(page, "pointermove", {
      x: center.x + 20,
      y: center.y + 90,
      button: 2,
      buttons: 1,
      pressure: 0.65,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x + 110,
      y: center.y + 90,
      button: -1,
      buttons: 1,
      pressure: 0.65,
    });
    await dispatchPenPointer(page, "pointerup", {
      x: center.x + 110,
      y: center.y + 90,
      button: 0,
      buttons: 0,
      pressure: 0,
    });

    // Target stroke was erased, stroke 1 and stroke 2 were both committed => 2 objects total
    await canvas.waitForObjectCount(2);

    // Verify Undo undoes stroke 2 first (leaving stroke 1 intact), proving clean Undo stack separation
    await toolbar.undo(true);
    await canvas.waitForObjectCount(1);
  });

  test("TC-19-04: Hardware eraser tail works even when barrel action is disabled, and pointercancel never gets stuck", async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();

    // Open settings and disable primary barrel button, keeping hardware eraser enabled
    await page.locator('button[data-action-open-settings="true"]').first().click();
    const primarySelect = page.getByTestId("stylus-primary-action");
    await expect(primarySelect).toBeVisible();
    await primarySelect.selectOption("none");
    await expect(page.getByTestId("stylus-hardware-eraser")).toBeChecked();
    await page.keyboard.press("Escape");

    // Draw stroke with ink tool
    await toolbar.selectTool("ink");
    await canvas.drawStroke([
      { x: center.x - 80, y: center.y },
      { x: center.x + 80, y: center.y },
    ]);
    await canvas.waitForObjectCount(1);

    // Flip to hardware eraser tail (button: 5, buttons: 32) -> sweep across -> unexpected pointercancel
    await dispatchPenPointer(page, "pointerdown", {
      x: center.x,
      y: center.y - 20,
      button: 5,
      buttons: 32,
      pressure: 0.8,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x,
      y: center.y,
      button: -1,
      buttons: 32,
      pressure: 0.8,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x,
      y: center.y + 20,
      button: -1,
      buttons: 32,
      pressure: 0.8,
    });
    await dispatchPenPointer(page, "pointercancel", {
      x: center.x,
      y: center.y + 20,
      button: 0,
      buttons: 0,
      pressure: 0,
    });

    await canvas.waitForObjectCount(0);

    // Normal pen stroke afterward must still draw with ink (not stuck in eraser)
    await dispatchPenPointer(page, "pointerdown", {
      x: center.x - 40,
      y: center.y + 50,
      button: 0,
      buttons: 1,
      pressure: 0.6,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x + 40,
      y: center.y + 50,
      button: -1,
      buttons: 1,
      pressure: 0.6,
    });
    await dispatchPenPointer(page, "pointerup", {
      x: center.x + 40,
      y: center.y + 50,
      button: 0,
      buttons: 0,
      pressure: 0,
    });

    await canvas.waitForObjectCount(1);
  });

  test("TC-19-05: Secondary barrel pans without middle-click conflict and Settings configures temporary Lasso", async ({ page }) => {
    const canvas = new CanvasDriver(page);
    const toolbar = new ToolbarDriver(page);
    const center = await canvas.getCanvasCenter();

    // Draw two strokes so Lasso can select one
    await toolbar.selectTool("ink");
    await canvas.drawStroke([
      { x: center.x - 40, y: center.y - 20 },
      { x: center.x + 40, y: center.y - 20 },
    ]);
    await canvas.waitForObjectCount(1);

    // Configure primary barrel to Temporary Lasso ("select:marquee") in Settings
    await page.locator('button[data-action-open-settings="true"]').first().click();
    const primarySelect = page.getByTestId("stylus-primary-action");
    const secondarySelect = page.getByTestId("stylus-secondary-action");
    await expect(primarySelect).toBeVisible();
    await expect(secondarySelect).toHaveValue("pan");
    await primarySelect.selectOption("select:marquee");
    await page.keyboard.press("Escape");

    // Verify persistence in localStorage
    const savedRaw = await page.evaluate(() => window.localStorage.getItem("physboard_spen_config"));
    expect(savedRaw).toBeTruthy();
    const saved = JSON.parse(savedRaw!);
    expect(saved.action).toBe("select:marquee");
    expect(saved.secondaryAction).toBe("pan");

    // Test Secondary barrel pan (button: 1, buttons: 5): moves viewport tx/ty
    const beforeTx = await canvas.getTransform();
    await dispatchPenPointer(page, "pointerdown", {
      x: center.x,
      y: center.y + 100,
      button: 1,
      buttons: 5,
      pressure: 0.5,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x + 80,
      y: center.y + 140,
      button: -1,
      buttons: 5,
      pressure: 0.5,
    });
    await dispatchPenPointer(page, "pointerup", {
      x: center.x + 80,
      y: center.y + 140,
      button: 0,
      buttons: 0,
      pressure: 0,
    });

    await expect.poll(async () => (await canvas.getTransform()).tx).toBeGreaterThan(beforeTx.tx + 20);

    // Test Primary barrel temporary Lasso selection around the drawn stroke (at translated screen pos)
    const afterPan = await canvas.getTransform();
    const dx = afterPan.tx - beforeTx.tx;
    const dy = afterPan.ty - beforeTx.ty;
    await dispatchPenPointer(page, "pointerdown", {
      x: center.x + dx - 80,
      y: center.y + dy - 60,
      button: 2,
      buttons: 3,
      pressure: 0.6,
    });
    await dispatchPenPointer(page, "pointermove", {
      x: center.x + dx + 80,
      y: center.y + dy + 20,
      button: -1,
      buttons: 3,
      pressure: 0.6,
    });
    await dispatchPenPointer(page, "pointerup", {
      x: center.x + dx + 80,
      y: center.y + dy + 20,
      button: 0,
      buttons: 0,
      pressure: 0,
    });

    await expect(canvas.selectionBox).toBeVisible();
  });
});
