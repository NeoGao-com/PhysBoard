import type { BoundingBox, CanvasElement, Style, Transform } from "@/types/whiteboard";

export const GEOM_EPS = 1e-9;
export const CONSTRUCT_MARKS_STORAGE_KEY = "wb_construct_marks";
export const DEFAULT_LABEL_SCALE = 1;
export const DEFAULT_DOT_SCALE = 1.5;
export const SCALE_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5] as const;

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Line2D {
  px: number;
  py: number;
  dx: number;
  dy: number;
}

export interface Circle2D {
  cx: number;
  cy: number;
  r: number;
}

export interface EmbeddedVertex {
  id: string;
  name: string;
  x: number;
  y: number;
}

export type PointConstraint =
  | { kind: "free" }
  | { kind: "on"; target: string; t?: number }
  | { kind: "onObject"; target: string; t: number }
  | { kind: "onLine"; a: string; b: string; t: number }
  | { kind: "onRound"; solid: string; face: string; t: number }
  | { kind: "onSurface"; solid: string; u: number; v: number }
  | { kind: "intersection"; a: string; b: string; which?: number }
  | { kind: "midpoint"; segment: string }
  | { kind: "midpointOf"; a: string; b: string }
  | { kind: "foot"; p: string; a: string; b: string }
  | { kind: "circumcenter"; a: string; b: string; c: string }
  | { kind: "sphereCenter"; a: string; b: string; c: string; d: string }
  | { kind: "incenter"; a: string; b: string; c: string }
  | { kind: "orthocenter"; a: string; b: string; c: string }
  | { kind: "centroid"; a: string; b: string; c: string }
  | { kind: "bisectorFoot"; vertex: string; a: string; b: string }
  | { kind: "footPlane"; p: string; a: string; b: string; c: string }
  | { kind: "linePlane"; a: string; b: string; p: string; q: string; r: string }
  | { kind: "commonPerp"; a: string; b: string; c: string; d: string }
  | { kind: "tangentPoint"; p: string; circle: string; side: number }
  | { kind: "reflectPoint"; p: string; center: string }
  | { kind: "reflectLine"; p: string; a: string; b: string }
  | { kind: "reflectOver"; p: string; line: string }
  | { kind: "translate"; p: string; from: string; to: string }
  | { kind: "rotate"; p: string; center: string; deg: number }
  | { kind: "homothety"; p: string; center: string; k: number }
  | { kind: "atAngle"; vertex: string; arm: string; deg: number; len?: number; fixed?: boolean }
  | { kind: "combo"; refs: string[]; w: number[] }
  | { kind: "flat"; anchor: string; src: string; a: string; b: string; c: string; rot: number; flip: boolean }
  | { kind: "oxy"; axes: string; x: number; y: number }
  | { kind: "oxyz"; axes: string; x: number; y: number; z: number };

export interface GeomPointProps {
  name: string;
  constraint: PointConstraint;
  labelDx?: number;
  labelDy?: number;
  handle?: boolean;
  hideName?: boolean;
  dot?: "dot" | "cross" | "none";
  dotSize?: number;
  labelScale?: number;
}

export interface GeomSegmentProps {
  from: string;
  to: string;
  ticks?: 1 | 2 | 3;
  dashed?: boolean;
  measure?: boolean;
  construction?: string;
}

export interface GeomVectorProps {
  from: string;
  to: string;
  name?: string;
  measure?: boolean;
  coords?: boolean;
  components?: boolean;
}

export interface GeomRayProps {
  from: string;
  to: string;
}

export type GeomLineProps =
  | { def: "through"; from: string; to: string; ext?: [number, number]; construction?: string }
  | { def: "perpBisector"; segment: string; ext?: [number, number]; construction?: string }
  | { def: "perp"; line: string; through: string; ext?: [number, number]; construction?: string }
  | { def: "parallel"; line: string; through: string; ext?: [number, number]; construction?: string }
  | { def: "bisector"; vertex: string; p1: string; p2: string; ext?: [number, number]; construction?: string }
  | { def: "tangent"; circle: string; through: string; ext?: [number, number]; construction?: string };

export type CircleRadiusSpec =
  | { kind: "value"; v: number }
  | { kind: "through"; point: string }
  | { kind: "toLine"; a: string; b: string };

export interface GeomCircleProps {
  center: string;
  radius: CircleRadiusSpec;
}

export type TrianglePresetKind = "right" | "rightIsosceles" | "isosceles" | "equilateral";
export type QuadPresetKind = "parallelogram" | "rhombus" | "rectangle" | "square";

export interface EmbeddedRightAngleMark {
  vertexIndex: number;
}

export interface EmbeddedTickMark {
  edgeIndex: number;
  ticks: 1 | 2 | 3;
}

export interface GeomPolygonProps {
  vertices: string[];
  label?: string;
  preset?: TrianglePresetKind | QuadPresetKind;
  points?: EmbeddedVertex[];
  rightAngles?: number[];
  edgeTicks?: Record<number, 1 | 2 | 3>;
}

export interface GeomAngleProps {
  vertex: string;
  arms: [string, string];
  mark?: string;
  valueLatex?: string;
  bare?: boolean;
  measure?: boolean;
  turn?: boolean;
}

export interface FillRegionProps {
  bounds: string[];
  cycle: string[];
  seed: [number, number];
  gap: number;
}

export interface GeomConstructionProps {
  kind:
    | "altitude"
    | "median"
    | "bisector"
    | "perpBisector"
    | "tangent"
    | "perp"
    | "parallel"
    | "centroid"
    | "orthocenter"
    | "circumcircle"
    | "incircle"
    | "commonPerp"
    | "footPlane"
    | "giaotuyen";
  from?: string;
  to?: string;
  foot?: string;
  vertex?: string;
  sideA?: string;
  sideB?: string;
  rightAngleAt?: string;
  ticks?: 1 | 2 | 3;
  dashed?: boolean;
  label?: string;
}

export type CurveGeometry =
  | ({ kind: "line" } & Line2D)
  | ({ kind: "circle" } & Circle2D);

export interface Solved2DScene {
  points: Map<string, Point2D>;
  undef: Set<string>;
  curves: Map<string, CurveGeometry>;
}

// --- Basic 2D Vector Math ---

