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
  getConstructMarksEnabled,
  resolveGeomConstructionGeometry,
} from "@/lib/geometry";
import { RightAngleSymbol } from "./PolygonElement";
import { formatMeasureNumber, renderCongruenceTicks } from "./SegmentElement";

export interface GeometryConstructionElementProps {
  element: CanvasElement;
  points: Map<string, Point2D>;
  byId?: Map<string, CanvasElement>;
  scale?: number;
  labelScale?: number;
  dotScale?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
}

const EMPTY_BY_ID = new Map<string, CanvasElement>();

export const GeometryConstructionElement: React.FC<GeometryConstructionElementProps> = ({
  element,
  points,
  byId = EMPTY_BY_ID,
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
      : kind === "tangent"
      ? "#0891b2"
      : "#334155");
  const strokeWidth = (style.width ?? 1.8) + (isSelected || isHighlighted ? 2 : 0);
  const marksEnabled = getConstructMarksEnabled();

  const resolved = resolveGeomConstructionGeometry(element, points, byId);
  if (!resolved) return null;
  const {
    pFrom,
    pTo,
    pSideA,
    pSideB,
    midpoint,
    rightAngleVertex,
    rightAngleArmA,
    rightAngleArmB,
  } = resolved;

  const isDashed = props.dashed === true || style.dash === true || kind === "perpBisector";
  const dotRadius = (scale > 0 ? 1.8 / scale : 0.04) * dotScale;
  const labelText = typeof props.label === "string" ? props.label : undefined;
  const footDisplayPt = kind === "tangent" && pSideB ? pSideB : pTo;
  const showEndpointDot =
    !props.to &&
    !props.foot &&
    (kind === "altitude" ||
      kind === "median" ||
      kind === "bisector" ||
      kind === "footPlane" ||
      kind === "tangent");

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
        rightAngleVertex &&
        rightAngleArmA &&
        rightAngleArmB && (
          <RightAngleSymbol
            vertex={rightAngleVertex}
            armA={rightAngleArmA}
            armB={rightAngleArmB}
            color="#16a34a"
            strokeWidth={1.6}
          />
        )}

      {/* Congruence ticks on divided base side for median and perpBisector */}
      {marksEnabled &&
        kind === "median" &&
        pSideA &&
        pSideB && (
          <>
            {renderCongruenceTicks(pSideA, pTo, props.ticks ?? 1, strokeColor, 1.5)}
            {renderCongruenceTicks(pTo, pSideB, props.ticks ?? 1, strokeColor, 1.5)}
          </>
        )}
      {marksEnabled &&
        kind === "perpBisector" &&
        midpoint &&
        pSideA &&
        pSideB && (
          <>
            {renderCongruenceTicks(pSideA, midpoint, props.ticks ?? 1, strokeColor, 1.5)}
            {renderCongruenceTicks(midpoint, pSideB, props.ticks ?? 1, strokeColor, 1.5)}
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

      {/* Foot / tangency point dot & label if inline */}
      {showEndpointDot && (
        <>
          <circle
            data-wb-vertex="true"
            cx={footDisplayPt.x}
            cy={-footDisplayPt.y}
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
              x={footDisplayPt.x + 0.18 * labelScale}
              y={-(footDisplayPt.y - 0.18 * labelScale)}
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
