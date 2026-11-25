#!/usr/bin/env node
/**
 * Automated Guide Screenshot + ①②③ Callout Annotator + Complete A4 PDF Manual Generator
 * Generates:
 *   1. 20 annotated screenshots in public/guide-shots/*.webp (latest UI + numbered callouts)
 *   2. Complete A4 Portrait PDF Manual in docs/PhysBoard-Cam-Nang-Toan-Tap.pdf
 *      and public/docs/PhysBoard-Cam-Nang-Toan-Tap.pdf
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const sharp = require("sharp");
const { chromium } = require("@playwright/test");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const GUIDE_SHOTS_DIR = path.join(ROOT, "public", "guide-shots");
const DOCS_DIR = path.join(ROOT, "docs");
const PUBLIC_DOCS_DIR = path.join(ROOT, "public", "docs");
const PDF_FILENAME = "PhysBoard-Cam-Nang-Toan-Tap.pdf";

fs.mkdirSync(GUIDE_SHOTS_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DOCS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Load TypeScript data modules cleanly via typescript.transpileModule
// ---------------------------------------------------------------------------
const tsModuleCache = new Map();
function loadTsModule(relPathFromRoot) {
  const absPath = path.resolve(ROOT, relPathFromRoot);
  if (tsModuleCache.has(absPath)) return tsModuleCache.get(absPath).exports;

  const source = fs.readFileSync(absPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: absPath,
  });

  const mod = { exports: {} };
  tsModuleCache.set(absPath, mod);

  const localRequire = (spec) => {
    if (spec.startsWith(".")) {
      const candidateTs = path.resolve(path.dirname(absPath), `${spec}.ts`);
      if (fs.existsSync(candidateTs)) {
        return loadTsModule(path.relative(ROOT, candidateTs));
      }
    }
    return require(spec);
  };

  const fn = new vm.Script(outputText, { filename: absPath });
  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${outputText}\n })`,
    { filename: absPath }
  );
  void fn;
  wrapper(mod.exports, localRequire, mod, absPath, path.dirname(absPath));
  return mod.exports;
}

const commandsMod = loadTsModule("src/lib/commands.ts");
const manualMod = loadTsModule("src/lib/manual-catalog.ts");

const WHITEBOARD_COMMANDS = commandsMod.WHITEBOARD_COMMANDS;
const COMMAND_CATEGORY_LABELS = commandsMod.COMMAND_CATEGORY_LABELS;
const IN_APP_GUIDE_CHAPTERS = manualMod.IN_APP_GUIDE_CHAPTERS;
const MANUAL_BOOK_CHAPTERS = manualMod.MANUAL_BOOK_CHAPTERS;
const COMPLETE_FEATURE_CATALOG = manualMod.COMPLETE_FEATURE_CATALOG;
const INDIVIDUAL_TOOL_REFERENCE = manualMod.INDIVIDUAL_TOOL_REFERENCE;
const SUPPORT_INFO = manualMod.SUPPORT_INFO;

// ---------------------------------------------------------------------------
// Next.js Server Bootstrap Helper
// ---------------------------------------------------------------------------
async function waitForHttp(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function isReachable(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function startTempServer(port = 3000) {
  const isWin = process.platform === "win32";
  const child = spawn(
    isWin ? "cmd.exe" : "npx",
    isWin
      ? ["/c", "npx", "next", "dev", "-p", String(port)]
      : ["next", "dev", "-p", String(port)],
    {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, PORT: String(port) },
    }
  );

  const baseUrl = `http://localhost:${port}`;
  await waitForHttp(baseUrl, 90000);
  return {
    baseUrl,
    stop: async () => {
      try {
        if (isWin && child.pid) {
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
          });
        } else {
          child.kill("SIGTERM");
        }
      } catch {
        // ignore
      }
    },
  };
}

// ---------------------------------------------------------------------------
// SVG Callout Annotation Compositor (1440 x 900 CSS coordinates)
// ---------------------------------------------------------------------------
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Draws rounded red/blue highlight boxes and numbered circles ①②③④ onto a 1440x900 PNG buffer.
 * Each item: { num, box: { x, y, width, height }, badgeCorner?: "tl"|"tr"|"bl"|"br"|"left"|"right", color?: string }
 */
