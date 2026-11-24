"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { InkElement } from "@/components/sites/mathvera/elements/InkElement";

export interface LaserStrokeItem {
  id: string;
  points: number[];
  createdAt: number;
  color?: string;
  width?: number;
}

export interface LaserStrokesLayerHandle {
  addStroke: (stroke: LaserStrokeItem) => void;
  clear: () => void;
}

export interface LaserStrokesLayerProps {
  scale: number;
}

const LASER_FADE_MS = 1500;

/**
 * Isolated ephemeral laser pointer trail layer.
 * Manages its own 60fps fade animation loop so parent Whiteboard never re-renders on every animation frame.
 */
export const LaserStrokesLayer = forwardRef<
  LaserStrokesLayerHandle,
  LaserStrokesLayerProps
>(function LaserStrokesLayer({ scale }, ref) {
  const [state, setState] = useState<{ strokes: LaserStrokeItem[]; now: number }>({
    strokes: [],
    now: 0,
  });

  useImperativeHandle(
    ref,
    () => ({
      addStroke: (stroke) => {
        setState((prev) => ({
          strokes: [...prev.strokes, stroke],
          now: Math.max(prev.now, stroke.createdAt),
        }));
      },
      clear: () => {
        setState({ strokes: [], now: 0 });
      },
    }),
    []
  );

  useEffect(() => {
    if (state.strokes.length === 0) return;
    const interval = window.setInterval(() => {
      const current = performance.now();
      setState((prev) => ({
        strokes: prev.strokes.filter((s) => current - s.createdAt < LASER_FADE_MS),
        now: current,
      }));
    }, 16);
    return () => window.clearInterval(interval);
  }, [state.strokes.length]);

  if (state.strokes.length === 0) return null;

  return (
    <>
      {state.strokes.map((ls) => {
        const age = Math.max(0, state.now - ls.createdAt);
        const opacity = Math.max(0, 1 - age / LASER_FADE_MS);
        return (
          <g
            key={ls.id}
            style={{ opacity, pointerEvents: "none" }}
            data-laser-stroke="true"
          >
            <InkElement
              id={ls.id}
              transform={{ x: 0, y: 0, scale: 1, rotation: 0, z: 99999 }}
              style={{
                stroke: ls.color || "#ef4444",
                width: ls.width || 4.5,
              }}
              props={{
                points: ls.points,
                nib: "laser",
              }}
              scale={scale}
            />
          </g>
        );
      })}
    </>
  );
});
