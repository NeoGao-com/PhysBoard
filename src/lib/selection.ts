import {
  CanvasElement,
  BoundingBox,
  TransformHandle,
} from "@/types/whiteboard";
import {
  type EmbeddedVertex,
  type Point2D,
  getGeometryBoundingBox,
  resolveGeomConstructionGeometry,
  resolveLineEndpoints,
} from "@/lib/geometry";
import {
  type Solid3DKind,
  type Solved3DScene,
  resolveOxyzBounds,
  solveGeometry3D,
} from "@/lib/geometry3d";

export const COLOR_PRESETS = [
  { hex: "#1e1e1e", name: "Đen" },
  { hex: "#1565C0", name: "Xanh dương" },
  { hex: "#DC2626", name: "Đỏ" },
  { hex: "#16A34A", name: "Xanh lá" },
  { hex: "#e8590c", name: "Cam" },
  { hex: "#6741d9", name: "Tím" },
  { hex: "#c2255c", name: "Hồng" },
  { hex: "#0c8599", name: "Xanh ngọc" },
  { hex: "#f08c00", name: "Vàng đậm" },
  { hex: "#868e96", name: "Xám" },
] as const;

export const STROKE_WIDTH_PRESETS = [
  { px: 1, name: "Mảnh" },
  { px: 2, name: "Vừa" },
  { px: 3.5, name: "Đậm" },
  { px: 6, name: "Rất đậm" },
] as const;

export const STROKE_STYLE_PRESETS = [
  { v: false, name: "Liền", d: undefined },
  { v: true, name: "Đứt", d: "5 4" },
] as const;

const DRAW_STYLE_STORAGE_KEY = "wb_draw_style";

export interface StoredDrawStyle {
  stroke: string | null;
  width: number | null;
  dash: boolean | null;
}

export function getSavedDrawStyle(): StoredDrawStyle {
  if (typeof window === "undefined") {
    return { stroke: null, width: null, dash: null };
  }
  try {
    const raw = localStorage.getItem(DRAW_STYLE_STORAGE_KEY);
    if (!raw) return { stroke: null, width: null, dash: null };
    const parsed = JSON.parse(raw);
    return {
      stroke: typeof parsed.stroke === "string" ? parsed.stroke : null,
      width: typeof parsed.width === "number" ? parsed.width : null,
      dash: typeof parsed.dash === "boolean" ? parsed.dash : null,
    };
  } catch {
    return { stroke: null, width: null, dash: null };
  }
}

export function saveDrawStyle(style: StoredDrawStyle): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAW_STYLE_STORAGE_KEY, JSON.stringify(style));
  } catch {
    // Ignore storage quota or access errors
  }
}

