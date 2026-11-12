"use client";

import React, { useMemo } from "react";
import { type ViewportTransform, getPatternOffset } from "@/lib/coordinates";

export interface SvgCanvasProps {
  viewport: ViewportTransform;
  containerRef: React.RefObject<SVGSVGElement | null>;
  currentTool?: string | null;
  isPanning?: boolean;
  isSpacePressed?: boolean;
  contained?: boolean;
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
  // Cursor calculation matching Mathvera
  const cursorStyle = useMemo(() => {
    if (isPanning) return "grabbing";
    if (isSpacePressed || currentTool === "pan") return "grab";
    if (
      currentTool === "ink" ||
      currentTool === "ink:fountain" ||
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

  const patternOffset = useMemo(
    () => getPatternOffset(viewport.tx, viewport.ty, 24),
    [viewport.tx, viewport.ty]
  );

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`${contained ? "absolute inset-0" : "fixed inset-0"} overflow-hidden bg-[#FBFBFD] select-none ${className}`}
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#FBFBFD",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <svg
        ref={containerRef}
        data-wb-canvas="true"
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
          <pattern
            id="wb-dot-grid"
            data-wb-grid="true"
            x={patternOffset.x}
            y={patternOffset.y}
            width={24}
            height={24}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="#e6e8ee"
              strokeWidth={1}
            />
          </pattern>
        </defs>

        {/* Infinite Grid Background */}
        {gridEnabled && (
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
