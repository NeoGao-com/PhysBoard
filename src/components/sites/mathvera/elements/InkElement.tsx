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

  const isVariableInk = props.nib === "fountain" || props.nib === "brush";
  const isHighlighter = props.nib === "highlighter";
  const isPencil = props.nib === "pencil";
  const isDashed = style.dash === true || props.nib === "dashed";
  const effectiveWidth =
    props.nib === "brush"
      ? strokeWidth * 1.9
      : isHighlighter
      ? Math.max(12, strokeWidth * 5.2)
      : isPencil
      ? Math.max(1.2, strokeWidth * 0.8)
      : strokeWidth;
  const effectiveOpacity =
    style.opacity ?? (isHighlighter ? 0.36 : isPencil ? 0.78 : 1);

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
    if (isVariableInk) {
      return generateFilledInkPath(
        points,
        props.pressures,
        scale,
        effectiveWidth,
        props.nib
      );
    }
    return generateCatmullRomSpline(points);
  }, [points, props.pressures, scale, effectiveWidth, isVariableInk, props.nib]);

  return (
    <g
      data-oid={id}
      data-element-type="Ink"
      data-nib={props.nib}
      data-selected={isSelected ? "true" : undefined}
      className={isVariableInk ? "wb-fountain-stroke" : "wb-ink-stroke"}
      transform={`translate(${transform.x} ${-transform.y})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      {/* 1. Invisible wide hit-target polyline for easy cursor selection & eraser detection */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={Math.max(20, effectiveWidth)}
        pointerEvents="stroke"
        vectorEffect="non-scaling-stroke"
      />

      {/* 2. Rendered stroke path */}
      {isVariableInk ? (
        <path
          d={pathData}
          fill={strokeColor}
          stroke="none"
          opacity={effectiveOpacity}
        />
      ) : (
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={effectiveWidth}
          strokeDasharray={
            isDashed ? "7 5" : isPencil ? "1.6 0.6" : undefined
          }
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={effectiveOpacity}
          style={isHighlighter ? { mixBlendMode: "multiply" } : undefined}
        />
      )}
    </g>
  );
};
