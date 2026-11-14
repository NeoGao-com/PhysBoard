/**
 * Virtual Instruments helper utilities for Math & Physics teaching:
 * - Ruler (Thước thẳng) with edge snapping for ink/line strokes
 * - Set Square (Êke) with 30-60-90 and 45-45-90 angles & perpendicular snapping
 * - Protractor (Thước đo góc) with 180° / 360° readout
 * - Compass (Compa) with needle anchor, pencil leg, radius adjustment & arc drawing
 */

import type { CanvasElement } from "@/types/whiteboard";
import type { PhysicsInstrumentProps } from "@/types/physics";

export interface Point2D {
  x: number;
  y: number;
}

export interface Segment2D {
  p1: Point2D;
  p2: Point2D;
}

/**
 * Projects point P onto line segment AB.
 */
export function projectPointOntoSegment(p: Point2D, a: Point2D, b: Point2D): { point: Point2D; t: number; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) {
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    return { point: { ...a }, t: 0, dist: d };
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
  return { point: proj, t, dist };
}

/**
 * Get the snapping edges of an instrument in math world coordinates.
 */
export function getInstrumentSnapEdges(element: CanvasElement): Segment2D[] {
  if (element.type !== "PhysicsInstrument") return [];
  const props = element.props as unknown as PhysicsInstrumentProps;
  const kind = props.instrumentKind;
  const sc = element.transform.scale || 1;
  const tx = element.transform.x;
  const ty = element.transform.y;
  const rotDeg = element.transform.rotation || 0;
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Helper to transform local instrument coordinate (where Y is down) to math world coordinate (Y up)
  const toWorld = (lx: number, ly: number): Point2D => {
    // In SVG / local: (lx, ly)
    // Rotate by rotDeg (SVG rotation clockwise):
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    // Map to math world: x = tx + rx, y = ty - ry (since SVG canvas Y is down = -ty)
    return {
      x: tx + rx,
      y: ty - ry,
    };
  };

  if (kind === "ruler") {
    const w = (props.width || 8.0) * sc;
    const h = (props.height || 1.4) * sc;
    // Top edge (the graduation measurement edge)
    // Local coords relative to center: x in [-w/2, w/2], top edge y is -h/2
    const p1 = toWorld(-w / 2, -h / 2);
    const p2 = toWorld(w / 2, -h / 2);
    // Bottom edge as secondary snap
    const p3 = toWorld(-w / 2, h / 2);
    const p4 = toWorld(w / 2, h / 2);
    return [
      { p1, p2 },
      { p1: p3, p2: p4 },
    ];
  }

  if (kind === "setsquare") {
    const w = (props.width || 6.5) * sc;
    const h = (props.height || 5.0) * sc;
    // Right triangle vertices in local coordinate (centered at origin):
    // Right angle at bottom-left (-w/2, h/2)
    // Hypotenuse from top-left (-w/2, -h/2) to bottom-right (w/2, h/2)
    const vRight = toWorld(-w / 2, h / 2);
    const vTop = toWorld(-w / 2, -h / 2);
    const vBottom = toWorld(w / 2, h / 2);
    return [
      { p1: vTop, p2: vRight }, // Vertical leg (perpendicular 1)
      { p1: vRight, p2: vBottom }, // Horizontal leg (perpendicular 2)
      { p1: vTop, p2: vBottom }, // Hypotenuse
    ];
  }

  return [];
}

/**
 * Snap a point to any nearby ruler or set-square edge if within threshold (world units).
 */
export function snapPointToInstruments(
  pt: Point2D,
  instruments: CanvasElement[],
  threshold = 0.35
): { snapped: Point2D; didSnap: boolean; edge?: Segment2D } {
  let closestDist = threshold;
  let bestPt: Point2D = pt;
  let didSnap = false;
  let bestEdge: Segment2D | undefined;

  for (const inst of instruments) {
    const edges = getInstrumentSnapEdges(inst);
    for (const edge of edges) {
      const proj = projectPointOntoSegment(pt, edge.p1, edge.p2);
      if (proj.dist < closestDist) {
        closestDist = proj.dist;
        bestPt = proj.point;
        didSnap = true;
        bestEdge = edge;
      }
    }
  }

  return { snapped: bestPt, didSnap, edge: bestEdge };
}
