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
  isA4?: boolean;
  isSidebarOpen?: boolean;
  totalPages?: number;
  pageWidthWorld?: number;
  pageHeightWorld?: number;
  pageGapWorld?: number;
  penOnlyMode?: boolean;
  onViewportChange?: (viewport: ViewportTransform) => void;
  onCursorMove?: (worldPos: Point) => void;
  onPageChange?: (page: number) => void;
  onOverscrollAddPage?: () => void;
  enableOverscrollAddPage?: boolean;
}

export interface OverscrollAddPageState {
  isOverscrolling: boolean;
  progress: number; // 0 to 1
  status: "idle" | "holding" | "added";
}

export interface UseCanvasNavigationReturn {
  viewport: ViewportTransform;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  containerRef: RefObject<SVGSVGElement | null>;
  isPanning: boolean;
  isSpacePressed: boolean;
  cursorWorld: Point | null;
  isFitLocked: boolean;
  toggleFitLock: () => void;
  setFitLocked: (locked: boolean) => void;
  fitToScreen: () => void;
  overscrollState: OverscrollAddPageState;
  handlePointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerLeave: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (dx: number, dy: number) => void;
  scrollToPage: (p: number, pageHeightWorld?: number, pageGapWorld?: number) => void;
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
    isA4 = false,
    isSidebarOpen = false,
    totalPages = 1,
    pageWidthWorld = 17,
    pageHeightWorld = 24.04,
    pageGapWorld = 0.8,
    penOnlyMode = false,
    onViewportChange,
    onCursorMove,
    onPageChange,
    onOverscrollAddPage,
    enableOverscrollAddPage = true,
  } = options;

  const [viewport, setViewport] = useState<ViewportTransform>({
    tx: initialTx,
    ty: initialTy,
    scale: initialScale,
  });

  const [isFitLocked, setIsFitLocked] = useState(isA4);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);

  const [overscrollState, setOverscrollState] = useState<OverscrollAddPageState>({
    isOverscrolling: false,
    progress: 0,
    status: "idle",
  });

  const overscrollSessionRef = useRef<{
    startTime: number | null;
    lastInputTime: number;
    rafId: number | null;
    resetTimeoutId: NodeJS.Timeout | null;
    isTriggered: boolean;
    source: "wheel" | "pointer" | null;
    pullOffset: number;
  }>({
    startTime: null,
    lastInputTime: 0,
    rafId: null,
    resetTimeoutId: null,
    isTriggered: false,
    source: null,
    pullOffset: 0,
  });

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

  const pW = pageWidthWorld ?? 17;
  const pH = pageHeightWorld ?? 24.04;
  const pGap = pageGapWorld ?? 0.8;
  const pStep = pH + pGap;
  const count = Math.max(1, totalPages ?? 1);
  const totalH = (count - 1) * pStep + pH;

  // Clamps viewport for continuous A4 mode:
  // - Top of Page 1 cannot go below top of screen (ty <= 0)
  // - Bottom of Page N cannot go above bottom of screen (ty >= viewH - totalH * scale)
  // - If isFitLocked is active, scale is locked to fit width, and tx is locked centered
  const clampA4Viewport = useCallback(
    (
      vp: ViewportTransform,
      fitLocked = isFitLocked,
      rect = containerRef.current?.getBoundingClientRect()
    ): ViewportTransform => {
      if (!isA4) return vp;

      const sidebarW = isSidebarOpen ? 140 : 26;
      const defaultW = typeof window !== "undefined" ? window.innerWidth - sidebarW : 1200;
      const defaultH = typeof window !== "undefined" ? window.innerHeight : 800;
      const viewW = rect && rect.width > 0 ? rect.width : defaultW;
      const viewH = rect && rect.height > 0 ? rect.height : defaultH;

      let targetScale = vp.scale;
      let targetTx = vp.tx;

      if (fitLocked) {
        targetScale = viewW / pW;
        targetTx = viewW / 2;
      }

      const totalHPx = totalH * targetScale;
      const maxTy = 0; // Mép trên trang đầu tiên sát mép màn hình trên (không cho lướt lên nữa)
      const minTy = Math.min(0, viewH - totalHPx); // Mép dưới trang cuối cùng sát mép dưới màn hình

      const clampedTy = Math.max(minTy, Math.min(maxTy, vp.ty));

      return {
        scale: targetScale,
        tx: fitLocked ? targetTx : vp.tx,
        ty: clampedTy,
      };
    },
    [isA4, isFitLocked, isSidebarOpen, pW, totalH]
  );

  // Overscroll Cancel Helper
  const cancelOverscroll = useCallback(
    (afterTrigger = false) => {
      const session = overscrollSessionRef.current;
      if (session.rafId !== null) {
        cancelAnimationFrame(session.rafId);
        session.rafId = null;
      }
      if (session.resetTimeoutId !== null) {
        clearTimeout(session.resetTimeoutId);
        session.resetTimeoutId = null;
      }
      session.startTime = null;
      session.source = null;
      session.pullOffset = 0;

      if (!afterTrigger) {
        session.isTriggered = false;
        setOverscrollState({
          isOverscrolling: false,
          progress: 0,
          status: "idle",
        });
      } else {
        setOverscrollState({
          isOverscrolling: false,
          progress: 0,
          status: "idle",
        });
        session.resetTimeoutId = setTimeout(() => {
          session.isTriggered = false;
          session.resetTimeoutId = null;
        }, 600);
      }

      setViewport((prev) => clampA4Viewport(prev, isFitLocked));
    },
    [clampA4Viewport, isFitLocked]
  );

  // Overscroll Hold Animation Frame Loop
  const updateOverscrollTick = useCallback(() => {
    const session = overscrollSessionRef.current;
    if (session.startTime === null) return;

    const now = performance.now();

    // Wheel inputs timeout: if user stops rolling mouse wheel for > 350ms before triggering
    if (session.source === "wheel" && now - session.lastInputTime > 350 && !session.isTriggered) {
      cancelOverscroll(false);
      return;
    }

    const elapsed = now - session.startTime;
    const progress = Math.min(1, elapsed / 650);

    if (progress >= 1 && !session.isTriggered) {
      session.isTriggered = true;
      setOverscrollState({
        isOverscrolling: true,
        progress: 1,
        status: "added",
      });

      onOverscrollAddPage?.();

      session.resetTimeoutId = setTimeout(() => {
        cancelOverscroll(true);
      }, 600);
      return;
    }

    if (!session.isTriggered) {
      setOverscrollState({
        isOverscrolling: true,
        progress,
        status: "holding",
      });
      session.rafId = requestAnimationFrame(updateOverscrollTick);
    }
  }, [onOverscrollAddPage, cancelOverscroll]);

  // Overscroll Start Helper
  const startOverscroll = useCallback(
    (source: "wheel" | "pointer", pullAmount = 0) => {
      if (!isA4 || enableOverscrollAddPage === false || !onOverscrollAddPage) return;
      const session = overscrollSessionRef.current;
      if (session.isTriggered) return;

      const now = performance.now();
      session.lastInputTime = now;
      session.source = source;
      session.pullOffset = Math.min(45, pullAmount);

      if (session.startTime === null) {
        session.startTime = now;
        setOverscrollState({
          isOverscrolling: true,
          progress: 0,
          status: "holding",
        });
        if (session.rafId !== null) {
          cancelAnimationFrame(session.rafId);
        }
        session.rafId = requestAnimationFrame(updateOverscrollTick);
      }
    },
    [isA4, enableOverscrollAddPage, onOverscrollAddPage, updateOverscrollTick]
  );

  // Cleanup on unmount or format switch
  useEffect(() => {
    return () => {
      const session = overscrollSessionRef.current;
      if (session.rafId !== null) cancelAnimationFrame(session.rafId);
      if (session.resetTimeoutId !== null) clearTimeout(session.resetTimeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isA4 && overscrollSessionRef.current.startTime !== null) {
      cancelOverscroll(false);
    }
  }, [isA4, cancelOverscroll]);

  const fitToScreen = useCallback(() => {
    const sidebarW = isSidebarOpen ? 140 : 26;
    const defaultW = typeof window !== "undefined" ? window.innerWidth - sidebarW : 1200;
    const defaultH = typeof window !== "undefined" ? window.innerHeight : 800;
    const rect = containerRef.current?.getBoundingClientRect();
    const viewW = rect && rect.width > 0 ? rect.width : defaultW;
    const viewH = rect && rect.height > 0 ? rect.height : defaultH;
    const fitScale = viewW / pW;
    const totalHPx = totalH * fitScale;
    const minTy = Math.min(0, viewH - totalHPx);

    setViewport((prev) => {
      const ratio = prev.scale > 0 ? fitScale / prev.scale : 1;
      const newTy = prev.ty * ratio;
      return {
        scale: fitScale,
        tx: viewW / 2,
        ty: Math.max(minTy, Math.min(0, newTy)),
      };
    });
  }, [isSidebarOpen, pW, totalH]);

  const toggleFitLock = useCallback(() => {
    setIsFitLocked((prev) => {
      const next = !prev;
      if (next) {
        fitToScreen();
      }
      return next;
    });
  }, [fitToScreen]);

  // Auto-enable fit lock when switching to A4 format
  useEffect(() => {
    if (isA4) {
      setIsFitLocked(true);
    }
  }, [isA4]);

  // Handle sidebar open/close & window resize:
  // Automatically shrinks down when sidebar opens, and expands back when sidebar closes
  useEffect(() => {
    if (!isA4) return;
    const svgEl = containerRef.current;

    const adaptToNewSize = () => {
      const sidebarW = isSidebarOpen ? 140 : 26;
      const defaultW = typeof window !== "undefined" ? window.innerWidth - sidebarW : 1200;
      const defaultH = typeof window !== "undefined" ? window.innerHeight : 800;
      const rect = svgEl?.getBoundingClientRect();
      const viewW = rect && rect.width > 0 ? rect.width : defaultW;
      const viewH = rect && rect.height > 0 ? rect.height : defaultH;

      const fitScale = viewW / pW;
      const totalHPx = totalH * fitScale;
      const minTy = Math.min(0, viewH - totalHPx);

      setViewport((prev) => {
        const oldSidebarW = isSidebarOpen ? 26 : 140;
        const oldW = typeof window !== "undefined" ? window.innerWidth - oldSidebarW : viewW;
        const oldFitScale = oldW / pW;
        const wasFitted = Math.abs(prev.scale - oldFitScale) / oldFitScale < 0.15;

        if (isFitLocked || wasFitted) {
          const ratio = prev.scale > 0 ? fitScale / prev.scale : 1;
          const newTy = prev.ty * ratio;
          return {
            scale: fitScale,
            tx: viewW / 2,
            ty: Math.max(minTy, Math.min(0, newTy)),
          };
        } else {
          return {
            ...prev,
            tx: viewW / 2,
            ty: Math.max(minTy, Math.min(0, prev.ty)),
          };
        }
      });
    };

    adaptToNewSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && svgEl) {
      ro = new ResizeObserver(() => {
        adaptToNewSize();
      });
      ro.observe(svgEl);
    }

    return () => {
      ro?.disconnect();
    };
  }, [isSidebarOpen, isA4, isFitLocked, pW, totalH]);

  // Sync state changes with callback
  useEffect(() => {
    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

  // Page detection during scroll in continuous A4 mode
  useEffect(() => {
    if (!isA4 || !onPageChange) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const viewH = rect?.height ?? 800;
    const ySvgCenter = (viewH / 2 - viewport.ty) / (viewport.scale || 45);
    const p = Math.floor(ySvgCenter / pStep) + 1;
    const clampedP = Math.max(1, Math.min(count, p));
    onPageChange(clampedP);
  }, [isA4, viewport.ty, viewport.scale, pStep, count, onPageChange]);

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
      const viewW = rect.width;
      const viewH = rect.height;

      // In continuous A4 mode:
      if (isA4) {
        // If locked: zooming is completely disabled; wheel scrolls vertically
        // If unlocked: Ctrl/Meta+wheel zooms, normal wheel scrolls vertically
        const allowZoom = !isFitLocked && (e.ctrlKey || e.metaKey);
        if (allowZoom) {
          setViewport((prev) => {
            const nextVp = calculateZoomAtPoint(
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
            );
            const totalHPx = totalH * nextVp.scale;
            const minTy = Math.min(0, viewH - totalHPx);
            return {
              ...nextVp,
              ty: Math.max(minTy, Math.min(0, nextVp.ty)),
            };
          });
        } else {
          // Continuous vertical scrolling
          setViewport((prev) => {
            const scale = isFitLocked ? viewW / pW : prev.scale;
            const totalHPx = totalH * scale;
            const minTy = Math.min(0, viewH - totalHPx);
            const nextTy = prev.ty - e.deltaY;

            // Check if attempting to scroll down past bottom:
            const isAtBottom = prev.ty <= minTy + 2;
            const isScrollingDown = e.deltaY > 0;

            if (
              isAtBottom &&
              isScrollingDown &&
              enableOverscrollAddPage !== false &&
              onOverscrollAddPage
            ) {
              const session = overscrollSessionRef.current;
              const newPull = Math.min(
                42,
                (session.pullOffset || 0) + Math.min(6, e.deltaY * 0.1)
              );
              startOverscroll("wheel", newPull);
              const nextTx = isFitLocked
                ? viewW / 2
                : e.shiftKey
                ? prev.tx - e.deltaY
                : prev.tx - (e.deltaX || 0);
              return {
                scale,
                tx: nextTx,
                ty: minTy - newPull,
              };
            }

            if (e.deltaY < 0 && overscrollSessionRef.current.startTime !== null) {
              cancelOverscroll(false);
            }

            const clampedTy = Math.max(minTy, Math.min(0, nextTy));
            const nextTx = isFitLocked
              ? viewW / 2
              : e.shiftKey
              ? prev.tx - e.deltaY
              : prev.tx - (e.deltaX || 0);
            return {
              scale,
              tx: nextTx,
              ty: clampedTy,
            };
          });
        }
      } else {
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
      }
    };

    svgEl.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svgEl.removeEventListener("wheel", onWheel);
    };
  }, [
    minScale,
    maxScale,
    isA4,
    isFitLocked,
    pW,
    totalH,
    enableOverscrollAddPage,
    onOverscrollAddPage,
    startOverscroll,
    cancelOverscroll,
  ]);

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
      const isTouchPan = penOnlyMode && e.pointerType === "touch";
      const isPanTool = currentTool === null || currentTool === "pan";
      const isShiftSelect =
        currentTool === "select" && (e.shiftKey || isMiddleClick);
      const shouldPan =
        isTouchPan || isPanTool || isMiddleClick || isSpacePressed || isShiftSelect;

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
    [currentTool, isSpacePressed, penOnlyMode, viewport]
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
        if (isA4 && isFitLocked) {
          // In locked mode, pinch cannot zoom!
          return;
        }
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
          setViewport(isA4 ? clampA4Viewport(next, false, rect) : next);
          return;
        }
      }

      // Single pointer pan dragging
      const panStart = panStartRef.current;
      if (panStart) {
        const dx = isA4 && isFitLocked ? 0 : e.clientX - panStart.sx;
        const dy = e.clientY - panStart.sy;
        const rawTy = panStart.ty + dy;

        if (isA4) {
          const sidebarW = isSidebarOpen ? 140 : 26;
          const defaultW =
            typeof window !== "undefined" ? window.innerWidth - sidebarW : 1200;
          const defaultH = typeof window !== "undefined" ? window.innerHeight : 800;
          const viewW = rect && rect.width > 0 ? rect.width : defaultW;
          const viewH = rect && rect.height > 0 ? rect.height : defaultH;
          const scale = isFitLocked ? viewW / pW : viewport.scale;
          const totalHPx = totalH * scale;
          const minTy = Math.min(0, viewH - totalHPx);

          if (
            rawTy < minTy &&
            enableOverscrollAddPage !== false &&
            onOverscrollAddPage
          ) {
            const overscrollDist = minTy - rawTy;
            if (overscrollDist > 6) {
              const pullAmount = Math.min(
                50,
                Math.pow(overscrollDist, 0.65) * 2.8
              );
              startOverscroll("pointer", pullAmount);
              setViewport({
                scale,
                tx: isFitLocked ? viewW / 2 : panStart.tx + dx,
                ty: minTy - pullAmount,
              });
              return;
            }
          } else if (
            rawTy >= minTy &&
            overscrollSessionRef.current.startTime !== null
          ) {
            cancelOverscroll(false);
          }
        }

        const nextVp = {
          ...viewport,
          tx: panStart.tx + dx,
          ty: rawTy,
        };
        setViewport(isA4 ? clampA4Viewport(nextVp, isFitLocked, rect) : nextVp);
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
    [
      minScale,
      maxScale,
      viewport,
      onCursorMove,
      isA4,
      isFitLocked,
      clampA4Viewport,
      isSidebarOpen,
      pW,
      totalH,
      enableOverscrollAddPage,
      onOverscrollAddPage,
      startOverscroll,
      cancelOverscroll,
    ]
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

      if (overscrollSessionRef.current.source === "pointer") {
        if (!overscrollSessionRef.current.isTriggered) {
          cancelOverscroll(false);
        }
      }
    },
    [cancelOverscroll]
  );

  const handlePointerCancel = handlePointerUp;

  const handlePointerLeave = useCallback(() => {
    setCursorWorld(null);
  }, []);

  const resetView = useCallback(() => {
    const sidebarW = isSidebarOpen ? 140 : 26;
    const defaultW = typeof window !== "undefined" ? window.innerWidth - sidebarW : 1000;
    const defaultH = typeof window !== "undefined" ? window.innerHeight : 640;
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : defaultW;
    const height = rect && rect.height > 0 ? rect.height : defaultH;
    if (isA4) {
      if (isFitLocked) {
        fitToScreen();
      } else {
        const totalHPx = totalH * DEFAULT_SCALE;
        const minTy = Math.min(0, height - totalHPx);
        setViewport({
          scale: DEFAULT_SCALE,
          tx: width / 2,
          ty: Math.max(minTy, 0),
        });
      }
    } else {
      setViewport({
        tx: width / 2,
        ty: height / 2,
        scale: DEFAULT_SCALE,
      });
    }
  }, [isA4, isFitLocked, fitToScreen, totalH, isSidebarOpen]);

  const zoomIn = useCallback(() => {
    if (isA4 && isFitLocked) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = (rect?.left ?? 0) + (rect?.width ?? 1000) / 2;
    const cy = (rect?.top ?? 0) + (rect?.height ?? 640) / 2;
    setViewport((prev) => {
      const next = calculateZoomAtPoint(
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
      );
      return isA4 ? clampA4Viewport(next, false, rect) : next;
    });
  }, [minScale, maxScale, isA4, isFitLocked, clampA4Viewport]);

  const zoomOut = useCallback(() => {
    if (isA4 && isFitLocked) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = (rect?.left ?? 0) + (rect?.width ?? 1000) / 2;
    const cy = (rect?.top ?? 0) + (rect?.height ?? 640) / 2;
    setViewport((prev) => {
      const next = calculateZoomAtPoint(
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
      );
      return isA4 ? clampA4Viewport(next, false, rect) : next;
    });
  }, [minScale, maxScale, isA4, isFitLocked, clampA4Viewport]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setViewport((prev) => {
        const next = {
          ...prev,
          tx: isA4 && isFitLocked ? prev.tx : prev.tx + dx,
          ty: prev.ty + dy,
        };
        return isA4 ? clampA4Viewport(next, isFitLocked) : next;
      });
    },
    [isA4, isFitLocked, clampA4Viewport]
  );

  const scrollToPage = useCallback(
    (p: number) => {
      const sidebarW = isSidebarOpen ? 140 : 26;
      const defaultW = typeof window !== "undefined" ? window.innerWidth - sidebarW : 1200;
      const defaultH = typeof window !== "undefined" ? window.innerHeight : 800;
      const rect = containerRef.current?.getBoundingClientRect();
      const viewW = rect && rect.width > 0 ? rect.width : defaultW;
      const viewH = rect && rect.height > 0 ? rect.height : defaultH;
      setViewport((prev) => {
        const scale = isFitLocked ? viewW / pW : prev.scale;
        const effectiveCount = Math.max(count, p);
        const effectiveTotalH = (effectiveCount - 1) * pStep + pH;
        const totalHPx = effectiveTotalH * scale;
        const minTy = Math.min(0, viewH - totalHPx);
        const targetTy = -(p - 1) * pStep * scale;
        const clampedTy = Math.max(minTy, Math.min(0, targetTy));
        return {
          scale,
          tx: isFitLocked ? viewW / 2 : prev.tx,
          ty: clampedTy,
        };
      });
    },
    [isSidebarOpen, isFitLocked, pW, pStep, pH, count]
  );

  return {
    viewport,
    setViewport,
    containerRef,
    isPanning,
    isSpacePressed,
    cursorWorld,
    isFitLocked,
    toggleFitLock,
    setFitLocked: setIsFitLocked,
    fitToScreen,
    overscrollState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handlePointerLeave,
    resetView,
    zoomIn,
    zoomOut,
    panBy,
    scrollToPage,
  };
}
