import * as Y from "yjs";
import { jsPDF } from "jspdf";
import { toBlob } from "html-to-image";
import { BoundingBox, CanvasElement } from "@/types/whiteboard";
import { readElement } from "@/lib/dispatcher";
import {
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
  adaptStrokeForBoard,
  readPageBoardConfig,
  resolveBoardColors,
} from "@/lib/board-themes";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function asNumber(val: unknown, fallback = 0): number {
  return typeof val === "number" && Number.isFinite(val) ? val : fallback;
}

function asString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function asNumberArray(val: unknown): number[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is string => typeof item === "string");
}

/**
 * Reads visible canvas elements for a given page (defaults to all pages if omitted).
 */
export function getVisiblePageElements(doc: Y.Doc, page?: number): CanvasElement[] {
  const arr = doc.getArray<Y.Map<unknown>>("objects");
  const list: CanvasElement[] = [];
  for (let i = 0; i < arr.length; i++) {
    const el = readElement(arr.get(i));
    if (el.style?.hidden) continue;
    if (page !== undefined && (el.meta.page ?? 1) !== page) continue;
    list.push(el);
  }
  return list;
}

interface PointCoord {
  x: number;
  y: number;
  name?: string;
}

function buildPointLookup(elements: CanvasElement[]): Map<string, PointCoord> {
  const map = new Map<string, PointCoord>();
  for (const el of elements) {
    if (el.type === "Point" || el.type === "GeomPoint") {
      const x = el.type === "Point" ? asNumber(el.props.x, el.transform.x) : el.transform.x;
      const y = el.type === "Point" ? asNumber(el.props.y, el.transform.y) : el.transform.y;
      map.set(el.id, {
        x,
        y,
        name: asString(el.props.name, ""),
      });
    }
  }
  return map;
}

function expandBounds(
  acc: { minX: number; maxX: number; minY: number; maxY: number },
  x: number,
  y: number
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  if (x < acc.minX) acc.minX = x;
  if (x > acc.maxX) acc.maxX = x;
  if (y < acc.minY) acc.minY = y;
  if (y > acc.maxY) acc.maxY = y;
}

/**
 * Computes math-world bounding box for visible elements on a page.
 */
