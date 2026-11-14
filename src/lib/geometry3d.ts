import type { CanvasElement } from "@/types/whiteboard";
import {
  GEOM_EPS,
  type CircleRadiusSpec,
  type EmbeddedVertex,
  type GeomPolygonProps,
  type Point2D,
  type Point3D,
  type PointConstraint,
  bisectorFoot2D,
  circumcenter2D,
  dist2D,
  footOfPerpendicular,
  getNextPointName,
  getNextPointNames,
  incenter2D,
  intersectCirclesAt,
  intersectLineCircleAt,
  intersectLines2D,
  midpoint2D,
  orthocenter2D,
  pointAtAngle,
  reflectPointOverLine,
  reflectPointOverPoint,
  resolveCircleRadius,
  resolveLineGeometry,
  rotatePointAround,
  homothetyPoint,
  tangentPointToCircle,
  translatePoint,
  unitDir2D,
} from "./geometry";

export type { Point2D, Point3D } from "./geometry";

export type Solid3DKind =
  | "box"
  | "cube"
  | "prism"
  | "pyramid"
  | "cylinder"
  | "cone"
  | "sphere"
  | "frustum";

export interface Solid3DProps {
  kind: Solid3DKind;
  points: string[];
  sides?: number;
  r?: number;
  through?: string;
  faceFill?: Record<string, string>;
  edgeMeasures?: Record<string, boolean>;
  pointCoords?: Point2D[];
  vertexNames?: string[];
  azimuth?: number;
  elevation?: number;
}

export interface Axes3DProps {
  size?: number;
  xPos?: number;
  xNeg?: number;
  yPos?: number;
  yNeg?: number;
  zPos?: number;
  zNeg?: number;
}

export interface RoundSectionProps {
  solid: string;
  points: [string, string, string];
}

export type SpaceFigureDef =
  | { kind: "plane"; a: number; b: number; c: number; d: number }
  | { kind: "line"; p: [number, number, number]; u: [number, number, number] }
  | { kind: "sphere"; c: [number, number, number]; r: number };

export interface SpaceFigureProps {
  axes: string;
  def: SpaceFigureDef;
  name?: string;
  color?: string;
}

export interface OrthoViewsProps {
  solid: string;
}

export interface RevolutionProps {
  source: string;
  a: string;
  b: string;
  angle?: number;
  playAt?: number;
  info?: boolean;
}

export type CameraMatrix3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number
];

export interface SolidLift {
  p3: Point3D[];
  faces: number[][];
  view: Point3D;
}

export interface Solved3DScene {
  pts: Map<string, Point2D>;
  p3: Map<string, Point3D>;
  owner: Map<string, string>;
  lifts: Map<string, SolidLift>;
  undef: Set<string>;
}

// --- 3D Vector & Matrix Arithmetic ---