function makeBox(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): BoundingBox {
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function boxFromPoints(pts: Point2D[]): BoundingBox | null {
  if (pts.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return null;
  return makeBox(minX, maxX, minY, maxY);
}

/**
 * Hydrates inline self-contained coordinates (`fromPt`, `toPt`, `centerPt`) onto a solved point map
 * when standalone `GeomPoint` entities are absent.
 */
export function hydrateInlinePoints(
  elements: CanvasElement[],
  pts: Map<string, Point2D>
): Map<string, Point2D> {
  const out = new Map(pts);
  for (const el of elements) {
    const tx = el.transform.x || 0;
    const ty = el.transform.y || 0;
    const p = el.props;
    const addInline = (idKey: string, ptKey: string) => {
      const id = typeof p[idKey] === "string" ? (p[idKey] as string) : "";
      const rawPt = p[ptKey] as Point2D | undefined;
      if (
        id &&
        !out.has(id) &&
        rawPt &&
        typeof rawPt.x === "number" &&
        typeof rawPt.y === "number"
      ) {
        out.set(id, { x: rawPt.x + tx, y: rawPt.y + ty });
      }
    };
    addInline("from", "fromPt");
    addInline("to", "toPt");
    addInline("center", "centerPt");
  }
  return out;
}

/**
 * Computes tight bounding box for Ink elements in math world space.
 */
export function getInkBoundingBox(element: CanvasElement): BoundingBox {
  const points = (element.props.points as number[]) || [];
  const tx = element.transform.x || 0;
  const ty = element.transform.y || 0;
  const scale = element.transform.scale || 1;

  if (points.length < 2) {
    return makeBox(tx, tx, ty, ty);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < points.length; i += 2) {
    const wx = tx + points[i] * scale;
    const wy = ty + points[i + 1] * scale;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy;
    if (wy > maxY) maxY = wy;
  }

  return makeBox(minX, maxX, minY, maxY);
}

/**
 * Computes world-space bounding box for any CanvasElement type.
 */
function estimateLatexBoxPx(latex: string): { w: number; h: number } {
  const raw = String(latex ?? "").trim();
  if (!raw) return { w: 48, h: 38 };

  const hasStacked = /\\(?:frac|dfrac|tfrac|int|iint|iiint|oint|sum|prod|lim|begin)/.test(
    raw
  );

  // Strip command prefixes while counting symbolic operators/letters visually
  let s = raw
    .replace(/\\textbackslash(?:\{\}|\s*)|\\backslash\s*/g, "")
    .replace(/\\textasciicircum(?:\{\}|\s*)/g, "")
    .replace(/\\(?:mleft|mright|left|right|mathrm|mathbf|textbf|textit|text|displaystyle|limits|nolimits|quad|qquad)/g, "")
    .replace(/\\(?:frac|dfrac|tfrac|sqrt|vec|overrightarrow|widehat|overline|underline|hat|tilde|begin\{[^}]*\}|end\{[^}]*\})/g, "")
    .replace(/\\[,;:!\s]/g, "")
    .replace(/\\(?:sin|cos|tan|cot|sec|csc|log|ln|lim|exp)/g, (m) => m.slice(1))
    .replace(/\\[a-zA-Z]+/g, "X")
    .replace(/[{}^_\\]/g, "");

  s = s.replace(/\s+/g, " ").trim();
  const glyphCount = Math.max(1, s.length);
  const effectiveUnits = /\\(?:frac|dfrac|tfrac)/.test(raw)
    ? glyphCount * 0.72
    : glyphCount;

  const w = Math.max(44, Math.round(effectiveUnits * 12) + 20);
  const h = hasStacked ? 52 : 38;
  return { w, h };
}