export function dist2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint2D(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function sub2D(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add2D(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function dot2D(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

export function cross2D(a: Point2D, b: Point2D): number {
  return a.x * b.y - a.y * b.x;
}

export function unitDir2D(from: Point2D, to: Point2D): Point2D {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function perpDir2D(from: Point2D, to: Point2D): Point2D {
  const u = unitDir2D(from, to);
  return { x: -u.y, y: u.x };
}

export function footOfPerpendicular(p: Point2D, a: Point2D, b: Point2D): Point2D | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < GEOM_EPS) return null;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function circumcenter2D(a: Point2D, b: Point2D, c: Point2D): Point2D | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < GEOM_EPS) return null;
  const aSq = a.x * a.x + a.y * a.y;
  const bSq = b.x * b.x + b.y * b.y;
  const cSq = c.x * c.x + c.y * c.y;
  return {
    x: (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d,
    y: (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d,
  };
}

export function orthocenter2D(a: Point2D, b: Point2D, c: Point2D): Point2D | null {
  const o = circumcenter2D(a, b, c);
  if (!o) return null;
  return {
    x: a.x + b.x + c.x - 2 * o.x,
    y: a.y + b.y + c.y - 2 * o.y,
  };
}

export function incenter2D(a: Point2D, b: Point2D, c: Point2D): Point2D | null {
  const la = dist2D(b, c);
  const lb = dist2D(a, c);
  const lc = dist2D(a, b);
  const p = la + lb + lc;
  if (p < GEOM_EPS) return null;
  return {
    x: (la * a.x + lb * b.x + lc * c.x) / p,
    y: (la * a.y + lb * b.y + lc * c.y) / p,
  };
}

export function centroid2D(a: Point2D, b: Point2D, c: Point2D): Point2D {
  return {
    x: (a.x + b.x + c.x) / 3,
    y: (a.y + b.y + c.y) / 3,
  };
}

export function bisectorFoot2D(vertex: Point2D, a: Point2D, b: Point2D): Point2D | null {
  const da = dist2D(vertex, a);
  const db = dist2D(vertex, b);
  const sum = da + db;
  if (sum < GEOM_EPS) return null;
  return {
    x: (db * a.x + da * b.x) / sum,
    y: (db * a.y + da * b.y) / sum,
  };
}

export function intersectLines2D(l1: Line2D, l2: Line2D): Point2D | null {
  const det = l1.dx * l2.dy - l1.dy * l2.dx;
  if (Math.abs(det) < GEOM_EPS) return null;
  const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / det;
  return { x: l1.px + t * l1.dx, y: l1.py + t * l1.dy };
}

export function intersectLineCircleParams(line: Line2D, circle: Circle2D): number[] {
  const ox = line.px - circle.cx;
  const oy = line.py - circle.cy;
  const a = line.dx * line.dx + line.dy * line.dy;
  if (a < GEOM_EPS) return [];
  const b = 2 * (ox * line.dx + oy * line.dy);
  const c = ox * ox + oy * oy - circle.r * circle.r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    return disc > -1e-9 * b * b ? [-b / (2 * a)] : [];
  }
  const s = Math.sqrt(disc);
  if (s < 1e-9 * Math.abs(b)) return [-b / (2 * a)];
  return [(-b - s) / (2 * a), (-b + s) / (2 * a)];
}

export function intersectLineCircleAt(line: Line2D, circle: Circle2D, which = 0): Point2D | null {
  const ts = intersectLineCircleParams(line, circle);
  const t = ts[Math.min(which, ts.length - 1)];
  if (t === undefined) return null;
  return { x: line.px + t * line.dx, y: line.py + t * line.dy };
}

export function intersectCircles2D(c1: Circle2D, c2: Circle2D): Point2D[] {
  const d = Math.hypot(c2.cx - c1.cx, c2.cy - c1.cy);
  if (d < GEOM_EPS || d > c1.r + c2.r + GEOM_EPS || d < Math.abs(c1.r - c2.r) - GEOM_EPS) {
    return [];
  }
  const a = (d * d - c2.r * c2.r + c1.r * c1.r) / (2 * d);
  const hSq = Math.max(0, c1.r * c1.r - a * a);
  const h = Math.sqrt(hSq);
  const ux = (c2.cx - c1.cx) / d;
  const uy = (c2.cy - c1.cy) / d;
  const p0: Point2D = { x: c1.cx + a * ux - h * uy, y: c1.cy + a * uy + h * ux };
  if (h < 1e-9 * Math.max(c1.r, c2.r)) return [p0];
  return [p0, { x: c1.cx + a * ux + h * uy, y: c1.cy + a * uy - h * ux }];
}

export function intersectCirclesAt(c1: Circle2D, c2: Circle2D, which = 0): Point2D | null {
  const pts = intersectCircles2D(c1, c2);
  return pts[Math.min(which, pts.length - 1)] ?? null;
}

export function tangentPointToCircle(p: Point2D, circle: Circle2D, side = 0): Point2D | null {
  const dx = p.x - circle.cx;
  const dy = p.y - circle.cy;
  const d = Math.hypot(dx, dy);
  if (d <= circle.r + GEOM_EPS) return null;
  const a = (circle.r * circle.r) / d;
  const h = (circle.r * Math.sqrt(Math.max(0, d * d - circle.r * circle.r))) / d;
  const ux = dx / d;
  const uy = dy / d;
  const sgn = side === 0 ? 1 : -1;
  return {
    x: circle.cx + a * ux - sgn * h * uy,
    y: circle.cy + a * uy + sgn * h * ux,
  };
}

export function tangentPointsToCircle(p: Point2D, circle: Circle2D): Point2D[] {
  const p0 = tangentPointToCircle(p, circle, 0);
  const p1 = tangentPointToCircle(p, circle, 1);
  return [p0, p1].filter((pt): pt is Point2D => pt !== null);
}

export function reflectPointOverPoint(p: Point2D, center: Point2D): Point2D {
  return { x: 2 * center.x - p.x, y: 2 * center.y - p.y };
}

export function reflectPointOverLine(p: Point2D, a: Point2D, b: Point2D): Point2D | null {
  const foot = footOfPerpendicular(p, a, b);
  if (!foot) return null;
  return reflectPointOverPoint(p, foot);
}

export function rotatePointAround(p: Point2D, center: Point2D, deg: number): Point2D {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function pointAtAngle(vertex: Point2D, arm: Point2D, deg: number, len?: number): Point2D | null {
  const dist = Math.hypot(arm.x - vertex.x, arm.y - vertex.y);
  if (dist <= GEOM_EPS) return null;
  const targetLen = len ?? dist;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = arm.x - vertex.x;
  const dy = arm.y - vertex.y;
  return {
    x: vertex.x + (targetLen / dist) * (dx * cos - dy * sin),
    y: vertex.y + (targetLen / dist) * (dx * sin + dy * cos),
  };
}

export function homothetyPoint(p: Point2D, center: Point2D, k: number): Point2D {
  return {
    x: center.x + k * (p.x - center.x),
    y: center.y + k * (p.y - center.y),
  };
}

export function translatePoint(p: Point2D, from: Point2D, to: Point2D): Point2D {
  return {
    x: p.x + to.x - from.x,
    y: p.y + to.y - from.y,
  };
}

export function computeAngleDegrees(vertex: Point2D, armA: Point2D, armB: Point2D, turn = false): number {
  const a1 = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
  const a2 = Math.atan2(armB.y - vertex.y, armB.x - vertex.x);
  if (turn) {
    let diff = ((a2 - a1) * 180) / Math.PI;
    while (diff < 0) diff += 360;
    return diff;
  }
  let diff = Math.abs(((a2 - a1) * 180) / Math.PI) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function computeAngleArcPoints(
  vertex: Point2D,
  armA: Point2D,
  armB: Point2D,
  radius: number,
  segments = 16,
  turn = false
): Point2D[] {
  const start = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
  const end = Math.atan2(armB.y - vertex.y, armB.x - vertex.x);
  let delta = end - start;
  if (turn) {
    while (delta < 0) delta += Math.PI * 2;
  } else {
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
  }
  const pts: Point2D[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = start + (delta * i) / segments;
    pts.push({
      x: vertex.x + radius * Math.cos(theta),
      y: vertex.y + radius * Math.sin(theta),
    });
  }
  return pts;
}

export const LINE_EXTENSION_FACTOR = 1;
export const RAY_EXTENSION_FACTOR = 2;

export function clipLineSegment(a: Point2D, b: Point2D, factor = LINE_EXTENSION_FACTOR): [Point2D, Point2D] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return [
    { x: a.x - dx * factor, y: a.y - dy * factor },
    { x: b.x + dx * factor, y: b.y + dy * factor },
  ];
}

export function extendRay(from: Point2D, to: Point2D, factor = RAY_EXTENSION_FACTOR): [Point2D, Point2D] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return [from, { x: to.x + dx * factor, y: to.y + dy * factor }];
}

// --- Type Guards & Resolution Helpers ---

function asPointConstraint(raw: unknown): PointConstraint {
  if (!raw || typeof raw !== "object") return { kind: "free" };
  const c = raw as Record<string, unknown>;
  if (typeof c.kind !== "string") return { kind: "free" };
  return c as unknown as PointConstraint;
}

export function resolveCircleRadius(
  radiusSpec: CircleRadiusSpec | undefined,
  center: Point2D,
  getPoint: (id: string) => Point2D | undefined
): number | null {
  if (!radiusSpec) return null;
  if (radiusSpec.kind === "value" && typeof radiusSpec.v === "number" && Number.isFinite(radiusSpec.v)) {
    return radiusSpec.v;
  }
  if (radiusSpec.kind === "through" && radiusSpec.point) {
    const pt = getPoint(radiusSpec.point);
    return pt ? dist2D(center, pt) : null;
  }
  if (radiusSpec.kind === "toLine" && radiusSpec.a && radiusSpec.b) {
    const pa = getPoint(radiusSpec.a);
    const pb = getPoint(radiusSpec.b);
    if (!pa || !pb) return null;
    const foot = footOfPerpendicular(center, pa, pb);
    return foot ? dist2D(center, foot) : null;
  }
  return null;
}

export interface ResolvedLineExtents {
  anchor: Point2D;
  dir: Point2D;
  t0: number;
  t1: number;
  isRay: boolean;
}

export function getSegmentLikeEndpoints(
  el: CanvasElement | undefined,
  getPoint: (id: string) => Point2D | undefined
): [Point2D, Point2D] | null {
  if (!el) return null;
  const p = el.props;
  if (el.type === "GeomSegment" || el.type === "GeomRay" || el.type === "GeomVector") {
    const from = typeof p.from === "string" ? getPoint(p.from) : undefined;
    const to = typeof p.to === "string" ? getPoint(p.to) : undefined;
    return from && to ? [from, to] : null;
  }
  if (el.type === "GeomLine" && p.def === "through") {
    const from = typeof p.from === "string" ? getPoint(p.from) : undefined;
    const to = typeof p.to === "string" ? getPoint(p.to) : undefined;
    return from && to ? [from, to] : null;
  }
  return null;
}

export function resolveConstructedLine(
  el: CanvasElement,
  getPoint: (id: string) => Point2D | undefined,
  byId: Map<string, CanvasElement>
): ResolvedLineExtents | null {
  if (el.type !== "GeomLine") return null;
  const props = el.props as unknown as GeomLineProps;
  let anchor: Point2D | null = null;
  let vx = 0;
  let vy = 0;
  let defaultRange: [number, number] = [0, 0];

  if (props.def === "perpBisector") {
    const seg = byId.get(props.segment);
    if (!seg) return null;
    const pa = getPoint(String(seg.props.from ?? ""));
    const pb = getPoint(String(seg.props.to ?? ""));
    if (!pa || !pb) return null;
    anchor = midpoint2D(pa, pb);
    vx = -(pb.y - pa.y);
    vy = pb.x - pa.x;
    const len = Math.hypot(vx, vy);
    defaultRange = [-len, len];
  } else if (props.def === "bisector") {
    const vtx = getPoint(props.vertex);
    const p1 = getPoint(props.p1);
    const p2 = getPoint(props.p2);
    if (!vtx || !p1 || !p2) return null;
    const u1 = unitDir2D(vtx, p1);
    const u2 = unitDir2D(vtx, p2);
    anchor = vtx;
    vx = u1.x + u2.x;
    vy = u1.y + u2.y;
    const len = Math.hypot(vx, vy);
    defaultRange = [0, len * RAY_EXTENSION_FACTOR];
  } else if (props.def === "perp" || props.def === "parallel") {
    const through = getPoint(props.through);
    const refEnds = getSegmentLikeEndpoints(byId.get(props.line), getPoint);
    if (!through || !refEnds) {
      // Also support perp/parallel to another constructed GeomLine
      const refLineEl = byId.get(props.line);
      const refLine = refLineEl ? resolveLineGeometry(refLineEl, getPoint, byId) : null;
      if (!through || !refLine) return null;
      anchor = through;
      vx = props.def === "perp" ? -refLine.dy : refLine.dx;
      vy = props.def === "perp" ? refLine.dx : refLine.dy;
      const len = Math.hypot(vx, vy);
      defaultRange = [-len * LINE_EXTENSION_FACTOR, len * LINE_EXTENSION_FACTOR];
    } else {
      anchor = through;
      vx = refEnds[1].x - refEnds[0].x;
      vy = refEnds[1].y - refEnds[0].y;
      if (props.def === "perp") {
        const tmp = vx;
        vx = -vy;
        vy = tmp;
      }
      const len = Math.hypot(vx, vy);
      defaultRange = [-len * LINE_EXTENSION_FACTOR, len * LINE_EXTENSION_FACTOR];
    }
  } else if (props.def === "tangent") {
    const through = getPoint(props.through);
    const circleEl = byId.get(props.circle);
    const center = circleEl ? getPoint(String(circleEl.props.center ?? "")) : undefined;
    if (!through || !center) return null;
    anchor = through;
    vx = -(through.y - center.y);
    vy = through.x - center.x;
    const len = Math.hypot(vx, vy);
    defaultRange = [-len * 1.6, len * 1.6];
  } else {
    return null;
  }

  const len = Math.hypot(vx, vy);
  if (!anchor || len < GEOM_EPS) return null;
  const ext = props.ext;
  return {
    anchor,
    dir: { x: vx / len, y: vy / len },
    t0: ext ? ext[0] : defaultRange[0],
    t1: ext ? ext[1] : defaultRange[1],
    isRay: props.def === "bisector",
  };
}

export function resolveLineGeometry(
  el: CanvasElement | undefined,
  getPoint: (id: string) => Point2D | undefined,
  byId: Map<string, CanvasElement>,
  visiting: Set<string> = new Set()
): Line2D | null {
  if (!el || visiting.has(el.id)) return null;
  visiting.add(el.id);

  if (el.type === "GeomSegment" || el.type === "GeomRay" || el.type === "GeomVector") {
    const a = getPoint(String(el.props.from ?? ""));
    const b = getPoint(String(el.props.to ?? ""));
    if (!a || !b) return null;
    return { px: a.x, py: a.y, dx: b.x - a.x, dy: b.y - a.y };
  }

  if (el.type === "GeomLine") {
    const def = el.props.def;
    if (def === "through") {
      const a = getPoint(String(el.props.from ?? ""));
      const b = getPoint(String(el.props.to ?? ""));
      if (!a || !b) return null;
      return { px: a.x, py: a.y, dx: b.x - a.x, dy: b.y - a.y };
    }
    if (def === "perpBisector") {
      const seg = byId.get(String(el.props.segment ?? ""));
      if (!seg) return null;
      const a = getPoint(String(seg.props.from ?? ""));
      const b = getPoint(String(seg.props.to ?? ""));
      if (!a || !b) return null;
      const m = midpoint2D(a, b);
      return { px: m.x, py: m.y, dx: -(b.y - a.y), dy: b.x - a.x };
    }
    if (def === "perp" || def === "parallel") {
      const ref = resolveLineGeometry(byId.get(String(el.props.line ?? "")), getPoint, byId, visiting);
      const pt = getPoint(String(el.props.through ?? ""));
      if (!ref || !pt) return null;
      return def === "parallel"
        ? { px: pt.x, py: pt.y, dx: ref.dx, dy: ref.dy }
        : { px: pt.x, py: pt.y, dx: -ref.dy, dy: ref.dx };
    }
    if (def === "bisector") {
      const vtx = getPoint(String(el.props.vertex ?? ""));
      const p1 = getPoint(String(el.props.p1 ?? ""));
      const p2 = getPoint(String(el.props.p2 ?? ""));
      if (!vtx || !p1 || !p2) return null;
      const u1 = unitDir2D(vtx, p1);
      const u2 = unitDir2D(vtx, p2);
      return { px: vtx.x, py: vtx.y, dx: u1.x + u2.x, dy: u1.y + u2.y };
    }
    if (def === "tangent") {
      const circleEl = byId.get(String(el.props.circle ?? ""));
      const center = circleEl ? getPoint(String(circleEl.props.center ?? "")) : undefined;
      const pt = getPoint(String(el.props.through ?? ""));
      if (!center || !pt || dist2D(center, pt) < GEOM_EPS) return null;
      return { px: pt.x, py: pt.y, dx: -(pt.y - center.y), dy: pt.x - center.x };
    }
  }
  return null;
}

export function resolveLineEndpoints(
  el: CanvasElement,
  points: Map<string, Point2D>,
  byId: Map<string, CanvasElement>
): [Point2D, Point2D] | null {
  const getPoint = (id: string) => points.get(id);
  if (el.type === "GeomSegment" || el.type === "GeomVector") {
    const a = getPoint(String(el.props.from ?? ""));
    const b = getPoint(String(el.props.to ?? ""));
    return a && b ? [a, b] : null;
  }
  if (el.type === "GeomRay") {
    const a = getPoint(String(el.props.from ?? ""));
    const b = getPoint(String(el.props.to ?? ""));
    return a && b ? extendRay(a, b) : null;
  }
  if (el.type === "GeomLine") {
    if (el.props.def === "through") {
      const a = getPoint(String(el.props.from ?? ""));
      const b = getPoint(String(el.props.to ?? ""));
      return a && b ? clipLineSegment(a, b) : null;
    }
    const resolved = resolveConstructedLine(el, getPoint, byId);
    if (!resolved) return null;
    return [
      { x: resolved.anchor.x + resolved.dir.x * resolved.t0, y: resolved.anchor.y + resolved.dir.y * resolved.t0 },
      { x: resolved.anchor.x + resolved.dir.x * resolved.t1, y: resolved.anchor.y + resolved.dir.y * resolved.t1 },
    ];
  }
  return null;
}

// --- 2D Euclidean Constraint Solver ---

export function solve2DPoints(elements: CanvasElement[]): Solved2DScene {
  const byId = new Map<string, CanvasElement>(elements.map((el) => [el.id, el]));
  const points = new Map<string, Point2D>();
  const undef = new Set<string>();
  const visiting = new Set<string>();

  // Also index embedded preset polygon vertices by their embedded id so constructions can resolve them
  for (const el of elements) {
    if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
      const pts = el.props.points as EmbeddedVertex[];
      for (const v of pts) {
        if (v && typeof v.id === "string" && typeof v.x === "number" && typeof v.y === "number") {
          points.set(v.id, { x: v.x + el.transform.x, y: v.y + el.transform.y });
        }
      }
    }
  }

  const getCircle = (id: string): Circle2D | null => {
    const el = byId.get(id);
    if (!el || el.type !== "GeomCircle") return null;
    const center = resolvePoint(String(el.props.center ?? ""));
    if (!center) return null;
    const r = resolveCircleRadius(el.props.radius as CircleRadiusSpec | undefined, center, resolvePoint);
    return r === null ? null : { cx: center.x, cy: center.y, r };
  };

  const getCurve = (id: string): CurveGeometry | null => {
    const c = getCircle(id);
    if (c) return { kind: "circle", ...c };
    const el = byId.get(id);
    const l = resolveLineGeometry(el, resolvePoint, byId);
    return l ? { kind: "line", ...l } : null;
  };

  const intersectEntities = (aId: string, bId: string, which = 0): Point2D | null => {
    const la = resolveLineGeometry(byId.get(aId), resolvePoint, byId);
    const lb = resolveLineGeometry(byId.get(bId), resolvePoint, byId);
    if (la && lb) return intersectLines2D(la, lb);
    const ca = getCircle(aId);
    const cb = getCircle(bId);
    if (la && cb) return intersectLineCircleAt(la, cb, which);
    if (ca && lb) return intersectLineCircleAt(lb, ca, which);
    if (ca && cb) return intersectCirclesAt(ca, cb, which);
    return null;
  };

  const resolvePoint = (id: string): Point2D | undefined => {
    if (points.has(id)) return points.get(id);
    const el = byId.get(id);
    if (!el) return undefined;

    if (el.type === "Point") {
      const pt = { x: el.transform.x, y: el.transform.y };
      points.set(id, pt);
      return pt;
    }

    if (el.type !== "GeomPoint") return undefined;

    const fallback: Point2D = { x: el.transform.x, y: el.transform.y };
    if (visiting.has(id)) {
      return fallback;
    }
    visiting.add(id);

    const c = asPointConstraint(el.props.constraint);
    let resolved: Point2D | null = null;

    switch (c.kind) {
      case "free":
        resolved = fallback;
        break;
      case "onLine": {
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        const t = Number(c.t);
        if (a && b && Number.isFinite(t)) {
          resolved = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        }
        break;
      }
      case "on": {
        const target = getCurve(c.target);
        if (target) {
          if (target.kind === "circle") {
            const t = typeof c.t === "number" ? c.t : Math.atan2(fallback.y - target.cy, fallback.x - target.cx);
            resolved = { x: target.cx + target.r * Math.cos(t), y: target.cy + target.r * Math.sin(t) };
          } else {
            const lenSq = target.dx * target.dx + target.dy * target.dy;
            if (lenSq > GEOM_EPS) {
              const t =
                typeof c.t === "number"
                  ? c.t
                  : ((fallback.x - target.px) * target.dx + (fallback.y - target.py) * target.dy) / lenSq;
              resolved = { x: target.px + t * target.dx, y: target.py + t * target.dy };
            }
          }
        }
        break;
      }
      case "onObject": {
        const target = getCurve(c.target);
        const t = Number(c.t);
        if (target && Number.isFinite(t)) {
          resolved =
            target.kind === "circle"
              ? { x: target.cx + target.r * Math.cos(t), y: target.cy + target.r * Math.sin(t) }
              : { x: target.px + t * target.dx, y: target.py + t * target.dy };
        }
        break;
      }
      case "oxy": {
        const axes = byId.get(c.axes);
        if (axes?.type === "Axes2D") {
          const sc = axes.transform.scale || 1;
          resolved = { x: axes.transform.x + sc * c.x, y: axes.transform.y + sc * c.y };
        }
        break;
      }
      case "oxyz": {
        const axes = byId.get(c.axes);
        if (axes?.type === "Axes3D") {
          const sc = axes.transform.scale || 1;
          resolved = {
            x: axes.transform.x + sc * (c.y - 0.5 * c.x),
            y: axes.transform.y + sc * (c.z - 0.5 * c.x),
          };
        }
        break;
      }
      case "midpoint": {
        const seg = byId.get(c.segment);
        if (seg) {
          const a = resolvePoint(String(seg.props.from ?? ""));
          const b = resolvePoint(String(seg.props.to ?? ""));
          if (a && b) resolved = midpoint2D(a, b);
        }
        break;
      }
      case "midpointOf": {
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        if (a && b) resolved = midpoint2D(a, b);
        break;
      }
      case "intersection": {
        resolved = intersectEntities(c.a, c.b, c.which ?? 0);
        if (!resolved) undef.add(id);
        break;
      }
      case "foot": {
        const p = resolvePoint(c.p);
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        if (p && a && b) resolved = footOfPerpendicular(p, a, b);
        break;
      }
      case "circumcenter": {
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        const p3 = resolvePoint(c.c);
        if (a && b && p3) resolved = circumcenter2D(a, b, p3);
        break;
      }
      case "orthocenter": {
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        const p3 = resolvePoint(c.c);
        if (a && b && p3) resolved = orthocenter2D(a, b, p3);
        break;
      }
      case "incenter": {
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        const p3 = resolvePoint(c.c);
        if (a && b && p3) resolved = incenter2D(a, b, p3);
        break;
      }
      case "centroid": {
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        const p3 = resolvePoint(c.c);
        if (a && b && p3) resolved = centroid2D(a, b, p3);
        break;
      }
      case "bisectorFoot": {
        const vtx = resolvePoint(c.vertex);
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        if (vtx && a && b) resolved = bisectorFoot2D(vtx, a, b);
        break;
      }
      case "tangentPoint": {
        const p = resolvePoint(c.p);
        const circle = getCircle(c.circle);
        if (p && circle) resolved = tangentPointToCircle(p, circle, c.side);
        break;
      }
      case "reflectPoint": {
        const p = resolvePoint(c.p);
        const center = resolvePoint(c.center);
        if (p && center) resolved = reflectPointOverPoint(p, center);
        break;
      }
      case "reflectLine": {
        const p = resolvePoint(c.p);
        const a = resolvePoint(c.a);
        const b = resolvePoint(c.b);
        if (p && a && b) resolved = reflectPointOverLine(p, a, b);
        break;
      }
      case "reflectOver": {
        const p = resolvePoint(c.p);
        const line = resolveLineGeometry(byId.get(c.line), resolvePoint, byId);
        if (p && line) {
          resolved = reflectPointOverLine(p, { x: line.px, y: line.py }, { x: line.px + line.dx, y: line.py + line.dy });
        }
        break;
      }
      case "translate": {
        const p = resolvePoint(c.p);
        const from = resolvePoint(c.from);
        const to = resolvePoint(c.to);
        if (p && from && to) resolved = translatePoint(p, from, to);
        break;
      }
      case "rotate": {
        const p = resolvePoint(c.p);
        const center = resolvePoint(c.center);
        if (p && center) resolved = rotatePointAround(p, center, c.deg);
        break;
      }
      case "homothety": {
        const p = resolvePoint(c.p);
        const center = resolvePoint(c.center);
        if (p && center) resolved = homothetyPoint(p, center, c.k);
        break;
      }
      case "atAngle": {
        const vtx = resolvePoint(c.vertex);
        const arm = resolvePoint(c.arm);
        if (vtx && arm) resolved = pointAtAngle(vtx, arm, c.deg, c.len);
        break;
      }
      case "combo": {
        const refPts = c.refs.map(resolvePoint);
        if (refPts.every((pt): pt is Point2D => pt !== undefined) && refPts.length === c.w.length) {
          resolved = {
            x: c.w.reduce((acc, weight, idx) => acc + weight * refPts[idx].x, 0),
            y: c.w.reduce((acc, weight, idx) => acc + weight * refPts[idx].y, 0),
          };
        }
        break;
      }
      default:
        resolved = fallback;
        break;
    }

    visiting.delete(id);
    const finalPt = resolved ?? fallback;
    points.set(id, finalPt);
    return finalPt;
  };

  for (const el of elements) {
    if (el.type === "GeomPoint" || el.type === "Point") {
      resolvePoint(el.id);
    }
  }

  const curves = new Map<string, CurveGeometry>();
  for (const el of elements) {
    if (el.type === "GeomCircle" || el.type === "GeomLine" || el.type === "GeomSegment" || el.type === "GeomRay") {
      const c = getCurve(el.id);
      if (c) curves.set(el.id, c);
    }
  }

  return { points, undef, curves };
}

export function snapPointToObject(
  targetEl: CanvasElement,
  cursor: Point2D,
  points: Map<string, Point2D>,
  byId: Map<string, CanvasElement>
): { constraint: PointConstraint; at: Point2D } | null {
  const getPoint = (id: string) => points.get(id);
  const segEnds = getSegmentLikeEndpoints(targetEl, getPoint);
  if (segEnds) {
    const [a, b] = segEnds;
    const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (lenSq < 1e-12) return null;
    const t = ((cursor.x - a.x) * (b.x - a.x) + (cursor.y - a.y) * (b.y - a.y)) / lenSq;
    const clampedT = targetEl.type === "GeomSegment" ? Math.max(0, Math.min(1, t)) : t;
    const fromId = String(targetEl.props.from ?? "");
    const toId = String(targetEl.props.to ?? "");
    return {
      constraint: { kind: "onLine", a: fromId, b: toId, t: clampedT },
      at: { x: a.x + clampedT * (b.x - a.x), y: a.y + clampedT * (b.y - a.y) },
    };
  }

  if (targetEl.type === "GeomCircle") {
    const center = getPoint(String(targetEl.props.center ?? ""));
    if (!center) return null;
    const r = resolveCircleRadius(targetEl.props.radius as CircleRadiusSpec | undefined, center, getPoint);
    if (r === null) return null;
    const t = Math.atan2(cursor.y - center.y, cursor.x - center.x);
    return {
      constraint: { kind: "onObject", target: targetEl.id, t },
      at: { x: center.x + r * Math.cos(t), y: center.y + r * Math.sin(t) },
    };
  }

  const line = resolveLineGeometry(targetEl, getPoint, byId);
  if (!line) return null;
  const lenSq = line.dx * line.dx + line.dy * line.dy;
  if (lenSq < 1e-12) return null;
  const t = ((cursor.x - line.px) * line.dx + (cursor.y - line.py) * line.dy) / lenSq;
  return {
    constraint: { kind: "onObject", target: targetEl.id, t },
    at: { x: line.px + t * line.dx, y: line.py + t * line.dy },
  };
}

// --- Auto-Naming, Auto-Symbols, & Scale Helpers ---

export function getConstructMarksEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CONSTRUCT_MARKS_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setConstructMarksEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSTRUCT_MARKS_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage quota errors
  }
}