export function sub3(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function add3(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale3(v: Point3D, k: number): Point3D {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

export function dot3(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function len3(v: Point3D): number {
  return Math.sqrt(dot3(v, v));
}

export function dist3(a: Point3D, b: Point3D): number {
  return len3(sub3(a, b));
}

export function norm3(v: Point3D): Point3D {
  const l = len3(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function linComb3(pts: Point3D[], weights: number[]): Point3D {
  return pts.reduce(
    (acc, pt, idx) => ({
      x: acc.x + weights[idx] * pt.x,
      y: acc.y + weights[idx] * pt.y,
      z: acc.z + weights[idx] * pt.z,
    }),
    { x: 0, y: 0, z: 0 }
  );
}

// --- Camera & Orbital Rotation ---

function mulMat3(a: CameraMatrix3, b: CameraMatrix3): CameraMatrix3 {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[3 * r + c] = a[3 * r] * b[c] + a[3 * r + 1] * b[3 + c] + a[3 * r + 2] * b[6 + c];
    }
  }
  return out as unknown as CameraMatrix3;
}

function rotY(t: number): CameraMatrix3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function rotX(t: number): CameraMatrix3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

export function buildCamera(yawRad: number, pitchRad: number): CameraMatrix3 {
  return mulMat3(rotX(pitchRad), rotY(yawRad));
}

export function orbitCamera(cam: CameraMatrix3, dYawRad: number, dPitchRad: number): CameraMatrix3 {
  const m = mulMat3(rotX(dPitchRad), mulMat3(rotY(dYawRad), cam));
  const r0 = norm3({ x: m[0], y: m[1], z: m[2] });
  const r1raw: Point3D = { x: m[3], y: m[4], z: m[5] };
  const proj = dot3(r1raw, r0);
  const r1 = norm3(sub3(r1raw, scale3(r0, proj)));
  const r2 = cross3(r0, r1);
  return [r0.x, r0.y, r0.z, r1.x, r1.y, r1.z, r2.x, r2.y, r2.z];
}

export const DEFAULT_POLY_CAM = buildCamera(0.45, -Math.asin(0.3));
export const DEFAULT_ROUND_CAM = buildCamera(0, -Math.asin(0.3));
export const DEFAULT_BOX_CAM = buildCamera(0.45, -Math.asin(0.3));

export function defaultCameraForSolid(kind: Solid3DKind | "axes"): CameraMatrix3 {
  if (kind === "cone" || kind === "cylinder" || kind === "sphere") {
    return DEFAULT_ROUND_CAM;
  }
  return DEFAULT_POLY_CAM;
}

export function azimuthElevationToCamera(azimuthDeg: number, elevationDeg: number): CameraMatrix3 {
  const yaw = (azimuthDeg * Math.PI) / 180;
  const pitch = -(elevationDeg * Math.PI) / 180;
  return buildCamera(yaw, pitch);
}

export function cameraToAzimuthElevation(cam: CameraMatrix3): { azimuth: number; elevation: number } {
  // Transpose * (0,0,-1) is the view direction in world space
  const vx = -cam[6];
  const vy = -cam[7];
  const vz = -cam[8];
  const yaw = Math.atan2(-vx, -vz);
  const pitch = Math.asin(Math.max(-1, Math.min(1, vy)));
  return {
    azimuth: Math.round((yaw * 180) / Math.PI),
    elevation: Math.round((-pitch * 180) / Math.PI),
  };
}

export function project3DTo2D(lift: SolidLift, p3: Point3D): Point2D {
  return {
    x: p3.x + lift.view.x * p3.z,
    y: p3.y + lift.view.y * p3.z,
  };
}

export function applyOrbitToPoints(
  p3List: Point3D[],
  cam: CameraMatrix3,
  blend = 1,
  baseLift?: SolidLift
): { pts2d: Point2D[]; rotatedP3: Point3D[]; view: Point3D } {
  const n = p3List.length || 1;
  const weights = p3List.map(() => 1 / n);
  const center = linComb3(p3List, weights);
  const rotateVec = (v: Point3D): Point3D => ({
    x: cam[0] * v.x + cam[1] * v.y + cam[2] * v.z,
    y: cam[3] * v.x + cam[4] * v.y + cam[5] * v.z,
    z: cam[6] * v.x + cam[7] * v.y + cam[8] * v.z,
  });
  const inverseView: Point3D = {
    x: -cam[6],
    y: -cam[7],
    z: -cam[8],
  };

  const baseCenter2D = baseLift ? project3DTo2D(baseLift, center) : { x: center.x, y: center.y };
  const rotatedP3: Point3D[] = [];
  const pts2d: Point2D[] = [];

  for (const pt of p3List) {
    const rel = sub3(pt, center);
    const rot = rotateVec(rel);
    const worldRot = add3(center, rot);
    rotatedP3.push(worldRot);
    if (baseLift && blend < 1) {
      const base2d = project3DTo2D(baseLift, pt);
      pts2d.push({
        x: base2d.x + blend * (baseCenter2D.x + rot.x - base2d.x),
        y: base2d.y + blend * (baseCenter2D.y + rot.y - base2d.y),
      });
    } else {
      pts2d.push({
        x: baseCenter2D.x + rot.x,
        y: baseCenter2D.y + rot.y,
      });
    }
  }

  const view: Point3D =
    baseLift && blend < 0.5 ? baseLift.view : inverseView;

  return { pts2d, rotatedP3, view };
}

export function applyOrbitToSolid(
  lift: SolidLift,
  points3DMap: Map<string, Point3D>,
  cam: CameraMatrix3,
  blend = 1
): { pts: Map<string, Point2D>; view: Point3D; p3: Map<string, Point3D> } {
  const weights = lift.p3.map(() => 1 / (lift.p3.length || 1));
  const center = linComb3(lift.p3, weights);
  const rotateVec = (v: Point3D): Point3D => ({
    x: cam[0] * v.x + cam[1] * v.y + cam[2] * v.z,
    y: cam[3] * v.x + cam[4] * v.y + cam[5] * v.z,
    z: cam[6] * v.x + cam[7] * v.y + cam[8] * v.z,
  });
  const camView: Point3D = { x: -cam[6], y: -cam[7], z: -cam[8] };
  const c2 = project3DTo2D(lift, center);
  const pts = new Map<string, Point2D>();
  const p3 = new Map<string, Point3D>();

  for (const [id, pt3] of points3DMap.entries()) {
    const base2 = project3DTo2D(lift, pt3);
    const rel = sub3(pt3, center);
    const rot = rotateVec(rel);
    p3.set(id, add3(center, rot));
    pts.set(id, {
      x: base2.x + blend * (c2.x + rot.x - base2.x),
      y: base2.y + blend * (c2.y + rot.y - base2.y),
    });
  }

  return {
    pts,
    p3,
    view: blend < 0.5 ? lift.view : camView,
  };
}

// --- Solid Lift & Hidden-Edge Visibility ---

const OBLIQUE_Z_FACTOR = 0.3;

export function liftSolidTo3D(kind: Solid3DKind, pts2D: Point2D[]): SolidLift | null {
  const liftRing = (ring: Point2D[], zFactor: number): Point3D[] => {
    const avgY = ring.reduce((sum, p) => sum + p.y, 0) / (ring.length || 1);
    return ring.map((p) => {
      const z = (p.y - avgY) / zFactor;
      return { x: p.x - zFactor * z, y: avgY, z };
    });
  };

  if (kind === "pyramid" && pts2D.length >= 4) {
    const n = pts2D.length - 1;
    const apex: Point3D = { x: pts2D[0].x, y: pts2D[0].y, z: 0 };
    const base = liftRing(pts2D.slice(1), OBLIQUE_Z_FACTOR);
    const faces: number[][] = [
      Array.from({ length: n }, (_, i) => i + 1),
      ...Array.from({ length: n }, (_, i) => [0, i + 1, ((i + 1) % n) + 1]),
    ];
    return { p3: [apex, ...base], faces, view: { x: 0.3, y: 0.3, z: -1 } };
  }

  if ((kind === "prism" || kind === "frustum") && pts2D.length >= 6 && pts2D.length % 2 === 0) {
    const n = pts2D.length / 2;
    const p3 = [...liftRing(pts2D.slice(0, n), OBLIQUE_Z_FACTOR), ...liftRing(pts2D.slice(n), OBLIQUE_Z_FACTOR)];
    const faces: number[][] = [
      Array.from({ length: n }, (_, i) => i),
      Array.from({ length: n }, (_, i) => n + i),
      ...Array.from({ length: n }, (_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i]),
    ];
    return { p3, faces, view: { x: 0.3, y: 0.3, z: -1 } };
  }

  if ((kind === "box" || kind === "cube") && pts2D.length === 8) {
    const depth =
      [0, 1, 2, 3].reduce(
        (acc, i) => acc + ((pts2D[i + 4].x - pts2D[i].x) * 0.5 + (pts2D[i + 4].y - pts2D[i].y) * 0.45) / 0.4525,
        0
      ) / 4;
    const p3: Point3D[] = [
      ...pts2D.slice(0, 4).map((p) => ({ x: p.x, y: p.y, z: 0 })),
      ...pts2D.slice(4).map((p) => ({ x: p.x - 0.5 * depth, y: p.y - 0.45 * depth, z: depth })),
    ];
    const faces = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
    ];
    return { p3, faces, view: { x: 0.5, y: 0.45, z: -1 } };
  }

  return null;
}

export function liftRoundSolidTo3D(kind: Solid3DKind, pts2D: Point2D[], r: number): SolidLift | null {
  const count = kind === "sphere" ? 1 : kind === "cone" || kind === "cylinder" ? 2 : 0;
  if (!count || pts2D.length < count || !(r > 0)) return null;
  return {
    p3: pts2D.slice(0, count).map((p) => ({ x: p.x, y: p.y, z: 0 })),
    faces: [],
    view: { x: 0, y: 0.3, z: -1 },
  };
}

export function outwardFaceNormal(lift: SolidLift, faceIndices: number[]): Point3D | null {
  if (faceIndices.length < 3 || lift.p3.length === 0) return null;
  const centroid = linComb3(
    lift.p3,
    lift.p3.map(() => 1 / lift.p3.length)
  );
  const a = lift.p3[faceIndices[0]];
  const b = lift.p3[faceIndices[1]];
  const c = lift.p3[faceIndices[2]];
  let normal = cross3(sub3(b, a), sub3(c, a));
  if (len3(normal) < 1e-12) return null;
  if (dot3(normal, sub3(a, centroid)) < 0) {
    normal = { x: -normal.x, y: -normal.y, z: -normal.z };
  }
  return normal;
}

export function isFaceVisible(lift: SolidLift, faceIndices: number[]): boolean {
  const n = outwardFaceNormal(lift, faceIndices);
  if (!n) return true;
  return dot3(n, lift.view) > 0;
}

/**
 * Returns true when edge (pA, pB) is hidden (should be rendered dashed).
 * In oblique/camera projection, `lift.view` points from the scene toward the viewer,
 * so an edge is visible if at least one incident face satisfies dot(normal, view) > 0.
 */
export function isEdgeHidden(lift: SolidLift, pA: Point3D, pB: Point3D): boolean {
  const scaleRef = Math.max(...lift.p3.map((p) => dist3(p, lift.p3[0])), 1e-9);
  for (const face of lift.faces) {
    const normal = outwardFaceNormal(lift, face);
    if (!normal) continue;
    const nLen = len3(normal);
    const origin = lift.p3[face[0]];
    const distToPlane = (pt: Point3D) => Math.abs(dot3(sub3(pt, origin), normal)) / nLen;
    if (distToPlane(pA) <= 1e-6 * scaleRef && distToPlane(pB) <= 1e-6 * scaleRef) {
      if (dot3(normal, lift.view) > 0) {
        return false;
      }
    }
  }
  return true;
}

export function extractPolyhedronEdges(lift: SolidLift): Array<[number, number]> {
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (const face of lift.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

export interface RoundRimInfo {
  key: "base" | "top" | "bottom" | "disc" | "equator";
  centreIndex: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function getRoundRims(kind: Solid3DKind, pts2D: Point2D[], r: number): RoundRimInfo[] {
  const ry = r * OBLIQUE_Z_FACTOR;
  if (kind === "cone" && pts2D[1]) {
    return [{ key: "base", centreIndex: 1, cx: pts2D[1].x, cy: pts2D[1].y, rx: r, ry }];
  }
  if (kind === "cylinder" && pts2D[0] && pts2D[1]) {
    return [
      { key: "top", centreIndex: 0, cx: pts2D[0].x, cy: pts2D[0].y, rx: r, ry },
      { key: "bottom", centreIndex: 1, cx: pts2D[1].x, cy: pts2D[1].y, rx: r, ry },
    ];
  }
  if (kind === "sphere" && pts2D[0]) {
    return [
      { key: "disc", centreIndex: 0, cx: pts2D[0].x, cy: pts2D[0].y, rx: r, ry: r },
      { key: "equator", centreIndex: 0, cx: pts2D[0].x, cy: pts2D[0].y, rx: r, ry },
    ];
  }
  return [];
}

function splitEllipseFrontBack(cx: number, cy: number, rx: number, ry: number): {
  front: Point2D[];
  back: Point2D[];
} {
  const steps = 48;
  const front: Point2D[] = [];
  const back: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const aBack = (i / steps) * Math.PI;
    back.push({ x: cx + rx * Math.cos(aBack), y: cy + ry * Math.sin(aBack) });
    const aFront = Math.PI + (i / steps) * Math.PI;
    front.push({ x: cx + rx * Math.cos(aFront), y: cy + ry * Math.sin(aFront) });
  }
  return { front, back };
}

export function signedDistRoundSolid(kind: Solid3DKind, lift: SolidLift, r: number, pt: Point3D): number {
  const [p0, p1] = lift.p3;
  if (kind === "sphere") return dist3(pt, p0) - r;
  if (!p1) return Infinity;
  const dy = p0.y - p1.y;
  if (Math.abs(dy) < 1e-9) return Infinity;
  const t = (pt.y - p1.y) / dy;
  const axisPt = linComb3([p1, p0], [1 - t, t]);
  const radAtT = kind === "cone" ? r * (1 - t) : r;
  return Math.max(
    Math.hypot(pt.x - axisPt.x, pt.z - axisPt.z) - radAtT,
    -t * Math.abs(dy),
    (t - 1) * Math.abs(dy)
  );
}

export function isRoundPointOccluded(
  kind: Solid3DKind,
  lift: SolidLift,
  r: number,
  viewDir: Point3D,
  pt: Point3D
): boolean {
  const ref = Math.max(r, lift.p3.length > 1 ? dist3(lift.p3[0], lift.p3[1]) : 0);
  const vLen = len3(viewDir) || 1;
  if (signedDistRoundSolid(kind, lift, r, pt) < -1e-6 * ref) return true;
  const step = (0.001 * ref) / vLen;
  return (
    signedDistRoundSolid(kind, lift, r, {
      x: pt.x + step * viewDir.x,
      y: pt.y + step * viewDir.y,
      z: pt.z + step * viewDir.z,
    }) <
    -1e-9 * ref
  );
}

export function pointOnRoundRim(
  kind: Solid3DKind,
  lift: SolidLift,
  r: number,
  faceKey: string,
  angleRad: number
): Point3D | null {
  const centerIdx =
    kind === "cone" ? 1 : kind === "cylinder" ? (faceKey === "top" ? 0 : 1) : 0;
  const center = lift.p3[centerIdx];
  if (!center) return null;
  if (faceKey === "disc") {
    return {
      x: center.x + r * Math.cos(angleRad),
      y: center.y + r * Math.sin(angleRad),
      z: center.z,
    };
  }
  return {
    x: center.x + r * Math.cos(angleRad),
    y: center.y,
    z: center.z + r * Math.sin(angleRad),
  };
}

export function pointOnRoundSurface(
  kind: Solid3DKind,
  lift: SolidLift,
  r: number,
  u: number,
  v: number
): Point3D | null {
  const [p0, p1] = lift.p3;
  if (!p0) return null;
  if (kind === "sphere") {
    return {
      x: p0.x + r * Math.cos(v) * Math.cos(u),
      y: p0.y + r * Math.sin(v),
      z: p0.z + r * Math.cos(v) * Math.sin(u),
    };
  }
  if (!p1) return null;
  const radScale = kind === "cone" ? 1 - v : 1;
  return {
    x: p1.x + v * (p0.x - p1.x) + radScale * r * Math.cos(u),
    y: p1.y + v * (p0.y - p1.y),
    z: p1.z + v * (p0.z - p1.z) + radScale * r * Math.sin(u),
  };
}

export interface SolidWireframe {
  solid: Point2D[][];
  dashed: Point2D[][];
}

function groupVisibilityRuns(
  pts: Point2D[],
  hiddenFlags: boolean[]
): { solid: Point2D[][]; dashed: Point2D[][] } {
  const solid: Point2D[][] = [];
  const dashed: Point2D[][] = [];
  if (pts.length < 2) return { solid, dashed };

  let curHidden = hiddenFlags[0];
  let run: Point2D[] = [pts[0], pts[1]];
  for (let i = 1; i < hiddenFlags.length; i++) {
    const isHid = hiddenFlags[i];
    if (isHid === curHidden) {
      run.push(pts[i + 1]);
    } else {
      (curHidden ? dashed : solid).push(run);
      curHidden = isHid;
      run = [pts[i], pts[i + 1]];
    }
  }
  (curHidden ? dashed : solid).push(run);
  return { solid, dashed };
}

export function computeCircumsphereWireframe(
  center2D: Point2D,
  r: number,
  tiltFactor = 0.3
): SolidWireframe {
  const rDraw = r * Math.sqrt(1 + 2 * tiltFactor * tiltFactor);
  const ry = rDraw * 0.3;
  const steps = 96;
  const outline: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    outline.push({ x: center2D.x + rDraw * Math.cos(theta), y: center2D.y + rDraw * Math.sin(theta) });
  }
  const half = (start: number): Point2D[] =>
    Array.from({ length: steps / 2 + 1 }, (_, i) => {
      const theta = start + (i / (steps / 2)) * Math.PI;
      return { x: center2D.x + rDraw * Math.cos(theta), y: center2D.y + ry * Math.sin(theta) };
    });
  return { solid: [outline, half(Math.PI)], dashed: [half(0)] };
}

export function computeSolidWireframe(
  kind: Solid3DKind,
  pts2D: Point2D[],
  r = 1.3,
  orbitCam?: CameraMatrix3
): SolidWireframe {
  if (kind === "box" || kind === "cube" || kind === "pyramid" || kind === "prism" || kind === "frustum") {
    const lift = liftSolidTo3D(kind, pts2D);
    if (!lift) return { solid: [], dashed: [] };

    let effectivePts2D = pts2D;
    let effectiveLift = lift;

    if (orbitCam) {
      const orbited = applyOrbitToPoints(lift.p3, orbitCam, 1, lift);
      effectivePts2D = orbited.pts2d;
      effectiveLift = {
        p3: lift.p3,
        faces: lift.faces,
        view: orbited.view,
      };
    }

    const solid: Point2D[][] = [];
    const dashed: Point2D[][] = [];
    for (const [a, b] of extractPolyhedronEdges(effectiveLift)) {
      const hidden = isEdgeHidden(effectiveLift, effectiveLift.p3[a], effectiveLift.p3[b]);
      const seg = [effectivePts2D[a], effectivePts2D[b]];
      if (hidden) dashed.push(seg);
      else solid.push(seg);
    }
    return { solid, dashed };
  }

  const lift = liftRoundSolidTo3D(kind, pts2D, r);
  if (!lift) return { solid: [], dashed: [] };

  // When un-orbited, use analytic oblique split
  if (!orbitCam) {
    if (kind === "cone") {
      const apex = pts2D[0];
      const base = pts2D[1];
      const { front, back } = splitEllipseFrontBack(base.x, base.y, r, r * OBLIQUE_Z_FACTOR);
      return {
        solid: [front, [apex, { x: base.x - r, y: base.y }], [apex, { x: base.x + r, y: base.y }]],
        dashed: [back],
      };
    }
    if (kind === "cylinder") {
      const top = pts2D[0];
      const bottom = pts2D[1];
      const topArc = splitEllipseFrontBack(top.x, top.y, r, r * OBLIQUE_Z_FACTOR);
      const botArc = splitEllipseFrontBack(bottom.x, bottom.y, r, r * OBLIQUE_Z_FACTOR);
      return {
        solid: [
          topArc.front,
          topArc.back,
          botArc.front,
          [{ x: top.x - r, y: top.y }, { x: bottom.x - r, y: bottom.y }],
          [{ x: top.x + r, y: top.y }, { x: bottom.x + r, y: bottom.y }],
        ],
        dashed: [botArc.back],
      };
    }
    if (kind === "sphere") {
      const c = pts2D[0];
      const steps = 96;
      const outline: Point2D[] = [];
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        outline.push({ x: c.x + r * Math.cos(theta), y: c.y + r * Math.sin(theta) });
      }
      const eq = splitEllipseFrontBack(c.x, c.y, r, r * OBLIQUE_Z_FACTOR);
      return { solid: [outline, eq.front], dashed: [eq.back] };
    }
  }

  // Orbited round solid: 3D sample + ray occlusion
  const { pts2d: orbCenters, rotatedP3, view } = applyOrbitToPoints(lift.p3, orbitCam ?? DEFAULT_ROUND_CAM, 1, lift);
  const orbLift: SolidLift = { p3: lift.p3, faces: [], view };
  const sampleCount = 96;
  const solid: Point2D[][] = [];
  const dashed: Point2D[][] = [];
  const rotVec = (v: Point3D): Point3D => {
    const c = orbitCam ?? DEFAULT_ROUND_CAM;
    return {
      x: c[0] * v.x + c[1] * v.y + c[2] * v.z,
      y: c[3] * v.x + c[4] * v.y + c[5] * v.z,
      z: c[6] * v.x + c[7] * v.y + c[8] * v.z,
    };
  };
  const center3 = linComb3(lift.p3, lift.p3.map(() => 1 / lift.p3.length));
  const center2 = project3DTo2D(lift, center3);
  const projectOrbited3D = (pt3: Point3D): Point2D => {
    const rel = rotVec(sub3(pt3, center3));
    return { x: center2.x + rel.x, y: center2.y + rel.y };
  };

  if (kind === "sphere") {
    const c = orbCenters[0];
    const outline: Point2D[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const theta = (i / sampleCount) * Math.PI * 2;
      outline.push({ x: c.x + r * Math.cos(theta), y: c.y + r * Math.sin(theta) });
    }
    solid.push(outline);
    const eqPts3: Point3D[] = [];
    const eqPts2: Point2D[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const theta = (i / sampleCount) * Math.PI * 2;
      const p = { x: lift.p3[0].x + r * Math.cos(theta), y: lift.p3[0].y, z: lift.p3[0].z + r * Math.sin(theta) };
      eqPts3.push(p);
      eqPts2.push(projectOrbited3D(p));
    }
    const hid: boolean[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const mid3 = scale3(add3(eqPts3[i], eqPts3[i + 1]), 0.5);
      hid.push(isRoundPointOccluded(kind, orbLift, r, view, mid3));
    }
    const runs = groupVisibilityRuns(eqPts2, hid);
    solid.push(...runs.solid);
    dashed.push(...runs.dashed);
    void rotatedP3;
    return { solid, dashed };
  }

  const rings = kind === "cone" ? [1] : [0, 1];
  for (const ringIdx of rings) {
    const ring3: Point3D[] = [];
    const ring2: Point2D[] = [];
    const c3 = lift.p3[ringIdx];
    for (let i = 0; i <= sampleCount; i++) {
      const theta = (i / sampleCount) * Math.PI * 2;
      const p = { x: c3.x + r * Math.cos(theta), y: c3.y, z: c3.z + r * Math.sin(theta) };
      ring3.push(p);
      ring2.push(projectOrbited3D(p));
    }
    const hid: boolean[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const mid3 = scale3(add3(ring3[i], ring3[i + 1]), 0.5);
      hid.push(isRoundPointOccluded(kind, orbLift, r, view, mid3));
    }
    const runs = groupVisibilityRuns(ring2, hid);
    solid.push(...runs.solid);
    dashed.push(...runs.dashed);
  }

  // Silhouette generatrices on base rim
  const cTop2 = orbCenters[0];
  const cBot2 = orbCenters[1];
  const dir2 = sub3(
    { x: cBot2.x, y: cBot2.y, z: 0 },
    { x: cTop2.x, y: cTop2.y, z: 0 }
  );
  const rimAngles = Array.from({ length: 180 }, (_, i) => (i / 180) * Math.PI * 2);
  const rim2D = rimAngles.map((a) =>
    projectOrbited3D({
      x: lift.p3[1].x + r * Math.cos(a),
      y: lift.p3[1].y,
      z: lift.p3[1].z + r * Math.sin(a),
    })
  );
  for (let i = 0; i < rimAngles.length; i++) {
    const prev = rim2D[(i - 1 + rim2D.length) % rim2D.length];
    const curr = rim2D[i];
    const next = rim2D[(i + 1) % rim2D.length];
    const tanCurr = { x: next.x - prev.x, y: next.y - prev.y };
    const toPt = kind === "cone" ? { x: curr.x - cTop2.x, y: curr.y - cTop2.y } : { x: dir2.x, y: dir2.y };
    const cr = toPt.x * tanCurr.y - toPt.y * tanCurr.x;
    const prevTan = {
      x: curr.x - rim2D[(i - 2 + rim2D.length) % rim2D.length].x,
      y: curr.y - rim2D[(i - 2 + rim2D.length) % rim2D.length].y,
    };
    const prevTo = kind === "cone" ? { x: prev.x - cTop2.x, y: prev.y - cTop2.y } : { x: dir2.x, y: dir2.y };
    const crPrev = prevTo.x * prevTan.y - prevTo.y * prevTan.x;
    if (cr * crPrev <= 0 && Math.abs(cr) + Math.abs(crPrev) > 1e-6) {
      if (kind === "cone") {
        solid.push([cTop2, curr]);
      } else {
        const topRimPt = projectOrbited3D({
          x: lift.p3[0].x + r * Math.cos(rimAngles[i]),
          y: lift.p3[0].y,
          z: lift.p3[0].z + r * Math.sin(rimAngles[i]),
        });
        solid.push([topRimPt, curr]);
      }
    }
  }

  return { solid, dashed };
}

// --- 3D Solid Vertex / Edge / Face Presets ---

export interface SolidPresetGeometry {
  kind: Solid3DKind;
  points: Point2D[];
  names: string[];
  r?: number;
  sides?: number;
}

export function buildSolidPresetGeometry(
  kind: Solid3DKind,
  cx: number,
  cy: number,
  options: { w?: number; h?: number; d?: number; r?: number; sides?: number } = {}
): SolidPresetGeometry {
  const height = options.h ?? 3;

  const defaultNames = (k: Solid3DKind, count: number): string[] => {
    const letter = (i: number) => String.fromCharCode(65 + (i % 26));
    if (k === "box" || k === "cube" || k === "prism" || k === "frustum") {
      const half = Math.floor(count / 2);
      const base = Array.from({ length: half }, (_, i) => letter(i));
      return [...base, ...base.map((n) => `${n}'`)];
    }
    if (k === "pyramid") {
      return ["S", ...Array.from({ length: count - 1 }, (_, i) => letter(i))];
    }
    if (k === "cone") return ["S", "O"];
    if (k === "cylinder") return ["O", "O'"];
    return ["O"];
  };

  if (kind === "box" || kind === "cube") {
    const baseSide = options.w ?? 2.4;
    const w = kind === "cube" ? baseSide : options.w ?? 3;
    const h = kind === "cube" ? baseSide : options.h ?? 2;
    const d = kind === "cube" ? baseSide : options.d ?? 2;
    const dx = d * 0.5;
    const dy = d * 0.45;
    const frontFace: Point2D[] = [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy + h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
    ];
    const backFace = frontFace.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    const points = [...frontFace, ...backFace];
    return { kind, points, names: defaultNames(kind, points.length) };
  }

  if (kind === "prism" || kind === "pyramid" || kind === "frustum") {
    const sides = Math.max(3, Math.round(options.sides ?? (kind === "prism" ? 3 : 4)));
    const rad = options.r ?? 1.6;
    const startAngle = Math.PI / sides - Math.PI / 2;
    const ring = (yCenter: number, radius = rad): Point2D[] =>
      Array.from({ length: sides }, (_, idx) => {
        const theta = startAngle + (2 * Math.PI * idx) / sides;
        return {
          x: cx + radius * Math.cos(theta) + OBLIQUE_Z_FACTOR * radius * Math.sin(theta),
          y: yCenter + OBLIQUE_Z_FACTOR * radius * Math.sin(theta),
        };
      });

    if (kind === "pyramid") {
      const points = [{ x: cx, y: cy + height / 2 }, ...ring(cy - height / 2)];
      return { kind, points, names: defaultNames(kind, points.length), sides };
    }
    if (kind === "frustum") {
      const points = [...ring(cy - height / 2), ...ring(cy + height / 2, rad * 0.6)];
      return { kind, points, names: defaultNames(kind, points.length), sides };
    }
    const points = [...ring(cy - height / 2), ...ring(cy + height / 2)];
    return { kind, points, names: defaultNames(kind, points.length), sides };
  }

  if (kind === "cone" || kind === "cylinder") {
    const r = options.r ?? (kind === "cone" ? 1.5 : 1.3);
    const points: Point2D[] = [
      { x: cx, y: cy + height / 2 },
      { x: cx, y: cy - height / 2 },
    ];
    return { kind, points, names: defaultNames(kind, points.length), r };
  }

  const r = options.r ?? 1.6;
  return { kind: "sphere", points: [{ x: cx, y: cy }], names: defaultNames("sphere", 1), r };
}

export function createSolid3DElement(
  kind: Solid3DKind,
  center: Point2D,
  existingElements: CanvasElement[],
  options: {
    id?: string;
    sides?: number;
    w?: number;
    h?: number;
    d?: number;
    r?: number;
    actorId?: string;
    seq?: number;
    page?: number;
  } = {}
): CanvasElement {
  const id = options.id ?? `solid_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const preset = buildSolidPresetGeometry(kind, center.x, center.y, options);
  const used = new Set(
    existingElements
      .filter((e) => e.type === "GeomPoint" && typeof e.props.name === "string")
      .map((e) => String(e.props.name))
  );
  const sub = "₀₁₂₃₄₅₆₇₈₉";
  const withSub = (n: number) =>
    n === 0
      ? preset.names
      : preset.names.map((nm) =>
          nm.replace(/^([A-Z])/, (_, ch: string) => `${ch}${String(n).split("").map((d) => sub[Number(d)]).join("")}`)
        );
  let suffix = 0;
  while (withSub(suffix).some((nm) => nm && used.has(nm))) {
    suffix++;
  }
  const vertexNames = withSub(suffix);
  const pointIds = preset.points.map((_, idx) => `${id}_p${idx}`);

  return {
    id,
    type: "Solid3D",
    transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
    style: { stroke: "#0f766e", width: 2 },
    meta: {
      createdBy: options.actorId ?? "local",
      createdAtSeq: options.seq ?? 0,
      page: options.page ?? 1,
    },
    props: {
      kind,
      points: pointIds,
      pointCoords: preset.points,
      vertexNames,
      ...(preset.sides !== undefined ? { sides: preset.sides } : {}),
      ...(preset.r !== undefined ? { r: preset.r } : {}),
    } satisfies Solid3DProps & Record<string, unknown>,
  };
}

export function createOxyzElement(
  center: Point2D,
  options: {
    id?: string;
    size?: number;
    actorId?: string;
    seq?: number;
    page?: number;
  } = {}
): CanvasElement {
  const id = options.id ?? `oxyz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    type: "Axes3D",
    transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
    style: { stroke: "#64748b", width: 1.5 },
    meta: {
      createdBy: options.actorId ?? "local",
      createdAtSeq: options.seq ?? 0,
      page: options.page ?? 1,
    },
    props: {
      size: options.size ?? 4,
    } satisfies Axes3DProps & Record<string, unknown>,
  };
}

// --- Oxyz Projection & Axes Geometry ---

export function projectOxyzPoint(
  axesTransform: { x: number; y: number; scale?: number },
  p3: Point3D
): Point2D {
  const sc = axesTransform.scale || 1;
  return {
    x: axesTransform.x + sc * (p3.y - 0.5 * p3.x),
    y: axesTransform.y + sc * (p3.z - 0.5 * p3.x),
  };
}

export interface OxyzAxisRenderSpec {
  label: "x" | "y" | "z";
  line: [Point2D, Point2D];
  tip: Point2D;
  units: Array<{ tick: [Point2D, Point2D]; labelPos: Point2D; n: number }>;
}

export function resolveOxyzBounds(props: Axes3DProps): {
  x: { neg: number; pos: number };
  y: { neg: number; pos: number };
  z: { neg: number; pos: number };
} {
  const base = typeof props.size === "number" && props.size > 0 ? props.size : 6;
  const pick = (pos?: number, neg?: number) => ({
    pos: typeof pos === "number" && pos > 0 ? pos : base,
    neg: typeof neg === "number" && neg > 0 ? neg : Math.min(2, base),
  });
  return {
    x: pick(props.xPos, props.xNeg),
    y: pick(props.yPos, props.yNeg),
    z: pick(props.zPos, props.zNeg),
  };
}

export function buildOxyzAxes(
  props: Axes3DProps,
  transform: { x: number; y: number; scale?: number },
  orbitCam?: CameraMatrix3
): { origin: Point2D; axes: OxyzAxisRenderSpec[] } {
  const bounds = resolveOxyzBounds(props);
  const sc = transform.scale || 1;

  const toScreenWorld = (p3: Point3D): Point2D => {
    if (!orbitCam) {
      return {
        x: transform.x + sc * (p3.y - 0.5 * p3.x),
        y: transform.y + sc * (p3.z - 0.5 * p3.x),
      };
    }
    // World Oxyz vector mapped to 3D space (y -> +X, z -> +Y, -x -> +Z)
    const v3: Point3D = { x: p3.y, y: p3.z, z: -p3.x };
    const rot: Point3D = {
      x: orbitCam[0] * v3.x + orbitCam[1] * v3.y + orbitCam[2] * v3.z,
      y: orbitCam[3] * v3.x + orbitCam[4] * v3.y + orbitCam[5] * v3.z,
      z: orbitCam[6] * v3.x + orbitCam[7] * v3.y + orbitCam[8] * v3.z,
    };
    return { x: transform.x + sc * rot.x, y: transform.y + sc * rot.y };
  };

  const makeAxis = (
    label: "x" | "y" | "z",
    dir: Point3D,
    tickOffset2D: Point2D
  ): OxyzAxisRenderSpec => {
    const { neg, pos } = bounds[label];
    const units: Array<{ tick: [Point2D, Point2D]; labelPos: Point2D; n: number }> = [];
    for (let k = -neg; k <= pos; k++) {
      if (k === 0) continue;
      const center = toScreenWorld(scale3(dir, k));
      units.push({
        tick: [
          { x: center.x - tickOffset2D.x * 0.12 * sc, y: center.y - tickOffset2D.y * 0.12 * sc },
          { x: center.x + tickOffset2D.x * 0.12 * sc, y: center.y + tickOffset2D.y * 0.12 * sc },
        ],
        labelPos: {
          x: center.x + tickOffset2D.x * 0.42 * sc,
          y: center.y + tickOffset2D.y * 0.42 * sc,
        },
        n: k,
      });
    }
    const tail = toScreenWorld(scale3(dir, -neg));
    const tip = toScreenWorld(scale3(dir, pos));
    return { label, line: [tail, tip], tip, units };
  };

  return {
    origin: { x: transform.x, y: transform.y },
    axes: [
      makeAxis("x", { x: 1, y: 0, z: 0 }, { x: 1, y: -1 }),
      makeAxis("y", { x: 0, y: 1, z: 0 }, { x: 0, y: 1 }),
      makeAxis("z", { x: 0, y: 0, z: 1 }, { x: 1, y: 0 }),
    ],
  };
}

// --- 3D Barycentric Operators (Ol) & Skew Line Closest Points (SV) ---

export function skewLineClosest(
  a1: Point3D,
  a2: Point3D,
  b1: Point3D,
  b2: Point3D
): { t: number; u: number; pA: Point3D; pB: Point3D; gap: number; normalizedGap: number } | null {
  const d1 = sub3(a2, a1);
  const d2 = sub3(b2, b1);
  const w0 = sub3(a1, b1);
  const a = dot3(d1, d1);
  const b = dot3(d1, d2);
  const c = dot3(d2, d2);
  const d = dot3(d1, w0);
  const e = dot3(d2, w0);
  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-12 * a * c) return null;
  const t = (b * e - c * d) / denom;
  const u = (a * e - b * d) / denom;
  const pA = linComb3([a1, a2], [1 - t, t]);
  const pB = linComb3([b1, b2], [1 - u, u]);
  const gap = dist3(pA, pB);
  return {
    t,
    u,
    pA,
    pB,
    gap,
    normalizedGap: gap / (Math.max(Math.sqrt(a), Math.sqrt(c)) || 1),
  };
}

export const Ops3D = {
  foot(p: Point3D, a: Point3D, b: Point3D): [number, number] {
    const ab = sub3(b, a);
    const t = dot3(sub3(p, a), ab) / (dot3(ab, ab) || 1);
    return [1 - t, t];
  },

  bisectorFoot(v: Point3D, a: Point3D, b: Point3D): [number, number] {
    const da = dist3(v, a);
    const db = dist3(v, b);
    const t = da / (da + db || 1);
    return [1 - t, t];
  },

  circumcenter(a: Point3D, b: Point3D, c: Point3D): [number, number, number] | null {
    const aa = dot3(sub3(b, c), sub3(b, c));
    const bb = dot3(sub3(c, a), sub3(c, a));
    const cc = dot3(sub3(a, b), sub3(a, b));
    const w = [aa * (bb + cc - aa), bb * (cc + aa - bb), cc * (aa + bb - cc)];
    const sum = w[0] + w[1] + w[2];
    if (Math.abs(sum) < 1e-12) return null;
    return [w[0] / sum, w[1] / sum, w[2] / sum];
  },

  orthocenter(a: Point3D, b: Point3D, c: Point3D): [number, number, number] | null {
    const aa = dot3(sub3(b, c), sub3(b, c));
    const bb = dot3(sub3(c, a), sub3(c, a));
    const cc = dot3(sub3(a, b), sub3(a, b));
    const ta = (bb + cc - aa) / 2;
    const tb = (cc + aa - bb) / 2;
    const tc = (aa + bb - cc) / 2;
    const w = [tb * tc, tc * ta, ta * tb];
    const sum = w[0] + w[1] + w[2];
    if (Math.abs(sum) < 1e-12) return null;
    return [w[0] / sum, w[1] / sum, w[2] / sum];
  },

  incenter(a: Point3D, b: Point3D, c: Point3D): [number, number, number] | null {
    const la = dist3(b, c);
    const lb = dist3(c, a);
    const lc = dist3(a, b);
    const sum = la + lb + lc;
    if (sum < 1e-12) return null;
    return [la / sum, lb / sum, lc / sum];
  },

  sphereCenter(a: Point3D, b: Point3D, c: Point3D, d: Point3D): [number, number, number, number] | null {
    const u = sub3(b, a);
    const v = sub3(c, a);
    const w = sub3(d, a);
    const mat = [
      [dot3(u, u), dot3(u, v), dot3(u, w)],
      [dot3(v, u), dot3(v, v), dot3(v, w)],
      [dot3(w, u), dot3(w, v), dot3(w, w)],
    ];
    const rhs = [dot3(u, u) / 2, dot3(v, v) / 2, dot3(w, w) / 2];
    const det3 = (m: number[][]): number =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    const dMat = det3(mat);
    const scale = Math.max(mat[0][0], mat[1][1], mat[2][2]) ** 3;
    if (Math.abs(dMat) < 1e-12 * (scale || 1)) return null;

    const replaceCol = (col: number) => mat.map((row, rIdx) => row.map((val, cIdx) => (cIdx === col ? rhs[rIdx] : val)));
    const alpha = det3(replaceCol(0)) / dMat;
    const beta = det3(replaceCol(1)) / dMat;
    const gamma = det3(replaceCol(2)) / dMat;
    return [1 - alpha - beta - gamma, alpha, beta, gamma];
  },

  linePlane(a: Point3D, b: Point3D, p: Point3D, q: Point3D, r: Point3D): [number, number] | null {
    const n = cross3(sub3(q, p), sub3(r, p));
    const ab = sub3(b, a);
    const denom = dot3(n, ab);
    if (Math.abs(denom) < 1e-12 * (len3(n) * len3(ab) || 1)) return null;
    const t = dot3(n, sub3(p, a)) / denom;
    return [1 - t, t];
  },

  commonPerp(a: Point3D, b: Point3D, c: Point3D, d: Point3D): [number, number] | null {
    const res = skewLineClosest(a, b, c, d);
    return res ? [1 - res.t, res.t] : null;
  },

  footPlane(p: Point3D, a: Point3D, b: Point3D, c: Point3D): [number, number, number] | null {
    const n = cross3(sub3(b, a), sub3(c, a));
    const nSq = dot3(n, n);
    if (nSq < 1e-12) return null;
    const t = dot3(sub3(p, a), n) / nSq;
    const proj = sub3(p, scale3(n, t));
    const areaSigned = (u: Point3D, v: Point3D, w: Point3D) => dot3(cross3(sub3(v, u), sub3(w, u)), n) / nSq;
    return [areaSigned(proj, b, c), areaSigned(a, proj, c), areaSigned(a, b, proj)];
  },
};

// --- Full 3D Scene Constraint Solver (qp) ---

export function solveGeometry3D(elements: CanvasElement[]): Solved3DScene {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const pts = new Map<string, Point2D>();
  const p3 = new Map<string, Point3D>();
  const owner = new Map<string, string>();
  const lifts = new Map<string, SolidLift>();
  const undef = new Set<string>();
  const solidOfPoint = new Map<string, string>();

  // Index embedded polygon vertices
  for (const el of elements) {
    if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
      for (const v of el.props.points as EmbeddedVertex[]) {
        if (v && typeof v.id === "string") {
          pts.set(v.id, { x: v.x + el.transform.x, y: v.y + el.transform.y });
        }
      }
    }
    if (el.type === "Solid3D" && Array.isArray(el.props.points)) {
      const coords = Array.isArray(el.props.pointCoords) ? (el.props.pointCoords as Point2D[]) : null;
      (el.props.points as string[]).forEach((ptId, idx) => {
        solidOfPoint.set(ptId, el.id);
        if (coords && coords[idx] && !byId.has(ptId)) {
          pts.set(ptId, {
            x: coords[idx].x + el.transform.x,
            y: coords[idx].y + el.transform.y,
          });
        }
      });
    }
  }

  const get2D = (id: string): Point2D | undefined => pts.get(id);

  const ensureLiftSolid = (solid: CanvasElement): SolidLift | undefined => {
    if (lifts.has(solid.id)) return lifts.get(solid.id);
    const sPts = Array.isArray(solid.props.points) ? (solid.props.points as string[]) : [];
    const pts2 = sPts.map(get2D);
    if (pts2.some((p) => !p)) return undefined;
    const validPts2 = pts2 as Point2D[];
    const kind = solid.props.kind as Solid3DKind;
    const baseLift =
      liftSolidTo3D(kind, validPts2) ??
      liftRoundSolidTo3D(kind, validPts2, typeof solid.props.r === "number" ? solid.props.r : 1.3);
    if (!baseLift) return undefined;

    let finalLift = baseLift;
    let displayPts2 = validPts2;
    const hasOrbit =
      typeof solid.props.azimuth === "number" ||
      typeof solid.props.elevation === "number";
    if (hasOrbit && !solid.props.through) {
      const cam = azimuthElevationToCamera(
        typeof solid.props.azimuth === "number" ? solid.props.azimuth : 26,
        typeof solid.props.elevation === "number" ? solid.props.elevation : 17
      );
      const orb = applyOrbitToPoints(baseLift.p3, cam, 1, baseLift);
      finalLift = { p3: orb.rotatedP3, faces: baseLift.faces, view: orb.view };
      displayPts2 = orb.pts2d;
    }

    lifts.set(solid.id, finalLift);
    sPts.forEach((ptId, idx) => {
      if (finalLift.p3[idx]) {
        p3.set(ptId, finalLift.p3[idx]);
        owner.set(ptId, solid.id);
      }
      if (hasOrbit && displayPts2[idx] && !byId.has(ptId)) {
        pts.set(ptId, displayPts2[idx]);
      }
    });
    return finalLift;
  };

  // Pre-lift all Solid3D elements so edges, points, and ownership are always immediately available
  for (const el of elements) {
    if (el.type === "Solid3D") {
      ensureLiftSolid(el);
    }
  }

  const ensureLiftPoint3D = (id: string): Point3D | undefined => {
    if (p3.has(id)) return p3.get(id);
    const solidId = solidOfPoint.get(id);
    if (!solidId || lifts.has(solidId)) return p3.get(id);
    const solid = byId.get(solidId);
    if (!solid || solid.type !== "Solid3D") return undefined;
    ensureLiftSolid(solid);
    return p3.get(id);
  };

  const applyBarycentric3D = (
    targetId: string,
    checkIds: string[],
    computeWeights: (pts3: Point3D[]) => number[] | null,
    combineIds?: string[]
  ): boolean => {
    const check3 = checkIds.map(ensureLiftPoint3D);
    if (check3.some((v) => !v)) return false;
    const commonOwner = owner.get(checkIds[0]);
    if (!commonOwner || checkIds.some((id) => owner.get(id) !== commonOwner)) return false;
    const weights = computeWeights(check3 as Point3D[]);
    const baseIds = combineIds ?? checkIds;
    const base2 = baseIds.map(get2D);
    if (!weights || base2.some((v) => !v) || weights.some((w) => !Number.isFinite(w))) {
      return false;
    }
    const validBase2 = base2 as Point2D[];
    const validBase3 = baseIds.map((id) => ensureLiftPoint3D(id) ?? { x: 0, y: 0, z: 0 });
    pts.set(targetId, {
      x: weights.reduce((acc, w, idx) => acc + w * validBase2[idx].x, 0),
      y: weights.reduce((acc, w, idx) => acc + w * validBase2[idx].y, 0),
    });
    p3.set(targetId, linComb3(validBase3, weights));
    owner.set(targetId, commonOwner);
    return true;
  };

  const getEnds = (id: string): [string, string] | null => {
    const el = byId.get(id);
    if (!el) return null;
    if (el.type === "GeomSegment" || el.type === "GeomRay" || (el.type === "GeomLine" && el.props.def === "through")) {
      return [String(el.props.from ?? ""), String(el.props.to ?? "")];
    }
    return null;
  };

  const getCircle = (id: string) => {
    const el = byId.get(id);
    if (!el || el.type !== "GeomCircle") return null;
    const c = get2D(String(el.props.center ?? ""));
    if (!c) return null;
    const r = resolveCircleRadius(el.props.radius as CircleRadiusSpec | undefined, c, get2D);
    return r === null ? null : { cx: c.x, cy: c.y, r };
  };

  const getLine2 = (id: string) => resolveLineGeometry(byId.get(id), get2D, byId);

  const intersect2 = (aId: string, bId: string, which = 0): Point2D | null => {
    const la = getLine2(aId);
    const lb = getLine2(bId);
    if (la && lb) return intersectLines2D(la, lb);
    const ca = getCircle(aId);
    const cb = getCircle(bId);
    if (la && cb) return intersectLineCircleAt(la, cb, which);
    if (ca && lb) return intersectLineCircleAt(lb, ca, which);
    if (ca && cb) return intersectCirclesAt(ca, cb, which);
    return null;
  };

  for (const el of elements) {
    if (el.type === "Point") {
      pts.set(el.id, { x: el.transform.x, y: el.transform.y });
      continue;
    }
    if (el.type !== "GeomPoint") continue;

    const fallback: Point2D = { x: el.transform.x, y: el.transform.y };
    const rawC = el.props.constraint;
    const c: PointConstraint =
      rawC && typeof rawC === "object" && typeof (rawC as Record<string, unknown>).kind === "string"
        ? (rawC as PointConstraint)
        : { kind: "free" };

    // First attempt 3D barycentric propagation if parent points belong to the same 3D solid / Oxyz
    let handledIn3D = false;
    switch (c.kind) {
      case "midpoint": {
        const ends = getEnds(c.segment);
        if (ends) handledIn3D = applyBarycentric3D(el.id, ends, () => [0.5, 0.5]);
        break;
      }
      case "midpointOf":
        handledIn3D = applyBarycentric3D(el.id, [c.a, c.b], () => [0.5, 0.5]);
        break;
      case "foot":
        handledIn3D = applyBarycentric3D(el.id, [c.p, c.a, c.b], ([p, a, b]) => Ops3D.foot(p, a, b), [c.a, c.b]);
        break;
      case "bisectorFoot":
        handledIn3D = applyBarycentric3D(
          el.id,
          [c.vertex, c.a, c.b],
          ([v, a, b]) => Ops3D.bisectorFoot(v, a, b),
          [c.a, c.b]
        );
        break;
      case "circumcenter":
        handledIn3D = applyBarycentric3D(el.id, [c.a, c.b, c.c], ([a, b, p3c]) => Ops3D.circumcenter(a, b, p3c));
        break;
      case "sphereCenter":
        handledIn3D = applyBarycentric3D(
          el.id,
          [c.a, c.b, c.c, c.d],
          ([a, b, p3c, d]) => Ops3D.sphereCenter(a, b, p3c, d)
        );
        break;
      case "orthocenter":
        handledIn3D = applyBarycentric3D(el.id, [c.a, c.b, c.c], ([a, b, p3c]) => Ops3D.orthocenter(a, b, p3c));
        break;
      case "incenter":
        handledIn3D = applyBarycentric3D(el.id, [c.a, c.b, c.c], ([a, b, p3c]) => Ops3D.incenter(a, b, p3c));
        break;
      case "centroid":
        handledIn3D = applyBarycentric3D(el.id, [c.a, c.b, c.c], () => [1 / 3, 1 / 3, 1 / 3]);
        break;
      case "onLine":
        handledIn3D = applyBarycentric3D(el.id, [c.a, c.b], () => [1 - Number(c.t), Number(c.t)]);
        break;
      case "linePlane":
        handledIn3D = applyBarycentric3D(
          el.id,
          [c.a, c.b, c.p, c.q, c.r],
          ([a, b, p, q, r]) => Ops3D.linePlane(a, b, p, q, r),
          [c.a, c.b]
        );
        break;
      case "commonPerp":
        handledIn3D = applyBarycentric3D(
          el.id,
          [c.a, c.b, c.c, c.d],
          ([a, b, p3c, d]) => Ops3D.commonPerp(a, b, p3c, d),
          [c.a, c.b]
        );
        break;
      case "footPlane":
        handledIn3D = applyBarycentric3D(
          el.id,
          [c.p, c.a, c.b, c.c],
          ([p, a, b, p3c]) => Ops3D.footPlane(p, a, b, p3c),
          [c.a, c.b, c.c]
        );
        break;
      case "intersection": {
        const endsA = getEnds(c.a);
        const endsB = getEnds(c.b);
        if (endsA && endsB) {
          const all4 = [...endsA, ...endsB];
          const p3s = all4.map(ensureLiftPoint3D);
          if (p3s.every((v): v is Point3D => v !== undefined)) {
            const meet = skewLineClosest(p3s[0], p3s[1], p3s[2], p3s[3]);
            if (meet && meet.normalizedGap < 1e-6) {
              handledIn3D = applyBarycentric3D(el.id, all4, () => [1 - meet.t, meet.t, 0, 0]);
            }
          }
        }
        break;
      }
      case "combo":
        handledIn3D = applyBarycentric3D(el.id, c.refs, () => c.w);
        break;
      default:
        break;
    }

    if (handledIn3D) continue;

    // 2D / special 3D constraints
    switch (c.kind) {
      case "oxyz": {
        const axes = byId.get(c.axes);
        if (axes?.type === "Axes3D") {
          const pos3 = { x: c.x, y: c.y, z: c.z };
          pts.set(el.id, projectOxyzPoint(axes.transform, pos3));
          p3.set(el.id, pos3);
          owner.set(el.id, axes.id);
        } else {
          pts.set(el.id, fallback);
        }
        break;
      }
      case "oxy": {
        const axes = byId.get(c.axes);
        if (axes?.type === "Axes2D") {
          const sc = axes.transform.scale || 1;
          pts.set(el.id, { x: axes.transform.x + sc * c.x, y: axes.transform.y + sc * c.y });
        } else {
          pts.set(el.id, fallback);
        }
        break;
      }
      case "onSurface": {
        const solid = byId.get(c.solid);
        const solidPts = solid?.type === "Solid3D" ? (solid.props.points as string[]).map(get2D) : [];
        const validPts = solidPts.every((p): p is Point2D => p !== undefined) ? (solidPts as Point2D[]) : null;
        const r = typeof solid?.props.r === "number" ? solid.props.r : 1.3;
        const lift = solid && validPts ? liftRoundSolidTo3D(solid.props.kind as Solid3DKind, validPts, r) : null;
        const pt3 = solid && lift ? pointOnRoundSurface(solid.props.kind as Solid3DKind, lift, r, c.u, c.v) : null;
        pts.set(el.id, pt3 && lift ? project3DTo2D(lift, pt3) : fallback);
        break;
      }
      case "onRound": {
        const solid = byId.get(c.solid);
        const r = typeof solid?.props.r === "number" ? solid.props.r : 1.3;
        const solidPts = solid?.type === "Solid3D" ? (solid.props.points as string[]).map(get2D) : [];
        const validPts = solidPts.every((p): p is Point2D => p !== undefined) ? (solidPts as Point2D[]) : null;
        const rim = solid && validPts ? getRoundRims(solid.props.kind as Solid3DKind, validPts, r).find((rm) => rm.key === c.face) : undefined;
        const t = Number(c.t);
        pts.set(el.id, rim ? { x: rim.cx + rim.rx * Math.cos(t), y: rim.cy + rim.ry * Math.sin(t) } : fallback);
        break;
      }
      case "onLine": {
        const a = get2D(c.a);
        const b = get2D(c.b);
        const t = Number(c.t);
        pts.set(el.id, a && b ? { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) } : fallback);
        break;
      }
      case "onObject":
      case "on": {
        const circle = getCircle(c.target);
        if (circle) {
          const t = typeof c.t === "number" ? c.t : Math.atan2(fallback.y - circle.cy, fallback.x - circle.cx);
          pts.set(el.id, { x: circle.cx + circle.r * Math.cos(t), y: circle.cy + circle.r * Math.sin(t) });
          break;
        }
        const line = getLine2(c.target);
        if (line) {
          const lenSq = line.dx * line.dx + line.dy * line.dy;
          const t =
            typeof c.t === "number"
              ? c.t
              : lenSq > GEOM_EPS
              ? ((fallback.x - line.px) * line.dx + (fallback.y - line.py) * line.dy) / lenSq
              : 0;
          pts.set(el.id, { x: line.px + t * line.dx, y: line.py + t * line.dy });
        } else {
          pts.set(el.id, fallback);
        }
        break;
      }
      case "flat": {
        const anchor = get2D(c.anchor);
        const src3 = ensureLiftPoint3D(c.src);
        const a3 = ensureLiftPoint3D(c.a);
        const b3 = ensureLiftPoint3D(c.b);
        const c3 = ensureLiftPoint3D(c.c);
        if (anchor && src3 && a3 && b3 && c3) {
          const uv = projectPointToPlaneBasis(src3, a3, b3, c3);
          pts.set(el.id, uv ? placeFlattenedUV(anchor, uv, c.rot, c.flip) : fallback);
        } else {
          pts.set(el.id, fallback);
        }
        break;
      }
      case "midpoint": {
        const seg = byId.get(c.segment);
        const a = seg ? get2D(String(seg.props.from ?? "")) : undefined;
        const b = seg ? get2D(String(seg.props.to ?? "")) : undefined;
        pts.set(el.id, a && b ? midpoint2D(a, b) : fallback);
        break;
      }
      case "midpointOf": {
        const a = get2D(c.a);
        const b = get2D(c.b);
        pts.set(el.id, a && b ? midpoint2D(a, b) : fallback);
        break;
      }
      case "intersection": {
        const hit = intersect2(c.a, c.b, c.which ?? 0);
        if (!hit) undef.add(el.id);
        pts.set(el.id, hit ?? fallback);
        break;
      }
      case "foot": {
        const p = get2D(c.p);
        const a = get2D(c.a);
        const b = get2D(c.b);
        pts.set(el.id, (p && a && b && footOfPerpendicular(p, a, b)) || fallback);
        break;
      }
      case "combo": {
        const ref2 = c.refs.map(get2D);
        if (ref2.every((p): p is Point2D => p !== undefined) && ref2.length === c.w.length) {
          pts.set(el.id, {
            x: c.w.reduce((acc, w, idx) => acc + w * ref2[idx].x, 0),
            y: c.w.reduce((acc, w, idx) => acc + w * ref2[idx].y, 0),
          });
        } else {
          pts.set(el.id, fallback);
        }
        break;
      }
      case "reflectPoint": {
        const p = get2D(c.p);
        const ctr = get2D(c.center);
        pts.set(el.id, p && ctr ? reflectPointOverPoint(p, ctr) : fallback);
        break;
      }
      case "reflectLine": {
        const p = get2D(c.p);
        const a = get2D(c.a);
        const b = get2D(c.b);
        pts.set(el.id, (p && a && b && reflectPointOverLine(p, a, b)) || fallback);
        break;
      }
      case "reflectOver": {
        const p = get2D(c.p);
        const line = getLine2(c.line);
        const foot =
          p && line
            ? footOfPerpendicular(p, { x: line.px, y: line.py }, { x: line.px + line.dx, y: line.py + line.dy })
            : null;
        pts.set(el.id, p && foot ? reflectPointOverPoint(p, foot) : fallback);
        break;
      }
      case "translate": {
        const p = get2D(c.p);
        const from = get2D(c.from);
        const to = get2D(c.to);
        pts.set(el.id, p && from && to ? translatePoint(p, from, to) : fallback);
        break;
      }
      case "atAngle": {
        const vtx = get2D(c.vertex);
        const arm = get2D(c.arm);
        pts.set(el.id, (vtx && arm && pointAtAngle(vtx, arm, c.deg, c.len)) || fallback);
        break;
      }
      case "rotate": {
        const p = get2D(c.p);
        const ctr = get2D(c.center);
        pts.set(el.id, p && ctr ? rotatePointAround(p, ctr, c.deg) : fallback);
        break;
      }
      case "homothety": {
        const p = get2D(c.p);
        const ctr = get2D(c.center);
        pts.set(el.id, p && ctr ? homothetyPoint(p, ctr, c.k) : fallback);
        break;
      }
      case "circumcenter": {
        const a = get2D(c.a);
        const b = get2D(c.b);
        const p2c = get2D(c.c);
        pts.set(el.id, (a && b && p2c && circumcenter2D(a, b, p2c)) || fallback);
        break;
      }
      case "orthocenter": {
        const a = get2D(c.a);
        const b = get2D(c.b);
        const p2c = get2D(c.c);
        pts.set(el.id, (a && b && p2c && orthocenter2D(a, b, p2c)) || fallback);
        break;
      }
      case "incenter": {
        const a = get2D(c.a);
        const b = get2D(c.b);
        const p2c = get2D(c.c);
        pts.set(el.id, (a && b && p2c && incenter2D(a, b, p2c)) || fallback);
        break;
      }
      case "centroid": {
        const a = get2D(c.a);
        const b = get2D(c.b);
        const p2c = get2D(c.c);
        pts.set(el.id, a && b && p2c ? { x: (a.x + b.x + p2c.x) / 3, y: (a.y + b.y + p2c.y) / 3 } : fallback);
        break;
      }
      case "tangentPoint": {
        const p = get2D(c.p);
        const circle = getCircle(c.circle);
        pts.set(el.id, (p && circle && tangentPointToCircle(p, circle, c.side)) || fallback);
        break;
      }
      case "bisectorFoot": {
        const vtx = get2D(c.vertex);
        const a = get2D(c.a);
        const b = get2D(c.b);
        pts.set(el.id, (vtx && a && b && bisectorFoot2D(vtx, a, b)) || fallback);
        break;
      }
      default:
        pts.set(el.id, fallback);
        break;
    }
  }

  for (const ptId of solidOfPoint.keys()) {
    ensureLiftPoint3D(ptId);
  }

  return { pts, p3, owner, lifts, undef };
}

