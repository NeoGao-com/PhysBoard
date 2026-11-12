"use client";

import { useState, useRef, useEffect, useCallback, type RefObject } from "react";
import {
  type ViewportTransform,
  type Point,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_SCALE,
  DEFAULT_TX,
  DEFAULT_TY,
  calculateZoomAtPoint,
  calculatePinchTransform,
  screenToWorld,
} from "@/lib/coordinates";

export interface UseCanvasNavigationOptions {
  initialTx?: number;
  initialTy?: number;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  currentTool?: string | null;
  onViewportChange?: (viewport: ViewportTransform) => void;
  onCursorMove?: (worldPos: Point) => void;
}

export interface UseCanvasNavigationReturn {
  viewport: ViewportTransform;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  containerRef: RefObject<SVGSVGElement | null>;
  isPanning: boolean;
  isSpacePressed: boolean;
  cursorWorld: Point | null;
  handlePointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerLeave: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (dx: number, dy: number) => void;
}

export function useCanvasNavigation(
  options: UseCanvasNavigationOptions = {}
): UseCanvasNavigationReturn {
  const {
    initialTx = DEFAULT_TX,
    initialTy = DEFAULT_TY,
    initialScale = DEFAULT_SCALE,
    minScale = MIN_SCALE,
    maxScale = MAX_SCALE,
    currentTool = null,
    onViewportChange,
    onCursorMove,
  } = options;

  const [viewport, setViewport] = useState<ViewportTransform>({
    tx: initialTx,
    ty: initialTy,
    scale: initialScale,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);

  const containerRef = useRef<SVGSVGElement | null>(null);
  const panStartRef = useRef<{
    sx: number;
    sy: number;
    tx: number;
    ty: number;
  } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const pinchStateRef = useRef<{
    dist0: number;
    scale0: number;
    tx0: number;
    ty0: number;
  } | null>(null);
  const lastCursorSentRef = useRef<number>(0);

  // Sync state changes with callback
  useEffect(() => {
    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

  // Spacebar tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "math-field"
      )
        return;
      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Native non-passive Wheel Event Listener
  useEffect(() => {
    const svgEl = containerRef.current;
    if (!svgEl) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svgEl.getBoundingClientRect();
      setViewport((prev) =>
        calculateZoomAtPoint(
          e.clientX,
          e.clientY,
          e.deltaY,
          prev.tx,
          prev.ty,
          prev.scale,
          rect,
          0.0015,
          minScale,
          maxScale
        )
      );
    };

    svgEl.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svgEl.removeEventListener("wheel", onWheel);
    };
  }, [minScale, maxScale]);

  // Pointer Down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      // Multi-touch pinch detection
      if (activePointersRef.current.size >= 2) {
        panStartRef.current = null;
        const pts = [...activePointersRef.current.values()];
        const p1 = pts[0];
        const p2 = pts[1];
        pinchStateRef.current = {
          dist0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
          scale0: viewport.scale,
          tx0: viewport.tx,
          ty0: viewport.ty,
        };
        setIsPanning(false);
        return;
      }

      // Check whether pan should initiate
      const isMiddleClick = e.button === 1;
      const isPanTool = currentTool === null || currentTool === "pan";
      const isShiftSelect =
        currentTool === "select" && (e.shiftKey || isMiddleClick);
      const shouldPan =
        isPanTool || isMiddleClick || isSpacePressed || isShiftSelect;

      if (shouldPan) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore potential capture failures
        }
        panStartRef.current = {
          sx: e.clientX,
          sy: e.clientY,
          tx: viewport.tx,
          ty: viewport.ty,
        };
        setIsPanning(true);
      }
    },
    [currentTool, isSpacePressed, viewport]
  );

  // Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, {
          x: e.clientX,
          y: e.clientY,
        });
      }

      const rect = containerRef.current?.getBoundingClientRect();

      // Multi-touch pinch handling
      if (pinchStateRef.current && activePointersRef.current.size >= 2) {
        const pts = [...activePointersRef.current.values()];
        const p1 = pts[0];
        const p2 = pts[1];
        if (p1 && p2) {
          const next = calculatePinchTransform(
            p1,
            p2,
            pinchStateRef.current.dist0,
            pinchStateRef.current.scale0,
            pinchStateRef.current.tx0,
            pinchStateRef.current.ty0,
            rect,
            minScale,
            maxScale
          );
          setViewport(next);
          return;
        }
      }

      // Single pointer pan dragging
      if (panStartRef.current) {
        const dx = e.clientX - panStartRef.current.sx;
        const dy = e.clientY - panStartRef.current.sy;
        setViewport((prev) => ({
          ...prev,
          tx: panStartRef.current!.tx + dx,
          ty: panStartRef.current!.ty + dy,
        }));
      }

      // Cursor world tracking (throttled to 50ms for external callbacks)
      const now = performance.now();
      const worldPos = screenToWorld(
        e.clientX,
        e.clientY,
        viewport.tx,
        viewport.ty,
        viewport.scale,
        rect
      );
      setCursorWorld(worldPos);

      if (now - lastCursorSentRef.current > 50) {
        lastCursorSentRef.current = now;
        onCursorMove?.(worldPos);
      }
    },
    [minScale, maxScale, viewport, onCursorMove]
  );

  // Pointer Up / Cancel
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) {
        pinchStateRef.current = null;
      }
      panStartRef.current = null;
      setIsPanning(false);
    },
    []
  );

  const handlePointerCancel = handlePointerUp;

  const handlePointerLeave = useCallback(() => {
    setCursorWorld(null);
  }, []);

  const resetView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 1000;
    const height = rect?.height ?? 640;
    setViewport({
      tx: width / 2,
      ty: height / 2,
      scale: DEFAULT_SCALE,
    });
  }, []);

  const zoomIn = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = (rect?.left ?? 0) + (rect?.width ?? 1000) / 2;
    const cy = (rect?.top ?? 0) + (rect?.height ?? 640) / 2;
    setViewport((prev) =>
      calculateZoomAtPoint(
        cx,
        cy,
        -100,
        prev.tx,
        prev.ty,
        prev.scale,
        rect,
        0.0015,
        minScale,
        maxScale
      )
    );
  }, [minScale, maxScale]);

  const zoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = (rect?.left ?? 0) + (rect?.width ?? 1000) / 2;
    const cy = (rect?.top ?? 0) + (rect?.height ?? 640) / 2;
    setViewport((prev) =>
      calculateZoomAtPoint(
        cx,
        cy,
        100,
        prev.tx,
        prev.ty,
        prev.scale,
        rect,
        0.0015,
        minScale,
        maxScale
      )
    );
  }, [minScale, maxScale]);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      tx: prev.tx + dx,
      ty: prev.ty + dy,
    }));
  }, []);

  return {
    viewport,
    setViewport,
    containerRef,
    isPanning,
    isSpacePressed,
    cursorWorld,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handlePointerLeave,
    resetView,
    zoomIn,
    zoomOut,
    panBy,
  };
}
