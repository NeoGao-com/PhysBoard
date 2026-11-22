/**
 * Freehand Spline & Calligraphy Fountain Pen Nib Mathematics for Mathvera Whiteboard.
 * Extracted verbatim from Mathvera bundle (classes Q6, Hft, DLe, Owe, DZ).
 */

/**
 * 1€ Filter (OneEuroFilter) for high-speed jitter-free pointer smoothing.
 * Extracted verbatim from Mathvera bundle (class Q6).
 */
export class OneEuroFilter {
  private x: number | null = null;
  private dx: number = 0;
  private t: number = 0;

  constructor(
    public minCutoff: number = 2.0,
    public beta: number = 0.35,
    public dCutoff: number = 1.0
  ) {}

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  public filter(val: number, timestamp: number): number {
    if (this.x === null) {
      this.x = val;
      this.t = timestamp;
      return val;
    }

    const dt = Math.max(0.001, (timestamp - this.t) / 1000);
    this.t = timestamp;

    const dAlpha = OneEuroFilter.alpha(this.dCutoff, dt);
    this.dx = dAlpha * ((val - this.x) / dt) + (1 - dAlpha) * this.dx;

    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    const alpha = OneEuroFilter.alpha(cutoff, dt);

    this.x = alpha * val + (1 - alpha) * this.x;
    return this.x;
  }

  public reset(): void {
    this.x = null;
    this.dx = 0;
    this.t = 0;
  }
}

/**
 * Variation-diminishing C1-continuous Midpoint Quadratic Bezier spline (with corner-preserving streamline).
 * Converts flat [x0, y0, x1, y1, ...] points into an SVG path string with zero overshoot or end-hooks.
 * Flips Math World Y to SVG Y via `-y`.
 */
export function generateCatmullRomSpline(flatPoints: number[]): string {
  const rawPts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < flatPoints.length; i += 2) {
    const x = flatPoints[i];
    const y = -flatPoints[i + 1]; // Invert Math Y to SVG Y
    const prev = rawPts[rawPts.length - 1];
    if (!prev || Math.hypot(x - prev.x, y - prev.y) >= 1e-6) {
      rawPts.push({ x, y });
    }
  }

  if (rawPts.length === 0) return "";
  const fmt = (v: number) => v.toFixed(4);
  if (rawPts.length === 1) return `M ${fmt(rawPts[0].x)} ${fmt(rawPts[0].y)} l 0.0001 0`;
  if (rawPts.length === 2) {
    return `M ${fmt(rawPts[0].x)} ${fmt(rawPts[0].y)} L ${fmt(rawPts[1].x)} ${fmt(rawPts[1].y)}`;
  }

  // Filter out micro-jitter points closer than 0.008 world units while always preserving endpoints
  const pts: Array<{ x: number; y: number }> = [rawPts[0]];
  for (let i = 1; i < rawPts.length - 1; i++) {
    const last = pts[pts.length - 1];
    if (Math.hypot(rawPts[i].x - last.x, rawPts[i].y - last.y) >= 0.008) {
      pts.push(rawPts[i]);
    }
  }
  const lastRaw = rawPts[rawPts.length - 1];
  const lastKept = pts[pts.length - 1];
  if (Math.hypot(lastRaw.x - lastKept.x, lastRaw.y - lastKept.y) >= 1e-6) {
    pts.push(lastRaw);
  }

  if (pts.length === 2) {
    return `M ${fmt(pts[0].x)} ${fmt(pts[0].y)} L ${fmt(pts[1].x)} ${fmt(pts[1].y)}`;
  }

  // Light 1-pass corner-preserving streamline filter to eliminate staircase jitter
  const smoothed: Array<{ x: number; y: number }> = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const d1 = Math.hypot(v1x, v1y);
    const d2 = Math.hypot(v2x, v2y);
    if (d1 > 1e-6 && d2 > 1e-6) {
      const cos = (v1x * v2x + v1y * v2y) / (d1 * d2);
      if (cos > -0.35) {
        smoothed.push({
          x: 0.18 * prev.x + 0.64 * curr.x + 0.18 * next.x,
          y: 0.18 * prev.y + 0.64 * curr.y + 0.18 * next.y,
        });
        continue;
      }
    }
    smoothed.push(curr);
  }
  smoothed.push(pts[pts.length - 1]);

  // C1 Midpoint Quadratic Bezier spline: M p0 L mid(p0,p1) Q p1 mid(p1,p2) ... L pLast
  const n = smoothed.length;
  const commands = [
    `M ${fmt(smoothed[0].x)} ${fmt(smoothed[0].y)}`,
    `L ${fmt((smoothed[0].x + smoothed[1].x) * 0.5)} ${fmt((smoothed[0].y + smoothed[1].y) * 0.5)}`,
  ];
  for (let i = 1; i < n - 1; i++) {
    const mx = (smoothed[i].x + smoothed[i + 1].x) * 0.5;
    const my = (smoothed[i].y + smoothed[i + 1].y) * 0.5;
    commands.push(`Q ${fmt(smoothed[i].x)} ${fmt(smoothed[i].y)} ${fmt(mx)} ${fmt(my)}`);
  }
  commands.push(`L ${fmt(smoothed[n - 1].x)} ${fmt(smoothed[n - 1].y)}`);

  return commands.join(" ");
}

