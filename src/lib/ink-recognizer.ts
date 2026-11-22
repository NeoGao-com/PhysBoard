/**
 * Hybrid Sketch Recognition Engine combining ShortStraw corner finding
 * (Wolin, Eoff & Hammond) and PaleoSketch primitive fitting & beautification
 * (Paulson & Hammond) with Samsung Notes / GoodNotes style auto-regularization.
 */

import { Point2D, dist2D } from "./geometry";

export type RecognizedShape =
  | {
      type: "segment";
      start: Point2D;
      end: Point2D;
    }
  | {
      type: "arrow";
      start: Point2D;
      end: Point2D;
    }
  | {
      type: "circle";
      center: Point2D;
      radius: number;
    }
  | {
      type: "ellipse";
      center: Point2D;
      rx: number;
      ry: number;
      rotation: number;
    }
  | {
      type: "triangle";
      vertices: [Point2D, Point2D, Point2D];
    }
  | {
      type: "rectangle";
      vertices: [Point2D, Point2D, Point2D, Point2D];
    };

function totalPathLength(pts: Point2D[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += dist2D(pts[i - 1], pts[i]);
  }
  return len;
}

function resamplePoints(pts: Point2D[], n = 64): Point2D[] {
  if (pts.length <= 1) return pts;
  const total = totalPathLength(pts);
  if (total <= 1e-6) return [pts[0]];

  const interval = total / (n - 1);
  const result: Point2D[] = [pts[0]];
  let currentDist = 0;
  let segIndex = 0;
  let p1 = pts[0];
  let p2 = pts[1];
  let segLen = dist2D(p1, p2);

  for (let i = 1; i < n - 1; i++) {
    const targetDist = i * interval;
    while (segIndex < pts.length - 2 && currentDist + segLen < targetDist) {
      currentDist += segLen;
      segIndex++;
      p1 = pts[segIndex];
      p2 = pts[segIndex + 1];
      segLen = dist2D(p1, p2);
    }
    const remain = targetDist - currentDist;
    const t = segLen > 1e-6 ? Math.min(1, Math.max(0, remain / segLen)) : 0;
    result.push({
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    });
  }
  result.push(pts[pts.length - 1]);
  return result;
}

/**
 * Removes tiny pen-down / pen-up hook artifacts (<4% arc length with >75 deg direction reversal).
 */
function trimStrokeHooks(pts: Point2D[]): Point2D[] {
  if (pts.length < 10) return pts;
  const total = totalPathLength(pts);
  if (total <= 1e-4) return pts;

  let startIdx = 0;
  const maxTrimLen = total * 0.045;
  let accStart = 0;
  for (let i = 1; i < Math.min(pts.length - 6, 4); i++) {
    accStart += dist2D(pts[i - 1], pts[i]);
    if (accStart > maxTrimLen) break;
    const v1 = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
    const v2 = { x: pts[i + 2].x - pts[i].x, y: pts[i + 2].y - pts[i].y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    if (l1 > 1e-5 && l2 > 1e-5) {
      const cosA = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
      if (cosA < 0.25) {
        startIdx = i;
      }
    }
  }

  let endIdx = pts.length - 1;
  let accEnd = 0;
  for (let i = pts.length - 2; i > Math.max(startIdx + 5, pts.length - 5); i--) {
    accEnd += dist2D(pts[i], pts[i + 1]);
    if (accEnd > maxTrimLen) break;
    const v1 = { x: pts[i].x - pts[i - 2].x, y: pts[i].y - pts[i - 2].y };
    const v2 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    if (l1 > 1e-5 && l2 > 1e-5) {
      const cosA = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
      if (cosA < 0.25) {
        endIdx = i;
      }
    }
  }

  return pts.slice(startIdx, endIdx + 1);
}

/**
 * For closed/over-traced loops, trims the trailing overshoot after passing 360° or closest revisit to start.
 */
function normalizeClosedLoop(pts: Point2D[], diag: number): Point2D[] {
  if (pts.length < 12) return pts;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  let accumAngle = 0;
  const twoPiCutoff = 2 * Math.PI * 1.05;
  for (let i = 1; i < pts.length; i++) {
    const a1 = Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx);
    const a2 = Math.atan2(pts[i].y - cy, pts[i].x - cx);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    accumAngle += diff;
    if (i > Math.floor(pts.length * 0.72) && Math.abs(accumAngle) >= twoPiCutoff) {
      return pts.slice(0, i + 1);
    }
  }

  // If tail ends past 80% of points and revisited near pts[0] earlier, trim extra overshoot
  const startSearch = Math.floor(pts.length * 0.75);
  let minD = Infinity;
  let minIdx = pts.length - 1;
  for (let i = startSearch; i < pts.length; i++) {
    const d = dist2D(pts[0], pts[i]);
    if (d < minD) {
      minD = d;
      minIdx = i;
    }
  }
  if (minIdx < pts.length - 3 && minD < diag * 0.14) {
    return pts.slice(0, minIdx + 1);
  }
  return pts;
}

