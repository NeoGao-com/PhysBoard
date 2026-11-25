"use client";

import React, { useCallback } from "react";
import type {
  CanvasElement,
  Style,
  WhiteboardTool,
} from "@/types/whiteboard";
import type { ViewportTransform } from "@/lib/coordinates";
import type { WhiteboardCommandDispatcher } from "@/lib/dispatcher";
import {
  bisectorFoot2D,
  centroid2D,
  circumcenter2D,
  dist2D,
  footOfPerpendicular,
  getConstructMarksEnabled,
  getNextPointName,
  getNextPointNames,
  incenter2D,
  intersectLineCircleAt,
  intersectLines2D,
  midpoint2D,
  orthocenter2D,
  pointInPolygon2D,
  reflectPointOverLine,
  reflectPointOverPoint,
  resolveCircleRadius,
  resolveLineEndpoints,
  resolveLineGeometry,
  snapPointToObject,
  tangentPointToCircle,
  type EmbeddedVertex,
  type Point2D,
  type PointConstraint,
} from "@/lib/geometry";
import {
  buildSpatialConstructionElements,
  computeFlattenedFace,
  computeUnfoldedPolyhedronNet,
  createPlaneParallelogramElements,
  extractPolyhedronEdges,
  liftSolidTo3D,
  skewLineClosest,
  type Solved3DScene,
  type Solid3DKind,
} from "@/lib/geometry3d";

export interface PickedGeometryItem {
  kind: "point" | "segment" | "circle" | "solidFace";
  id?: string;
  pos: Point2D;
  segA?: Point2D;
  segB?: Point2D;
  segAId?: string;
  segBId?: string;
  polygonId?: string;
  faceIds?: string[];
}

export interface UseGeometryBuilderOptions {
  dispatcher: WhiteboardCommandDispatcher;
  viewport: ViewportTransform;
  byId: Map<string, CanvasElement>;
  hydratedPts: Map<string, Point2D>;
  solved3D: Solved3DScene;
  pageElements: CanvasElement[];
  currentStyle: Style;
  a4Opt?: { widthWorld: number; heightWorld: number } | null;
  draftPolygonPts: Point2D[];
  setDraftPolygonPts: React.Dispatch<React.SetStateAction<Point2D[]>>;
  pickedItems: PickedGeometryItem[];
  setPickedItems: React.Dispatch<React.SetStateAction<PickedGeometryItem[]>>;
  setStatusHint: (hint: string | null) => void;
  setActiveTool: (tool: WhiteboardTool) => void;
  resetToolAfterCreation: () => void;
  setAngleDialog: React.Dispatch<
    React.SetStateAction<{ vertexId: string; armId: string; vertexPos: Point2D; armPos: Point2D } | null>
  >;
}

