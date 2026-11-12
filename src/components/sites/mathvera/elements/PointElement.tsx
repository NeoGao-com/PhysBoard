"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import {
  DEFAULT_DOT_SCALE,
  DEFAULT_LABEL_SCALE,
  type GeomPointProps,
  type Point2D,
} from "@/lib/geometry";

export interface PointElementProps {
  element: CanvasElement;
  position?: Point2D;
  scale?: number;
  labelScale?: number;
  dotScale?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isExporting?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onLabelPointerDown?: (e: React.PointerEvent, id: string) => void;
  onLabelDoubleClick?: (e: React.MouseEvent, id: string) => void;
}

export const PointElement: React.FC<PointElementProps> = ({
  element,
  position,
  scale = 45,
  labelScale = DEFAULT_LABEL_SCALE,
  dotScale = DEFAULT_DOT_SCALE,
  isSelected = false,
  isHighlighted = false,
  isExporting = false,
  onPointerDown,
  onLabelPointerDown,
  onLabelDoubleClick,
}) => {
  const props = element.props as Partial<GeomPointProps>;
  const wx = position?.x ?? element.transform.x;
  const wy = position?.y ?? element.transform.y;
  const sx = wx;
  const sy = -wy;

  const isHandle = props.handle === true;
  if (isHandle && isExporting) {
    return null;
  }

  const name = typeof props.name === "string" ? props.name : "";
  const effectiveLabelScale =
    typeof props.labelScale === "number" && props.labelScale > 0
      ? props.labelScale
      : labelScale;
  const effectiveDotScale =
    typeof props.dotSize === "number" && props.dotSize > 0
      ? props.dotSize
      : dotScale;

  const styleStroke = element.style?.stroke ?? undefined;
  const styleFill = element.style?.fill ?? undefined;
  const strokeWidth = element.style?.width ?? 2;
  const activeColor = isSelected || isHighlighted ? "#f59e0b" : undefined;
  const dotColor = activeColor ?? styleFill ?? styleStroke ?? "#2563eb";
  const labelColor = isSelected ? "#b45309" : styleStroke ?? "#1e3a5f";

  if (isHandle) {
    const half = 0.11;
    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="Point"
        data-handle="true"
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "grab" }}
      >
        <rect
          x={sx - half}
          y={sy - half}
          width={half * 2}
          height={half * 2}
          fill="#ffffff"
          stroke={activeColor ?? styleStroke ?? "#2563eb"}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const baseDotRadius =
    (scale > 0 ? 1.8 / scale : 0.04) *
    effectiveDotScale *
    (strokeWidth > 0 ? Math.max(1, strokeWidth / 2) : 1);
  const hitRadius = Math.max(0.2, 10 / (scale || 45));

  const labelDx = typeof props.labelDx === "number" ? props.labelDx : 0.18 * effectiveLabelScale;
  const labelDy = typeof props.labelDy === "number" ? props.labelDy : 0.12 * effectiveLabelScale;
  const labelX = sx + labelDx;
  const labelY = sy - labelDy;
  const fontSize = 0.34 * effectiveLabelScale;
  const labelBoxW = (0.22 * Math.max(1, name.length) + 0.22) * effectiveLabelScale;
  const labelBoxH = 0.48 * effectiveLabelScale;
  const dotMode = props.dot ?? "dot";

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Point"
      data-selected={isSelected ? "true" : undefined}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "pointer" }}
    >
      {/* Generous invisible hit circle for reliable selection & snapping */}
      <circle
        cx={sx}
        cy={sy}
        r={hitRadius}
        fill="rgba(0,0,0,0.001)"
        stroke="none"
      />

      {/* Selection / hover halo */}
      {(isSelected || isHighlighted) && (
        <circle
          cx={sx}
          cy={sy}
          r={0.18}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Dot rendering */}
      {dotMode === "none" ? (
        <circle
          cx={sx}
          cy={sy}
          r={0.12}
          fill={isSelected ? "rgba(245,158,11,0.35)" : "transparent"}
        />
      ) : dotMode === "cross" ? (
        <path
          d={`M${sx - baseDotRadius * 1.3} ${sy - baseDotRadius * 1.3}L${sx + baseDotRadius * 1.3} ${sy + baseDotRadius * 1.3}M${sx - baseDotRadius * 1.3} ${sy + baseDotRadius * 1.3}L${sx + baseDotRadius * 1.3} ${sy - baseDotRadius * 1.3}`}
          stroke={dotColor}
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <circle
          cx={sx}
          cy={sy}
          r={baseDotRadius}
          fill={dotColor}
          stroke="#ffffff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Point name label */}
      {!props.hideName && name && (
        <>
          <rect
            data-label-hit={element.id}
            x={labelX - 0.1}
            y={labelY - 0.34 * effectiveLabelScale}
            width={labelBoxW}
            height={labelBoxH}
            fill="transparent"
            style={{ cursor: "move" }}
            onPointerDown={(e) => onLabelPointerDown?.(e, element.id)}
            onDoubleClick={(e) => onLabelDoubleClick?.(e, element.id)}
          >
            <title>Kéo để di nhãn · double-click để đổi tên</title>
          </rect>
          <text
            data-label={name}
            data-wb-label="true"
            x={labelX}
            y={labelY}
            fontSize={fontSize}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight={600}
            fill={labelColor}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {name}
          </text>
        </>
      )}
    </g>
  );
};