function maxPerpDistanceToSegment(
  pts: Point2D[],
  a: Point2D,
  b: Point2D
): { maxDist: number; meanDist: number } {
  if (pts.length === 0) return { maxDist: 0, meanDist: 0 };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    let maxD = 0;
    let sumD = 0;
    for (const p of pts) {
      const d = dist2D(p, a);
      if (d > maxD) maxD = d;
      sumD += d;
    }
    return { maxDist: maxD, meanDist: sumD / pts.length };
  }

  let maxDist = 0;
  let sumAbs = 0;
  for (const p of pts) {
    const cross = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx);
    const d = cross / len;
    if (d > maxDist) maxDist = d;
    sumAbs += d;
  }

  return { maxDist, meanDist: sumAbs / pts.length };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function isSegmentStraight(pts: Point2D[]): boolean {
  if (pts.length <= 2) return true;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const chord = dist2D(a, b);
  if (chord < 1e-5) return false;
  const arc = totalPathLength(pts);
  if (chord / arc < 0.93) return false;
  const { maxDist } = maxPerpDistanceToSegment(pts, a, b);
  return maxDist / chord <= 0.072;
}

/**
 * ShortStraw corner finder adapted for closed loops (handles strokes starting anywhere on the perimeter).
 */
function findShortStrawClosedCorners(rawClosed: Point2D[], diag: number): Point2D[] {
  const nUniform = Math.min(84, Math.max(32, Math.round(totalPathLength(rawClosed) / Math.max(0.05, diag / 40))));
  let ring = resamplePoints(rawClosed, nUniform);
  // Drop duplicate end point if very close to start
  if (ring.length > 8 && dist2D(ring[0], ring[ring.length - 1]) < diag * 0.06) {
    ring = ring.slice(0, -1);
  }
  const n = ring.length;
  if (n < 12) return [];

  const W = 3;
  const straws = new Array<number>(n);
  let minStraw = Infinity;
  let minIdx = 0;
  for (let i = 0; i < n; i++) {
    const pPrev = ring[(i - W + n) % n];
    const pNext = ring[(i + W) % n];
    const s = dist2D(pPrev, pNext);
    straws[i] = s;
    if (s < minStraw) {
      minStraw = s;
      minIdx = i;
    }
  }

  // Rotate ring so index 0 is the sharpest corner candidate
  if (minIdx > 0) {
    ring = ring.slice(minIdx).concat(ring.slice(0, minIdx));
    const rotatedStraws = straws.slice(minIdx).concat(straws.slice(0, minIdx));
    for (let i = 0; i < n; i++) straws[i] = rotatedStraws[i];
  }

  const threshold = median(straws) * 0.95;
  const cornerIndices: number[] = [0];

  let i = 1;
  while (i < n) {
    if (straws[i] < threshold) {
      let localMin = straws[i];
      let localMinIdx = i;
      while (i < n && straws[i] < threshold) {
        if (straws[i] < localMin) {
          localMin = straws[i];
          localMinIdx = i;
        }
        i++;
      }
      if (localMinIdx > 2 && n - localMinIdx > 2) {
        cornerIndices.push(localMinIdx);
      }
    } else {
      i++;
    }
  }

  // Post-process corners (ShortStraw halfway split if non-straight edge + remove collinear corners)
  let changed = true;
  let pass = 0;
  while (changed && pass < 4) {
    changed = false;
    pass++;
    for (let c = 0; c < cornerIndices.length; c++) {
      const idx1 = cornerIndices[c];
      const idx2 = cornerIndices[(c + 1) % cornerIndices.length];
      const slice =
        idx2 > idx1
          ? ring.slice(idx1, idx2 + 1)
          : ring.slice(idx1).concat(ring.slice(0, idx2 + 1));

      if (slice.length > 6 && !isSegmentStraight(slice)) {
        // Find point with smallest straw or largest perp distance inside [idx1..idx2]
        let bestOffset = -1;
        let maxDev = 0;
        const a = slice[0];
        const b = slice[slice.length - 1];
        const chord = dist2D(a, b);
        for (let k = 2; k < slice.length - 2; k++) {
          const { maxDist } = maxPerpDistanceToSegment([slice[k]], a, b);
          if (maxDist > maxDev) {
            maxDev = maxDist;
            bestOffset = k;
          }
        }
        if (bestOffset > 2 && maxDev > Math.max(diag * 0.05, chord * 0.08)) {
          const newIdx = (idx1 + bestOffset) % n;
          if (!cornerIndices.includes(newIdx) && cornerIndices.length < 10) {
            cornerIndices.splice(c + 1, 0, newIdx);
            changed = true;
            break;
          }
        }
      }
    }
  }

  // Filter out collinear / shallow-bend corners (> 150 deg)
  let filtered = cornerIndices.slice();
  let removed = true;
  while (removed && filtered.length > 3) {
    removed = false;
    for (let c = 0; c < filtered.length; c++) {
      const prev = ring[filtered[(c - 1 + filtered.length) % filtered.length]];
      const curr = ring[filtered[c]];
      const next = ring[filtered[(c + 1) % filtered.length]];
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const l1 = Math.hypot(v1.x, v1.y);
      const l2 = Math.hypot(v2.x, v2.y);
      if (l1 < diag * 0.07 || l2 < diag * 0.07) {
        filtered.splice(c, 1);
        removed = true;
        break;
      }
      const dot = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (l1 * l2)));
      const deg = (Math.acos(dot) * 180) / Math.PI;
      if (deg > 148) {
        filtered.splice(c, 1);
        removed = true;
        break;
      }
    }
  }

  // Verify every final edge in ring is actually straight
  if (filtered.length >= 3 && filtered.length <= 5) {
    // Handle case where user drew square starting from 4th corner returning cleanly or slight extra vertex
    if (filtered.length === 5) {
      let minEdgeLen = Infinity;
      let minC = -1;
      for (let c = 0; c < filtered.length; c++) {
        const d = dist2D(ring[filtered[c]], ring[filtered[(c + 1) % filtered.length]]);
        if (d < minEdgeLen) {
          minEdgeLen = d;
          minC = c;
        }
      }
      if (minEdgeLen < diag * 0.16 && minC !== -1) {
        filtered.splice(minC, 1);
      }
    }
  }

  return filtered.map((idx) => ring[idx]);
}

