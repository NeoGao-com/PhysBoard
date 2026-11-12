"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import {
  DEFAULT_DOT_SCALE,
  DEFAULT_LABEL_SCALE,
  type GeomConstructionProps,
  type Point2D,
  computeAngleArcPoints,
  dist2D,
  footOfPerpendicular,
  getConstructMarksEnabled,
  midpoint2D,
} from "@/lib/geometry";
import { RightAngleSymbol } from "./PolygonElement";
import { formatMeasureNumber, renderCongruenceTicks } from "./SegmentElement";

export interface GeometryConstructionElementProps {
  element: CanvasElement;
  points: Map<string, Point2D>;
  scale?: number;
  labelScale?: number;
  dotScale?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
}

function getPtOrInline(
  ref: string | undefined,
  points: Map<string, Point2D>,
  fallback?: Point2D
): Point2D | undefined {
  if (ref && points.has(ref)) return points.get(ref);
  return fallback;
}

export const GeometryConstructionElement: React.FC<GeometryConstructionElementProps> = ({
  element,
  points,
  scale = 45,
  labelScale = DEFAULT_LABEL_SCALE,
  dotScale = DEFAULT_DOT_SCALE,
  isSelected = false,
  isHighlighted = false,
  onPointerDown,
}) => {
  const props = element.props as Partial<GeomConstructionProps> & {
    fromPt?: Point2D;
    toPt?: Point2D;
    sideAPt?: Point2D;
    sideBPt?: Point2D;
    measure?: boolean;
  };
  const kind = props.kind ?? "altitude";
  const style = element.style ?? {};
  const activeColor = isSelected || isHighlighted ? "#f59e0b" : undefined;
  const strokeColor =
    activeColor ??
    style.stroke ??
    (kind === "altitude"
      ? "#dc2626"
      : kind === "median"
      ? "#16a34a"
      : kind === "bisector"
      ? "#2563eb"
      : kind === "perpBisector"
      ? "#7c3aed"
      : "#334155");
  const strokeWidth = (style.width ?? 1.8) + (isSelected || isHighlighted ? 2 : 0);
  const marksEnabled = getConstructMarksEnabled();

  let pFrom = getPtOrInline(props.from ?? props.vertex, points, props.fromPt);
  const pSideA = getPtOrInline(props.sideA, points, props.sideAPt);
  const pSideB = getPtOrInline(props.sideB, points, props.sideBPt);
  let pTo = getPtOrInline(props.to ?? props.foot, points, props.toPt);

  // Dynamically recompute parallel/perp line endpoints when bound to point IDs
  if (
    (kind === "parallel" || kind === "perp") &&
    !props.to &&
    !props.foot &&
    typeof props.from === "string" &&
    typeof props.sideA === "string" &&
    typeof props.sideB === "string"
  ) {
    const dynFrom = points.get(props.from);
    const dynA = points.get(props.sideA);
    const dynB = points.get(props.sideB);
    if (dynFrom && dynA && dynB) {
      const dx = dynB.x - dynA.x;
      const dy = dynB.y - dynA.y;
      const vx = kind === "perp" ? -dy : dx;
      const vy = kind === "perp" ? dx : dy;
      pFrom = { x: dynFrom.x - vx * 0.7, y: dynFrom.y - vy * 0.7 };
      pTo = { x: dynFrom.x + vx * 0.7, y: dynFrom.y + vy * 0.7 };
    }
  }

  // If altitude/median/foot target not resolved via ID, compute directly from sideA/sideB
  if (!pTo && pFrom && pSideA && pSideB) {
    if (kind === "altitude") {
      pTo = footOfPerpendicular(pFrom, pSideA, pSideB) ?? undefined;
    } else if (kind === "median") {
      pTo = midpoint2D(pSideA, pSideB);
    }
  }

  if (!pFrom || !pTo) return null;

  const isDashed = props.dashed === true || style.dash === true || kind === "perpBisector";
  const dotRadius = (scale > 0 ? 1.8 / scale : 0.04) * dotScale;
  const labelText = typeof props.label === "string" ? props.label : undefined;

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="GeomConstruction"
      data-wb-construction={kind}
      data-selected={isSelected ? "true" : undefined}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "pointer" }}
    >
      {/* Wide transparent hit line */}
      <line
        x1={pFrom.x}
        y1={-pFrom.y}
        x2={pTo.x}
        y2={-pTo.y}
        fill="none"
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={20}
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />

      {/* Primary construction segment */}
      <line
        x1={pFrom.x}
        y1={-pFrom.y}
        x2={pTo.x}
        y2={-pTo.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isDashed ? "6 4" : undefined}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={style.opacity ?? 1}
      />

      {/* Auto right-angle square for altitudes, perpendiculars, footPlane, tangents */}
      {marksEnabled &&
        (kind === "altitude" ||
          kind === "perp" ||
          kind === "perpBisector" ||
          kind === "footPlane" ||
          kind === "tangent") &&
        pSideA &&
        pSideB && (
          <RightAngleSymbol
            vertex={pTo}
            armA={pFrom}
            armB={dist2D(pTo, pSideA) > 1e-6 ? pSideA : pSideB}
            color="#16a34a"
            strokeWidth={1.6}
          />
        )}

      {/* Median congruence ticks on divided base side */}
      {marksEnabled && kind === "median" && pSideA && pSideB && (
        <>
          {renderCongruenceTicks(pSideA, pTo, props.ticks ?? 1, strokeColor, 1.5)}
          {renderCongruenceTicks(pTo, pSideB, props.ticks ?? 1, strokeColor, 1.5)}
        </>
      )}

      {/* Bisector equal angle arcs */}
      {marksEnabled && kind === "bisector" && pSideA && pSideB && (
        <>
          <path
            d={computeAngleArcPoints(pFrom, pSideA, pTo, 0.42, 12)
              .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x} ${-p.y}`)
              .join("")}
            fill="none"
            stroke="#16a34a"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={computeAngleArcPoints(pFrom, pTo, pSideB, 0.54, 12)
              .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x} ${-p.y}`)
              .join("")}
            fill="none"
            stroke="#16a34a"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* Foot point dot & label if inline */}
      {!props.to && !props.foot && (
        <>
          <circle
            data-wb-vertex="true"
            cx={pTo.x}
            cy={-pTo.y}
            r={dotRadius}
            fill={strokeColor}
            stroke="#ffffff"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {labelText && (
            <text
              data-label={labelText}
              data-wb-label="true"
              x={pTo.x + 0.18 * labelScale}
              y={-(pTo.y - 0.18 * labelScale)}
              fontSize={0.34 * labelScale}
              fontWeight={600}
              fill={strokeColor}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {labelText}
            </text>
          )}
        </>
      )}

      {/* Optional distance readout */}
      {props.measure && (
        <text
          data-wb-length={element.id}
          x={(pFrom.x + pTo.x) / 2 + 0.25}
          y={-((pFrom.y + pTo.y) / 2)}
          fontSize={0.32}
          fill={strokeColor}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {formatMeasureNumber(dist2D(pFrom, pTo))}
        </text>
      )}
    </g>
  );
};
