"use client";

import React from "react";
import { BoundingBox, TransformHandle } from "@/types/whiteboard";
import { getTransformHandles } from "@/lib/selection";

export interface SelectionOverlayProps {
  bbox: BoundingBox | null;
  cameraScale: number;
  marqueeRect: { sx: number; sy: number; x: number; y: number } | null;
  interactive?: boolean;
  boxInteriorPassthrough?: boolean;
  onHandlePointerDown: (e: React.PointerEvent, handle: TransformHandle) => void;
  onBoxPointerDown: (e: React.PointerEvent) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  bbox,
  cameraScale,
  marqueeRect,
  interactive = true,
  boxInteriorPassthrough = false,
  onHandlePointerDown,
  onBoxPointerDown,
}) => {
  // Compute handle screen size ~ 10-12px converted to world units
  const handleSize = Math.max(0.08, 5 / (cameraScale || 45));

  return (
    <g
      data-selection-overlay="true"
      style={interactive ? undefined : { pointerEvents: "none" }}
    >
      {/* Live Drag Marquee Rect */}
      {marqueeRect && (
        <rect
          x={Math.min(marqueeRect.sx, marqueeRect.x)}
          y={-Math.max(marqueeRect.sy, marqueeRect.y)}
          width={Math.abs(marqueeRect.x - marqueeRect.sx)}
          height={Math.abs(marqueeRect.y - marqueeRect.sy)}
          fill="rgba(37, 99, 235, 0.08)"
          stroke="#2563eb"
          strokeDasharray="5 4"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Selected Bounding Box & 8 Handles */}
      {bbox && (
        <g>
          {/* Dashed Bounding Box Outline */}
          <rect
            data-wb-selection-box="true"
            className="wb-selection-box"
            x={bbox.width < 24 / (cameraScale || 45) ? bbox.minX - 12 / (cameraScale || 45) : bbox.minX}
            y={bbox.height < 24 / (cameraScale || 45) ? -bbox.maxY - 12 / (cameraScale || 45) : -bbox.maxY}
            width={Math.max(bbox.width, 24 / (cameraScale || 45))}
            height={Math.max(bbox.height, 24 / (cameraScale || 45))}
            fill={boxInteriorPassthrough ? "none" : "rgba(37, 99, 235, 0.03)"}
            stroke="#1a73e8"
            strokeDasharray="4 3"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: interactive ? (boxInteriorPassthrough ? "default" : "move") : undefined,
              pointerEvents: interactive
                ? boxInteriorPassthrough
                  ? "stroke"
                  : "auto"
                : "none",
            }}
            onPointerDown={interactive ? onBoxPointerDown : undefined}
          />

          {/* 8 Transform Handles (shown for 1D strokes and 2D shapes, not 0D points) */}
          {(bbox.width > 0.001 || bbox.height > 0.001) &&
            getTransformHandles(bbox).map((h) => (
              <rect
                key={h.type}
                data-wb-handle={h.type}
                data-handle={h.type}
                className={`wb-handle wb-handle-${h.type}`}
                x={h.x - handleSize}
                y={-h.y - handleSize}
                width={handleSize * 2}
                height={handleSize * 2}
                fill="#ffffff"
                stroke="#1a73e8"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                style={{
                  cursor: interactive ? h.cursor : undefined,
                  pointerEvents: interactive ? "auto" : "none",
                }}
                onPointerDown={
                  interactive
                    ? (e) => {
                        e.stopPropagation();
                        onHandlePointerDown(e, h);
                      }
                    : undefined
                }
              />
            ))}
        </g>
      )}
    </g>
  );
};
