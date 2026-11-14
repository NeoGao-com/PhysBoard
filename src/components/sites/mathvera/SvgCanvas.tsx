"use client";

import React, { useMemo } from "react";
import { type ViewportTransform, getPatternOffset } from "@/lib/coordinates";
import {
  BOARD_FORMAT_OPTIONS,
  DEFAULT_PAGE_BOARD_CONFIG,
  type PageBoardConfig,
  resolveBoardColors,
} from "@/lib/board-themes";

export interface SvgCanvasProps {
  viewport: ViewportTransform;
  containerRef: React.RefObject<SVGSVGElement | null>;
  currentTool?: string | null;
  isPanning?: boolean;
  isSpacePressed?: boolean;
  contained?: boolean;
  boardConfig?: PageBoardConfig;
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  svgOverlay?: React.ReactNode;
  overlayChildren?: React.ReactNode;
  gridEnabled?: boolean;
  className?: string;
}

export function SvgCanvas({
  viewport,
  containerRef,
  currentTool = null,
  isPanning = false,
  isSpacePressed = false,
  contained = false,
  boardConfig = DEFAULT_PAGE_BOARD_CONFIG,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onDragOver,
  onDrop,
  children,
  svgOverlay,
  overlayChildren,
  gridEnabled = true,
  className = "",
}: SvgCanvasProps) {
  const theme = useMemo(() => resolveBoardColors(boardConfig), [boardConfig]);

  // Cursor calculation matching Mathvera
  const cursorStyle = useMemo(() => {
    if (isPanning) return "grabbing";
    if (isSpacePressed || currentTool === "pan") return "grab";
    if (
      (typeof currentTool === "string" && currentTool.startsWith("ink")) ||
      currentTool === "erase" ||
      currentTool === "point" ||
      currentTool === "geometry.point" ||
      currentTool === "circle" ||
      currentTool === "c:circle" ||
      currentTool === "polygon" ||
      currentTool === "c:polygon" ||
      currentTool === "formula" ||
      currentTool === "text.write" ||
      currentTool === "floodFill" ||
      (typeof currentTool === "string" &&
        (currentTool.startsWith("c:") ||
          currentTool.startsWith("p3:") ||
          currentTool.startsWith("table:") ||
          currentTool.startsWith("realworld:") ||
          currentTool === "select:marquee"))
    ) {
      return "crosshair";
    }
    return "default";
  }, [isPanning, isSpacePressed, currentTool]);

  const spacing = theme.spacingPx;
  const patternOffset = useMemo(
    () => getPatternOffset(viewport.tx, viewport.ty, spacing),
    [viewport.tx, viewport.ty, spacing]
  );
  const graphMajor = spacing * 5;
  const graphOffset = useMemo(
    () => getPatternOffset(viewport.tx, viewport.ty, graphMajor),
    [viewport.tx, viewport.ty, graphMajor]
  );
  const showPattern = gridEnabled && boardConfig.pattern !== "none";
  const boardFormat = boardConfig.format ?? "infinite";
  const a4FormatOption = BOARD_FORMAT_OPTIONS.find((f) => f.id === boardFormat);
  const isA4 = boardFormat === "a4_portrait" || boardFormat === "a4_landscape";

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-board-surface={boardConfig.surface}
      data-board-pattern={boardConfig.pattern}
      data-board-dark={theme.isDark ? "true" : "false"}
      className={`${contained ? "absolute inset-0" : "fixed inset-0"} overflow-hidden select-none ${className}`}
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundColor: theme.bg,
        transition: "background-color 180ms ease",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <svg
        ref={containerRef}
        data-wb-canvas="true"
        data-board-surface={boardConfig.surface}
        data-board-pattern={boardConfig.pattern}
        data-board-dark={theme.isDark ? "true" : "false"}
        className="wb-canvas"
        width="100%"
        height="100%"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          cursor: cursorStyle,
        }}
      >
        <defs>
          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern
            id="wb-dot-grid"
            data-wb-grid="true"
            x={boardConfig.pattern === "graph" ? graphOffset.x : patternOffset.x}
            y={boardConfig.pattern === "graph" ? graphOffset.y : patternOffset.y}
            width={boardConfig.pattern === "graph" ? graphMajor : spacing}
            height={boardConfig.pattern === "graph" ? graphMajor : spacing}
            patternUnits="userSpaceOnUse"
          >
            {boardConfig.pattern === "dots" ? (
              <circle
                cx={spacing / 2}
                cy={spacing / 2}
                r={1.35}
                fill={theme.dotFill}
              />
            ) : boardConfig.pattern === "ruled" ? (
              <path
                d={`M 0 ${spacing} H ${spacing}`}
                fill="none"
                stroke={theme.ruledStroke}
                strokeWidth={1.1}
              />
            ) : boardConfig.pattern === "graph" ? (
              <>
                <path
                  d={Array.from({ length: 4 }, (_, idx) => {
                    const offset = (idx + 1) * spacing;
                    return `M ${offset} 0 V ${graphMajor} M 0 ${offset} H ${graphMajor}`;
                  }).join(" ")}
                  fill="none"
                  stroke={theme.subGridStroke}
                  strokeWidth={0.85}
                />
                <path
                  d={`M ${graphMajor} 0 H 0 V ${graphMajor}`}
                  fill="none"
                  stroke={theme.gridStroke}
                  strokeWidth={1.35}
                />
              </>
            ) : (
              <path
                d={`M${spacing} 0H0V${spacing}`}
                fill="none"
                stroke={theme.gridStroke}
                strokeWidth={1}
              />
            )}
          </pattern>
        </defs>

        {/* Board Surface Fill */}
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={isA4 ? (theme.isDark ? "#090d16" : "#e2e8f0") : theme.bg}
          style={{ pointerEvents: "none" }}
        />

        {/* Infinite Grid / Pattern Background (for infinite mode) */}
        {showPattern && !isA4 && (
          <rect
            x={0}
            y={0}
            width="100%"
            height="100%"
            fill="url(#wb-dot-grid)"
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* SVG Board Content Container */}
        <g
          data-board-content="true"
          className="wb-board-content"
          transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}
        >
          {/* A4 Page Paper Sheet & Pattern when A4 mode is active */}
          {isA4 && a4FormatOption && (
            <g data-wb-a4-sheet="true" data-export-skip="false">
              {/* Paper Drop Shadow (simulated in SVG) */}
              <rect
                x={-a4FormatOption.widthWorld / 2 + 0.15}
                y={-a4FormatOption.heightWorld / 2 + 0.15}
                width={a4FormatOption.widthWorld}
                height={a4FormatOption.heightWorld}
                rx={0.12}
                ry={0.12}
                fill="rgba(0,0,0,0.18)"
              />
              {/* White/Theme Paper Background */}
              <rect
                x={-a4FormatOption.widthWorld / 2}
                y={-a4FormatOption.heightWorld / 2}
                width={a4FormatOption.widthWorld}
                height={a4FormatOption.heightWorld}
                rx={0.12}
                ry={0.12}
                fill={theme.bg}
                stroke={theme.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
                strokeWidth={1.5 / viewport.scale}
              />
              {/* Pattern inside A4 Sheet */}
              {showPattern && (
                <rect
                  x={-a4FormatOption.widthWorld / 2}
                  y={-a4FormatOption.heightWorld / 2}
                  width={a4FormatOption.widthWorld}
                  height={a4FormatOption.heightWorld}
                  rx={0.12}
                  ry={0.12}
                  fill="url(#wb-dot-grid)"
                  style={{ pointerEvents: "none" }}
                />
              )}
              {/* Page Number & A4 Label watermark at bottom */}
              <text
                x={0}
                y={a4FormatOption.heightWorld / 2 - 0.4}
                textAnchor="middle"
                fontSize={0.4}
                fill={theme.isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"}
                style={{ userSelect: "none", pointerEvents: "none", fontFamily: "sans-serif" }}
              >
                {boardFormat === "a4_portrait" ? "Khổ A4 Dọc (210 × 297mm)" : "Khổ A4 Ngang (297 × 210mm)"}
              </text>
            </g>
          )}

          {children}
        </g>

        {/* SVG Selection & Marquee Overlay Container */}
        {svgOverlay && (
          <g
            data-board-overlay-svg="true"
            data-export-skip="true"
            transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}
          >
            {svgOverlay}
          </g>
        )}
      </svg>

      {/* Screen-Space HTML / Overlay Container */}
      {overlayChildren && (
        <div
          data-board-overlay="true"
          data-export-skip="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {overlayChildren}
        </div>
      )}
    </div>
  );
}
