import { CanvasElement } from "@/types/whiteboard";
import {
  type CircleRadiusSpec,
  type EmbeddedVertex,
  type Point2D,
  footOfPerpendicular,
  midpoint2D,
  pointInPolygon2D,
  resolveCircleRadius,
  resolveFillRegionPolygon,
  resolveLineEndpoints,
} from "@/lib/geometry";
import {
  type Solid3DKind,
  type Solid3DProps,
  computeSolidWireframe,
  solveGeometry3D,
} from "@/lib/geometry3d";
import { getElementBoundingBox, hydrateInlinePoints } from "@/lib/selection";

/**
 * Distance from point (px, py) to line segment (x1, y1)-(x2, y2).
 */
export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(px - x1, py - y1);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Checks contact eraser collision against all canvas objects.
 * Thresholds:
 * - Ink points/segments: 12px on screen (12 / scale in world units)
 * - Canvas objects (2D/3D geometry, MathText, Image, Table, Plots, Charts, RealObject): 24px on screen (24 / scale in world units)
 * Returns array of deleted object IDs.
 */
export function checkEraserCollision(
  cursorWorld: { x: number; y: number },
  elements: CanvasElement[],
  scale: number,
  onDelete: (id: string) => void
): string[] {
  const safeScale = Math.max(1, scale || 45);
  const inkThreshold = 12 / safeScale;
  const objectThreshold = 24 / safeScale;
  const deletedIds: string[] = [];

  const byId = new Map(elements.map((el) => [el.id, el]));
  const rawSolved = solveGeometry3D(elements);
  const solved = {
    ...rawSolved,
    pts: hydrateInlinePoints(elements, rawSolved.pts),
  };

  for (const el of elements) {
    if (el.style?.hidden) continue;
    let isHit = false;

    if (el.type === "Ink") {
      const points = (el.props?.points as number[]) ?? [];
      const elScale = el.transform.scale || 1;
      const tx = el.transform.x || 0;
      const ty = el.transform.y || 0;

      for (let i = 0; i + 1 < points.length && !isHit; i += 2) {
        const p1x = tx + points[i] * elScale;
        const p1y = ty + points[i + 1] * elScale;

        if (
          Math.hypot(p1x - cursorWorld.x, p1y - cursorWorld.y) <= inkThreshold
        ) {
          isHit = true;
          break;
        }

        if (i + 3 < points.length) {
          const p2x = tx + points[i + 2] * elScale;
          const p2y = ty + points[i + 3] * elScale;
          if (
            pointToSegmentDistance(
              cursorWorld.x,
              cursorWorld.y,
              p1x,
              p1y,
              p2x,
              p2y
            ) <= inkThreshold
          ) {
            isHit = true;
            break;
          }
        }
      }
    } else if (el.type === "Point" || el.type === "GeomPoint") {
      const pt = solved.pts.get(el.id) ?? {
        x: el.transform.x,
        y: el.transform.y,
      };
      isHit =
        Math.hypot(pt.x - cursorWorld.x, pt.y - cursorWorld.y) <=
        objectThreshold;
    } else if (
      el.type === "GeomSegment" ||
      el.type === "GeomVector" ||
      el.type === "GeomRay" ||
      el.type === "GeomLine"
    ) {
      const ends = resolveLineEndpoints(el, solved.pts, byId);
      if (ends) {
        isHit =
          pointToSegmentDistance(
            cursorWorld.x,
            cursorWorld.y,
            ends[0].x,
            ends[0].y,
            ends[1].x,
            ends[1].y
          ) <= objectThreshold;
      }
    } else if (el.type === "GeomConstruction") {
      const p = el.props as Record<string, unknown>;
      const resolvePt = (ref: unknown, inline: unknown): Point2D | undefined => {
        if (typeof ref === "string" && solved.pts.has(ref)) {
          return solved.pts.get(ref);
        }
        if (
          inline &&
          typeof inline === "object" &&
          typeof (inline as Point2D).x === "number"
        ) {
          return inline as Point2D;
        }
        return undefined;
      };
      const pFrom = resolvePt(p.from ?? p.vertex, p.fromPt);
      const pSideA = resolvePt(p.sideA, p.sideAPt);
      const pSideB = resolvePt(p.sideB, p.sideBPt);
      let pTo = resolvePt(p.to ?? p.foot, p.toPt);
      if (!pTo && pFrom && pSideA && pSideB) {
        pTo =
          p.kind === "median"
            ? midpoint2D(pSideA, pSideB)
            : footOfPerpendicular(pFrom, pSideA, pSideB) ?? undefined;
      }
      if (pFrom && pTo) {
        isHit =
          pointToSegmentDistance(
            cursorWorld.x,
            cursorWorld.y,
            pFrom.x,
            pFrom.y,
            pTo.x,
            pTo.y
          ) <= objectThreshold;
      }
    } else if (el.type === "GeomCircle") {
      const center = solved.pts.get(String(el.props.center ?? ""));
      const r = center
        ? resolveCircleRadius(
            el.props.radius as CircleRadiusSpec | undefined,
            center,
            (id) => solved.pts.get(id)
          )
        : null;
      if (center && r !== null) {
        const dCenter = Math.hypot(
          cursorWorld.x - center.x,
          cursorWorld.y - center.y
        );
        isHit =
          Math.abs(dCenter - r) <= objectThreshold ||
          dCenter <= objectThreshold;
      }
    } else if (el.type === "GeomPolygon") {
      const coords: Point2D[] = [];
      if (Array.isArray(el.props.points)) {
        for (const v of el.props.points as EmbeddedVertex[]) {
          coords.push({
            x: v.x + el.transform.x,
            y: v.y + el.transform.y,
          });
        }
      } else if (Array.isArray(el.props.vertices)) {
        for (const vid of el.props.vertices as string[]) {
          const p = solved.pts.get(vid);
          if (p) coords.push(p);
        }
      }
      if (coords.length >= 3) {
        if (pointInPolygon2D(coords, cursorWorld)) {
          isHit = true;
        } else {
          for (let i = 0; i < coords.length; i++) {
            const a = coords[i];
            const b = coords[(i + 1) % coords.length];
            if (
              pointToSegmentDistance(
                cursorWorld.x,
                cursorWorld.y,
                a.x,
                a.y,
                b.x,
                b.y
              ) <= objectThreshold
            ) {
              isHit = true;
              break;
            }
          }
        }
      }
    } else if (el.type === "FillRegion") {
      const region = resolveFillRegionPolygon(
        el,
        solved.pts,
        byId,
        solved.p3
      );
      if (region && pointInPolygon2D(region.outer, cursorWorld)) {
        isHit = true;
      }
    } else if (el.type === "Solid3D") {
      const props = el.props as Partial<Solid3DProps>;
      const kind = (props.kind ?? "pyramid") as Solid3DKind;
      const ptIds = Array.isArray(props.points) ? props.points : [];
      const inlineCoords = Array.isArray(props.pointCoords)
        ? props.pointCoords
        : [];
      const resolved2D: Point2D[] = [];
      for (let i = 0; i < ptIds.length; i++) {
        const pt = solved.pts.get(ptIds[i]);
        if (pt) {
          resolved2D.push(pt);
        } else if (inlineCoords[i]) {
          resolved2D.push({
            x: inlineCoords[i].x + el.transform.x,
            y: inlineCoords[i].y + el.transform.y,
          });
        }
      }
      if (resolved2D.length > 0) {
        const wireframe = computeSolidWireframe(
          kind,
          resolved2D,
          typeof props.r === "number" ? props.r : 1.3
        );
        const allLines = [...wireframe.solid, ...wireframe.dashed];
        for (const poly of allLines) {
          for (let i = 0; i + 1 < poly.length; i++) {
            if (
              pointToSegmentDistance(
                cursorWorld.x,
                cursorWorld.y,
                poly[i].x,
                poly[i].y,
                poly[i + 1].x,
                poly[i + 1].y
              ) <= objectThreshold
            ) {
              isHit = true;
              break;
            }
          }
          if (isHit) break;
        }
        if (!isHit) {
          const box = getElementBoundingBox(el, {
            solved,
            byId,
            allElements: elements,
            viewScale: safeScale,
          });
          isHit =
            cursorWorld.x >= box.minX - objectThreshold &&
            cursorWorld.x <= box.maxX + objectThreshold &&
            cursorWorld.y >= box.minY - objectThreshold &&
            cursorWorld.y <= box.maxY + objectThreshold;
        }
      }
    } else {
      const box = getElementBoundingBox(el, {
        solved,
        byId,
        allElements: elements,
        viewScale: safeScale,
      });
      isHit =
        cursorWorld.x >= box.minX - objectThreshold &&
        cursorWorld.x <= box.maxX + objectThreshold &&
        cursorWorld.y >= box.minY - objectThreshold &&
        cursorWorld.y <= box.maxY + objectThreshold;
    }

    if (isHit) {
      deletedIds.push(el.id);
      onDelete(el.id);
    }
  }

  return deletedIds;
}