export function stepPointScale(current: number, delta: 1 | -1): number {
  let closestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < SCALE_STEPS.length; i++) {
    const diff = Math.abs(SCALE_STEPS[i] - current);
    if (diff < bestDiff) {
      bestDiff = diff;
      closestIdx = i;
    }
  }
  const nextIdx = Math.max(0, Math.min(SCALE_STEPS.length - 1, closestIdx + delta));
  return SCALE_STEPS[nextIdx];
}

export function collectUsedPointNames(elements: CanvasElement[]): Set<string> {
  const used = new Set<string>();
  for (const el of elements) {
    if (el.type === "GeomPoint" || el.type === "Point") {
      const name = typeof el.props.name === "string" ? el.props.name.trim() : "";
      if (name) used.add(name);
    } else if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
      for (const pt of el.props.points as EmbeddedVertex[]) {
        if (pt && typeof pt.name === "string" && pt.name.trim()) {
          used.add(pt.name.trim());
        }
      }
    }
  }
  return used;
}

const DEFAULT_POINT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

function toSubscript(n: number): string {
  return String(n)
    .split("")
    .map((ch) => SUBSCRIPT_DIGITS[Number(ch)] ?? ch)
    .join("");
}

export function getNextPointName(
  elements: CanvasElement[],
  preferredPool: string[] = [],
  extraUsed?: Set<string>
): string {
  const used = collectUsedPointNames(elements);
  if (extraUsed) {
    for (const u of extraUsed) used.add(u);
  }
  for (const candidate of preferredPool) {
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  for (let round = 0; round < 20; round++) {
    for (let i = 0; i < DEFAULT_POINT_ALPHABET.length; i++) {
      const base = DEFAULT_POINT_ALPHABET[i];
      const name = round === 0 ? base : `${base}${toSubscript(round)}`;
      if (!used.has(name)) {
        return name;
      }
    }
  }
  return `P${used.size + 1}`;
}

export function getNextPointNames(
  count: number,
  elements: CanvasElement[],
  preferredPool: string[] = []
): string[] {
  const extra = new Set<string>();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const next = getNextPointName(elements, preferredPool, extra);
    extra.add(next);
    names.push(next);
  }
  return names;
}