export function computePageContentBounds(elements: CanvasElement[]): BoundingBox | null {
  if (elements.length === 0) return null;
  const pts = buildPointLookup(elements);
  const acc = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };

  for (const el of elements) {
    const tx = el.transform.x || 0;
    const ty = el.transform.y || 0;
    const sc = el.transform.scale || 1;

    if (el.type === "Ink") {
      const flat = asNumberArray(el.props.points);
      for (let i = 0; i + 1 < flat.length; i += 2) {
        expandBounds(acc, tx + flat[i] * sc, ty + flat[i + 1] * sc);
      }
    } else if (el.type === "Rectangle") {
      const w = asNumber(el.props.width, 2) * sc;
      const h = asNumber(el.props.height, 1.5) * sc;
      expandBounds(acc, tx - w / 2, ty - h / 2);
      expandBounds(acc, tx + w / 2, ty + h / 2);
    } else if (el.type === "Image") {
      const w = asNumber(el.props.w, 6) * sc;
      const h = asNumber(el.props.h, 4) * sc;
      expandBounds(acc, tx - w / 2, ty - h / 2);
      expandBounds(acc, tx + w / 2, ty + h / 2);
    } else if (el.type === "Table") {
      const cells = Array.isArray(el.props.cells) ? el.props.cells : [];
      const rows = Math.max(1, cells.length);
      const cols = Math.max(1, Array.isArray(cells[0]) ? cells[0].length : 1);
      const w = cols * 2.2 * sc;
      const h = rows * 0.9 * sc;
      expandBounds(acc, tx, ty - h);
      expandBounds(acc, tx + w, ty);
    } else if (el.type === "Point" || el.type === "GeomPoint") {
      const p = pts.get(el.id);
      if (p) {
        expandBounds(acc, p.x - 0.5, p.y - 0.5);
        expandBounds(acc, p.x + 0.5, p.y + 0.5);
      }
    } else if (
      el.type === "GeomSegment" ||
      el.type === "GeomVector" ||
      el.type === "GeomRay" ||
      el.type === "GeomLine"
    ) {
      const p1 = pts.get(asString(el.props.from));
      const p2 = pts.get(asString(el.props.to));
      if (p1) expandBounds(acc, p1.x, p1.y);
      if (p2) expandBounds(acc, p2.x, p2.y);
    } else if (el.type === "GeomPolygon") {
      for (const vid of asStringArray(el.props.vertices)) {
        const p = pts.get(vid);
        if (p) expandBounds(acc, p.x, p.y);
      }
    } else if (el.type === "GeomCircle") {
      const c = pts.get(asString(el.props.center));
      const rObj = el.props.radius;
      let r = 2;
      if (isRecord(rObj) && rObj.kind === "value") {
        r = asNumber(rObj.v, 2);
      } else if (isRecord(rObj) && rObj.kind === "through" && c) {
        const tp = pts.get(asString(rObj.point));
        if (tp) r = Math.hypot(tp.x - c.x, tp.y - c.y);
      }
      if (c) {
        expandBounds(acc, c.x - r, c.y - r);
        expandBounds(acc, c.x + r, c.y + r);
      }
    } else if (el.type === "Axes2D" || el.type === "Axes3D") {
      const size = asNumber(el.props.size, 6);
      expandBounds(acc, tx - size, ty - size);
      expandBounds(acc, tx + size, ty + size);
    } else if (el.type === "TrigCircle") {
      expandBounds(acc, tx - 3.5, ty - 3.5);
      expandBounds(acc, tx + 3.5, ty + 3.5);
    } else {
      expandBounds(acc, tx - 2, ty - 1.5);
      expandBounds(acc, tx + 2, ty + 1.5);
    }
  }

  if (!Number.isFinite(acc.minX)) return null;
  const pad = 1.0;
  const minX = acc.minX - pad;
  const maxX = acc.maxX + pad;
  const minY = acc.minY - pad;
  const maxY = acc.maxY + pad;
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(2, maxX - minX),
    height: Math.max(2, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function hexToRgba(hex: string | null | undefined, fallback: string): string {
  if (!hex || typeof hex !== "string") return fallback;
  return hex;
}

/**
 * Pure Canvas2D vector fallback renderer that works reliably for populated or empty boards.
 * Accurately supports A4 Portrait (595x842pt ratio), A4 Landscape (842x595pt ratio),
 * and Infinite modes, rendering Ink, Images (PDFs), Geometry, Math, and Tables.
 */
export function renderElementsToCanvas2D(
  elements: CanvasElement[],
  widthPx = 1200,
  heightPx = 760,
  boardConfig: PageBoardConfig = DEFAULT_PAGE_BOARD_CONFIG,
  pageNum = 1,
  preloadedImages?: Map<string, HTMLImageElement>
): HTMLCanvasElement {
  const format = boardConfig.format ?? "infinite";
  const isA4 = format === "a4_portrait" || format === "a4_landscape";

  // Auto-correct aspect ratio if caller passed default landscape dimensions for A4 portrait
  if (format === "a4_portrait" && widthPx >= heightPx) {
    heightPx = Math.round(widthPx * (24.04 / 17));
  } else if (format === "a4_landscape" && heightPx >= widthPx) {
    widthPx = Math.round(heightPx * (24.04 / 17));
  }

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const theme = resolveBoardColors(boardConfig);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (boardConfig.pattern !== "none") {
    const sp = Math.round(theme.spacingPx * (isA4 ? widthPx / (format === "a4_portrait" ? 765 : 1080) : 1));
    const spacing = Math.max(12, sp);
    if (boardConfig.pattern === "dots") {
      ctx.fillStyle = theme.dotFill;
      for (let x = spacing / 2; x < widthPx; x += spacing) {
        for (let y = spacing / 2; y < heightPx; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (boardConfig.pattern === "ruled") {
      ctx.strokeStyle = theme.ruledStroke;
      ctx.lineWidth = 1;
      for (let y = spacing; y < heightPx; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthPx, y);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle =
        boardConfig.pattern === "graph" ? theme.subGridStroke : theme.gridStroke;
      ctx.lineWidth = 1;
      for (let x = 0; x < widthPx; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightPx);
        ctx.stroke();
      }
      for (let y = 0; y < heightPx; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthPx, y);
        ctx.stroke();
      }
      if (boardConfig.pattern === "graph") {
        ctx.strokeStyle = theme.gridStroke;
        ctx.lineWidth = 1.4;
        for (let x = 0; x < widthPx; x += spacing * 5) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, heightPx);
          ctx.stroke();
        }
        for (let y = 0; y < heightPx; y += spacing * 5) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(widthPx, y);
          ctx.stroke();
        }
      }
    }
  }

  if (elements.length === 0) {
    return canvas;
  }

  let toX: (wx: number) => number;
  let toY: (wy: number) => number;
  let scaleX: number;
  let scaleY: number;

  if (isA4) {
    const isPortrait = format === "a4_portrait";
    const pageW = isPortrait ? 17 : 24.04;
    const pageH = isPortrait ? 24.04 : 17;
    const pageGap = 0.8;
    const pageStep = pageH + pageGap;
    const pageTop = (pageNum - 1) * pageStep;

    scaleX = widthPx / pageW;
    scaleY = heightPx / pageH;
    toX = (wx: number) => (wx + pageW / 2) * scaleX;
    toY = (wy: number) => (-wy - pageTop) * scaleY;
  } else {
    const bbox = computePageContentBounds(elements) ?? {
      minX: -10,
      maxX: 10,
      minY: -6,
      maxY: 6,
      width: 20,
      height: 12,
      centerX: 0,
      centerY: 0,
    };

    const margin = 48;
    const availW = Math.max(100, widthPx - margin * 2);
    const availH = Math.max(100, heightPx - margin * 2);
    const sc = Math.min(availW / bbox.width, availH / bbox.height);
    scaleX = sc;
    scaleY = sc;
    toX = (wx: number) => widthPx / 2 + (wx - bbox.centerX) * sc;
    toY = (wy: number) => heightPx / 2 - (wy - bbox.centerY) * sc;
  }

  const pts = buildPointLookup(elements);
  const strokeWidthScale = (scaleX + scaleY) / 2 / (isA4 ? 45 : 45);

  for (const el of elements) {
    let stroke =
      adaptStrokeForBoard(el.style?.stroke, theme.isDark) ??
      hexToRgba(el.style?.stroke, theme.defaultInkColor);

    // If on white background/paper, ensure chalk-white ink is clearly readable as black ink
    if (!theme.isDark && (stroke === "#F8FAFC" || stroke === "#ffffff" || stroke === "#fff" || stroke === "#f1f5f9")) {
      stroke = "#111827";
    }

    const width = asNumber(el.style?.width, 2);
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.fillStyle = hexToRgba(el.style?.fill, "transparent");
    ctx.lineWidth = Math.max(1, width * Math.max(1, strokeWidthScale * 0.9));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (el.style?.dash) {
      ctx.setLineDash([8 * strokeWidthScale, 5 * strokeWidthScale]);
    }

    const tx = el.transform.x || 0;
    const ty = el.transform.y || 0;
    const sc = el.transform.scale || 1;

    if (el.type === "Ink") {
      const flat = asNumberArray(el.props.points);
      const nib = asString(el.props.nib, "pen");
      if (nib === "highlighter") {
        ctx.globalAlpha = 0.36;
        ctx.lineWidth = Math.max(8, width * 4.5 * Math.max(1, strokeWidthScale * 0.9));
      } else if (nib === "pencil") {
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = Math.max(1, width * 0.8 * Math.max(1, strokeWidthScale * 0.9));
      } else {
        ctx.globalAlpha = el.style?.opacity ?? 1;
      }

      if (flat.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(toX(tx + flat[0] * sc), toY(ty + flat[1] * sc));
        for (let i = 2; i + 1 < flat.length; i += 2) {
          ctx.lineTo(toX(tx + flat[i] * sc), toY(ty + flat[i + 1] * sc));
        }
        if (el.props.closed) ctx.closePath();
        ctx.stroke();
      }
    } else if (el.type === "Image") {
      const w = asNumber(el.props.w, 6) * sc * scaleX;
      const h = asNumber(el.props.h, 4) * sc * scaleY;
      const cx = toX(tx);
      const cy = toY(ty);
      const cached = preloadedImages?.get(el.id);
      if (cached) {
        if (el.transform.rotation) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((el.transform.rotation * Math.PI) / 180);
          ctx.drawImage(cached, -w / 2, -h / 2, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(cached, cx - w / 2, cy - h / 2, w, h);
        }
      }
    } else if (el.type === "Point" || el.type === "GeomPoint") {
      const p = pts.get(el.id) ?? { x: tx, y: ty, name: "" };
      ctx.fillStyle = el.style?.stroke ?? "#2563eb";
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), 4.5 * Math.max(1, strokeWidthScale * 0.7), 0, Math.PI * 2);
      ctx.fill();
      if (p.name) {
        ctx.font = `600 ${Math.round(15 * Math.max(1, strokeWidthScale * 0.7))}px system-ui, sans-serif`;
        ctx.fillText(p.name, toX(p.x) + 8, toY(p.y) - 6);
      }
    } else if (el.type === "Rectangle") {
      const w = asNumber(el.props.width, 2.5) * sc * scaleX;
      const h = asNumber(el.props.height, 1.5) * sc * scaleY;
      const cx = toX(tx);
      const cy = toY(ty);
      if (el.style?.fill) {
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    } else if (el.type === "GeomSegment" || el.type === "GeomVector" || el.type === "GeomRay" || el.type === "GeomLine") {
      const p1 = pts.get(asString(el.props.from));
      const p2 = pts.get(asString(el.props.to));
      if (p1 && p2) {
        if (el.props.dashed) ctx.setLineDash([8 * strokeWidthScale, 5 * strokeWidthScale]);
        ctx.beginPath();
        ctx.moveTo(toX(p1.x), toY(p1.y));
        ctx.lineTo(toX(p2.x), toY(p2.y));
        ctx.stroke();
      }
    } else if (el.type === "GeomPolygon") {
      const vids = asStringArray(el.props.vertices);
      if (vids.length >= 2) {
        ctx.beginPath();
        let started = false;
        for (const vid of vids) {
          const p = pts.get(vid);
          if (!p) continue;
          if (!started) {
            ctx.moveTo(toX(p.x), toY(p.y));
            started = true;
          } else {
            ctx.lineTo(toX(p.x), toY(p.y));
          }
        }
        ctx.closePath();
        if (el.style?.fill) {
          ctx.fillStyle = el.style.fill;
          ctx.fill();
        }
        ctx.stroke();
      }
    } else if (el.type === "GeomCircle") {
      const c = pts.get(asString(el.props.center));
      const rObj = el.props.radius;
      let r = 2;
      if (isRecord(rObj) && rObj.kind === "value") {
        r = asNumber(rObj.v, 2);
      } else if (isRecord(rObj) && rObj.kind === "through" && c) {
        const tp = pts.get(asString(rObj.point));
        if (tp) r = Math.hypot(tp.x - c.x, tp.y - c.y);
      }
      if (c) {
        ctx.beginPath();
        ctx.arc(toX(c.x), toY(c.y), Math.max(2, r * (scaleX + scaleY) / 2), 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (el.type === "MathText") {
      const latex = asString(el.props.latex, "");
      const cx = toX(tx);
      const cy = toY(ty);
      ctx.fillStyle = stroke;
      ctx.font = `600 ${Math.max(16, Math.round(18 * strokeWidthScale))}px "KaTeX_Main", "Cambria Math", "Georgia", serif`;
      const cleanText = latex
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
        .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
        .replace(/\\cdot/g, "·")
        .replace(/\\times/g, "×")
        .replace(/\\pm/g, "±")
        .replace(/\\alpha/g, "α")
        .replace(/\\beta/g, "β")
        .replace(/\\pi/g, "π")
        .replace(/\\theta/g, "θ")
        .replace(/\\left|\\right/g, "")
        .replace(/[{}]/g, "");
      ctx.fillText(cleanText || latex, cx, cy);
    } else if (el.type === "Table") {
      const cells = Array.isArray(el.props.cells) ? el.props.cells : [];
      const rows = Math.max(1, cells.length);
      const cols = Math.max(1, Array.isArray(cells[0]) ? cells[0].length : 1);
      const cellW = 2.2 * sc * scaleX;
      const cellH = 0.9 * sc * scaleY;
      const x0 = toX(tx);
      const y0 = toY(ty);
      ctx.strokeStyle = theme.isDark ? "#94a3b8" : "#334155";
      ctx.lineWidth = 1.2 * strokeWidthScale;
      ctx.font = `${Math.round(13 * strokeWidthScale)}px system-ui, sans-serif`;
      ctx.fillStyle = theme.isDark ? "#f1f5f9" : "#0f172a";
      for (let r = 0; r < rows; r++) {
        const row = Array.isArray(cells[r]) ? cells[r] : [];
        for (let c = 0; c < cols; c++) {
          const rx = x0 + c * cellW;
          const ry = y0 + r * cellH;
          ctx.strokeRect(rx, ry, cellW, cellH);
          const txt = typeof row[c] === "string" ? row[c] : "";
          if (txt) {
            ctx.fillText(txt, rx + 8, ry + cellH * 0.62, cellW - 14);
          }
        }
      }
    } else if (el.type === "Axes2D") {
      const ox = toX(tx);
      const oy = toY(ty);
      const span = asNumber(el.props.size, 5) * scaleX;
      ctx.strokeStyle = theme.isDark ? "#94a3b8" : "#475569";
      ctx.beginPath();
      ctx.moveTo(ox - span, oy);
      ctx.lineTo(ox + span, oy);
      ctx.moveTo(ox, oy + span);
      ctx.lineTo(ox, oy - span);
      ctx.stroke();
    }
    ctx.restore();
  }

  return canvas;
}

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const parts = dataUrl.split(",");
  const b64 = parts[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((result) => resolve(result), "image/png");
    } catch {
      resolve(null);
    }
  });
  if (blob && blob.size > 100) {
    return blob;
  }
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrlToBlob(dataUrl, "image/png");
}