// --- True 2D Plane Face Extraction (Tách mặt phẳng - hình thật) ---

export function projectPointToPlaneBasis(
  pt: Point3D,
  a: Point3D,
  b: Point3D,
  c: Point3D
): { u: number; v: number } | null {
  const ab = sub3(b, a);
  const lenAB = len3(ab);
  const normal = cross3(ab, sub3(c, a));
  if (lenAB < 1e-12 || len3(normal) < 1e-12 * lenAB * lenAB) return null;
  const ex = scale3(ab, 1 / lenAB);
  const eyRaw = cross3(normal, ex);
  const ey = scale3(eyRaw, 1 / (len3(eyRaw) || 1));
  const rel = sub3(pt, a);
  return { u: dot3(rel, ex), v: dot3(rel, ey) };
}

export function placeFlattenedUV(
  anchor: Point2D,
  uv: { u: number; v: number },
  rotRad: number,
  flip: boolean
): Point2D {
  const v = flip ? -uv.v : uv.v;
  return {
    x: anchor.x + uv.u * Math.cos(rotRad) - v * Math.sin(rotRad),
    y: anchor.y + uv.u * Math.sin(rotRad) + v * Math.cos(rotRad),
  };
}

export interface FlattenedFaceResult {
  anchor: Point2D;
  vertices2D: Array<{ id: string; name: string; pos: Point2D }>;
  segments: Array<[number, number]>;
  polygonElement: CanvasElement;
}

