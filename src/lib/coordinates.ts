/**
 * Mathematical Cartesian Coordinate System Utilities for Mathvera Whiteboard.
 * Mathematical space: (0,0) is origin, +X extends right, +Y extends UPWARD.
 * Screen space: (0,0) is viewport top-left, +X extends right, +Y extends DOWNWARD.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ScreenPoint {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
}

export interface ContainerRect {
  left: number;
  top: number;
  width?: number;
  height?: number;
}

export interface ViewportTransform {
  tx: number;
  ty: number;
  scale: number;
}

export const MIN_SCALE = 8;
export const MAX_SCALE = 600;
export const DEFAULT_SCALE = 45;
export const DEFAULT_TX = 500;
export const DEFAULT_TY = 320;
export const WHEEL_ZOOM_SENSITIVITY = 0.0015;
export const GRID_CELL_SIZE = 24;

/**
 * Clamps a numerical value within [min, max] range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts screen client coordinates (e.g. from PointerEvent / MouseEvent)
 * to mathematical Cartesian world coordinates (+X right, +Y UP).
 *
 * Formula:
 *   screenX = clientX - rect.left
 *   screenY = clientY - rect.top
 *   worldX  = (screenX - tx) / scale
 *   worldY  = -((screenY - ty) / scale)
 */
export function screenToWorld(
  clientX: number,
  clientY: number,
  tx: number,
  ty: number,
  scale: number,
  rect?: ContainerRect | null
): Point {
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  const screenX = clientX - left;
  const screenY = clientY - top;

  return {
    x: (screenX - tx) / scale,
    y: -((screenY - ty) / scale),
  };
}

/**
 * Converts mathematical Cartesian world coordinates (+X right, +Y UP)
 * to screen client coordinates and container-relative screen coordinates.
 *
 * Formula:
 *   screenX = tx + worldX * scale
 *   screenY = ty - worldY * scale
 *   clientX = rect.left + screenX
 *   clientY = rect.top + screenY
 */
export function worldToScreen(
  x: number,
  y: number,
  tx: number,
  ty: number,
  scale: number,
  rect?: ContainerRect | null
): ScreenPoint {
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  const screenX = tx + x * scale;
  const screenY = ty - y * scale;

  return {
    screenX,
    screenY,
    clientX: left + screenX,
    clientY: top + screenY,
  };
}

/**
 * Calculates exponential zoom centered precisely on a screen coordinate.
 * Guarantees that the world point under (clientX, clientY) remains completely
 * stationary before and after the zoom transformation.
 */
export function calculateZoomAtPoint(
  clientX: number,
  clientY: number,
  deltaY: number,
  currentTx: number,
  currentTy: number,
  currentScale: number,
  rect?: ContainerRect | null,
  sensitivity: number = WHEEL_ZOOM_SENSITIVITY,
  minScale: number = MIN_SCALE,
  maxScale: number = MAX_SCALE
): ViewportTransform {
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  const screenX = clientX - left;
  const screenY = clientY - top;

  const zoomFactor = Math.exp(-deltaY * sensitivity);
  const newScale = clamp(currentScale * zoomFactor, minScale, maxScale);

  if (newScale === currentScale) {
    return { tx: currentTx, ty: currentTy, scale: currentScale };
  }

  const xe = (screenX - currentTx) / currentScale;
  const we = (screenY - currentTy) / currentScale;

  return {
    scale: newScale,
    tx: screenX - xe * newScale,
    ty: screenY - we * newScale,
  };
}

/**
 * Calculates dual-finger pinch-to-zoom and simultaneous translation.
 * Ensures the midpoint between fingers maps continuously to the same world coordinate.
 */
export function calculatePinchTransform(
  p1: Point,
  p2: Point,
  dist0: number,
  scale0: number,
  tx0: number,
  ty0: number,
  rect?: ContainerRect | null,
  minScale: number = MIN_SCALE,
  maxScale: number = MAX_SCALE
): ViewportTransform {
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;

  const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
  const midX = (p1.x + p2.x) / 2 - left;
  const midY = (p1.y + p2.y) / 2 - top;

  const newScale = clamp(scale0 * (currentDist / dist0), minScale, maxScale);
  const qg = (midX - tx0) / scale0;
  const gn = (midY - ty0) / scale0;

  return {
    scale: newScale,
    tx: midX - qg * newScale,
    ty: midY - gn * newScale,
  };
}

/**
 * Computes pattern offset modulo 24 with positive normalization.
 */
export function getPatternOffset(
  tx: number,
  ty: number,
  cellSize: number = GRID_CELL_SIZE
): { x: number; y: number } {
  return {
    x: ((tx % cellSize) + cellSize) % cellSize,
    y: ((ty % cellSize) + cellSize) % cellSize,
  };
}

/**
 * Converts screen distance to mathematical units.
 */
export function screenToWorldDistance(screenPixels: number, scale: number): number {
  return screenPixels / scale;
}

/**
 * Converts mathematical units to screen pixels.
 */
export function worldToScreenDistance(mathUnits: number, scale: number): number {
  return mathUnits * scale;
}