async function hasValidPngMagic(blob: Blob): Promise<boolean> {
  if (blob.size <= 100) return false;
  const buf = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  return PNG_MAGIC.every((byte, idx) => buf[idx] === byte);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read Blob as DataURL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Preloads all raster Image elements on the page so Canvas2D can draw them synchronously.
 */
async function preloadImages(elements: CanvasElement[]): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  if (typeof Image === "undefined") return map;
  const imageEls = elements.filter(
    (el) => el.type === "Image" && typeof el.props?.src === "string" && el.props.src
  );
  await Promise.all(
    imageEls.map((el) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          map.set(el.id, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = el.props.src as string;
      });
    })
  );
  return map;
}

/**
 * Exports current board page as a High-DPI PNG Blob (`bang-toan.png`).
 * Guarantees correct A4 Portrait / Landscape aspect ratio, High-DPI (300 DPI scale),
 * and valid PNG magic header >100 bytes even on empty boards.
 */
export async function exportPNG(
  svgOrRootElement: SVGSVGElement | HTMLElement | null,
  doc: Y.Doc,
  page?: number,
  options?: { whitePaper?: boolean }
): Promise<Blob> {
  const pageNum = page ?? 1;
  const elements = getVisiblePageElements(doc, pageNum);
  const rawConfig = readPageBoardConfig(doc, pageNum);
  const format = rawConfig.format ?? "infinite";
  const isA4 = format === "a4_portrait" || format === "a4_landscape";

  const boardConfig: PageBoardConfig = options?.whitePaper
    ? {
        ...rawConfig,
        surface: "white",
      }
    : rawConfig;
  const theme = resolveBoardColors(boardConfig);

  // Standard print-quality High-DPI dimensions (scale ~3.5 gives crisp 300 DPI)
  let widthPx = 2083;
  let heightPx = 2946;
  let viewBox = { minX: -8.5, minY: 0, width: 17, height: 24.04 };

  if (format === "a4_portrait") {
    widthPx = 2083;
    heightPx = 2946;
    const pageTop = (pageNum - 1) * (24.04 + 0.8);
    viewBox = { minX: -8.5, minY: pageTop, width: 17, height: 24.04 };
  } else if (format === "a4_landscape") {
    widthPx = 2946;
    heightPx = 2083;
    const pageTop = (pageNum - 1) * (17 + 0.8);
    viewBox = { minX: -12.02, minY: pageTop, width: 24.04, height: 17 };
  } else {
    // Infinite mode: determine bounds from visible elements
    const bbox = computePageContentBounds(elements);
    if (bbox) {
      const aspect = bbox.width / Math.max(0.5, bbox.height);
      const maxDim = 2400;
      if (aspect >= 1) {
        widthPx = maxDim;
        heightPx = Math.max(600, Math.min(3200, Math.round(maxDim / aspect)));
      } else {
        heightPx = maxDim;
        widthPx = Math.max(600, Math.min(3200, Math.round(maxDim * aspect)));
      }
      viewBox = { minX: bbox.minX, minY: -bbox.maxY, width: bbox.width, height: bbox.height };
    } else {
      widthPx = 2083;
      heightPx = 2946;
      viewBox = { minX: -8.5, minY: 0, width: 17, height: 24.04 };
    }
  }

  // Preload any raster images (e.g. inserted PDF pages or uploaded photos)
  const preloaded = await preloadImages(elements);

  // If board has no elements or no DOM target is available, use direct Canvas2D
  if (elements.length === 0 || !svgOrRootElement) {
    const fallbackCanvas = renderElementsToCanvas2D(
      elements,
      widthPx,
      heightPx,
      boardConfig,
      pageNum,
      preloaded
    );
    return canvasToPngBlob(fallbackCanvas);
  }

  // Try DOM/SVG capture with correct viewBox framing
  try {
    const svgEl =
      svgOrRootElement instanceof SVGSVGElement
        ? svgOrRootElement
        : svgOrRootElement.querySelector<SVGSVGElement>('svg[data-wb-canvas="true"]');

    if (svgEl) {
      const clone = svgEl.cloneNode(true) as SVGSVGElement;

      // 1. Remove non-exportable overlays (cursors, lasers, floating buttons, handles)
      clone.querySelectorAll('[data-export-skip="true"], [data-laser-spot="true"], [data-laser-stroke="true"], .wb-pdf-page-locks').forEach((node) => node.remove());

      // 2. Remove other pages' sheet elements if in A4 multi-page mode
      if (isA4) {
        clone.querySelectorAll<SVGGElement>('[data-page-sheet]').forEach((sheet) => {
          if (sheet.getAttribute('data-page-sheet') !== String(pageNum)) {
            sheet.remove();
          }
        });
      }

      // 3. Remove outer desk background rect so only paper sheet is visible
      clone.querySelectorAll(':scope > rect').forEach((r) => r.remove());

      // 4. Reset content container transform (children are already in world coordinates)
      const contentG = clone.querySelector<SVGGElement>('g[data-board-content="true"]');
      if (contentG) {
        contentG.removeAttribute("transform");
      }

      // 5. White paper adjustments
      if (options?.whitePaper) {
        const pageRect = clone.querySelector(`rect[data-page-rect="${pageNum}"]`);
        if (pageRect) {
          pageRect.setAttribute("fill", "#ffffff");
          pageRect.setAttribute("stroke", "none");
        }
        // Invert light ink strokes on white paper
        if (theme.isDark) {
          clone.querySelectorAll<SVGPathElement | SVGPolylineElement | SVGLineElement | SVGCircleElement>('path, polyline, line, circle').forEach((el) => {
            const stroke = el.getAttribute("stroke");
            if (stroke && (stroke.toLowerCase() === "#f8fafc" || stroke.toLowerCase() === "#ffffff" || stroke.toLowerCase() === "#fff" || stroke.toLowerCase() === "#f1f5f9")) {
              el.setAttribute("stroke", "#111827");
            }
          });
        }
      }

      // 6. Set precise SVG dimensions and viewBox
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      clone.setAttribute("viewBox", `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`);
      clone.setAttribute("width", String(widthPx));
      clone.setAttribute("height", String(heightPx));

      // 7. Check if there are foreignObjects (e.g. KaTeX)
      const hasForeignObject = clone.querySelector('foreignObject') !== null;
      if (!hasForeignObject) {
        // Fast, high-fidelity SVG rasterization via Image
        const serialized = new XMLSerializer().serializeToString(clone);
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
        const imgBlob = await new Promise<Blob | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = widthPx;
              canvas.height = heightPx;
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(null);
              if (options?.whitePaper) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, widthPx, heightPx);
              }
              ctx.drawImage(img, 0, 0, widthPx, heightPx);
              canvasToPngBlob(canvas).then(resolve).catch(() => resolve(null));
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = svgDataUrl;
        });

        if (imgBlob && (await hasValidPngMagic(imgBlob))) {
          return imgBlob;
        }
      } else if (typeof document !== "undefined") {
        // Use html-to-image on an offscreen mounted container to preserve KaTeX fonts & foreignObjects
        const offscreen = document.createElement("div");
        offscreen.style.position = "fixed";
        offscreen.style.left = "-99999px";
        offscreen.style.top = "-99999px";
        offscreen.style.width = `${widthPx}px`;
        offscreen.style.height = `${heightPx}px`;
        offscreen.style.overflow = "hidden";
        offscreen.style.pointerEvents = "none";
        offscreen.appendChild(clone);
        document.body.appendChild(offscreen);
        try {
          let fontEmbedCSS = "";
          try {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const rules: string[] = [];
            for (const sheet of Array.from(document.styleSheets)) {
              if (sheet.href && origin && !sheet.href.startsWith(origin)) continue;
              try {
                for (const rule of Array.from(sheet.cssRules || [])) {
                  if (rule.type === CSSRule.FONT_FACE_RULE) {
                    rules.push(rule.cssText);
                  }
                }
              } catch {
                // Ignore cross-origin stylesheets that block cssRules access
              }
            }
            fontEmbedCSS = rules.join("\n");
          } catch {
            fontEmbedCSS = "";
          }
          const captured = await toBlob(offscreen, {
            pixelRatio: 1,
            width: widthPx,
            height: heightPx,
            backgroundColor: options?.whitePaper ? "#ffffff" : theme.bg,
            skipFonts: false,
            fontEmbedCSS,
          });
          if (captured && (await hasValidPngMagic(captured))) {
            return captured;
          }
        } finally {
          offscreen.remove();
        }
      }
    }
  } catch (err) {
    console.warn("DOM SVG export failed, falling back to Canvas2D:", err);
  }

  // Fallback to pure high-DPI Canvas2D renderer with preloaded images
  const fallbackCanvas = renderElementsToCanvas2D(
    elements,
    widthPx,
    heightPx,
    boardConfig,
    pageNum,
    preloaded
  );
  return canvasToPngBlob(fallbackCanvas);
}

