"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import {
  DEFAULT_DOT_SCALE,
  DEFAULT_LABEL_SCALE,
  type EmbeddedVertex,
  type GeomAngleProps,
  type GeomPolygonProps,
  type Point2D,
  type Point3D,
  computeAngleArcPoints,
  computeAngleDegrees,
  detectPolygonAutoMarks,
  dist2D,
  fillRegionToSvgPath,
  getConstructMarksEnabled,
  resolveFillRegionPolygon,
  unitDir2D,
} from "@/lib/geometry";
import { computeAngle3DDegrees } from "@/lib/geometry3d";
import { renderCongruenceTicks } from "./SegmentElement";

const CONGRUENCE_ARC_COLORS = ["#16a34a", "#2563eb", "#db2777"] as const;

export interface RightAngleSymbolProps {
  vertex: Point2D;
  armA: Point2D;
  armB: Point2D;
  color?: string;
  strokeWidth?: number;
  size?: number;
}

export const RightAngleSymbol: React.FC<RightAngleSymbolProps> = ({
  vertex,
  armA,
  armB,
  color = "#16a34a",
  strokeWidth = 1.9,
  size,
}) => {
  const d1 = dist2D(vertex, armA);
  const d2 = dist2D(vertex, armB);
  const armArc = Math.max(0.32, Math.min(Math.min(d1, d2) * 0.3, 0.9));
  const sqSize = size ?? Math.min(armArc * 0.58, 0.3);
  const u = unitDir2D(vertex, armA);
  const v = unitDir2D(vertex, armB);
  const p1 = { x: vertex.x + u.x * sqSize, y: vertex.y + u.y * sqSize };
  const p2 = { x: vertex.x + (u.x + v.x) * sqSize, y: vertex.y + (u.y + v.y) * sqSize };
  const p3 = { x: vertex.x + v.x * sqSize, y: vertex.y + v.y * sqSize };
  const d = `M${p1.x} ${-p1.y}L${p2.x} ${-p2.y}L${p3.x} ${-p3.y}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
      data-symbol="right-angle"
      data-wb-symbol="square"
      className="wb-right-angle-marker"
    />
  );
};

export interface PolygonElementProps {
  element: CanvasElement;
  points: Map<string, Point2D>;
  byId: Map<string, CanvasElement>;
  points3D?: Map<string, Point3D>;
  scale?: number;
  labelScale?: number;
  dotScale?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onPlaneLabelDoubleClick?: (e: React.MouseEvent, id: string) => void;
}

export const PolygonElement: React.FC<PolygonElementProps> = ({
  element,
  points,
  byId,
  points3D,
  scale = 45,
  labelScale = DEFAULT_LABEL_SCALE,
  dotScale = DEFAULT_DOT_SCALE,
  isSelected = false,
  isHighlighted = false,
  onPointerDown,
  onPlaneLabelDoubleClick,
}) => {
  const style = element.style ?? {};
  const activeColor = isSelected || isHighlighted ? "#f59e0b" : undefined;
  const strokeWidth = (style.width ?? 1.8) + (isSelected || isHighlighted ? 2 : 0);
  const dashArray = style.dash ? "6 4" : undefined;

  if (element.type === "FillRegion") {
    const region = resolveFillRegionPolygon(element, points, byId, points3D);
    if (!region) return null;
    const d = fillRegionToSvgPath(region);
    const fillColor = style.fill ?? "transparent";
    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="FillRegion"
        data-wb-fill="true"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
      >
        <path
          data-wb-fill="true"
          data-wb-fill-region={element.id}
          d={d}
          fillRule="evenodd"
          fill={fillColor}
          stroke={isSelected ? "#f59e0b" : "none"}
          strokeWidth={isSelected ? 1.5 : 0}
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />
      </g>
    );
  }

  if (element.type === "GeomAngle") {
    const props = element.props as Partial<GeomAngleProps>;
    const vtx = props.vertex ? points.get(props.vertex) : undefined;
    const arms = Array.isArray(props.arms) ? props.arms : [];
    const armA = arms[0] ? points.get(arms[0]) : undefined;
    const armB = arms[1] ? points.get(arms[1]) : undefined;
    if (!vtx || !armA || !armB) return null;

    const mark = props.mark;
    const bare = props.bare === true;
    const turn = props.turn === true;
    const arcRadius = Math.max(0.3, Math.min(Math.min(dist2D(vtx, armA), dist2D(vtx, armB)) * 0.3, 0.9));
    const defaultCol =
      bare && mark && /^[123]$/.test(mark)
        ? CONGRUENCE_ARC_COLORS[Number(mark) - 1]
        : "#16a34a";
    const color = activeColor ?? style.stroke ?? defaultCol;
    const u = unitDir2D(vtx, armA);
    const v = unitDir2D(vtx, armB);

    const bisectorRadius = (armPt: Point2D, isFirst: boolean) => {
      const targetId = isFirst ? arms[0] : arms[1];
      const isBisFoot = byId.get(targetId)?.props.constraint &&
        (byId.get(targetId)?.props.constraint as Record<string, unknown>).kind === "bisectorFoot";
      const d = isBisFoot ? dist2D(vtx, armPt) : Math.min(dist2D(vtx, armA), dist2D(vtx, armB));
      return Math.max(0.3, Math.min(d * 0.2, 0.55)) + (isFirst ? 0.13 : 0);
    };

    const arcRadii =
      mark && /^[123]$/.test(mark)
        ? Array.from({ length: Number(mark) }, (_, i) => arcRadius + i * 0.12)
        : [bare ? bisectorRadius(armA, true) : arcRadius];

    let angleDeg: number | null = null;
    if (props.measure) {
      const p3V = props.vertex ? points3D?.get(props.vertex) : undefined;
      const p3A = arms[0] ? points3D?.get(arms[0]) : undefined;
      const p3B = arms[1] ? points3D?.get(arms[1]) : undefined;
      angleDeg =
        p3V && p3A && p3B
          ? computeAngle3DDegrees(p3V, p3A, p3B)
          : computeAngleDegrees(vtx, armA, armB, turn);
    }

    const labelPos = turn
      ? (() => {
          const a0 = Math.atan2(u.y, u.x);
          let da = Math.atan2(v.y, v.x) - a0;
          while (da < 0) da += Math.PI * 2;
          const midA = a0 + da / 2;
          return { x: vtx.x + Math.cos(midA) * (arcRadius + 0.5), y: vtx.y + Math.sin(midA) * (arcRadius + 0.5) };
        })()
      : {
          x: vtx.x + (u.x + v.x) * (arcRadius + 0.35),
          y: vtx.y + (u.y + v.y) * (arcRadius + 0.35),
        };

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="GeomAngle"
        data-wb-type="GeomAngle"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        {!bare && (
          <>
            <line
              x1={vtx.x}
              y1={-vtx.y}
              x2={armA.x}
              y2={-armA.y}
              stroke={color}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={vtx.x}
              y1={-vtx.y}
              x2={armB.x}
              y2={-armB.y}
              stroke={color}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {mark === "right" ? (
          <RightAngleSymbol
            vertex={vtx}
            armA={armA}
            armB={armB}
            color={color}
            strokeWidth={strokeWidth}
          />
        ) : (
          arcRadii.map((r, idx) => {
            const pts = computeAngleArcPoints(vtx, armA, armB, r, 16, turn);
            const d = pts.map((p, pIdx) => `${pIdx === 0 ? "M" : "L"}${p.x} ${-p.y}`).join("");
            return (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            );
          })
        )}

        {(props.valueLatex || (angleDeg !== null && !turn)) && (
          <text
            data-wb-angle-value="true"
            x={labelPos.x}
            y={-labelPos.y}
            fontSize={0.34}
            fill={color}
            textAnchor="middle"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {angleDeg !== null && !turn
              ? `${Number(angleDeg.toFixed(1)).toLocaleString("vi-VN")}°`
              : props.valueLatex}
          </text>
        )}
      </g>
    );
  }

  if (element.type === "GeomPolygon") {
    const props = element.props as Partial<GeomPolygonProps>;
    const embeddedPts = Array.isArray(props.points) ? (props.points as EmbeddedVertex[]) : null;

    let coords: Point2D[] = [];
    if (embeddedPts && embeddedPts.length >= 3) {
      coords = embeddedPts.map((v) => ({
        x: v.x + element.transform.x,
        y: v.y + element.transform.y,
      }));
    } else if (Array.isArray(props.vertices)) {
      coords = props.vertices
        .map((id) => points.get(id))
        .filter((p): p is Point2D => p !== undefined);
    }

    if (coords.length < 3) return null;

    const strokeColor = activeColor ?? style.stroke ?? "#2563eb";
    const fillColor = style.fill ?? "rgba(37,99,235,0.06)";
    const isTriangle = coords.length === 3;
    const polyPtsStr = coords.map((p) => `${p.x},${-p.y}`).join(" ");
    const marksEnabled = getConstructMarksEnabled();
    const autoMarks = embeddedPts ? detectPolygonAutoMarks(coords, marksEnabled) : null;
    const rightAngleIndices = Array.isArray(props.rightAngles)
      ? props.rightAngles
      : autoMarks?.rightAngles ?? [];
    const edgeTicks = props.edgeTicks ?? autoMarks?.edgeTicks ?? {};
    const dotRadius = (scale > 0 ? 1.8 / scale : 0.04) * dotScale;
    const lastPt = coords[coords.length - 1];

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="GeomPolygon"
        data-wb-type={isTriangle ? "triangle" : "Polygon"}
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <polygon
          points={polyPtsStr}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />

        {/* Right angle markers */}
        {marksEnabled &&
          rightAngleIndices.map((vIdx) => {
            const n = coords.length;
            if (vIdx < 0 || vIdx >= n) return null;
            return (
              <RightAngleSymbol
                key={`ra_${vIdx}`}
                vertex={coords[vIdx]}
                armA={coords[(vIdx - 1 + n) % n]}
                armB={coords[(vIdx + 1) % n]}
                color="#16a34a"
                strokeWidth={1.6}
              />
            );
          })}

        {/* Congruence ticks on equal sides */}
        {marksEnabled &&
          Object.entries(edgeTicks).map(([edgeIdxStr, tickCount]) => {
            const eIdx = Number(edgeIdxStr);
            if (!Number.isInteger(eIdx) || eIdx < 0 || eIdx >= coords.length) return null;
            const a = coords[eIdx];
            const b = coords[(eIdx + 1) % coords.length];
            const ticks = tickCount === 1 || tickCount === 2 || tickCount === 3 ? tickCount : 1;
            return (
              <React.Fragment key={`tk_${eIdx}`}>
                {renderCongruenceTicks(a, b, ticks, strokeColor, 1.5)}
              </React.Fragment>
            );
          })}

        {/* Embedded preset vertices & labels */}
        {embeddedPts &&
          coords.map((pt, idx) => {
            const vName = embeddedPts[idx]?.name ?? "";
            const prev = coords[(idx - 1 + coords.length) % coords.length];
            const next = coords[(idx + 1) % coords.length];
            // Offset label outward from polygon interior
            const cx = coords.reduce((s, p) => s + p.x, 0) / coords.length;
            const cy = coords.reduce((s, p) => s + p.y, 0) / coords.length;
            const outDir = unitDir2D({ x: cx, y: cy }, pt);
            void prev;
            void next;
            const lx = pt.x + outDir.x * 0.3 * labelScale;
            const ly = pt.y + outDir.y * 0.3 * labelScale;
            return (
              <React.Fragment key={embeddedPts[idx]?.id ?? idx}>
                <circle
                  data-wb-vertex="true"
                  cx={pt.x}
                  cy={-pt.y}
                  r={dotRadius}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                {vName && (
                  <text
                    data-label={vName}
                    data-wb-label="true"
                    x={lx}
                    y={-ly}
                    fontSize={0.34 * labelScale}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight={600}
                    fill={isSelected ? "#b45309" : "#1e3a5f"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {vName}
                  </text>
                )}
              </React.Fragment>
            );
          })}

        {/* Optional plane / shape label e.g. (P) */}
        {props.label && (
          <text
            data-plane-label={element.id}
            x={lastPt.x + 0.25}
            y={-(lastPt.y - 0.45)}
            fontSize={0.4}
            fill={activeColor ?? style.stroke ?? "#475569"}
            style={{ fontStyle: "italic", cursor: "text" }}
            onDoubleClick={(e) => onPlaneLabelDoubleClick?.(e, element.id)}
          >
            {props.label}
          </text>
        )}
      </g>
    );
  }

  return null;
};