export function detectPolygonAutoMarks(
  vertices: Point2D[],
  marksEnabled: boolean
): { rightAngles: number[]; edgeTicks: Record<number, 1 | 2 | 3> } {
  if (!marksEnabled || vertices.length < 3) {
    return { rightAngles: [], edgeTicks: {} };
  }
  const n = vertices.length;
  const rightAngles: number[] = [];
  const edgeLens: number[] = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const u = unitDir2D(curr, prev);
    const v = unitDir2D(curr, next);
    if (Math.abs(dot2D(u, v)) < 1e-4) {
      rightAngles.push(i);
    }
    edgeLens.push(dist2D(curr, next));
  }

  // Group edges of equal length (minimum 2 edges in group)
  const edgeTicks: Record<number, 1 | 2 | 3> = {};
  const assigned = new Set<number>();
  let tickKind: 1 | 2 | 3 = 1;
  for (let i = 0; i < n; i++) {
    if (assigned.has(i)) continue;
    const matches = [i];
    for (let j = i + 1; j < n; j++) {
      if (!assigned.has(j) && Math.abs(edgeLens[i] - edgeLens[j]) < 1e-3 * Math.max(1, edgeLens[i])) {
        matches.push(j);
      }
    }
    if (matches.length >= 2) {
      for (const idx of matches) {
        assigned.add(idx);
        edgeTicks[idx] = tickKind;
      }
      tickKind = tickKind === 1 ? 2 : tickKind === 2 ? 3 : 1;
    }
  }

  return { rightAngles, edgeTicks };
}

// --- Preset Triangle & Quadrilateral Builders ---

function buildPresetPolygonElement(
  id: string,
  preset: TrianglePresetKind | QuadPresetKind,
  coords: Point2D[],
  names: string[],
  style: Partial<Style>,
  meta: { createdBy: string; createdAtSeq: number; page: number },
  marksEnabled: boolean
): CanvasElement {
  const embedded: EmbeddedVertex[] = coords.map((pt, idx) => ({
    id: `${id}_v${idx}`,
    name: names[idx] ?? String.fromCharCode(65 + idx),
    x: pt.x,
    y: pt.y,
  }));

  const { rightAngles, edgeTicks } = detectPolygonAutoMarks(coords, marksEnabled);

  return {
    id,
    type: "GeomPolygon",
    transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
    style: {
      stroke: style.stroke ?? "#2563eb",
      fill: style.fill ?? "rgba(37,99,235,0.06)",
      width: style.width ?? 2,
      dash: style.dash ?? false,
    },
    meta,
    props: {
      vertices: embedded.map((v) => v.id),
      preset,
      points: embedded,
      rightAngles,
      edgeTicks,
    } satisfies GeomPolygonProps & Record<string, unknown>,
  };
}

