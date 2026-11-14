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
    public minCutoff: number = 1.2,
    public beta: number = 0.06,
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
 * Catmull-Rom cubic Bezier path generation (verbatim Hft).
 * Converts flat [x0, y0, x1, y1, ...] points into an SVG path string.
 * Flips Math World Y to SVG Y via `-y`.
 */
export function generateCatmullRomSpline(flatPoints: number[]): string {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < flatPoints.length; i += 2) {
    const x = flatPoints[i];
    const y = -flatPoints[i + 1]; // Invert Math Y to SVG Y
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(x - prev.x, y - prev.y) >= 1e-6) {
      pts.push({ x, y });
    }
  }

  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} l 0.0001 0`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  const commands = [`M ${pts[0].x.toFixed(3)} ${pts[0].y.toFixed(3)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    commands.push(
      `C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)} ${cp2x.toFixed(3)} ${cp2y.toFixed(3)} ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`
    );
  }

  return commands.join(" ");
}

/**
 * Calligraphy Fountain Pen dynamic thickness calculation (verbatim DLe).
 * Evaluates direction relative to 15° slant angle, speed, and pressure.
 */
const FOUNTAIN_NIB_ANGLE_DEG = 15;
const MIN_WIDTH_FACTOR = 0.35;
const MAX_WIDTH_FACTOR = 1.7;

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
  const rawPts: Array<[number, number, number]> = [];
  for (let i = 0; i + 1 < flatPoints.length; i += 2) {
    const x = flatPoints[i] * scale;
    const y = -flatPoints[i + 1] * scale;
    const prev = rawPts[rawPts.length - 1];
    if (!prev || Math.hypot(x - prev[0], y - prev[1]) >= 1e-6) {
      rawPts.push([x, y, pressures?.[i / 2] ?? 0.5]);
    }
  }

  if (rawPts.length === 0) return "";

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
    if (subdivided.length === 1) {
      const [x, y] = subdivided[0];
      const r = Math.max(0.5, baseWidth / 2);
      outline = [
        [x - r, y],
        [x, y - r],
        [x + r, y],
        [x, y + r],
      ];
    } else {
      const leftPts: Array<[number, number]> = [];
      const rightPts: Array<[number, number]> = [];
      const lastIdx = subdivided.length - 1;
      for (let i = 0; i < subdivided.length; i++) {
        const p0 = subdivided[Math.max(0, i - 1)];
        const p1 = subdivided[i];
        const p2 = subdivided[Math.min(lastIdx, i + 1)];
        const dx = p2[0] - p0[0];
        const dy = p2[1] - p0[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        // Gentle endpoint nib taper while honoring exact directional width
        const taper =
          i === 0 || i === lastIdx ? 0.65 : i === 1 || i === lastIdx - 1 ? 0.85 : 1;
        const halfWidth = Math.max(0.35, (widths[i] * taper) / 2);
        leftPts.push([p1[0] + nx * halfWidth, p1[1] + ny * halfWidth]);
        rightPts.push([p1[0] - nx * halfWidth, p1[1] - ny * halfWidth]);
      }
      outline = leftPts.concat(rightPts.reverse());
    }
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
