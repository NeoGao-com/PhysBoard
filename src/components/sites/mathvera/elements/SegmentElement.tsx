"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import {
  type GeomSegmentProps,
  type GeomVectorProps,
  type Point2D,
  type Point3D,
  clipLineSegment,
  dist2D,
  extendRay,
  resolveConstructedLine,
  unitDir2D,
} from "@/lib/geometry";
import { dist3 } from "@/lib/geometry3d";

export interface SegmentElementProps {
  element: CanvasElement;
  points: Map<string, Point2D>;
  byId: Map<string, CanvasElement>;
  points3D?: Map<string, Point3D>;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
}

export function formatMeasureNumber(value: number): string {
  const rounded = Number(value.toFixed(2));
  return rounded.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function renderArrowhead(
  from: Point2D,
  to: Point2D,
  color: string,
  size = 0.28,
  key?: string
): React.ReactNode {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  const ux = dx / len;
  const uy = dy / len;
  const base = { x: to.x - ux * size, y: to.y - uy * size };
  const halfW = size * 0.48;
  const left = { x: base.x - uy * halfW, y: base.y + ux * halfW };
  const right = { x: base.x + uy * halfW, y: base.y - ux * halfW };
  return (
    <polygon
      key={key}
      className="arrow wb-arrow"
      points={`${to.x},${-to.y} ${left.x},${-left.y} ${right.x},${-right.y}`}
      fill={color}
      stroke="none"
    />
  );
}

export function renderCongruenceTicks(
  a: Point2D,
  b: Point2D,
  ticks: 1 | 2 | 3,
  color: string,
  strokeWidth = 1.5
): React.ReactNode {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dir = unitDir2D(a, b);
  const perp = { x: -dir.y, y: dir.x };
  const halfTick = 0.12;
  const spacing = 0.1;

  return (
    <g data-wb-ticks={ticks}>
      {Array.from({ length: ticks }, (_, i) => {
        const offset = (i - (ticks - 1) / 2) * spacing;
        const c = { x: mid.x + dir.x * offset, y: mid.y + dir.y * offset };
        return (
          <line
            key={i}
            x1={c.x - perp.x * halfTick}
            y1={-(c.y - perp.y * halfTick)}
            x2={c.x + perp.x * halfTick}
            y2={-(c.y + perp.y * halfTick)}
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

function normalOffsetPoint(a: Point2D, b: Point2D, offset: number): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < -1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
    nx = -nx;
    ny = -ny;
  }
  return {
    x: (a.x + b.x) / 2 + offset * nx,
    y: (a.y + b.y) / 2 + offset * ny,
  };
}

export const SegmentElement: React.FC<SegmentElementProps> = ({
  element,
  points,
  byId,
  points3D,
  isSelected = false,
  isHighlighted = false,
  onPointerDown,
}) => {
  const style = element.style ?? {};
  const activeColor = isSelected || isHighlighted ? "#f59e0b" : undefined;
  const pickStroke = (fallback: string) => activeColor ?? style.stroke ?? fallback;
  const strokeWidth = (style.width ?? 1.8) + (isSelected || isHighlighted ? 2 : 0);
  const baseDash = style.dash ? "6 4" : undefined;

  const hitProps = {
    fill: "none",
    stroke: "rgba(0,0,0,0.001)",
    strokeWidth: 20,
    vectorEffect: "non-scaling-stroke" as const,
    pointerEvents: "stroke" as const,
  };

  if (element.type === "GeomSegment") {
    const props = element.props as Partial<GeomSegmentProps>;
    const a = props.from ? points.get(props.from) : undefined;
    const b = props.to ? points.get(props.to) : undefined;
    if (!a || !b) return null;

    const color = pickStroke("#334155");
    const isDashed = props.dashed === true || style.dash === true;
    const ticks = props.ticks;
    const p3a = props.from ? points3D?.get(props.from) : undefined;
    const p3b = props.to ? points3D?.get(props.to) : undefined;
    const lengthVal = props.measure
      ? p3a && p3b
        ? dist3(p3a, p3b)
        : dist2D(a, b)
      : null;
    const labelPos = lengthVal !== null ? normalOffsetPoint(a, b, 0.28) : null;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="GeomSegment"
        data-wb-construction={props.construction}
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <line x1={a.x} y1={-a.y} x2={b.x} y2={-b.y} {...hitProps} />
        <circle
          cx={(a.x + b.x) / 2}
          cy={-((a.y + b.y) / 2)}
          r={0.04}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
          style={{ pointerEvents: "none" }}
        />
        <line
          x1={a.x}
          y1={-a.y}
          x2={b.x}
          y2={-b.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={isDashed ? "6 4" : undefined}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />
        {ticks ? renderCongruenceTicks(a, b, ticks, color, strokeWidth) : null}
        {lengthVal !== null && labelPos && (
          <text
            data-wb-length={element.id}
            x={labelPos.x}
            y={-labelPos.y}
            fontSize={0.34}
            fill={color}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {formatMeasureNumber(lengthVal)}
          </text>
        )}
      </g>
    );
  }

  if (element.type === "GeomVector") {
    const props = element.props as Partial<GeomVectorProps>;
    const a = props.from ? points.get(props.from) : undefined;
    const b = props.to ? points.get(props.to) : undefined;
    if (!a || !b) return null;

    const color = pickStroke("#334155");
    const name = (props.name ?? "").trim();
    const namePos = normalOffsetPoint(a, b, 0.32);
    const fontSize = 0.34;
    const barWidth = Math.max(0.16, name.length * fontSize * 0.55);
    const p3a = props.from ? points3D?.get(props.from) : undefined;
    const p3b = props.to ? points3D?.get(props.to) : undefined;
    const lengthVal = props.measure
      ? p3a && p3b
        ? dist3(p3a, p3b)
        : dist2D(a, b)
      : null;
    const magPos = lengthVal !== null ? normalOffsetPoint(a, b, -0.3) : null;
    const endNames = [props.from, props.to]
      .map((id) => (id ? String(byId.get(id)?.props.name ?? "") : ""))
      .join("");

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="GeomVector"
        data-type="vector"
        data-wb-vector={element.id}
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <line x1={a.x} y1={-a.y} x2={b.x} y2={-b.y} {...hitProps} />
        <circle
          cx={(a.x + b.x) / 2}
          cy={-((a.y + b.y) / 2)}
          r={0.04}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
          style={{ pointerEvents: "none" }}
        />
        <line
          x1={a.x}
          y1={-a.y}
          x2={b.x}
          y2={-b.y}
          stroke={color}
          strokeWidth={strokeWidth + 0.5}
          strokeDasharray={baseDash}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />
        {renderArrowhead(a, b, color, 0.3, "vec-arrow")}
        {name && (
          <g data-wb-vector-name={element.id} style={{ pointerEvents: "none" }}>
            <text
              x={namePos.x}
              y={-namePos.y + fontSize * 0.35}
              fontSize={fontSize}
              fontStyle="italic"
              fill={color}
              textAnchor="middle"
            >
              {name}
            </text>
            <line
              x1={namePos.x - barWidth / 2}
              y1={-namePos.y - fontSize * 0.62}
              x2={namePos.x + barWidth / 2}
              y2={-namePos.y - fontSize * 0.62}
              stroke={color}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            {renderArrowhead(
              { x: namePos.x - barWidth / 2, y: namePos.y + fontSize * 0.62 },
              { x: namePos.x + barWidth / 2 + 0.04, y: namePos.y + fontSize * 0.62 },
              color,
              0.1,
              "vec-name-arrow"
            )}
          </g>
        )}
        {lengthVal !== null && magPos && (
          <text
            data-wb-length={element.id}
            x={magPos.x}
            y={-magPos.y}
            fontSize={0.3}
            fill={color}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: "none" }}
          >
            {endNames.length >= 2
              ? `${endNames} = ${formatMeasureNumber(lengthVal)}`
              : formatMeasureNumber(lengthVal)}
          </text>
        )}
      </g>
    );
  }

  if (element.type === "GeomRay") {
    const props = element.props as { from?: string; to?: string };
    const a = props.from ? points.get(props.from) : undefined;
    const b = props.to ? points.get(props.to) : undefined;
    if (!a || !b) return null;
    const [p0, p1] = extendRay(a, b);
    const color = pickStroke("#334155");

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="GeomRay"
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <line x1={p0.x} y1={-p0.y} x2={p1.x} y2={-p1.y} {...hitProps} />
        <circle
          cx={(a.x + b.x) / 2}
          cy={-((a.y + b.y) / 2)}
          r={0.04}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
          style={{ pointerEvents: "none" }}
        />
        <line
          x1={p0.x}
          y1={-p0.y}
          x2={p1.x}
          y2={-p1.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={baseDash}
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />
        {renderArrowhead(p0, p1, color, 0.28, "ray-arrow")}
      </g>
    );
  }

  if (element.type === "GeomLine") {
    const def = element.props.def;
    let p0: Point2D | null = null;
    let p1: Point2D | null = null;
    let isPerpBisector = false;
    let isRay = false;

    if (def === "through") {
      const a = typeof element.props.from === "string" ? points.get(element.props.from) : undefined;
      const b = typeof element.props.to === "string" ? points.get(element.props.to) : undefined;
      if (!a || !b) return null;
      [p0, p1] = clipLineSegment(a, b);
    } else {
      const resolved = resolveConstructedLine(element, (id) => points.get(id), byId);
      if (!resolved) return null;
      p0 = {
        x: resolved.anchor.x + resolved.dir.x * resolved.t0,
        y: resolved.anchor.y + resolved.dir.y * resolved.t0,
      };
      p1 = {
        x: resolved.anchor.x + resolved.dir.x * resolved.t1,
        y: resolved.anchor.y + resolved.dir.y * resolved.t1,
      };
      isPerpBisector = def === "perpBisector";
      isRay = resolved.isRay;
    }

    const color = pickStroke(isPerpBisector ? "#7c3aed" : "#475569");
    const construction = typeof element.props.construction === "string" ? element.props.construction : undefined;

    return (
      <g
        data-id={element.id}
        data-oid={element.id}
        data-element-type="GeomLine"
        data-wb-construction={construction}
        data-selected={isSelected ? "true" : undefined}
        onPointerDown={(e) => onPointerDown?.(e, element.id)}
        style={{ cursor: "pointer" }}
      >
        <line x1={p0.x} y1={-p0.y} x2={p1.x} y2={-p1.y} {...hitProps} />
        <circle
          cx={(p0.x + p1.x) / 2}
          cy={-((p0.y + p1.y) / 2)}
          r={0.04}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
          style={{ pointerEvents: "none" }}
        />
        <line
          x1={p0.x}
          y1={-p0.y}
          x2={p1.x}
          y2={-p1.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={isPerpBisector ? "6 4" : baseDash}
          vectorEffect="non-scaling-stroke"
          opacity={style.opacity ?? 1}
        />
        {isRay ? renderArrowhead(p0, p1, color, 0.25, "bis-arrow") : null}
      </g>
    );
  }

  return null;
};
