"use client";

import React, { useMemo } from "react";
import { CanvasElement } from "@/types/whiteboard";
import type { PhysicsSimProps } from "@/types/physics";
import {
  evaluatePhysicsSim,
  getEffectiveSimTime,
  getPhysicsSimMeta,
} from "@/lib/physics-sim";

export interface AxesBounds {
  originX: number;
  originY: number;
  unitScale: number;
  xNeg: number;
  xPos: number;
  yNeg: number;
  yPos: number;
}

/**
 * Extracts normalized Cartesian bounds and origin transform for an Axes2D element.
 */
export function getAxesBounds(element: CanvasElement): AxesBounds {
  const p = element.props ?? {};
  const baseSize = typeof p.size === "number" && p.size > 0 ? p.size : 5;
  const sizeX = typeof p.sizeX === "number" && p.sizeX > 0 ? p.sizeX : baseSize;
  const sizeY = typeof p.sizeY === "number" && p.sizeY > 0 ? p.sizeY : baseSize;
  const xPos = typeof p.xPos === "number" && p.xPos > 0 ? p.xPos : sizeX;
  const xNeg = typeof p.xNeg === "number" && p.xNeg > 0 ? p.xNeg : sizeX;
  const yPos = typeof p.yPos === "number" && p.yPos > 0 ? p.yPos : sizeY;
  const yNeg = typeof p.yNeg === "number" && p.yNeg > 0 ? p.yNeg : sizeY;

  return {
    originX: element.transform.x || 0,
    originY: element.transform.y || 0,
    unitScale: element.transform.scale || 1,
    xNeg,
    xPos,
    yNeg,
    yPos,
  };
}

export type AxesResizeSide = "xNeg" | "xPos" | "yPos" | "yNeg";

export interface AxesElementProps {
  element: CanvasElement;
  allElements?: CanvasElement[];
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onResizeHandlePointerDown?: (
    e: React.PointerEvent,
    side: AxesResizeSide
  ) => void;
}

/**
 * Renders 2D Oxy Cartesian Coordinate Axes (`[data-wb-type="Axes"]`, `.wb-axes`)
 * with optional grid, integer or π ticks, axis arrowheads, and `x`, `y`, `O` labels.
 */