export function createSpecialTrianglePreset(
  kind: TrianglePresetKind,
  center: Point2D,
  existingElements: CanvasElement[],
  options: {
    id?: string;
    style?: Partial<Style>;
    actorId?: string;
    seq?: number;
    page?: number;
    marksEnabled?: boolean;
  } = {}
): CanvasElement {
  const marksEnabled = options.marksEnabled ?? getConstructMarksEnabled();
  const names = getNextPointNames(3, existingElements);
  const id = options.id ?? `tri_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  let coords: [Point2D, Point2D, Point2D];
  switch (kind) {
    case "right": {
      // Classic ◺ right triangle with right angle at vertex A (bottom-left),
      // vertical leg AB and horizontal leg AC so ∠A = 90° is immediately clear.
      const A: Point2D = { x: center.x - 1.5, y: center.y - 1.1 };
      const B: Point2D = { x: center.x - 1.5, y: center.y + 1.5 };
      const C: Point2D = { x: center.x + 2.0, y: center.y - 1.1 };
      coords = [A, B, C];
      break;
    }
    case "rightIsosceles": {
      // ◺ right isosceles triangle with right angle at A and AB = AC
      const leg = 2.6;
      const A: Point2D = { x: center.x - 1.4, y: center.y - 1.0 };
      const B: Point2D = { x: A.x, y: A.y + leg };
      const C: Point2D = { x: A.x + leg, y: A.y };
      coords = [A, B, C];
      break;
    }
    case "isosceles": {
      coords = [
        { x: center.x, y: center.y + 1.5 },
        { x: center.x - 1.5, y: center.y - 1.1 },
        { x: center.x + 1.5, y: center.y - 1.1 },
      ];
      break;
    }
    case "equilateral": {
      const side = 3.2;
      const h = (side * Math.sqrt(3)) / 2;
      const baseY = center.y - h / 3;
      coords = [
        { x: center.x, y: baseY + h },
        { x: center.x - side / 2, y: baseY },
        { x: center.x + side / 2, y: baseY },
      ];
      break;
    }
  }

  return buildPresetPolygonElement(
    id,
    kind,
    coords,
    names,
    options.style ?? {},
    {
      createdBy: options.actorId ?? "local",
      createdAtSeq: options.seq ?? 0,
      page: options.page ?? 1,
    },
    marksEnabled
  );
}

export function createSpecialQuadPreset(
  kind: QuadPresetKind,
  center: Point2D,
  existingElements: CanvasElement[],
  options: {
    id?: string;
    style?: Partial<Style>;
    actorId?: string;
    seq?: number;
    page?: number;
    marksEnabled?: boolean;
  } = {}
): CanvasElement {
  const marksEnabled = options.marksEnabled ?? getConstructMarksEnabled();
  const names = getNextPointNames(4, existingElements);
  const id = options.id ?? `quad_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  let coords: [Point2D, Point2D, Point2D, Point2D];
  switch (kind) {
    case "rectangle": {
      const hw = 1.8;
      const hh = 1.1;
      coords = [
        { x: center.x - hw, y: center.y + hh },
        { x: center.x + hw, y: center.y + hh },
        { x: center.x + hw, y: center.y - hh },
        { x: center.x - hw, y: center.y - hh },
      ];
      break;
    }
    case "square": {
      const hs = 1.3;
      coords = [
        { x: center.x - hs, y: center.y + hs },
        { x: center.x + hs, y: center.y + hs },
        { x: center.x + hs, y: center.y - hs },
        { x: center.x - hs, y: center.y - hs },
      ];
      break;
    }
    case "parallelogram": {
      coords = [
        { x: center.x - 1.2, y: center.y + 1.0 },
        { x: center.x + 2.0, y: center.y + 1.0 },
        { x: center.x + 1.2, y: center.y - 1.0 },
        { x: center.x - 2.0, y: center.y - 1.0 },
      ];
      break;
    }
    case "rhombus": {
      coords = [
        { x: center.x, y: center.y + 1.5 },
        { x: center.x + 2.0, y: center.y },
        { x: center.x, y: center.y - 1.5 },
        { x: center.x - 2.0, y: center.y },
      ];
      break;
    }
  }

  return buildPresetPolygonElement(
    id,
    kind,
    coords,
    names,
    options.style ?? {},
    {
      createdBy: options.actorId ?? "local",
      createdAtSeq: options.seq ?? 0,
      page: options.page ?? 1,
    },
    marksEnabled
  );
}

// --- Multi-point Constraint Constructions ---

export function buildSpecialTriangleConstraint(
  kind: TrianglePresetKind,
  a: Point2D,
  b: Point2D,
  cOrAt: Point2D | undefined,
  aId: string,
  bId: string
): PointConstraint | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < GEOM_EPS) return null;

  const cross = cOrAt ? dx * (cOrAt.y - a.y) - dy * (cOrAt.x - a.x) : len * len;
  const dot = cOrAt ? dx * (cOrAt.x - a.x) + dy * (cOrAt.y - a.y) : 0;
  const sign = cross < 0 ? -1 : 1;

  if (kind === "right") {
    const legLen = Math.abs(cross) / len;
    if (legLen < 0.001) return null;
    return { kind: "atAngle", vertex: aId, arm: bId, deg: 90 * sign, len: legLen, fixed: true };
  }
  if (kind === "rightIsosceles") {
    return { kind: "atAngle", vertex: aId, arm: bId, deg: 90 * sign, fixed: true };
  }
  if (kind === "equilateral") {
    return { kind: "atAngle", vertex: aId, arm: bId, deg: 60 * sign, fixed: true };
  }
  const deg = (Math.atan2(cross, dot) * 180) / Math.PI;
  if (Math.abs(Math.sin((deg * Math.PI) / 180)) < 0.001) return null;
  return { kind: "atAngle", vertex: aId, arm: bId, deg };
}

export function buildSpecialQuadConstraint(
  kind: QuadPresetKind,
  a: Point2D,
  b: Point2D,
  dOrAt: Point2D | undefined,
  aId: string,
  bId: string
): PointConstraint | null {
  if (kind === "parallelogram") return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < GEOM_EPS) return null;

  const cross = dOrAt ? dx * (dOrAt.y - a.y) - dy * (dOrAt.x - a.x) : len * len;
  const dot = dOrAt ? dx * (dOrAt.x - a.x) + dy * (dOrAt.y - a.y) : 0;
  const sign = cross < 0 ? -1 : 1;

  if (kind === "rhombus") {
    const deg = (Math.atan2(cross, dot) * 180) / Math.PI;
    if (Math.abs(Math.sin((deg * Math.PI) / 180)) < 0.001) return null;
    return { kind: "atAngle", vertex: aId, arm: bId, deg };
  }
  if (kind === "rectangle") {
    const h = Math.abs(cross) / len;
    if (h < 0.001) return null;
    return { kind: "atAngle", vertex: aId, arm: bId, deg: 90 * sign, len: h, fixed: true };
  }
  return { kind: "atAngle", vertex: aId, arm: bId, deg: 90 * sign, fixed: true };
}

// --- Planar Closed-Cycle & Flood Fill Solver ---

export const FILL_PALETTE = [
  "#1565C0",
  "#DC2626",
  "#16A34A",
  "#e8590c",
  "#6741d9",
  "#c2255c",
  "#0c8599",
  "#f08c00",
  "#868e96",
  "#fab005",
] as const;

export type PlanarPrimitive =
  | { id: string; kind: "seg"; a: Point2D; b: Point2D; a3?: Point3D; b3?: Point3D }
  | { id: string; kind: "circle"; c: Point2D; r: number };

export interface PlanarCycle {
  poly: Point2D[];
  ids: string[];
  area: number;
  fake: boolean;
}

export interface PlanarRegion {
  outer: Point2D[];
  holes: Point2D[][];
  cycle: string[];
  bounds: string[];
  area: number;
  fake?: boolean;
}

function normAngle(a: number): number {
  const twoPi = Math.PI * 2;
  let r = a % twoPi;
  if (r < 0) r += twoPi;
  return r;
}

export function pointInPolygon2D(poly: Point2D[], pt: Point2D): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    const intersects =
      pi.y > pt.y !== pj.y > pt.y &&
      pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function signedPolygonArea(poly: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function intersectPrimitives(p1: PlanarPrimitive, p2: PlanarPrimitive, tol: number): Array<[number, number, Point2D]> {
  if (p1.kind === "seg" && p2.kind === "seg") {
    const dx1 = p1.b.x - p1.a.x;
    const dy1 = p1.b.y - p1.a.y;
    const dx2 = p2.b.x - p2.a.x;
    const dy2 = p2.b.y - p2.a.y;
    const det = dx1 * dy2 - dy1 * dx2;
    const l1 = Math.hypot(dx1, dy1);
    const l2 = Math.hypot(dx2, dy2);
    if (l1 < 1e-12 || l2 < 1e-12) return [];
    if (Math.abs(det) < 1e-9 * l1 * l2) return [];
    const ox = p2.a.x - p1.a.x;
    const oy = p2.a.y - p1.a.y;
    const t = (ox * dy2 - oy * dx2) / det;
    const u = (ox * dy1 - oy * dx1) / det;
    const dt1 = tol / l1;
    const dt2 = tol / l2;
    if (t < -dt1 || t > 1 + dt1 || u < -dt2 || u > 1 + dt2) return [];
    const ct = Math.max(0, Math.min(1, t));
    const cu = Math.max(0, Math.min(1, u));
    return [[ct, cu, { x: p1.a.x + ct * dx1, y: p1.a.y + ct * dy1 }]];
  }

  if (p1.kind === "seg" && p2.kind === "circle") {
    const dx = p1.b.x - p1.a.x;
    const dy = p1.b.y - p1.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) return [];
    const dt = tol / len;
    const a = dx * dx + dy * dy;
    const ox = p1.a.x - p2.c.x;
    const oy = p1.a.y - p2.c.y;
    const b = 2 * (ox * dx + oy * dy);
    const c = ox * ox + oy * oy - p2.r * p2.r;
    const disc = b * b - 4 * a * c;
    if (disc < -tol * tol * 4 * a) return [];
    const s = Math.sqrt(Math.max(0, disc));
    const rawTs = s < 1e-9 * len ? [-b / (2 * a)] : [(-b - s) / (2 * a), (-b + s) / (2 * a)];
    const out: Array<[number, number, Point2D]> = [];
    for (const t of rawTs) {
      if (t < -dt || t > 1 + dt) continue;
      const ct = Math.max(0, Math.min(1, t));
      const pt = { x: p1.a.x + ct * dx, y: p1.a.y + ct * dy };
      out.push([ct, normAngle(Math.atan2(pt.y - p2.c.y, pt.x - p2.c.x)), pt]);
    }
    return out;
  }

  if (p1.kind === "circle" && p2.kind === "seg") {
    return intersectPrimitives(p2, p1, tol).map(([u, t, pt]) => [t, u, pt]);
  }

  if (p1.kind === "circle" && p2.kind === "circle") {
    const dx = p2.c.x - p1.c.x;
    const dy = p2.c.y - p1.c.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-12 || d > p1.r + p2.r + tol || d < Math.abs(p1.r - p2.r) - tol) return [];
    const a = (p1.r * p1.r - p2.r * p2.r + d * d) / (2 * d);
    const hSq = p1.r * p1.r - a * a;
    const base = Math.atan2(dy, dx);
    if (hSq <= (tol * 0.001) ** 2 || d >= p1.r + p2.r - 1e-9 || d <= Math.abs(p1.r - p2.r) + 1e-9) {
      const ang = a >= 0 ? base : base + Math.PI;
      const pt = { x: p1.c.x + p1.r * Math.cos(ang), y: p1.c.y + p1.r * Math.sin(ang) };
      return [[normAngle(ang), normAngle(Math.atan2(pt.y - p2.c.y, pt.x - p2.c.x)), pt]];
    }
    const delta = Math.acos(Math.max(-1, Math.min(1, a / p1.r)));
    return [base + delta, base - delta].map((ang) => {
      const pt = { x: p1.c.x + p1.r * Math.cos(ang), y: p1.c.y + p1.r * Math.sin(ang) };
      return [normAngle(ang), normAngle(Math.atan2(pt.y - p2.c.y, pt.x - p2.c.x)), pt];
    });
  }

  return [];
}