export function computeFlattenedFace(
  pointIds: string[],
  scene: Solved3DScene,
  elements: CanvasElement[],
  targetOffset: Point2D = { x: 4.5, y: 0 }
): FlattenedFaceResult | null {
  if (pointIds.length < 3) return null;
  const ownerId = scene.owner.get(pointIds[0]);
  if (!ownerId || pointIds.some((id) => scene.owner.get(id) !== ownerId)) {
    return null;
  }
  const [pA, pB, pC] = pointIds.slice(0, 3).map((id) => scene.p3.get(id));
  if (!pA || !pB || !pC) return null;

  const normal = cross3(sub3(pB, pA), sub3(pC, pA));
  const nLen = len3(normal);
  if (nLen < 1e-9) return null;

  const solidEl = elements.find((e) => e.id === ownerId);
  const solidPts = Array.isArray(solidEl?.props.points) ? (solidEl.props.points as string[]) : [];
  const solidNames = Array.isArray(solidEl?.props.vertexNames)
    ? (solidEl.props.vertexNames as string[])
    : [];
  const scaleRef = Math.max(
    ...solidPts.map((id) => scene.p3.get(id)).filter((p): p is Point3D => !!p).map((p) => dist3(p, pA)),
    1e-9
  );
  if (nLen < 1e-9 * scaleRef * scaleRef) return null;

  // Collect all coplanar standalone points + explicit face vertex IDs belonging to this solid
  const coplanarIds = elements
    .filter((e) => {
      if (e.type !== "GeomPoint" || e.props.handle) return false;
      if (scene.owner.get(e.id) !== ownerId || scene.undef.has(e.id)) return false;
      const pt = scene.p3.get(e.id);
      if (!pt) return false;
      return Math.abs(dot3(normal, sub3(pt, pA))) / nLen <= 1e-6 * scaleRef;
    })
    .map((e) => e.id);

  const idsToUse = [...pointIds];
  for (const cid of coplanarIds) {
    if (!idsToUse.includes(cid)) idsToUse.push(cid);
  }
  const uvs = idsToUse
    .map((id) => {
      const pt3 = scene.p3.get(id);
      return pt3 ? projectPointToPlaneBasis(pt3, pA, pB, pC) : null;
    });
  if (uvs.some((uv) => uv === null)) return null;
  const validUVs = uvs as Array<{ u: number; v: number }>;

  // Center UVs cleanly beside the 3D solid
  const avgU = validUVs.reduce((s, uv) => s + uv.u, 0) / validUVs.length;
  const avgV = validUVs.reduce((s, uv) => s + uv.v, 0) / validUVs.length;
  const pts2 = idsToUse.map((id) => scene.pts.get(id) ?? { x: 0, y: 0 });
  const maxX = Math.max(...pts2.map((p) => p.x));
  const avgY = pts2.reduce((s, p) => s + p.y, 0) / pts2.length;
  const minU = Math.min(...validUVs.map((uv) => uv.u - avgU));
  const anchor: Point2D = {
    x: maxX + targetOffset.x - minU,
    y: avgY + targetOffset.y,
  };

  // Orient flattened shape to best match screen orientation without distortion
  const byId = new Map(elements.map((el) => [el.id, el]));
  const vertices2D = idsToUse.map((id, idx) => {
    const el = byId.get(id);
    const sIdx = solidPts.indexOf(id);
    const fallbackName = sIdx >= 0 ? solidNames[sIdx] ?? "" : "";
    const name =
      typeof el?.props.name === "string" && el.props.name.trim()
        ? el.props.name
        : fallbackName;
    const centeredUV = { u: validUVs[idx].u - avgU, v: validUVs[idx].v - avgV };
    return {
      id,
      name,
      pos: placeFlattenedUV(anchor, centeredUV, 0, false),
    };
  });

  // Order boundary vertices angularly around centroid for clean polygon
  const cx = vertices2D.reduce((s, v) => s + v.pos.x, 0) / vertices2D.length;
  const cy = vertices2D.reduce((s, v) => s + v.pos.y, 0) / vertices2D.length;
  const ordered = [...vertices2D].sort(
    (u, v) => Math.atan2(u.pos.y - cy, u.pos.x - cx) - Math.atan2(v.pos.y - cy, v.pos.x - cx)
  );

  const polyId = `flat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const embedded: EmbeddedVertex[] = ordered.map((v, idx) => ({
    id: `${polyId}_v${idx}`,
    name: v.name || `${idx + 1}`,
    x: v.pos.x,
    y: v.pos.y,
  }));

  const polygonElement: CanvasElement = {
    id: polyId,
    type: "GeomPolygon",
    transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
    style: { stroke: "#0f766e", fill: "rgba(15, 118, 110, 0.08)", width: 2 },
    meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
    props: {
      vertices: embedded.map((v) => v.id),
      points: embedded,
    } satisfies GeomPolygonProps & Record<string, unknown>,
  };

  const segments: Array<[number, number]> = ordered.map((_, idx) => [idx, (idx + 1) % ordered.length]);
  return { anchor, vertices2D: ordered, segments, polygonElement };
}

export interface UnfoldedPolyhedronNetResult {
  solidId: string;
  polygons: CanvasElement[];
  tabLines?: Array<{ from: Point2D; to: Point2D }>;
}

/**
 * Computes a 2D printable net (trải phẳng đa diện) for a 3D solid (pyramid, prism, box, cube, frustum).
 * Unfolds all faces of the solid onto a shared 2D plane beside the solid with glue tabs/printable border.
 */
export function computeUnfoldedPolyhedronNet(
  solidId: string,
  scene: Solved3DScene,
  elements: CanvasElement[],
  targetOffset: Point2D = { x: 5.5, y: 0 }
): UnfoldedPolyhedronNetResult | null {
  const solidEl = elements.find((e) => e.id === solidId);
  if (!solidEl || solidEl.type !== "Solid3D") return null;
  const lift = scene.lifts.get(solidId);
  if (!lift || !lift.faces || lift.faces.length < 4) return null;

  const ptIds = Array.isArray(solidEl.props.points) ? (solidEl.props.points as string[]) : [];
  const vertexNames = Array.isArray(solidEl.props.vertexNames)
    ? (solidEl.props.vertexNames as string[])
    : [];

  const solidPts3D = lift.p3;
  if (!solidPts3D || solidPts3D.length < 4) return null;

  // Find 2D placement anchor beside the solid
  const pts2 = ptIds.map((id) => scene.pts.get(id)).filter((p): p is Point2D => Boolean(p));
  const maxX = pts2.length > 0 ? Math.max(...pts2.map((p) => p.x)) : (solidEl.transform?.x ?? 0);
  const avgY = pts2.length > 0 ? pts2.reduce((s, p) => s + p.y, 0) / pts2.length : (solidEl.transform?.y ?? 0);
  const origin: Point2D = { x: maxX + targetOffset.x, y: avgY + targetOffset.y };

  // Select base face: for pyramid face[0], for prism face[0], for box face[0]
  const baseFaceIdx = 0;
  const baseFace = lift.faces[baseFaceIdx];
  if (!baseFace || baseFace.length < 3) return null;

  const baseP3 = baseFace.map((idx) => solidPts3D[idx]);
  const pA = baseP3[0];
  const pB = baseP3[1];
  const pC = baseP3[2];
  if (!pA || !pB || !pC) return null;

  // Project base face into local 2D UV
  const baseUVs = baseP3.map((pt) => projectPointToPlaneBasis(pt, pA, pB, pC));
  if (baseUVs.some((uv) => uv === null)) return null;

  const validBaseUVs = baseUVs as Array<{ u: number; v: number }>;
  const avgU = validBaseUVs.reduce((s, uv) => s + uv.u, 0) / validBaseUVs.length;
  const avgV = validBaseUVs.reduce((s, uv) => s + uv.v, 0) / validBaseUVs.length;

  const basePoly2D: Point2D[] = validBaseUVs.map((uv) => ({
    x: origin.x + (uv.u - avgU),
    y: origin.y + (uv.v - avgV),
  }));

  const createdPolygons: CanvasElement[] = [];

  const makePolygonElement = (
    pts: Point2D[],
    labels: string[],
    color = "#2563eb",
    fill = "rgba(37, 99, 235, 0.08)"
  ): CanvasElement => {
    const polyId = `net_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const embedded: EmbeddedVertex[] = pts.map((pt, idx) => ({
      id: `${polyId}_v${idx}`,
      name: labels[idx] ?? "",
      x: pt.x,
      y: pt.y,
    }));
    return {
      id: polyId,
      type: "GeomPolygon",
      transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
      style: { stroke: color, fill, width: 2 },
      meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
      props: {
        vertices: embedded.map((v) => v.id),
        points: embedded,
      } satisfies GeomPolygonProps & Record<string, unknown>,
    };
  };

  const getLabel = (vIdx: number) => {
    const custom = vertexNames[vIdx];
    if (custom && custom.trim()) return custom;
    return `${vIdx + 1}`;
  };

  // 1. Add base face polygon
  createdPolygons.push(
    makePolygonElement(
      basePoly2D,
      baseFace.map((idx) => getLabel(idx)),
      "#1e40af",
      "rgba(30, 64, 175, 0.12)"
    )
  );

  // 2. Unfold adjacent lateral faces around each edge of the base face
  const nBaseEdges = baseFace.length;
  for (let e = 0; e < nBaseEdges; e++) {
    const i1 = baseFace[e];
    const i2 = baseFace[(e + 1) % nBaseEdges];
    const edgeP1 = basePoly2D[e];
    const edgeP2 = basePoly2D[(e + 1) % nBaseEdges];

    // Find lateral face that contains this edge [i1, i2]
    const adjFaceIdx = lift.faces.findIndex(
      (f, fIdx) => fIdx !== baseFaceIdx && f.includes(i1) && f.includes(i2)
    );
    if (adjFaceIdx < 0) continue;
    const adjFace = lift.faces[adjFaceIdx];

    // True 3D side edge lengths for rigid 2D unfolding
    const p1_3D = solidPts3D[i1];
    const p2_3D = solidPts3D[i2];
    const edgeLen2D = Math.hypot(edgeP2.x - edgeP1.x, edgeP2.y - edgeP1.y);

    // Vector along the edge on 2D plane: ex
    const ex = {
      x: (edgeP2.x - edgeP1.x) / (edgeLen2D || 1),
      y: (edgeP2.y - edgeP1.y) / (edgeLen2D || 1),
    };
    // Normal vector pointing outwards from base face center
    const centerBase = {
      x: basePoly2D.reduce((s, p) => s + p.x, 0) / basePoly2D.length,
      y: basePoly2D.reduce((s, p) => s + p.y, 0) / basePoly2D.length,
    };
    const midEdge = { x: (edgeP1.x + edgeP2.x) / 2, y: (edgeP1.y + edgeP2.y) / 2 };
    let ey = { x: -ex.y, y: ex.x };
    const dotOut = (midEdge.x - centerBase.x) * ey.x + (midEdge.y - centerBase.y) * ey.y;
    if (dotOut < 0) {
      ey = { x: -ey.x, y: -ey.y };
    }

    // For pyramid triangular lateral faces: apex + i1 + i2
    if (adjFace.length === 3) {
      const apexIdx = adjFace.find((idx) => idx !== i1 && idx !== i2);
      if (apexIdx === undefined) continue;
      const apexP3 = solidPts3D[apexIdx];
      const d1 = dist3(p1_3D, apexP3);
      const d2 = dist3(p2_3D, apexP3);

      // Solve 2D triangle given side lengths: edgeLen2D, d1, d2
      const uApex = (edgeLen2D * edgeLen2D + d1 * d1 - d2 * d2) / (2 * (edgeLen2D || 1));
      const vApex = Math.sqrt(Math.max(0, d1 * d1 - uApex * uApex));

      const apex2D: Point2D = {
        x: edgeP1.x + uApex * ex.x + vApex * ey.x,
        y: edgeP1.y + uApex * ex.y + vApex * ey.y,
      };

      createdPolygons.push(
        makePolygonElement(
          [edgeP1, edgeP2, apex2D],
          [getLabel(i1), getLabel(i2), getLabel(apexIdx)],
          "#0284c7",
          "rgba(2, 132, 199, 0.08)"
        )
      );
    } else if (adjFace.length === 4) {
      // Quad lateral face (box, prism, frustum): [i1, i2, j2, j1]
      // Find opposite vertices j1 (connected to i1) and j2 (connected to i2)
      const remaining = adjFace.filter((idx) => idx !== i1 && idx !== i2);
      if (remaining.length === 2) {
        const j1 = remaining[0];
        const j2 = remaining[1];
        const h1 = dist3(p1_3D, solidPts3D[j1]);
        const h2 = dist3(p2_3D, solidPts3D[j2]);
        const pJ1_2D: Point2D = {
          x: edgeP1.x + h1 * ey.x,
          y: edgeP1.y + h1 * ey.y,
        };
        const pJ2_2D: Point2D = {
          x: edgeP2.x + h2 * ey.x,
          y: edgeP2.y + h2 * ey.y,
        };

        createdPolygons.push(
          makePolygonElement(
            [edgeP1, edgeP2, pJ2_2D, pJ1_2D],
            [getLabel(i1), getLabel(i2), getLabel(j2), getLabel(j1)],
            "#059669",
            "rgba(5, 150, 105, 0.08)"
          )
        );

        // If this is face e === 0 for prism/box, attach top cap face to pJ1_2D, pJ2_2D
        if (e === 0 && lift.faces.length > 2) {
          const topFaceIdx = 1;
          const topFace = lift.faces[topFaceIdx];
          if (topFace && topFace.includes(j1) && topFace.includes(j2)) {
            const topP3 = topFace.map((idx) => solidPts3D[idx]);
            const topUVs = topP3.map((pt) =>
              projectPointToPlaneBasis(pt, solidPts3D[j1], solidPts3D[j2], topP3[2] ?? topP3[0])
            );
            if (!topUVs.some((uv) => uv === null)) {
              const validTopUVs = topUVs as Array<{ u: number; v: number }>;
              const topEx = {
                x: (pJ2_2D.x - pJ1_2D.x) / (Math.hypot(pJ2_2D.x - pJ1_2D.x, pJ2_2D.y - pJ1_2D.y) || 1),
                y: (pJ2_2D.y - pJ1_2D.y) / (Math.hypot(pJ2_2D.x - pJ1_2D.x, pJ2_2D.y - pJ1_2D.y) || 1),
              };
              const topEy = ey;
              const topPoly2D = validTopUVs.map((uv) => ({
                x: pJ1_2D.x + uv.u * topEx.x + uv.v * topEy.x,
                y: pJ1_2D.y + uv.u * topEx.y + uv.v * topEy.y,
              }));
              createdPolygons.push(
                makePolygonElement(
                  topPoly2D,
                  topFace.map((idx) => getLabel(idx)),
                  "#1e40af",
                  "rgba(30, 64, 175, 0.12)"
                )
              );
            }
          }
        }
      }
    }
  }

  return { solidId, polygons: createdPolygons };
}