/**
 * Exports one or more board pages into a single high-quality PDF document.
 * Adheres strictly to boardConfig.format:
 * - "a4_portrait" => True A4 Portrait (595.28 x 841.89 pt)
 * - "a4_landscape" => True A4 Landscape (841.89 x 595.28 pt)
 * - "infinite" => Bounding-box adaptive orientation
 * Zero stretching or warping, full 300 DPI high resolution, edge-to-edge alignment.
 */
export async function exportMultiPagePDF(
  svgOrRootElement: SVGSVGElement | HTMLElement | null,
  doc: Y.Doc,
  pages: number[],
  options?: { whitePaper?: boolean; title?: string }
): Promise<Blob> {
  const whitePaper = options?.whitePaper ?? false;
  const targetPages = pages.length > 0 ? pages : [1];

  let pdf: jsPDF | null = null;

  for (let idx = 0; idx < targetPages.length; idx++) {
    const pageNum = targetPages[idx];
    const rawConfig = readPageBoardConfig(doc, pageNum);
    const format = rawConfig.format ?? "infinite";
    const boardConfig: PageBoardConfig = whitePaper
      ? {
          ...rawConfig,
          surface: "white",
        }
      : rawConfig;
    const theme = resolveBoardColors(boardConfig);

    let widthPt = 595.28;
    let heightPt = 841.89;
    let orientation: "portrait" | "landscape" = "portrait";

    if (format === "a4_portrait") {
      orientation = "portrait";
      widthPt = 595.28;
      heightPt = 841.89;
    } else if (format === "a4_landscape") {
      orientation = "landscape";
      widthPt = 841.89;
      heightPt = 595.28;
    } else {
      const elements = getVisiblePageElements(doc, pageNum);
      const bbox = computePageContentBounds(elements);
      if (bbox) {
        const aspect = bbox.width / Math.max(0.5, bbox.height);
        if (aspect >= 1) {
          orientation = "landscape";
          widthPt = 841.89;
          heightPt = Math.max(360, Math.min(1190, Math.round(841.89 / aspect)));
        } else {
          orientation = "portrait";
          heightPt = 841.89;
          widthPt = Math.max(360, Math.min(1190, Math.round(841.89 * aspect)));
        }
      } else {
        orientation = "portrait";
        widthPt = 595.28;
        heightPt = 841.89;
      }
    }

    if (!pdf) {
      pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [widthPt, heightPt],
      });
      pdf.setProperties({
        title: options?.title || "PhysBoard Whiteboard Export",
        creator: "PhysBoard",
      });
    } else {
      pdf.addPage([widthPt, heightPt], orientation);
    }

    // Set page background color
    const hex = theme.bg.replace(/^#/, "");
    if (!whitePaper && /^[0-9a-fA-F]{6}$/.test(hex)) {
      pdf.setFillColor(
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      );
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(0, 0, widthPt, heightPt, "F");

    try {
      const pngBlob = await exportPNG(svgOrRootElement, doc, pageNum, {
        whitePaper,
      });
      const pngDataUrl = await blobToDataUrl(pngBlob);
      // Place edge-to-edge at (0, 0, widthPt, heightPt) with lossless compression
      pdf.addImage(
        pngDataUrl,
        "PNG",
        0,
        0,
        widthPt,
        heightPt,
        undefined,
        "NONE"
      );
    } catch (err) {
      console.warn(`exportMultiPagePDF: Failed to capture page ${pageNum}`, err);
    }
  }

  if (!pdf) {
    pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: [595.28, 841.89],
    });
  }

  return pdf.output("blob");
}

/**
 * Exports current board page as a PDF Blob (`bang-toan.pdf`) starting with `%PDF-` and >200 bytes.
 * Adheres strictly to the page's format (a4_portrait, a4_landscape, infinite).
 */
export async function exportPDF(
  svgOrRootElement: SVGSVGElement | HTMLElement | null,
  doc: Y.Doc,
  page?: number,
  options?: { whitePaper?: boolean }
): Promise<Blob> {
  return exportMultiPagePDF(svgOrRootElement, doc, [page ?? 1], {
    whitePaper: options?.whitePaper,
    title: "PhysBoard Whiteboard Export",
  });
}

/**
 * Triggers a browser file download for any Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