/**
 * Calligraphy Fountain Pen dynamic thickness calculation.
 * Evaluates direction relative to 15° slant angle, speed, and pressure.
 */
const FOUNTAIN_NIB_ANGLE_DEG = 15;
const MIN_WIDTH_FACTOR = 0.5;
const MAX_WIDTH_FACTOR = 1.42;

function smoothstep(min: number, max: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

export function computeFountainPenThickness(
  subdividedPoints: Array<[number, number, number?]>,
  baseWidth: number
): number[] {
  const n = subdividedPoints.length;
  const minW = MIN_WIDTH_FACTOR * baseWidth;
  const maxW = MAX_WIDTH_FACTOR * baseWidth;

  if (n === 0) return [];

  // Arc length parameterization
  const s = [0];
  for (let i = 1; i < n; i++) {
    s.push(
      s[i - 1] +
        Math.hypot(
          subdividedPoints[i][0] - subdividedPoints[i - 1][0],
          subdividedPoints[i][1] - subdividedPoints[i - 1][1]
        )
    );
  }

  const totalLength = s[n - 1];
  if (totalLength < 2) {
    return subdividedPoints.map(() => (minW + maxW) / 2);
  }

  // Linear interpolation along arc length
  const sampleAt = (dist: number): [number, number] => {
    const clampedDist = Math.min(totalLength, Math.max(0, dist));
    let low = 0;
    let high = n - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (s[mid] <= clampedDist) low = mid;
      else high = mid;
    }
    const t = s[high] - s[low] > 1e-9 ? (clampedDist - s[low]) / (s[high] - s[low]) : 0;
    return [
      subdividedPoints[low][0] + t * (subdividedPoints[high][0] - subdividedPoints[low][0]),
      subdividedPoints[low][1] + t * (subdividedPoints[high][1] - subdividedPoints[low][1]),
    ];
  };

  const windowDist = Math.min(3, totalLength / 4);
  const rad = (FOUNTAIN_NIB_ANGLE_DEG * Math.PI) / 180;
  const normX = -Math.sin(rad);
  const normY = Math.cos(rad);

  const rawFactors = subdividedPoints.map((pt, i) => {
    const [pBackX, pBackY] = sampleAt(s[i] - windowDist);
    const [pFrontX, pFrontY] = sampleAt(s[i] + windowDist);
    const dx = pFrontX - pBackX;
    const dy = pFrontY - pBackY;
    const hyp = Math.hypot(dx, dy);
    if (hyp < 1e-9) return 0.5;

    const dot = (dx * normX + dy * normY) / hyp;
    const factor = smoothstep(0.1, 0.85, dot);
    const pressure = pt[2];
    return pressure === undefined
      ? factor
      : factor * Math.min(1, Math.max(0.3, (pressure - 0.05) / 0.55));
  });

  // Bidirectional exponential smoothing along stroke length (h = 4)
  const smoothed = rawFactors.slice();
  const decayLen = 4;
  for (let i = 1; i < n; i++) {
    const alpha = 1 - Math.exp(-(s[i] - s[i - 1]) / decayLen);
    smoothed[i] = smoothed[i - 1] + alpha * (smoothed[i] - smoothed[i - 1]);
  }
  for (let i = n - 2; i >= 0; i--) {
    const alpha = 1 - Math.exp(-(s[i + 1] - s[i]) / decayLen);
    smoothed[i] = smoothed[i + 1] + alpha * (smoothed[i] - smoothed[i + 1]);
  }

  return smoothed.map((f) => minW + (maxW - minW) * f);
}