export type SolidSubSelection =
  | {
      kind: "face";
      solidId: string;
      faceIdx: number;
      vertIndices: number[];
      vertIds: string[];
      faceKey: string;
      faceLabel: string;
    }
  | {
      kind: "edge";
      solidId: string;
      i: number;
      j: number;
      aId: string;
      bId: string;
      edgeKey: string;
      edgeLabel: string;
    };

function distPointToSeg2D(p: Point2D, a: Point2D, b: Point2D): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-12) return dist2D(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

function pointInPoly2D(poly: Point2D[], p: Point2D): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Hit-tests a Solid3D element at worldPos and returns the closest edge (preferred)
 * or front-most containing face so teachers can inspect and extract individual edges/faces.
 */
export function resolveSolidSubSelectionAtPoint(
  el: CanvasElement,
  worldPos: Point2D,
  scene: Solved3DScene,
  points2D: Map<string, Point2D>,
  byId: Map<string, CanvasElement>,
  edgeThresh: number
): SolidSubSelection | null {
  if (el.type !== "Solid3D") return null;
  const lift = scene.lifts.get(el.id);
  const ptIds = Array.isArray(el.props.points) ? (el.props.points as string[]) : [];
  if (!lift || ptIds.length === 0) return null;

  const vNames = Array.isArray(el.props.vertexNames) ? (el.props.vertexNames as string[]) : [];
  const getVName = (idx: number): string => {
    const id = ptIds[idx];
    const ptEl = id ? byId.get(id) : undefined;
    if (typeof ptEl?.props.name === "string" && ptEl.props.name.trim()) return ptEl.props.name.trim();
    if (typeof vNames[idx] === "string" && vNames[idx].trim()) return vNames[idx].trim();
    return `${idx + 1}`;
  };
  const getPt2 = (idx: number): Point2D | undefined => {
    const id = ptIds[idx];
    return id ? points2D.get(id) ?? scene.pts.get(id) : undefined;
  };

  // 1. Edge hit test (prefer closest edge within edgeThresh)
  let bestEdge: { i: number; j: number; dist: number } | null = null;
  for (const [i, j] of extractPolyhedronEdges(lift)) {
    const pA = getPt2(i);
    const pB = getPt2(j);
    if (!pA || !pB) continue;
    const d = distPointToSeg2D(worldPos, pA, pB);
    if (d <= edgeThresh && (!bestEdge || d < bestEdge.dist)) {
      bestEdge = { i, j, dist: d };
    }
  }
  if (bestEdge) {
    const { i, j } = bestEdge;
    const aId = ptIds[i];
    const bId = ptIds[j];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const edgeKey = `${lo}_${hi}`;
    const nA = getVName(lo);
    const nB = getVName(hi);
    return {
      kind: "edge",
      solidId: el.id,
      i: lo,
      j: hi,
      aId: i === lo ? aId : bId,
      bId: i === lo ? bId : aId,
      edgeKey,
      edgeLabel: `${nA}${nB}`,
    };
  }

  // 2. Face hit test (prefer visible front-most face)
  let bestFace: { faceIdx: number; face: number[]; visible: boolean; depth: number } | null = null;
  for (let fIdx = 0; fIdx < lift.faces.length; fIdx++) {
    const face = lift.faces[fIdx];
    const poly = face.map(getPt2).filter((p): p is Point2D => Boolean(p));
    if (poly.length < 3 || !pointInPoly2D(poly, worldPos)) continue;
    const visible = isFaceVisible(lift, face);
    const depth =
      face.reduce((acc, idx) => {
        const p3 = lift.p3[idx];
        return acc + (p3 ? dot3(p3, lift.view) : 0);
      }, 0) / face.length;
    if (
      !bestFace ||
      (visible && !bestFace.visible) ||
      (visible === bestFace.visible && depth > bestFace.depth)
    ) {
      bestFace = { faceIdx: fIdx, face, visible, depth };
    }
  }
  if (bestFace) {
    const { faceIdx, face } = bestFace;
    const vertIds = face.map((idx) => ptIds[idx]).filter(Boolean);
    const faceKey = face.map((idx) => ptIds[idx] ?? String(idx)).join("|");
    const faceLabel = face.map(getVName).join("");
    return {
      kind: "face",
      solidId: el.id,
      faceIdx,
      vertIndices: face,
      vertIds,
      faceKey,
      faceLabel,
    };
  }

  return null;
}

// --- 19 Spatial Constructions & Measurements ---

export function computePlaneIntersectionLine(
  plane1Ids: [string, string, string],
  plane2Ids: [string, string, string],
  scene: Solved3DScene
): { p1: Point3D; p2: Point3D; existingIds: [string | null, string | null] } | null {
  const n1 = plane1Ids.map((id) => scene.p3.get(id));
  const n2 = plane2Ids.map((id) => scene.p3.get(id));
  if (n1.some((p) => !p) || n2.some((p) => !p)) return null;
  const [a1, b1, c1] = n1 as [Point3D, Point3D, Point3D];
  const [a2, b2, c2] = n2 as [Point3D, Point3D, Point3D];

  const norm1 = cross3(sub3(b1, a1), sub3(c1, a1));
  const norm2 = cross3(sub3(b2, a2), sub3(c2, a2));
  const dir = cross3(norm1, norm2);
  const scaleRef = Math.max(...[...n1, ...n2].map((p) => dist3(p!, a1)), 1e-9);
  if (len3(norm1) < 1e-9 * scaleRef * scaleRef || len3(norm2) < 1e-9 * scaleRef * scaleRef) return null;
  if (len3(dir) < 1e-9 * len3(norm1) * len3(norm2)) return null;

  const onPlane1 = (pt: Point3D) => Math.abs(dot3(norm1, sub3(pt, a1))) / len3(norm1) <= 1e-6 * scaleRef;
  const onPlane2 = (pt: Point3D) => Math.abs(dot3(norm2, sub3(pt, a2))) / len3(norm2) <= 1e-6 * scaleRef;

  const candidates: Array<{ id: string | null; pos: Point3D }> = [];
  const pushUnique = (cand: { id: string | null; pos: Point3D }) => {
    if (!candidates.some((c) => dist3(c.pos, cand.pos) <= 1e-6 * scaleRef)) {
      candidates.push(cand);
    }
  };

  const ownerId = scene.owner.get(plane1Ids[0]);
  for (const [id, pt] of scene.p3.entries()) {
    if (scene.owner.get(id) === ownerId && onPlane1(pt) && onPlane2(pt)) {
      pushUnique({ id, pos: pt });
    }
  }

  const intersectTriEdges = (tri: [string, string, string], other: [Point3D, Point3D, Point3D]) => {
    const pairs: Array<[string, string]> = [
      [tri[0], tri[1]],
      [tri[1], tri[2]],
      [tri[0], tri[2]],
    ];
    for (const [uId, vId] of pairs) {
      const u = scene.p3.get(uId);
      const v = scene.p3.get(vId);
      if (!u || !v) continue;
      const w = Ops3D.linePlane(u, v, other[0], other[1], other[2]);
      if (w) {
        pushUnique({ id: null, pos: linComb3([u, v], w) });
      }
    }
  };

  if (candidates.length < 2) intersectTriEdges(plane1Ids, [a2, b2, c2]);
  if (candidates.length < 2) intersectTriEdges(plane2Ids, [a1, b1, c1]);
  if (candidates.length < 2) return null;

  let best: [number, number] = [0, 1];
  let bestDist = -1;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const d = dist3(candidates[i].pos, candidates[j].pos);
      if (d > bestDist) {
        bestDist = d;
        best = [i, j];
      }
    }
  }

  return {
    p1: candidates[best[0]].pos,
    p2: candidates[best[1]].pos,
    existingIds: [candidates[best[0]].id, candidates[best[1]].id],
  };
}

