/**
 * Geometric shape recognizer for ink strokes (Ink-to-Shape).
 * Recognizes straight segments, arrows, circles/ellipses, triangles, and rectangles.
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
      type: "triangle";
      vertices: [Point2D, Point2D, Point2D];
    }
  | {
      type: "rectangle";
      vertices: [Point2D, Point2D, Point2D, Point2D];
    };

/**
 * Total arc length of points along stroke
 */
function totalPathLength(pts: Point2D[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += dist2D(pts[i - 1], pts[i]);
  }
  return len;
}

/**
 * Resample polyline to N equidistant points
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
 * Ramer-Douglas-Peucker polyline simplification
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
 * Detect if stroke matches a straight segment, arrow, circle, triangle, or rectangle.
 * @param flatPoints Flat array [x0, y0, x1, y1, ...]
 */
export function recognizeStrokeShape(flatPoints: number[]): RecognizedShape | null {
  if (!flatPoints || flatPoints.length < 8) return null; // at least 4 points

  const pts: Point2D[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    pts.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }

  const arcLen = totalPathLength(pts);
  if (arcLen < 0.25) return null; // ignore jitter/tiny click

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

  // A closed shape either brings endpoints near each other, OR completes at least ~300° around the center
  const isClosedRoughly = endToStartDist < Math.max(0.6, arcLen * 0.35);

  const resampled = resamplePoints(pts, 64);

  // =========================================================================
  // 1. Check Circle FIRST (robust to overlap loops, gaps, and slight wobbles)
  // =========================================================================
  if (pts.length >= 8 && diag > 0.25) {
    const fit = fitCircleKasa(resampled);
    if (fit && fit.r > 0.12) {
      const center: Point2D = { x: fit.cx, y: fit.cy };
      const angleSpan = cumulativeAngleSpan(resampled, fit.cx, fit.cy);

      // Must complete at least ~280° (4.9 rad) around the fitted center
      // or endpoints close and angleSpan >= 250°
      const isAngleLoop = angleSpan >= 4.9 || (isClosedRoughly && angleSpan >= 4.3);

      if (isAngleLoop) {
        const radii = resampled.map((p) => dist2D(p, center));
        const meanR = fit.r;
        const variance =
          radii.reduce((s, r) => s + Math.pow(r - meanR, 2), 0) / radii.length;
        const stdDev = Math.sqrt(variance);
        const minR = Math.min(...radii);
        const maxR = Math.max(...radii);
        const stdDevRatio = stdDev / meanR;
        const maxMinRatio = maxR / Math.max(1e-4, minR);

        // Hand-drawn circles typically have:
        // - stdDevRatio <= 0.22 (22% variation)
        // - maxMinRatio <= 1.65
        // - bounding box aspect ratio <= 1.55 (not an elongated polygon or line)
        if (stdDevRatio <= 0.22 && maxMinRatio <= 1.65 && bboxAspect <= 1.55) {
          // Extra guard against squares:
          // Check if simplifying with corner-finding yields clear sharp 4 corners
          const rdpCorners = simplifyRDP(pts, diag * 0.12);
          // A square simplifies to exactly 4 or 5 vertices with very low error,
          // whereas a circle polyline maintains many smooth vertices (> 6)
          const isClearSquare =
            rdpCorners.length <= 5 &&
            stdDevRatio > 0.09 &&
            maxMinRatio > 1.35 &&
            bboxAspect < 1.15;

          if (!isClearSquare) {
            return {
              type: "circle",
              center,
              radius: meanR,
            };
          }
        }
      }
    }
  }

  // =========================================================================
  // 2. Check Polygon (Triangle or Rectangle / Square)
  // =========================================================================
  if (isClosedRoughly && pts.length >= 6 && diag > 0.3) {
    // Test candidate epsilons to find clear corners
    for (const epsFactor of [0.15, 0.12, 0.08, 0.18, 0.22]) {
      const eps = diag * epsFactor;
      const simplified = simplifyRDP(pts, eps);
      let cornerCandidates = simplified.slice();
      if (
        cornerCandidates.length > 2 &&
        dist2D(cornerCandidates[0], cornerCandidates[cornerCandidates.length - 1]) <
          diag * 0.35
      ) {
        cornerCandidates = cornerCandidates.slice(0, -1);
      }

      // Quadrilateral / Rectangle / Square: 4 vertices
      if (cornerCandidates.length === 4) {
        const [A, B, C, D] = cornerCandidates;
        const ab = dist2D(A, B);
        const bc = dist2D(B, C);
        const cd = dist2D(C, D);
        const da = dist2D(D, A);
        if (ab > 0.1 && bc > 0.1 && cd > 0.1 && da > 0.1) {
          return {
            type: "rectangle",
            vertices: [A, B, C, D],
          };
        }
      }

      // Triangle: 3 vertices
      if (cornerCandidates.length === 3) {
        const [A, B, C] = cornerCandidates;
        const ab = dist2D(A, B);
        const bc = dist2D(B, C);
        const ca = dist2D(C, A);
        if (ab > 0.1 && bc > 0.1 && ca > 0.1) {
          return {
            type: "triangle",
            vertices: [A, B, C],
          };
        }
      }
    }
  }

  // =========================================================================
  // 3. Check Arrow: Main shaft + arrowhead at the end (or near end)
  // =========================================================================
  if (!isClosedRoughly && pts.length >= 10 && arcLen > 0.5) {
    const barbCutoff = Math.max(3, Math.floor(pts.length * 0.25));
    const mainPts = pts.slice(0, pts.length - barbCutoff);
    const headPts = pts.slice(pts.length - barbCutoff);

    const mainStart = mainPts[0];
    const mainEnd = mainPts[mainPts.length - 1];
    const straightDist = dist2D(mainStart, mainEnd);
    const mainArc = totalPathLength(mainPts);

    if (straightDist / mainArc > 0.88) {
      const headDir = { x: mainEnd.x - mainStart.x, y: mainEnd.y - mainStart.y };
      const headDirLen = Math.hypot(headDir.x, headDir.y);
      if (headDirLen > 1e-4) {
        const u = { x: headDir.x / headDirLen, y: headDir.y / headDirLen };
        let hasBacktrack = false;
        for (let i = 1; i < headPts.length; i++) {
          const v = {
            x: headPts[i].x - headPts[i - 1].x,
            y: headPts[i].y - headPts[i - 1].y,
          };
          if (v.x * u.x + v.y * u.y < -0.3 * Math.hypot(v.x, v.y)) {
            hasBacktrack = true;
            break;
          }
        }
        if (hasBacktrack) {
          return {
            type: "arrow",
            start: mainStart,
            end: mainEnd,
          };
        }
      }
    }
  }

  // =========================================================================
  // 4. Check Straight Segment
  // =========================================================================
  if (!isClosedRoughly && arcLen > 0.3) {
    const chordLen = dist2D(pStart, pEnd);
    if (chordLen / arcLen >= 0.92) {
      const simplified = simplifyRDP(pts, chordLen * 0.08);
      if (simplified.length <= 3) {
        return {
          type: "segment",
          start: pStart,
          end: pEnd,
        };
      }
    }
  }

  return null;
}