function isSkew3DCrossing(
  s1: Extract<PlanarPrimitive, { kind: "seg" }>,
  s2: Extract<PlanarPrimitive, { kind: "seg" }>,
  t1: number,
  t2: number
): boolean {
  if (!s1.a3 || !s1.b3 || !s2.a3 || !s2.b3) return false;
  const p1 = {
    x: s1.a3.x + t1 * (s1.b3.x - s1.a3.x),
    y: s1.a3.y + t1 * (s1.b3.y - s1.a3.y),
    z: s1.a3.z + t1 * (s1.b3.z - s1.a3.z),
  };
  const p2 = {
    x: s2.a3.x + t2 * (s2.b3.x - s2.a3.x),
    y: s2.a3.y + t2 * (s2.b3.y - s2.a3.y),
    z: s2.a3.z + t2 * (s2.b3.z - s2.a3.z),
  };
  const gap = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
  return gap > 1e-4;
}

export function extractPlanarPrimitives(
  elements: CanvasElement[],
  points: Map<string, Point2D>,
  points3D?: Map<string, Point3D>
): PlanarPrimitive[] {
  const out: PlanarPrimitive[] = [];
  const byId = new Map(elements.map((el) => [el.id, el]));

  const pushSeg = (id: string, idA: string, idB: string, a?: Point2D, b?: Point2D) => {
    if (!a || !b) return;
    const pA = points.get(idA);
    const pB = points.get(idB);
    const p3A = points3D?.get(idA);
    const p3B = points3D?.get(idB);
    if (!pA || !pB || !p3A || !p3B) {
      out.push({ id, kind: "seg", a, b });
      return;
    }
    const den = (pB.x - pA.x) ** 2 + (pB.y - pA.y) ** 2 || 1;
    const lift = (pt: Point2D): Point3D => {
      const w = ((pt.x - pA.x) * (pB.x - pA.x) + (pt.y - pA.y) * (pB.y - pA.y)) / den;
      return {
        x: p3A.x + w * (p3B.x - p3A.x),
        y: p3A.y + w * (p3B.y - p3A.y),
        z: p3A.z + w * (p3B.z - p3A.z),
      };
    };
    out.push({ id, kind: "seg", a, b, a3: lift(a), b3: lift(b) });
  };

  for (const el of elements) {
    if (el.style?.hidden) continue;
    const props = el.props;
    if (el.type === "GeomSegment" || el.type === "GeomVector") {
      const from = String(props.from ?? "");
      const to = String(props.to ?? "");
      pushSeg(el.id, from, to, points.get(from), points.get(to));
    } else if (el.type === "GeomRay") {
      const from = String(props.from ?? "");
      const to = String(props.to ?? "");
      const a = points.get(from);
      const b = points.get(to);
      if (a && b) {
        const [e0, e1] = extendRay(a, b);
        pushSeg(el.id, from, to, e0, e1);
      }
    } else if (el.type === "GeomLine") {
      const ends = resolveLineEndpoints(el, points, byId);
      if (ends) {
        if (props.def === "through") {
          const from = String(props.from ?? "");
          const to = String(props.to ?? "");
          pushSeg(el.id, from, to, ends[0], ends[1]);
        } else {
          out.push({ id: el.id, kind: "seg", a: ends[0], b: ends[1] });
        }
      }
    } else if (el.type === "GeomPolygon" && el.style?.stroke !== "transparent") {
      const verts = Array.isArray(props.vertices) ? (props.vertices as string[]) : [];
      const resolved = verts.map((vid) => points.get(vid));
      if (resolved.every((pt): pt is Point2D => pt !== undefined) && resolved.length >= 3) {
        for (let i = 0; i < resolved.length; i++) {
          const next = (i + 1) % resolved.length;
          pushSeg(el.id, verts[i], verts[next], resolved[i], resolved[next]);
        }
      }
    } else if (el.type === "GeomCircle") {
      const c = points.get(String(props.center ?? ""));
      const r = c ? resolveCircleRadius(props.radius as CircleRadiusSpec | undefined, c, (id) => points.get(id)) : null;
      if (c && r && r > GEOM_EPS) {
        out.push({ id: el.id, kind: "circle", c, r });
      }
    }
  }

  return out;
}

export function findPlanarCycles(primitives: PlanarPrimitive[], gapTolerance: number): PlanarCycle[] {
  interface EventPt {
    curve: number;
    t: number;
    p: Point2D;
  }
  interface SplitEdge {
    from: number;
    to: number;
    curve: number;
    t0: number;
    t1: number;
  }
  interface HalfEdge {
    from: number;
    to: number;
    curve: number;
    t0: number;
    t1: number;
    ang: number;
    turn: number;
    twin: number;
    used: boolean;
  }

  const events: EventPt[][] = primitives.map(() => []);
  const skewPairs: Array<[EventPt, number, number]> = [];

  primitives.forEach((prim, idx) => {
    if (prim.kind === "seg") {
      events[idx].push({ curve: idx, t: 0, p: prim.a }, { curve: idx, t: 1, p: prim.b });
    }
  });

  for (let i = 0; i < primitives.length; i++) {
    for (let j = i + 1; j < primitives.length; j++) {
      for (const [ti, tj, pt] of intersectPrimitives(primitives[i], primitives[j], gapTolerance)) {
        const evI: EventPt = { curve: i, t: ti, p: pt };
        const evJ: EventPt = { curve: j, t: tj, p: pt };
        events[i].push(evI);
        events[j].push(evJ);
        const pI = primitives[i];
        const pJ = primitives[j];
        if (pI.kind === "seg" && pJ.kind === "seg" && isSkew3DCrossing(pI, pJ, ti, tj)) {
          skewPairs.push([evI, i, j]);
        }
      }
    }
  }

  const verts: Point2D[] = [];
  const mergeVertex = (pt: Point2D): number => {
    for (let i = 0; i < verts.length; i++) {
      if (Math.hypot(verts[i].x - pt.x, verts[i].y - pt.y) <= gapTolerance) return i;
    }
    verts.push(pt);
    return verts.length - 1;
  };

  const allEvents = events
    .flat()
    .sort(
      (a, b) =>
        +(primitives[b.curve].kind === "seg" && (b.t === 0 || b.t === 1)) -
        +(primitives[a.curve].kind === "seg" && (a.t === 0 || a.t === 1))
    );
  const eventToVert = new Map<EventPt, number>();
  for (const ev of allEvents) {
    eventToVert.set(ev, mergeVertex(ev.p));
  }

  const skewAt = new Set<string>(
    skewPairs.flatMap(([ev, c1, c2]) => {
      const v = eventToVert.get(ev);
      return [`${v}:${c1}:${c2}`, `${v}:${c2}:${c1}`];
    })
  );

  let edges: SplitEdge[] = [];
  primitives.forEach((prim, cIdx) => {
    const sorted = [...events[cIdx]].sort((a, b) => a.t - b.t);
    if (prim.kind === "seg") {
      for (let i = 0; i + 1 < sorted.length; i++) {
        const v0 = eventToVert.get(sorted[i]);
        const v1 = eventToVert.get(sorted[i + 1]);
        if (v0 !== undefined && v1 !== undefined && v0 !== v1 && sorted[i + 1].t - sorted[i].t > 1e-12) {
          edges.push({ from: v0, to: v1, curve: cIdx, t0: sorted[i].t, t1: sorted[i + 1].t });
        }
      }
      return;
    }
    const ring: Array<{ t: number; v: number }> = [];
    for (const ev of sorted) {
      const v = eventToVert.get(ev);
      if (v !== undefined && !ring.some((r) => r.v === v)) {
        ring.push({ t: ev.t, v });
      }
    }
    if (ring.length === 0) {
      const v = mergeVertex({ x: prim.c.x + prim.r, y: prim.c.y });
      edges.push({ from: v, to: v, curve: cIdx, t0: 0, t1: Math.PI * 2 });
      return;
    }
    ring.sort((a, b) => a.t - b.t);
    for (let i = 0; i < ring.length; i++) {
      const cur = ring[i];
      const nxt = ring[(i + 1) % ring.length];
      const t1 = i + 1 < ring.length ? nxt.t : nxt.t + Math.PI * 2;
      edges.push({ from: cur.v, to: nxt.v, curve: cIdx, t0: cur.t, t1 });
    }
  });

  // Iteratively prune degree <= 1 dangling edges
  let changed = true;
  while (changed) {
    const deg = new Map<number, number>();
    for (const e of edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
      deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
    }
    const filtered = edges.filter((e) => (deg.get(e.from) ?? 0) > 1 && (deg.get(e.to) ?? 0) > 1);
    changed = filtered.length !== edges.length;
    edges = filtered;
  }

  const half: HalfEdge[] = [];
  for (const e of edges) {
    const prim = primitives[e.curve];
    const baseIdx = half.length;
    if (prim.kind === "seg") {
      const d = sub2D(verts[e.to], verts[e.from]);
      const ang = Math.atan2(d.y, d.x);
      half.push(
        { from: e.from, to: e.to, curve: e.curve, t0: e.t0, t1: e.t1, ang, turn: 0, twin: baseIdx + 1, used: false },
        { from: e.to, to: e.from, curve: e.curve, t0: e.t1, t1: e.t0, ang: Math.atan2(-d.y, -d.x), turn: 0, twin: baseIdx, used: false }
      );
    } else {
      const tangAngle = (t: number, dir: 1 | -1) => Math.atan2(dir * Math.cos(t), -dir * Math.sin(t));
      half.push(
        { from: e.from, to: e.to, curve: e.curve, t0: e.t0, t1: e.t1, ang: tangAngle(e.t0, 1), turn: 1 / prim.r, twin: baseIdx + 1, used: false },
        { from: e.to, to: e.from, curve: e.curve, t0: e.t1, t1: e.t0, ang: tangAngle(e.t1, -1), turn: -1 / prim.r, twin: baseIdx, used: false }
      );
    }
  }

  const star = new Map<number, number[]>();
  half.forEach((h, idx) => {
    const list = star.get(h.from) ?? [];
    list.push(idx);
    star.set(h.from, list);
  });

  for (const list of star.values()) {
    list.sort((a, b) => {
      const ha = half[a];
      const hb = half[b];
      const diff = normAngle(ha.ang) - normAngle(hb.ang);
      if (Math.abs(diff) > 1e-7 && Math.abs(Math.abs(diff) - Math.PI * 2) > 1e-7) {
        return diff;
      }
      return ha.turn - hb.turn;
    });
  }

  const cycles: PlanarCycle[] = [];
  const arcStep = Math.PI / 24;

  for (let i = 0; i < half.length; i++) {
    if (half[i].used) continue;
    const poly: Point2D[] = [];
    const ids: string[] = [];
    let fake = false;
    let cur = i;

    for (let step = 0; step <= half.length && !half[cur].used; step++) {
      const h = half[cur];
      h.used = true;
      const prim = primitives[h.curve];
      if (prim.kind === "seg") {
        poly.push(verts[h.from]);
      } else {
        const segs = Math.max(2, Math.ceil(Math.abs(h.t1 - h.t0) / arcStep));
        for (let k = 0; k < segs; k++) {
          const theta = h.t0 + ((h.t1 - h.t0) * k) / segs;
          poly.push({ x: prim.c.x + prim.r * Math.cos(theta), y: prim.c.y + prim.r * Math.sin(theta) });
        }
      }

      const id = prim.id;
      if (ids[ids.length - 1] !== id) ids.push(id);

      const neighbors = star.get(h.to) ?? [];
      const twinPos = neighbors.indexOf(h.twin);
      if (twinPos < 0 || neighbors.length === 0) break;
      const nextIdx = neighbors[(twinPos - 1 + neighbors.length) % neighbors.length];
      if (skewAt.has(`${h.to}:${h.curve}:${half[nextIdx].curve}`)) {
        fake = true;
      }
      cur = nextIdx;
    }

    if (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
    if (poly.length >= 3) {
      cycles.push({ poly, ids, area: signedPolygonArea(poly), fake });
    }
  }

  return cycles;
}

function buildPlanarRegion(outer: PlanarCycle, allCycles: PlanarCycle[], seed?: Point2D): PlanarRegion {
  const innerHoles = allCycles.filter(
    (c) =>
      c.area < 0 &&
      c !== outer &&
      pointInPolygon2D(outer.poly, c.poly[0]) &&
      !(seed && pointInPolygon2D(c.poly, seed)) &&
      Math.abs(c.area) < outer.area
  );
  const topHoles = innerHoles.filter(
    (h) => !innerHoles.some((other) => other !== h && Math.abs(other.area) > Math.abs(h.area) && pointInPolygon2D(other.poly, h.poly[0]))
  );
  return {
    outer: outer.poly,
    holes: topHoles.map((h) => h.poly),
    cycle: outer.ids,
    bounds: [...new Set([...outer.ids, ...topHoles.flatMap((h) => h.ids)])],
    area: outer.area - topHoles.reduce((acc, h) => acc + Math.abs(h.area), 0),
    ...(outer.fake ? { fake: true } : {}),
  };
}

function sameCycleIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.some((_, offset) => b.every((id, idx) => id === a[(idx + offset) % a.length]));
}

