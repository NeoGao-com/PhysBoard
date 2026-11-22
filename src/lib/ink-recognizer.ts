/**
 * Geometric shape recognizer for ink strokes (Ink-to-Shape).
 * Recognizes straight segments, arrows, circles, ellipses, triangles, and rectangles
 * while preserving intentionally curved strokes and smooth rounded shapes.
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

/**
 * Total arc length of points along stroke.
 */
function totalPathLength(pts: Point2D[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += dist2D(pts[i - 1], pts[i]);
  }
  return len;
}

/**
 * Resample polyline to N equidistant points.
 */
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
    while (segIndex < pts.length - 1 && currentDist + segLen < targetDist) {
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
 * Measure perpendicular deviation of points relative to line segment A -> B.
 * signedBias approaches 1.0 when all points curve smoothly to one side.
 */
function maxPerpDistanceToSegment(
  pts: Point2D[],
  a: Point2D,
  b: Point2D
): { maxDist: number; meanDist: number; signedBias: number } {
  if (pts.length === 0) return { maxDist: 0, meanDist: 0, signedBias: 0 };
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
    return { maxDist: maxD, meanDist: sumD / pts.length, signedBias: 0 };
  }

  let maxDist = 0;
  let sumAbs = 0;
  let sumSigned = 0;
  for (const p of pts) {
    const cross = (p.x - a.x) * dy - (p.y - a.y) * dx;
    const signed = cross / len;
    const d = Math.abs(signed);
    if (d > maxDist) maxDist = d;
    sumAbs += d;
    sumSigned += signed;
  }

  return {
    maxDist,
    meanDist: sumAbs / pts.length,
    signedBias: sumAbs > 1e-6 ? Math.abs(sumSigned) / sumAbs : 0,
  };
}

/**
 * Fit circle using Kåsa algebraic method (fast, stable, handles noisy/overlapping hand strokes).
 */
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

