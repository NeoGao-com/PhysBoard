/**
 * Ray Optics solver for converging/diverging lenses and concave/convex mirrors.
 * Computes exact image position, magnification, nature, and 3 principal rays.
 */

import type { OpticsDeviceKind, PhysicsDiagramProps } from "@/types/physics";

export interface OpticsRaySegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
  color: string;
}

export interface OpticsSolution {
  signedFocalCm: number;
  dCm: number;
  dPrimeCm: number | null;
  k: number | null;
  imageHeightCm: number | null;
  isRealImage: boolean;
  isUpright: boolean;
  isAtFocus: boolean;
  summaryText: string;
  rays: OpticsRaySegment[];
}

export function isLensDevice(device: OpticsDeviceKind): boolean {
  return device === "converging_lens" || device === "diverging_lens";
}

export function getSignedFocalLength(device: OpticsDeviceKind, focalMagCm: number): number {
  const f = Math.max(4, Math.abs(focalMagCm));
  if (device === "converging_lens" || device === "concave_mirror") return f;
  return -f;
}

export function solveOpticsDiagram(
  device: OpticsDeviceKind,
  focalMagCm: number,
  objectDistCm: number,
  objectHeightCm: number
): OpticsSolution {
  const f = getSignedFocalLength(device, focalMagCm);
  const d = Math.max(2, objectDistCm);
  const h = objectHeightCm;
  const isLens = isLensDevice(device);
  const objX = -d;
  const objY = h;

  const isAtFocus = Math.abs(d - Math.abs(f)) < 0.25 && f > 0;
  const denom = d - f;
  const dPrimeCm = Math.abs(denom) < 1e-4 ? null : (d * f) / denom;
  const k = dPrimeCm !== null ? -dPrimeCm / d : null;
  const imageHeightCm = k !== null ? k * h : null;
  const isRealImage = dPrimeCm !== null && dPrimeCm > 0;
  const isUpright = k !== null && k > 0;

  // Image coordinate in optical-center-origin coords (object always on left x = -d)
  // For lenses: real image is on right (+d'); virtual image is on left (+d' < 0 => x = d').
  // For mirrors: real image is in front on left (-d'); virtual image is behind on right (-d' > 0).
  const imgX =
    dPrimeCm === null
      ? null
      : isLens
        ? dPrimeCm
        : -dPrimeCm;
  const imgY = imageHeightCm;

  const rays: OpticsRaySegment[] = [];
  const xMin = -55;
  const xMax = 55;

  // Ray 1 (Blue): Through optical center O (lenses) or vertex / C (mirrors)
  if (isLens) {
    const slope = objY / objX; // passes through (0,0)
    rays.push({
      x1: objX,
      y1: objY,
      x2: xMax,
      y2: slope * xMax,
      color: "#2563eb",
    });
    if (!isRealImage && imgX !== null) {
      rays.push({
        x1: objX,
        y1: objY,
        x2: imgX,
        y2: slope * imgX,
        dashed: true,
        color: "#2563eb",
      });
    }
  } else {
    // Mirror Ray 1: to vertex O(0,0) reflects symmetrically
    const slopeIn = objY / objX;
    rays.push({ x1: objX, y1: objY, x2: 0, y2: 0, color: "#2563eb" });
    rays.push({ x1: 0, y1: 0, x2: xMin, y2: -slopeIn * xMin, color: "#2563eb" });
    if (!isRealImage && imgX !== null && imgY !== null) {
      rays.push({
        x1: 0,
        y1: 0,
        x2: imgX,
        y2: imgY,
        dashed: true,
        color: "#2563eb",
      });
    }
  }

  // Ray 2 (Red): Parallel to principal axis -> hits device at (0, objY) -> goes through F'
  rays.push({ x1: objX, y1: objY, x2: 0, y2: objY, color: "#dc2626" });
  if (isLens) {
    // Refracted ray passes through F'(f, 0) (or appears from F'(f, 0) when f < 0)
    const fX = f;
    const slope2 = fX > 0 ? (0 - objY) / (fX - 0) : (objY - 0) / (0 - fX);
    rays.push({
      x1: 0,
      y1: objY,
      x2: xMax,
      y2: objY + slope2 * xMax,
      color: "#dc2626",
    });
    if (f < 0 || (!isRealImage && imgX !== null)) {
      const targetX = imgX !== null && imgX < 0 ? Math.min(fX, imgX) : fX;
      rays.push({
        x1: 0,
        y1: objY,
        x2: targetX,
        y2: objY + slope2 * targetX,
        dashed: true,
        color: "#dc2626",
      });
    }
  } else {
    // Mirror: F is at x = -f (left for concave f>0, right for convex f<0)
    const fX = -f;
    const slope2 = fX < 0 ? (0 - objY) / (fX - 0) : (objY - 0) / (0 - fX);
    rays.push({
      x1: 0,
      y1: objY,
      x2: xMin,
      y2: objY + slope2 * xMin,
      color: "#dc2626",
    });
    if (f < 0 || (!isRealImage && imgX !== null)) {
      const targetX = imgX !== null && imgX > 0 ? Math.max(fX, imgX) : fX;
      rays.push({
        x1: 0,
        y1: objY,
        x2: targetX,
        y2: objY + slope2 * targetX,
        dashed: true,
        color: "#dc2626",
      });
    }
  }

  // Ray 3 (Green): Through object focus F -> emerges parallel to axis at imgY
  if (dPrimeCm !== null && imgY !== null && Math.abs(imgY) < 40) {
    const hitY = imgY;
    rays.push({ x1: objX, y1: objY, x2: 0, y2: hitY, color: "#16a34a" });
    if (isLens) {
      rays.push({ x1: 0, y1: hitY, x2: xMax, y2: hitY, color: "#16a34a" });
      if (!isRealImage && imgX !== null) {
        rays.push({ x1: 0, y1: hitY, x2: imgX, y2: hitY, dashed: true, color: "#16a34a" });
      }
    } else {
      rays.push({ x1: 0, y1: hitY, x2: xMin, y2: hitY, color: "#16a34a" });
      if (!isRealImage && imgX !== null) {
        rays.push({ x1: 0, y1: hitY, x2: imgX, y2: hitY, dashed: true, color: "#16a34a" });
      }
    }
  }

  const summaryText = isAtFocus || dPrimeCm === null
    ? "Vật tại tiêu điểm (d = f): Ảnh ở vô cực"
    : `${isRealImage ? "Ảnh thật" : "Ảnh ảo"}, ${isUpright ? "cùng chiều" : "ngược chiều"}, ${
        Math.abs(k ?? 1) > 1.02 ? "lớn hơn vật" : Math.abs(k ?? 1) < 0.98 ? "nhỏ hơn vật" : "bằng vật"
      }`;

  return {
    signedFocalCm: f,
    dCm: d,
    dPrimeCm,
    k,
    imageHeightCm,
    isRealImage,
    isUpright,
    isAtFocus,
    summaryText,
    rays,
  };
}

export function createDefaultOpticsDiagramProps(
  device: OpticsDeviceKind = "converging_lens"
): Extract<PhysicsDiagramProps, { diagramKind: "optics" }> {
  return {
    diagramKind: "optics",
    device,
    focalCm: 14,
    objectDistCm: 24,
    objectHeightCm: 8,
    width: 10.8,
    height: 6.4,
  };
}
