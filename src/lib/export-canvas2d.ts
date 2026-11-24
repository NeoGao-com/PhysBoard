import type { CanvasElement } from "@/types/whiteboard";
import {
  type GeomAngleProps,
  type Point2D,
  type Point3D,
  computeAngleArcPoints,
  dist2D,
  resolveFillRegionPolygon,
  resolveGeomConstructionGeometry,
  resolveLineEndpoints,
  unitDir2D,
} from "@/lib/geometry";
import {
  type Axes3DProps,
  type OrthoViewsProps,
  type RevolutionProps,
  type RoundSectionProps,
  type Solid3DKind,
  type Solid3DProps,
  type Solved3DScene,
  type SpaceFigureProps,
  applyOrbitToPoints,
  azimuthElevationToCamera,
  buildOxyzAxes,
  computeCircumsphereWireframe,
  computeOrthoViews,
  computePolyhedronSection,
  computeRevolutionGeometry,
  computeRoundCrossSection,
  computeSolidWireframe,
  computeSpaceFigureGeometry,
  isEdgeHidden,
  isRoundPointOccluded,
  liftRoundSolidTo3D,
  liftSolidTo3D,
  project3DTo2D,
} from "@/lib/geometry3d";
import {
  analyzeFunctionForPlot,
  arrangementCount,
  combinationCount,
  compileMathExpr,
  computeDefiniteIntegral,
  computeDescriptiveStats,
  computeGroupedStats,
  computeRevolutionVolume,
  computeTangentLine,
  computeTrigValues,
  parseNumberLineSet,
  permutationCount,
  sampleConicPoints,
  sampleImplicitEquation,
  samplePlotCurve,
} from "@/lib/math-eval";
import { getRealWorldItem } from "@/lib/realworld-art";
import { computeArtTransformMatrix } from "@/components/sites/mathvera/elements/RealObjectElement";

export interface Canvas2DRenderContext {
  ctx: CanvasRenderingContext2D;
  elements: CanvasElement[];
  byId: Map<string, CanvasElement>;
  solved: Solved3DScene;
  isDark: boolean;
  stroke: string;
  strokeWidthScale: number;
  scaleX: number;
  scaleY: number;
  toX: (wx: number) => number;
  toY: (wy: number) => number;
  preloadedImages?: Map<string, HTMLImageElement>;
}

const PIE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#65a30d",
];

function drawArrowheadCanvas(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sizePx: number,
  color: string
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - sizePx * Math.cos(ang - 0.42), y2 - sizePx * Math.sin(ang - 0.42));
  ctx.lineTo(x2 - sizePx * Math.cos(ang + 0.42), y2 - sizePx * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function resolveAxesBoundsSimple(
  el: CanvasElement,
  allElements: CanvasElement[]
) {
  const axesId = typeof el.props?.axes === "string" ? el.props.axes : "";
  const axesEl = axesId
    ? allElements.find((e) => e.id === axesId && e.type === "Axes2D")
    : allElements.find((e) => e.type === "Axes2D");
  if (!axesEl) {
    return {
      originX: el.transform.x || 0,
      originY: el.transform.y || 0,
      unitScale: el.transform.scale || 1,
      xNeg: 5,
      xPos: 5,
      yNeg: 5,
      yPos: 5,
    };
  }
  const p = axesEl.props ?? {};
  const baseSize = typeof p.size === "number" && p.size > 0 ? p.size : 5;
  const sizeX = typeof p.sizeX === "number" && p.sizeX > 0 ? p.sizeX : baseSize;
  const sizeY = typeof p.sizeY === "number" && p.sizeY > 0 ? p.sizeY : baseSize;
  return {
    originX: axesEl.transform.x || 0,
    originY: axesEl.transform.y || 0,
    unitScale: axesEl.transform.scale || 1,
    xPos: typeof p.xPos === "number" && p.xPos > 0 ? p.xPos : sizeX,
    xNeg: typeof p.xNeg === "number" && p.xNeg > 0 ? p.xNeg : sizeX,
    yPos: typeof p.yPos === "number" && p.yPos > 0 ? p.yPos : sizeY,
    yNeg: typeof p.yNeg === "number" && p.yNeg > 0 ? p.yNeg : sizeY,
  };
}

function collectPlotParams(
  el: CanvasElement,
  allElements: CanvasElement[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of allElements) {
    if (item.type === "Slider" && typeof item.props?.name === "string") {
      const v = Number(item.props.value);
      if (Number.isFinite(v)) map[item.props.name] = v;
    }
  }
  if (Array.isArray(el.props?.params)) {
    for (const p of el.props.params) {
      if (
        p &&
        typeof p === "object" &&
        typeof (p as { name?: unknown }).name === "string" &&
        typeof (p as { value?: unknown }).value === "number"
      ) {
        const name = (p as { name: string }).name;
        if (!(name in map)) map[name] = (p as { value: number }).value;
      }
    }
  }
  return map;
}

function strokePolyline(
  rc: Canvas2DRenderContext,
  pts: Point2D[],
  closed = false,
  fillColor?: string
) {
  const { ctx, toX, toY } = rc;
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].x), toY(pts[0].y));
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(toX(pts[i].x), toY(pts[i].y));
  }
  if (closed) ctx.closePath();
  if (fillColor) {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();
  }
  if (pts.length >= 2) {
    ctx.stroke();
  }
}

/**
 * Draws extended/advanced whiteboard elements onto a Canvas2D fallback surface.
 * Returns true if the element type was handled.
 */
