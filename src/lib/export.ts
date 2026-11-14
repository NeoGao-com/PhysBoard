import * as Y from "yjs";
import { jsPDF } from "jspdf";
import { toBlob } from "html-to-image";
import { BoundingBox, CanvasElement, CanvasElementSchema } from "@/types/whiteboard";
import { readElement } from "@/lib/dispatcher";
import {
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
  adaptStrokeForBoard,
  readAllPageBoardConfigs,
  readPageBoardConfig,
  resolveBoardColors,
  writeAllPageBoardConfigs,
} from "@/lib/board-themes";

export interface SerializedBoardState {
  version: 2;
  roomId?: string;
  pages: { cur: number; count: number };
  boardPages?: Record<string, PageBoardConfig>;
  objects: CanvasElement[];
}

export interface TikZExportOptions {
  includePreamble?: boolean;
  blackAndWhite?: boolean;
  compactMacros?: boolean;
}

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
 */
export function renderElementsToCanvas2D(
  elements: CanvasElement[],
  widthPx = 1200,
  heightPx = 760,
  boardConfig: PageBoardConfig = DEFAULT_PAGE_BOARD_CONFIG
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const theme = resolveBoardColors(boardConfig);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (boardConfig.pattern !== "none") {
    const sp = theme.spacingPx;
    if (boardConfig.pattern === "dots") {
      ctx.fillStyle = theme.dotFill;
      for (let x = sp / 2; x < widthPx; x += sp) {
        for (let y = sp / 2; y < heightPx; y += sp) {
          ctx.beginPath();
          ctx.arc(x, y, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (boardConfig.pattern === "ruled") {
      ctx.strokeStyle = theme.ruledStroke;
      ctx.lineWidth = 1;
      for (let y = sp; y < heightPx; y += sp) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthPx, y);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle =
        boardConfig.pattern === "graph" ? theme.subGridStroke : theme.gridStroke;
      ctx.lineWidth = 1;
      for (let x = 0; x < widthPx; x += sp) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightPx);
        ctx.stroke();
      }
      for (let y = 0; y < heightPx; y += sp) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthPx, y);
        ctx.stroke();
      }
      if (boardConfig.pattern === "graph") {
        ctx.strokeStyle = theme.gridStroke;
        ctx.lineWidth = 1.4;
        for (let x = 0; x < widthPx; x += sp * 5) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, heightPx);
          ctx.stroke();
        }
        for (let y = 0; y < heightPx; y += sp * 5) {
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
  const scale = Math.min(availW / bbox.width, availH / bbox.height);
  const toX = (wx: number) => widthPx / 2 + (wx - bbox.centerX) * scale;
  const toY = (wy: number) => heightPx / 2 - (wy - bbox.centerY) * scale;

  const pts = buildPointLookup(elements);

  for (const el of elements) {
    const stroke =
      adaptStrokeForBoard(el.style?.stroke, theme.isDark) ??
      hexToRgba(el.style?.stroke, theme.defaultInkColor);
    const width = asNumber(el.style?.width, 2);
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.fillStyle = hexToRgba(el.style?.fill, "transparent");
    ctx.lineWidth = Math.max(1, width * 1.2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (el.style?.dash) {
      ctx.setLineDash([8, 5]);
    }

    const tx = el.transform.x || 0;
    const ty = el.transform.y || 0;
    const sc = el.transform.scale || 1;

    if (el.type === "Ink") {
      const flat = asNumberArray(el.props.points);
      if (flat.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(toX(tx + flat[0] * sc), toY(ty + flat[1] * sc));
        for (let i = 2; i + 1 < flat.length; i += 2) {
          ctx.lineTo(toX(tx + flat[i] * sc), toY(ty + flat[i + 1] * sc));
        }
        if (el.props.closed) ctx.closePath();
        ctx.stroke();
      }
    } else if (el.type === "Point" || el.type === "GeomPoint") {
      const p = pts.get(el.id) ?? { x: tx, y: ty, name: "" };
      ctx.fillStyle = el.style?.stroke ?? "#2563eb";
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (p.name) {
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.fillText(p.name, toX(p.x) + 8, toY(p.y) - 6);
      }
    } else if (el.type === "Rectangle") {
      const w = asNumber(el.props.width, 2.5) * sc * scale;
      const h = asNumber(el.props.height, 1.5) * sc * scale;
      const cx = toX(tx);
      const cy = toY(ty);
      if (el.style?.fill) {
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    } else if (el.type === "GeomSegment" || el.type === "GeomVector" || el.type === "GeomRay") {
      const p1 = pts.get(asString(el.props.from));
      const p2 = pts.get(asString(el.props.to));
      if (p1 && p2) {
        if (el.props.dashed) ctx.setLineDash([8, 5]);
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
        ctx.arc(toX(c.x), toY(c.y), Math.max(2, r * scale), 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (el.type === "MathText") {
      const latex = asString(el.props.latex, "");
      ctx.fillStyle = stroke;
      ctx.font = "18px Georgia, serif";
      ctx.fillText(latex, toX(tx), toY(ty));
    } else if (el.type === "Table") {
      const cells = Array.isArray(el.props.cells) ? el.props.cells : [];
      const rows = Math.max(1, cells.length);
      const cols = Math.max(1, Array.isArray(cells[0]) ? cells[0].length : 1);
      const cellW = 2.2 * sc * scale;
      const cellH = 0.9 * sc * scale;
      const x0 = toX(tx);
      const y0 = toY(ty);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.2;
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillStyle = "#0f172a";
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
      const span = asNumber(el.props.size, 5) * scale;
      ctx.strokeStyle = "#475569";
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
 * Exports current board page as a High-DPI PNG Blob (`bang-toan.png`).
 * Always guarantees authentic 8-byte PNG magic header and size > 100 bytes even on 0-object boards.
 */
export async function exportPNG(
  svgOrRootElement: SVGSVGElement | HTMLElement | null,
  doc: Y.Doc,
  page?: number,
  options?: { whitePaper?: boolean }
): Promise<Blob> {
  const elements = getVisiblePageElements(doc, page);
  const boardConfig = options?.whitePaper
    ? DEFAULT_PAGE_BOARD_CONFIG
    : readPageBoardConfig(doc, page ?? 1);
  const theme = resolveBoardColors(boardConfig);

  // Empty board or non-DOM context or forced white paper: crisp Canvas2D PNG directly
  if (elements.length === 0 || !svgOrRootElement || options?.whitePaper) {
    const fallbackCanvas = renderElementsToCanvas2D(
      elements,
      1200,
      760,
      boardConfig
    );
    return canvasToPngBlob(fallbackCanvas);
  }

  // Try DOM/SVG capture cleanly, with deterministic Canvas2D fallback
  try {
    const svgEl =
      svgOrRootElement instanceof SVGSVGElement
        ? svgOrRootElement
        : svgOrRootElement.querySelector<SVGSVGElement>('svg[data-wb-canvas="true"]');

    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.querySelectorAll('[data-export-skip="true"]').forEach((node) => node.remove());
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(Math.round(rect.width)));
        clone.setAttribute("height", String(Math.round(rect.height)));
        clone.setAttribute("viewBox", `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);

        const serialized = new XMLSerializer().serializeToString(clone);
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
        const imgBlob = await new Promise<Blob | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              const scale = 2;
              canvas.width = Math.round(rect.width * scale);
              canvas.height = Math.round(rect.height * scale);
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(null);
                return;
              }
              ctx.fillStyle = theme.bg;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
      }
    }

    const htmlTarget: HTMLElement | null =
      svgOrRootElement instanceof HTMLElement
        ? svgOrRootElement
        : svgOrRootElement.parentElement instanceof HTMLElement
          ? svgOrRootElement.parentElement
          : null;

    if (htmlTarget) {
      const rect = htmlTarget.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        const captured = await toBlob(htmlTarget, {
          backgroundColor: theme.bg,
          pixelRatio: 2,
          skipFonts: true,
          filter: (node) =>
            !(node instanceof Element && node.hasAttribute("data-export-skip")),
        });
        if (captured && (await hasValidPngMagic(captured))) {
          return captured;
        }
      }
    }
  } catch {
    // Fall back cleanly to deterministic Canvas2D vector renderer
  }

  const fallbackCanvas = renderElementsToCanvas2D(
    elements,
    1600,
    1000,
    boardConfig
  );
  return canvasToPngBlob(fallbackCanvas);
}

/**
 * Exports current board page as a PDF Blob (`bang-toan.pdf`) starting with `%PDF-` and >200 bytes.
 * Works cleanly on both populated and 0-object empty boards.
 */
export async function exportPDF(
  svgOrRootElement: SVGSVGElement | HTMLElement | null,
  doc: Y.Doc,
  page?: number,
  options?: { whitePaper?: boolean }
): Promise<Blob> {
  const elements = getVisiblePageElements(doc, page);
  const bbox = computePageContentBounds(elements);
  const whitePaper = options?.whitePaper ?? false;
  const boardConfig = whitePaper
    ? DEFAULT_PAGE_BOARD_CONFIG
    : readPageBoardConfig(doc, page ?? 1);
  const theme = resolveBoardColors(boardConfig);

  let widthPt = 842; // A4 landscape pt
  let heightPt = 595;

  if (bbox) {
    const aspect = bbox.width / Math.max(0.5, bbox.height);
    if (aspect >= 1) {
      widthPt = 842;
      heightPt = Math.max(360, Math.min(1190, Math.round(842 / aspect)));
    } else {
      heightPt = 842;
      widthPt = Math.max(360, Math.min(1190, Math.round(842 * aspect)));
    }
  }

  const pdf = new jsPDF({
    orientation: widthPt >= heightPt ? "landscape" : "portrait",
    unit: "pt",
    format: [widthPt, heightPt],
  });
  pdf.setProperties({
    title: "PhysBoard Whiteboard Export",
    creator: "PhysBoard",
  });
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

  if (elements.length > 0 || !whitePaper) {
    try {
      const pngBlob = await exportPNG(svgOrRootElement, doc, page, {
        whitePaper,
      });
      const pngDataUrl = await blobToDataUrl(pngBlob);
      const pad = 16;
      pdf.addImage(
        pngDataUrl,
        "PNG",
        pad,
        pad,
        widthPt - pad * 2,
        heightPt - pad * 2,
        undefined,
        "FAST"
      );
    } catch {
      // Even if image embedding fails, empty white PDF remains valid %PDF-
    }
  }

  return pdf.output("blob");
}

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
    const elements = getVisiblePageElements(doc, pageNum);
    const bbox = computePageContentBounds(elements);
    const boardConfig = whitePaper
      ? DEFAULT_PAGE_BOARD_CONFIG
      : readPageBoardConfig(doc, pageNum);
    const theme = resolveBoardColors(boardConfig);

    let widthPt = 842;
    let heightPt = 595;

    if (bbox) {
      const aspect = bbox.width / Math.max(0.5, bbox.height);
      if (aspect >= 1) {
        widthPt = 842;
        heightPt = Math.max(360, Math.min(1190, Math.round(842 / aspect)));
      } else {
        heightPt = 842;
        widthPt = Math.max(360, Math.min(1190, Math.round(842 * aspect)));
      }
    }

    const orientation = widthPt >= heightPt ? "landscape" : "portrait";

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

    if (elements.length > 0 || !whitePaper) {
      try {
        const pngBlob = await exportPNG(svgOrRootElement, doc, pageNum, {
          whitePaper,
        });
        const pngDataUrl = await blobToDataUrl(pngBlob);
        const pad = 16;
        pdf.addImage(
          pngDataUrl,
          "PNG",
          pad,
          pad,
          widthPt - pad * 2,
          heightPt - pad * 2,
          undefined,
          "FAST"
        );
      } catch {
        // Fallback gracefully
      }
    }
  }

  return pdf ? pdf.output("blob") : new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" });
}

function hexToTikzColor(hex: string | null | undefined, bw: boolean): string {
  if (bw || !hex || typeof hex !== "string") return "black";
  const clean = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `{rgb,255:red,${r};green,${g};blue,${b}}`;
  }
  return "black";
}

function formatNum(n: number): string {
  return Number.isFinite(n) ? Number(n.toFixed(3)).toString() : "0";
}

function escapeTikzText(text: string): string {
  return text.replace(/([%&#_{}])/g, "\\$1");
}

/**
 * Generates valid LaTeX `\begin{tikzpicture}...\end{tikzpicture}` code for all elements on the page.
 * Emits a valid empty `tikzpicture` environment even on a 0-object board.
 */
export function exportTikZ(
  doc: Y.Doc,
  page?: number,
  options: TikZExportOptions = {}
): string {
  const targetPage = page ?? 1;
  const elements = getVisiblePageElements(doc, targetPage);
  const bw = options.blackAndWhite ?? false;
  const includePreamble = options.includePreamble ?? false;
  const compactMacros = options.compactMacros ?? false;

  const lines: string[] = [];

  if (includePreamble) {
    lines.push("% Preamble LaTeX gợi ý:");
    lines.push("% \\usepackage{tikz,tkz-euclide,tkz-tab}");
    lines.push("% \\usetikzlibrary{arrows.meta,calc,angles,quotes}");
    lines.push("");
  }

  lines.push(`% PhysBoard — Trang ${targetPage}`);
  lines.push("\\begin{tikzpicture}[scale=1, line cap=round, line join=round]");

  if (elements.length === 0) {
    lines.push(`  % Bảng trống (chưa có đối tượng trên trang ${targetPage})`);
    lines.push("\\end{tikzpicture}");
    return lines.join("\n");
  }

  const pts = buildPointLookup(elements);
  const coordNameMap = new Map<string, string>();
  let ptIdx = 0;
  for (const el of elements) {
    if (el.type === "Point" || el.type === "GeomPoint") {
      const rawName = asString(el.props.name, "").replace(/[^a-zA-Z0-9]/g, "");
      const cname = rawName || `P${++ptIdx}`;
      coordNameMap.set(el.id, cname);
    }
  }

  for (const el of elements) {
    const color = hexToTikzColor(el.style?.stroke, bw);
    const lw = `${formatNum(asNumber(el.style?.width, 1.6) * 0.5)}pt`;
    const dashOpt = el.style?.dash ? ", dashed" : "";
    const tx = el.transform.x || 0;
    const ty = el.transform.y || 0;
    const sc = el.transform.scale || 1;

    switch (el.type) {
      case "Ink": {
        const flat = asNumberArray(el.props.points);
        if (flat.length < 2) break;
        const coords: string[] = [];
        const step = flat.length > 120 ? 4 : 2;
        for (let i = 0; i + 1 < flat.length; i += step) {
          const x = tx + flat[i] * sc;
          const y = ty + flat[i + 1] * sc;
          coords.push(`(${formatNum(x)},${formatNum(y)})`);
        }
        const suffix = el.props.closed ? " -- cycle" : "";
        lines.push(`  \\draw[color=${color}, line width=${lw}${dashOpt}] ${coords.join(" -- ")}${suffix};`);
        break;
      }

      case "Point":
      case "GeomPoint": {
        const p = pts.get(el.id) ?? { x: tx, y: ty, name: "" };
        const cname = coordNameMap.get(el.id) ?? "P";
        const label = p.name ? `$${p.name}$` : "";
        if (compactMacros) {
          lines.push(`  \\tkzDefPoint(${formatNum(p.x)},${formatNum(p.y)}){${cname}}`);
          if (label && !el.props.hideName) {
            lines.push(`  \\tkzDrawPoint(${cname}) \\tkzLabelPoint[above right](${cname}){${label}}`);
          }
        } else {
          lines.push(`  \\coordinate (${cname}) at (${formatNum(p.x)},${formatNum(p.y)});`);
          const labelPart = label && !el.props.hideName ? ` node[above right] {${label}}` : "";
          lines.push(`  \\fill[${color}] (${cname}) circle (1.6pt)${labelPart};`);
        }
        break;
      }

      case "Rectangle": {
        const w = asNumber(el.props.width, 2) * sc;
        const h = asNumber(el.props.height, 1.5) * sc;
        lines.push(
          `  \\draw[color=${color}, line width=${lw}${dashOpt}] (${formatNum(tx - w / 2)},${formatNum(ty - h / 2)}) rectangle (${formatNum(tx + w / 2)},${formatNum(ty + h / 2)});`
        );
        break;
      }

      case "GeomSegment": {
        const a = coordNameMap.get(asString(el.props.from));
        const b = coordNameMap.get(asString(el.props.to));
        if (a && b) {
          const dOpt = el.props.dashed ? ", dashed" : dashOpt;
          lines.push(`  \\draw[color=${color}, line width=${lw}${dOpt}] (${a}) -- (${b});`);
        }
        break;
      }

      case "GeomVector": {
        const a = coordNameMap.get(asString(el.props.from));
        const b = coordNameMap.get(asString(el.props.to));
        if (a && b) {
          lines.push(`  \\draw[->, color=${color}, line width=${lw}${dashOpt}] (${a}) -- (${b});`);
        }
        break;
      }

      case "GeomRay":
      case "GeomLine": {
        const p1 = pts.get(asString(el.props.from ?? el.props.a));
        const p2 = pts.get(asString(el.props.to ?? el.props.b));
        if (p1 && p2) {
          lines.push(
            `  \\draw[color=${color}, line width=${lw}${dashOpt}] (${formatNum(p1.x)},${formatNum(p1.y)}) -- (${formatNum(p2.x)},${formatNum(p2.y)});`
          );
        }
        break;
      }

      case "GeomPolygon": {
        const vids = asStringArray(el.props.vertices);
        const names = vids.map((id) => {
          const n = coordNameMap.get(id);
          if (n) return `(${n})`;
          const p = pts.get(id);
          return p ? `(${formatNum(p.x)},${formatNum(p.y)})` : null;
        }).filter((v): v is string => v !== null);
        if (names.length >= 2) {
          lines.push(`  \\draw[color=${color}, line width=${lw}${dashOpt}] ${names.join(" -- ")} -- cycle;`);
        }
        break;
      }

      case "GeomCircle": {
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
          lines.push(
            `  \\draw[color=${color}, line width=${lw}${dashOpt}] (${formatNum(c.x)},${formatNum(c.y)}) circle (${formatNum(r)});`
          );
        }
        break;
      }

      case "MathText": {
        const latex = asString(el.props.latex, "");
        lines.push(`  \\node[${color}] at (${formatNum(tx)},${formatNum(ty)}) {$${latex}$};`);
        break;
      }

      case "Axes2D": {
        const size = asNumber(el.props.size, 5);
        lines.push(
          `  \\draw[->] (${formatNum(tx - size)},${formatNum(ty)}) -- (${formatNum(tx + size)},${formatNum(ty)}) node[right] {$x$};`
        );
        lines.push(
          `  \\draw[->] (${formatNum(tx)},${formatNum(ty - size)}) -- (${formatNum(tx)},${formatNum(ty + size)}) node[above] {$y$};`
        );
        lines.push(`  \\node[below left] at (${formatNum(tx)},${formatNum(ty)}) {$O$};`);
        break;
      }

      case "Plot": {
        const expr = asString(el.props.exprLatex, "x");
        const dom = Array.isArray(el.props.domain) ? el.props.domain : [-4, 4];
        const d0 = asNumber(dom[0], -4);
        const d1 = asNumber(dom[1], 4);
        lines.push(
          `  % Đồ thị: y = ${expr}`
        );
        lines.push(
          `  \\draw[color=${color}, line width=${lw}, domain=${formatNum(d0)}:${formatNum(d1)}, samples=80, smooth] plot (\\x, {\\x});`
        );
        break;
      }

      case "Table": {
        const cells = Array.isArray(el.props.cells) ? el.props.cells : [];
        const rows = cells.length;
        const cols = Array.isArray(cells[0]) ? cells[0].length : 0;
        if (rows > 0 && cols > 0) {
          const cw = 1.8;
          const ch = 0.7;
          for (let r = 0; r < rows; r++) {
            const row = Array.isArray(cells[r]) ? cells[r] : [];
            for (let c = 0; c < cols; c++) {
              const rx = tx + c * cw;
              const ry = ty - r * ch;
              lines.push(
                `  \\draw (${formatNum(rx)},${formatNum(ry)}) rectangle (${formatNum(rx + cw)},${formatNum(ry - ch)});`
              );
              const txt = typeof row[c] === "string" ? row[c] : "";
              if (txt) {
                lines.push(
                  `  \\node at (${formatNum(rx + cw / 2)},${formatNum(ry - ch / 2)}) {${escapeTikzText(txt)}};`
                );
              }
            }
          }
        }
        break;
      }

      default: {
        lines.push(`  % Đối tượng ${el.type} (${el.id}) tại (${formatNum(tx)}, ${formatNum(ty)})`);
        break;
      }
    }
  }

  lines.push("\\end{tikzpicture}");
  return lines.join("\n");
}

/**
 * Serializes full whiteboard Y.Doc state (objects + multi-page state) to JSON v2.
 */
export function serializeState(doc: Y.Doc, roomId?: string): string {
  const objectsArr = doc.getArray<Y.Map<unknown>>("objects");
  const pagesMap = doc.getMap<number>("pages");
  const objects: CanvasElement[] = [];

  for (let i = 0; i < objectsArr.length; i++) {
    objects.push(readElement(objectsArr.get(i)));
  }

  const cur = pagesMap.get("cur") ?? 1;
  const count = pagesMap.get("count") ?? 1;
  const boardPages = readAllPageBoardConfigs(doc);

  const payload: SerializedBoardState = {
    version: 2,
    ...(roomId ? { roomId } : {}),
    pages: {
      cur: typeof cur === "number" && cur >= 1 ? cur : 1,
      count: typeof count === "number" && count >= 1 ? count : 1,
    },
    ...(Object.keys(boardPages).length > 0 ? { boardPages } : {}),
    objects,
  };

  return JSON.stringify(payload, null, 2);
}

function writePlainToYMap(target: Y.Map<unknown>, obj: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      target.set(k, v);
    }
  }
}

/**
 * Restores a serialized JSON v2 whiteboard state into the target Y.Doc atomically.
 */
export function loadState(
  doc: Y.Doc,
  json: string | SerializedBoardState
): { ok: boolean; count: number; error?: string } {
  try {
    const parsed: unknown = typeof json === "string" ? JSON.parse(json) : json;
    if (!isRecord(parsed) || !Array.isArray(parsed.objects)) {
      return { ok: false, count: 0, error: "Định dạng JSON bảng không hợp lệ (thiếu mảng objects)." };
    }

    const validElements: CanvasElement[] = [];
    for (const raw of parsed.objects) {
      const check = CanvasElementSchema.safeParse(raw);
      if (check.success) {
        validElements.push(check.data);
      }
    }

    doc.transact(() => {
      const arr = doc.getArray<Y.Map<unknown>>("objects");
      if (arr.length > 0) {
        arr.delete(0, arr.length);
      }

      const yElements = validElements.map((el) => {
        const yEl = new Y.Map<unknown>();
        yEl.set("id", el.id);
        yEl.set("type", el.type);

        const tMap = new Y.Map<unknown>();
        writePlainToYMap(tMap, el.transform as Record<string, unknown>);
        yEl.set("transform", tMap);

        const sMap = new Y.Map<unknown>();
        writePlainToYMap(sMap, el.style as Record<string, unknown>);
        yEl.set("style", sMap);

        const mMap = new Y.Map<unknown>();
        writePlainToYMap(mMap, el.meta as Record<string, unknown>);
        yEl.set("meta", mMap);

        const pMap = new Y.Map<unknown>();
        writePlainToYMap(pMap, el.props as Record<string, unknown>);
        yEl.set("props", pMap);

        return yEl;
      });

      if (yElements.length > 0) {
        arr.push(yElements);
      }

      const pagesMap = doc.getMap<number>("pages");
      if (isRecord(parsed.pages)) {
        const count = Math.max(1, asNumber(parsed.pages.count, 1));
        const cur = Math.min(count, Math.max(1, asNumber(parsed.pages.cur, 1)));
        pagesMap.set("count", count);
        pagesMap.set("cur", cur);
      } else {
        pagesMap.set("count", 1);
        pagesMap.set("cur", 1);
      }

      if (isRecord(parsed.boardPages)) {
        writeAllPageBoardConfigs(doc, parsed.boardPages);
      } else {
        writeAllPageBoardConfigs(doc, undefined);
      }
    });

    return { ok: true, count: validElements.length };
  } catch (err) {
    return {
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : "Không thể đọc file JSON.",
    };
  }
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

/**
 * Triggers a browser file download for UTF-8 text content.
 */
export function downloadText(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}