export function getElementBoundingBox(
  el: CanvasElement,
  context?: {
    solved?: Solved3DScene;
    byId?: Map<string, CanvasElement>;
    allElements?: CanvasElement[];
    viewScale?: number;
  }
): BoundingBox {
  const allElements = context?.allElements ?? [el];
  const byId =
    context?.byId ?? new Map(allElements.map((item) => [item.id, item]));
  const baseSolved = context?.solved ?? solveGeometry3D(allElements);
  const solved: Solved3DScene = context?.solved
    ? baseSolved
    : { ...baseSolved, pts: hydrateInlinePoints(allElements, baseSolved.pts) };
  const viewScale = context?.viewScale || 45;
  const tx = el.transform.x || 0;
  const ty = el.transform.y || 0;
  const sc = el.transform.scale || 1;

  if (el.type === "Ink") {
    return getInkBoundingBox(el);
  }

  if (el.type === "Rectangle") {
    const w = ((el.props?.width as number) || 2.5) * sc;
    const h = ((el.props?.height as number) || 1.6) * sc;
    return makeBox(tx - w / 2, tx + w / 2, ty - h / 2, ty + h / 2);
  }

  if (
    el.type === "Point" ||
    el.type === "GeomPoint" ||
    el.type === "GeomSegment" ||
    el.type === "GeomVector" ||
    el.type === "GeomRay" ||
    el.type === "GeomLine" ||
    el.type === "GeomCircle" ||
    el.type === "GeomPolygon" ||
    el.type === "GeomAngle" ||
    el.type === "FillRegion"
  ) {
    const gBox = getGeometryBoundingBox(el, solved.pts, byId);
    if (gBox) return gBox;
  }

  if (el.type === "GeomConstruction") {
    const resolved = resolveGeomConstructionGeometry(el, solved.pts, byId);
    if (resolved) {
      const pts = [
        resolved.pFrom,
        resolved.pTo,
        resolved.pSideA,
        resolved.pSideB,
      ].filter((pt): pt is Point2D => pt !== undefined);
      const b = boxFromPoints(pts);
      if (b) return b;
    }
  }

  if (el.type === "Solid3D") {
    const ptIds = Array.isArray(el.props.points)
      ? (el.props.points as string[])
      : [];
    const inlineCoords = Array.isArray(el.props.pointCoords)
      ? (el.props.pointCoords as Point2D[])
      : [];
    const pts: Point2D[] = [];
    for (let i = 0; i < ptIds.length; i++) {
      const resolved = solved.pts.get(ptIds[i]);
      if (resolved) {
        pts.push(resolved);
      } else if (inlineCoords[i]) {
        pts.push({
          x: inlineCoords[i].x + tx,
          y: inlineCoords[i].y + ty,
        });
      }
    }
    const baseBox = boxFromPoints(pts);
    if (baseBox) {
      const kind = el.props.kind as Solid3DKind | undefined;
      let r = typeof el.props.r === "number" ? el.props.r : 1.3;
      if (kind === "sphere" && typeof el.props.through === "string") {
        const c3 = ptIds[0] ? solved.p3.get(ptIds[0]) : undefined;
        const t3 = solved.p3.get(el.props.through);
        if (c3 && t3) {
          r = Math.hypot(c3.x - t3.x, c3.y - t3.y, c3.z - t3.z) || r;
        }
      }
      if (kind === "cone" && pts.length >= 2) {
        const apex = pts[0];
        const base = pts[1];
        const ry = r * 0.34;
        return makeBox(
          Math.min(apex.x, base.x - r),
          Math.max(apex.x, base.x + r),
          Math.min(apex.y, base.y - ry),
          Math.max(apex.y, base.y + ry)
        );
      }
      if (kind === "cylinder" && pts.length >= 2) {
        const ry = r * 0.34;
        return makeBox(
          baseBox.minX - r,
          baseBox.maxX + r,
          baseBox.minY - ry,
          baseBox.maxY + ry
        );
      }
      if (kind === "sphere") {
        return makeBox(
          baseBox.minX - r,
          baseBox.maxX + r,
          baseBox.minY - r,
          baseBox.maxY + r
        );
      }
      return baseBox;
    }
  }

  if (el.type === "Axes3D") {
    const b = resolveOxyzBounds(el.props);
    return makeBox(
      tx - Math.max(b.x.neg * 0.6, b.y.neg, 2) * sc,
      tx + Math.max(b.y.pos, 3) * sc,
      ty - Math.max(b.x.pos * 0.6, b.z.neg, 2) * sc,
      ty + Math.max(b.z.pos, 3) * sc
    );
  }

  if (
    el.type === "RoundSection" ||
    el.type === "OrthoViews" ||
    el.type === "Revolution" ||
    el.type === "SpaceFigure"
  ) {
    const targetId =
      (el.props.solid as string) ||
      (el.props.source as string) ||
      (el.props.axes as string);
    const target = targetId ? byId.get(targetId) : undefined;
    if (target) {
      const tb = getElementBoundingBox(target, {
        solved,
        byId,
        allElements,
        viewScale,
      });
      if (el.type === "OrthoViews") {
        return makeBox(tb.maxX + 1, tb.maxX + 7, tb.minY - 1, tb.maxY + 1);
      }
      return tb;
    }
    return makeBox(tx - 2, tx + 2, ty - 2, ty + 2);
  }

  if (el.type === "MathText") {
    const latex = typeof el.props.latex === "string" ? el.props.latex : "";
    const { w: pxW, h: pxH } = estimateLatexBoxPx(latex);
    const leftOff = (4 / viewScale) * sc;
    const w = (pxW / viewScale) * sc;
    const h = (pxH / viewScale) * sc;
    return makeBox(tx - leftOff, tx - leftOff + w, ty - h / 2, ty + h / 2);
  }

  if (el.type === "Table") {
    const cells = Array.isArray(el.props.cells) ? el.props.cells : [[""]];
    const rows = Math.max(1, cells.length);
    const cols = Math.max(
      1,
      Array.isArray(cells[0]) ? cells[0].length : 2
    );
    const w = ((cols * 80) / viewScale) * sc;
    const h = ((rows * 34) / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "Image") {
    const w = (typeof el.props.w === "number" ? el.props.w : 6) * sc;
    const h = (typeof el.props.h === "number" ? el.props.h : 4) * sc;
    return makeBox(tx - w / 2, tx + w / 2, ty - h / 2, ty + h / 2);
  }

  if (el.type === "Axes2D") {
    const sz = typeof el.props.size === "number" ? el.props.size : 5;
    const xPos = typeof el.props.xPos === "number" ? el.props.xPos : (typeof el.props.sizeX === "number" ? el.props.sizeX : sz);
    const xNeg = typeof el.props.xNeg === "number" ? el.props.xNeg : (typeof el.props.sizeX === "number" ? el.props.sizeX : sz);
    const yPos = typeof el.props.yPos === "number" ? el.props.yPos : (typeof el.props.sizeY === "number" ? el.props.sizeY : sz);
    const yNeg = typeof el.props.yNeg === "number" ? el.props.yNeg : (typeof el.props.sizeY === "number" ? el.props.sizeY : sz);
    return makeBox(tx - xNeg * sc, tx + xPos * sc, ty - yNeg * sc, ty + yPos * sc);
  }

  if (
    el.type === "Plot" ||
    el.type === "Conic" ||
    el.type === "Curve2D" ||
    el.type === "GraphTangent" ||
    el.type === "GraphArea"
  ) {
    const axesId = typeof el.props.axes === "string" ? el.props.axes : "";
    const axesEl =
      (axesId ? byId.get(axesId) : undefined) ??
      allElements.find((item) => item.type === "Axes2D");
    if (axesEl) {
      return getElementBoundingBox(axesEl, {
        solved,
        byId,
        allElements,
        viewScale,
      });
    }
    return makeBox(tx - 4, tx + 4, ty - 4, ty + 4);
  }

  if (el.type === "Slider") {
    const w = (260 / viewScale) * sc;
    const h = (44 / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "VarTable") {
    const xsLen = Array.isArray(el.props.xs) ? el.props.xs.length : 4;
    const rowsLen = Array.isArray(el.props.rows) ? el.props.rows.length : 2;
    const w = ((64 + Math.max(2, xsLen * 2 - 1) * 62) / viewScale) * sc;
    const h = ((38 + rowsLen * 72) / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "TrigCircle") {
    const r = 3.2 * sc;
    return makeBox(tx - r, tx + r, ty - r, ty + r);
  }

  if (el.type === "Chart") {
    const w = (340 / viewScale) * sc;
    const h = (230 / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "TreeDiagram") {
    const w = (360 / viewScale) * sc;
    const h = (220 / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "Venn") {
    const r = 3.2 * sc;
    return makeBox(tx - r, tx + r, ty - 2.3 * sc, ty + 2.3 * sc);
  }

  if (el.type === "Counting") {
    const w = (340 / viewScale) * sc;
    const h = (160 / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "NumberLine") {
    const w = (380 / viewScale) * sc;
    const h = (88 / viewScale) * sc;
    return makeBox(tx, tx + w, ty - h, ty);
  }

  if (el.type === "Network") {
    const nodes = Array.isArray(el.props.nodes)
      ? (el.props.nodes as Array<{ x: number; y: number }>)
      : [];
    if (nodes.length > 0) {
      const b = boxFromPoints(
        nodes.map((n) => ({ x: tx + n.x * sc, y: ty + n.y * sc }))
      );
      if (b) {
        return makeBox(b.minX - 0.5, b.maxX + 0.5, b.minY - 0.5, b.maxY + 0.5);
      }
    }
    return makeBox(tx - 2.2, tx + 2.2, ty - 1.6, ty + 1.6);
  }

  if (el.type === "RealObject") {
    const fromPt =
      (typeof el.props.from === "string"
        ? solved.pts.get(el.props.from)
        : undefined) ?? { x: tx, y: ty };
    const toPt =
      (typeof el.props.to === "string"
        ? solved.pts.get(el.props.to)
        : undefined) ?? { x: tx, y: ty + 3 * sc };
    const height = Math.max(0.5, Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y));
    const widthFactor = typeof el.props.width === "number" ? el.props.width : 1;
    const halfW = (height * widthFactor) / 2;
    return makeBox(
      Math.min(fromPt.x, toPt.x) - halfW,
      Math.max(fromPt.x, toPt.x) + halfW,
      Math.min(fromPt.y, toPt.y),
      Math.max(fromPt.y, toPt.y)
    );
  }

  if (el.type === "LineDecor") {
    const target =
      typeof el.props.target === "string"
        ? byId.get(el.props.target)
        : undefined;
    if (target) {
      const ends = resolveLineEndpoints(target, solved.pts, byId);
      if (ends) {
        const b = boxFromPoints(ends);
        if (b) {
          return makeBox(b.minX - 0.5, b.maxX + 0.5, b.minY - 0.5, b.maxY + 0.5);
        }
      }
    }
    return makeBox(tx - 1, tx + 1, ty - 0.5, ty + 0.5);
  }

  if (
    el.type === "PhysicsSim" ||
    el.type === "PhysicsDiagram" ||
    el.type === "PhysicsInstrument" ||
    el.type === "PhysicsLabTable"
  ) {
    const defaultW =
      el.type === "PhysicsSim"
        ? 11.2
        : el.type === "PhysicsDiagram"
          ? 10.0
          : el.type === "PhysicsLabTable"
            ? 7.2
            : el.props?.instrumentKind === "ruler"
              ? 8.0
              : el.props?.instrumentKind === "protractor"
                ? 6.4
                : 4.8;
    const defaultH =
      el.type === "PhysicsSim"
        ? 7.2
        : el.type === "PhysicsDiagram"
          ? 6.4
          : el.type === "PhysicsLabTable"
            ? 4.6
            : el.props?.instrumentKind === "ruler"
              ? 1.4
              : el.props?.instrumentKind === "protractor"
                ? 3.6
                : 2.8;
    const w =
      (typeof el.props?.width === "number" && el.props.width > 0
        ? el.props.width
        : defaultW) * sc;
    const h =
      (typeof el.props?.height === "number" && el.props.height > 0
        ? el.props.height
        : defaultH) * sc;
    return makeBox(tx - w / 2, tx + w / 2, ty - h / 2, ty + h / 2);
  }

  if (el.type === "Shape") {
    return makeBox(tx - 1.5 * sc, tx + 1.5 * sc, ty - 1 * sc, ty + 1 * sc);
  }

  return makeBox(tx, tx, ty, ty);
}

/**
 * Computes representative anchor point / centroid of an element for marquee testing.
 */
export function getElementAnchor(
  element: CanvasElement,
  allElements?: CanvasElement[]
): { x: number; y: number } | null {
  if (element.type === "Ink") {
    const pts = (element.props.points as number[]) || [];
    if (pts.length < 2) return null;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let i = 0; i + 1 < pts.length; i += 2) {
      sumX += pts[i];
      sumY += pts[i + 1];
      count++;
    }
    const scale = element.transform.scale || 1;
    return {
      x: element.transform.x + (sumX / count) * scale,
      y: element.transform.y + (sumY / count) * scale,
    };
  }

  if (allElements) {
    const box = getElementBoundingBox(element, { allElements });
    return { x: box.centerX, y: box.centerY };
  }

  if (element.type === "GeomPolygon" && Array.isArray(element.props.points)) {
    const pts = element.props.points as EmbeddedVertex[];
    if (pts.length > 0) {
      const cx =
        pts.reduce((s, p) => s + p.x, 0) / pts.length + element.transform.x;
      const cy =
        pts.reduce((s, p) => s + p.y, 0) / pts.length + element.transform.y;
      return { x: cx, y: cy };
    }
  }

  return { x: element.transform.x, y: element.transform.y };
}

/**
 * Computes composite bounding box encompassing all selected elements.
 */
export function getCompositeBoundingBox(
  elements: CanvasElement[],
  allElements?: CanvasElement[],
  viewScale = 45
): BoundingBox | null {
  if (elements.length === 0) return null;

  const contextElements = allElements ?? elements;
  const byId = new Map(contextElements.map((el) => [el.id, el]));
  const rawSolved = solveGeometry3D(contextElements);
  const solved: Solved3DScene = {
    ...rawSolved,
    pts: hydrateInlinePoints(contextElements, rawSolved.pts),
  };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.style?.hidden) continue;
    const box = getElementBoundingBox(el, {
      solved,
      byId,
      allElements: contextElements,
      viewScale,
    });

    if (box.minX < minX) minX = box.minX;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  if (!Number.isFinite(minX)) return null;

  return makeBox(minX, maxX, minY, maxY);
}

/**
 * Generates the 8 transform handles for a bounding box in math coordinates.
 */
export function getTransformHandles(bbox: BoundingBox): TransformHandle[] {
  const { minX, maxX, minY, maxY, centerX, centerY } = bbox;
  return [
    {
      type: "nw",
      x: minX,
      y: maxY,
      anchorX: maxX,
      anchorY: minY,
      mode: "xy",
      cursor: "nwse-resize",
    },
    {
      type: "n",
      x: centerX,
      y: maxY,
      anchorX: centerX,
      anchorY: minY,
      mode: "y",
      cursor: "ns-resize",
    },
    {
      type: "ne",
      x: maxX,
      y: maxY,
      anchorX: minX,
      anchorY: minY,
      mode: "xy",
      cursor: "nesw-resize",
    },
    {
      type: "e",
      x: maxX,
      y: centerY,
      anchorX: minX,
      anchorY: centerY,
      mode: "x",
      cursor: "ew-resize",
    },
    {
      type: "se",
      x: maxX,
      y: minY,
      anchorX: minX,
      anchorY: maxY,
      mode: "xy",
      cursor: "nwse-resize",
    },
    {
      type: "s",
      x: centerX,
      y: minY,
      anchorX: centerX,
      anchorY: maxY,
      mode: "y",
      cursor: "ns-resize",
    },
    {
      type: "sw",
      x: minX,
      y: minY,
      anchorX: maxX,
      anchorY: maxY,
      mode: "xy",
      cursor: "nesw-resize",
    },
    {
      type: "w",
      x: minX,
      y: centerY,
      anchorX: maxX,
      anchorY: centerY,
      mode: "x",
      cursor: "ew-resize",
    },
  ];
}

/**
 * Calculates resize scale factors from pointer movement relative to anchor.
 */
export function calculateResizeFactors(
  handle: TransformHandle,
  initHandlePos: { x: number; y: number },
  currPos: { x: number; y: number }
): { scaleX: number; scaleY: number } {
  const it = initHandlePos.x - handle.anchorX;
  const Et = initHandlePos.y - handle.anchorY;

  const dx = currPos.x - handle.anchorX;
  const dy = currPos.y - handle.anchorY;

  if (handle.mode === "xy") {
    const denom = it * it + Et * Et;
    if (denom < 1e-9) return { scaleX: 1, scaleY: 1 };
    const proj = (dx * it + dy * Et) / denom;
    const uniformScale = Math.min(20, Math.max(0.15, proj));
    return { scaleX: uniformScale, scaleY: uniformScale };
  } else if (handle.mode === "x") {
    if (Math.abs(it) < 1e-9) return { scaleX: 1, scaleY: 1 };
    const sx = Math.min(20, Math.max(0.15, dx / it));
    return { scaleX: sx, scaleY: 1 };
  } else {
    if (Math.abs(Et) < 1e-9) return { scaleX: 1, scaleY: 1 };
    const sy = Math.min(20, Math.max(0.15, dy / Et));
    return { scaleX: 1, scaleY: sy };
  }
}

/**
 * Performs marquee AABB intersection test returning matched element IDs.
 */
export function testMarqueeIntersection(
  marquee: { sx: number; sy: number; x: number; y: number },
  elements: CanvasElement[]
): string[] {
  const minX = Math.min(marquee.sx, marquee.x);
  const maxX = Math.max(marquee.sx, marquee.x);
  const minY = Math.min(marquee.sy, marquee.y);
  const maxY = Math.max(marquee.sy, marquee.y);

  const byId = new Map(elements.map((el) => [el.id, el]));
  const rawSolved = solveGeometry3D(elements);
  const solved: Solved3DScene = {
    ...rawSolved,
    pts: hydrateInlinePoints(elements, rawSolved.pts),
  };

  return elements
    .filter((el) => {
      if (el.style?.hidden) return false;
      const box = getElementBoundingBox(el, {
        solved,
        byId,
        allElements: elements,
      });
      if (
        box.minX <= maxX &&
        box.maxX >= minX &&
        box.minY <= maxY &&
        box.maxY >= minY
      ) {
        return true;
      }
      const pt = getElementAnchor(el, elements);
      return (
        pt !== null &&
        pt.x >= minX &&
        pt.x <= maxX &&
        pt.y >= minY &&
        pt.y <= maxY
      );
    })
    .map((el) => el.id);
}