async function annotateAndSaveWebp(rawPngBuf, calloutBoxes, outWebpPath) {
  const W = 1440;
  const H = 900;
  const base1440 = await sharp(rawPngBuf).resize(W, H).png().toBuffer();

  const svgShapes = calloutBoxes
    .filter((c) => c && c.box && c.box.width > 2 && c.box.height > 2)
    .map((c) => {
      const color = c.color || (c.num % 2 === 1 ? "#dc2626" : "#2563eb");
      const pad = 4;
      const rx = Math.max(2, c.box.x - pad);
      const ry = Math.max(2, c.box.y - pad);
      const rw = Math.min(W - rx - 2, c.box.width + pad * 2);
      const rh = Math.min(H - ry - 2, c.box.height + pad * 2);

      let bx = rx + rw + 4;
      let by = ry - 6;
      const corner = c.badgeCorner || "tr";
      if (corner === "tl") {
        bx = rx - 6;
        by = ry - 6;
      } else if (corner === "bl") {
        bx = rx - 6;
        by = ry + rh + 4;
      } else if (corner === "br") {
        bx = rx + rw + 4;
        by = ry + rh + 4;
      } else if (corner === "bottom") {
        bx = rx + rw / 2;
        by = ry + rh + 16;
      } else if (corner === "top") {
        bx = rx + rw / 2;
        by = ry - 16;
      } else if (corner === "left") {
        bx = rx - 18;
        by = ry + rh / 2;
      } else if (corner === "right") {
        bx = rx + rw + 18;
        by = ry + rh / 2;
      }

      bx = Math.max(20, Math.min(W - 20, bx));
      by = Math.max(20, Math.min(H - 20, by));

      return `
        <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}"
              rx="8" ry="8" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.9"/>
        <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}"
              rx="8" ry="8" fill="none" stroke="${color}" stroke-width="2.8" stroke-dasharray="${c.dashed ? "6 4" : "none"}"/>
        <circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="15" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
        <text x="${bx.toFixed(1)}" y="${(by + 5).toFixed(1)}" text-anchor="middle"
              font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" fill="#ffffff">${escapeXml(c.num)}</text>
      `;
    })
    .join("\n");

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgShapes}</svg>`;

  await sharp(base1440)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .webp({ quality: 86 })
    .toFile(outWebpPath);
}

async function boxOf(locator) {
  try {
    if ((await locator.count()) === 0) return null;
    const first = locator.first();
    if (!(await first.isVisible())) return null;
    return await first.boundingBox();
  } catch {
    return null;
  }
}

async function clickCenter(page, locator, { double = false } = {}) {
  const b = await boxOf(locator);
  if (!b || b.width <= 0 || b.height <= 0) return false;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  if (cx < 8 || cy < 8 || cx > 1432 || cy > 892) return false;
  if (double) {
    await page.mouse.dblclick(cx, cy);
  } else {
    await page.mouse.click(cx, cy);
  }
  return true;
}

async function openRoom(page, baseUrl, roomId) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
    } catch {
      // ignore
    }
  });
  await page.goto(`${baseUrl}/?room=${encodeURIComponent(roomId)}`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('svg[data-wb-canvas="true"]', { timeout: 25000 });
  await page.waitForTimeout(700);
}

async function resetRoomStorageFirstTime(page, baseUrl) {
  await page.goto(`${baseUrl}/?room=default`, { waitUntil: "networkidle" });
  await page.waitForSelector('svg[data-wb-canvas="true"]', { timeout: 25000 });
  await page.evaluate(() => {
    window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
    window.localStorage.removeItem("physboard_tutorial_seed_v1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('svg[data-wb-canvas="true"]', { timeout: 25000 });
  await page.waitForTimeout(1600);
}

// ---------------------------------------------------------------------------
// Capture All 20 Annotated Scenes
// ---------------------------------------------------------------------------
async function captureAllScenes(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Trigger initial tutorial notebook seeding on default board
  await resetRoomStorageFirstTime(page, baseUrl);
  // Wait briefly for IndexedDB tutorial notebooks seeding to finish
  await page.waitForTimeout(1600);

  const shotPath = (id) => path.join(GUIDE_SHOTS_DIR, `${id}.webp`);

  // 01. Interface & Navigation
  {
    await openRoom(page, baseUrl, "tut_02_plane_2d");
    await page.waitForTimeout(500);
    const bToolbar = await boxOf(page.locator('[data-wb-toolbar="true"]'));
    const bSidebar = await boxOf(page.locator('[data-wb-sidebar="true"], aside').first());
    const bSelect = await boxOf(page.locator('button[data-tool="select"]').first());
    const bHud = await boxOf(page.locator('[data-wb-hud="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bToolbar || { x: 140, y: 0, width: 1290, height: 42 }, badgeCorner: "bl" },
        { num: 2, box: bSidebar || { x: 0, y: 44, width: 150, height: 840 }, badgeCorner: "right" },
        { num: 3, box: bSelect || { x: 160, y: 4, width: 160, height: 32 }, badgeCorner: "bottom" },
        { num: 4, box: bHud || { x: 1270, y: 845, width: 155, height: 42 }, badgeCorner: "tl" },
      ],
      shotPath("01-interface-navigation")
    );
    console.log("✓ Captured 01-interface-navigation");
  }

  // 02. Home Notebooks & Nested Folders
  {
    await page.locator('[data-action="open-board-manager"]').first().click();
    await page.waitForTimeout(700);
    const tutFolderBtn = page.getByText("Sổ tay Hướng dẫn", { exact: false }).first();
    if (await tutFolderBtn.isVisible()) {
      await tutFolderBtn.click();
      await page.waitForTimeout(500);
    }
    const bTutFolder = await boxOf(tutFolderBtn);
    const bMoreBtn = await boxOf(page.locator('[title="Tuỳ chọn"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: { x: 8, y: 74, width: 162, height: 225 }, badgeCorner: "right" },
        { num: 2, box: bTutFolder || { x: 10, y: 242, width: 155, height: 38 }, badgeCorner: "right" },
        { num: 3, box: { x: 185, y: 74, width: 1235, height: 440 }, badgeCorner: "bl" },
        { num: 4, box: bMoreBtn || { x: 1325, y: 18, width: 42, height: 38 }, badgeCorner: "bottom" },
      ],
      shotPath("02-home-notebooks-folders")
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    console.log("✓ Captured 02-home-notebooks-folders");
  }

  // 03. Pages, A4 Portrait, Backgrounds & Lock
  {
    await openRoom(page, baseUrl, "tut_09_exam_a4");
    await page.waitForTimeout(550);
    await page.locator('button[data-tool="select"]').first().click();
    await page.waitForTimeout(200);
    await clickCenter(page, page.locator('[data-id="tut9_sample_q"] [data-wb-katex="true"]').first());
    await page.waitForTimeout(350);
    const bSidebarPages = { x: 4, y: 68, width: 142, height: 250 };
    const bA4Sheet = { x: 240, y: 60, width: 760, height: 730 };
    const lockBar = await boxOf(page.locator('[data-wb-selection-bar="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bSidebarPages, badgeCorner: "right" },
        { num: 2, box: bA4Sheet, badgeCorner: "tr", dashed: true },
        { num: 3, box: lockBar || { x: 240, y: 830, width: 740, height: 52 }, badgeCorner: "top" },
      ],
      shotPath("03-pages-backgrounds-lock")
    );
    console.log("✓ Captured 03-pages-backgrounds-lock");
  }

  // 04. 6 Pens, Ink-to-Shape, Pen-Only & Eraser
  {
    await openRoom(page, baseUrl, "tut_01_basics");
    await page.waitForTimeout(500);
    await page.locator('button[data-dropdown="pen"]').first().click();
    await page.waitForTimeout(400);
    const bPenPopover = { x: 78, y: 44, width: 324, height: 365 };
    const bEraser = await boxOf(page.locator('button[data-tool="erase"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bPenPopover, badgeCorner: "right" },
        { num: 2, box: { x: 390, y: 315, width: 490, height: 185 }, badgeCorner: "br", dashed: true },
        { num: 3, box: bEraser || { x: 180, y: 4, width: 64, height: 34 }, badgeCorner: "bottom" },
      ],
      shotPath("04-pens-inktoshape-stylus")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 04-pens-inktoshape-stylus");
  }

  // 05. Laser & Instruction Guide Bar
  {
    await page.locator('button[data-tool="ink:laser"]').first().click();
    await page.waitForTimeout(250);
    await page.locator('button[data-action="laser-settings"]').first().click();
    await page.waitForTimeout(400);
    const bLaserBtn = await boxOf(page.locator('button[data-tool="ink:laser"]').first());
    const bGuideBar = await boxOf(page.locator('[data-wb-instruction-guide="true"]').first());
    const bLaserModal = await boxOf(page.locator('[role="dialog"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bLaserBtn || { x: 365, y: 4, width: 95, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: bLaserModal || { x: 460, y: 200, width: 520, height: 420 }, badgeCorner: "tr" },
        { num: 3, box: bGuideBar || { x: 420, y: 50, width: 620, height: 34 }, badgeCorner: "bottom" },
      ],
      shotPath("05-laser-guidebar")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 05-laser-guidebar");
  }

  // 06. Plane Basic: Point (A+/A-), Live Segment/Circle Measurement
  {
    await openRoom(page, baseUrl, "tut_02_plane_2d");
    await page.waitForTimeout(500);
    // Draw a live segment preview in mid-drag (mousedown + mousemove without mouseup) to showcase live d = ... measurement!
    await page.locator('button[data-tool="segment"]').first().click();
    await page.mouse.move(900, 320);
    await page.mouse.down();
    await page.mouse.move(1140, 440, { steps: 10 });
    await page.waitForTimeout(250);
    const bSegGroup = await boxOf(page.locator('button[data-tool="segment"]').first());
    const bCircle = await boxOf(page.locator('[data-element-type="GeomCircle"]').first());
    const raw = await page.screenshot();
    await page.mouse.up();
    await page.waitForTimeout(200);
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bSegGroup || { x: 560, y: 4, width: 150, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: { x: 890, y: 310, width: 270, height: 150 }, badgeCorner: "tr", dashed: true },
        { num: 3, box: bCircle || { x: 785, y: 205, width: 215, height: 215 }, badgeCorner: "tl", dashed: true },
      ],
      shotPath("06-plane-points-lines-circles")
    );
    console.log("✓ Captured 06-plane-points-lines-circles");
  }

  // 07. Polygons, Special Triangles/Quads & Flood Fill
  {
    await openRoom(page, baseUrl, "tut_02_plane_2d");
    await page.waitForTimeout(400);
    await page.locator('button[data-dropdown="planeGeometry"]').first().click();
    await page.waitForTimeout(350);
    const bPoly = await boxOf(page.locator('button[data-tool="polygon"]').first());
    const bMenu = await boxOf(page.locator('[data-wb-plane-menu="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bPoly || { x: 640, y: 4, width: 120, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: bMenu || { x: 740, y: 48, width: 272, height: 420 }, badgeCorner: "right" },
        { num: 3, box: { x: 460, y: 240, width: 280, height: 240 }, badgeCorner: "bl", dashed: true },
      ],
      shotPath("07-plane-polygons-fill")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 07-plane-polygons-fill");
  }

  // 08. Triangle Lines, Centers & SGK Marks
  {
    await openRoom(page, baseUrl, "tut_02_plane_2d");
    await page.waitForTimeout(450);
    await page.locator('button[data-dropdown="planeGeometry"]').first().click();
    await page.waitForTimeout(350);
    const bMarks = await boxOf(page.locator('[data-wb-construct-marks="true"]').first());
    const bMenu = await boxOf(page.locator('[data-wb-plane-menu="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bMenu ? { x: bMenu.x, y: bMenu.y + 80, width: bMenu.width, height: 170 } : { x: 740, y: 120, width: 272, height: 170 }, badgeCorner: "right" },
        { num: 2, box: bMarks ? { x: bMarks.x - 10, y: bMarks.y - 6, width: 250, height: 28 } : { x: 745, y: 540, width: 250, height: 32 }, badgeCorner: "bottom" },
        { num: 3, box: { x: 480, y: 230, width: 320, height: 260 }, badgeCorner: "left", dashed: true },
      ],
      shotPath("08-plane-centers-relations")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 08-plane-centers-relations");
  }

  // 09. Plane Constructions (Intersect, Tangent, Bisector, Angle)
  {
    await openRoom(page, baseUrl, "tut_02_plane_2d");
    await page.waitForTimeout(450);
    await page.locator('button[data-dropdown="planeGeometry"]').first().click();
    await page.waitForTimeout(350);
    const bMenu = await boxOf(page.locator('[data-wb-plane-menu="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bMenu ? { x: bMenu.x, y: bMenu.y + 230, width: bMenu.width, height: 250 } : { x: 740, y: 280, width: 272, height: 250 }, badgeCorner: "right" },
        { num: 2, box: { x: 960, y: 310, width: 210, height: 210 }, badgeCorner: "br", dashed: true },
        { num: 3, box: { x: 420, y: 50, width: 580, height: 34 }, badgeCorner: "bottom" },
      ],
      shotPath("09-plane-constructions")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 09-plane-constructions");
  }

  // 10. Space 3D Solids & OrbitBar
  {
    await openRoom(page, baseUrl, "tut_03_space_3d");
    await page.waitForTimeout(550);
    await page.locator('button[data-tool="select"]').first().click();
    await page.waitForTimeout(200);
    const solidLoc = page.locator('[data-element-type="Solid3D"]').first();
    if (await solidLoc.count()) {
      await clickCenter(page, solidLoc.locator("rect").first());
      await page.waitForTimeout(350);
    }
    await page.locator('button[data-dropdown="spaceGeometry"]').first().click();
    await page.waitForTimeout(350);
    const bSpaceMenu = await boxOf(page.locator('[data-wb-space-menu="true"]').first());
    const bOrbit = await boxOf(page.locator('[data-wb-orbit-bar="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bSpaceMenu ? { x: bSpaceMenu.x, y: bSpaceMenu.y, width: bSpaceMenu.width, height: 230 } : { x: 780, y: 48, width: 340, height: 230 }, badgeCorner: "left" },
        { num: 2, box: (await boxOf(solidLoc)) || { x: 430, y: 240, width: 240, height: 250 }, badgeCorner: "bl", dashed: true },
        { num: 3, box: bOrbit || { x: 1255, y: 270, width: 170, height: 340 }, badgeCorner: "left" },
      ],
      shotPath("10-space-solids-orbit")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 10-space-solids-orbit");
  }

  // 11. Face/Edge Selection & Unfold Net 2D
  {
    await openRoom(page, baseUrl, "tut_03_space_3d");
    await page.waitForTimeout(500);
    await page.locator('button[data-tool="select"]').first().click();
    await page.waitForTimeout(200);
    const solids = page.locator('[data-element-type="Solid3D"]');
    let netBox = null;
    if ((await solids.count()) >= 2) {
      const cubeRectBox = await boxOf(solids.nth(1).locator("rect").first());
      if (cubeRectBox) {
        // Click top-left corner inside hit rect (outside faces) to select the WHOLE cube
        await page.mouse.click(cubeRectBox.x + 6, cubeRectBox.y + 6);
        await page.waitForTimeout(350);
      }
      let unfoldBtn = page.locator('button[data-action="solid-unfold"]').first();
      if (!(await unfoldBtn.isVisible())) {
        // Fallback: select via bottom-right corner of cube hit rect
        if (cubeRectBox) {
          await page.mouse.click(cubeRectBox.x + cubeRectBox.width - 6, cubeRectBox.y + cubeRectBox.height - 6);
          await page.waitForTimeout(350);
        }
      }
      unfoldBtn = page.locator('button[data-action="solid-unfold"]').first();
      if (await unfoldBtn.isVisible()) {
        await unfoldBtn.click();
        await page.waitForTimeout(450);
        netBox = await boxOf(page.locator('[data-element-type="GeomPolygon"]').last());
      } else {
        const flattenBtn = page.locator('button[data-action="solid-face-flatten"]').first();
        if (await flattenBtn.isVisible()) {
          await flattenBtn.click();
          await page.waitForTimeout(450);
          netBox = await boxOf(page.locator('[data-element-type="GeomPolygon"]').last());
        }
      }
      // Select pyramid face SDA to highlight SelectionBar + selected face
      await clickCenter(page, solids.first().locator("rect").first());
      await page.waitForTimeout(350);
    }
    const bSelBar = await boxOf(page.locator('[data-wb-selection-bar="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: (await boxOf(solids.first())) || { x: 430, y: 240, width: 220, height: 230 }, badgeCorner: "tl", dashed: true },
        { num: 2, box: bSelBar || { x: 350, y: 830, width: 700, height: 52 }, badgeCorner: "top" },
        { num: 3, box: netBox || { x: 960, y: 200, width: 320, height: 360 }, badgeCorner: "tl", dashed: true },
      ],
      shotPath("11-space-face-edge-unfold")
    );
    console.log("✓ Captured 11-space-face-edge-unfold");
  }

  // 12. 3D Cross-Section, Distances & Angles
  {
    await openRoom(page, baseUrl, "tut_04_section_3d");
    await page.waitForTimeout(550);
    await page.locator('button[data-dropdown="spaceGeometry"]').first().click();
    await page.waitForTimeout(350);
    const bSpaceMenu = await boxOf(page.locator('[data-wb-space-menu="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bSpaceMenu ? { x: bSpaceMenu.x, y: bSpaceMenu.y + 210, width: bSpaceMenu.width, height: 350 } : { x: 780, y: 230, width: 340, height: 340 }, badgeCorner: "left" },
        { num: 2, box: { x: 560, y: 310, width: 280, height: 270 }, badgeCorner: "tl", dashed: true },
        { num: 3, box: { x: 350, y: 50, width: 520, height: 34 }, badgeCorner: "bottom" },
      ],
      shotPath("12-space-sections-distances")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 12-space-sections-distances");
  }

  // 13. Oxyz 3D Coordinates
  {
    await openRoom(page, baseUrl, "tut_05_oxyz");
    await page.waitForTimeout(550);
    await page.locator('button[data-tool="select"]').first().click();
    await page.waitForTimeout(200);
    const axes3d = page.locator('[data-element-type="Axes3D"]').first();
    if (await axes3d.count()) {
      await clickCenter(page, axes3d.locator("line").first());
      await page.waitForTimeout(400);
    }
    const bSelBar = await boxOf(page.locator('[data-wb-selection-bar="true"]').first());
    const bOrbit = await boxOf(page.locator('[data-wb-orbit-bar="true"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bOrbit || { x: 1255, y: 270, width: 170, height: 340 }, badgeCorner: "left" },
        { num: 2, box: bSelBar || { x: 350, y: 830, width: 760, height: 54 }, badgeCorner: "top" },
        { num: 3, box: (await boxOf(axes3d)) || { x: 460, y: 210, width: 420, height: 380 }, badgeCorner: "tl", dashed: true },
      ],
      shotPath("13-oxyz-analytics")
    );
    console.log("✓ Captured 13-oxyz-analytics");
  }

  // 14. MathEditor + VirtualKeyboard + Smart Actions
  {
    await openRoom(page, baseUrl, "tut_06_calculus_oxy");
    await page.waitForTimeout(550);
    await page.locator('button[data-tool="select"]').first().click();
    await page.waitForTimeout(200);
    const mathEl = page.locator('[data-id="tut6_eq"] [data-wb-katex="true"], [data-element-type="MathText"][data-latex*="x^2"] [data-wb-katex="true"]').first();
    if (await mathEl.count()) {
      await clickCenter(page, mathEl);
      await page.waitForTimeout(350);
      const editBtn = page.locator('[data-wb-selection-bar="true"] button:has-text("Sửa công thức")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(600);
      }
    }
    const bFormulaBtn = await boxOf(page.locator('button[data-tool="formula"]').first());
    const bQuickRow = await boxOf(page.locator('[data-action="formula-quick-solve"]').first().locator(".."));
    const bEditor = await boxOf(page.locator('[data-action="formula-quick-solve"]').first().locator("..").locator(".."));
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bFormulaBtn || { x: 470, y: 4, width: 92, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: bEditor || { x: 240, y: 240, width: 340, height: 145 }, badgeCorner: "tr" },
        { num: 3, box: bQuickRow || { x: 245, y: 340, width: 330, height: 42 }, badgeCorner: "bottom" },
      ],
      shotPath("14-math-editor-solver")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 14-math-editor-solver");
  }

  // 15. Oxy Plots, Sliders & Conics
  {
    await openRoom(page, baseUrl, "tut_06_calculus_oxy");
    await page.waitForTimeout(500);
    await page.locator('button[data-dropdown="functions"]').first().click();
    await page.waitForTimeout(350);
    const bFuncMenu = await boxOf(page.locator('[data-wb-menu="functions"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bFuncMenu || { x: 860, y: 48, width: 290, height: 340 }, badgeCorner: "left" },
        { num: 2, box: { x: 360, y: 360, width: 380, height: 350 }, badgeCorner: "bl", dashed: true },
        { num: 3, box: { x: 185, y: 350, width: 170, height: 75 }, badgeCorner: "top", dashed: true },
      ],
      shotPath("15-oxy-plots-conics")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 15-oxy-plots-conics");
  }

  // 16. VarTable, Sign Table, TrigCircle & Integral
  {
    await openRoom(page, baseUrl, "tut_06_calculus_oxy");
    await page.waitForTimeout(500);
    // Also place a TrigCircle for clear visual showcase
    await page.locator('button[data-dropdown="functions"]').first().click();
    await page.waitForTimeout(250);
    const trigItem = page.locator('[data-menu-item="trig-circle"]').first();
    if (await trigItem.isVisible()) {
      await trigItem.click();
      await page.mouse.click(1120, 620);
      await page.waitForTimeout(400);
    }
    const bFuncBtn = await boxOf(page.locator('button[data-dropdown="functions"]').first());
    const bVarTable = await boxOf(page.locator('[data-element-type="VarTable"]').first());
    const bTrig = await boxOf(page.locator('[data-element-type="TrigCircle"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bFuncBtn || { x: 1080, y: 4, width: 95, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: bVarTable || { x: 790, y: 270, width: 420, height: 190 }, badgeCorner: "tr" },
        { num: 3, box: bTrig || { x: 960, y: 480, width: 290, height: 270 }, badgeCorner: "br" },
      ],
      shotPath("16-vartable-trig-integral")
    );
    console.log("✓ Captured 16-vartable-trig-integral");
  }

  // 17. Stats, Bayes Tree, Venn, Network & RealWorld
  {
    await openRoom(page, baseUrl, "tut_07_stats_bayes");
    await page.waitForTimeout(550);
    await page.locator('button[data-dropdown="statistics"]').first().click();
    await page.waitForTimeout(350);
    const bStatsMenu = await boxOf(page.locator('[data-wb-menu="statistics"]').first());
    const bTree = await boxOf(page.locator('[data-element-type="TreeDiagram"]').first());
    const bVenn = await boxOf(page.locator('[data-element-type="Venn"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: bStatsMenu || { x: 920, y: 48, width: 280, height: 380 }, badgeCorner: "left" },
        { num: 2, box: bTree || { x: 250, y: 270, width: 320, height: 220 }, badgeCorner: "bl" },
        { num: 3, box: bVenn || { x: 640, y: 290, width: 340, height: 240 }, badgeCorner: "br" },
      ],
      shotPath("17-stats-bayes-sets-realworld")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 17-stats-bayes-sets-realworld");
  }

  // 18. 3 Formula Drawers, Periodic Table 118 & Casio fx-580VN
  {
    await openRoom(page, baseUrl, "tut_08_realworld_stem");
    await page.waitForTimeout(550);
    await page.locator('button[data-action="open-calculator"]').first().click();
    await page.waitForTimeout(450);
    // Drag Casio calculator cleanly to left side (using empty spacer right of dropdown/color dots so drag isn't blocked)
    const calcWidget = page.locator('[data-calc-panel="true"]').first();
    const calcHeader = page.locator('[title="Kéo để di chuyển máy tính"]').first();
    const hb = await boxOf(calcHeader);
    if (hb) {
      const startX = hb.x + hb.width - 56;
      const startY = hb.y + hb.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - (hb.x - 165), 115, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    await page.locator('button[data-action="open-chemistry-drawer"]').first().click();
    await page.waitForTimeout(450);
    const ptTab = page.getByRole("button", { name: /Bảng Tuần Hoàn/i }).first();
    if (await ptTab.isVisible()) {
      await ptTab.click();
      await page.waitForTimeout(350);
    }
    const bChem = await boxOf(page.locator('[data-wb-drawer="chemistry"]').first());
    const bCalc = await boxOf(calcWidget);
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: { x: 1090, y: 4, width: 260, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: bChem || { x: 900, y: 50, width: 520, height: 830 }, badgeCorner: "left" },
        { num: 3, box: bCalc || { x: 190, y: 120, width: 340, height: 580 }, badgeCorner: "right" },
      ],
      shotPath("18-drawers-periodic-casio")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 18-drawers-periodic-casio");
  }

  // 19. PhET Online & Offline HTML Simulations
  {
    await openRoom(page, baseUrl, "tut_08_realworld_stem");
    await page.waitForTimeout(400);
    await page.locator('button[data-action="open-sim-launcher"]').first().click();
    await page.waitForTimeout(500);
    const bSimModal = await boxOf(page.locator('[role="dialog"]').first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: { x: 1255, y: 4, width: 95, height: 34 }, badgeCorner: "bottom" },
        { num: 2, box: bSimModal || { x: 220, y: 80, width: 1000, height: 730 }, badgeCorner: "tl" },
        { num: 3, box: bSimModal ? { x: bSimModal.x + 20, y: bSimModal.y + 52, width: bSimModal.width - 40, height: 48 } : { x: 250, y: 135, width: 940, height: 48 }, badgeCorner: "tr" },
      ],
      shotPath("19-phet-simulations")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 19-phet-simulations");
  }

  // 20. Cropper, Export PDF, Classroom Tools, Ctrl+K & Settings Feedback (Zalo)
  {
    await openRoom(page, baseUrl, "tut_09_exam_a4");
    await page.waitForTimeout(400);
    await page.locator('button[data-action="open-classroom-tools"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('button[data-action="open-feedback"]').first().click();
    await page.waitForTimeout(450);
    const pdfManualBtn = page.locator('[data-testid="settings-open-pdf-manual-btn"]').first();
    if (await pdfManualBtn.count()) {
      await pdfManualBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    const bZalo = await boxOf(page.getByText(/Gửi qua Zalo \(0853769246\)/).first());
    const bPdfCard = await boxOf(pdfManualBtn);
    const bSettingsRail = await boxOf(page.getByText("Cài Đặt Hệ Thống").first());
    const raw = await page.screenshot();
    await annotateAndSaveWebp(
      raw,
      [
        { num: 1, box: { x: 6, y: 690, width: 140, height: 140 }, badgeCorner: "right" },
        { num: 2, box: bPdfCard || bSettingsRail || { x: 860, y: 620, width: 180, height: 42 }, badgeCorner: "left" },
        { num: 3, box: bZalo || { x: 420, y: 200, width: 220, height: 42 }, badgeCorner: "right" },
      ],
      shotPath("20-pdf-crop-classroom-settings")
    );
    await page.keyboard.press("Escape");
    console.log("✓ Captured 20-pdf-crop-classroom-settings");
  }

  await context.close();
}

// ---------------------------------------------------------------------------
// Build Complete A4 Portrait HTML + Export PDF (docs/ & public/docs/)
// ---------------------------------------------------------------------------
function loadFontDataUri(fileName) {
  const p = path.join(ROOT, "node_modules", "@fontsource", "be-vietnam-pro", "files", fileName);
  if (!fs.existsSync(p)) return null;
  return `data:font/woff2;base64,${fs.readFileSync(p).toString("base64")}`;
}

async function imageFileToJpegDataUri(webpPath, widthPx = 1120, quality = 80) {
  const buf = await sharp(webpPath)
    .resize({ width: widthPx, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function generatePdfManual(browser) {
  const font400 = loadFontDataUri("be-vietnam-pro-vietnamese-400-normal.woff2");
  const font600 = loadFontDataUri("be-vietnam-pro-vietnamese-600-normal.woff2");
  const font700 = loadFontDataUri("be-vietnam-pro-vietnamese-700-normal.woff2");
  const fontLatin400 = loadFontDataUri("be-vietnam-pro-latin-400-normal.woff2");
  const fontLatin700 = loadFontDataUri("be-vietnam-pro-latin-700-normal.woff2");

  const logoPath = path.join(ROOT, "public", "logo.png");
  const logoDataUri = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : "";

  // Pre-compress all 20 guide screenshots to compact JPEG data URIs
  const shotDataUris = new Map();
  for (const ch of IN_APP_GUIDE_CHAPTERS) {
    const webpPath = path.join(GUIDE_SHOTS_DIR, `${ch.id}.webp`);
    if (fs.existsSync(webpPath)) {
      shotDataUris.set(`${ch.id}.webp`, await imageFileToJpegDataUri(webpPath));
    }
  }

  const tocHtml = MANUAL_BOOK_CHAPTERS.map((ch) => {
    const featCount = COMPLETE_FEATURE_CATALOG.filter((f) => f.chapterNum === ch.num).length;
    const subCount = INDIVIDUAL_TOOL_REFERENCE.filter((t) => t.chapterNum === ch.num).length;
    return `
      <a class="toc-row" href="#${ch.id}">
        <span class="toc-title">${ch.icon} ${escapeHtml(ch.title)}</span>
        <span class="toc-dots"></span>
        <span class="toc-meta">${featCount} hướng dẫn · ${subCount} công cụ</span>
      </a>
    `;
  }).join("\n");

  const chaptersHtml = MANUAL_BOOK_CHAPTERS.map((ch) => {
    const features = COMPLETE_FEATURE_CATALOG.filter((f) => f.chapterNum === ch.num);
    const subTools = INDIVIDUAL_TOOL_REFERENCE.filter((t) => t.chapterNum === ch.num);

    const figuresHtml = ch.screenshots
      .map((fig) => {
        const uri = shotDataUris.get(fig.file) || "";
        const legendItems = fig.callouts
          .map(
            (c) => `
            <div class="legend-item">
              <span class="badge-num">${c.num}</span>
              <div>
                <div class="legend-lbl">${escapeHtml(c.label)}</div>
                <div class="legend-desc">${escapeHtml(c.desc)}</div>
              </div>
            </div>
          `
          )
          .join("");
        return `
          <div class="figure-block">
            ${uri ? `<img class="shot-img" src="${uri}" alt="${escapeHtml(fig.caption)}" />` : ""}
            <div class="fig-caption">Hình minh hoạ: ${escapeHtml(fig.caption)}</div>
            <div class="legend-grid">${legendItems}</div>
          </div>
        `;
      })
      .join("\n");

    const featureCardsHtml = features
      .map(
        (f) => `
        <div class="feat-card">
          <div class="feat-head">
            <div class="feat-name-wrap">
              <span class="feat-icon">${f.icon}</span>
              <div>
                <div class="feat-name">${escapeHtml(f.name)}</div>
                <div class="feat-cat">${escapeHtml(f.categoryLabel)} &bull; 📍 ${escapeHtml(f.whereToFind)}</div>
              </div>
            </div>
            ${f.shortcut !== "—" ? `<span class="shortcut-pill">${escapeHtml(f.shortcut)}</span>` : ""}
          </div>
          <div class="feat-steps">
            <div class="step-box pc"><strong>💻 Máy tính:</strong> ${escapeHtml(f.pcHowTo)}</div>
            <div class="step-box tablet"><strong>📱 Máy tính bảng:</strong> ${escapeHtml(f.tabletHowTo)}</div>
          </div>
          <div class="feat-result">✓ <strong>Kết quả:</strong> ${escapeHtml(f.resultDesc)}</div>
        </div>
      `
      )
      .join("\n");

    const subToolsTableHtml =
      subTools.length > 0
        ? `
        <div class="subtools-block">
          <div class="subtools-title">Bảng tổng hợp toàn bộ nút lệnh &amp; công cụ chi tiết thuộc Chương ${ch.num} (${subTools.length} mục)</div>
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 28%">Công cụ / Lệnh</th>
                <th style="width: 12%">Phím tắt</th>
                <th style="width: 60%">Hướng dẫn thao tác &amp; Lưu ý</th>
              </tr>
            </thead>
            <tbody>
              ${subTools
                .map(
                  (t) => `
                  <tr>
                    <td><strong>${t.icon} ${escapeHtml(t.title)}</strong></td>
                    <td><code>${escapeHtml(t.shortcut)}</code></td>
                    <td>${escapeHtml(t.desc)}${t.tips ? `<br/><em>💡 Mẹo: ${escapeHtml(t.tips)}</em>` : ""}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
        : "";

    return `
      <section class="chapter-section" id="${ch.id}">
        <div class="chapter-banner">
          <div class="chapter-kicker">PHẦN HƯỚNG DẪN CHI TIẾT</div>
          <h2>${ch.icon} ${escapeHtml(ch.title)}</h2>
          <p class="chapter-sub">${escapeHtml(ch.subtitle)}</p>
        </div>
        <p class="chapter-intro">${escapeHtml(ch.intro)}</p>
        ${figuresHtml}
        <div class="section-subtitle">Hướng dẫn chi tiết từng chức năng trong Chương ${ch.num}</div>
        ${featureCardsHtml}
        ${subToolsTableHtml}
        <div class="pedagogy-tip">💡 <strong>Mẹo giảng dạy Chương ${ch.num}:</strong> ${escapeHtml(ch.pedagogyNote)}</div>
      </section>
    `;
  }).join("\n");

  const shortcutsAppendixHtml = COMMAND_CATEGORY_LABELS.filter((c) => c.id !== "all")
    .map((cat) => {
      const cmds = WHITEBOARD_COMMANDS.filter((w) => w.category === cat.id);
      return `
        <div class="shortcut-group">
          <h4>${escapeHtml(cat.label)} (${cmds.length} lệnh)</h4>
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 36%">Tên lệnh</th>
                <th style="width: 18%">Phím tắt</th>
                <th style="width: 46%">Mô tả nhanh</th>
              </tr>
            </thead>
            <tbody>
              ${cmds
                .map(
                  (cmd) => `
                  <tr>
                    <td>${cmd.icon} <strong>${escapeHtml(cmd.label)}</strong></td>
                    <td><code>${escapeHtml(cmd.defaultShortcut || "Tuỳ chỉnh (Ctrl+K)")}</code></td>
                    <td>${escapeHtml(cmd.description || cmd.label)}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Cẩm nang Hướng dẫn Sử dụng Toàn tập PhysBoard ${SUPPORT_INFO.version}</title>
  <style>
    ${font400 ? `@font-face { font-family: 'BeVietnam'; font-weight: 400; src: url('${font400}') format('woff2'); }` : ""}
    ${fontLatin400 ? `@font-face { font-family: 'BeVietnam'; font-weight: 400; src: url('${fontLatin400}') format('woff2'); }` : ""}
    ${font600 ? `@font-face { font-family: 'BeVietnam'; font-weight: 600; src: url('${font600}') format('woff2'); }` : ""}
    ${font700 ? `@font-face { font-family: 'BeVietnam'; font-weight: 700; src: url('${font700}') format('woff2'); }` : ""}
    ${fontLatin700 ? `@font-face { font-family: 'BeVietnam'; font-weight: 700; src: url('${fontLatin700}') format('woff2'); }` : ""}

    @page {
      size: A4 portrait;
      margin: 14mm 12mm 15mm 12mm;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'BeVietnam', 'Segoe UI', system-ui, sans-serif;
      color: #0f172a;
      font-size: 9.8pt;
      line-height: 1.48;
      background: #ffffff;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      min-height: 256mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 14mm 10mm;
      border: 2px solid #dbeafe;
      border-radius: 14px;
      background: linear-gradient(160deg, #eff6ff 0%, #ffffff 42%, #f0fdfa 100%);
    }
    .cover-top { text-align: center; margin-top: 8mm; }
    .cover-logo { width: 84px; height: 84px; border-radius: 20px; box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22); }
    .cover-tag {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #1d4ed8;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .cover-title {
      font-size: 25pt;
      font-weight: 700;
      color: #1e1b4b;
      margin: 14px 0 8px;
      line-height: 1.22;
    }
    .cover-sub {
      font-size: 12pt;
      color: #334155;
      max-width: 155mm;
      margin: 0 auto;
    }
    .cover-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 12mm 0;
    }
    .cover-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 9px 11px;
      font-size: 9.2pt;
    }
    .cover-box strong { color: #1d4ed8; display: block; margin-bottom: 2px; }
    .cover-footer {
      border-top: 1px dashed #94a3b8;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #475569;
    }

    /* TOC */
    .toc-page { page-break-after: always; }
    .toc-page h2 {
      font-size: 16pt;
      color: #1e3a8a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 5px;
      margin: 0 0 10px;
    }
    .toc-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 5px 4px;
      text-decoration: none;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      font-size: 9.5pt;
    }
    .toc-title { font-weight: 600; }
    .toc-dots { flex: 1; border-bottom: 1px dotted #cbd5e1; }
    .toc-meta { font-size: 8.2pt; color: #475569; white-space: nowrap; }

    /* Chapters */
    .chapter-section { page-break-before: always; }
    .chapter-banner {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 8px;
      break-inside: avoid;
    }
    .chapter-kicker { font-size: 7.5pt; font-weight: 700; opacity: 0.85; letter-spacing: 0.06em; }
    .chapter-banner h2 { margin: 2px 0 3px; font-size: 13.5pt; line-height: 1.25; }
    .chapter-sub { margin: 0; font-size: 8.8pt; opacity: 0.92; }
    .chapter-intro { margin: 0 0 8px; color: #334155; font-size: 9.5pt; }

    .figure-block {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px;
      background: #f8fafc;
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .shot-img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .fig-caption {
      font-size: 8.5pt;
      font-weight: 700;
      color: #1e293b;
      margin: 6px 0 5px;
      text-align: center;
    }
    .legend-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .legend-item {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 5px 7px;
    }
    .badge-num {
      width: 17px;
      height: 17px;
      border-radius: 999px;
      background: #dc2626;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .legend-lbl { font-size: 8.3pt; font-weight: 700; color: #0f172a; }
    .legend-desc { font-size: 7.9pt; color: #475569; line-height: 1.35; }

    .section-subtitle {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e3a8a;
      margin: 8px 0 6px;
      border-left: 3.5px solid #2563eb;
      padding-left: 7px;
    }

    .feat-card {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 8px 10px;
      margin-bottom: 7px;
      background: #ffffff;
      break-inside: avoid;
    }
    .feat-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 5px;
    }
    .feat-name-wrap { display: flex; gap: 7px; align-items: center; }
    .feat-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #eff6ff;
      color: #1d4ed8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11pt;
      flex-shrink: 0;
    }
    .feat-name { font-size: 9.6pt; font-weight: 700; color: #0f172a; }
    .feat-cat { font-size: 8pt; color: #475569; }
    .shortcut-pill {
      padding: 2px 7px;
      border-radius: 5px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      font-family: Consolas, monospace;
      font-size: 8pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .feat-steps {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-bottom: 4px;
    }
    .step-box {
      padding: 5px 7px;
      border-radius: 6px;
      font-size: 8.3pt;
      line-height: 1.4;
    }
    .step-box.pc { background: #eff6ff; border: 1px solid #dbeafe; }
    .step-box.tablet { background: #f0fdf4; border: 1px solid #dcfce7; }
    .feat-result { font-size: 8.2pt; color: #047857; }

    .subtools-block { margin-top: 8px; }
    .subtools-title { font-size: 9.3pt; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .mini-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.1pt;
      margin-bottom: 8px;
    }
    .mini-table th, .mini-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      text-align: left;
      vertical-align: top;
    }
    .mini-table th { background: #f1f5f9; color: #1e293b; font-weight: 700; }
    .mini-table tr { break-inside: avoid; }
    code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
      font-family: Consolas, monospace;
      font-size: 7.8pt;
    }

    .pedagogy-tip {
      margin-top: 6px;
      padding: 7px 10px;
      border-radius: 8px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #78350f;
      font-size: 8.5pt;
      break-inside: avoid;
    }

    .appendix-section { page-break-before: always; }
    .shortcut-group { margin-bottom: 10px; }
    .shortcut-group h4 { margin: 6px 0 4px; font-size: 10pt; color: #1d4ed8; }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <section class="cover-page">
    <div class="cover-top">
      ${logoDataUri ? `<img class="cover-logo" src="${logoDataUri}" alt="PhysBoard Logo" />` : ""}
      <div><span class="cover-tag">PHIÊN BẢN ${SUPPORT_INFO.version} &bull; CẨM NANG CHÍNH THỨC</span></div>
      <h1 class="cover-title">CẨM NANG HƯỚNG DẪN SỬ DỤNG<br/>TOÀN TẬP PHYSBOARD</h1>
      <p class="cover-sub">
        Tài liệu hướng dẫn từng bước 100% tính năng kèm ảnh minh hoạ khoanh số <strong>① ② ③</strong>
        dành cho Giáo viên dạy <strong>Toán · Vật lý · Hoá học</strong> trên Máy tính (Windows) &amp; Máy tính bảng (Android).
      </p>
    </div>

    <div class="cover-grid">
      <div class="cover-box">
        <strong>① Đầy đủ 100% công cụ (Không bỏ sót)</strong>
        Bao phủ toàn bộ 14 chuyên đề: Bút Vector, Hình phẳng 2D động, Hình Không gian 3D &amp; Thiết diện, Oxyz, Giải PT, Đồ thị Oxy, Bayes, PhET &amp; Casio.
      </div>
      <div class="cover-box">
        <strong>② Minh hoạ rõ từng nút bấm ① ② ③</strong>
        Mỗi chương đều có ảnh chụp giao diện mới nhất, khoanh rõ vị trí nút bấm trên thanh công cụ cố định &amp; Trang chủ Sổ tay sáng.
      </div>
      <div class="cover-box">
        <strong>③ Song song Máy tính &amp; Máy tính bảng</strong>
        Hướng dẫn tách bạch thao tác Chuột/Phím tắt trên Laptop và Chạm tay/Bút cảm ứng S Pen trên máy tính bảng.
      </div>
      <div class="cover-box">
        <strong>④ Kèm Bộ 9 Sổ tay Thực hành mẫu</strong>
        Trong ứng dụng đã cài sẵn 9 bảng bài mẫu có hình dựng sống để bạn mở ra kéo thử và thực hành ngay theo sách này.
      </div>
    </div>

    <div class="cover-footer">
      <div><strong>Tác giả &amp; Hỗ trợ kỹ thuật:</strong> Zalo <strong>${SUPPORT_INFO.zaloDisplay}</strong> &bull; ${SUPPORT_INFO.email}</div>
      <div><strong>Hoạt động 100% Offline</strong> &bull; Windows (.exe) &amp; Android (.apk)</div>
    </div>
  </section>

  <!-- TABLE OF CONTENTS -->
  <section class="toc-page">
    <h2>📑 Mục lục Toàn tập (Bấm vào từng dòng để nhảy trang)</h2>
    ${tocHtml}
    <a class="toc-row" href="#app-shortcuts">
      <span class="toc-title">⌘ Phụ lục A. Bảng Tổng hợp Toàn bộ Phím tắt bàn phím (${WHITEBOARD_COMMANDS.length} lệnh)</span>
      <span class="toc-dots"></span>
      <span class="toc-meta">Tra cứu nhanh</span>
    </a>
    <a class="toc-row" href="#app-support">
      <span class="toc-title">💬 Phụ lục B. Hướng dẫn Sao lưu dữ liệu, Mẹo Tablet &amp; Liên hệ Zalo ${SUPPORT_INFO.zaloDisplay}</span>
      <span class="toc-dots"></span>
      <span class="toc-meta">Hỗ trợ nhanh</span>
    </a>
    <div class="pedagogy-tip" style="margin-top: 14px;">
      💡 <strong>Cách đọc hiệu quả nhất:</strong> Mở ứng dụng PhysBoard → vào <strong>Quản lý bảng / Trang chủ</strong> → mở thư mục
      <strong>📘 Sổ tay Hướng dẫn &amp; Thực hành mẫu</strong> để vừa đọc tài liệu PDF này vừa thao tác trực tiếp trên 9 bảng bài mẫu!
    </div>
  </section>

  <!-- 14 CHAPTERS -->
  ${chaptersHtml}

  <!-- APPENDIX A: SHORTCUTS -->
  <section class="appendix-section" id="app-shortcuts">
    <div class="chapter-banner">
      <div class="chapter-kicker">PHỤ LỤC A</div>
      <h2>⌘ Bảng Tổng hợp Toàn bộ Phím tắt Bàn phím (${WHITEBOARD_COMMANDS.length} Lệnh)</h2>
      <p class="chapter-sub">Nhấn Ctrl+K trong ứng dụng để tìm kiếm và tự gán lại mọi phím tắt theo thói quen riêng</p>
    </div>
    ${shortcutsAppendixHtml}
  </section>

  <!-- APPENDIX B: SUPPORT & ZALO -->
  <section class="appendix-section" id="app-support">
    <div class="chapter-banner">
      <div class="chapter-kicker">PHỤ LỤC B</div>
      <h2>💬 Quy trình Sao lưu, Mẹo dùng Tablet &amp; Liên hệ Hỗ trợ Nhanh</h2>
      <p class="chapter-sub">Hướng dẫn bảo vệ dữ liệu giáo án và kênh hỗ trợ trực tiếp cho giáo viên</p>
    </div>
    <div class="feat-card">
      <div class="feat-name">1. Đồng bộ giáo án giữa Máy tính Windows và Máy tính bảng Android</div>
      <p style="margin: 5px 0 0; font-size: 8.8pt;">
        Mở <strong>Trang chủ Sổ tay</strong> → bấm nút menu <strong>⋮</strong> ở góc trên phải → chọn <strong>Sao lưu (.physbackup.json)</strong> để xuất toàn bộ thư mục, sổ tay và file PDF ra 1 tệp duy nhất.
        Gửi tệp này sang thiết bị kia rồi chọn <strong>Khôi phục từ file</strong> là toàn bộ bài giảng được giữ nguyên vẹn 100%.
      </p>
    </div>
    <div class="feat-card">
      <div class="feat-name">2. Mẹo dạy mượt trên Máy tính bảng Android (S Pen / Stylus)</div>
      <p style="margin: 5px 0 0; font-size: 8.8pt;">
        &bull; Bật nút <strong>Chỉ bút Stylus (Pen-Only)</strong> trên thanh công cụ để tì lòng bàn tay thoải mái khi viết mà không tạo nét chạm rác.<br/>
        &bull; Dùng <strong>2 ngón tay</strong> để kéo bảng và thu phóng bất cứ lúc nào.<br/>
        &bull; Bấm nút <strong>⛶ Toàn màn hình</strong> ở góc trên phải hoặc thanh bên trái để ẩn thanh điều hướng Android kể cả khi xoay dọc máy tính bảng.
      </p>
    </div>
    <div class="feat-card" style="border-color: #0284c7; background: #f0f9ff;">
      <div class="feat-name" style="color: #0369a1; font-size: 11pt;">3. Kênh Báo lỗi &amp; Hỗ trợ trực tiếp qua Zalo</div>
      <p style="margin: 6px 0 0; font-size: 9.2pt;">
        Nếu bạn gặp khó khăn trong quá trình sử dụng, muốn góp ý thêm tính năng dạy học hoặc cần hỗ trợ cài đặt, hãy liên hệ trực tiếp không cần tạo tài khoản phức tạp:<br/><br/>
        &bull; <strong>Zalo hỗ trợ trực tiếp:</strong> <strong>${SUPPORT_INFO.zaloPhone}</strong> (${SUPPORT_INFO.zaloDisplay}) — có nút bấm mở thẳng ngay trong mục <em>Cài đặt → Báo lỗi</em>.<br/>
        &bull; <strong>Email:</strong> ${SUPPORT_INFO.email}<br/>
        &bull; <strong>GitHub Releases &amp; Issues:</strong> ${SUPPORT_INFO.githubRepo}
      </p>
    </div>
  </section>
</body>
</html>`;

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(html, { waitUntil: "load" });
  await pdfPage.waitForTimeout(400);

  const outDocsPdf = path.join(DOCS_DIR, PDF_FILENAME);
  const outPublicPdf = path.join(PUBLIC_DOCS_DIR, PDF_FILENAME);

  const pdfBuffer = await pdfPage.pdf({
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    margin: {
      top: "14mm",
      bottom: "15mm",
      left: "12mm",
      right: "12mm",
    },
    headerTemplate: `<div style="width:100%;font-size:7.5pt;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;font-family:sans-serif;">
      <span>Cẩm nang Toàn tập PhysBoard ${SUPPORT_INFO.version}</span>
      <span>Toán · Vật lý · Hoá học THPT (Offline PC &amp; Android)</span>
    </div>`,
    footerTemplate: `<div style="width:100%;font-size:7.5pt;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;font-family:sans-serif;">
      <span>Hỗ trợ trực tiếp Zalo: ${SUPPORT_INFO.zaloDisplay}</span>
      <span>Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
  });

  fs.writeFileSync(outDocsPdf, pdfBuffer);
  fs.writeFileSync(outPublicPdf, pdfBuffer);
  await pdfPage.close();

  const mb = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`✓ Generated PDF (${mb} MB): ${outDocsPdf}`);
  console.log(`✓ Generated PDF (${mb} MB): ${outPublicPdf}`);
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
async function main() {
  const pdfOnly = process.argv.includes("--pdf-only");
  let server = null;
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });

    if (!pdfOnly) {
      const externalUrl = process.env.BASE_URL;
      let baseUrl = externalUrl;
      if (!baseUrl) {
        if (await isReachable("http://localhost:3000")) {
          baseUrl = "http://localhost:3000";
          console.log("Reusing running Next.js server at http://localhost:3000");
        } else if (await isReachable("http://127.0.0.1:3000")) {
          baseUrl = "http://127.0.0.1:3000";
          console.log("Reusing running Next.js server at http://127.0.0.1:3000");
        } else {
          console.log("Starting temporary Next.js server on port 3000...");
          server = await startTempServer(3000);
          baseUrl = server.baseUrl;
        }
      }
      console.log(`Using app at ${baseUrl}`);
      await captureAllScenes(browser, baseUrl);
    }

    await generatePdfManual(browser);
    console.log(
      pdfOnly
        ? "🎉 Regenerated complete A4 PDF manual (--pdf-only) successfully!"
        : "🎉 All 20 annotated screenshots and complete A4 PDF manual built successfully!"
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.stop();
  }
}

main().catch((err) => {
  console.error("❌ Failed to build guides and PDF:", err);
  process.exit(1);
});