function verifyPolygonEdgesStraight(pts: Point2D[], corners: Point2D[]): boolean {
  if (corners.length < 3) return false;
  for (let i = 0; i < corners.length; i++) {
    const prev = corners[(i - 1 + corners.length) % corners.length];
    const curr = corners[i];
    const next = corners[(i + 1) % corners.length];
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    if (len1 < 0.12 || len2 < 0.12) return false;
    const dot = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (len1 * len2)));
    const angleDeg = (Math.acos(dot) * 180) / Math.PI;
    if (angleDeg < 22 || angleDeg > 146) {
      return false;
    }
  }

  // Check distance of every sample point in pts to the nearest polygon edge
  let maxDistToPoly = 0;
  let diag = 0;
  for (const c of corners) {
    diag = Math.max(diag, dist2D(c, corners[0]));
  }
  for (const p of pts) {
    let minD = Infinity;
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 1e-8 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
      const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      if (d < minD) minD = d;
    }
    if (minD > maxDistToPoly) maxDistToPoly = minD;
  }

  return maxDistToPoly <= Math.max(0.18, diag * 0.085);
}

/**
 * Beautifies a 4-vertex quadrilateral into an orthogonal rectangle (or square if aspect ~1:1),
 * aligned to the horizontal/vertical axes if drawn within ±14° of level.
 */