export function drawAdvancedElementCanvas2D(
  el: CanvasElement,
  rc: Canvas2DRenderContext
): boolean {
  const { ctx, elements, byId, solved, isDark, stroke, strokeWidthScale, scaleX, scaleY, toX, toY } = rc;
  const tx = el.transform.x || 0;
  const ty = el.transform.y || 0;
  const sc = el.transform.scale || 1;
  const avgScale = (scaleX + scaleY) / 2;

  // --- Vector / Ray / Line enhancements (beyond plain segment) ---
  if (el.type === "GeomVector" || el.type === "GeomRay" || el.type === "GeomLine") {
    const ends = resolveLineEndpoints(el, solved.pts, byId);
    if (!ends) return false;
    if (el.props?.dashed) ctx.setLineDash([8 * strokeWidthScale, 5 * strokeWidthScale]);
    ctx.beginPath();
    ctx.moveTo(toX(ends[0].x), toY(ends[0].y));
    ctx.lineTo(toX(ends[1].x), toY(ends[1].y));
    ctx.stroke();
    if (el.type === "GeomVector") {
      drawArrowheadCanvas(
        ctx,
        toX(ends[0].x),
        toY(ends[0].y),
        toX(ends[1].x),
        toY(ends[1].y),
        10 * Math.max(1, strokeWidthScale * 0.7),
        stroke
      );
    }
    return true;
  }

  // --- GeomAngle / FillRegion / GeomConstruction / Shape ---
  if (el.type === "GeomAngle") {
    const props = el.props as Partial<GeomAngleProps>;
    const v = props.vertex ? solved.pts.get(props.vertex) : undefined;
    const armIds = Array.isArray(props.arms) ? props.arms : [];
    const a1 = armIds[0] ? solved.pts.get(armIds[0]) : undefined;
    const a2 = armIds[1] ? solved.pts.get(armIds[1]) : undefined;
    if (!v || !a1 || !a2) return true;
    const arcPts = computeAngleArcPoints(v, a1, a2, 0.55 * sc);
    strokePolyline(rc, arcPts);
    if (props.valueLatex) {
      const mid = arcPts[Math.floor(arcPts.length / 2)];
      if (mid) {
        const dir = unitDir2D(v, mid);
        ctx.fillStyle = stroke;
        ctx.font = `600 ${Math.round(13 * Math.max(1, strokeWidthScale * 0.75))}px system-ui, sans-serif`;
        ctx.fillText(String(props.valueLatex).replace(/[{}]/g, ""), toX(mid.x + dir.x * 0.25), toY(mid.y + dir.y * 0.25));
      }
    }
    return true;
  }

  if (el.type === "FillRegion") {
    const region = resolveFillRegionPolygon(el, solved.pts, byId, solved.p3);
    if (region && region.outer.length >= 3) {
      const fill = el.style?.fill || "rgba(37,99,235,0.2)";
      ctx.save();
      ctx.globalAlpha = el.style?.opacity ?? 0.35;
      ctx.beginPath();
      ctx.moveTo(toX(region.outer[0].x), toY(region.outer[0].y));
      for (let i = 1; i < region.outer.length; i++) {
        ctx.lineTo(toX(region.outer[i].x), toY(region.outer[i].y));
      }
      ctx.closePath();
      for (const hole of region.holes) {
        if (hole.length < 3) continue;
        ctx.moveTo(toX(hole[0].x), toY(hole[0].y));
        for (let i = 1; i < hole.length; i++) {
          ctx.lineTo(toX(hole[i].x), toY(hole[i].y));
        }
        ctx.closePath();
      }
      ctx.fillStyle = fill;
      ctx.fill("evenodd");
      ctx.restore();
    }
    return true;
  }

  if (el.type === "GeomConstruction") {
    const resolved = resolveGeomConstructionGeometry(el, solved.pts, byId);
    if (resolved) {
      if (el.props?.dashed || el.props?.kind === "perpBisector") {
        ctx.setLineDash([6 * strokeWidthScale, 4 * strokeWidthScale]);
      }
      ctx.beginPath();
      ctx.moveTo(toX(resolved.pFrom.x), toY(resolved.pFrom.y));
      ctx.lineTo(toX(resolved.pTo.x), toY(resolved.pTo.y));
      ctx.stroke();
    }
    return true;
  }

  if (el.type === "Shape") {
    const kind = String(el.props?.kind ?? "rect");
    const w = 2.6 * sc * scaleX;
    const h = 1.6 * sc * scaleY;
    const cx = toX(tx);
    const cy = toY(ty);
    if (kind === "arrow" || kind === "line") {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy);
      ctx.lineTo(cx + w / 2, cy);
      ctx.stroke();
      if (kind === "arrow") {
        drawArrowheadCanvas(ctx, cx - w / 2, cy, cx + w / 2, cy, 10 * strokeWidthScale, stroke);
      }
    } else {
      if (el.style?.fill) {
        ctx.fillStyle = el.style.fill;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      if (typeof el.props?.text === "string" && el.props.text) {
        ctx.fillStyle = stroke;
        ctx.font = `500 ${Math.round(14 * strokeWidthScale)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(el.props.text, cx, cy + 5);
      }
    }
    return true;
  }

  // --- Full Axes2D with Grid, Ticks, Arrowheads & Labels ---
  if (el.type === "Axes2D") {
    const bounds = resolveAxesBoundsSimple(el, [el]);
    const xLeft = bounds.originX - bounds.xNeg * bounds.unitScale;
    const xRight = bounds.originX + bounds.xPos * bounds.unitScale;
    const yBot = bounds.originY - bounds.yNeg * bounds.unitScale;
    const yTop = bounds.originY + bounds.yPos * bounds.unitScale;
    const tickMode = el.props?.ticks === "pi" ? "pi" : "int";
    const axisCol = isDark ? "#cbd5e1" : stroke;

    if (el.props?.grid !== false) {
      ctx.save();
      ctx.strokeStyle = isDark ? "rgba(148,163,184,0.22)" : "#e2e8f0";
      ctx.lineWidth = Math.max(0.7, strokeWidthScale * 0.7);
      const step = tickMode === "pi" ? Math.PI / 2 : 1;
      for (let gx = Math.ceil(-bounds.xNeg / step); gx <= Math.floor(bounds.xPos / step); gx++) {
        if (gx === 0) continue;
        const wx = bounds.originX + gx * step * bounds.unitScale;
        ctx.beginPath();
        ctx.moveTo(toX(wx), toY(yBot));
        ctx.lineTo(toX(wx), toY(yTop));
        ctx.stroke();
      }
      for (let gy = Math.ceil(-bounds.yNeg); gy <= Math.floor(bounds.yPos); gy++) {
        if (gy === 0) continue;
        const wy = bounds.originY + gy * bounds.unitScale;
        ctx.beginPath();
        ctx.moveTo(toX(xLeft), toY(wy));
        ctx.lineTo(toX(xRight), toY(wy));
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.strokeStyle = axisCol;
    ctx.beginPath();
    ctx.moveTo(toX(xLeft), toY(bounds.originY));
    ctx.lineTo(toX(xRight), toY(bounds.originY));
    ctx.moveTo(toX(bounds.originX), toY(yBot));
    ctx.lineTo(toX(bounds.originX), toY(yTop));
    ctx.stroke();

    drawArrowheadCanvas(ctx, toX(xLeft), toY(bounds.originY), toX(xRight), toY(bounds.originY), 9 * strokeWidthScale, axisCol);
    drawArrowheadCanvas(ctx, toX(bounds.originX), toY(yBot), toX(bounds.originX), toY(yTop), 9 * strokeWidthScale, axisCol);

    if (el.props?.legend !== false) {
      ctx.fillStyle = axisCol;
      ctx.font = `italic 600 ${Math.round(14 * strokeWidthScale)}px "KaTeX_Math", serif`;
      ctx.fillText("x", toX(xRight) - 10, toY(bounds.originY) - 8);
      ctx.fillText("y", toX(bounds.originX) + 8, toY(yTop) + 14);
      ctx.fillText("O", toX(bounds.originX) - 14, toY(bounds.originY) + 14);
    }
    return true;
  }

  // --- Axes3D (Oxyz) ---
  if (el.type === "Axes3D") {
    const props = el.props as Partial<Axes3DProps>;
    const cam =
      typeof props.azimuth === "number" || typeof props.elevation === "number"
        ? azimuthElevationToCamera(props.azimuth ?? 26, props.elevation ?? 17)
        : undefined;
    const axisColor = el.style?.stroke ?? "#64748b";
    const sc3 = el.transform.scale || 1;
    const built = buildOxyzAxes(props as Axes3DProps, el.transform, cam);
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(toX(built.origin.x), toY(built.origin.y), Math.max(2, 0.09 * sc3 * scaleX), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = axisColor;
    ctx.font = `600 ${Math.round(12 * strokeWidthScale)}px serif`;
    ctx.fillText("O", toX(built.origin.x - 0.28 * sc3), toY(built.origin.y - 0.32 * sc3));
    for (const ax of built.axes) {
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = Math.max(1.4, 1.8 * strokeWidthScale);
      ctx.beginPath();
      ctx.moveTo(toX(ax.line[0].x), toY(ax.line[0].y));
      ctx.lineTo(toX(ax.tip.x), toY(ax.tip.y));
      ctx.stroke();
      drawArrowheadCanvas(ctx, toX(ax.line[0].x), toY(ax.line[0].y), toX(ax.tip.x), toY(ax.tip.y), 9 * strokeWidthScale, axisColor);
      ctx.font = `${Math.round(11 * strokeWidthScale)}px serif`;
      ctx.textAlign = "center";
      for (const u of ax.units) {
        ctx.beginPath();
        ctx.moveTo(toX(u.tick[0].x), toY(u.tick[0].y));
        ctx.lineTo(toX(u.tick[1].x), toY(u.tick[1].y));
        ctx.stroke();
        ctx.fillText(String(u.n), toX(u.labelPos.x), toY(u.labelPos.y));
      }
      ctx.textAlign = ax.label === "x" ? "end" : "start";
      ctx.font = `italic 600 ${Math.round(15 * strokeWidthScale)}px serif`;
      const lx = ax.label === "x" ? ax.tip.x - 0.2 * sc3 : ax.tip.x + 0.15 * sc3;
      const ly = ax.label === "x" ? ax.tip.y - 0.45 * sc3 : ax.tip.y + 0.1 * sc3;
      ctx.fillText(ax.label, toX(lx), toY(ly));
    }
    ctx.textAlign = "left";
    return true;
  }

  // --- Solid3D ---
  if (el.type === "Solid3D") {
    const props = el.props as Partial<Solid3DProps>;
    const kind = (props.kind ?? "pyramid") as Solid3DKind;
    const ptIds = Array.isArray(props.points) ? props.points : [];
    const inlineCoords = Array.isArray(props.pointCoords) ? props.pointCoords : null;
    const inlineNames = Array.isArray(props.vertexNames) ? props.vertexNames : null;
    const resolved2D: Point2D[] = [];
    const resolvedNames: string[] = [];
    for (let i = 0; i < ptIds.length; i++) {
      const id = ptIds[i];
      const fromMap = solved.pts.get(id);
      const ptEl = byId.get(id);
      if (fromMap) {
        resolved2D.push(fromMap);
        resolvedNames.push(typeof ptEl?.props.name === "string" ? ptEl.props.name : inlineNames?.[i] ?? "");
      } else if (inlineCoords?.[i]) {
        resolved2D.push({ x: inlineCoords[i].x + tx, y: inlineCoords[i].y + ty });
        resolvedNames.push(inlineNames?.[i] ?? "");
      }
    }
    if (resolved2D.length === 0) return true;
    const rawR = typeof props.r === "number" ? props.r : 1.3;
    const effectiveCam =
      typeof props.azimuth === "number" || typeof props.elevation === "number"
        ? azimuthElevationToCamera(props.azimuth ?? 26, props.elevation ?? 17)
        : undefined;
    const isCircumSphere = kind === "sphere" && Boolean(props.through);
    const c3 = isCircumSphere ? solved.p3.get(ptIds[0]) : undefined;
    const t3 = isCircumSphere && typeof props.through === "string" ? solved.p3.get(props.through) : undefined;
    const r = c3 && t3 ? Math.hypot(c3.x - t3.x, c3.y - t3.y, c3.z - t3.z) || rawR : rawR;
    const base2D: Point2D[] =
      !isCircumSphere && inlineCoords && inlineCoords.length === ptIds.length
        ? inlineCoords.map((c) => ({ x: c.x + tx, y: c.y + ty }))
        : resolved2D;
    const wireframe = isCircumSphere
      ? computeCircumsphereWireframe(resolved2D[0], r)
      : computeSolidWireframe(kind, base2D, r, effectiveCam);

    let vertexPositions = base2D;
    const polyLift = liftSolidTo3D(kind, base2D) ?? liftRoundSolidTo3D(kind, base2D, r);
    if (effectiveCam && polyLift && !isCircumSphere) {
      vertexPositions = applyOrbitToPoints(polyLift.p3, effectiveCam, 1, polyLift).pts2d;
    }

    const solidCol = el.style?.stroke ?? "#0f766e";
    const dashCol = el.style?.stroke ?? (isDark ? "#94a3b8" : "#64748b");

    ctx.save();
    ctx.strokeStyle = dashCol;
    ctx.setLineDash([6 * strokeWidthScale, 5 * strokeWidthScale]);
    for (const seg of wireframe.dashed) strokePolyline(rc, seg);
    ctx.restore();

    ctx.strokeStyle = solidCol;
    for (const seg of wireframe.solid) strokePolyline(rc, seg);

    const cxAll = vertexPositions.reduce((s, p) => s + p.x, 0) / vertexPositions.length;
    const cyAll = vertexPositions.reduce((s, p) => s + p.y, 0) / vertexPositions.length;
    for (let i = 0; i < vertexPositions.length; i++) {
      const pt = vertexPositions[i];
      ctx.fillStyle = solidCol;
      ctx.beginPath();
      ctx.arc(toX(pt.x), toY(pt.y), 3.2 * Math.max(1, strokeWidthScale * 0.7), 0, Math.PI * 2);
      ctx.fill();
      if (resolvedNames[i]) {
        const dir = unitDir2D({ x: cxAll, y: cyAll }, pt);
        ctx.font = `600 ${Math.round(14 * Math.max(1, strokeWidthScale * 0.7))}px serif`;
        ctx.fillText(resolvedNames[i], toX(pt.x + dir.x * 0.28), toY(pt.y + dir.y * 0.28));
      }
    }
    return true;
  }

  // --- SolidSection / RoundSection ---
  if (el.type === "SolidSection" || el.type === "RoundSection") {
    const props = el.props as Partial<RoundSectionProps>;
    const solidEl = props.solid ? byId.get(props.solid) : undefined;
    const secPts = Array.isArray(props.points) ? props.points : [];
    if (!solidEl || secPts.length < 3) return true;
    const sProps = solidEl.props as Partial<Solid3DProps>;
    const kind = (sProps.kind ?? "pyramid") as Solid3DKind;
    const isRound = kind === "cone" || kind === "cylinder" || kind === "sphere";
    const ptIds = Array.isArray(sProps.points) ? sProps.points : [];
    const inlineCoords = Array.isArray(sProps.pointCoords) ? sProps.pointCoords : null;
    const solidPts2 =
      inlineCoords && inlineCoords.length === ptIds.length
        ? inlineCoords.map((c) => ({ x: c.x + solidEl.transform.x, y: c.y + solidEl.transform.y }))
        : ptIds.map((id) => solved.pts.get(id)).filter((p): p is Point2D => Boolean(p));
    const r = typeof sProps.r === "number" ? sProps.r : 1.3;
    const lift = solved.lifts.get(solidEl.id) ?? (isRound ? liftRoundSolidTo3D(kind, solidPts2, r) : liftSolidTo3D(kind, solidPts2));
    if (!lift) return true;
    const resolveP3 = (idOrIdx: string): Point3D | undefined => {
      if (solved.p3.has(idOrIdx)) return solved.p3.get(idOrIdx);
      const idx = ptIds.indexOf(idOrIdx);
      if (idx >= 0 && lift.p3[idx]) return lift.p3[idx];
      const num = Number(idOrIdx);
      return Number.isInteger(num) && num >= 0 && num < lift.p3.length ? lift.p3[num] : undefined;
    };
    const pA = resolveP3(secPts[0]);
    const pB = resolveP3(secPts[1]);
    const pC = resolveP3(secPts[2]);
    if (!pA || !pB || !pC) return true;
    const boundary3 = isRound
      ? computeRoundCrossSection(kind, lift, r, pA, pB, pC)
      : computePolyhedronSection(lift, [pA, pB, pC]);
    if (!boundary3 || boundary3.length < 3) return true;
    const pts2 = boundary3.map((p) => project3DTo2D(lift, p));
    strokePolyline(rc, pts2, true, el.style?.fill ?? "rgba(240, 140, 0, 0.28)");
    for (let i = 0; i < boundary3.length; i++) {
      const ni = (i + 1) % boundary3.length;
      const hidden = isRound
        ? isRoundPointOccluded(kind, lift, r, lift.view, boundary3[i])
        : isEdgeHidden(lift, boundary3[i], boundary3[ni]);
      ctx.save();
      ctx.strokeStyle = el.style?.stroke ?? "#e8590c";
      if (hidden) ctx.setLineDash([5 * strokeWidthScale, 4 * strokeWidthScale]);
      strokePolyline(rc, [pts2[i], pts2[ni]]);
      ctx.restore();
    }
    return true;
  }

  // --- SpaceFigure / OrthoViews / Revolution ---
  if (el.type === "SpaceFigure") {
    const props = el.props as Partial<SpaceFigureProps>;
    const axesEl = props.axes ? byId.get(props.axes) : undefined;
    if (!axesEl || !props.def) return true;
    const axesProps = axesEl.props as Axes3DProps;
    const cam =
      typeof axesProps.azimuth === "number" || typeof axesProps.elevation === "number"
        ? azimuthElevationToCamera(axesProps.azimuth ?? 26, axesProps.elevation ?? 17)
        : undefined;
    const geom = computeSpaceFigureGeometry(axesEl.transform, axesProps, props.def, cam);
    if (!geom) return true;
    const color = el.style?.stroke ?? props.color ?? "#b45309";
    ctx.strokeStyle = color;
    if (geom.kind === "plane" && geom.polygon) strokePolyline(rc, geom.polygon, true, "rgba(180,83,9,0.12)");
    if (geom.kind === "line" && geom.line) strokePolyline(rc, geom.line);
    if (geom.kind === "sphere" && geom.outline) {
      strokePolyline(rc, geom.outline, true, "rgba(180,83,9,0.08)");
      if (geom.equatorFront) strokePolyline(rc, geom.equatorFront);
      if (geom.equatorBack) {
        ctx.save();
        ctx.setLineDash([5 * strokeWidthScale, 4 * strokeWidthScale]);
        strokePolyline(rc, geom.equatorBack);
        ctx.restore();
      }
    }
    return true;
  }

  if (el.type === "OrthoViews") {
    const props = el.props as Partial<OrthoViewsProps>;
    const solidEl = props.solid ? byId.get(props.solid) : undefined;
    if (!solidEl) return true;
    const sProps = solidEl.props as Partial<Solid3DProps>;
    const ptIds = Array.isArray(sProps.points) ? sProps.points : [];
    const inlineCoords = Array.isArray(sProps.pointCoords) ? sProps.pointCoords : null;
    const pts2 =
      inlineCoords && inlineCoords.length === ptIds.length
        ? inlineCoords.map((c) => ({ x: c.x + solidEl.transform.x, y: c.y + solidEl.transform.y }))
        : ptIds.map((id) => solved.pts.get(id)).filter((p): p is Point2D => Boolean(p));
    const kind = (sProps.kind ?? "box") as Solid3DKind;
    const r = typeof sProps.r === "number" ? sProps.r : 1.3;
    const lift = solved.lifts.get(solidEl.id) ?? liftSolidTo3D(kind, pts2) ?? liftRoundSolidTo3D(kind, pts2, r);
    if (!lift) return true;
    const ortho = computeOrthoViews(kind, lift, r);
    if (!ortho) return true;
    ctx.strokeStyle = el.style?.stroke ?? "#334155";
    for (const v of ortho.views) {
      ctx.save();
      ctx.setLineDash([5 * strokeWidthScale, 4 * strokeWidthScale]);
      for (const seg of v.lines.dashed) {
        strokePolyline(rc, [{ x: tx + seg[0].x, y: ty + seg[0].y }, { x: tx + seg[1].x, y: ty + seg[1].y }]);
      }
      ctx.restore();
      for (const seg of v.lines.solid) {
        strokePolyline(rc, [{ x: tx + seg[0].x, y: ty + seg[0].y }, { x: tx + seg[1].x, y: ty + seg[1].y }]);
      }
      for (const c of v.circles) {
        ctx.beginPath();
        ctx.arc(toX(tx + c.c.x), toY(ty + c.c.y), Math.max(1, c.r * scaleX), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    return true;
  }

  if (el.type === "Revolution") {
    const props = el.props as Partial<RevolutionProps>;
    const srcEl = props.source ? byId.get(props.source) : undefined;
    const a = props.a ? solved.pts.get(props.a) : undefined;
    const b = props.b ? solved.pts.get(props.b) : undefined;
    if (!srcEl || !a || !b) return true;
    const rev = computeRevolutionGeometry(srcEl, a, b, solved.pts, props.angle ?? 360);
    if (!rev) return true;
    ctx.strokeStyle = el.style?.stroke ?? "#0f766e";
    strokePolyline(rc, rev.profile, true, "rgba(15, 118, 110, 0.08)");
    for (const gen of rev.generatrices) strokePolyline(rc, gen);
    for (const ell of rev.ellipses) {
      ctx.beginPath();
      ctx.ellipse(toX(ell.cx), toY(ell.cy), Math.max(1, ell.rx * scaleX), Math.max(1, ell.ry * scaleY), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    return true;
  }

  // --- Plot / Conic / Curve2D / GraphTangent / GraphArea / Slider ---
  if (el.type === "Plot") {
    const axes = resolveAxesBoundsSimple(el, elements);
    const expr = typeof el.props?.exprLatex === "string" ? el.props.exprLatex : "x";
    const domain = Array.isArray(el.props?.domain) ? (el.props.domain as [number, number]) : undefined;
    const shade = Array.isArray(el.props?.shade) ? (el.props.shade as [number, number]) : undefined;
    const paramValues = collectPlotParams(el, elements);
    const xMin = domain ? Math.max(-axes.xNeg, domain[0]) : -axes.xNeg;
    const xMax = domain ? Math.min(axes.xPos, domain[1]) : axes.xPos;
    const col = (typeof el.props?.color === "string" && el.props.color) || stroke || "#2563eb";
    const mapPlot = (p: Point2D) => ({
      x: axes.originX + p.x * axes.unitScale,
      y: axes.originY + p.y * axes.unitScale,
    });

    if (shade && shade.length >= 2) {
      const fn = compileMathExpr(expr);
      if (fn) {
        const a = Math.min(shade[0], shade[1]);
        const b = Math.max(shade[0], shade[1]);
        const poly: Point2D[] = [{ x: a, y: 0 }];
        for (let i = 0; i <= 48; i++) {
          const x = a + ((b - a) * i) / 48;
          const y = fn({ ...paramValues, x });
          poly.push({ x, y: Number.isFinite(y) ? y : 0 });
        }
        poly.push({ x: b, y: 0 });
        ctx.strokeStyle = col;
        strokePolyline(rc, poly.map(mapPlot), true, "rgba(37,99,235,0.16)");
      }
    }

    const segs = samplePlotCurve(expr, xMin, xMax, -axes.yNeg, axes.yPos, paramValues, 260);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.6, 2.2 * strokeWidthScale);
    for (const seg of segs) strokePolyline(rc, seg.map(mapPlot));

    const marks = (el.props?.marks as Record<string, boolean> | undefined) ?? {};
    if (marks.roots || marks.extrema) {
      const analysis = analyzeFunctionForPlot(expr, paramValues, [xMin, xMax]);
      ctx.fillStyle = col;
      for (const r of marks.roots ? analysis.roots : []) {
        const mp = mapPlot(r);
        ctx.beginPath();
        ctx.arc(toX(mp.x), toY(mp.y), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const ex of marks.extrema ? analysis.extrema : []) {
        const mp = mapPlot({ x: ex.x, y: ex.y });
        ctx.beginPath();
        ctx.arc(toX(mp.x), toY(mp.y), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return true;
  }

  if (el.type === "Conic") {
    const axes = resolveAxesBoundsSimple(el, elements);
    const kind = (el.props?.kind as "ellipse" | "parabola" | "hyperbola") ?? "ellipse";
    const a = Number(el.props?.a ?? 3);
    const b = Number(el.props?.b ?? 2);
    const col = stroke || "#7c3aed";
    ctx.strokeStyle = col;
    for (const seg of sampleConicPoints(kind, a, b)) {
      strokePolyline(
        rc,
        seg.map((p) => ({
          x: axes.originX + p.x * axes.unitScale,
          y: axes.originY + p.y * axes.unitScale,
        }))
      );
    }
    return true;
  }

  if (el.type === "Curve2D") {
    const axes = resolveAxesBoundsSimple(el, elements);
    const kind = String(el.props?.kind ?? "implicit");
    const def = (el.props?.def as Record<string, unknown> | undefined) ?? {};
    const params = collectPlotParams(el, elements);
    const mapP = (p: Point2D) => ({
      x: axes.originX + p.x * axes.unitScale,
      y: axes.originY + p.y * axes.unitScale,
    });
    ctx.strokeStyle = stroke || "#0891b2";
    if (kind === "parametric") {
      const fx = compileMathExpr(String(def.x ?? "2*cos(t)"));
      const fy = compileMathExpr(String(def.y ?? "2*sin(t)"));
      const t0 = typeof def.t0 === "number" ? def.t0 : 0;
      const t1 = typeof def.t1 === "number" ? def.t1 : Math.PI * 2;
      if (fx && fy) {
        const seg: Point2D[] = [];
        for (let i = 0; i <= 140; i++) {
          const t = t0 + ((t1 - t0) * i) / 140;
          const x = fx({ ...params, t });
          const y = fy({ ...params, t });
          if (Number.isFinite(x) && Number.isFinite(y)) seg.push(mapP({ x, y }));
        }
        strokePolyline(rc, seg);
      }
    } else if (kind === "sequence") {
      const fu = compileMathExpr(String(def.expr ?? "1/n"));
      const nMax = Math.min(200, typeof def.nMax === "number" ? def.nMax : 10);
      if (fu) {
        ctx.fillStyle = stroke || "#0891b2";
        for (let n = 1; n <= nMax; n++) {
          const y = fu({ ...params, n });
          if (Number.isFinite(y)) {
            const p = mapP({ x: n, y });
            ctx.beginPath();
            ctx.arc(toX(p.x), toY(p.y), 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else {
      const eq = kind === "inequality"
        ? String(def.expr ?? "x + y <= 4").replace(/<=|>=|<|>|\\leq|\\geq/, "=")
        : String(def.expr ?? "x^2 + y^2 = 9");
      const segs = sampleImplicitEquation(eq, -axes.xNeg, axes.xPos, -axes.yNeg, axes.yPos, params, 56);
      for (const s of segs) strokePolyline(rc, s.map(mapP));
    }
    return true;
  }

  if (el.type === "GraphTangent") {
    const plotId = typeof el.props?.plotId === "string" ? el.props.plotId : "";
    const fEl = plotId ? byId.get(plotId) : elements.find((e) => e.type === "Plot");
    if (!fEl) return true;
    const axes = resolveAxesBoundsSimple(fEl, elements);
    const expr = typeof fEl.props?.exprLatex === "string" ? fEl.props.exprLatex : "x^2";
    const x0 = typeof el.props?.x0 === "number" ? el.props.x0 : 1;
    const tan = computeTangentLine(expr, x0, collectPlotParams(fEl, elements));
    if (tan) {
      const span = 2.5;
      const p1 = { x: axes.originX + (tan.x0 - span) * axes.unitScale, y: axes.originY + (tan.y0 - tan.slope * span) * axes.unitScale };
      const p2 = { x: axes.originX + (tan.x0 + span) * axes.unitScale, y: axes.originY + (tan.y0 + tan.slope * span) * axes.unitScale };
      ctx.strokeStyle = stroke || "#dc2626";
      strokePolyline(rc, [p1, p2]);
      const p0 = { x: axes.originX + tan.x0 * axes.unitScale, y: axes.originY + tan.y0 * axes.unitScale };
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(toX(p0.x), toY(p0.y), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }

  if (el.type === "GraphArea") {
    const fEl = typeof el.props?.f === "string" ? byId.get(el.props.f) : elements.find((e) => e.type === "Plot");
    const gEl = typeof el.props?.g === "string" ? byId.get(el.props.g) : undefined;
    if (!fEl) return true;
    const axes = resolveAxesBoundsSimple(fEl, elements);
    const fExpr = typeof fEl.props?.exprLatex === "string" ? fEl.props.exprLatex : "x^2";
    const gExpr = gEl && typeof gEl.props?.exprLatex === "string" ? gEl.props.exprLatex : undefined;
    const a = Number(el.props?.a ?? 0);
    const b = Number(el.props?.b ?? 2);
    const params = collectPlotParams(fEl, elements);
    const fFn = compileMathExpr(fExpr);
    const gFn = gExpr ? compileMathExpr(gExpr) : null;
    if (fFn) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const top: Point2D[] = [];
      const bot: Point2D[] = [];
      for (let i = 0; i <= 48; i++) {
        const x = lo + ((hi - lo) * i) / 48;
        const yf = fFn({ ...params, x });
        const yg = gFn ? gFn({ ...params, x }) : 0;
        top.push({ x: axes.originX + x * axes.unitScale, y: axes.originY + (Number.isFinite(yf) ? yf : 0) * axes.unitScale });
        bot.push({ x: axes.originX + x * axes.unitScale, y: axes.originY + (Number.isFinite(yg) ? yg : 0) * axes.unitScale });
      }
      ctx.strokeStyle = stroke || "#2563eb";
      strokePolyline(rc, [...top, ...bot.reverse()], true, "rgba(37,99,235,0.2)");
      const integral = computeDefiniteIntegral(fExpr, gExpr, a, b, params, 0);
      const vol = el.props?.revolve ? computeRevolutionVolume(fExpr, a, b, params) : null;
      ctx.fillStyle = "#1e3a8a";
      ctx.font = `600 ${Math.round(13 * strokeWidthScale)}px system-ui, sans-serif`;
      ctx.fillText(vol !== null ? `V ≈ ${vol.toFixed(2)}` : `S ≈ ${integral.area.toFixed(2)}`, toX(axes.originX + ((a + b) / 2) * axes.unitScale), toY(axes.originY + 0.35));
    }
    return true;
  }

  if (el.type === "Slider") {
    const name = String(el.props?.name ?? "m");
    const min = Number(el.props?.min ?? -5);
    const max = Number(el.props?.max ?? 5);
    const val = Number(el.props?.value ?? 1);
    const x0 = toX(tx);
    const y0 = toY(ty);
    const w = 220 * sc;
    const h = 38 * sc;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0, y0, w, h);
    ctx.fillStyle = "#0f172a";
    ctx.font = `600 ${Math.round(13 * sc)}px system-ui, sans-serif`;
    ctx.fillText(`${name} = ${Number(val.toFixed(2))}`, x0 + 10, y0 + h * 0.62);
    const ratio = max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0.5;
    const trackX = x0 + 92 * sc;
    const trackW = w - 106 * sc;
    const trackY = y0 + h / 2;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(trackX, trackY);
    ctx.lineTo(trackX + trackW, trackY);
    ctx.stroke();
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(trackX + trackW * ratio, trackY, 6, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }

  // --- TrigCircle (with swept Ox projection) ---
  if (el.type === "TrigCircle") {
    const R = 2.6 * sc;
    const angle = typeof el.props?.angle === "number" ? el.props.angle : Math.PI / 6;
    const unit: "rad" | "deg" = el.props?.unit === "deg" ? "deg" : "rad";
    const cx = toX(tx);
    const cy = toY(ty);
    const rPx = R * avgScale;

    // Outer circle & axes
    ctx.strokeStyle = stroke || "#334155";
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(cx - rPx * 1.25, cy);
    ctx.lineTo(cx + rPx * 1.25, cy);
    ctx.moveTo(cx, cy + rPx * 1.25);
    ctx.lineTo(cx, cy - rPx * 1.25);
    ctx.stroke();

    // Swept Ox trajectory if enabled
    if (el.props?.showOxSweep) {
      const startAngle = typeof el.props?.sweepStartAngle === "number" ? el.props.sweepStartAngle : 0;
      const steps = 64;
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = Math.max(2, 2.5 * strokeWidthScale);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + ((angle - startAngle) * i) / steps;
        const px = cx + Math.cos(a) * rPx;
        const py = cy + ((i / steps) * 8 - 4);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    const mx = cx + Math.cos(angle) * rPx;
    const my = cy - Math.sin(angle) * rPx;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = Math.max(1.8, 2.2 * strokeWidthScale);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "#16a34a";
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, cy);
    ctx.stroke();
    ctx.strokeStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(cx, my);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();
    const readout = computeTrigValues(angle, unit);
    ctx.fillStyle = "#0f172a";
    ctx.font = `600 ${Math.round(12 * strokeWidthScale)}px system-ui, sans-serif`;
    ctx.fillText(`sin=${readout.sin.toFixed(2)}, cos=${readout.cos.toFixed(2)}`, cx - rPx, cy + rPx + 20);
    return true;
  }

  // --- VarTable (Bảng biến thiên / xét dấu) ---
  if (el.type === "VarTable") {
    const xs = Array.isArray(el.props?.xs) ? el.props.xs.map(String) : ["-∞", "-1", "1", "+∞"];
    const rows = Array.isArray(el.props?.rows) ? (el.props.rows as Array<{ kind?: string; label?: string; cells?: unknown[] }>) : [];
    const n = Math.max(2, xs.length);
    const headerW = 48;
    const nodeW = 54;
    const intervalW = 68;
    const wPx = (headerW + n * nodeW + (n - 1) * intervalW) * sc;
    const hPx = (36 + rows.reduce((s, r) => s + (r.kind === "variation" ? 98 : 34), 0)) * sc;
    const x0 = toX(tx);
    const y0 = toY(ty);
    const borderCol = stroke || "#1e293b";

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = borderCol;
    ctx.fillRect(x0, y0, wPx, hPx);
    ctx.strokeRect(x0, y0, wPx, hPx);

    const colCenter = (slotIdx: number) => {
      // slotIdx 0..2n-2: even = node, odd = interval
      let x = x0 + headerW * sc;
      for (let s = 0; s < slotIdx; s++) x += (s % 2 === 0 ? nodeW : intervalW) * sc;
      return x + ((slotIdx % 2 === 0 ? nodeW : intervalW) * sc) / 2;
    };

    ctx.fillStyle = "#0f172a";
    ctx.font = `600 ${Math.round(13 * sc)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("x", x0 + (headerW * sc) / 2, y0 + 23 * sc);
    for (let i = 0; i < xs.length; i++) {
      ctx.fillText(xs[i].replace(/\\infty/g, "∞"), colCenter(i * 2), y0 + 23 * sc);
    }

    let curY = y0 + 36 * sc;
    for (const r of rows) {
      const rh = (r.kind === "variation" ? 98 : 34) * sc;
      ctx.strokeStyle = borderCol;
      ctx.beginPath();
      ctx.moveTo(x0, curY);
      ctx.lineTo(x0 + wPx, curY);
      ctx.stroke();
      ctx.fillText(String(r.label ?? ""), x0 + (headerW * sc) / 2, curY + rh * 0.58);

      const cells = Array.isArray(r.cells) ? r.cells : [];
      if (r.kind === "sign") {
        for (let i = 0; i < cells.length; i++) {
          ctx.fillText(String(cells[i] ?? ""), colCenter(i), curY + 22 * sc);
        }
      } else if (r.kind === "variation") {
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < cells.length; i++) {
          const cellObj = cells[i] as { v?: Array<{ latex?: string; level?: string }> } | undefined;
          const items = Array.isArray(cellObj?.v) ? cellObj.v : [];
          const cx = colCenter(i * 2);
          for (const it of items) {
            const ly = it.level === "top" ? curY + 18 * sc : it.level === "bottom" ? curY + rh - 14 * sc : curY + rh * 0.52;
            ctx.fillText(String(it.latex ?? "").replace(/\\infty/g, "∞"), cx, ly);
            pts.push({ x: cx, y: ly - 4 * sc });
          }
        }
        for (let i = 0; i + 1 < pts.length; i++) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x + 16, pts[i].y);
          ctx.lineTo(pts[i + 1].x - 16, pts[i + 1].y);
          ctx.stroke();
          drawArrowheadCanvas(ctx, pts[i].x + 16, pts[i].y, pts[i + 1].x - 16, pts[i + 1].y, 7, borderCol);
        }
      }
      curY += rh;
    }
    return true;
  }

  // --- Stats Elements: Chart, TreeDiagram, Venn, Counting, NumberLine, Network ---
  if (el.type === "Chart") {
    const kind = String(el.props?.kind ?? "bar");
    const title = typeof el.props?.title === "string" ? el.props.title : "";
    const raw = (el.props?.data as Record<string, unknown> | undefined) ?? {
      kind: "categories",
      labels: ["A", "B", "C", "D"],
      values: [5, 8, 3, 6],
    };
    const vals: number[] =
      raw.kind === "grouped" && Array.isArray(raw.counts)
        ? raw.counts.map(Number)
        : Array.isArray(raw.values)
        ? raw.values.map(Number)
        : [5, 8, 3, 6];
    const lbls: string[] = Array.isArray(raw.labels) ? raw.labels.map(String) : vals.map((_, i) => String(i + 1));
    const x0 = toX(tx);
    const y0 = toY(ty);
    const w = 320 * sc;
    const h = 210 * sc;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0, y0, w, h);
    if (title) {
      ctx.fillStyle = "#0f172a";
      ctx.font = `700 ${Math.round(13 * sc)}px system-ui, sans-serif`;
      ctx.fillText(title, x0 + 12, y0 + 20);
    }

    const pL = x0 + 36 * sc;
    const pR = x0 + w - 16 * sc;
    const pT = y0 + 32 * sc;
    const pB = y0 + h - 28 * sc;
    const maxV = Math.max(1, ...vals);

    if (kind === "pie") {
      const total = vals.reduce((s, v) => s + Math.max(0, v), 0) || 1;
      let startAng = -Math.PI / 2;
      const rPie = Math.min(pR - pL, pB - pT) * 0.42;
      const cpx = (pL + pR) / 2;
      const cpy = (pT + pB) / 2;
      vals.forEach((v, idx) => {
        const span = (Math.max(0, v) / total) * Math.PI * 2;
        ctx.fillStyle = PIE_COLORS[idx % PIE_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(cpx, cpy);
        ctx.arc(cpx, cpy, rPie, startAng, startAng + span);
        ctx.closePath();
        ctx.fill();
        startAng += span;
      });
    } else if (kind === "box") {
      const stats = raw.kind === "grouped" && Array.isArray(raw.edges)
        ? computeGroupedStats(raw.edges.map(Number), vals)
        : computeDescriptiveStats(vals);
      const span = Math.max(1e-6, stats.max - stats.min);
      const mx = (v: number) => pL + ((v - stats.min) / span) * (pR - pL);
      const mid = (pT + pB) / 2;
      ctx.strokeStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.moveTo(mx(stats.min), mid);
      ctx.lineTo(mx(stats.max), mid);
      ctx.stroke();
      ctx.fillStyle = "rgba(147,197,253,0.55)";
      ctx.fillRect(mx(stats.q1), mid - 18, Math.max(2, mx(stats.q3) - mx(stats.q1)), 36);
      ctx.strokeRect(mx(stats.q1), mid - 18, Math.max(2, mx(stats.q3) - mx(stats.q1)), 36);
      ctx.strokeStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(mx(stats.median), mid - 18);
      ctx.lineTo(mx(stats.median), mid + 18);
      ctx.stroke();
    } else if (kind === "line") {
      ctx.strokeStyle = "#2563eb";
      ctx.beginPath();
      vals.forEach((v, i) => {
        const x = pL + ((i + 0.5) * (pR - pL)) / Math.max(1, vals.length);
        const y = pB - (Math.max(0, v) / maxV) * (pB - pT);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else {
      const slot = (pR - pL) / Math.max(1, vals.length);
      vals.forEach((v, i) => {
        const barH = (Math.max(0, v) / maxV) * (pB - pT);
        ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
        ctx.fillRect(pL + i * slot + slot * 0.15, pB - barH, slot * 0.7, barH);
        ctx.fillStyle = "#334155";
        ctx.font = `${Math.round(10 * sc)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(lbls[i] ?? "", pL + (i + 0.5) * slot, pB + 14);
      });
    }
    return true;
  }

  if (el.type === "TreeDiagram") {
    type TNode = { label: string; p?: string; children?: TNode[] };
    type LaidTNode = { label: string; p?: string; x: number; y: number; ch: LaidTNode[] };
    const root: TNode = (el.props?.root as TNode | undefined) ?? { label: "Ω", children: [] };
    const x0 = toX(tx);
    const y0 = toY(ty);
    let leaf = 0;
    const layout = (n: TNode, depth = 0): LaidTNode => {
      const x = x0 + (depth * 115 + 34) * sc;
      const cs = n.children ?? [];
      if (cs.length === 0) {
        const y = y0 + (leaf * 48 + 30) * sc;
        leaf++;
        return { label: n.label, p: n.p, x, y, ch: [] };
      }
      const laid = cs.map((c) => layout(c, depth + 1));
      return { label: n.label, p: n.p, x, y: (laid[0].y + laid[laid.length - 1].y) / 2, ch: laid };
    };
    const tree = layout(root);
    const walkDraw = (node: LaidTNode) => {
      for (const c of node.ch) {
        ctx.strokeStyle = "#475569";
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
        if (c.p) {
          ctx.fillStyle = "#1d4ed8";
          ctx.font = `600 ${Math.round(11 * sc)}px system-ui, sans-serif`;
          ctx.fillText(c.p, (node.x + c.x) / 2, (node.y + c.y) / 2 - 4);
        }
        walkDraw(c);
      }
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.font = `700 ${Math.round(12 * sc)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(node.label, node.x, node.y + 4);
    };
    walkDraw(tree);
    return true;
  }

  if (el.type === "Venn") {
    const x0 = toX(tx);
    const y0 = toY(ty);
    const labels = Array.isArray(el.props?.labels) ? el.props.labels.map(String) : ["A", "B"];
    const sets = Math.min(3, Math.max(2, Number(el.props?.sets ?? labels.length)));
    const w = 310 * sc;
    const h = 205 * sc;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0, y0, w, h);
    const specs = sets === 3
      ? [
          { cx: x0 + 122 * sc, cy: y0 + 86 * sc, col: "#2563eb", lbl: labels[0] ?? "A" },
          { cx: x0 + 188 * sc, cy: y0 + 86 * sc, col: "#dc2626", lbl: labels[1] ?? "B" },
          { cx: x0 + 155 * sc, cy: y0 + 132 * sc, col: "#16a34a", lbl: labels[2] ?? "C" },
        ]
      : [
          { cx: x0 + 120 * sc, cy: y0 + 104 * sc, col: "#2563eb", lbl: labels[0] ?? "A" },
          { cx: x0 + 190 * sc, cy: y0 + 104 * sc, col: "#dc2626", lbl: labels[1] ?? "B" },
        ];
    for (const s of specs) {
      ctx.save();
      ctx.fillStyle = s.col;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, (sets === 3 ? 54 : 62) * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = s.col;
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, (sets === 3 ? 54 : 62) * sc, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = s.col;
      ctx.font = `700 ${Math.round(13 * sc)}px system-ui, sans-serif`;
      ctx.fillText(s.lbl, s.cx - 8, s.cy);
    }
    return true;
  }

  if (el.type === "Counting") {
    const kind = (el.props?.kind as "perm" | "arr" | "comb") ?? "comb";
    const items = Array.isArray(el.props?.items) ? el.props.items.map(String) : ["A", "B", "C", "D"];
    const n = items.length;
    const k = kind === "perm" ? n : Math.min(n, Math.max(1, Number(el.props?.k ?? 2)));
    const total = kind === "perm" ? permutationCount(n) : kind === "arr" ? arrangementCount(n, k) : combinationCount(n, k);
    const label = kind === "perm" ? `Hoán vị P(${n}) = ${total}` : kind === "arr" ? `Chỉnh hợp A(${n},${k}) = ${total}` : `Tổ hợp C(${n},${k}) = ${total}`;
    const x0 = toX(tx);
    const y0 = toY(ty);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillRect(x0, y0, 260 * sc, 54 * sc);
    ctx.strokeRect(x0, y0, 260 * sc, 54 * sc);
    ctx.fillStyle = "#0f172a";
    ctx.font = `700 ${Math.round(13 * sc)}px system-ui, sans-serif`;
    ctx.fillText(label, x0 + 12, y0 + 24 * sc);
    ctx.fillStyle = "#475569";
    ctx.font = `${Math.round(11 * sc)}px system-ui, sans-serif`;
    ctx.fillText(`Phần tử: {${items.join(", ")}}`, x0 + 12, y0 + 42 * sc);
    return true;
  }

  if (el.type === "NumberLine") {
    const setExpr = typeof el.props?.set === "string" ? el.props.set : "[-2; 3)";
    const parsed = parseNumberLineSet(setExpr);
    const x0 = toX(tx);
    const y0 = toY(ty);
    const xStart = x0 + 24;
    const xEnd = x0 + 310 * sc;
    const midY = y0 + 30;
    ctx.strokeStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(xStart, midY);
    ctx.lineTo(xEnd, midY);
    ctx.stroke();
    drawArrowheadCanvas(ctx, xStart, midY, xEnd, midY, 8, "#0f172a");
    if (!("error" in parsed)) {
      const vals = [
        ...parsed.intervals.flatMap((iv) => [iv.lo, iv.hi]).filter(Number.isFinite),
        ...parsed.points,
        0,
      ];
      const minV = Math.min(...vals) - 2;
      const maxV = Math.max(...vals) + 2;
      const mapX = (v: number) =>
        v === -Infinity ? xStart : v === Infinity ? xEnd - 12 : xStart + 18 + ((v - minV) / Math.max(1, maxV - minV)) * (xEnd - xStart - 40);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 3.2;
      for (const iv of parsed.intervals) {
        const px1 = mapX(iv.lo);
        const px2 = mapX(iv.hi);
        ctx.beginPath();
        ctx.moveTo(px1, midY);
        ctx.lineTo(px2, midY);
        ctx.stroke();
        ctx.fillStyle = "#2563eb";
        ctx.font = "700 15px system-ui, sans-serif";
        if (Number.isFinite(iv.lo)) ctx.fillText(iv.loOpen ? "(" : "[", px1 - 4, midY + 5);
        if (Number.isFinite(iv.hi)) ctx.fillText(iv.hiOpen ? ")" : "]", px2 - 4, midY + 5);
      }
    }
    return true;
  }

  if (el.type === "Network") {
    const nodes = (Array.isArray(el.props?.nodes) ? el.props.nodes : []) as Array<{ id: string; label: string; x: number; y: number }>;
    const edges = (Array.isArray(el.props?.edges) ? el.props.edges : []) as Array<{ a: string; b: string; label?: string }>;
    const directed = Boolean(el.props?.directed);
    const mapN = new Map(nodes.map((n) => [n.id, { x: tx + n.x * sc, y: ty + n.y * sc, label: n.label }]));
    ctx.strokeStyle = stroke || "#334155";
    for (const ed of edges) {
      const na = mapN.get(ed.a);
      const nb = mapN.get(ed.b);
      if (!na || !nb) continue;
      strokePolyline(rc, [na, nb]);
      if (directed) {
        drawArrowheadCanvas(ctx, toX(na.x), toY(na.y), toX(nb.x), toY(nb.y), 9, ctx.strokeStyle);
      }
      if (ed.label) {
        ctx.fillStyle = "#1565C0";
        ctx.font = `600 ${Math.round(12 * strokeWidthScale)}px system-ui, sans-serif`;
        ctx.fillText(ed.label, toX((na.x + nb.x) / 2), toY((na.y + nb.y) / 2) - 4);
      }
    }
    for (const n of mapN.values()) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(toX(n.x), toY(n.y), 0.28 * avgScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.font = `700 ${Math.round(13 * strokeWidthScale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(n.label, toX(n.x), toY(n.y) + 4);
    }
    return true;
  }

  // --- RealObject & LineDecor ---
  if (el.type === "RealObject") {
    const iconId = typeof el.props?.icon === "string" ? el.props.icon : "tree";
    const src = typeof el.props?.src === "string" ? el.props.src : undefined;
    const ratio = typeof el.props?.ratio === "number" ? el.props.ratio : 1;
    const fromPt = (typeof el.props?.from === "string" ? solved.pts.get(el.props.from) : undefined) ?? { x: tx, y: ty };
    const toPt = (typeof el.props?.to === "string" ? solved.pts.get(el.props.to) : undefined) ?? { x: tx, y: ty + 3 * sc };
    const widthScale = typeof el.props?.width === "number" ? el.props.width : 1;
    const flip = Boolean(el.props?.flip);
    const item = getRealWorldItem(iconId);
    const box: [number, number, number, number] = src ? [0, 0, ratio, 1] : item.box;
    const mat = computeArtTransformMatrix(fromPt, toPt, box, widthScale, flip);
    const cached = rc.preloadedImages?.get(el.id);

    if (cached && mat) {
      // Transform SVG world space -> Canvas2D pixel space
      ctx.save();
      ctx.translate(toX(0), toY(0));
      ctx.scale(scaleX, scaleY);
      ctx.transform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]);
      ctx.drawImage(cached, box[0], box[1], box[2] - box[0], box[3] - box[1]);
      ctx.restore();
    } else {
      ctx.strokeStyle = stroke || "#d97706";
      strokePolyline(rc, [fromPt, toPt]);
      ctx.fillStyle = stroke || "#d97706";
      ctx.font = `600 ${Math.round(12 * strokeWidthScale)}px system-ui, sans-serif`;
      ctx.fillText(item.name, toX((fromPt.x + toPt.x) / 2) + 8, toY((fromPt.y + toPt.y) / 2));
    }
    return true;
  }

  if (el.type === "LineDecor") {
    const targetId = typeof el.props?.target === "string" ? el.props.target : "";
    const target = byId.get(targetId);
    const ends = target ? resolveLineEndpoints(target, solved.pts, byId) : null;
    const a = ends?.[0] ?? { x: tx - 2, y: ty };
    const b = ends?.[1] ?? { x: tx + 2, y: ty };
    const kind = String(el.props?.kind ?? "ground");
    const len = dist2D(a, b);
    if (len < 1e-6) return true;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const side = el.props?.side === -1 ? -1 : el.props?.side === 1 ? 1 : kind === "ground" || kind === "water" ? -1 : 1;
    let nx = -uy;
    let ny = ux;
    if (ny < -1e-5 || (Math.abs(ny) <= 1e-5 && nx < 0)) {
      nx = -nx;
      ny = -ny;
    }
    nx *= side;
    ny *= side;

    if (kind === "ground") {
      const count = Math.max(4, Math.floor(len / 0.28));
      for (let i = 0; i <= count; i++) {
        const px = a.x + ux * (i * len) / count;
        const py = a.y + uy * (i * len) / count;
        strokePolyline(rc, [
          { x: px, y: py },
          { x: px + (nx * 0.24 - ux * 0.12), y: py + (ny * 0.24 - uy * 0.12) },
        ]);
      }
    } else if (kind === "dim") {
      const off = typeof el.props?.offset === "number" ? el.props.offset : 0.6;
      const d1 = { x: a.x + nx * off, y: a.y + ny * off };
      const d2 = { x: b.x + nx * off, y: b.y + ny * off };
      strokePolyline(rc, [a, d1]);
      strokePolyline(rc, [b, d2]);
      strokePolyline(rc, [d1, d2]);
      drawArrowheadCanvas(ctx, toX(d2.x), toY(d2.y), toX(d1.x), toY(d1.y), 7, stroke);
      drawArrowheadCanvas(ctx, toX(d1.x), toY(d1.y), toX(d2.x), toY(d2.y), 7, stroke);
      if (typeof el.props?.text === "string" && el.props.text) {
        ctx.fillStyle = stroke;
        ctx.font = `600 ${Math.round(13 * strokeWidthScale)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(el.props.text, toX((d1.x + d2.x) / 2), toY((d1.y + d2.y) / 2) - 5);
      }
    } else if (typeof el.props?.text === "string" && el.props.text) {
      ctx.fillStyle = stroke;
      ctx.font = `600 ${Math.round(13 * strokeWidthScale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(el.props.text, toX((a.x + b.x) / 2 + nx * 0.28), toY((a.y + b.y) / 2 + ny * 0.28));
    }
    return true;
  }

  return false;
}
