"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import {
  type CircleRadiusSpec,
  type GeomCircleProps,
  type Point2D,
  resolveCircleRadius,
} from "@/lib/geometry";

export interface CircleElementProps {
  element: CanvasElement;
  points: Map<string, Point2D>;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
}

export const CircleElement: React.FC<CircleElementProps> = ({
  element,
  points,
  isSelected = false,
  isHighlighted = false,
  onPointerDown,
}) => {
  const props = element.props as Partial<GeomCircleProps>;
  const center = props.center ? points.get(props.center) : undefined;
  if (!center) return null;

  const r = resolveCircleRadius(
    props.radius as CircleRadiusSpec | undefined,
    center,
    (id) => points.get(id)
  );
  if (r === null || !Number.isFinite(r) || r <= 0) return null;

  const style = element.style ?? {};
  const strokeColor =
    isSelected || isHighlighted ? "#f59e0b" : style.stroke ?? "#0891b2";
  const strokeWidth = (style.width ?? 1.8) + (isSelected || isHighlighted ? 2 : 0);
  const fillColor = style.fill ?? "none";

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="GeomCircle"
      data-wb-type="circle"
      data-selected={isSelected ? "true" : undefined}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "pointer" }}
    >
      {/* Wide transparent stroke ring for easy hit-testing */}
      <circle
        cx={center.x}
        cy={-center.y}
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={20}
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={center.x}
        cy={-center.y}
        r={r}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={style.dash ? "6 4" : undefined}
        vectorEffect="non-scaling-stroke"
        opacity={style.opacity ?? 1}
      />
    </g>
  );
};
