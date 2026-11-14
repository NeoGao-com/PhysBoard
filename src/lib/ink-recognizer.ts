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
  const isClosedRoughly = endToStartDist < Math.max(0.4, arcLen * 0.28);

  const resampled = resamplePoints(pts, 64);

  // Compute closed shape area and perimeter for isoperimetric circularity quotient
  let closedArea = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    closedArea += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  closedArea = Math.abs(closedArea) / 2;
  const peri = arcLen + (isClosedRoughly ? endToStartDist : 0);
  const circularity = peri > 1e-4 ? (4 * Math.PI * closedArea) / (peri * peri) : 0;

  // 1. Check Circle FIRST if it is round
  // A hand-drawn circle typically has circularity in [0.80, 1.05], low radius stdDev (< 0.22), and maxR/minR < 1.52.
  // Note: A square has theoretical circularity = pi/4 ≈ 0.785 and maxR/minR = sqrt(2) ≈ 1.414.
  // A rectangle (e.g. 2x1) has circularity ≈ 0.698 and maxR/minR > 2.0.
  // An equilateral triangle has circularity ≈ 0.604.
  if (isClosedRoughly && pts.length >= 10 && circularity >= 0.80) {
    let cx = 0;
    let cy = 0;
    for (const p of resampled) {
      cx += p.x;
      cy += p.y;
    }
    cx /= resampled.length;
    cy /= resampled.length;
    const center: Point2D = { x: cx, y: cy };

    const radii = resampled.map((p) => dist2D(p, center));
    const meanR = radii.reduce((s, r) => s + r, 0) / radii.length;
    if (meanR > 0.15) {
      const variance = radii.reduce((s, r) => s + Math.pow(r - meanR, 2), 0) / radii.length;
      const stdDev = Math.sqrt(variance);
      const minR = Math.min(...radii);
      const maxR = Math.max(...radii);

      if (stdDev / meanR < 0.22 && maxR / Math.max(1e-4, minR) < 1.50) {
        return {
          type: "circle",
          center,
          radius: meanR,
        };
      }
    }
  }

  // 2. Check Polygon (Triangle or Rectangle / Square) when closed or nearly closed
  // Important: Gate with circularity < 0.83 so shapes resembling circles never get reduced into 4-corner quadrilaterals!
  if (isClosedRoughly && pts.length >= 6 && circularity < 0.83) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const diag = Math.hypot(maxX - minX, maxY - minY);
    if (diag > 0.3) {
      // Test candidate epsilons to find clear corners
      for (const epsFactor of [0.15, 0.12, 0.08, 0.18, 0.22]) {
        const eps = diag * epsFactor;
        const simplified = simplifyRDP(pts, eps);
        // Since it's closed, first and last point are essentially the same vertex
        let cornerCandidates = simplified.slice();
        if (
          cornerCandidates.length > 2 &&
          dist2D(cornerCandidates[0], cornerCandidates[cornerCandidates.length - 1]) < diag * 0.35
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
  }

  // 3. Check Arrow: Main shaft + arrowhead at the end (or near end)
  // An arrow typically has a line from pStart towards pEnd, and then at the end a hook or V
  if (!isClosedRoughly && pts.length >= 10 && arcLen > 0.5) {
    // Check if the last 20% of points form an arrowhead barb
    const barbCutoff = Math.max(3, Math.floor(pts.length * 0.25));
    const mainPts = pts.slice(0, pts.length - barbCutoff);
    const headPts = pts.slice(pts.length - barbCutoff);

    const mainStart = mainPts[0];
    const mainEnd = mainPts[mainPts.length - 1];
    const straightDist = dist2D(mainStart, mainEnd);
    const mainArc = totalPathLength(mainPts);

    // If main part is very straight
    if (straightDist / mainArc > 0.88) {
      // And head turns sharply or branches backwards towards main shaft
      const headDir = { x: mainEnd.x - mainStart.x, y: mainEnd.y - mainStart.y };
      const headDirLen = Math.hypot(headDir.x, headDir.y);
      if (headDirLen > 1e-4) {
        const u = { x: headDir.x / headDirLen, y: headDir.y / headDirLen };
        let hasBacktrack = false;
        for (let i = 1; i < headPts.length; i++) {
          const v = { x: headPts[i].x - headPts[i - 1].x, y: headPts[i].y - headPts[i - 1].y };
          // dot product of step vector with main vector < 0 means backtracking
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

  // 4. Check Straight Segment
  if (!isClosedRoughly && arcLen > 0.3) {
    const chordLen = dist2D(pStart, pEnd);
    // If the path length is very close to straight line chord (ratio >= 0.93)
    // and maximum deviation from chord is small
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