export function findFloodFillRegion(
  elements: CanvasElement[],
  points: Map<string, Point2D>,
  seed: Point2D,
  gapTolerance: number,
  points3D?: Map<string, Point3D>
): PlanarRegion | null {
  const primitives = extractPlanarPrimitives(elements, points, points3D);
  const cycles = findPlanarCycles(primitives, gapTolerance);
  const match = cycles
    .filter((c) => c.area > 1e-12 && pointInPolygon2D(c.poly, seed))
    .sort((a, b) => a.area - b.area)[0];
  if (!match || match.fake) return null;
  return buildPlanarRegion(match, cycles, seed);
}

export function resolveFillRegionPolygon(
  fillEl: CanvasElement,
  points: Map<string, Point2D>,
  byId: Map<string, CanvasElement>,
  points3D?: Map<string, Point3D>
): PlanarRegion | null {
  const props = fillEl.props as unknown as FillRegionProps;
  const boundEls = Array.isArray(props.bounds)
    ? props.bounds.map((id) => byId.get(id)).filter((el): el is CanvasElement => el !== undefined)
    : [];
  const primitives = extractPlanarPrimitives(boundEls, points, points3D);
  const cycles = findPlanarCycles(primitives, typeof props.gap === "number" ? props.gap : 0.15);
  const seedPt: Point2D = Array.isArray(props.seed) ? { x: props.seed[0], y: props.seed[1] } : { x: 0, y: 0 };

  const matching = Array.isArray(props.cycle)
    ? cycles.filter((c) => c.area > 1e-12 && sameCycleIds(c.ids, props.cycle))
    : [];

  if (matching.length > 0) {
    const containing = matching.find((c) => pointInPolygon2D(c.poly, seedPt));
    const centroidOf = (poly: Point2D[]): Point2D => ({
      x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
      y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
    });
    const best =
      containing ??
      matching.sort((a, b) => dist2D(centroidOf(a.poly), seedPt) - dist2D(centroidOf(b.poly), seedPt))[0];
    return buildPlanarRegion(best, cycles);
  }

  const bySeed = cycles
    .filter((c) => c.area > 1e-12 && pointInPolygon2D(c.poly, seedPt))
    .sort((a, b) => a.area - b.area)[0];
  return bySeed ? buildPlanarRegion(bySeed, cycles, seedPt) : null;
}

export function fillRegionToSvgPath(region: PlanarRegion): string {
  return [region.outer, ...region.holes]
    .map((ring) => `M${ring.map((p) => `${p.x} ${-p.y}`).join("L")}Z`)
    .join("");
}

// --- Cascading Dependency Finder ---

const DIRECT_PROP_REF_KEYS = [
  "from",
  "to",
  "center",
  "vertex",
  "apex",
  "on",
  "through",
  "p1",
  "p2",
  "a",
  "b",
  "c",
  "d",
  "p",
  "q",
  "r",
  "segment",
  "line",
  "circle",
  "target",
  "solid",
  "axes",
  "plot",
  "f",
  "g",
  "paper",
  "source",
  "anchor",
  "src",
] as const;

const ARRAY_PROP_REF_KEYS = ["points", "arms", "vertices", "bounds", "refs"] as const;

export function getElementDirectDeps(el: CanvasElement): string[] {
  const refs = new Set<string>();
  const p = el.props;

  for (const key of DIRECT_PROP_REF_KEYS) {
    const val = p[key];
    if (typeof val === "string" && val) refs.add(val);
  }
  for (const key of ARRAY_PROP_REF_KEYS) {
    const val = p[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string" && item) refs.add(item);
      }
    }
  }
  if (el.type === "GeomCircle" && p.radius && typeof p.radius === "object") {
    const rad = p.radius as Record<string, unknown>;
    if (typeof rad.point === "string" && rad.point) refs.add(rad.point);
    if (typeof rad.a === "string" && rad.a) refs.add(rad.a);
    if (typeof rad.b === "string" && rad.b) refs.add(rad.b);
  }
  if (el.type === "GeomPoint" && p.constraint && typeof p.constraint === "object") {
    const c = p.constraint as Record<string, unknown>;
    for (const [k, v] of Object.entries(c)) {
      if (k === "kind") continue;
      if (typeof v === "string" && v) refs.add(v);
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item) refs.add(item);
        }
      }
    }
  }

  return Array.from(refs);
}

/**
 * Finds all transitive dependent element IDs (and owned child vertices of solids/handle shapes)
 * so deleting a parent point or polygon cascades atomically in a single transaction.
 */
export function findDependentIds(seedIds: string[], elements: CanvasElement[]): string[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const toDelete = new Set<string>(seedIds.filter((id) => byId.has(id)));

  let changed = true;
  while (changed) {
    changed = false;

    // 1. If a Solid3D is being deleted, also delete its vertex points
    for (const id of Array.from(toDelete)) {
      const el = byId.get(id);
      if (el?.type === "Solid3D" && Array.isArray(el.props.points)) {
        for (const ptId of el.props.points) {
          if (typeof ptId === "string" && byId.has(ptId) && !toDelete.has(ptId)) {
            toDelete.add(ptId);
            changed = true;
          }
        }
      }
      // If a handle-only plane polygon is deleted, delete its handle vertices
      if (el?.type === "GeomPolygon" && el.props.label && Array.isArray(el.props.vertices)) {
        for (const vId of el.props.vertices) {
          const vEl = typeof vId === "string" ? byId.get(vId) : undefined;
          if (vEl?.props.handle && !toDelete.has(vId)) {
            toDelete.add(vId);
            changed = true;
          }
        }
      }
    }

    // 2. Any element referencing any deleted ID must also be deleted
    for (const el of elements) {
      if (toDelete.has(el.id)) continue;
      const deps = getElementDirectDeps(el);
      if (deps.some((depId) => toDelete.has(depId))) {
        toDelete.add(el.id);
        changed = true;
      }
    }
  }

  return Array.from(toDelete);
}

// --- Geometry Scaling Helper (Giãn hình / Thu hình) ---

export interface ScaledElementPatch {
  id: string;
  transform?: Partial<Transform>;
  props?: Record<string, unknown>;
}

