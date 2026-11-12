/**
 * Free-Body Force Diagram (FBD) solver with Ox/Oy incline plane projections
 * and resultant force / acceleration calculator.
 */

import type { ForceVectorItem, PhysicsDiagramProps } from "@/types/physics";

export interface ForceProjectionResult {
  fx: number;
  fy: number;
  resultantMag: number;
  resultantWorldAngleDeg: number;
  accelMs2: number;
  projections: Array<{
    id: string;
    symbol: string;
    fxLocal: number;
    fyLocal: number;
    fxWorld: number;
    fyWorld: number;
  }>;
}

/**
 * Computes projections of each force onto axes rotated by `-inclineDeg`
 * (so Ox points down-right along the incline when inclineDeg > 0, and Oy points normal outward).
 */
export function solveForceDiagram(
  forces: ForceVectorItem[],
  massKg: number,
  inclineDeg: number
): ForceProjectionResult {
  // World incline angle: surface tilts downward to the right by `inclineDeg`
  const axisAngleRad = (-inclineDeg * Math.PI) / 180;
  const ux = Math.cos(axisAngleRad);
  const uy = Math.sin(axisAngleRad);
  const nx = -uy;
  const ny = ux;

  let sumX = 0;
  let sumY = 0;
  const projections = forces.map((f) => {
    const rad = (f.angleDeg * Math.PI) / 180;
    const wx = f.magnitude * Math.cos(rad);
    const wy = f.magnitude * Math.sin(rad);
    const fxLocal = wx * ux + wy * uy;
    const fyLocal = wx * nx + wy * ny;
    sumX += wx;
    sumY += wy;
    return {
      id: f.id,
      symbol: f.symbol,
      fxLocal,
      fyLocal,
      fxWorld: fxLocal * ux,
      fyWorld: fxLocal * uy,
    };
  });

  const resultantMag = Math.hypot(sumX, sumY);
  const resultantWorldAngleDeg = (Math.atan2(sumY, sumX) * 180) / Math.PI;
  const m = Math.max(0.1, massKg || 1);

  return {
    fx: sumX * ux + sumY * uy,
    fy: sumX * nx + sumY * ny,
    resultantMag,
    resultantWorldAngleDeg,
    accelMs2: resultantMag / m,
    projections,
  };
}

export function createDefaultFbdDiagramProps(): Extract<
  PhysicsDiagramProps,
  { diagramKind: "fbd" }
> {
  const m = 2;
  const alpha = 30;
  const g = 9.8;
  const rad = (alpha * Math.PI) / 180;
  const P = Number((m * g).toFixed(1));
  const N = Number((P * Math.cos(rad)).toFixed(1));
  const fms = Number((0.15 * N).toFixed(1));

  return {
    diagramKind: "fbd",
    massKg: m,
    inclineDeg: alpha,
    showAxesProjection: true,
    showResultant: true,
    forces: [
      { id: "f_P", symbol: "\\vec{P}", angleDeg: -90, magnitude: P, color: "#dc2626" },
      { id: "f_N", symbol: "\\vec{N}", angleDeg: 90 - alpha, magnitude: N, color: "#2563eb" },
      { id: "f_ms", symbol: "\\vec{F}_{ms}", angleDeg: 180 - alpha, magnitude: fms, color: "#d97706" },
    ],
    width: 9.6,
    height: 6.4,
  };
}