export function computePolyhedronSection(
  lift: SolidLift,
  cutPts: [Point3D, Point3D, Point3D]
): Point3D[] | null {
  const [pA, pB, pC] = cutPts;
  const normal = cross3(sub3(pB, pA), sub3(pC, pA));
  const nLen = len3(normal);
  const scaleRef = Math.max(...lift.p3.map((p) => dist3(p, pA)), 1e-9);
  if (nLen < 1e-9 * scaleRef * scaleRef) return null;

  const signedDist = (pt: Point3D) => dot3(sub3(pt, pA), normal) / nLen;
  const eps = 1e-6 * scaleRef;
  const intersections: Point3D[] = [];

  const addPt = (pt: Point3D) => {
    if (!intersections.some((q) => dist3(q, pt) <= eps)) {
      intersections.push(pt);
    }
  };

  for (const [ia, ib] of extractPolyhedronEdges(lift)) {
    const a = lift.p3[ia];
    const b = lift.p3[ib];
    const da = signedDist(a);
    const db = signedDist(b);
    if (Math.abs(da) <= eps && Math.abs(db) <= eps) {
      addPt(a);
      addPt(b);
    } else if (Math.abs(da) <= eps) {
      addPt(a);
    } else if (Math.abs(db) <= eps) {
      addPt(b);
    } else if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const t = da / (da - db);
      addPt(linComb3([a, b], [1 - t, t]));
    }
  }

  if (intersections.length < 3) return null;

  // Order polygon vertices around centroid in the cutting plane
  const center = linComb3(
    intersections,
    intersections.map(() => 1 / intersections.length)
  );
  const uAxis = norm3(sub3(intersections[0], center));
  const nUnit = scale3(normal, 1 / nLen);
  const vAxis = cross3(nUnit, uAxis);

  return [...intersections].sort((x, y) => {
    const rx = sub3(x, center);
    const ry = sub3(y, center);
    const ax = Math.atan2(dot3(rx, vAxis), dot3(rx, uAxis));
    const ay = Math.atan2(dot3(ry, vAxis), dot3(ry, uAxis));
    return ax - ay;
  });
}

export function computeRoundCrossSection(
  kind: Solid3DKind,
  lift: SolidLift,
  r: number,
  pA: Point3D,
  pB: Point3D,
  pC: Point3D,
  steps = 180
): Point3D[] | null {
  const ref = Math.max(r, lift.p3.length > 1 ? dist3(lift.p3[0], lift.p3[1]) : 0);
  const normal = cross3(sub3(pB, pA), sub3(pC, pA));
  if (len3(normal) < 1e-9 * ref * ref) return null;

  const ex = norm3(sub3(pB, pA));
  const ey = norm3(cross3(normal, ex));
  const center = linComb3([pA, pB, pC], [1 / 3, 1 / 3, 1 / 3]);
  const eps = 1e-9 * ref;
  const inside = (pt: Point3D) => signedDistRoundSolid(kind, lift, r, pt) <= eps;
  if (!inside(center)) return null;

  const rayPt = (dist: number, ang: number): Point3D => ({
    x: center.x + dist * (Math.cos(ang) * ex.x + Math.sin(ang) * ey.x),
    y: center.y + dist * (Math.cos(ang) * ex.y + Math.sin(ang) * ey.y),
    z: center.z + dist * (Math.cos(ang) * ex.z + Math.sin(ang) * ey.z),
  });
  const angleOf = (pt: Point3D) => Math.atan2(dot3(sub3(pt, center), ey), dot3(sub3(pt, center), ex));

  const angles = Array.from({ length: steps }, (_, i) => -Math.PI + (2 * Math.PI * i) / steps);
  for (const pt of [pA, pB, pC]) {
    if (dist3(pt, center) > eps) angles.push(angleOf(pt));
  }

  const capCenters = kind === "cone" ? [lift.p3[1]] : kind === "cylinder" ? [lift.p3[0], lift.p3[1]] : [];
  for (const c3 of capCenters) {
    const a = r * normal.x;
    const b = r * normal.z;
    const rhs = dot3(normal, sub3(c3, pA));
    const amp = Math.hypot(a, b);
    if (amp >= 1e-12 && Math.abs(rhs) <= amp) {
      for (const sgn of [1, -1]) {
        const theta = Math.atan2(b, a) + sgn * Math.acos(Math.max(-1, Math.min(1, -rhs / amp)));
        const rimPt = { x: c3.x + r * Math.cos(theta), y: c3.y, z: c3.z + r * Math.sin(theta) };
        if (dist3(rimPt, center) > eps) angles.push(angleOf(rimPt));
      }
    }
  }

  angles.sort((a, b) => a - b);
  const boundary: Point3D[] = [];
  for (const ang of angles) {
    let lo = 0;
    let hi = 4 * ref;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (lo + hi) / 2;
      if (inside(rayPt(mid, ang))) lo = mid;
      else hi = mid;
    }
    const pt = rayPt(lo, ang);
    if (boundary.length === 0 || dist3(pt, boundary[boundary.length - 1]) > eps) {
      boundary.push(pt);
    }
  }
  return boundary.length >= 3 ? boundary : null;
}

export function computeDistancePointToPlane(p: Point3D, a: Point3D, b: Point3D, c: Point3D): number | null {
  const n = cross3(sub3(b, a), sub3(c, a));
  const nLen = len3(n);
  if (nLen < 1e-12) return null;
  return Math.abs(dot3(sub3(p, a), n)) / nLen;
}