function regularizeRectangle(verts: [Point2D, Point2D, Point2D, Point2D]): [Point2D, Point2D, Point2D, Point2D] {
  const angles: number[] = [];
  for (let i = 0; i < 4; i++) {
    const prev = verts[(i + 3) % 4];
    const curr = verts[i];
    const next = verts[(i + 1) % 4];
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const dot = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))));
    angles.push((Math.acos(dot) * 180) / Math.PI);
  }

  const isRoughRect = angles.every((deg) => Math.abs(deg - 90) <= 24);
  if (!isRoughRect) {
    return verts;
  }

  // Determine dominant orientation from edge 0->1 and 2->3
  const e1Angle = Math.atan2(verts[1].y - verts[0].y, verts[1].x - verts[0].x);
  // Fold modulo PI/2 into [-PI/4, PI/4]
  let baseAngle = e1Angle % (Math.PI / 2);
  if (baseAngle > Math.PI / 4) baseAngle -= Math.PI / 2;
  if (baseAngle < -Math.PI / 4) baseAngle += Math.PI / 2;

  // Snap to level if within ±14°
  if (Math.abs(baseAngle) <= (14 * Math.PI) / 180) {
    baseAngle = 0;
  }

  const cos = Math.cos(baseAngle);
  const sin = Math.sin(baseAngle);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (const p of verts) {
    const u = p.x * cos + p.y * sin;
    const v = -p.x * sin + p.y * cos;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  let w = maxU - minU;
  let h = maxV - minV;
  const cu = (minU + maxU) / 2;
  const cv = (minV + maxV) / 2;

  // Regularize to square if nearly equal sides
  const ratio = Math.min(w, h) / Math.max(1e-4, Math.max(w, h));
  if (ratio >= 0.87) {
    const s = (w + h) / 2;
    w = s;
    h = s;
  }

  const hw = w / 2;
  const hh = h / 2;
  const localCorners = [
    { u: cu - hw, v: cv + hh },
    { u: cu + hw, v: cv + hh },
    { u: cu + hw, v: cv - hh },
    { u: cu - hw, v: cv - hh },
  ];

  return localCorners.map((lc) => ({
    x: lc.u * cos - lc.v * sin,
    y: lc.u * sin + lc.v * cos,
  })) as [Point2D, Point2D, Point2D, Point2D];
}

function fitCircleKasa(pts: Point2D[]): { cx: number; cy: number; r: number } | null {
  const n = pts.length;
  if (n < 4) return null;
  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let sumXY = 0;
  let sumZ = 0;
  let sumXZ = 0;
  let sumYZ = 0;

  for (let i = 0; i < n; i++) {
    const x = pts[i].x;
    const y = pts[i].y;
    const z = x * x + y * y;
    sumX += x;
    sumY += y;
    sumX2 += x * x;
    sumY2 += y * y;
    sumXY += x * y;
    sumZ += z;
    sumXZ += x * z;
    sumYZ += y * z;
  }

  const M = [
    [sumX2, sumXY, sumX, sumXZ],
    [sumXY, sumY2, sumY, sumYZ],
    [sumX, sumY, n, sumZ],
  ];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    const tmp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = tmp;
    if (Math.abs(M[i][i]) < 1e-9) return null;
    for (let k = i + 1; k < 3; k++) {
      const c = M[k][i] / M[i][i];
      for (let j = i; j <= 3; j++) M[k][j] -= c * M[i][j];
    }
  }

  const sol = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = M[i][3];
    for (let j = i + 1; j < 3; j++) s -= M[i][j] * sol[j];
    sol[i] = s / M[i][i];
  }

  const cx = sol[0] / 2;
  const cy = sol[1] / 2;
  const r2 = sol[2] + cx * cx + cy * cy;
  if (r2 <= 0) return null;
  return { cx, cy, r: Math.sqrt(r2) };
}