function newElId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function distToSeg(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Encapsulates 2D/3D geometry snapping, two-point shape creation, polygon commit,
 * and multi-step construction tool handling for Whiteboard.
 */
export function useGeometryBuilder(opts: UseGeometryBuilderOptions) {
  const {
    dispatcher,
    viewport,
    byId,
    hydratedPts,
    solved3D,
    pageElements,
    currentStyle,
    a4Opt,
    draftPolygonPts,
    setDraftPolygonPts,
    pickedItems,
    setPickedItems,
    setStatusHint,
    resetToolAfterCreation,
    setAngleDialog,
  } = opts;

  const commitDraftPolygon = useCallback(() => {
    if (draftPolygonPts.length < 3) return;
    const polyId = newElId("poly");
    const names = getNextPointNames(draftPolygonPts.length, pageElements);
    const marksEnabled = getConstructMarksEnabled();
    const embedded: EmbeddedVertex[] = draftPolygonPts.map((pt, i) => ({
      id: `${polyId}_v${i}`,
      name: names[i] ?? `P${i + 1}`,
      x: pt.x,
      y: pt.y,
    }));
    dispatcher.dispatch({
      type: "object.create",
      params: {
        id: polyId,
        type: "GeomPolygon",
        style: {
          stroke: currentStyle.stroke ?? "#2563eb",
          fill: "rgba(37,99,235,0.06)",
          width: currentStyle.width ?? 2,
          dash: currentStyle.dash ?? false,
        },
        props: {
          vertices: embedded.map((v) => v.id),
          points: embedded,
          marksEnabled,
        },
      },
    });
    setDraftPolygonPts([]);
    resetToolAfterCreation();
    setStatusHint(null);
  }, [
    draftPolygonPts,
    pageElements,
    dispatcher,
    currentStyle,
    resetToolAfterCreation,
    setDraftPolygonPts,
    setStatusHint,
  ]);

  const findNearestPoint = useCallback(
    (worldPos: Point2D, maxScreenPx = 24) => {
      const thresh = maxScreenPx / (viewport.scale || 45);
      let best: {
        id: string;
        pos: Point2D;
        dist: number;
        polygonId?: string;
      } | null = null;

      // 1. Standalone Point / GeomPoint
      for (const el of pageElements) {
        if (el.style?.hidden) continue;
        if (el.type === "GeomPoint" || el.type === "Point") {
          const p = hydratedPts.get(el.id) ?? {
            x: el.transform.x,
            y: el.transform.y,
          };
          const d = dist2D(worldPos, p);
          if (d <= thresh && (!best || d < best.dist)) {
            best = { id: el.id, pos: p, dist: d };
          }
        }
        // 2. Embedded polygon vertices
        if (el.type === "GeomPolygon" && Array.isArray(el.props.points)) {
          for (const v of el.props.points as EmbeddedVertex[]) {
            const p = { x: v.x + el.transform.x, y: v.y + el.transform.y };
            const d = dist2D(worldPos, p);
            if (d <= thresh && (!best || d < best.dist)) {
              best = { id: v.id, pos: p, dist: d, polygonId: el.id };
            }
          }
        }
        // 3. 3D Solid vertices
        if (el.type === "Solid3D" && Array.isArray(el.props.points)) {
          const ptIds = el.props.points as string[];
          const coords = Array.isArray(el.props.pointCoords)
            ? (el.props.pointCoords as Point2D[])
            : [];
          for (let i = 0; i < ptIds.length; i++) {
            const p =
              hydratedPts.get(ptIds[i]) ??
              (coords[i]
                ? {
                    x: coords[i].x + el.transform.x,
                    y: coords[i].y + el.transform.y,
                  }
                : undefined);
            if (!p) continue;
            const d = dist2D(worldPos, p);
            if (d <= thresh && (!best || d < best.dist)) {
              best = { id: ptIds[i], pos: p, dist: d };
            }
          }
        }
      }
      return best;
    },
    [pageElements, hydratedPts, viewport.scale]
  );

  const findNearestEdgeOrSegment = useCallback(
    (worldPos: Point2D, maxScreenPx = 28) => {
      const thresh = maxScreenPx / (viewport.scale || 45);
      let best: {
        id: string;
        a: Point2D;
        b: Point2D;
        aId?: string;
        bId?: string;
        dist: number;
        polygonId?: string;
      } | null = null;

      for (const el of pageElements) {
        if (el.style?.hidden) continue;
        if (
          el.type === "GeomSegment" ||
          el.type === "GeomLine" ||
          el.type === "GeomRay" ||
          el.type === "GeomVector"
        ) {
          const ends = resolveLineEndpoints(el, hydratedPts, byId);
          if (ends) {
            const d = distToSeg(worldPos, ends[0], ends[1]);
            if (d <= thresh && (!best || d < best.dist)) {
              best = {
                id: el.id,
                a: ends[0],
                b: ends[1],
                aId: typeof el.props.from === "string" ? el.props.from : undefined,
                bId: typeof el.props.to === "string" ? el.props.to : undefined,
                dist: d,
              };
            }
          }
        }
        if (el.type === "GeomPolygon") {
          const verts: Array<{ id: string; pt: Point2D }> = [];
          if (Array.isArray(el.props.points)) {
            for (const v of el.props.points as EmbeddedVertex[]) {
              verts.push({
                id: v.id,
                pt: { x: v.x + el.transform.x, y: v.y + el.transform.y },
              });
            }
          } else if (Array.isArray(el.props.vertices)) {
            for (const vid of el.props.vertices as string[]) {
              const p = hydratedPts.get(vid);
              if (p) verts.push({ id: vid, pt: p });
            }
          }
          for (let i = 0; i < verts.length; i++) {
            const u = verts[i];
            const v = verts[(i + 1) % verts.length];
            const d = distToSeg(worldPos, u.pt, v.pt);
            if (d <= thresh && (!best || d < best.dist)) {
              best = {
                id: `${el.id}_edge_${i}`,
                a: u.pt,
                b: v.pt,
                aId: u.id,
                bId: v.id,
                dist: d,
                polygonId: el.id,
              };
            }
          }
        }
        if (el.type === "Solid3D" && Array.isArray(el.props.points)) {
          const ptIds = el.props.points as string[];
          const coords = Array.isArray(el.props.pointCoords)
            ? (el.props.pointCoords as Point2D[])
            : [];
          const lift = solved3D.lifts.get(el.id);
          if (lift) {
            const edges = extractPolyhedronEdges(lift);
            for (const [i, j] of edges) {
              const idA = ptIds[i];
              const idB = ptIds[j];
              if (!idA || !idB) continue;
              const pA =
                hydratedPts.get(idA) ??
                (coords[i]
                  ? {
                      x: coords[i].x + el.transform.x,
                      y: coords[i].y + el.transform.y,
                    }
                  : undefined);
              const pB =
                hydratedPts.get(idB) ??
                (coords[j]
                  ? {
                      x: coords[j].x + el.transform.x,
                      y: coords[j].y + el.transform.y,
                    }
                  : undefined);
              if (!pA || !pB) continue;
              const d = distToSeg(worldPos, pA, pB);
              if (d <= thresh && (!best || d < best.dist)) {
                best = {
                  id: `${el.id}_edge_${i}_${j}`,
                  a: pA,
                  b: pB,
                  aId: idA,
                  bId: idB,
                  dist: d,
                };
              }
            }
          }
        }
      }
      return best;
    },
    [pageElements, hydratedPts, byId, solved3D.lifts, viewport.scale]
  );

  const findNearestCircle = useCallback(
    (worldPos: Point2D, maxScreenPx = 28) => {
      const thresh = maxScreenPx / (viewport.scale || 45);
      for (const el of pageElements) {
        if (el.style?.hidden || el.type !== "GeomCircle") continue;
        const centerId = String(el.props.center ?? "");
        const center = hydratedPts.get(centerId);
        if (!center) continue;
        const r = resolveCircleRadius(
          el.props.radius as Parameters<typeof resolveCircleRadius>[0],
          center,
          (id) => hydratedPts.get(id)
        );
        if (r === null) continue;
        if (
          Math.abs(dist2D(worldPos, center) - r) <= thresh ||
          dist2D(worldPos, center) <= thresh
        ) {
          return { el, center, centerId, r };
        }
      }
      return null;
    },
    [pageElements, hydratedPts, viewport.scale]
  );

  const snapPointAtCursor = useCallback(
    (
      worldPos: Point2D,
      maxScreenPx = 16
    ): { point: Point2D; constraint: PointConstraint } => {
      const nearEdge = findNearestEdgeOrSegment(worldPos, maxScreenPx);
      if (nearEdge) {
        const edgeEl = byId.get(nearEdge.id);
        if (edgeEl) {
          const snapped = snapPointToObject(edgeEl, worldPos, hydratedPts, byId);
          if (snapped) {
            return { point: snapped.at, constraint: snapped.constraint };
          }
        }
        const dx = nearEdge.b.x - nearEdge.a.x;
        const dy = nearEdge.b.y - nearEdge.a.y;
        const lenSq = dx * dx + dy * dy;
        if (
          lenSq > 1e-12 &&
          nearEdge.aId &&
          nearEdge.bId &&
          (byId.has(nearEdge.aId) || solved3D.owner.has(nearEdge.aId)) &&
          (byId.has(nearEdge.bId) || solved3D.owner.has(nearEdge.bId))
        ) {
          const t = Math.max(
            0,
            Math.min(
              1,
              ((worldPos.x - nearEdge.a.x) * dx +
                (worldPos.y - nearEdge.a.y) * dy) /
                lenSq
            )
          );
          return {
            point: { x: nearEdge.a.x + t * dx, y: nearEdge.a.y + t * dy },
            constraint: { kind: "onLine", a: nearEdge.aId, b: nearEdge.bId, t },
          };
        }
      }
      const nearCirc = findNearestCircle(worldPos, maxScreenPx);
      if (nearCirc) {
        const snapped = snapPointToObject(
          nearCirc.el,
          worldPos,
          hydratedPts,
          byId
        );
        if (snapped) {
          return { point: snapped.at, constraint: snapped.constraint };
        }
      }
      return { point: worldPos, constraint: { kind: "free" } };
    },
    [findNearestEdgeOrSegment, findNearestCircle, byId, hydratedPts, solved3D.owner]
  );

  // Commit Two-Point Segment / Line / Ray / Vector / Circle
  const commitTwoPointShape = useCallback(
    (
      tool: string,
      p1: Point2D,
      p2: Point2D,
      startSnapId?: string,
      endSnapId?: string
    ) => {
      const dist = dist2D(p1, p2);
      if (dist < 4 / (viewport.scale || 45)) return;

      const startSnap = startSnapId ? null : snapPointAtCursor(p1, 20);
      const endSnap = endSnapId ? null : snapPointAtCursor(p2, 20);
      const rawResolvedP1 = startSnap && startSnap.constraint.kind !== "free" ? startSnap.point : p1;
      const rawResolvedP2 = endSnap && endSnap.constraint.kind !== "free" ? endSnap.point : p2;

      const clampA4 = (pt: Point2D): Point2D => {
        if (!a4Opt) return pt;
        const hw = a4Opt.widthWorld / 2;
        const hh = a4Opt.heightWorld / 2;
        return {
          x: Math.max(-hw, Math.min(hw, pt.x)),
          y: Math.max(-hh, Math.min(hh, pt.y)),
        };
      };
      const resolvedP1 = clampA4(rawResolvedP1);
      const resolvedP2 = clampA4(rawResolvedP2);

      const createSnappedEndpoints = (needStart: boolean, needEnd: boolean) => {
        let sId = startSnapId;
        let eId = endSnapId;
        const usedNames: string[] = [];
        if (needStart && !sId && startSnap && startSnap.constraint.kind !== "free") {
          sId = newElId("pt");
          const sName = getNextPointName(pageElements);
          usedNames.push(sName);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id: sId,
              type: "GeomPoint",
              transform: { x: resolvedP1.x, y: resolvedP1.y, scale: 1, rotation: 0, z: 0 },
              style: { stroke: currentStyle.stroke ?? "#2563eb", width: 2 },
              props: { name: sName, constraint: startSnap.constraint },
            },
          });
        }
        if (needEnd && !eId && endSnap && endSnap.constraint.kind !== "free") {
          eId = newElId("pt");
          let eName = getNextPointName(pageElements);
          if (usedNames.includes(eName)) {
            eName = getNextPointName(pageElements, ["N", "P", "Q", "M", "K"]);
          }
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id: eId,
              type: "GeomPoint",
              transform: { x: resolvedP2.x, y: resolvedP2.y, scale: 1, rotation: 0, z: 0 },
              style: { stroke: currentStyle.stroke ?? "#2563eb", width: 2 },
              props: { name: eName, constraint: endSnap.constraint },
            },
          });
        }
        return { sId, eId };
      };

      dispatcher.batch(() => {
        if (tool === "circle") {
          const id = newElId("circ");
          const { sId, eId } = createSnappedEndpoints(true, true);
          const centerId = sId ?? `${id}_c`;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomCircle",
              style: {
                stroke: currentStyle.stroke ?? "#0891b2",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: {
                center: centerId,
                ...(sId ? {} : { centerPt: resolvedP1 }),
                radius: eId
                  ? { kind: "through", point: eId }
                  : { kind: "value", v: dist2D(resolvedP1, resolvedP2) },
              },
            },
          });
          return;
        }

        const id = newElId("seg");
        const { sId, eId } = createSnappedEndpoints(true, true);
        const fromId = sId ?? `${id}_a`;
        const toId = eId ?? `${id}_b`;
        const commonEndpoints = {
          from: fromId,
          to: toId,
          ...(sId ? {} : { fromPt: resolvedP1 }),
          ...(eId ? {} : { toPt: resolvedP2 }),
        };

        if (tool === "c:vector") {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomVector",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: commonEndpoints,
            },
          });
        } else if (tool === "c:line") {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomLine",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: { def: "through", ...commonEndpoints },
            },
          });
        } else if (tool === "c:ray") {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomRay",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: currentStyle.dash ?? false,
              },
              props: commonEndpoints,
            },
          });
        } else {
          const isDashed = tool === "c:dseg" || currentStyle.dash === true;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomSegment",
              style: {
                stroke: currentStyle.stroke ?? "#334155",
                width: currentStyle.width ?? 2,
                dash: isDashed,
              },
              props: {
                ...commonEndpoints,
                ...(isDashed ? { dashed: true } : {}),
              },
            },
          });
        }
      });
      resetToolAfterCreation();
    },
    [
      dispatcher,
      currentStyle,
      viewport.scale,
      snapPointAtCursor,
      pageElements,
      a4Opt,
      resetToolAfterCreation,
    ]
  );

  const handleConstructionClick = useCallback(
    (tool: string, worldPos: Point2D): boolean => {
      const nearPt = findNearestPoint(worldPos, 28);
      const nearEdge = findNearestEdgeOrSegment(worldPos, 28);
      const nearCirc = findNearestCircle(worldPos, 28);

      // 1. Altitude / Median / Bisector (2-click vertex + opposite edge, OR 3-click A, B, C)
      if (
        tool === "c:altitude" ||
        tool === "c:median" ||
        tool === "c:bisector"
      ) {
        const kind =
          tool === "c:altitude"
            ? "altitude"
            : tool === "c:median"
              ? "median"
              : "bisector";
        const defaultName =
          tool === "c:altitude" ? "H" : tool === "c:median" ? "M" : "D";

        if (pickedItems.length === 0) {
          const pPos = nearPt?.pos ?? worldPos;
          setPickedItems([
            {
              kind: "point",
              id: nearPt?.id,
              pos: pPos,
              polygonId: nearPt?.polygonId,
            },
          ]);
          setStatusHint("Chọn cạnh đối diện hoặc 2 đỉnh của cạnh đối diện");
          return true;
        }

        const first = pickedItems[0];
        if (pickedItems.length === 1) {
          // Ignore edges incident to `first.pos` so clicking near another vertex picks the opposite side
          const validNearEdge =
            nearEdge &&
            dist2D(nearEdge.a, first.pos) > 1e-3 &&
            dist2D(nearEdge.b, first.pos) > 1e-3
              ? nearEdge
              : null;
          let sideA: Point2D | undefined = validNearEdge?.a;
          let sideB: Point2D | undefined = validNearEdge?.b;
          let sideAId = validNearEdge?.aId;
          let sideBId = validNearEdge?.bId;

          if ((!sideA || !sideB) && first.polygonId) {
            const poly = byId.get(first.polygonId);
            if (poly && Array.isArray(poly.props.points)) {
              const vs = poly.props.points as EmbeddedVertex[];
              const others = vs.filter((v) => v.id !== first.id);
              if (others.length === 2) {
                sideA = {
                  x: others[0].x + poly.transform.x,
                  y: others[0].y + poly.transform.y,
                };
                sideB = {
                  x: others[1].x + poly.transform.x,
                  y: others[1].y + poly.transform.y,
                };
                sideAId = others[0].id;
                sideBId = others[1].id;
              }
            }
          }

          const fromTriangleOpp = Boolean(first.polygonId && sideA && sideB);
          if (sideA && sideB && (fromTriangleOpp || !nearPt || Boolean(validNearEdge))) {
            const foot =
              kind === "altitude"
                ? footOfPerpendicular(first.pos, sideA, sideB)
                : kind === "median"
                  ? midpoint2D(sideA, sideB)
                  : bisectorFoot2D(first.pos, sideA, sideB);
            if (foot) {
              const label = getNextPointName(pageElements, [
                defaultName,
                "K",
                "I",
                "E",
                "F",
              ]);
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomConstruction",
                  style: {
                    stroke:
                      kind === "altitude"
                        ? "#dc2626"
                        : kind === "median"
                          ? "#16a34a"
                          : "#2563eb",
                    width: 2,
                  },
                  props: {
                    kind,
                    fromPt: first.pos,
                    toPt: foot,
                    sideAPt: sideA,
                    sideBPt: sideB,
                    ...(first.id ? { from: first.id } : {}),
                    ...(sideAId ? { sideA: sideAId } : {}),
                    ...(sideBId ? { sideB: sideBId } : {}),
                    label,
                  },
                },
              });
              setPickedItems([]);
              setStatusHint(null);
              resetToolAfterCreation();
              return true;
            }
          }

          setPickedItems([
            ...pickedItems,
            { kind: "point", id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
          ]);
          setStatusHint("Chọn điểm thứ hai của cạnh đối diện");
          return true;
        }

        const second = pickedItems[1];
        const thirdPos = nearPt?.pos ?? worldPos;
        const thirdId = nearPt?.id;
        const foot =
          kind === "altitude"
            ? footOfPerpendicular(first.pos, second.pos, thirdPos)
            : kind === "median"
              ? midpoint2D(second.pos, thirdPos)
              : bisectorFoot2D(first.pos, second.pos, thirdPos);
        if (foot) {
          const label = getNextPointName(pageElements, [
            defaultName,
            "K",
            "I",
            "E",
            "F",
          ]);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              style: {
                stroke:
                  kind === "altitude"
                    ? "#dc2626"
                    : kind === "median"
                      ? "#16a34a"
                      : "#2563eb",
                width: 2,
              },
              props: {
                kind,
                fromPt: first.pos,
                toPt: foot,
                sideAPt: second.pos,
                sideBPt: thirdPos,
                ...(first.id ? { from: first.id } : {}),
                ...(second.id ? { sideA: second.id } : {}),
                ...(thirdId ? { sideB: thirdId } : {}),
                label,
              },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 2. Triangle centers (Centroid G, Orthocenter H, Circumcircle, Incircle)
      if (
        tool === "c:centroid" ||
        tool === "c:ortho" ||
        tool === "c:circum" ||
        tool === "c:incircle"
      ) {
        // Check if clicking inside an existing 3-vertex polygon on 1st click
        if (pickedItems.length === 0 && !nearPt) {
          for (const el of pageElements) {
            if (el.type !== "GeomPolygon") continue;
            const verts: Point2D[] = Array.isArray(el.props.points)
              ? (el.props.points as EmbeddedVertex[]).map((v) => ({
                  x: v.x + el.transform.x,
                  y: v.y + el.transform.y,
                }))
              : [];
            if (verts.length === 3 && pointInPolygon2D(verts, worldPos)) {
              const [a, b, c] = verts;
              const center =
                tool === "c:centroid"
                  ? centroid2D(a, b, c)
                  : tool === "c:ortho"
                    ? orthocenter2D(a, b, c)
                    : tool === "c:circum"
                      ? circumcenter2D(a, b, c)
                      : incenter2D(a, b, c);
              if (center) {
                dispatcher.batch(() => {
                  const ptName =
                    tool === "c:centroid"
                      ? "G"
                      : tool === "c:ortho"
                        ? "H"
                        : tool === "c:circum"
                          ? "O"
                          : "I";
                  const ptId = newElId("pt");
                  dispatcher.dispatch({
                    type: "object.create",
                    params: {
                      id: ptId,
                      type: "GeomPoint",
                      transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
                      props: { name: ptName, constraint: { kind: "free" } },
                    },
                  });
                  if (tool === "c:circum" || tool === "c:incircle") {
                    const r =
                      tool === "c:circum"
                        ? dist2D(center, a)
                        : (() => {
                            const f = footOfPerpendicular(center, a, b);
                            return f ? dist2D(center, f) : 1;
                          })();
                    dispatcher.dispatch({
                      type: "object.create",
                      params: {
                        type: "GeomCircle",
                        style: { stroke: "#0891b2", width: 2 },
                        props: { center: ptId, radius: { kind: "value", v: r } },
                      },
                    });
                  }
                });
                setPickedItems([]);
                setStatusHint(null);
                resetToolAfterCreation();
                return true;
              }
            }
          }
        }

        // Check 3D solid centroid if 3 picks belong to a 3D solid
        const ptPos = nearPt?.pos ?? worldPos;
        const nextPicked = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: ptPos },
        ];
        if (nextPicked.length < 3) {
          setPickedItems(nextPicked);
          setStatusHint(`Chọn đỉnh thứ ${nextPicked.length + 1} của tam giác`);
          return true;
        }
        const [pA, pB, pC] = nextPicked;
        if (
          tool === "c:centroid" &&
          pA.id &&
          pB.id &&
          pC.id &&
          solved3D.owner.has(pA.id)
        ) {
          const built = buildSpatialConstructionElements(
            "c:centroid",
            [pA.id, pB.id, pC.id],
            pageElements,
            solved3D
          );
          dispatcher.batch(() => {
            for (const el of built.elements) {
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: el.id,
                  type: el.type,
                  transform: el.transform,
                  style: el.style,
                  props: el.props,
                },
              });
            }
          });
          setPickedItems([]);
          setStatusHint(null);
          resetToolAfterCreation();
          return true;
        }

        const center =
          tool === "c:centroid"
            ? centroid2D(pA.pos, pB.pos, pC.pos)
            : tool === "c:ortho"
              ? orthocenter2D(pA.pos, pB.pos, pC.pos)
              : tool === "c:circum"
                ? circumcenter2D(pA.pos, pB.pos, pC.pos)
                : incenter2D(pA.pos, pB.pos, pC.pos);
        if (center) {
          const ptName =
            tool === "c:centroid"
              ? "G"
              : tool === "c:ortho"
                ? "H"
                : tool === "c:circum"
                  ? "O"
                  : "I";
          const ptId = newElId("pt");
          dispatcher.batch(() => {
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: ptId,
                type: "GeomPoint",
                transform: { x: center.x, y: center.y, scale: 1, rotation: 0, z: 0 },
                props: { name: ptName, constraint: { kind: "free" } },
              },
            });
            if (tool === "c:circum" || tool === "c:incircle") {
              const r =
                tool === "c:circum"
                  ? dist2D(center, pA.pos)
                  : (() => {
                      const f = footOfPerpendicular(center, pA.pos, pB.pos);
                      return f ? dist2D(center, f) : 1;
                    })();
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomCircle",
                  style: { stroke: "#0891b2", width: 2 },
                  props: { center: ptId, radius: { kind: "value", v: r } },
                },
              });
            }
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 3. Midpoint / Perpendicular Bisector
      if (tool === "c:midpoint" || tool === "c:perpbis") {
        if (pickedItems.length === 0 && nearEdge && !nearPt) {
          const mid = midpoint2D(nearEdge.a, nearEdge.b);
          if (tool === "c:midpoint") {
            const name = getNextPointName(pageElements, ["M", "N", "P", "Q"]);
            dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomPoint",
                transform: { x: mid.x, y: mid.y, scale: 1, rotation: 0, z: 0 },
                props: {
                  name,
                  constraint:
                    nearEdge.aId &&
                    nearEdge.bId &&
                    (byId.has(nearEdge.aId) || solved3D.owner.has(nearEdge.aId)) &&
                    (byId.has(nearEdge.bId) || solved3D.owner.has(nearEdge.bId))
                      ? { kind: "midpointOf", a: nearEdge.aId, b: nearEdge.bId }
                      : { kind: "free" },
                },
              },
            });
          } else {
            const dx = nearEdge.b.x - nearEdge.a.x;
            const dy = nearEdge.b.y - nearEdge.a.y;
            const len = Math.hypot(dx, dy) || 1;
            const span = Math.max(1.2, Math.min(len * 0.65, 5.5));
            const nx = -dy / len;
            const ny = dx / len;
            dispatcher.dispatch({
              type: "object.create",
              params: {
                type: "GeomConstruction",
                props: {
                  kind: "perpBisector",
                  ...(nearEdge.aId && nearEdge.bId
                    ? { sideA: nearEdge.aId, sideB: nearEdge.bId }
                    : {}),
                  fromPt: { x: mid.x - nx * span, y: mid.y - ny * span },
                  toPt: { x: mid.x + nx * span, y: mid.y + ny * span },
                  sideAPt: nearEdge.a,
                  sideBPt: nearEdge.b,
                },
              },
            });
          }
          setStatusHint(null);
          resetToolAfterCreation();
          return true;
        }
        const nextPicked = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
        ];
        if (nextPicked.length < 2) {
          setPickedItems(nextPicked);
          setStatusHint("Chọn điểm thứ hai");
          return true;
        }
        const [p1, p2] = nextPicked;
        const mid = midpoint2D(p1.pos, p2.pos);
        if (tool === "c:midpoint") {
          const name = getNextPointName(pageElements, ["M", "N", "P", "Q"]);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: mid.x, y: mid.y, scale: 1, rotation: 0, z: 0 },
              props: {
                name,
                constraint:
                  p1.id &&
                  p2.id &&
                  (byId.has(p1.id) || solved3D.owner.has(p1.id)) &&
                  (byId.has(p2.id) || solved3D.owner.has(p2.id))
                    ? { kind: "midpointOf", a: p1.id, b: p2.id }
                    : { kind: "free" },
              },
            },
          });
        } else {
          const dx = p2.pos.x - p1.pos.x;
          const dy = p2.pos.y - p1.pos.y;
          const len = Math.hypot(dx, dy) || 1;
          const span = Math.max(1.2, Math.min(len * 0.65, 5.5));
          const nx = -dy / len;
          const ny = dx / len;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              props: {
                kind: "perpBisector",
                ...(p1.id && p2.id ? { sideA: p1.id, sideB: p2.id } : {}),
                fromPt: { x: mid.x - nx * span, y: mid.y - ny * span },
                toPt: { x: mid.x + nx * span, y: mid.y + ny * span },
                sideAPt: p1.pos,
                sideBPt: p2.pos,
              },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 4. Point on line / circle (`c:onedge`)
      if (tool === "c:onedge") {
        const snapped = snapPointAtCursor(worldPos, 30);
        const pos = snapped.point;
        const name = getNextPointName(pageElements, [
          "M",
          "N",
          "P",
          "Q",
          "K",
          "H",
          "E",
          "F",
          "I",
          "J",
        ]);
        dispatcher.dispatch({
          type: "object.create",
          params: {
            type: "GeomPoint",
            transform: { x: pos.x, y: pos.y, scale: 1, rotation: 0, z: 0 },
            props: { name, constraint: snapped.constraint },
          },
        });
        resetToolAfterCreation();
        return true;
      }

      // 5. Perpendicular / Parallel
      if (tool === "c:perp" || tool === "c:parallel" || tool === "c:perp3d") {
        if (pickedItems.length === 0) {
          if (nearEdge && !nearPt) {
            setPickedItems([
              {
                kind: "segment",
                id: nearEdge.id,
                pos: worldPos,
                segA: nearEdge.a,
                segB: nearEdge.b,
                segAId: nearEdge.aId,
                segBId: nearEdge.bId,
              },
            ]);
            setStatusHint("Chọn điểm đi qua");
            return true;
          }
          if (nearPt) {
            setPickedItems([
              { kind: "point", id: nearPt.id, pos: nearPt.pos },
            ]);
            setStatusHint("Chọn đường thẳng hoặc đoạn thẳng");
            return true;
          }
          return true;
        }
        const first = pickedItems[0];
        const seg =
          first.kind === "segment"
            ? first
            : nearEdge
              ? {
                  segA: nearEdge.a,
                  segB: nearEdge.b,
                  segAId: nearEdge.aId,
                  segBId: nearEdge.bId,
                }
              : null;
        const ptId = first.kind === "point" ? first.id : nearPt?.id;
        const pt = first.kind === "point" ? first.pos : (nearPt?.pos ?? worldPos);
        if (seg?.segA && seg?.segB) {
          const p3P = ptId ? solved3D.p3.get(ptId) : undefined;
          const p3A = seg.segAId ? solved3D.p3.get(seg.segAId) : undefined;
          const p3B = seg.segBId ? solved3D.p3.get(seg.segBId) : undefined;
          if (
            tool === "c:perp3d" &&
            ptId &&
            seg.segAId &&
            seg.segBId &&
            p3P &&
            p3A &&
            p3B
          ) {
            const dx3 = p3B.x - p3A.x;
            const dy3 = p3B.y - p3A.y;
            const dz3 = p3B.z - p3A.z;
            const lenSq3 = dx3 * dx3 + dy3 * dy3 + dz3 * dz3;
            if (lenSq3 > 1e-9) {
              const t =
                ((p3P.x - p3A.x) * dx3 +
                  (p3P.y - p3A.y) * dy3 +
                  (p3P.z - p3A.z) * dz3) /
                lenSq3;
              const foot2D = {
                x: seg.segA.x + t * (seg.segB.x - seg.segA.x),
                y: seg.segA.y + t * (seg.segB.y - seg.segA.y),
              };
              const footId = newElId("pt");
              const footName = getNextPointName(pageElements, ["H", "K", "M", "N"]);
              dispatcher.batch(() => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: footId,
                    type: "GeomPoint",
                    transform: { x: foot2D.x, y: foot2D.y, scale: 1, rotation: 0, z: 0 },
                    props: {
                      name: footName,
                      constraint: {
                        kind: "foot",
                        p: ptId,
                        a: seg.segAId!,
                        b: seg.segBId!,
                      },
                    },
                  },
                });
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "GeomSegment",
                    style: { stroke: "#0f766e", width: 2, dash: true },
                    props: { from: ptId, to: footId },
                  },
                });
              });
              setPickedItems([]);
              setStatusHint(null);
              resetToolAfterCreation();
              return true;
            }
          }
          const dx = seg.segB.x - seg.segA.x;
          const dy = seg.segB.y - seg.segA.y;
          const isPerp = tool === "c:perp" || tool === "c:perp3d";
          const vx = isPerp ? -dy : dx;
          const vy = isPerp ? dx : dy;
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomConstruction",
              props: {
                kind: isPerp ? "perp" : "parallel",
                ...(ptId && seg.segAId && seg.segBId
                  ? { from: ptId, sideA: seg.segAId, sideB: seg.segBId }
                  : {}),
                fromPt: { x: pt.x - vx * 0.7, y: pt.y - vy * 0.7 },
                toPt: { x: pt.x + vx * 0.7, y: pt.y + vy * 0.7 },
                sideAPt: seg.segA,
                sideBPt: seg.segB,
              },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 6. Intersection (`c:intersect`)
      if (tool === "c:intersect") {
        const hitSeg = nearEdge && byId.get(nearEdge.id);
        const pickedTarget = nearCirc
          ? { kind: "circle" as const, id: nearCirc.el.id, pos: worldPos }
          : nearEdge
            ? {
                kind: "segment" as const,
                id: hitSeg?.id ?? nearEdge.id,
                pos: worldPos,
                segA: nearEdge.a,
                segB: nearEdge.b,
                segAId: nearEdge.aId,
                segBId: nearEdge.bId,
              }
            : null;
        if (!pickedTarget) return true;
        if (pickedItems.length === 0) {
          setPickedItems([pickedTarget]);
          setStatusHint("Chọn đường hoặc đường tròn thứ hai");
          return true;
        }
        const first = pickedItems[0];
        const l1 =
          first.kind === "segment" && first.segA && first.segB
            ? {
                px: first.segA.x,
                py: first.segA.y,
                dx: first.segB.x - first.segA.x,
                dy: first.segB.y - first.segA.y,
              }
            : first.id
              ? resolveLineGeometry(byId.get(first.id), (id) => hydratedPts.get(id), byId)
              : null;
        const l2 =
          pickedTarget.kind === "segment" && pickedTarget.segA && pickedTarget.segB
            ? {
                px: pickedTarget.segA.x,
                py: pickedTarget.segA.y,
                dx: pickedTarget.segB.x - pickedTarget.segA.x,
                dy: pickedTarget.segB.y - pickedTarget.segA.y,
              }
            : pickedTarget.id
              ? resolveLineGeometry(byId.get(pickedTarget.id), (id) => hydratedPts.get(id), byId)
              : null;

        const firstEl = first.id ? byId.get(first.id) : undefined;
        const secondEl = pickedTarget.id ? byId.get(pickedTarget.id) : undefined;
        const a1Id =
          first.segAId ??
          (typeof firstEl?.props.from === "string" ? firstEl.props.from : undefined);
        const b1Id =
          first.segBId ??
          (typeof firstEl?.props.to === "string" ? firstEl.props.to : undefined);
        const a2Id =
          pickedTarget.segAId ??
          (typeof secondEl?.props.from === "string" ? secondEl.props.from : undefined);
        const b2Id =
          pickedTarget.segBId ??
          (typeof secondEl?.props.to === "string" ? secondEl.props.to : undefined);
        const p3A1 = a1Id ? solved3D.p3.get(a1Id) : undefined;
        const p3B1 = b1Id ? solved3D.p3.get(b1Id) : undefined;
        const p3A2 = a2Id ? solved3D.p3.get(a2Id) : undefined;
        const p3B2 = b2Id ? solved3D.p3.get(b2Id) : undefined;
        const skew =
          l1 && l2 && p3A1 && p3B1 && p3A2 && p3B2
            ? skewLineClosest(p3A1, p3B1, p3A2, p3B2)
            : null;
        if (skew && skew.normalizedGap > 0.04) {
          setPickedItems([]);
          setStatusHint("Hai đường thẳng chéo nhau trong không gian — không đồng phẳng!");
          resetToolAfterCreation();
          return true;
        }

        let inter: Point2D | null = null;
        if (l1 && l2) {
          inter = intersectLines2D(l1, l2);
        } else if (l1 && nearCirc) {
          inter = intersectLineCircleAt(l1, { cx: nearCirc.center.x, cy: nearCirc.center.y, r: nearCirc.r }, 0);
        } else if (l2 && first.kind === "circle" && first.id) {
          const cEl = byId.get(first.id);
          const cPt = cEl ? hydratedPts.get(String(cEl.props.center ?? "")) : undefined;
          const r = cPt && cEl ? resolveCircleRadius(cEl.props.radius as Parameters<typeof resolveCircleRadius>[0], cPt, (id) => hydratedPts.get(id)) : null;
          if (cPt && r !== null) {
            inter = intersectLineCircleAt(l2, { cx: cPt.x, cy: cPt.y, r }, 0);
          }
        }
        if (inter) {
          const name = getNextPointName(pageElements, ["I", "K", "M", "N"]);
          const constraint: PointConstraint =
            l1 && l2 && firstEl && secondEl
              ? { kind: "intersection", a: firstEl.id, b: secondEl.id }
              : skew &&
                  a1Id &&
                  b1Id &&
                  (byId.has(a1Id) || solved3D.owner.has(a1Id)) &&
                  (byId.has(b1Id) || solved3D.owner.has(b1Id))
                ? { kind: "onLine", a: a1Id, b: b1Id, t: skew.t }
                : { kind: "free" };
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: inter.x, y: inter.y, scale: 1, rotation: 0, z: 0 },
              props: { name, constraint },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 7. Tangent (`c:tangent`)
      if (tool === "c:tangent") {
        if (pickedItems.length === 0) {
          if (nearCirc && (!nearPt || dist2D(nearPt.pos, nearCirc.center) < nearCirc.r * 0.6)) {
            setPickedItems([
              { kind: "circle", id: nearCirc.el.id, pos: nearCirc.center },
            ]);
            setStatusHint("Chọn điểm nằm ngoài hoặc trên đường tròn");
          } else if (nearPt) {
            setPickedItems([{ kind: "point", id: nearPt.id, pos: nearPt.pos }]);
            setStatusHint("Chọn đường tròn");
          } else if (nearCirc) {
            setPickedItems([
              { kind: "circle", id: nearCirc.el.id, pos: nearCirc.center },
            ]);
            setStatusHint("Chọn điểm nằm ngoài hoặc trên đường tròn");
          }
          return true;
        }
        const first = pickedItems[0];
        const circ = nearCirc ?? (first.kind === "circle" && first.id ? (() => {
          const cEl = byId.get(first.id);
          const cPt = cEl ? hydratedPts.get(String(cEl.props.center ?? "")) : undefined;
          const r = cEl && cPt ? resolveCircleRadius(cEl.props.radius as Parameters<typeof resolveCircleRadius>[0], cPt, (id) => hydratedPts.get(id)) : null;
          return cEl && cPt && r !== null ? { el: cEl, center: cPt, centerId: String(cEl.props.center), r } : null;
        })() : null);

        let ptId = first.kind === "point" ? first.id : nearPt?.id;
        let pt = first.kind === "point" ? first.pos : (nearPt?.pos ?? worldPos);
        if (circ) {
          if (first.kind === "circle" && !nearPt) {
            const onRim = snapPointAtCursor(worldPos, 24);
            pt = onRim.constraint.kind !== "free" ? onRim.point : worldPos;
          }
          const d = dist2D(pt, circ.center);
          if (d < circ.r - 0.08) {
            setStatusHint(
              "Điểm nằm trong đường tròn — không kẻ được tiếp tuyến."
            );
            setPickedItems([]);
            return true;
          }
          dispatcher.batch(() => {
            if (!ptId) {
              ptId = newElId("pt");
              const pName = getNextPointName(pageElements, ["M", "N", "P", "A"]);
              const onRim = Math.abs(d - circ.r) <= 0.08;
              const angle = Math.atan2(pt.y - circ.center.y, pt.x - circ.center.x);
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: ptId,
                  type: "GeomPoint",
                  transform: { x: pt.x, y: pt.y, scale: 1, rotation: 0, z: 0 },
                  props: {
                    name: pName,
                    constraint: onRim
                      ? { kind: "onObject", target: circ.el.id, t: angle }
                      : { kind: "free" },
                  },
                },
              });
            }
            if (Math.abs(d - circ.r) <= 0.08) {
              const ux = (pt.x - circ.center.x) / (d || 1);
              const uy = (pt.y - circ.center.y) / (d || 1);
              const touch = { x: circ.center.x + ux * circ.r, y: circ.center.y + uy * circ.r };
              const span = Math.max(1.8, circ.r * 1.35);
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  type: "GeomConstruction",
                  props: {
                    kind: "tangent",
                    from: ptId,
                    circle: circ.el.id,
                    fromPt: { x: touch.x + uy * span, y: touch.y - ux * span },
                    toPt: { x: touch.x - uy * span, y: touch.y + ux * span },
                    sideAPt: circ.center,
                    sideBPt: touch,
                  },
                },
              });
            } else {
              for (const side of [0, 1] as const) {
                const tPt = tangentPointToCircle(
                  pt,
                  { cx: circ.center.x, cy: circ.center.y, r: circ.r },
                  side
                );
                if (!tPt) continue;
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    type: "GeomConstruction",
                    props: {
                      kind: "tangent",
                      from: ptId,
                      circle: circ.el.id,
                      tangentSide: side,
                      fromPt: pt,
                      toPt: tPt,
                      sideAPt: circ.center,
                      sideBPt: tPt,
                    },
                  },
                });
              }
            }
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 8. Diameter (`c:diameter`)
      if (tool === "c:diameter") {
        const nextPicked = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
        ];
        if (nextPicked.length < 2) {
          setPickedItems(nextPicked);
          setStatusHint("Chọn điểm trên đường tròn");
          return true;
        }
        const [center, onPt] = nextPicked;
        const other = reflectPointOverPoint(onPt.pos, center.pos);
        const id = newElId("diam");
        dispatcher.dispatch({
          type: "object.create",
          params: {
            id,
            type: "GeomSegment",
            props: {
              from: `${id}_a`,
              to: `${id}_b`,
              fromPt: onPt.pos,
              toPt: other,
            },
          },
        });
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 9. Reflection (`c:reflect`)
      if (tool === "c:reflect") {
        if (pickedItems.length === 0) {
          setPickedItems([
            { kind: "point", id: nearPt?.id, pos: nearPt?.pos ?? worldPos },
          ]);
          setStatusHint("Chọn tâm đối xứng hoặc đường đối xứng");
          return true;
        }
        const src = pickedItems[0];
        let mirrored: Point2D | null = null;
        if (nearEdge && !nearPt) {
          mirrored = reflectPointOverLine(src.pos, nearEdge.a, nearEdge.b);
        } else {
          mirrored = reflectPointOverPoint(src.pos, nearPt?.pos ?? worldPos);
        }
        if (mirrored) {
          const name = getNextPointName(pageElements);
          dispatcher.dispatch({
            type: "object.create",
            params: {
              type: "GeomPoint",
              transform: { x: mirrored.x, y: mirrored.y, scale: 1, rotation: 0, z: 0 },
              props: { name, constraint: { kind: "free" } },
            },
          });
        }
        setPickedItems([]);
        setStatusHint(null);
        resetToolAfterCreation();
        return true;
      }

      // 10. Angle by degree (`c:angleval`)
      if (tool === "c:angleval") {
        const ptPos = nearPt?.pos ?? worldPos;
        const next = [
          ...pickedItems,
          { kind: "point" as const, id: nearPt?.id, pos: ptPos },
        ];
        if (next.length < 2) {
          setPickedItems(next);
          setStatusHint("Chọn đỉnh của góc");
          return true;
        }
        setAngleDialog({
          vertexId: next[1].id ?? newElId("angv"),
          armId: next[0].id ?? newElId("anga"),
          vertexPos: next[1].pos,
          armPos: next[0].pos,
        });
        setPickedItems([]);
        setStatusHint(null);
        return true;
      }

      // 11. 3D Face Extraction (`c:flatten`: 1st click near solid face + 2nd click placement, OR 3 vertex clicks)
      if (tool === "c:flatten") {
        if (pickedItems.length === 0) {
          // Check if user clicked on a 3D solid (even interior) -> detect top/front 3 vertices
          if (!nearPt) {
            for (const el of pageElements) {
              if (el.type !== "Solid3D") continue;
              const ptIds = Array.isArray(el.props.points) ? (el.props.points as string[]) : [];
              const kind = (el.props.kind ?? "pyramid") as Solid3DKind;
              const pts2d = ptIds.map((id) => hydratedPts.get(id)).filter((p): p is Point2D => Boolean(p));
              const lift = solved3D.lifts.get(el.id) ?? (pts2d.length === ptIds.length ? liftSolidTo3D(kind, pts2d) : null);
              if (lift) {
                const hitFace = lift.faces.find((face) => {
                  const poly = face.map((idx) => pts2d[idx]).filter(Boolean);
                  return poly.length >= 3 && pointInPolygon2D(poly, worldPos);
                }) ?? lift.faces[0];
                if (hitFace && hitFace.length >= 3) {
                  setPickedItems([
                    {
                      kind: "solidFace",
                      id: el.id,
                      pos: worldPos,
                      faceIds: hitFace.slice(0, 3).map((idx) => ptIds[idx]),
                    },
                  ]);
                  setStatusHint("Bấm vào vị trí bên cạnh để đặt hình phẳng thật");
                  return true;
                }
              }
            }
          }
          if (nearPt) {
            setPickedItems([{ kind: "point", id: nearPt.id, pos: nearPt.pos }]);
            setStatusHint("Chọn thêm 2 đỉnh của mặt cần tách");
          }
          return true;
        }

        const first = pickedItems[0];
        if (first.kind === "solidFace" && first.faceIds && first.faceIds.length >= 3) {
          const flat = computeFlattenedFace(
            [first.faceIds[0], first.faceIds[1], first.faceIds[2]],
            solved3D,
            pageElements,
            worldPos
          );
          if (flat) {
            const polyEl = flat.polygonElement;
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: polyEl.id,
                type: polyEl.type,
                transform: polyEl.transform,
                style: polyEl.style,
                props: polyEl.props,
              },
            });
          }
          setPickedItems([]);
          setStatusHint(null);
          resetToolAfterCreation();
          return true;
        }

        if (nearPt) {
          const next = [...pickedItems, { kind: "point" as const, id: nearPt.id, pos: nearPt.pos }];
          if (next.length < 3) {
            setPickedItems(next);
            setStatusHint("Chọn đỉnh thứ 3 của mặt");
            return true;
          }
          const faceIds = next.map((n) => n.id).filter((id): id is string => Boolean(id));
          if (faceIds.length === 3) {
            const flat = computeFlattenedFace(
              [faceIds[0], faceIds[1], faceIds[2]],
              solved3D,
              pageElements
            );
            if (flat) {
              const polyEl = flat.polygonElement;
              dispatcher.dispatch({
                type: "object.create",
                params: {
                  id: polyEl.id,
                  type: polyEl.type,
                  transform: polyEl.transform,
                  style: polyEl.style,
                  props: polyEl.props,
                },
              });
            }
          }
          setPickedItems([]);
          setStatusHint(null);
          resetToolAfterCreation();
          return true;
        }
        return true;
      }

      // 11b. 3D Net Unfolding (`c:unfold`: Click any Solid3D to unfold all faces into 2D printable net)
      if (tool === "c:unfold") {
        let hitSolid: CanvasElement | undefined;
        if (nearPt?.id) {
          const ownerId = solved3D.owner.get(nearPt.id);
          if (ownerId) hitSolid = byId.get(ownerId);
        }
        if (!hitSolid) {
          for (const el of pageElements) {
            if (el.type !== "Solid3D") continue;
            const ptIds = Array.isArray(el.props.points) ? (el.props.points as string[]) : [];
            const kind = (el.props.kind ?? "pyramid") as Solid3DKind;
            const pts2d = ptIds.map((id) => hydratedPts.get(id)).filter((p): p is Point2D => Boolean(p));
            const lift = pts2d.length === ptIds.length ? liftSolidTo3D(kind, pts2d) : null;
            if (lift) {
              const inside = lift.faces.some((face) => {
                const poly = face.map((idx) => pts2d[idx]).filter(Boolean);
                return poly.length >= 3 && pointInPolygon2D(poly, worldPos);
              });
              if (inside) {
                hitSolid = el;
                break;
              }
            }
          }
        }

        if (hitSolid) {
          const netRes = computeUnfoldedPolyhedronNet(hitSolid.id, solved3D, pageElements);
          if (netRes && netRes.polygons.length > 0) {
            dispatcher.batch(() => {
              netRes.polygons.forEach((polyEl) => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: polyEl.id,
                    type: polyEl.type,
                    transform: polyEl.transform,
                    style: polyEl.style,
                    props: polyEl.props,
                  },
                });
              });
              netRes.points?.forEach((ptEl) => {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: ptEl.id,
                    type: ptEl.type,
                    transform: ptEl.transform,
                    style: ptEl.style,
                    props: ptEl.props,
                  },
                });
              });
            });
            const ptsCount = netRes.points?.length ?? 0;
            setStatusHint(
              `✓ Đã trải phẳng ${netRes.polygons.length} mặt của khối${ptsCount > 0 ? ` cùng ${ptsCount} điểm đặc biệt` : ""}`
            );
          } else {
            setStatusHint("Không thể trải phẳng khối này (chỉ hỗ trợ hình chóp, lăng trụ, hộp chữ nhật, lập phương)");
          }
        } else {
          setStatusHint("Vui lòng bấm vào một khối 3D để trải phẳng");
        }
        resetToolAfterCreation();
        return true;
      }

      // 12. 3D Cross-Section (`c:section`), Circumsphere (`c:circumsphere`), & Spatial Measurements
      if (tool === "plane") {
        const createdEls = createPlaneParallelogramElements(worldPos, pageElements);
        dispatcher.batch(() => {
          for (const el of createdEls) {
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: el.id,
                type: el.type,
                transform: el.transform,
                style: el.style,
                props: el.props,
              },
            });
          }
        });
        resetToolAfterCreation();
        return true;
      }

      if (
        tool === "c:section" ||
        tool === "c:circumsphere" ||
        tool === "c:lineplane" ||
        tool === "c:giaotuyen" ||
        tool === "c:footplane" ||
        tool === "c:distplane" ||
        tool === "c:commonperp" ||
        tool === "c:measure" ||
        tool === "c:anglelp" ||
        tool === "c:angleplanes" ||
        tool === "c:boxrule"
      ) {
        if (!nearPt?.id) return true;
        const nextIds = [
          ...pickedItems.map((p) => p.id).filter((x): x is string => Boolean(x)),
          nearPt.id,
        ];
        const needed =
          tool === "c:circumsphere"
            ? 1
            : tool === "c:section" || tool === "c:measure"
              ? 3
              : tool === "c:footplane" ||
                  tool === "c:distplane" ||
                  tool === "c:commonperp" ||
                  tool === "c:boxrule" ||
                  tool === "c:anglelp"
                ? 4
                : tool === "c:lineplane"
                  ? 5
                  : 6;

        if (nextIds.length < needed) {
          setPickedItems([
            ...pickedItems,
            { kind: "point", id: nearPt.id, pos: nearPt.pos },
          ]);
          setStatusHint(`Đã chọn ${nextIds.length}/${needed} điểm`);
          return true;
        }

        if (tool === "c:section") {
          const ownerId = nextIds
            .map((id) => {
              if (solved3D.owner.get(id)) return solved3D.owner.get(id);
              for (const el of pageElements) {
                if (el.type === "Solid3D" && Array.isArray(el.props.points) && (el.props.points as string[]).includes(id)) {
                  return el.id;
                }
              }
              return undefined;
            })
            .find((id): id is string => Boolean(id));
          const solidEl = ownerId ? byId.get(ownerId) : undefined;
          if (!solidEl || solidEl.type !== "Solid3D") {
            setStatusHint(
              "Vui lòng chọn 3 điểm thuộc hoặc nằm trên các cạnh/mặt của một khối 3D."
            );
          } else {
            dispatcher.dispatch({
              type: "object.create",
              params: {
                id: newElId("sec"),
                type: "RoundSection",
                style: { stroke: "#e8590c", fill: "rgba(240,140,0,0.35)", width: 2 },
                props: { solid: solidEl.id, points: [nextIds[0], nextIds[1], nextIds[2]] },
              },
            });
            setStatusHint(null);
          }
        } else {
          const built = buildSpatialConstructionElements(
            tool,
            nextIds,
            pageElements,
            solved3D
          );
          if (built.error) {
            setStatusHint(built.error);
          } else {
            dispatcher.batch(() => {
              for (const el of built.elements) {
                dispatcher.dispatch({
                  type: "object.create",
                  params: {
                    id: el.id,
                    type: el.type,
                    transform: el.transform,
                    style: el.style,
                    props: el.props,
                  },
                });
              }
            });
            setStatusHint(null);
          }
        }
        setPickedItems([]);
        resetToolAfterCreation();
        return true;
      }

      return false;
    },
    [
      findNearestPoint,
      findNearestEdgeOrSegment,
      findNearestCircle,
      snapPointAtCursor,
      pickedItems,
      byId,
      pageElements,
      dispatcher,
      hydratedPts,
      solved3D,
      setPickedItems,
      setStatusHint,
      resetToolAfterCreation,
      setAngleDialog,
    ]
  );

  return {
    commitDraftPolygon,
    findNearestPoint,
    findNearestEdgeOrSegment,
    findNearestCircle,
    snapPointAtCursor,
    commitTwoPointShape,
    handleConstructionClick,
  };
}