export function scaleGeometryElements(
  elements: CanvasElement[],
  factor: number,
  targetIds?: string[]
): ScaledElementPatch[] {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 1e-9) {
    return [];
  }

  const targetSet = targetIds && targetIds.length > 0 ? new Set(targetIds) : null;
  const isIncluded = (el: CanvasElement) => !targetSet || targetSet.has(el.id);

  const coords: Point2D[] = [];
  for (const el of elements) {
    if (!isIncluded(el) || el.style?.hidden) continue;
    if (el.type === "GeomPoint" || el.type === "Point") {
      const c = el.type === "GeomPoint" ? asPointConstraint(el.props.constraint) : { kind: "free" };
      if (c.kind === "free") {
        coords.push({ x: el.transform.x, y: el.transform.y });
      }
    } else if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
      for (const pt of el.props.points as EmbeddedVertex[]) {
        coords.push({ x: pt.x + el.transform.x, y: pt.y + el.transform.y });
      }
    } else if (el.type === "Solid3D" && Array.isArray(el.props.pointCoords)) {
      for (const pt of el.props.pointCoords as Point2D[]) {
        coords.push({ x: pt.x + el.transform.x, y: pt.y + el.transform.y });
      }
    }
  }

  if (coords.length === 0) return [];

  const cx = coords.reduce((sum, p) => sum + p.x, 0) / coords.length;
  const cy = coords.reduce((sum, p) => sum + p.y, 0) / coords.length;

  const patches: ScaledElementPatch[] = [];
  for (const el of elements) {
    if (!isIncluded(el) || el.style?.hidden) continue;

    if (el.type === "GeomPoint" || el.type === "Point") {
      const c = el.type === "GeomPoint" ? asPointConstraint(el.props.constraint) : { kind: "free" };
      if (c.kind === "free") {
        patches.push({
          id: el.id,
          transform: {
            x: cx + (el.transform.x - cx) * factor,
            y: cy + (el.transform.y - cy) * factor,
          },
        });
      }
    } else if (el.type === "GeomCircle") {
      const rad = el.props.radius as CircleRadiusSpec | undefined;
      if (rad?.kind === "value" && typeof rad.v === "number") {
        patches.push({
          id: el.id,
          props: {
            ...el.props,
            radius: { kind: "value", v: rad.v * factor },
          },
        });
      }
    } else if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
      const scaledPts = (el.props.points as EmbeddedVertex[]).map((pt) => {
        const wx = pt.x + el.transform.x;
        const wy = pt.y + el.transform.y;
        return {
          ...pt,
          x: cx + (wx - cx) * factor - el.transform.x,
          y: cy + (wy - cy) * factor - el.transform.y,
        };
      });
      patches.push({
        id: el.id,
        props: { ...el.props, points: scaledPts },
      });
    } else if (el.type === "Solid3D") {
      const nextProps: Record<string, unknown> = { ...el.props };
      let changed = false;
      if (Array.isArray(el.props.pointCoords)) {
        nextProps.pointCoords = (el.props.pointCoords as Point2D[]).map((pt) => {
          const wx = pt.x + el.transform.x;
          const wy = pt.y + el.transform.y;
          return {
            x: cx + (wx - cx) * factor - el.transform.x,
            y: cy + (wy - cy) * factor - el.transform.y,
          };
        });
        changed = true;
      }
      if (typeof el.props.r === "number" && !el.props.through) {
        nextProps.r = el.props.r * factor;
        changed = true;
      }
      if (changed) {
        patches.push({
          id: el.id,
          props: nextProps,
        });
      }
    }
  }

  return patches;
}

// --- Geometry Bounding Box Helper ---

export function getGeometryBoundingBox(
  el: CanvasElement,
  points: Map<string, Point2D>,
  byId: Map<string, CanvasElement>
): BoundingBox | null {
  const fromPoints = (pts: Point2D[]): BoundingBox | null => {
    if (pts.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  };

  if (el.type === "GeomPoint" || el.type === "Point") {
    const pt = points.get(el.id) ?? { x: el.transform.x, y: el.transform.y };
    return fromPoints([pt]);
  }
  if (el.type === "GeomSegment" || el.type === "GeomVector" || el.type === "GeomRay" || el.type === "GeomLine") {
    const ends = resolveLineEndpoints(el, points, byId);
    return ends ? fromPoints(ends) : null;
  }
  if (el.type === "GeomCircle") {
    const center = points.get(String(el.props.center ?? ""));
    if (!center) return null;
    const r = resolveCircleRadius(el.props.radius as CircleRadiusSpec | undefined, center, (id) => points.get(id));
    if (r === null) return null;
    return {
      minX: center.x - r,
      maxX: center.x + r,
      minY: center.y - r,
      maxY: center.y + r,
      width: 2 * r,
      height: 2 * r,
      centerX: center.x,
      centerY: center.y,
    };
  }
  if (el.type === "GeomPolygon") {
    const pts: Point2D[] = [];
    if (Array.isArray(el.props.points)) {
      for (const v of el.props.points as EmbeddedVertex[]) {
        pts.push({ x: v.x + el.transform.x, y: v.y + el.transform.y });
      }
    } else if (Array.isArray(el.props.vertices)) {
      for (const id of el.props.vertices as string[]) {
        const p = points.get(id);
        if (p) pts.push(p);
      }
    }
    return fromPoints(pts);
  }
  if (el.type === "Solid3D") {
    const r = typeof el.props.r === "number" ? el.props.r : 1.3;
    const pts: Point2D[] = [];
    if (Array.isArray(el.props.points)) {
      for (const id of el.props.points as string[]) {
        const p = points.get(id);
        if (p) pts.push(p);
      }
    }
    if (pts.length === 0) return null;
    const base = fromPoints(pts);
    if (!base) return null;
    if (el.props.kind === "cone" || el.props.kind === "cylinder" || el.props.kind === "sphere") {
      const ry = el.props.kind === "sphere" ? r : r * 0.3;
      return {
        minX: base.minX - r,
        maxX: base.maxX + r,
        minY: base.minY - ry,
        maxY: base.maxY + ry,
        width: base.width + 2 * r,
        height: base.height + 2 * ry,
        centerX: base.centerX,
        centerY: base.centerY,
      };
    }
    return base;
  }

  return null;
}

export interface SelectedTriangleInfo {
  elementId?: string;
  pts: [Point2D, Point2D, Point2D];
  vertexIds: [string | undefined, string | undefined, string | undefined];
  rightAngleIndex?: number;
}

export interface SelectedSegmentInfo {
  elementId: string;
  a: Point2D;
  b: Point2D;
  aId?: string;
  bId?: string;
}

export interface SelectedCircleInfo {
  elementId: string;
  center: Point2D;
  centerId?: string;
  r: number;
}

export interface SelectedPointInfo {
  elementId: string;
  pos: Point2D;
}

export interface ExtractedSelectionGeometry {
  triangle: SelectedTriangleInfo | null;
  trianglesCount: number;
  nonTrianglePolyCount: number;
  segment: SelectedSegmentInfo | null;
  segments: SelectedSegmentInfo[];
  circle: SelectedCircleInfo | null;
  circles: SelectedCircleInfo[];
  point: SelectedPointInfo | null;
  points: SelectedPointInfo[];
}

export function extractSelectionGeometry(
  selectedElements: CanvasElement[],
  pointsMap: Map<string, Point2D>,
  byId: Map<string, CanvasElement>
): ExtractedSelectionGeometry {
  const triangles: SelectedTriangleInfo[] = [];
  let nonTrianglePolyCount = 0;
  const segments: SelectedSegmentInfo[] = [];
  const circles: SelectedCircleInfo[] = [];
  const points: SelectedPointInfo[] = [];

  for (const el of selectedElements) {
    if (el.style?.hidden) continue;

    if (el.type === "GeomPolygon") {
      const pts: Point2D[] = [];
      const vertexIds: Array<string | undefined> = [];
      if (Array.isArray(el.props.points)) {
        for (const v of el.props.points as EmbeddedVertex[]) {
          pts.push({ x: v.x + el.transform.x, y: v.y + el.transform.y });
          vertexIds.push(v.id);
        }
      } else if (Array.isArray(el.props.vertices)) {
        for (const id of el.props.vertices as string[]) {
          const p = pointsMap.get(id);
          if (p) {
            pts.push(p);
            vertexIds.push(id);
          }
        }
      }
      if (pts.length === 3) {
        const ra = Array.isArray(el.props.rightAngles)
          ? (el.props.rightAngles as number[])
          : detectPolygonAutoMarks(pts, true).rightAngles;
        triangles.push({
          elementId: el.id,
          pts: [pts[0], pts[1], pts[2]],
          vertexIds: [vertexIds[0], vertexIds[1], vertexIds[2]],
          rightAngleIndex: ra.length > 0 ? ra[0] : undefined,
        });
      } else if (pts.length > 3) {
        nonTrianglePolyCount++;
      }
      continue;
    }

    if (
      el.type === "GeomSegment" ||
      el.type === "GeomLine" ||
      el.type === "GeomRay" ||
      el.type === "GeomVector"
    ) {
      const ends = resolveLineEndpoints(el, pointsMap, byId);
      if (ends) {
        segments.push({
          elementId: el.id,
          a: ends[0],
          b: ends[1],
          aId: typeof el.props.from === "string" ? el.props.from : undefined,
          bId: typeof el.props.to === "string" ? el.props.to : undefined,
        });
      }
      continue;
    }

    if (el.type === "GeomCircle") {
      const centerId =
        typeof el.props.center === "string" ? el.props.center : undefined;
      const center = centerId ? pointsMap.get(centerId) : undefined;
      const r = center
        ? resolveCircleRadius(
            el.props.radius as CircleRadiusSpec | undefined,
            center,
            (id) => pointsMap.get(id)
          )
        : null;
      if (center && typeof r === "number" && r > GEOM_EPS) {
        circles.push({ elementId: el.id, center, centerId, r });
      }
      continue;
    }

    if (el.type === "GeomPoint" || el.type === "Point") {
      const pos = pointsMap.get(el.id) ?? {
        x: el.transform.x,
        y: el.transform.y,
      };
      points.push({ elementId: el.id, pos });
    }
  }

  let resolvedTriangle: SelectedTriangleInfo | null = null;
  let trianglesCount = triangles.length;

  if (triangles.length === 1 && nonTrianglePolyCount === 0) {
    resolvedTriangle = triangles[0];
  } else if (triangles.length === 0 && nonTrianglePolyCount === 0) {
    if (points.length === 3) {
      const pts: [Point2D, Point2D, Point2D] = [
        points[0].pos,
        points[1].pos,
        points[2].pos,
      ];
      const ra = detectPolygonAutoMarks(pts, true).rightAngles;
      resolvedTriangle = {
        pts,
        vertexIds: [points[0].elementId, points[1].elementId, points[2].elementId],
        rightAngleIndex: ra.length > 0 ? ra[0] : undefined,
      };
      trianglesCount = 1;
    } else if (segments.length === 3) {
      // Collect up to 3 distinct endpoints shared by 3 triangle segments
      const uniq: Array<{ pos: Point2D; id?: string }> = [];
      const addVert = (pos: Point2D, id?: string) => {
        if (!uniq.some((u) => dist2D(u.pos, pos) < 1e-3)) {
          uniq.push({ pos, id });
        }
      };
      for (const s of segments) {
        addVert(s.a, s.aId);
        addVert(s.b, s.bId);
      }
      if (uniq.length === 3) {
        const pts: [Point2D, Point2D, Point2D] = [
          uniq[0].pos,
          uniq[1].pos,
          uniq[2].pos,
        ];
        const ra = detectPolygonAutoMarks(pts, true).rightAngles;
        resolvedTriangle = {
          pts,
          vertexIds: [uniq[0].id, uniq[1].id, uniq[2].id],
          rightAngleIndex: ra.length > 0 ? ra[0] : undefined,
        };
        trianglesCount = 1;
      }
    }
  }

  return {
    triangle: resolvedTriangle,
    trianglesCount,
    nonTrianglePolyCount,
    segment: segments.length === 1 ? segments[0] : null,
    segments,
    circle: circles.length === 1 ? circles[0] : null,
    circles,
    point: points.length === 1 ? points[0] : null,
    points,
  };
}