/**
 * Self-contained stroke outline polygon generator (getStroke / DZ).
 * Compatible with perfect-freehand format.
 */
export function generateOutlinePolygon(
  points: Array<[number, number, number?]>,
  options: {
    size?: number;
    thinning?: number;
    smoothing?: number;
    streamline?: number;
    simulatePressure?: boolean;
    last?: boolean;
  } = {}
): Array<[number, number]> {
  const size = options.size ?? 2.4;
  if (points.length === 0) return [];
  if (points.length === 1) {
    const [x, y] = points[0];
    const r = size / 2;
    return [
      [x - r, y],
      [x, y - r],
      [x + r, y],
      [x, y + r],
    ];
  }

  const leftPts: Array<[number, number]> = [];
  const rightPts: Array<[number, number]> = [];

  for (let i = 0; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];

    const dx = p2[0] - p0[0];
    const dy = p2[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const pressure = p1[2] ?? 0.5;
    const halfWidth = (size * (0.5 + pressure * 0.5)) / 2;

    leftPts.push([p1[0] + nx * halfWidth, p1[1] + ny * halfWidth]);
    rightPts.push([p1[0] - nx * halfWidth, p1[1] - ny * halfWidth]);
  }

  return leftPts.concat(rightPts.reverse());
}

/**
 * Full Ink path generator (verbatim Owe).
 * Subdivides Catmull-Rom spline, computes thickness, and returns filled SVG path.
 */