function fitEllipsePCA(pts: Point2D[]): {
  center: Point2D;
  rx: number;
  ry: number;
  rotation: number;
  stdDev: number;
  maxMinRatio: number;
} | null {
  const n = pts.length;
  if (n < 8) return null;

  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= n;
  my /= n;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }
  cxx /= n;
  cyy /= n;
  cxy /= n;

  const rotation = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  const localPts: Point2D[] = [];

  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    localPts.push({ x: u, y: v });
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const uMid = (minU + maxU) / 2;
  const vMid = (minV + maxV) / 2;
  const a0 = Math.max(1e-4, (maxU - minU) / 2);
  const b0 = Math.max(1e-4, (maxV - minV) / 2);

  const center: Point2D = {
    x: mx + uMid * cos - vMid * sin,
    y: my + uMid * sin + vMid * cos,
  };

  const rawRhos: number[] = [];
  let meanRho = 0;
  for (const lp of localPts) {
    const cu = lp.x - uMid;
    const cv = lp.y - vMid;
    const rho = Math.hypot(cu / a0, cv / b0);
    rawRhos.push(rho);
    meanRho += rho;
  }
  meanRho /= n;
  if (meanRho <= 1e-4) return null;

  let rx = a0 * meanRho;
  let ry = b0 * meanRho;

  let minRho = Infinity;
  let maxRho = 0;
  let variance = 0;
  for (const r of rawRhos) {
    const normR = r / meanRho;
    if (normR < minRho) minRho = normR;
    if (normR > maxRho) maxRho = normR;
    const diff = normR - 1;
    variance += diff * diff;
  }
  const stdDev = Math.sqrt(variance / n);
  const maxMinRatio = maxRho / Math.max(1e-4, minRho);

  let finalRotation = rotation;
  if (ry > rx) {
    const tmp = rx;
    rx = ry;
    ry = tmp;
    finalRotation += Math.PI / 2;
  }

  // Normalize angle to [-PI/2, PI/2] and auto-level if within ±12° of horizontal/vertical
  while (finalRotation > Math.PI / 2) finalRotation -= Math.PI;
  while (finalRotation < -Math.PI / 2) finalRotation += Math.PI;
  const deg = (finalRotation * 180) / Math.PI;
  if (Math.abs(deg) <= 12) {
    finalRotation = 0;
  } else if (Math.abs(Math.abs(deg) - 90) <= 12) {
    finalRotation = Math.PI / 2;
  }

  return {
    center,
    rx,
    ry,
    rotation: finalRotation,
    stdDev,
    maxMinRatio,
  };
}

function cumulativeAngleSpan(pts: Point2D[], cx: number, cy: number): number {
  let totalDelta = 0;
  for (let i = 1; i < pts.length; i++) {
    const a1 = Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx);
    const a2 = Math.atan2(pts[i].y - cy, pts[i].x - cx);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    totalDelta += diff;
  }
  return Math.abs(totalDelta);
}

/**
 * Ramer-Douglas-Peucker polyline simplification (preserved for utility compatibility).
 */
export function simplifyRDP(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const a = points[0];
  const b = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    let d = 0;
    if (l2 < 1e-9) {
      d = dist2D(p, a);
    } else {
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
      d = dist2D(p, { x: a.x + t * dx, y: a.y + t * dy });
    }
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const rec1 = simplifyRDP(points.slice(0, index + 1), epsilon);
    const rec2 = simplifyRDP(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [a, b];
  }
}

/**
 * Recognizes geometric primitives (segment, arrow, circle, ellipse, triangle, rectangle/square)
 * from raw pen stroke coordinates using ShortStraw corner detection + PaleoSketch fitting.
 */