export const AxesElement: React.FC<AxesElementProps> = ({
  element,
  allElements = [],
  isSelected = false,
  onPointerDown,
  onResizeHandlePointerDown,
}) => {
  const bounds = useMemo(() => getAxesBounds(element), [element]);
  const p = element.props ?? {};
  const showGrid = p.grid !== false;
  const tickMode = p.ticks === "pi" ? "pi" : "int";
  const showLegend = p.legend !== false;
  const axisColor = isSelected ? "#f59e0b" : (element.style?.stroke ?? "#475569");
  const arrowSize = 0.22;

  const xTicks = useMemo(() => {
    const out: Array<{ pos: number; label: string }> = [];
    if (tickMode === "pi") {
      const step = Math.PI / 2;
      const kMin = Math.ceil(-bounds.xNeg / step);
      const kMax = Math.floor(bounds.xPos / step);
      for (let k = kMin; k <= kMax; k++) {
        if (k === 0) continue;
        const pos = k * step;
        if (Math.abs(pos) > bounds.xPos - 0.35 && pos > 0) continue;
        const sign = k < 0 ? "-" : "";
        const ak = Math.abs(k);
        let label = "";
        if (ak === 1) label = `${sign}π/2`;
        else if (ak % 2 === 0) label = ak === 2 ? `${sign}π` : `${sign}${ak / 2}π`;
        else label = `${sign}${ak}π/2`;
        out.push({ pos, label });
      }
    } else {
      const minI = Math.ceil(-bounds.xNeg + 0.4);
      const maxI = Math.floor(bounds.xPos - 0.4);
      for (let i = minI; i <= maxI; i++) {
        if (i === 0) continue;
        out.push({ pos: i, label: String(i) });
      }
    }
    return out;
  }, [bounds.xNeg, bounds.xPos, tickMode]);

  const yTicks = useMemo(() => {
    const out: Array<{ pos: number; label: string }> = [];
    const minI = Math.ceil(-bounds.yNeg + 0.4);
    const maxI = Math.floor(bounds.yPos - 0.4);
    for (let i = minI; i <= maxI; i++) {
      if (i === 0) continue;
      out.push({ pos: i, label: String(i) });
    }
    return out;
  }, [bounds.yNeg, bounds.yPos]);

  const gridLines = useMemo(() => {
    if (!showGrid) return { vertical: [] as number[], horizontal: [] as number[] };
    const vertical: number[] = [];
    const horizontal: number[] = [];
    const xStep = tickMode === "pi" ? Math.PI / 2 : 1;
    const kxMin = Math.ceil(-bounds.xNeg / xStep);
    const kxMax = Math.floor(bounds.xPos / xStep);
    for (let k = kxMin; k <= kxMax; k++) {
      if (k === 0) continue;
      vertical.push(k * xStep);
    }
    const kyMin = Math.ceil(-bounds.yNeg);
    const kyMax = Math.floor(bounds.yPos);
    for (let k = kyMin; k <= kyMax; k++) {
      if (k === 0) continue;
      horizontal.push(k);
    }
    return { vertical, horizontal };
  }, [showGrid, tickMode, bounds]);

  // Find linked PhysicsSim element if any (via element.props.linkedSimId or sim's linkedAxesId or proximity)
  const linkedSim = useMemo(() => {
    const directId = typeof p.linkedSimId === "string" ? p.linkedSimId : undefined;
    if (directId) {
      const match = allElements.find((e) => e.id === directId && e.type === "PhysicsSim");
      if (match) return match;
    }
    return allElements.find(
      (e) => e.type === "PhysicsSim" && e.props && (e.props as unknown as PhysicsSimProps).linkedAxesId === element.id
    );
  }, [p.linkedSimId, element.id, allElements]);

  // Compute realtime oscilloscope curves from the linked simulation
  const oscilloscopePaths = useMemo(() => {
    if (!linkedSim) return { d1: "", d2: "", title: "" };
    const simProps = linkedSim.props as unknown as PhysicsSimProps;
    if (!simProps?.kind) return { d1: "", d2: "", title: "" };

    const meta = getPhysicsSimMeta(simProps.kind);
    const t = getEffectiveSimTime(simProps);
    const ev = evaluatePhysicsSim(simProps.kind, t, simProps.params ?? {}, simProps.mode);
    if (!ev.series || ev.series.length < 2) return { d1: "", d2: "", title: meta.graphAxesLabel.title };

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of ev.series) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
      if (typeof pt.y2 === "number") {
        if (pt.y2 < minY) minY = pt.y2;
        if (pt.y2 > maxY) maxY = pt.y2;
      }
    }
    const spanX = Math.max(1e-6, maxX - minX);
    const spanY = Math.max(1e-6, maxY - minY);

    // Map series directly into the Oxy coordinates
    const toOxy = (x: number, y: number) => {
      const nx = -bounds.xNeg * 0.85 + ((x - minX) / spanX) * (bounds.xNeg + bounds.xPos) * 0.85;
      const ny = -bounds.yNeg * 0.85 + ((y - minY) / spanY) * (bounds.yNeg + bounds.yPos) * 0.85;
      // In SVG under our coordinate transform: x is horizontal, -y is vertical upward
      return { px: nx, py: -ny };
    };

    const d1 = ev.series
      .map((pt, idx) => {
        const { px, py } = toOxy(pt.x, pt.y);
        return `${idx === 0 ? "M" : "L"} ${px.toFixed(3)} ${py.toFixed(3)}`;
      })
      .join(" ");

    const hasSecond = ev.series.some((pt) => typeof pt.y2 === "number");
    const d2 = hasSecond
      ? ev.series
          .map((pt, idx) => {
            const { px, py } = toOxy(pt.x, pt.y2 ?? pt.y);
            return `${idx === 0 ? "M" : "L"} ${px.toFixed(3)} ${py.toFixed(3)}`;
          })
          .join(" ")
      : "";

    return { d1, d2, title: meta.graphAxesLabel.title };
  }, [linkedSim, bounds]);

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="Axes2D"
      data-wb-type="Axes"
      className="wb-axes"
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${bounds.originX} ${-bounds.originY}) scale(${bounds.unitScale})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      {/* Invisible hit area so clicking anywhere in the frame selects it */}
      <rect
        x={-bounds.xNeg}
        y={-bounds.yPos}
        width={bounds.xNeg + bounds.xPos}
        height={bounds.yNeg + bounds.yPos}
        fill="rgba(255,255,255,0.001)"
        stroke={isSelected ? "#f59e0b" : "none"}
        strokeDasharray={isSelected ? "4 3" : undefined}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Grid lines */}
      {showGrid && (
        <g stroke="#e2e8f0" strokeWidth={1} pointerEvents="none">
          {gridLines.vertical.map((x) => (
            <line
              key={`gv-${x.toFixed(3)}`}
              x1={x}
              y1={-bounds.yPos}
              x2={x}
              y2={bounds.yNeg}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {gridLines.horizontal.map((y) => (
            <line
              key={`gh-${y}`}
              x1={-bounds.xNeg}
              y1={-y}
              x2={bounds.xPos}
              y2={-y}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      {/* X axis */}
      <line
        x1={-bounds.xNeg}
        y1={0}
        x2={bounds.xPos}
        y2={0}
        stroke={axisColor}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`${bounds.xPos},0 ${bounds.xPos - arrowSize},${-arrowSize * 0.45} ${bounds.xPos - arrowSize},${arrowSize * 0.45}`}
        fill={axisColor}
      />

      {/* Y axis */}
      <line
        x1={0}
        y1={bounds.yNeg}
        x2={0}
        y2={-bounds.yPos}
        stroke={axisColor}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,${-bounds.yPos} ${-arrowSize * 0.45},${-bounds.yPos + arrowSize} ${arrowSize * 0.45},${-bounds.yPos + arrowSize}`}
        fill={axisColor}
      />

      {/* X ticks & labels */}
      {xTicks.map((t) => (
        <g key={`xt-${t.pos.toFixed(3)}`}>
          <line
            x1={t.pos}
            y1={-0.08}
            x2={t.pos}
            y2={0.08}
            stroke={axisColor}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={t.pos}
            y={0.34}
            fontSize={0.26}
            fill="#64748b"
            textAnchor="middle"
            fontFamily="KaTeX_Main, 'Times New Roman', serif"
            style={{ pointerEvents: "none" }}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Y ticks & labels */}
      {yTicks.map((t) => (
        <g key={`yt-${t.pos}`}>
          <line
            x1={-0.08}
            y1={-t.pos}
            x2={0.08}
            y2={-t.pos}
            stroke={axisColor}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={-0.18}
            y={-t.pos + 0.09}
            fontSize={0.26}
            fill="#64748b"
            textAnchor="end"
            fontFamily="KaTeX_Main, 'Times New Roman', serif"
            style={{ pointerEvents: "none" }}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Origin dot */}
      <circle cx={0} cy={0} r={0.06} fill="#2563eb" />

      {/* Realtime Oscilloscope Curves (when linked to a PhysicsSim) */}
      {linkedSim && (
        <g data-linked-sim={linkedSim.id} className="wb-oscilloscope-curves">
          {oscilloscopePaths.d1 && (
            <path
              d={oscilloscopePaths.d1}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {oscilloscopePaths.d2 && (
            <path
              d={oscilloscopePaths.d2}
              fill="none"
              stroke="#ea580c"
              strokeWidth={2.0}
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {oscilloscopePaths.title && (
            <g transform={`translate(${-bounds.xNeg + 0.3}, ${-bounds.yPos + 0.5})`}>
              <rect
                x={0}
                y={-0.32}
                width={Math.min(bounds.xPos + bounds.xNeg - 0.6, 3.8)}
                height={0.46}
                rx={0.08}
                fill="rgba(255, 255, 255, 0.88)"
                stroke="#cbd5e1"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={0.15}
                y={0}
                fontSize={0.24}
                fontWeight={700}
                fill="#1e3a8a"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ pointerEvents: "none" }}
              >
                📡 {oscilloscopePaths.title}
              </text>
            </g>
          )}
        </g>
      )}

      {/* Axis & Origin labels */}
      {showLegend && (
        <>
          <text
            x={bounds.xPos - 0.1}
            y={-0.22}
            fontSize={0.34}
            fontStyle="italic"
            fontWeight={600}
            fill={axisColor}
            textAnchor="end"
            fontFamily="KaTeX_Math, 'Times New Roman', serif"
            style={{ pointerEvents: "none" }}
          >
            x
          </text>
          <text
            x={0.2}
            y={-bounds.yPos + 0.28}
            fontSize={0.34}
            fontStyle="italic"
            fontWeight={600}
            fill={axisColor}
            textAnchor="start"
            fontFamily="KaTeX_Math, 'Times New Roman', serif"
            style={{ pointerEvents: "none" }}
          >
            y
          </text>
          <text
            x={-0.22}
            y={0.32}
            fontSize={0.32}
            fontStyle="italic"
            fill="#334155"
            textAnchor="end"
            fontFamily="KaTeX_Math, 'Times New Roman', serif"
            style={{ pointerEvents: "none" }}
          >
            O
          </text>
        </>
      )}

      {/* 4 Axis-tip extension handles when selected */}
      {isSelected &&
        (
          [
            { side: "xNeg" as const, x: -bounds.xNeg, y: 0, cursor: "ew-resize" },
            { side: "xPos" as const, x: bounds.xPos, y: 0, cursor: "ew-resize" },
            { side: "yPos" as const, x: 0, y: -bounds.yPos, cursor: "ns-resize" },
            { side: "yNeg" as const, x: 0, y: bounds.yNeg, cursor: "ns-resize" },
          ] as const
        ).map((h) => (
          <rect
            key={h.side}
            data-axes-handle={h.side}
            x={h.x - 0.14}
            y={h.y - 0.14}
            width={0.28}
            height={0.28}
            rx={0.03}
            fill="#ffffff"
            stroke="#0d9488"
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeHandlePointerDown?.(e, h.side);
            }}
            style={{ cursor: h.cursor }}
          />
        ))}
    </g>
  );
};
