"use client";

import React, { useMemo } from "react";
import { InkProps, Style, Transform } from "@/types/whiteboard";
import { generateCatmullRomSpline, generateFilledInkPath } from "@/lib/ink";

export interface InkElementProps {
  id: string;
  transform: Transform;
  style: Style;
  props: InkProps;
  scale?: number;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const DEFAULT_WIDTH = 2.4;

export const InkElement: React.FC<InkElementProps> = ({
  id,
  transform,
  style,
  props,
  scale = 45,
  isSelected = false,
  onPointerDown,
}) => {
  const points = useMemo(() => props.points ?? [], [props.points]);
  const strokeColor = style.stroke ?? "#111827";
  const strokeWidth = style.width ?? DEFAULT_WIDTH;
  const isDashed = style.dash === true;

  const isFountain = props.nib === "fountain";

  // Polyline coordinates for hit testing
  const polylinePoints = useMemo(() => {
    const pairs: string[] = [];
    for (let i = 0; i + 1 < points.length; i += 2) {
      pairs.push(`${points[i]},${-points[i + 1]}`);
    }
    return pairs.join(" ");
  }, [points]);

  // SVG Path Data
  const pathData = useMemo(() => {
    if (isFountain) {
      return generateFilledInkPath(
        points,
        props.pressures,
        scale,
        strokeWidth,
        props.nib
      );
    }
    return generateCatmullRomSpline(points);
  }, [points, props.pressures, scale, strokeWidth, isFountain, props.nib]);

  return (
    <g
      data-oid={id}
      data-element-type="Ink"
      data-nib={props.nib}
      data-selected={isSelected ? "true" : undefined}
      className={isFountain ? "wb-fountain-stroke" : "wb-ink-stroke"}
      transform={`translate(${transform.x} ${-transform.y})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      {/* 1. Invisible wide hit-target polyline for easy cursor selection & eraser detection */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={20}
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />

      {/* 2. Rendered stroke path */}
      {isFountain ? (
        <path
          d={pathData}
          fill={strokeColor}
          stroke="none"
          opacity={style.opacity ?? 1}
        />
      ) : (
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isDashed ? "6 4" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />
      )}
    </g>
  );
};