export function generateFilledInkPath(
  flatPoints: number[],
  pressures: number[] | undefined,
  scale: number,
  baseWidth: number = 2.4,
  nib?: "fountain" | "pencil" | "highlighter" | "brush" | "dashed" | "laser"
): string {
  const deduped: Array<[number, number, number]> = [];
  for (let i = 0; i + 1 < flatPoints.length; i += 2) {
    const x = flatPoints[i] * scale;
    const y = -flatPoints[i + 1] * scale;
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.hypot(x - prev[0], y - prev[1]) >= 1e-6) {
      deduped.push([x, y, pressures?.[i / 2] ?? 0.5]);
    }
  }

  if (deduped.length === 0) return "";

  // Filter raw pixel points to >= 1.5px spacing (preserving start & end points) so normals stay jitter-free
  const rawPts: Array<[number, number, number]> = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const last = rawPts[rawPts.length - 1];
    if (Math.hypot(deduped[i][0] - last[0], deduped[i][1] - last[1]) >= 1.5) {
      rawPts.push(deduped[i]);
    }
  }
  if (deduped.length > 1) {
    const lastRaw = deduped[deduped.length - 1];
    const lastKept = rawPts[rawPts.length - 1];
    if (Math.hypot(lastRaw[0] - lastKept[0], lastRaw[1] - lastKept[1]) >= 0.25) {
      rawPts.push(lastRaw);
    } else if (rawPts.length > 1) {
      rawPts[rawPts.length - 1] = lastRaw;
    }
  }

  if (rawPts.length === 1) {
    const [cx, cy] = rawPts[0];
    const r = Math.max(0.6, baseWidth / 2);
    const dotPts: Array<[number, number]> = [];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      dotPts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const toWorld = (coord: number) => (coord / scale).toFixed(4);
    const parts = [`M ${toWorld(dotPts[0][0])} ${toWorld(dotPts[0][1])} Q`];
    for (let i = 0; i < dotPts.length; i++) {
      const [x1, y1] = dotPts[i];
      const [x2, y2] = dotPts[(i + 1) % dotPts.length];
      parts.push(
        `${toWorld(x1)} ${toWorld(y1)} ${toWorld((x1 + x2) / 2)} ${toWorld((y1 + y2) / 2)}`
      );
    }
    parts.push("Z");
    return parts.join(" ");
  }

  // Catmull-Rom curve subdivision
  const subdivided: Array<[number, number, number]> = [rawPts[0]];
  for (let i = 0; i < rawPts.length - 1; i++) {
    const p0 = rawPts[i - 1] ?? rawPts[i];
    const p1 = rawPts[i];
    const p2 = rawPts[i + 1];
    const p3 = rawPts[i + 2] ?? p2;

    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];

    const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = dist > 4 ? Math.ceil(dist / 2) : 1;

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const k = 1 - t;
      const b0 = k * k * k;
      const b1 = 3 * k * k * t;
      const b2 = 3 * k * t * t;
      const b3 = t * t * t;

      subdivided.push([
        b0 * p1[0] + b1 * c1[0] + b2 * c2[0] + b3 * p2[0],
        b0 * p1[1] + b1 * c1[1] + b2 * c2[1] + b3 * p2[1],
        p1[2] + (p2[2] - p1[2]) * t,
      ]);
    }
  }

  let outline: Array<[number, number]>;
  if (nib === "fountain" || nib === "brush") {
    const widths = computeFountainPenThickness(subdivided, baseWidth);
    const leftPts: Array<[number, number]> = [];
    const rightPts: Array<[number, number]> = [];
    const lastIdx = subdivided.length - 1;
    let t0x = 1;
    let t0y = 0;
    let n0x = 0;
    let n0y = 1;
    let r0 = 0.5;
    let tEndX = 1;
    let tEndY = 0;
    let nEndX = 0;
    let nEndY = 1;
    let rEnd = 0.5;

    for (let i = 0; i < subdivided.length; i++) {
      const p0 = subdivided[Math.max(0, i - 1)];
      const p1 = subdivided[i];
      const p2 = subdivided[Math.min(lastIdx, i + 1)];
      const dx = p2[0] - p0[0];
      const dy = p2[1] - p0[1];
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;
      // Gentle endpoint nib taper while preserving round caps
      const taper =
        i === 0 || i === lastIdx ? 0.72 : i === 1 || i === lastIdx - 1 ? 0.88 : 1;
      const halfWidth = Math.max(0.35, (widths[i] * taper) / 2);
      if (i === 0) {
        t0x = tx;
        t0y = ty;
        n0x = nx;
        n0y = ny;
        r0 = halfWidth;
      }
      if (i === lastIdx) {
        tEndX = tx;
        tEndY = ty;
        nEndX = nx;
        nEndY = ny;
        rEnd = halfWidth;
      }
      leftPts.push([p1[0] + nx * halfWidth, p1[1] + ny * halfWidth]);
      rightPts.push([p1[0] - nx * halfWidth, p1[1] - ny * halfWidth]);
    }

    // 5-point semicircular round caps at both stroke endpoints
    const endPt = subdivided[lastIdx];
    const startPt = subdivided[0];
    const endCap: Array<[number, number]> = [];
    const startCap: Array<[number, number]> = [];
    for (let k = 1; k <= 5; k++) {
      const angle = (k / 6) * Math.PI;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      endCap.push([
        endPt[0] + rEnd * (c * nEndX + s * tEndX),
        endPt[1] + rEnd * (c * nEndY + s * tEndY),
      ]);
      startCap.push([
        startPt[0] - r0 * (c * n0x + s * t0x),
        startPt[1] - r0 * (c * n0y + s * t0y),
      ]);
    }
    outline = leftPts.concat(endCap, rightPts.reverse(), startCap);
  } else {
    outline = generateOutlinePolygon(subdivided, {
      size: baseWidth,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      last: true,
    });
  }

  if (outline.length < 3) return "";

  // Format quadratic Bezier path
  const toWorld = (coord: number) => (coord / scale).toFixed(4);
  const parts = [`M ${toWorld(outline[0][0])} ${toWorld(outline[0][1])} Q`];
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i];
    const [x2, y2] = outline[(i + 1) % outline.length];
    parts.push(
      `${toWorld(x1)} ${toWorld(y1)} ${toWorld((x1 + x2) / 2)} ${toWorld((y1 + y2) / 2)}`
    );
  }
  parts.push("Z");
  return parts.join(" ");
}