/**
 * Fit an oriented ellipse using PCA (covariance orientation + principal bounding center/axes)
 * and evaluate normalized radial residuals rho_i = sqrt((u_i / rx)^2 + (v_i / ry)^2).
 */
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

  // Convert midpoint back to world coordinates for accurate ellipse centering
  const center: Point2D = {
    x: mx + uMid * cos - vMid * sin,
    y: my + uMid * sin + vMid * cos,
  };

  // Compute initial normalized radii relative to centered axes
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

  // Scale semi-axes so mean normalized radius equals 1.0
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

  // Normalize so rx >= ry and adjust rotation accordingly if swapped
  let finalRotation = rotation;
  if (ry > rx) {
    const tmp = rx;
    rx = ry;
    ry = tmp;
    finalRotation += Math.PI / 2;
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

/**
 * Measure cumulative rotational angle around center (in radians).
 * A full loop circle traces approximately 2*PI (~6.28 rad) or more if overlapping.
 */
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
 * Ramer-Douglas-Peucker polyline simplification.
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
 * Verify that each edge between consecutive polygon vertices actually follows straight lines
 * in the original ink stroke (prevents ellipses / ovals / rounded shapes from snapping to polygons).
 */
function verifyPolygonEdgesStraight(pts: Point2D[], corners: Point2D[]): boolean {
  if (corners.length < 3 || pts.length < corners.length) return false;

  // Map each corner in order to its nearest index along pts (with wrap-around handling)
  const cornerIndices: number[] = [];
  let searchStart = 0;
  for (let cIdx = 0; cIdx < corners.length; cIdx++) {
    const target = corners[cIdx];
    let bestIdx = searchStart;
    let bestDist = Infinity;
    for (let i = searchStart; i < pts.length; i++) {
      const d = dist2D(pts[i], target);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    // If remaining points couldn't beat a wrap-around, also check early pts for first/last corner
    if (cIdx === 0) {
      for (let i = 0; i < pts.length; i++) {
        const d = dist2D(pts[i], target);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    }
    cornerIndices.push(bestIdx);
    searchStart = bestIdx;
  }

  // Verify every corner angle is sharp enough (not a smooth 160°+ curve bend)
  for (let i = 0; i < corners.length; i++) {
    const prev = corners[(i - 1 + corners.length) % corners.length];
    const curr = corners[i];
    const next = corners[(i + 1) % corners.length];
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    if (len1 < 0.1 || len2 < 0.1) return false;
    const dot = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (len1 * len2)));
    const angleDeg = (Math.acos(dot) * 180) / Math.PI;
    if (angleDeg < 22 || angleDeg > 148) {
      return false;
    }
  }

  // Verify straightness of every edge slice along the stroke
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const chord = dist2D(a, b);
    if (chord < 0.12) return false;

    const idxA = cornerIndices[i];
    const idxB = cornerIndices[(i + 1) % corners.length];
    const edgeSlice: Point2D[] =
      idxB >= idxA
        ? pts.slice(idxA, idxB + 1)
        : pts.slice(idxA).concat(pts.slice(0, idxB + 1));

    if (edgeSlice.length >= 3) {
      const edgeArc = totalPathLength(edgeSlice);
      if (edgeArc > chord && chord / edgeArc < 0.91) {
        return false;
      }
      const { maxDist } = maxPerpDistanceToSegment(edgeSlice, a, b);
      if (maxDist / chord > 0.075) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Detect if stroke matches a straight segment, arrow, circle, ellipse, triangle, or rectangle.
 * Tuned for intentional geometric sketching without flattening curved edges or rounded blocks.
 * @param flatPoints Flat array [x0, y0, x1, y1, ...]
 */
export function recognizeStrokeShape(flatPoints: number[]): RecognizedShape | null {
  if (!flatPoints || flatPoints.length < 8) return null; // at least 4 points

  const pts: Point2D[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    pts.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }

  const arcLen = totalPathLength(pts);
  if (arcLen < 0.3) return null; // ignore jitter/tiny click

  const pStart = pts[0];
  const pEnd = pts[pts.length - 1];
  const endToStartDist = dist2D(pStart, pEnd);

  // Bounding box
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

  // Tighter closure threshold so open curves/U-shapes don't prematurely trigger closed-shape snapping
  const isClosedRoughly = endToStartDist < Math.max(0.45, arcLen * 0.24);

  const resampled = resamplePoints(pts, 64);

  // Pre-check if the closed stroke has sharp straight polygon corners
  let isClearStraightPolygon = false;
  if (isClosedRoughly && pts.length >= 6 && diag > 0.3) {
    const rdpCheck = simplifyRDP(pts, diag * 0.09);
    let cand = rdpCheck.slice();
    if (cand.length > 2 && dist2D(cand[0], cand[cand.length - 1]) < diag * 0.28) {
      cand = cand.slice(0, -1);
    }
    if ((cand.length === 3 || cand.length === 4) && verifyPolygonEdgesStraight(pts, cand)) {
      isClearStraightPolygon = true;
    }
  }

  // =========================================================================
  // 1. Check Circle & Ellipse (supports rotated ovals and circles)
  // =========================================================================
  if (!isClearStraightPolygon && pts.length >= 10 && diag > 0.3) {
    const fit = fitCircleKasa(resampled);
    const kasaCx = fit ? fit.cx : (minX + maxX) / 2;
    const kasaCy = fit ? fit.cy : (minY + maxY) / 2;
    const angleSpan = cumulativeAngleSpan(resampled, kasaCx, kasaCy);

    // Must trace a substantial closed/near-closed loop (>= 275° or closed with >= 250°)
    const isAngleLoop = angleSpan >= 4.8 || (isClosedRoughly && angleSpan >= 4.4);

    if (isAngleLoop) {
      if (fit && fit.r > 0.15) {
        const center: Point2D = { x: fit.cx, y: fit.cy };
        const radii = resampled.map((p) => dist2D(p, center));
        const meanR = fit.r;
        const variance =
          radii.reduce((s, r) => s + Math.pow(r - meanR, 2), 0) / radii.length;
        const stdDev = Math.sqrt(variance);
        const minR = Math.min(...radii);
        const maxR = Math.max(...radii);
        const stdDevRatio = stdDev / meanR;
        const maxMinRatio = maxR / Math.max(1e-4, minR);

        if (stdDevRatio <= 0.16 && maxMinRatio <= 1.45 && bboxAspect <= 1.24) {
          return {
            type: "circle",
            center,
            radius: meanR,
          };
        }
      }

      // Check Ellipse via PCA fit (supports any rotation & elongation up to 4.5:1)
      const ellipseFit = fitEllipsePCA(resampled);
      if (
        ellipseFit &&
        ellipseFit.ry > 0.12 &&
        ellipseFit.stdDev <= 0.17 &&
        ellipseFit.maxMinRatio <= 1.62 &&
        ellipseFit.rx / ellipseFit.ry <= 4.5
      ) {
        if (ellipseFit.rx / ellipseFit.ry <= 1.18) {
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

  // =========================================================================
  // 2. Check Polygon (Triangle or Rectangle / Square with verified straight edges)
  // =========================================================================
  if (isClosedRoughly && pts.length >= 6 && diag > 0.35) {
    for (const epsFactor of [0.075, 0.095, 0.115, 0.135]) {
      const eps = diag * epsFactor;
      const simplified = simplifyRDP(pts, eps);
      let cornerCandidates = simplified.slice();
      if (
        cornerCandidates.length > 2 &&
        dist2D(cornerCandidates[0], cornerCandidates[cornerCandidates.length - 1]) <
          diag * 0.28
      ) {
        cornerCandidates = cornerCandidates.slice(0, -1);
      }

      if (
        (cornerCandidates.length === 4 || cornerCandidates.length === 3) &&
        verifyPolygonEdgesStraight(pts, cornerCandidates)
      ) {
        if (cornerCandidates.length === 4) {
          const [A, B, C, D] = cornerCandidates;
          return {
            type: "rectangle",
            vertices: [A, B, C, D],
          };
        } else {
          const [A, B, C] = cornerCandidates;
          return {
            type: "triangle",
            vertices: [A, B, C],
          };
        }
      }
    }
  }

  // =========================================================================
  // 3. Check Arrow: Straight main shaft + clear deliberate arrowhead
  // =========================================================================
  if (!isClosedRoughly && pts.length >= 12 && arcLen > 0.6) {
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

  // =========================================================================
  // 4. Check Straight Segment (Strict straightness so curved edges stay smooth!)
  // =========================================================================
  if (!isClosedRoughly && arcLen > 0.35) {
    const chordLen = dist2D(pStart, pEnd);
    if (chordLen > 0.3 && chordLen / arcLen >= 0.972) {
      const { maxDist } = maxPerpDistanceToSegment(pts, pStart, pEnd);
      if (maxDist / chordLen <= 0.038) {
        const simplified = simplifyRDP(pts, chordLen * 0.038);
        if (simplified.length === 2) {
          return {
            type: "segment",
            start: pStart,
            end: pEnd,
          };
        }
      }
    }
  }

  return null;
}