export function recognizeStrokeShape(flatPoints: number[]): RecognizedShape | null {
  if (!flatPoints || flatPoints.length < 8) return null;

  const rawPts: Point2D[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    rawPts.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }

  const pts = trimStrokeHooks(rawPts);
  const arcLen = totalPathLength(pts);
  if (pts.length < 4 || arcLen < 0.3) return null;

  const pStart = pts[0];
  const pEnd = pts[pts.length - 1];
  const endToStartDist = dist2D(pStart, pEnd);

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
  const bboxW = Math.max(1e-4, maxX - minX);
  const bboxH = Math.max(1e-4, maxY - minY);
  const diag = Math.hypot(bboxW, bboxH);
  const bboxAspect = Math.max(bboxW, bboxH) / Math.min(bboxW, bboxH);

  // Determine closed loop via either endpoint proximity or >= 290° winding span around center
  const centerGuessX = (minX + maxX) / 2;
  const centerGuessY = (minY + maxY) / 2;
  const rawAngleSpan = cumulativeAngleSpan(pts, centerGuessX, centerGuessY);
  const isClosed =
    endToStartDist < Math.max(0.45, arcLen * 0.25) ||
    (rawAngleSpan >= 5.05 && endToStartDist < diag * 0.45);

  if (isClosed && pts.length >= 6 && diag > 0.3) {
    const loopPts = normalizeClosedLoop(pts, diag);
    const corners = findShortStrawClosedCorners(loopPts, diag);
    const hasStraightPolygon =
      (corners.length === 3 || corners.length === 4) &&
      verifyPolygonEdgesStraight(loopPts, corners);

    const resampled64 = resamplePoints(loopPts, 64);
    const kasaFit = fitCircleKasa(resampled64);
    const ellipseFit = fitEllipsePCA(resampled64);

    // Check smooth Circle / Ellipse when corners are NOT a sharp verified straight polygon
    if (!hasStraightPolygon) {
      const kasaCx = kasaFit ? kasaFit.cx : centerGuessX;
      const kasaCy = kasaFit ? kasaFit.cy : centerGuessY;
      const angleSpan = cumulativeAngleSpan(resampled64, kasaCx, kasaCy);

      if (angleSpan >= 4.4) {
        if (kasaFit && kasaFit.r > 0.14) {
          const center: Point2D = { x: kasaFit.cx, y: kasaFit.cy };
          const radii = resampled64.map((p) => dist2D(p, center));
          const meanR = kasaFit.r;
          const variance =
            radii.reduce((s, r) => s + Math.pow(r - meanR, 2), 0) / radii.length;
          const stdDevRatio = Math.sqrt(variance) / meanR;
          const maxMinRatio = Math.max(...radii) / Math.max(1e-4, Math.min(...radii));

          if (stdDevRatio <= 0.16 && maxMinRatio <= 1.48 && bboxAspect <= 1.24) {
            return {
              type: "circle",
              center,
              radius: meanR,
            };
          }
        }

        if (
          ellipseFit &&
          ellipseFit.ry > 0.11 &&
          ellipseFit.stdDev <= 0.19 &&
          ellipseFit.maxMinRatio <= 1.72 &&
          ellipseFit.rx / ellipseFit.ry <= 5.0
        ) {
          if (ellipseFit.rx / ellipseFit.ry <= 1.19) {
            return {
              type: "circle",
              center: ellipseFit.center,
              radius: (ellipseFit.rx + ellipseFit.ry) / 2,
            };
          }
          return {
            type: "ellipse",
            center: ellipseFit.center,
            rx: ellipseFit.rx,
            ry: ellipseFit.ry,
            rotation: ellipseFit.rotation,
          };
        }
      }
    }

    // Check Polygon (Triangle or Rectangle / Square with beautification)
    if (hasStraightPolygon) {
      if (corners.length === 4) {
        const regVerts = regularizeRectangle(
          corners as [Point2D, Point2D, Point2D, Point2D]
        );
        return {
          type: "rectangle",
          vertices: regVerts,
        };
      }
      if (corners.length === 3) {
        return {
          type: "triangle",
          vertices: corners as [Point2D, Point2D, Point2D],
        };
      }
    }

    return null;
  }

  // Open strokes: Arrow & Straight Segment (strict thresholds so curves/arcs stay smooth!)
  if (pts.length >= 12 && arcLen > 0.6) {
    const barbCutoff = Math.max(4, Math.floor(pts.length * 0.25));
    const mainPts = pts.slice(0, pts.length - barbCutoff);
    const headPts = pts.slice(pts.length - barbCutoff);

    const mainStart = mainPts[0];
    const mainEnd = mainPts[mainPts.length - 1];
    const straightDist = dist2D(mainStart, mainEnd);
    const mainArc = totalPathLength(mainPts);
    const headArc = totalPathLength(headPts);

    if (
      straightDist > 0.4 &&
      straightDist / mainArc >= 0.965 &&
      headArc >= straightDist * 0.1
    ) {
      const { maxDist } = maxPerpDistanceToSegment(mainPts, mainStart, mainEnd);
      if (maxDist / straightDist <= 0.04) {
        const headDir = { x: mainEnd.x - mainStart.x, y: mainEnd.y - mainStart.y };
        const headDirLen = Math.hypot(headDir.x, headDir.y);
        if (headDirLen > 1e-4) {
          const u = { x: headDir.x / headDirLen, y: headDir.y / headDirLen };
          let backtrackCount = 0;
          for (let i = 1; i < headPts.length; i++) {
            const v = {
              x: headPts[i].x - headPts[i - 1].x,
              y: headPts[i].y - headPts[i - 1].y,
            };
            if (v.x * u.x + v.y * u.y < -0.35 * Math.hypot(v.x, v.y)) {
              backtrackCount++;
            }
          }
          if (backtrackCount >= 2) {
            return {
              type: "arrow",
              start: mainStart,
              end: mainEnd,
            };
          }
        }
      }
    }
  }

  // Straight Segment with gentle H/V auto-leveling
  if (arcLen > 0.35) {
    const chordLen = dist2D(pStart, pEnd);
    if (chordLen > 0.3 && chordLen / arcLen >= 0.968) {
      const { maxDist } = maxPerpDistanceToSegment(pts, pStart, pEnd);
      if (maxDist / chordLen <= 0.04) {
        const simplified = simplifyRDP(pts, chordLen * 0.04);
        if (simplified.length === 2) {
          let endPt = { ...pEnd };
          const dx = endPt.x - pStart.x;
          const dy = endPt.y - pStart.y;
          const angleDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
          if (angleDeg <= 4.5 || angleDeg >= 175.5) {
            endPt = { x: endPt.x, y: pStart.y };
          } else if (Math.abs(angleDeg - 90) <= 4.5) {
            endPt = { x: pStart.x, y: endPt.y };
          }
          return {
            type: "segment",
            start: pStart,
            end: endPt,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Generates smooth world-space polyline points for live preview during Draw-and-Hold.
 */
export function recognizedShapeToPreviewPoints(shape: RecognizedShape): number[] {
  const out: number[] = [];
  if (shape.type === "segment" || shape.type === "arrow") {
    out.push(shape.start.x, shape.start.y, shape.end.x, shape.end.y);
  } else if (shape.type === "circle") {
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      out.push(
        shape.center.x + shape.radius * Math.cos(a),
        shape.center.y + shape.radius * Math.sin(a)
      );
    }
  } else if (shape.type === "ellipse") {
    const steps = 44;
    const cos = Math.cos(shape.rotation);
    const sin = Math.sin(shape.rotation);
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      const lx = shape.rx * Math.cos(a);
      const ly = shape.ry * Math.sin(a);
      out.push(
        shape.center.x + lx * cos - ly * sin,
        shape.center.y + lx * sin + ly * cos
      );
    }
  } else if (shape.type === "triangle" || shape.type === "rectangle") {
    for (const v of shape.vertices) {
      out.push(v.x, v.y);
    }
    if (shape.vertices.length > 0) {
      out.push(shape.vertices[0].x, shape.vertices[0].y);
    }
  }
  return out;
}