export function computeAngle3DDegrees(vertex: Point3D, armA: Point3D, armB: Point3D): number | null {
  const u = sub3(armA, vertex);
  const v = sub3(armB, vertex);
  const lu = len3(u);
  const lv = len3(v);
  if (lu < 1e-12 || lv < 1e-12) return null;
  const cos = Math.max(-1, Math.min(1, dot3(u, v) / (lu * lv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function computeLinePlaneAngleDegrees(
  a: Point3D,
  b: Point3D,
  p: Point3D,
  q: Point3D,
  r: Point3D
): number | null {
  const n = cross3(sub3(q, p), sub3(r, p));
  const u = sub3(b, a);
  const ln = len3(n);
  const lu = len3(u);
  if (ln < 1e-12 || lu < 1e-12) return null;
  const sin = Math.max(0, Math.min(1, Math.abs(dot3(u, n)) / (ln * lu)));
  return (Math.asin(sin) * 180) / Math.PI;
}

export function computeDihedralAngleDegrees(
  p1: [Point3D, Point3D, Point3D],
  p2: [Point3D, Point3D, Point3D]
): number | null {
  const n1 = cross3(sub3(p1[1], p1[0]), sub3(p1[2], p1[0]));
  const n2 = cross3(sub3(p2[1], p2[0]), sub3(p2[2], p2[0]));
  const l1 = len3(n1);
  const l2 = len3(n2);
  if (l1 < 1e-12 || l2 < 1e-12) return null;
  const cos = Math.max(0, Math.min(1, Math.abs(dot3(n1, n2)) / (l1 * l2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function createPlaneParallelogramElements(
  center: Point2D,
  existingElements: CanvasElement[],
  label = "(P)"
): CanvasElement[] {
  const baseId = `plane_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const mkPt = (id: string, dx: number, dy: number, constraint: PointConstraint): CanvasElement => ({
    id,
    type: "GeomPoint",
    transform: { x: center.x + dx, y: center.y + dy, scale: 1, rotation: 0, z: 0 },
    style: {},
    meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
    props: { name: "", constraint, handle: true },
  });

  const p0 = `${baseId}_0`;
  const p1 = `${baseId}_1`;
  const p2 = `${baseId}_2`;
  const pMid = `${baseId}_m`;
  const p3 = `${baseId}_3`;

  const pts = [
    mkPt(p0, -2.6, -0.9, { kind: "free" }),
    mkPt(p1, 1.6, -0.9, { kind: "free" }),
    mkPt(p2, 2.8, 0.9, { kind: "free" }),
    mkPt(pMid, 0.1, 0, { kind: "midpointOf", a: p0, b: p2 }),
    mkPt(p3, -1.4, 0.9, { kind: "reflectPoint", p: p1, center: pMid }),
  ];

  const existingLabels = new Set(
    existingElements
      .filter((e) => e.type === "GeomPolygon" && typeof e.props.label === "string")
      .map((e) => String(e.props.label))
  );
  const fallbackLabels = ["(P)", "(Q)", "(R)", "(α)", "(β)", "(γ)"];
  const chosenLabel = existingLabels.has(label)
    ? fallbackLabels.find((l) => !existingLabels.has(l)) ?? label
    : label;

  const poly: CanvasElement = {
    id: baseId,
    type: "GeomPolygon",
    transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
    style: { fill: "rgba(100,116,139,0.10)", stroke: "#64748b", width: 2 },
    meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
    props: { vertices: [p0, p1, p2, p3], label: chosenLabel },
  };

  return [...pts, poly];
}

export function buildSpatialConstructionElements(
  toolId: string,
  pickedIds: string[],
  elements: CanvasElement[],
  scene: Solved3DScene
): { elements: CanvasElement[]; error?: string } {
  const newId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const makePoint = (name: string, constraint: PointConstraint, pos?: Point2D): CanvasElement => ({
    id: newId("pt3d"),
    type: "GeomPoint",
    transform: { x: pos?.x ?? 0, y: pos?.y ?? 0, scale: 1, rotation: 0, z: 0 },
    style: { stroke: "#2563eb" },
    meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
    props: { name, constraint },
  });

  const makeSeg = (from: string, to: string, opts: { dashed?: boolean; measure?: boolean; stroke?: string } = {}): CanvasElement => ({
    id: newId("seg3d"),
    type: "GeomSegment",
    transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
    style: { stroke: opts.stroke ?? "#334155", width: 2, dash: opts.dashed },
    meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
    props: {
      from,
      to,
      ...(opts.dashed ? { dashed: true } : {}),
      ...(opts.measure ? { measure: true } : {}),
    },
  });

  switch (toolId) {
    case "c:midpoint": {
      if (pickedIds.length < 2) return { elements: [], error: "Chọn 2 điểm đầu mút." };
      const name = getNextPointName(elements, ["M", "N", "P", "Q"]);
      return { elements: [makePoint(name, { kind: "midpointOf", a: pickedIds[0], b: pickedIds[1] })] };
    }
    case "c:centroid": {
      if (pickedIds.length < 3) return { elements: [], error: "Chọn 3 đỉnh của tam giác." };
      const name = getNextPointName(elements, ["G", "G₁", "G₂"]);
      return { elements: [makePoint(name, { kind: "centroid", a: pickedIds[0], b: pickedIds[1], c: pickedIds[2] })] };
    }
    case "c:onedge": {
      if (pickedIds.length < 2) return { elements: [], error: "Chọn 2 điểm của cạnh." };
      const name = getNextPointName(elements, ["M", "N", "P", "Q", "E", "F"]);
      return { elements: [makePoint(name, { kind: "onLine", a: pickedIds[0], b: pickedIds[1], t: 1 / 3 })] };
    }
    case "c:lineplane": {
      if (pickedIds.length < 5) return { elements: [], error: "Chọn 2 điểm đường thẳng và 3 điểm mặt phẳng." };
      const [a, b, p, q, r] = pickedIds.map((id) => scene.p3.get(id));
      if (!a || !b || !p || !q || !r || !Ops3D.linePlane(a, b, p, q, r)) {
        return { elements: [], error: "Đường thẳng song song với mặt phẳng." };
      }
      const name = getNextPointName(elements, ["I", "K", "J", "E", "F"]);
      return {
        elements: [
          makePoint(name, { kind: "linePlane", a: pickedIds[0], b: pickedIds[1], p: pickedIds[2], q: pickedIds[3], r: pickedIds[4] }),
        ],
      };
    }
    case "c:giaotuyen": {
      if (pickedIds.length < 6) return { elements: [], error: "Chọn 3 điểm mỗi mặt phẳng." };
      const res = computePlaneIntersectionLine(
        [pickedIds[0], pickedIds[1], pickedIds[2]],
        [pickedIds[3], pickedIds[4], pickedIds[5]],
        scene
      );
      if (!res) return { elements: [], error: "Hai mặt phẳng song song hoặc trùng nhau." };
      const created: CanvasElement[] = [];
      const names = getNextPointNames(2, elements, ["I", "K", "J", "E", "F"]);
      const p1Id = res.existingIds[0] ?? (() => {
        const pt = makePoint(names[0], { kind: "free" }, { x: res.p1.x, y: res.p1.y });
        created.push(pt);
        return pt.id;
      })();
      const p2Id = res.existingIds[1] ?? (() => {
        const pt = makePoint(names[1], { kind: "free" }, { x: res.p2.x, y: res.p2.y });
        created.push(pt);
        return pt.id;
      })();
      created.push(makeSeg(p1Id, p2Id, { stroke: "#dc2626" }));
      return { elements: created };
    }
    case "c:footplane":
    case "c:distplane": {
      if (pickedIds.length < 4) return { elements: [], error: "Chọn điểm và 3 điểm của mặt phẳng." };
      const [p, a, b, c] = pickedIds;
      const name = getNextPointName(elements, ["H", "O", "K"]);
      const foot = makePoint(name, { kind: "footPlane", p, a, b, c });
      const seg = makeSeg(p, foot.id, { measure: toolId === "c:distplane" });
      return { elements: [foot, seg] };
    }
    case "c:commonperp": {
      if (pickedIds.length < 4) return { elements: [], error: "Chọn 2 đường thẳng (4 điểm)." };
      const [a, b, c, d] = pickedIds;
      const names = getNextPointNames(2, elements, ["H", "K"]);
      const ptH = makePoint(names[0], { kind: "commonPerp", a, b, c, d });
      const ptK = makePoint(names[1], { kind: "commonPerp", a: c, b: d, c: a, d: b });
      return { elements: [ptH, ptK, makeSeg(ptH.id, ptK.id, { measure: true })] };
    }
    case "c:circumsphere": {
      const solidId = pickedIds[0] ? scene.owner.get(pickedIds[0]) ?? pickedIds[0] : undefined;
      const solid = elements.find((e) => e.id === solidId && e.type === "Solid3D");
      if (!solid) return { elements: [], error: "Hãy chọn một đỉnh của khối đa diện." };
      const sPts = Array.isArray(solid.props.points) ? (solid.props.points as string[]) : [];
      const p3s = sPts.map((id) => scene.p3.get(id));
      if (p3s.some((p) => !p) || sPts.length < 4) return { elements: [], error: "Khối không đủ 4 đỉnh." };
      const valid = p3s as Point3D[];
      let best4: [string, string, string, string] | null = null;
      let bestVol = 0;
      for (let i = 1; i < valid.length; i++) {
        for (let j = i + 1; j < valid.length; j++) {
          const n = cross3(sub3(valid[i], valid[0]), sub3(valid[j], valid[0]));
          if (len3(n) < 1e-9) continue;
          for (let k = 1; k < valid.length; k++) {
            if (k === i || k === j) continue;
            const vol = Math.abs(dot3(n, sub3(valid[k], valid[0])));
            if (vol > bestVol) {
              bestVol = vol;
              best4 = [sPts[0], sPts[i], sPts[j], sPts[k]];
            }
          }
        }
      }
      if (!best4) return { elements: [], error: "Không tìm thấy 4 đỉnh không đồng phẳng." };
      const cName = getNextPointName(elements, ["I", "J", "T", "Ω"]);
      const centerPt = makePoint(cName, {
        kind: "sphereCenter",
        a: best4[0],
        b: best4[1],
        c: best4[2],
        d: best4[3],
      });
      const w = Ops3D.sphereCenter(
        scene.p3.get(best4[0])!,
        scene.p3.get(best4[1])!,
        scene.p3.get(best4[2])!,
        scene.p3.get(best4[3])!
      );
      const c3 = w ? linComb3(best4.map((id) => scene.p3.get(id)!), w) : scene.p3.get(best4[0])!;
      const r = dist3(c3, scene.p3.get(best4[0])!) || 1.5;
      const sphereEl: CanvasElement = {
        id: newId("sph"),
        type: "Solid3D",
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: "#0f766e", width: 1.5 },
        meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
        props: {
          kind: "sphere",
          points: [centerPt.id],
          r,
          through: best4[0],
        } satisfies Solid3DProps & Record<string, unknown>,
      };
      return { elements: [centerPt, sphereEl] };
    }
    case "c:measure": {
      if (pickedIds.length < 3) return { elements: [], error: "Chọn 3 điểm (đỉnh ở giữa hoặc đầu tiên)." };
      const angleEl: CanvasElement = {
        id: newId("ang"),
        type: "GeomAngle",
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: "#16a34a", width: 1.5 },
        meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
        props: {
          vertex: pickedIds[1],
          arms: [pickedIds[0], pickedIds[2]],
          bare: true,
          measure: true,
        },
      };
      return { elements: [angleEl] };
    }
    case "c:boxrule": {
      if (pickedIds.length < 4) return { elements: [], error: "Chọn gốc A và 3 đỉnh kề B, D, A'." };
      const [idA, idB, idD, idAp] = pickedIds;
      const pA3 = scene.p3.get(idA);
      const pB3 = scene.p3.get(idB);
      const pD3 = scene.p3.get(idD);
      const pAp3 = scene.p3.get(idAp);
      const pA2 = scene.pts.get(idA);
      const pB2 = scene.pts.get(idB);
      const pD2 = scene.pts.get(idD);
      const pAp2 = scene.pts.get(idAp);
      if (!pA3 || !pB3 || !pD3 || !pAp3 || !pA2 || !pB2 || !pD2 || !pAp2) {
        return { elements: [], error: "Hãy chọn 4 đỉnh thuộc cùng hình hộp / khối 3D." };
      }
      const target3: Point3D = {
        x: pB3.x + pD3.x + pAp3.x - 2 * pA3.x,
        y: pB3.y + pD3.y + pAp3.y - 2 * pA3.y,
        z: pB3.z + pD3.z + pAp3.z - 2 * pA3.z,
      };
      const target2: Point2D = {
        x: pB2.x + pD2.x + pAp2.x - 2 * pA2.x,
        y: pB2.y + pD2.y + pAp2.y - 2 * pA2.y,
      };
      const created: CanvasElement[] = [];
      let destId: string | undefined;
      for (const [candId, cand3] of scene.p3.entries()) {
        if (candId !== idA && dist3(cand3, target3) < 0.2) {
          destId = candId;
          break;
        }
      }
      if (!destId) {
        const cPt = makePoint(getNextPointName(elements, ["C'", "E", "F", "K"]), { kind: "free" }, target2);
        created.push(cPt);
        destId = cPt.id;
      }
      const makeVec = (from: string, to: string, stroke: string, width = 2.2): CanvasElement => ({
        id: newId("vec3d"),
        type: "GeomVector",
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke, width },
        meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
        props: { from, to },
      });
      created.push(
        makeVec(idA, idB, "#2563eb"),
        makeVec(idA, idD, "#2563eb"),
        makeVec(idA, idAp, "#2563eb"),
        makeVec(idA, destId, "#dc2626", 2.8)
      );
      return { elements: created };
    }
    case "c:anglelp": {
      if (pickedIds.length < 4) return { elements: [], error: "Chọn điểm S của đường thẳng rồi 3 đỉnh mặt phẳng (A, B, C)." };
      const [idP, idA, idB, idC] = pickedIds;
      const p3s = [idP, idA, idB, idC].map((id) => scene.p3.get(id));
      if (p3s.some((p) => !p)) {
        return { elements: [], error: "Hãy chọn các điểm thuộc hình không gian." };
      }
      const deg = computeLinePlaneAngleDegrees(p3s[0]!, p3s[1]!, p3s[1]!, p3s[2]!, p3s[3]!);
      if (deg === null) return { elements: [], error: "3 điểm mặt phẳng thẳng hàng." };
      const footName = getNextPointName(elements, ["H", "O", "K"]);
      const foot = makePoint(footName, { kind: "footPlane", p: idP, a: idA, b: idB, c: idC });
      const angleEl: CanvasElement = {
        id: newId("ang3d"),
        type: "GeomAngle",
        transform: { x: 0, y: 0, scale: 1, rotation: 0, z: 0 },
        style: { stroke: "#16a34a", width: 1.6 },
        meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
        props: {
          vertex: idA,
          arms: [idP, foot.id],
          bare: true,
          measure: true,
        },
      };
      return {
        elements: [
          foot,
          makeSeg(idP, foot.id, { dashed: true, stroke: "#dc2626" }),
          makeSeg(idA, foot.id, { dashed: true, stroke: "#16a34a" }),
          angleEl,
        ],
      };
    }
    case "c:angleplanes": {
      if (pickedIds.length < 6) return { elements: [], error: "Chọn 3 đỉnh mặt phẳng 1 rồi 3 đỉnh mặt phẳng 2." };
      const p3s = pickedIds.slice(0, 6).map((id) => scene.p3.get(id));
      if (p3s.some((p) => !p)) return { elements: [], error: "Hãy chọn các điểm thuộc hình không gian." };
      const deg = computeDihedralAngleDegrees(
        [p3s[0]!, p3s[1]!, p3s[2]!],
        [p3s[3]!, p3s[4]!, p3s[5]!]
      );
      if (deg === null) return { elements: [], error: "Các điểm trong một mặt phẳng bị thẳng hàng." };
      const created: CanvasElement[] = [];
      const inter = computePlaneIntersectionLine(
        [pickedIds[0], pickedIds[1], pickedIds[2]],
        [pickedIds[3], pickedIds[4], pickedIds[5]],
        scene
      );
      if (inter) {
        const names = getNextPointNames(2, elements, ["I", "K", "M", "N"]);
        const p1Id = inter.existingIds[0] ?? (() => {
          const pt = makePoint(names[0], { kind: "free" }, inter.p1);
          created.push(pt);
          return pt.id;
        })();
        const p2Id = inter.existingIds[1] ?? (() => {
          const pt = makePoint(names[1], { kind: "free" }, inter.p2);
          created.push(pt);
          return pt.id;
        })();
        created.push(makeSeg(p1Id, p2Id, { stroke: "#dc2626" }));
      }
      const anchor = scene.pts.get(pickedIds[0]) ?? { x: 0, y: 0 };
      created.push({
        id: newId("angtxt"),
        type: "MathText",
        transform: { x: anchor.x + 0.6, y: anchor.y + 0.5, scale: 1, rotation: 0, z: 1 },
        style: { stroke: "#0f766e" },
        meta: { createdBy: "local", createdAtSeq: 0, page: 1 },
        props: { latex: `\\varphi \\approx ${deg.toFixed(1)}^{\\circ}` },
      });
      return { elements: created };
    }
    default:
      return { elements: [] };
  }
}

// --- Orthographic Projections (OrthoViews) ---

export interface OrthoViewData {
  key: "front" | "side" | "top";
  title: string;
  lines: { solid: Array<[Point2D, Point2D]>; dashed: Array<[Point2D, Point2D]> };
  circles: Array<{ c: Point2D; r: number }>;
  box: { minX: number; maxX: number; minY: number; maxY: number };
}

const ORTHO_TITLES: Record<"front" | "side" | "top", string> = {
  front: "Hình chiếu đứng",
  side: "Hình chiếu cạnh",
  top: "Hình chiếu bằng",
};

function projectOrtho(viewKey: "front" | "side" | "top", p: Point3D): Point2D {
  if (viewKey === "front") return { x: p.x, y: p.y };
  if (viewKey === "side") return { x: -p.z, y: p.y };
  return { x: p.x, y: -p.z };
}

export function computeOrthoViews(
  kind: Solid3DKind,
  lift: SolidLift,
  r = 1.3,
  gap = 1.2
): { views: OrthoViewData[]; width: number; height: number } | null {
  type RawView = { lines: { solid: Array<[Point2D, Point2D]>; dashed: Array<[Point2D, Point2D]> }; circles: Array<{ c: Point2D; r: number }> };
  const makeEmpty = (): RawView => ({ lines: { solid: [], dashed: [] }, circles: [] });
  const raw: Record<"front" | "side" | "top", RawView> = {
    front: makeEmpty(),
    side: makeEmpty(),
    top: makeEmpty(),
  };

  if (kind === "sphere" && lift.p3[0]) {
    for (const k of ["front", "side", "top"] as const) {
      raw[k].circles.push({ c: projectOrtho(k, lift.p3[0]), r });
    }
  } else if ((kind === "cone" || kind === "cylinder") && lift.p3.length >= 2) {
    const [pTop, pBot] = lift.p3;
    for (const k of ["front", "side"] as const) {
      const cB = projectOrtho(k, pBot);
      const b0: Point2D = { x: cB.x - r, y: cB.y };
      const b1: Point2D = { x: cB.x + r, y: cB.y };
      if (kind === "cone") {
        const apex = projectOrtho(k, pTop);
        raw[k].lines.solid.push([b0, b1], [apex, b0], [apex, b1]);
      } else {
        const cT = projectOrtho(k, pTop);
        const t0: Point2D = { x: cT.x - r, y: cT.y };
        const t1: Point2D = { x: cT.x + r, y: cT.y };
        raw[k].lines.solid.push([t0, t1], [b0, b1], [t0, b0], [t1, b1]);
      }
    }
    raw.top.circles.push({ c: projectOrtho("top", pBot), r });
    if (kind === "cylinder" && Math.hypot(pTop.x - pBot.x, pTop.z - pBot.z) > 1e-6 * r) {
      raw.top.circles.push({ c: projectOrtho("top", pTop), r });
    }
  } else if (lift.p3.length >= 4 && lift.faces.length > 0) {
    const edges = extractPolyhedronEdges(lift);
    const orthoViewDirs: Record<"front" | "side" | "top", Point3D> = {
      front: { x: 0, y: 0, z: -1 },
      side: { x: 1, y: 0, z: 0 },
      top: { x: 0, y: 1, z: 0 },
    };
    for (const k of ["front", "side", "top"] as const) {
      const dirLift: SolidLift = { p3: lift.p3, faces: lift.faces, view: orthoViewDirs[k] };
      for (const [a, b] of edges) {
        const seg: [Point2D, Point2D] = [projectOrtho(k, lift.p3[a]), projectOrtho(k, lift.p3[b])];
        if (dist2D(seg[0], seg[1]) < 1e-6) continue;
        if (isEdgeHidden(dirLift, lift.p3[a], lift.p3[b])) {
          raw[k].lines.dashed.push(seg);
        } else {
          raw[k].lines.solid.push(seg);
        }
      }
    }
  } else {
    return null;
  }

  const measureView = (v: RawView) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const seg of [...v.lines.solid, ...v.lines.dashed]) {
      xs.push(seg[0].x, seg[1].x);
      ys.push(seg[0].y, seg[1].y);
    }
    for (const c of v.circles) {
      xs.push(c.c.x - c.r, c.c.x + c.r);
      ys.push(c.c.y - c.r, c.c.y + c.r);
    }
    if (xs.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  };

  const bFront = measureView(raw.front);
  const bSide = measureView(raw.side);
  const bTop = measureView(raw.top);

  const offsets: Record<"front" | "side" | "top", Point2D> = {
    front: { x: 0, y: 0 },
    side: { x: bFront.maxX + gap - bSide.minX, y: 0 },
    top: { x: 0, y: bFront.minY - gap - bTop.maxY },
  };

  const totalBox = {
    minX: bFront.minX,
    maxX: bFront.maxX + gap + (bSide.maxX - bSide.minX),
    minY: bFront.minY - gap - (bTop.maxY - bTop.minY),
    maxY: bFront.maxY,
  };
  const cx = (totalBox.minX + totalBox.maxX) / 2;
  const cy = (totalBox.minY + totalBox.maxY) / 2;

  const views: OrthoViewData[] = (["front", "side", "top"] as const).map((k) => {
    const shift = { x: offsets[k].x - cx, y: offsets[k].y - cy };
    const movePt = (pt: Point2D): Point2D => ({ x: pt.x + shift.x, y: pt.y + shift.y });
    const box = measureView(raw[k]);
    return {
      key: k,
      title: ORTHO_TITLES[k],
      lines: {
        solid: raw[k].lines.solid.map(([p, q]) => [movePt(p), movePt(q)]),
        dashed: raw[k].lines.dashed.map(([p, q]) => [movePt(p), movePt(q)]),
      },
      circles: raw[k].circles.map((c) => ({ c: movePt(c.c), r: c.r })),
      box: {
        minX: box.minX + shift.x,
        maxX: box.maxX + shift.x,
        minY: box.minY + shift.y,
        maxY: box.maxY + shift.y,
      },
    };
  });

  return {
    views,
    width: totalBox.maxX - totalBox.minX,
    height: totalBox.maxY - totalBox.minY,
  };
}

// --- SpaceFigure Geometry (Plane / Line / Sphere inside Axes3D) ---

export interface SpaceFigureRenderGeometry {
  kind: "plane" | "line" | "sphere";
  polygon?: Point2D[];
  line?: [Point2D, Point2D];
  outline?: Point2D[];
  equatorFront?: Point2D[];
  equatorBack?: Point2D[];
  labelPos?: Point2D;
}

export function computeSpaceFigureGeometry(
  axesTransform: { x: number; y: number; scale?: number },
  axesProps: Axes3DProps,
  def: SpaceFigureDef
): SpaceFigureRenderGeometry | null {
  const bounds = resolveOxyzBounds(axesProps);
  const proj = (pt: Point3D) => projectOxyzPoint(axesTransform, pt);

  if (def.kind === "plane") {
    const { a, b, c, d } = def;
    if (Math.abs(a) < 1e-12 && Math.abs(b) < 1e-12 && Math.abs(c) < 1e-12) return null;
    const xR: [number, number] = [-bounds.x.neg, bounds.x.pos];
    const yR: [number, number] = [-bounds.y.neg, bounds.y.pos];
    const zR: [number, number] = [-bounds.z.neg, bounds.z.pos];

    const pts3: Point3D[] = [];
    // Intersect plane with bounding box edges
    const edges: Array<[Point3D, Point3D]> = [
      [{ x: xR[0], y: yR[0], z: zR[0] }, { x: xR[1], y: yR[0], z: zR[0] }],
      [{ x: xR[0], y: yR[1], z: zR[0] }, { x: xR[1], y: yR[1], z: zR[0] }],
      [{ x: xR[0], y: yR[0], z: zR[1] }, { x: xR[1], y: yR[0], z: zR[1] }],
      [{ x: xR[0], y: yR[1], z: zR[1] }, { x: xR[1], y: yR[1], z: zR[1] }],
      [{ x: xR[0], y: yR[0], z: zR[0] }, { x: xR[0], y: yR[1], z: zR[0] }],
      [{ x: xR[1], y: yR[0], z: zR[0] }, { x: xR[1], y: yR[1], z: zR[0] }],
      [{ x: xR[0], y: yR[0], z: zR[1] }, { x: xR[0], y: yR[1], z: zR[1] }],
      [{ x: xR[1], y: yR[0], z: zR[1] }, { x: xR[1], y: yR[1], z: zR[1] }],
      [{ x: xR[0], y: yR[0], z: zR[0] }, { x: xR[0], y: yR[0], z: zR[1] }],
      [{ x: xR[1], y: yR[0], z: zR[0] }, { x: xR[1], y: yR[0], z: zR[1] }],
      [{ x: xR[0], y: yR[1], z: zR[0] }, { x: xR[0], y: yR[1], z: zR[1] }],
      [{ x: xR[1], y: yR[1], z: zR[0] }, { x: xR[1], y: yR[1], z: zR[1] }],
    ];
    const evalPlane = (p: Point3D) => a * p.x + b * p.y + c * p.z + d;
    for (const [p0, p1] of edges) {
      const f0 = evalPlane(p0);
      const f1 = evalPlane(p1);
      if (Math.abs(f0 - f1) < 1e-12) continue;
      const t = -f0 / (f1 - f0);
      if (t >= -1e-6 && t <= 1 + 1e-6) {
        const ct = Math.max(0, Math.min(1, t));
        const hit = linComb3([p0, p1], [1 - ct, ct]);
        if (!pts3.some((q) => dist3(q, hit) < 1e-4)) pts3.push(hit);
      }
    }
    if (pts3.length < 3) return null;
    const ctr = linComb3(pts3, pts3.map(() => 1 / pts3.length));
    const nVec = norm3({ x: a, y: b, z: c });
    const uAxis = norm3(sub3(pts3[0], ctr));
    const vAxis = cross3(nVec, uAxis);
    const ordered = [...pts3].sort((u, v) => {
      const du = sub3(u, ctr);
      const dv = sub3(v, ctr);
      return Math.atan2(dot3(du, vAxis), dot3(du, uAxis)) - Math.atan2(dot3(dv, vAxis), dot3(dv, uAxis));
    });
    const polygon = ordered.map(proj);
    return { kind: "plane", polygon, labelPos: polygon[0] };
  }

  if (def.kind === "line") {
    const p: Point3D = { x: def.p[0], y: def.p[1], z: def.p[2] };
    const u: Point3D = { x: def.u[0], y: def.u[1], z: def.u[2] };
    const uLen = len3(u);
    if (uLen < 1e-12) return null;
    const span = Math.max(bounds.x.pos, bounds.y.pos, bounds.z.pos) / uLen;
    const p0 = proj(sub3(p, scale3(u, span)));
    const p1 = proj(add3(p, scale3(u, span)));
    return { kind: "line", line: [p0, p1], labelPos: p1 };
  }

  // sphere
  const c3: Point3D = { x: def.c[0], y: def.c[1], z: def.c[2] };
  const c2 = proj(c3);
  const sc = axesTransform.scale || 1;
  const r2 = def.r * sc;
  const steps = 64;
  const outline: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    outline.push({ x: c2.x + r2 * Math.cos(theta), y: c2.y + r2 * Math.sin(theta) });
  }
  const eq = splitEllipseFrontBack(c2.x, c2.y, r2, r2 * 0.3);
  return {
    kind: "sphere",
    outline,
    equatorFront: eq.front,
    equatorBack: eq.back,
    labelPos: { x: c2.x + r2 * 0.75, y: c2.y + r2 * 0.75 },
  };
}

// --- Revolution Solid Geometry (Quay quanh trục) ---

export interface RevolutionRenderGeometry {
  profile: Point2D[];
  ellipses: Array<{ cx: number; cy: number; rx: number; ry: number }>;
  generatrices: Array<[Point2D, Point2D]>;
  infoText?: string;
}

export function computeRevolutionGeometry(
  sourceEl: CanvasElement,
  axisA: Point2D,
  axisB: Point2D,
  points: Map<string, Point2D>,
  angleDeg = 360
): RevolutionRenderGeometry | null {
  const dir = unitDir2D(axisA, axisB);
  const perp = { x: -dir.y, y: dir.x };
  const frac = Math.max(0.05, Math.min(1, angleDeg / 360));

  if (sourceEl.type === "GeomCircle") {
    const center = points.get(String(sourceEl.props.center ?? ""));
    const r = center
      ? resolveCircleRadius(sourceEl.props.radius as CircleRadiusSpec | undefined, center, (id) => points.get(id))
      : null;
    if (!center || !r) return null;
    const steps = 64;
    const profile: Point2D[] = [];
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      profile.push({ x: center.x + r * Math.cos(th), y: center.y + r * Math.sin(th) });
    }
    return {
      profile,
      ellipses: [{ cx: center.x, cy: center.y, rx: r, ry: r * 0.3 * frac }],
      generatrices: [],
      infoText: `R = ${r.toFixed(2)}`,
    };
  }

  if (sourceEl.type === "GeomPolygon") {
    const verts: Point2D[] = [];
    if (Array.isArray(sourceEl.props.points)) {
      for (const v of sourceEl.props.points as EmbeddedVertex[]) {
        verts.push({ x: v.x + sourceEl.transform.x, y: v.y + sourceEl.transform.y });
      }
    } else if (Array.isArray(sourceEl.props.vertices)) {
      for (const id of sourceEl.props.vertices as string[]) {
        const p = points.get(id);
        if (p) verts.push(p);
      }
    }
    if (verts.length < 3) return null;

    // Reflect vertices across axis to build silhouette
    let maxR = 0;
    const ellipses: Array<{ cx: number; cy: number; rx: number; ry: number }> = [];
    const generatrices: Array<[Point2D, Point2D]> = [];

    const projOnAxis = (p: Point2D): Point2D => {
      const rel = { x: p.x - axisA.x, y: p.y - axisA.y };
      const t = rel.x * dir.x + rel.y * dir.y;
      return { x: axisA.x + t * dir.x, y: axisA.y + t * dir.y };
    };

    const reflVerts = verts.map((v) => {
      const p = projOnAxis(v);
      const rad = dist2D(v, p);
      if (rad > maxR) maxR = rad;
      if (rad > 1e-4) {
        ellipses.push({ cx: p.x, cy: p.y, rx: rad, ry: rad * 0.3 * frac });
      }
      return { x: 2 * p.x - v.x, y: 2 * p.y - v.y };
    });

    for (let i = 0; i < verts.length; i++) {
      const next = (i + 1) % verts.length;
      if (dist2D(verts[i], reflVerts[i]) > 1e-4 && dist2D(verts[next], reflVerts[next]) > 1e-4) {
        generatrices.push([reflVerts[i], reflVerts[next]]);
      }
    }
    void perp;
    return {
      profile: verts,
      ellipses,
      generatrices,
      infoText: `r = ${maxR.toFixed(2)}`,
    };
  }

  return null;
}
